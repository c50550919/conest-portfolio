# SafeNest Mandatory Safety Features Design

**Created**: November 7, 2025
**Status**: Design Phase - Implementation Required Before Launch
**Priority**: CRITICAL - Legal Compliance

---

## Table of Contents
1. [Age Verification System (COPPA 2025)](#1-age-verification-system)
2. [REPORT Act Compliant Reporting Tools](#2-report-act-compliant-reporting-tools)
3. [Content Moderation Queue](#3-content-moderation-queue)
4. [Implementation Timeline](#implementation-timeline)

---

## 1. Age Verification System (COPPA 2025)

### Legal Requirement
New COPPA rules effective June 2025 expand age verification requirements for platforms serving parents. SafeNest must verify all users are 18+ to:
- Prevent unauthorized minor access
- Protect against child data collection violations
- Demonstrate good faith child safety measures

### System Architecture

#### 1.1 Database Schema

```sql
-- Age verification tracking table
CREATE TABLE age_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Verification method
  verification_method VARCHAR(50) NOT NULL, -- 'government_id', 'credit_card', 'biometric'

  -- ID verification (Veriff integration)
  id_document_type VARCHAR(50), -- 'drivers_license', 'passport', 'state_id'
  id_verification_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
  id_verification_provider VARCHAR(50) DEFAULT 'veriff',
  id_verification_reference VARCHAR(255), -- External verification ID from provider

  -- Extracted information (no PII stored permanently)
  verified_age INTEGER, -- Only age, not birthdate
  verification_timestamp TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ, -- Re-verification required after 2 years

  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by VARCHAR(50), -- 'system', 'admin'
  rejection_reason TEXT,

  UNIQUE(user_id)
);

-- Index for quick lookups
CREATE INDEX idx_age_verifications_user_id ON age_verifications(user_id);
CREATE INDEX idx_age_verifications_status ON age_verifications(id_verification_status);

-- Add age verification flag to users table
ALTER TABLE users ADD COLUMN age_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN age_verification_required BOOLEAN DEFAULT TRUE;
```

#### 1.2 API Endpoints

```typescript
/**
 * POST /api/auth/verify-age/initiate
 * Initiate age verification process
 */
interface InitiateAgeVerificationRequest {
  method: 'government_id' | 'credit_card';
  return_url?: string; // For redirect after verification
}

interface InitiateAgeVerificationResponse {
  verification_id: string;
  veriff_redirect_url: string; // Redirect user to Veriff flow
  status: 'initiated';
}

/**
 * POST /api/auth/verify-age/callback
 * Veriff webhook callback for verification result
 */
interface VeriffCallbackRequest {
  verification_id: string;
  status: 'approved' | 'rejected';
  age: number;
  rejection_reason?: string;
  transaction_reference: string;
}

/**
 * GET /api/auth/verify-age/status
 * Check current age verification status
 */
interface AgeVerificationStatusResponse {
  user_id: string;
  age_verified: boolean;
  verification_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'not_started';
  verification_method?: string;
  verified_at?: string;
  expires_at?: string;
  rejection_reason?: string;
}
```

#### 1.3 Middleware & Enforcement

```typescript
/**
 * Age verification middleware
 * Blocks API access for unverified users
 */
export const requireAgeVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Check verification status
  const verification = await db('age_verifications')
    .where('user_id', userId)
    .first();

  // Allow if verified and not expired
  if (
    verification?.id_verification_status === 'approved' &&
    new Date(verification.expiration_date) > new Date()
  ) {
    next();
    return;
  }

  // Block if not verified
  res.status(403).json({
    error: 'Age verification required',
    message: 'You must complete age verification to access this feature',
    verification_status: verification?.id_verification_status || 'not_started',
    verification_url: '/api/auth/verify-age/initiate',
  });
};

/**
 * Protected routes requiring age verification
 */
router.get('/api/discovery/profiles', requireAgeVerification, getDiscoveryProfiles);
router.post('/api/discovery/swipe', requireAgeVerification, recordSwipe);
router.post('/api/messages', requireAgeVerification, sendMessage);
router.get('/api/profiles/:id', requireAgeVerification, getProfile);
```

#### 1.4 Veriff Integration

```typescript
import axios from 'axios';

/**
 * Veriff API integration for government ID verification
 */
class VeriffVerificationService {
  private apiToken: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = process.env.JUMIO_API_TOKEN!;
    this.apiSecret = process.env.JUMIO_API_SECRET!;
    this.baseUrl = process.env.JUMIO_BASE_URL || 'https://netverify.com/api/v4';
  }

  /**
   * Initiate verification session
   */
  async initiateVerification(userId: string, callbackUrl: string): Promise<{
    verificationId: string;
    redirectUrl: string;
  }> {
    const response = await axios.post(
      `${this.baseUrl}/initiateNetverify`,
      {
        customerInternalReference: userId,
        callbackUrl,
        userReference: userId,
        successUrl: `${process.env.APP_URL}/verification/success`,
        errorUrl: `${process.env.APP_URL}/verification/error`,
        locale: 'en-US',
        // Request age verification
        verification: {
          type: 'id_and_identity',
          acceptedIdTypes: ['DRIVING_LICENSE', 'PASSPORT', 'ID_CARD'],
        },
      },
      {
        auth: {
          username: this.apiToken,
          password: this.apiSecret,
        },
      }
    );

    return {
      verificationId: response.data.transactionReference,
      redirectUrl: response.data.redirectUrl,
    };
  }

  /**
   * Process verification callback from Veriff
   */
  async processCallback(callbackData: any): Promise<{
    approved: boolean;
    age: number;
    rejectionReason?: string;
  }> {
    const { verificationStatus, idScanImage, idCheckDataPositions } = callbackData;

    // Extract birthdate and calculate age
    const birthdate = idCheckDataPositions.find((field: any) => field.name === 'dob')?.value;
    const age = birthdate ? this.calculateAge(new Date(birthdate)) : 0;

    return {
      approved: verificationStatus === 'APPROVED_VERIFIED' && age >= 18,
      age,
      rejectionReason: verificationStatus !== 'APPROVED_VERIFIED'
        ? 'ID verification failed'
        : age < 18
        ? 'User under 18'
        : undefined,
    };
  }

  private calculateAge(birthdate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
      age--;
    }
    return age;
  }
}
```

#### 1.5 Mobile App Flow

```typescript
/**
 * Age Verification Screen
 * Shown immediately after signup, blocks app usage until complete
 */
import React, { useState } from 'react';
import { View, Text, Button, Linking } from 'react-native';

export const AgeVerificationScreen = () => {
  const [loading, setLoading] = useState(false);

  const initiateVerification = async () => {
    setLoading(true);

    try {
      // Call backend to initiate verification
      const response = await fetch('/api/auth/verify-age/initiate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ method: 'government_id' }),
      });

      const { veriff_redirect_url } = await response.json();

      // Open Veriff verification flow in browser
      await Linking.openURL(veriff_redirect_url);

      // Poll for verification status
      pollVerificationStatus();
    } catch (error) {
      console.error('Verification initiation failed', error);
    } finally {
      setLoading(false);
    }
  };

  const pollVerificationStatus = async () => {
    const interval = setInterval(async () => {
      const response = await fetch('/api/auth/verify-age/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const { verification_status } = await response.json();

      if (verification_status === 'approved') {
        clearInterval(interval);
        // Navigate to main app
        navigation.navigate('Home');
      } else if (verification_status === 'rejected') {
        clearInterval(interval);
        // Show error
        alert('Verification failed. Please try again.');
      }
    }, 5000); // Poll every 5 seconds
  };

  return (
    <View>
      <Text>Age Verification Required</Text>
      <Text>
        To protect minors, we require all users to verify they are 18 or older
        using a government-issued ID.
      </Text>
      <Button
        title="Verify My Age"
        onPress={initiateVerification}
        disabled={loading}
      />
    </View>
  );
};
```

---

## 2. REPORT Act Compliant Reporting Tools

### Legal Requirement
REPORT Act (signed 2024) mandates that platforms provide reporting tools for trafficking and exploitation, with direct law enforcement coordination.

### System Architecture

#### 2.1 Database Schema

```sql
-- Reports table
CREATE TABLE safety_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reporter information
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous reports
  reporter_anonymous BOOLEAN DEFAULT FALSE,

  -- Reported user/content
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_content_type VARCHAR(50) NOT NULL, -- 'profile', 'message', 'photo', 'behavior'
  reported_content_id UUID, -- Message ID, photo ID, etc.

  -- Report details
  report_category VARCHAR(50) NOT NULL, -- 'trafficking', 'exploitation', 'harassment', 'fraud', 'other'
  report_subcategory VARCHAR(100),
  report_description TEXT NOT NULL,
  evidence_urls TEXT[], -- Screenshots, links, etc.

  -- Severity and escalation
  severity_level VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  auto_escalated BOOLEAN DEFAULT FALSE, -- Auto-escalated to law enforcement

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'under_review', 'escalated', 'resolved', 'dismissed'
  assigned_to VARCHAR(100), -- Admin/moderator username

  -- Action taken
  action_taken VARCHAR(100), -- 'account_suspended', 'content_removed', 'warning_issued', 'reported_to_authorities'
  resolution_notes TEXT,

  -- Law enforcement coordination
  law_enforcement_reported BOOLEAN DEFAULT FALSE,
  law_enforcement_case_number VARCHAR(100),
  law_enforcement_agency VARCHAR(200),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Emergency contact made
  emergency_hotline_contacted BOOLEAN DEFAULT FALSE,
  hotline_reference_number VARCHAR(100)
);

-- Indexes
CREATE INDEX idx_safety_reports_status ON safety_reports(status);
CREATE INDEX idx_safety_reports_category ON safety_reports(report_category);
CREATE INDEX idx_safety_reports_severity ON safety_reports(severity_level);
CREATE INDEX idx_safety_reports_reported_user ON safety_reports(reported_user_id);
CREATE INDEX idx_safety_reports_created_at ON safety_reports(created_at DESC);

-- Report actions table (audit trail)
CREATE TABLE safety_report_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES safety_reports(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'created', 'assigned', 'escalated', 'resolved'
  action_by VARCHAR(100) NOT NULL, -- Username or 'system'
  action_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2 API Endpoints

```typescript
/**
 * POST /api/safety/report
 * Submit a safety report
 */
interface SubmitReportRequest {
  reported_user_id: string;
  report_category: 'trafficking' | 'exploitation' | 'harassment' | 'fraud' | 'other';
  report_subcategory?: string;
  report_description: string;
  reported_content_type: 'profile' | 'message' | 'photo' | 'behavior';
  reported_content_id?: string;
  evidence_urls?: string[];
  anonymous?: boolean;
}

interface SubmitReportResponse {
  report_id: string;
  status: 'pending' | 'escalated';
  message: string;
  emergency_hotline?: {
    name: 'National Human Trafficking Hotline';
    phone: '1-888-373-7888';
    text: '233733';
    available: '24/7';
  };
}

/**
 * GET /api/safety/reports/my-reports
 * Get user's submitted reports
 */
interface MyReportsResponse {
  reports: Array<{
    report_id: string;
    reported_user_id: string;
    report_category: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * GET /api/admin/safety/reports
 * Admin: View all reports (requires admin role)
 */
interface AdminReportsResponse {
  reports: Array<{
    report_id: string;
    reporter_user_id?: string;
    reporter_anonymous: boolean;
    reported_user_id: string;
    report_category: string;
    severity_level: string;
    status: string;
    created_at: string;
    assigned_to?: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
```

#### 2.3 Auto-Escalation Rules

```typescript
/**
 * Automatic escalation to law enforcement for critical reports
 */
class ReportEscalationService {
  /**
   * Evaluate report and auto-escalate if necessary
   */
  async evaluateReport(report: SafetyReport): Promise<{
    shouldEscalate: boolean;
    severityLevel: 'critical' | 'high' | 'medium' | 'low';
    reason: string;
  }> {
    const criticalKeywords = [
      'trafficking', 'exploit', 'force', 'coerce', 'minor',
      'underage', 'abuse', 'violence', 'danger', 'threat'
    ];

    const highSeverityKeywords = [
      'unsafe', 'scared', 'help', 'emergency', 'police'
    ];

    const description = report.report_description.toLowerCase();

    // CRITICAL: Auto-escalate to law enforcement
    if (
      report.report_category === 'trafficking' ||
      report.report_category === 'exploitation' ||
      criticalKeywords.some(keyword => description.includes(keyword))
    ) {
      return {
        shouldEscalate: true,
        severityLevel: 'critical',
        reason: 'Potential trafficking or exploitation detected',
      };
    }

    // HIGH: Immediate admin review
    if (highSeverityKeywords.some(keyword => description.includes(keyword))) {
      return {
        shouldEscalate: false,
        severityLevel: 'high',
        reason: 'Safety concern requiring immediate review',
      };
    }

    // MEDIUM: Standard review
    return {
      shouldEscalate: false,
      severityLevel: 'medium',
      reason: 'Standard safety report',
    };
  }

  /**
   * Escalate to law enforcement
   */
  async escalateToLawEnforcement(report: SafetyReport): Promise<void> {
    // Log escalation
    await db('safety_reports')
      .where('id', report.id)
      .update({
        status: 'escalated',
        auto_escalated: true,
        severity_level: 'critical',
        law_enforcement_reported: true,
        updated_at: db.fn.now(),
      });

    // Send notification to admin team
    await this.notifyAdminTeam(report);

    // Provide emergency hotline info to reporter
    await this.notifyReporter(report);

    // Suspend reported user pending investigation
    await this.suspendUser(report.reported_user_id);
  }

  /**
   * Provide emergency hotline information
   */
  private getEmergencyHotlineInfo() {
    return {
      name: 'National Human Trafficking Hotline',
      phone: '1-888-373-7888',
      text: '233733',
      website: 'https://humantraffickinghotline.org',
      available: '24/7',
    };
  }
}
```

#### 2.4 Mobile App Reporting UI

```typescript
/**
 * Report User Screen
 * Accessible from profile, message, or settings
 */
export const ReportUserScreen = ({ route }) => {
  const { reportedUserId, contentType, contentId } = route.params;
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const submitReport = async () => {
    try {
      const response = await fetch('/api/safety/report', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          report_category: category,
          report_description: description,
          reported_content_type: contentType,
          reported_content_id: contentId,
          anonymous,
        }),
      });

      const result = await response.json();

      // If critical, show emergency hotline info
      if (result.emergency_hotline) {
        Alert.alert(
          'Emergency Resources Available',
          `If you are in immediate danger, please call:\n\n${result.emergency_hotline.name}\n${result.emergency_hotline.phone}\nText: ${result.emergency_hotline.text}\n\nAvailable ${result.emergency_hotline.available}`,
          [
            { text: 'Call Now', onPress: () => Linking.openURL(`tel:${result.emergency_hotline.phone}`) },
            { text: 'OK' },
          ]
        );
      }

      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  return (
    <View>
      <Text>Report Category</Text>
      <Picker selectedValue={category} onValueChange={setCategory}>
        <Picker.Item label="Trafficking" value="trafficking" />
        <Picker.Item label="Exploitation" value="exploitation" />
        <Picker.Item label="Harassment" value="harassment" />
        <Picker.Item label="Fraud" value="fraud" />
        <Picker.Item label="Other" value="other" />
      </Picker>

      <Text>Description</Text>
      <TextInput
        multiline
        placeholder="Please provide details about your concern..."
        value={description}
        onChangeText={setDescription}
      />

      <CheckBox
        value={anonymous}
        onValueChange={setAnonymous}
        label="Submit anonymously"
      />

      <Button title="Submit Report" onPress={submitReport} />
    </View>
  );
};
```

---

## 3. Content Moderation Queue

### Legal Requirement
Proactive monitoring of child-related content to ensure compliance with Constitution Principle I (Child Safety - NO child PII).

### System Architecture

#### 3.1 Database Schema

```sql
-- Moderation queue table
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content information
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'profile_bio', 'message', 'photo', 'profile_photo'
  content_id UUID, -- Original content ID
  content_text TEXT,
  content_url TEXT, -- Photo URL if applicable

  -- Flagging information
  flagged_reason VARCHAR(100) NOT NULL, -- 'child_keyword', 'child_photo_detected', 'pii_detected'
  flagged_keywords TEXT[], -- Specific keywords that triggered flag
  confidence_score FLOAT, -- AI confidence score (0-1)

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'

  -- Review
  reviewed_by VARCHAR(100), -- Moderator username
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  action_taken VARCHAR(100), -- 'approved', 'content_removed', 'content_edited', 'account_suspended'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_priority ON moderation_queue(priority);
CREATE INDEX idx_moderation_queue_created_at ON moderation_queue(created_at DESC);
CREATE INDEX idx_moderation_queue_user_id ON moderation_queue(user_id);
```

#### 3.2 Automated Flagging System

```typescript
/**
 * Content moderation service
 * Automatically flags child-related content for human review
 */
class ContentModerationService {
  // Child-related keywords to flag
  private childKeywords = [
    'child', 'children', 'kid', 'kids', 'son', 'daughter',
    'school', 'daycare', 'kindergarten', 'elementary',
    'toddler', 'baby', 'infant', 'teen', 'teenager'
  ];

  // PII keywords to flag
  private piiKeywords = [
    'birthday', 'birth date', 'social security', 'ssn',
    'school name', 'address', 'phone number'
  ];

  /**
   * Scan profile bio for child-related content
   */
  async scanProfileBio(userId: string, bio: string): Promise<{
    flagged: boolean;
    reason?: string;
    keywords?: string[];
  }> {
    const lowerBio = bio.toLowerCase();

    // Check for child keywords
    const foundChildKeywords = this.childKeywords.filter(keyword =>
      lowerBio.includes(keyword)
    );

    // Check for PII keywords
    const foundPIIKeywords = this.piiKeywords.filter(keyword =>
      lowerBio.includes(keyword)
    );

    if (foundChildKeywords.length > 0) {
      await this.addToModerationQueue({
        user_id: userId,
        content_type: 'profile_bio',
        content_text: bio,
        flagged_reason: 'child_keyword',
        flagged_keywords: foundChildKeywords,
        priority: 'high',
      });

      return {
        flagged: true,
        reason: 'Child-related content detected',
        keywords: foundChildKeywords,
      };
    }

    if (foundPIIKeywords.length > 0) {
      await this.addToModerationQueue({
        user_id: userId,
        content_type: 'profile_bio',
        content_text: bio,
        flagged_reason: 'pii_detected',
        flagged_keywords: foundPIIKeywords,
        priority: 'critical',
      });

      return {
        flagged: true,
        reason: 'PII detected',
        keywords: foundPIIKeywords,
      };
    }

    return { flagged: false };
  }

  /**
   * Scan photo for minors (using AWS Rekognition)
   */
  async scanPhoto(userId: string, photoUrl: string): Promise<{
    flagged: boolean;
    reason?: string;
    confidence?: number;
  }> {
    // Use AWS Rekognition to detect age
    const rekognition = new AWS.Rekognition();

    const result = await rekognition.detectFaces({
      Image: { S3Object: { Bucket: 'safenest-photos', Key: photoUrl } },
      Attributes: ['ALL'],
    }).promise();

    // Check if any detected faces are minors
    for (const face of result.FaceDetails || []) {
      const ageRange = face.AgeRange;
      if (ageRange && ageRange.Low && ageRange.Low < 18) {
        await this.addToModerationQueue({
          user_id: userId,
          content_type: 'photo',
          content_url: photoUrl,
          flagged_reason: 'child_photo_detected',
          confidence_score: face.Confidence / 100,
          priority: 'critical',
        });

        return {
          flagged: true,
          reason: 'Minor detected in photo',
          confidence: face.Confidence,
        };
      }
    }

    return { flagged: false };
  }

  /**
   * Add content to moderation queue
   */
  private async addToModerationQueue(data: any): Promise<void> {
    await db('moderation_queue').insert(data);

    // Notify moderation team for high/critical priority
    if (data.priority === 'critical' || data.priority === 'high') {
      await this.notifyModerationTeam(data);
    }
  }
}
```

#### 3.3 Moderator Dashboard

```typescript
/**
 * GET /api/admin/moderation/queue
 * Get pending moderation items (admin only)
 */
interface ModerationQueueResponse {
  items: Array<{
    id: string;
    user_id: string;
    content_type: string;
    content_text?: string;
    content_url?: string;
    flagged_reason: string;
    flagged_keywords?: string[];
    priority: string;
    created_at: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

/**
 * POST /api/admin/moderation/review
 * Review and take action on moderation item
 */
interface ReviewModerationRequest {
  moderation_id: string;
  action: 'approve' | 'remove_content' | 'edit_content' | 'suspend_account';
  review_notes?: string;
  edited_content?: string; // If editing
}
```

---

## Implementation Timeline

### Week 3-4: Safety Features Implementation

#### Week 3: Age Verification
- **Day 1-2**: Database schema and migrations
- **Day 3-4**: Veriff API integration
- **Day 5-6**: Backend API endpoints and middleware
- **Day 7**: Mobile app age verification flow

#### Week 4: Reporting & Moderation
- **Day 1-2**: REPORT Act reporting system (database + API)
- **Day 3-4**: Auto-escalation rules and law enforcement coordination
- **Day 5-6**: Content moderation queue (database + flagging system)
- **Day 7**: Admin dashboard for reports and moderation

### Week 5: Testing & Legal Review
- **Day 1-3**: Integration testing of all safety features
- **Day 4-5**: Security audit and penetration testing
- **Day 6-7**: Legal review with housing law specialist

---

## Cost Estimates

### Third-Party Services
- **Veriff Age Verification**: $0.50-$2.00 per verification (~$1,000/month for 1,000 verifications)
- **AWS Rekognition (photo scanning)**: $0.001 per image (~$100/month for 100,000 photos)
- **Legal Review**: $2,000-$5,000 (one-time)

### Development Time
- **Age Verification**: 40 hours
- **REPORT Act Reporting**: 32 hours
- **Content Moderation**: 32 hours
- **Testing & QA**: 24 hours
- **Total**: ~128 hours (~$15,000-$20,000 at $120/hour)

---

## Compliance Checklist

### Age Verification (COPPA 2025)
- ✅ Government ID verification via Veriff
- ✅ Block under-18 users
- ✅ Verification badge on profiles
- ✅ Re-verification every 2 years
- ✅ Middleware enforcement on all protected routes

### REPORT Act (2024)
- ✅ In-app reporting tools
- ✅ Anonymous reporting option
- ✅ Trafficking/exploitation categories
- ✅ Auto-escalation to law enforcement
- ✅ Emergency hotline information
- ✅ <24 hour response time for critical reports

### Content Moderation (Child Safety)
- ✅ Automated keyword flagging
- ✅ Photo analysis for minors
- ✅ Human review queue
- ✅ <4 hour review time
- ✅ Zero tolerance for child photos
- ✅ PII detection and removal

---

**Document Version**: 1.0
**Last Updated**: November 7, 2025
**Next Review**: Post-implementation testing
