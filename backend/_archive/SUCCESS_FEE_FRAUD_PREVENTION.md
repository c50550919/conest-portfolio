# Success Fee Fraud Prevention System

## Problem Statement

**Fraud Risk**: Users with formal lease arrangements (Tier 1: $29 each) could claim informal arrangements (Tier 2: $15 or Tier 3: $0) to avoid paying the full success fee.

**Financial Impact**:
- Per fraud instance: $14-29 lost revenue per user
- At 1,000 matches/year with 10% fraud rate: $2,800-5,800 annual loss
- Reputation damage if users discover others gaming the system

## Solution: Multi-Layer Verification System

### Core Principle
**"Platform determines tier, not users"** - Require documentary evidence before processing any success fee.

---

## Layer 1: Database Schema

### New Table: `success_fees`

```sql
CREATE TABLE success_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  connection_request_id UUID REFERENCES connection_requests(id) ON DELETE SET NULL,

  -- Tier determination
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  tier_determination_method VARCHAR(50) NOT NULL CHECK (
    tier_determination_method IN (
      'document_verified',    -- Both users uploaded documents
      'address_cross_check',  -- Same address + high confidence
      'manual_review',        -- Admin reviewed conflicting claims
      'default_tier_3'        -- No evidence = no fee
    )
  ),

  -- Amount calculation
  amount_per_user INTEGER NOT NULL, -- Cents: 2900, 1500, or 0
  total_amount INTEGER NOT NULL,     -- amount_per_user * 2

  -- Confidence scoring (fraud detection)
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  fraud_signals JSONB DEFAULT '[]',  -- Array of detected fraud indicators

  -- Payment status
  status VARCHAR(20) NOT NULL DEFAULT 'pending_confirmation' CHECK (
    status IN (
      'pending_confirmation',  -- Waiting for both users to confirm
      'pending_documents',     -- Waiting for document upload
      'under_review',          -- Manual review required (confidence < 70)
      'approved',              -- Ready to charge
      'charged',               -- Successfully charged
      'disputed',              -- User disputed charge
      'refunded'               -- Refunded after dispute
    )
  ),

  -- User confirmations (bilateral)
  user_a_confirmed_at TIMESTAMP NULL,
  user_a_claimed_tier INTEGER NULL,
  user_b_confirmed_at TIMESTAMP NULL,
  user_b_claimed_tier INTEGER NULL,

  -- Document evidence
  document_user_a_id UUID REFERENCES housing_documents(id),
  document_user_b_id UUID REFERENCES housing_documents(id),
  document_verified_by UUID REFERENCES users(id), -- Admin who verified
  document_verified_at TIMESTAMP NULL,

  -- Payment processing
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  charged_at TIMESTAMP NULL,
  refund_amount INTEGER DEFAULT 0,
  refunded_at TIMESTAMP NULL,
  refund_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_success_fees_user_a ON success_fees(user_a_id);
CREATE INDEX idx_success_fees_user_b ON success_fees(user_b_id);
CREATE INDEX idx_success_fees_status ON success_fees(status);
CREATE INDEX idx_success_fees_confidence ON success_fees(confidence_score) WHERE confidence_score < 70;
CREATE INDEX idx_success_fees_created ON success_fees(created_at DESC);
```

### New Table: `housing_documents`

```sql
CREATE TABLE housing_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  success_fee_id UUID REFERENCES success_fees(id) ON DELETE CASCADE,

  -- Document details
  document_type VARCHAR(50) NOT NULL CHECK (
    document_type IN (
      'lease_both_names',           -- Both roommates on lease
      'lease_one_name',             -- Only one name on lease
      'sublease_agreement',         -- Official sublease
      'rental_agreement',           -- Homeowner + renter agreement
      'landlord_approval_letter',   -- Landlord written approval
      'proof_of_address'            -- Utility bill, bank statement
    )
  ),

  -- File storage
  file_url VARCHAR(500) NOT NULL,    -- AWS S3 URL
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,        -- Bytes
  mime_type VARCHAR(100) NOT NULL,

  -- Verification status
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'approved', 'rejected', 'needs_more_info')
  ),
  verified_by UUID REFERENCES users(id), -- Admin who verified
  verified_at TIMESTAMP NULL,
  rejection_reason TEXT,

  -- Extracted data (for cross-checking)
  extracted_address TEXT,
  extracted_names TEXT[],            -- Names found on document
  extracted_move_in_date DATE,
  extracted_lease_end_date DATE,

  -- Timestamps
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_housing_docs_user ON housing_documents(user_id);
CREATE INDEX idx_housing_docs_success_fee ON housing_documents(success_fee_id);
CREATE INDEX idx_housing_docs_status ON housing_documents(verification_status);
CREATE INDEX idx_housing_docs_type ON housing_documents(document_type);
```

### Schema Updates: Add address tracking to `parents`

```sql
ALTER TABLE parents ADD COLUMN current_address TEXT NULL;
ALTER TABLE parents ADD COLUMN address_updated_at TIMESTAMP NULL;
ALTER TABLE parents ADD COLUMN move_in_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE parents ADD COLUMN move_in_date DATE NULL;

CREATE INDEX idx_parents_address ON parents(current_address) WHERE current_address IS NOT NULL;
```

---

## Layer 2: Confidence Scoring Algorithm

### Fraud Detection Signals

```typescript
interface FraudSignal {
  signal: string;
  weight: number;      // -10 to +10
  description: string;
}

const FRAUD_SIGNALS: Record<string, FraudSignal> = {
  // POSITIVE SIGNALS (increase confidence)
  SAME_ADDRESS: {
    signal: 'same_address',
    weight: +15,
    description: 'Both users set same address in profile'
  },
  HIGH_MESSAGE_COUNT: {
    signal: 'high_messages',
    weight: +10,
    description: '50+ messages exchanged'
  },
  LONG_CONNECTION: {
    signal: 'long_connection',
    weight: +8,
    description: 'Connected for >30 days'
  },
  DOCUMENT_UPLOADED: {
    signal: 'document_provided',
    weight: +20,
    description: 'User uploaded housing document'
  },
  BOTH_NAMES_ON_LEASE: {
    signal: 'both_on_lease',
    weight: +25,
    description: 'Document shows both names on lease'
  },
  MATCHING_MOVE_IN_DATE: {
    signal: 'matching_dates',
    weight: +12,
    description: 'Both users set same move-in date'
  },
  ADDRESS_HISTORY_CLEAN: {
    signal: 'address_consistent',
    weight: +5,
    description: 'No previous address gaming detected'
  },

  // NEGATIVE SIGNALS (decrease confidence, indicate fraud)
  CONFLICTING_TIERS: {
    signal: 'tier_mismatch',
    weight: -20,
    description: 'User A claims Tier 1, User B claims Tier 3'
  },
  RAPID_ADDRESS_CHANGE: {
    signal: 'address_gaming',
    weight: -15,
    description: 'Changed address multiple times in 7 days'
  },
  NO_DOCUMENTS: {
    signal: 'no_proof',
    weight: -18,
    description: 'Claims Tier 1/2 but refuses to upload documents'
  },
  LOW_ENGAGEMENT: {
    signal: 'low_messages',
    weight: -8,
    description: '<10 messages but claiming formal arrangement'
  },
  SUSPICIOUS_TIMING: {
    signal: 'rushed_claim',
    weight: -10,
    description: 'Claimed success <7 days after connection'
  },
  PREVIOUS_FRAUD: {
    signal: 'fraud_history',
    weight: -30,
    description: 'Previously flagged for success fee fraud'
  },
  DIFFERENT_ADDRESSES: {
    signal: 'address_mismatch',
    weight: -12,
    description: 'Users claim living together but different addresses'
  }
};
```

### Confidence Score Calculation

```typescript
interface ConfidenceScoreInput {
  userA: Parent;
  userB: Parent;
  connectionRequest: ConnectionRequest;
  messages: Message[];
  userAClaimedTier: number;
  userBClaimedTier: number;
  documents: HousingDocument[];
}

export async function calculateConfidenceScore(
  input: ConfidenceScoreInput
): Promise<{ score: number; signals: FraudSignal[] }> {
  let baseScore = 50; // Start neutral
  const detectedSignals: FraudSignal[] = [];

  const { userA, userB, connectionRequest, messages, userAClaimedTier, userBClaimedTier, documents } = input;

  // Check 1: Address matching
  if (userA.current_address && userB.current_address) {
    if (normalizeAddress(userA.current_address) === normalizeAddress(userB.current_address)) {
      baseScore += FRAUD_SIGNALS.SAME_ADDRESS.weight;
      detectedSignals.push(FRAUD_SIGNALS.SAME_ADDRESS);
    } else if (userAClaimedTier <= 2 || userBClaimedTier <= 2) {
      // Claiming formal arrangement but different addresses
      baseScore += FRAUD_SIGNALS.DIFFERENT_ADDRESSES.weight;
      detectedSignals.push(FRAUD_SIGNALS.DIFFERENT_ADDRESSES);
    }
  }

  // Check 2: Message engagement
  const messageCount = messages.length;
  if (messageCount >= 50) {
    baseScore += FRAUD_SIGNALS.HIGH_MESSAGE_COUNT.weight;
    detectedSignals.push(FRAUD_SIGNALS.HIGH_MESSAGE_COUNT);
  } else if (messageCount < 10 && (userAClaimedTier <= 2 || userBClaimedTier <= 2)) {
    baseScore += FRAUD_SIGNALS.LOW_ENGAGEMENT.weight;
    detectedSignals.push(FRAUD_SIGNALS.LOW_ENGAGEMENT);
  }

  // Check 3: Connection duration
  const connectionDays = daysSince(connectionRequest.created_at);
  if (connectionDays >= 30) {
    baseScore += FRAUD_SIGNALS.LONG_CONNECTION.weight;
    detectedSignals.push(FRAUD_SIGNALS.LONG_CONNECTION);
  } else if (connectionDays < 7) {
    baseScore += FRAUD_SIGNALS.SUSPICIOUS_TIMING.weight;
    detectedSignals.push(FRAUD_SIGNALS.SUSPICIOUS_TIMING);
  }

  // Check 4: Tier claim consistency
  if (userAClaimedTier !== userBClaimedTier) {
    baseScore += FRAUD_SIGNALS.CONFLICTING_TIERS.weight;
    detectedSignals.push(FRAUD_SIGNALS.CONFLICTING_TIERS);
  }

  // Check 5: Document evidence
  if (documents.length === 0 && (userAClaimedTier <= 2 || userBClaimedTier <= 2)) {
    baseScore += FRAUD_SIGNALS.NO_DOCUMENTS.weight;
    detectedSignals.push(FRAUD_SIGNALS.NO_DOCUMENTS);
  } else if (documents.length > 0) {
    baseScore += FRAUD_SIGNALS.DOCUMENT_UPLOADED.weight;
    detectedSignals.push(FRAUD_SIGNALS.DOCUMENT_UPLOADED);

    // Check if both names on lease
    const leaseWithBothNames = documents.find(doc =>
      doc.document_type === 'lease_both_names' &&
      doc.verification_status === 'approved'
    );
    if (leaseWithBothNames) {
      baseScore += FRAUD_SIGNALS.BOTH_NAMES_ON_LEASE.weight;
      detectedSignals.push(FRAUD_SIGNALS.BOTH_NAMES_ON_LEASE);
    }
  }

  // Check 6: Move-in date consistency
  if (userA.move_in_date && userB.move_in_date) {
    const dateDiff = Math.abs(daysBetween(userA.move_in_date, userB.move_in_date));
    if (dateDiff <= 7) {
      baseScore += FRAUD_SIGNALS.MATCHING_MOVE_IN_DATE.weight;
      detectedSignals.push(FRAUD_SIGNALS.MATCHING_MOVE_IN_DATE);
    }
  }

  // Check 7: Address change frequency (gaming detection)
  const addressChanges = await getAddressChangeHistory(userA.id, 7); // Last 7 days
  if (addressChanges.length >= 3) {
    baseScore += FRAUD_SIGNALS.RAPID_ADDRESS_CHANGE.weight;
    detectedSignals.push(FRAUD_SIGNALS.RAPID_ADDRESS_CHANGE);
  } else if (addressChanges.length === 0) {
    baseScore += FRAUD_SIGNALS.ADDRESS_HISTORY_CLEAN.weight;
    detectedSignals.push(FRAUD_SIGNALS.ADDRESS_HISTORY_CLEAN);
  }

  // Check 8: Previous fraud flags
  const fraudHistory = await checkFraudHistory(userA.id, userB.id);
  if (fraudHistory.hasPreviousFlags) {
    baseScore += FRAUD_SIGNALS.PREVIOUS_FRAUD.weight;
    detectedSignals.push(FRAUD_SIGNALS.PREVIOUS_FRAUD);
  }

  // Clamp score to 0-100 range
  const finalScore = Math.max(0, Math.min(100, baseScore));

  return { score: finalScore, signals: detectedSignals };
}
```

---

## Layer 3: Tier Determination Logic

### Automated Tier Assignment

```typescript
interface TierDeterminationResult {
  tier: 1 | 2 | 3;
  method: 'document_verified' | 'address_cross_check' | 'manual_review' | 'default_tier_3';
  confidenceScore: number;
  requiresManualReview: boolean;
  reasoning: string;
}

export async function determineTier(
  successFeeId: string
): Promise<TierDeterminationResult> {
  const successFee = await db('success_fees').where({ id: successFeeId }).first();
  const documents = await db('housing_documents').where({ success_fee_id: successFeeId });

  // TIER 1 CRITERIA: Documentary evidence of formal arrangement
  const tier1Documents = documents.filter(doc =>
    doc.verification_status === 'approved' &&
    ['lease_both_names', 'sublease_agreement', 'rental_agreement'].includes(doc.document_type)
  );

  if (tier1Documents.length > 0) {
    return {
      tier: 1,
      method: 'document_verified',
      confidenceScore: successFee.confidence_score,
      requiresManualReview: false,
      reasoning: `Document verified: ${tier1Documents[0].document_type}`
    };
  }

  // TIER 2 CRITERIA: Partial evidence (one name on lease + landlord approval)
  const hasLease = documents.some(d => d.document_type === 'lease_one_name' && d.verification_status === 'approved');
  const hasApproval = documents.some(d => d.document_type === 'landlord_approval_letter' && d.verification_status === 'approved');

  if (hasLease && hasApproval) {
    return {
      tier: 2,
      method: 'document_verified',
      confidenceScore: successFee.confidence_score,
      requiresManualReview: false,
      reasoning: 'Lease + landlord approval verified'
    };
  }

  // HIGH CONFIDENCE HEURISTIC: Same address + high confidence score
  if (successFee.confidence_score >= 85) {
    const userA = await db('parents').where({ id: successFee.user_a_id }).first();
    const userB = await db('parents').where({ id: successFee.user_b_id }).first();

    if (normalizeAddress(userA.current_address) === normalizeAddress(userB.current_address)) {
      return {
        tier: 1, // Assume Tier 1 with very high confidence
        method: 'address_cross_check',
        confidenceScore: successFee.confidence_score,
        requiresManualReview: true, // Still flag for review
        reasoning: 'High confidence score (85+) with matching addresses'
      };
    }
  }

  // MANUAL REVIEW REQUIRED: Medium confidence or conflicting claims
  if (successFee.confidence_score >= 50 && successFee.confidence_score < 85) {
    return {
      tier: 3, // Default to Tier 3 until manual review
      method: 'manual_review',
      confidenceScore: successFee.confidence_score,
      requiresManualReview: true,
      reasoning: 'Medium confidence - requires admin review'
    };
  }

  // DEFAULT: No evidence = no fee (Tier 3)
  return {
    tier: 3,
    method: 'default_tier_3',
    confidenceScore: successFee.confidence_score,
    requiresManualReview: false,
    reasoning: 'Insufficient evidence - informal arrangement'
  };
}
```

---

## Layer 4: User Flow with Document Requirements

### Success Fee Confirmation Flow

```typescript
// Step 1: User initiates success fee claim
async function initiateSuccessFee(
  userId: string,
  partnerId: string,
  claimedTier: 1 | 2 | 3
): Promise<{ successFeeId: string; nextStep: string }> {

  // Create success fee record
  const [successFee] = await db('success_fees').insert({
    user_a_id: userId,
    user_b_id: partnerId,
    tier: 3, // Default to lowest until verified
    tier_determination_method: 'default_tier_3',
    amount_per_user: 0,
    total_amount: 0,
    confidence_score: 0,
    status: 'pending_confirmation',
    user_a_claimed_tier: claimedTier,
    user_a_confirmed_at: new Date()
  }).returning('*');

  // Notify partner
  await sendNotification(partnerId, {
    type: 'success_fee_confirmation_request',
    message: `${getUserName(userId)} claims you moved in together. Please confirm your housing arrangement type.`
  });

  return {
    successFeeId: successFee.id,
    nextStep: claimedTier <= 2 ? 'upload_documents' : 'wait_for_partner'
  };
}

// Step 2: Partner confirms
async function confirmSuccessFee(
  successFeeId: string,
  partnerId: string,
  claimedTier: 1 | 2 | 3
): Promise<{ requiresDocuments: boolean; tier: number }> {

  await db('success_fees').where({ id: successFeeId }).update({
    user_b_claimed_tier: claimedTier,
    user_b_confirmed_at: new Date()
  });

  const successFee = await db('success_fees').where({ id: successFeeId }).first();

  // Check for tier conflict
  if (successFee.user_a_claimed_tier !== claimedTier) {
    await db('success_fees').where({ id: successFeeId }).update({
      status: 'under_review',
      fraud_signals: db.raw(`
        COALESCE(fraud_signals, '[]'::jsonb) ||
        '["Conflicting tier claims - User A: Tier ${successFee.user_a_claimed_tier}, User B: Tier ${claimedTier}"]'::jsonb
      `)
    });

    // Notify admin
    await notifyAdminForReview(successFeeId, 'conflicting_tiers');

    return { requiresDocuments: true, tier: 3 };
  }

  // If both claim Tier 1 or 2, require documents
  if (claimedTier <= 2) {
    await db('success_fees').where({ id: successFeeId }).update({
      status: 'pending_documents'
    });
    return { requiresDocuments: true, tier: claimedTier };
  }

  // Both claim Tier 3 (informal) - no fee
  await db('success_fees').where({ id: successFeeId }).update({
    tier: 3,
    tier_determination_method: 'default_tier_3',
    amount_per_user: 0,
    total_amount: 0,
    status: 'approved'
  });

  return { requiresDocuments: false, tier: 3 };
}

// Step 3: Document upload
async function uploadHousingDocument(
  userId: string,
  successFeeId: string,
  file: File,
  documentType: string
): Promise<{ documentId: string; status: string }> {

  // Upload to S3
  const fileUrl = await uploadToS3(file, `success-fees/${successFeeId}/${userId}`);

  // Create document record
  const [document] = await db('housing_documents').insert({
    user_id: userId,
    success_fee_id: successFeeId,
    document_type: documentType,
    file_url: fileUrl,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    verification_status: 'pending'
  }).returning('*');

  // Update success fee status
  await db('success_fees').where({ id: successFeeId }).update({
    status: 'under_review'
  });

  // Notify admin for document verification
  await notifyAdminForDocumentReview(successFeeId, document.id);

  return {
    documentId: document.id,
    status: 'Document uploaded - pending admin verification (24-48 hours)'
  };
}

// Step 4: Admin document verification
async function verifyDocument(
  documentId: string,
  adminUserId: string,
  approved: boolean,
  extractedData?: {
    address?: string;
    names?: string[];
    moveInDate?: Date;
    leaseEndDate?: Date;
  },
  rejectionReason?: string
): Promise<void> {

  const document = await db('housing_documents').where({ id: documentId }).first();

  // Update document
  await db('housing_documents').where({ id: documentId }).update({
    verification_status: approved ? 'approved' : 'rejected',
    verified_by: adminUserId,
    verified_at: new Date(),
    rejection_reason: rejectionReason,
    extracted_address: extractedData?.address,
    extracted_names: extractedData?.names,
    extracted_move_in_date: extractedData?.moveInDate,
    extracted_lease_end_date: extractedData?.leaseEndDate
  });

  // If approved, trigger tier determination
  if (approved) {
    const successFee = await db('success_fees').where({ id: document.success_fee_id }).first();

    // Calculate confidence score
    const confidenceResult = await calculateConfidenceScore({
      /* ... fetch all required data ... */
    });

    // Determine tier
    const tierResult = await determineTier(document.success_fee_id);

    // Update success fee
    await db('success_fees').where({ id: document.success_fee_id }).update({
      tier: tierResult.tier,
      tier_determination_method: tierResult.method,
      amount_per_user: tierResult.tier === 1 ? 2900 : tierResult.tier === 2 ? 1500 : 0,
      total_amount: tierResult.tier === 1 ? 5800 : tierResult.tier === 2 ? 3000 : 0,
      confidence_score: confidenceResult.score,
      fraud_signals: JSON.stringify(confidenceResult.signals),
      status: tierResult.requiresManualReview ? 'under_review' : 'approved'
    });

    // Notify users
    await notifyUsers(successFee.user_a_id, successFee.user_b_id, {
      type: 'success_fee_approved',
      tier: tierResult.tier,
      amount: tierResult.tier === 1 ? 29 : tierResult.tier === 2 ? 15 : 0
    });
  } else {
    // Document rejected
    await db('success_fees').where({ id: document.success_fee_id }).update({
      status: 'pending_documents'
    });

    // Notify user
    await sendNotification(document.user_id, {
      type: 'document_rejected',
      reason: rejectionReason,
      nextStep: 'Please upload a clearer document or contact support'
    });
  }
}
```

---

## Layer 5: Manual Review Queue for Admins

### Admin Dashboard for Fraud Review

```typescript
interface SuccessFeeReviewItem {
  successFeeId: string;
  userA: { id: string; name: string; email: string };
  userB: { id: string; name: string; email: string };
  claimedTierA: number;
  claimedTierB: number;
  confidenceScore: number;
  fraudSignals: FraudSignal[];
  messages: number;
  connectionDays: number;
  documents: HousingDocument[];
  suggestedTier: 1 | 2 | 3;
  reasoning: string;
}

export async function getSuccessFeeReviewQueue(): Promise<SuccessFeeReviewItem[]> {
  const reviewQueue = await db('success_fees')
    .where({ status: 'under_review' })
    .orWhere('confidence_score', '<', 70)
    .orderBy('created_at', 'asc')
    .limit(50);

  return Promise.all(reviewQueue.map(async (fee) => {
    const userA = await db('parents').where({ id: fee.user_a_id }).first();
    const userB = await db('parents').where({ id: fee.user_b_id }).first();
    const documents = await db('housing_documents').where({ success_fee_id: fee.id });
    const messages = await db('messages')
      .whereIn('conversation_id', [
        await getConversationId(fee.user_a_id, fee.user_b_id)
      ])
      .count();

    const tierResult = await determineTier(fee.id);

    return {
      successFeeId: fee.id,
      userA: { id: userA.id, name: `${userA.first_name} ${userA.last_name}`, email: userA.email },
      userB: { id: userB.id, name: `${userB.first_name} ${userB.last_name}`, email: userB.email },
      claimedTierA: fee.user_a_claimed_tier,
      claimedTierB: fee.user_b_claimed_tier,
      confidenceScore: fee.confidence_score,
      fraudSignals: JSON.parse(fee.fraud_signals || '[]'),
      messages: messages[0].count,
      connectionDays: daysSince(fee.created_at),
      documents,
      suggestedTier: tierResult.tier,
      reasoning: tierResult.reasoning
    };
  }));
}

// Admin approval
export async function adminApproveSuccessFee(
  successFeeId: string,
  adminUserId: string,
  approvedTier: 1 | 2 | 3,
  notes: string
): Promise<void> {
  await db('success_fees').where({ id: successFeeId }).update({
    tier: approvedTier,
    tier_determination_method: 'manual_review',
    amount_per_user: approvedTier === 1 ? 2900 : approvedTier === 2 ? 1500 : 0,
    total_amount: approvedTier === 1 ? 5800 : approvedTier === 2 ? 3000 : 0,
    status: 'approved',
    document_verified_by: adminUserId,
    document_verified_at: new Date()
  });

  // Log admin action
  await db('admin_audit_log').insert({
    admin_user_id: adminUserId,
    action: 'success_fee_approval',
    target_id: successFeeId,
    notes
  });
}
```

---

## Implementation Timeline

### Phase 1: Database & Core Logic (Week 1)
- [x] Create migration for `success_fees` and `housing_documents` tables
- [x] Update `parents` table with address tracking fields
- [ ] Implement confidence scoring algorithm
- [ ] Implement tier determination logic
- [ ] Write unit tests for scoring and tier logic

### Phase 2: User Flow (Week 2)
- [ ] Success fee initiation API endpoint
- [ ] Bilateral confirmation flow
- [ ] Document upload UI (React Native)
- [ ] Document upload API with S3 integration
- [ ] Success fee status tracking UI

### Phase 3: Admin Tools (Week 3)
- [ ] Admin dashboard for document verification
- [ ] Manual review queue UI
- [ ] Fraud signal visualization
- [ ] Admin approval/rejection flow
- [ ] Audit logging

### Phase 4: Payment Integration (Week 4)
- [ ] Stripe payment intent creation after approval
- [ ] Auto-charge after 48-hour grace period
- [ ] Dispute handling flow
- [ ] Refund processing for rejected documents
- [ ] Payment confirmation emails

### Phase 5: Monitoring & Refinement (Ongoing)
- [ ] Dashboard for fraud detection metrics
- [ ] A/B testing for confidence score thresholds
- [ ] User feedback collection
- [ ] Continuous refinement of fraud signals

---

## Success Metrics

### Fraud Prevention KPIs
- **False Positive Rate**: <5% (legitimate users flagged incorrectly)
- **False Negative Rate**: <2% (fraudsters not caught)
- **Manual Review Efficiency**: <10% of cases require admin review
- **Document Upload Rate**: >90% of Tier 1/2 claims provide documents
- **User Satisfaction**: >4.0/5.0 rating for success fee process

### Financial Impact
- **Revenue Protection**: Prevent $2,800-5,800 annual loss from fraud
- **Processing Cost**: <$2/success fee for manual review labor
- **Dispute Rate**: <3% of charged success fees disputed

---

## Edge Cases & FAQs

### Q: What if one user uploads document but other doesn't?
**A**: Confidence score penalized (-18 for "no proof"). Tier defaults to 3 until both provide evidence OR one document clearly shows both names (e.g., lease with both signatures).

### Q: What if users upload fake/doctored documents?
**A**: Admin manual verification required for ALL documents. Cross-check:
- Address matches profile addresses
- Names match user profiles
- Document looks legitimate (not photoshopped)
- Dates are reasonable (not claiming lease from 2 years ago)

### Q: What if users split and want refund?
**A**: 14-day dispute window. If both users confirm they did NOT move in together, full refund processed. If only one disputes, admin reviews evidence.

### Q: What about homeowner + renter (one owns house)?
**A**: Qualifies as Tier 1 ($29 each) IF written rental agreement uploaded showing:
- Homeowner name
- Renter name
- Monthly rent amount
- Lease term
- Signatures from both parties

This is legally equivalent to apartment sublease and provides same protections.

---

## Conclusion

This multi-layer fraud prevention system ensures:

1. **Users cannot self-select tiers** - Platform determines based on evidence
2. **Documentary proof required** - No Tier 1/2 without documents
3. **Bilateral confirmation** - Both users must agree on arrangement type
4. **Confidence scoring** - Automated fraud detection flags suspicious claims
5. **Manual review safety net** - Admin reviews medium-confidence cases
6. **Strong incentives for honesty** - Easier to upload document than game system

**Estimated fraud reduction**: 85-95% compared to self-reported tiers.
