-- PostgreSQL Schema for SafeNest/CoNest Platform
-- CRITICAL SAFETY RULE: NO CHILD DATA STORED - Parent profiles only
-- Version: 1.0
-- Created: 2025-10-03

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Users table (authentication layer)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT,
    refresh_token_hash TEXT,
    last_login TIMESTAMPTZ,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================================================
-- PARENT PROFILES (NO CHILD-SPECIFIC DATA)
-- ============================================================================

CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_photo_url TEXT,
    date_of_birth DATE NOT NULL,

    -- Family info (GENERIC ONLY - no names, no photos, no identifying details of children)
    children_count INTEGER NOT NULL CHECK (children_count > 0),
    children_age_groups TEXT[] NOT NULL, -- ['toddler', 'preschool', 'elementary', 'middle', 'high', 'adult']

    -- Work & Schedule
    occupation VARCHAR(255),
    employer VARCHAR(255),
    work_schedule JSONB, -- {mon: {start: '9:00', end: '17:00'}, ...}
    work_from_home BOOLEAN DEFAULT false,

    -- Parenting & Household Preferences
    parenting_style VARCHAR(50), -- 'authoritative', 'gentle', 'structured', 'relaxed'
    household_preferences JSONB, -- {pets: boolean, smoking: boolean, noise_level: string, cleanliness: string}
    dietary_restrictions TEXT[],
    allergies TEXT[],

    -- Verification Status
    verified_status VARCHAR(50) DEFAULT 'pending' CHECK (verified_status IN ('pending', 'verified', 'rejected', 'expired')),
    background_check_status VARCHAR(50) DEFAULT 'not_started' CHECK (background_check_status IN ('not_started', 'pending', 'clear', 'review', 'failed')),
    background_check_date DATE,
    id_verified BOOLEAN DEFAULT false,
    income_verified BOOLEAN DEFAULT false,
    references_count INTEGER DEFAULT 0,

    -- Location (encrypted address, public location point)
    location GEOGRAPHY(POINT), -- ST_Point for geospatial queries
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    preferred_radius INTEGER DEFAULT 10, -- miles
    school_districts TEXT[],

    -- Housing Search
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    move_in_date DATE,
    looking_for_housing BOOLEAN DEFAULT true,

    -- Profile Completion
    profile_completed BOOLEAN DEFAULT false,
    profile_completion_percentage INTEGER DEFAULT 0,

    -- Account Standing
    trust_score DECIMAL(3,2) DEFAULT 0.50, -- 0.00 to 1.00
    response_rate DECIMAL(3,2) DEFAULT 0.00,
    average_response_time INTEGER, -- minutes

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HOUSEHOLDS
-- ============================================================================

CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,

    -- Address (encrypted for privacy)
    address_encrypted TEXT NOT NULL,
    address_hash TEXT, -- For duplicate detection without exposing actual address
    location GEOGRAPHY(POINT) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    school_district VARCHAR(255),

    -- Property Details
    property_type VARCHAR(50) CHECK (property_type IN ('house', 'townhouse', 'apartment', 'condo', 'other')),
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(3,1),
    square_feet INTEGER,
    parking_spaces INTEGER,

    -- Financials
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2),
    utilities_included BOOLEAN DEFAULT false,
    utilities_estimate DECIMAL(10,2),

    -- Safety & Features
    child_safety_features JSONB, -- {fenced_yard, pool_fence, outlet_covers, etc}
    amenities TEXT[],
    house_rules TEXT NOT NULL,
    pet_policy VARCHAR(100),

    -- Occupancy
    max_occupants INTEGER NOT NULL,
    current_occupants INTEGER DEFAULT 1,
    available_rooms INTEGER,

    -- Media
    photos JSONB, -- [{url: string, caption: string, order: number}]
    virtual_tour_url TEXT,

    -- Lease Info
    lease_start_date DATE,
    lease_end_date DATE,
    lease_type VARCHAR(50) CHECK (lease_type IN ('month-to-month', 'fixed-term', 'sublease')),

    -- Ownership
    created_by UUID REFERENCES parents(id) ON DELETE SET NULL,
    landlord_approved BOOLEAN DEFAULT false,

    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household Members (junction table)
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('owner', 'co-tenant', 'pending')),
    move_in_date DATE,
    move_out_date DATE,
    rent_share DECIMAL(10,2),
    security_deposit_paid DECIMAL(10,2),
    lease_signed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, parent_id)
);

-- ============================================================================
-- MATCHING SYSTEM
-- ============================================================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent1_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    parent2_id UUID REFERENCES parents(id) ON DELETE CASCADE,

    -- Compatibility Scoring
    compatibility_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    score_breakdown JSONB NOT NULL, -- {schedule: 85, parenting: 90, house_rules: 75, location: 95, budget: 80, lifestyle: 70}

    -- Match Status
    parent1_status VARCHAR(20) DEFAULT 'pending' CHECK (parent1_status IN ('pending', 'liked', 'passed', 'blocked')),
    parent2_status VARCHAR(20) DEFAULT 'pending' CHECK (parent2_status IN ('pending', 'liked', 'passed', 'blocked')),
    matched BOOLEAN DEFAULT false,
    matched_at TIMESTAMPTZ,

    -- Interaction History
    parent1_viewed_at TIMESTAMPTZ,
    parent2_viewed_at TIMESTAMPTZ,
    conversation_started BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(parent1_id, parent2_id),
    CHECK (parent1_id < parent2_id) -- Ensure consistent ordering
);

-- ============================================================================
-- MESSAGING (Encrypted)
-- ============================================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    participant2_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,

    last_message_at TIMESTAMPTZ,
    last_message_preview_encrypted TEXT,

    participant1_archived BOOLEAN DEFAULT false,
    participant2_archived BOOLEAN DEFAULT false,
    participant1_muted BOOLEAN DEFAULT false,
    participant2_muted BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(participant1_id, participant2_id, household_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES parents(id) ON DELETE CASCADE,

    -- Encrypted Content
    message_encrypted TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'system')),

    -- Attachments
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    attachment_size_bytes INTEGER,

    -- Status
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    deleted_by_sender BOOLEAN DEFAULT false,
    deleted_by_recipient BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VERIFICATION & BACKGROUND CHECKS
-- ============================================================================

CREATE TABLE background_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,

    -- External Service IDs
    checkr_candidate_id VARCHAR(255) UNIQUE,
    checkr_report_id VARCHAR(255) UNIQUE,

    -- Check Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete', 'consider', 'suspended', 'failed')),

    -- Results (stored as encrypted JSON)
    criminal_search JSONB,
    sex_offender_search JSONB,
    county_criminal_search JSONB,
    national_criminal_search JSONB,

    -- Adjudication
    overall_result VARCHAR(20) CHECK (overall_result IN ('clear', 'review', 'failed')),
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,

    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- Background checks expire after 1 year

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE id_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,

    -- Jumio Integration
    jumio_scan_reference VARCHAR(255) UNIQUE,
    jumio_transaction_reference VARCHAR(255),

    -- Verification Details
    id_type VARCHAR(50) CHECK (id_type IN ('drivers_license', 'passport', 'state_id', 'national_id')),
    id_number_hash TEXT, -- Hashed, never store plaintext
    issuing_country VARCHAR(3),
    issuing_state VARCHAR(50),

    -- Verification Results
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'review')),
    face_match_score DECIMAL(3,2), -- 0.00 to 1.00
    document_validity BOOLEAN,

    -- Data Extraction
    verified_first_name VARCHAR(100),
    verified_last_name VARCHAR(100),
    verified_dob DATE,

    expires_at DATE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENTS & BILLING
-- ============================================================================

CREATE TABLE stripe_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID UNIQUE REFERENCES parents(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
    stripe_connect_account_id VARCHAR(255) UNIQUE,

    onboarding_complete BOOLEAN DEFAULT false,
    payouts_enabled BOOLEAN DEFAULT false,
    charges_enabled BOOLEAN DEFAULT false,

    default_payment_method_id VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    payer_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES parents(id) ON DELETE SET NULL,

    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    stripe_charge_id VARCHAR(255),

    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_type VARCHAR(50) CHECK (payment_type IN ('rent', 'utilities', 'deposit', 'subscription', 'success_fee')),

    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),

    description TEXT,
    due_date DATE,
    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,

    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_price_id VARCHAR(255),

    plan_type VARCHAR(50) CHECK (plan_type IN ('free', 'premium', 'enterprise')),
    status VARCHAR(50) CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),

    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SAFETY & REPORTING
-- ============================================================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    reported_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    report_type VARCHAR(50) CHECK (report_type IN ('harassment', 'inappropriate_content', 'scam', 'safety_concern', 'fake_profile', 'other')),
    description TEXT NOT NULL,
    evidence_urls JSONB,

    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),

    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    action_taken VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- ============================================================================
-- ACTIVITY LOGGING
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Parents
CREATE INDEX idx_parents_user_id ON parents(user_id);
CREATE INDEX idx_parents_location ON parents USING GIST (location);
CREATE INDEX idx_parents_school_districts ON parents USING GIN (school_districts);
CREATE INDEX idx_parents_verified_status ON parents(verified_status);
CREATE INDEX idx_parents_looking_for_housing ON parents(looking_for_housing) WHERE looking_for_housing = true;
CREATE INDEX idx_parents_budget ON parents(budget_min, budget_max);

-- Households
CREATE INDEX idx_households_location ON households USING GIST (location);
CREATE INDEX idx_households_active ON households(active) WHERE active = true;
CREATE INDEX idx_households_created_by ON households(created_by);
CREATE INDEX idx_households_rent ON households(monthly_rent);

-- Matches
CREATE INDEX idx_matches_parent1 ON matches(parent1_id, parent2_status);
CREATE INDEX idx_matches_parent2 ON matches(parent2_id, parent1_status);
CREATE INDEX idx_matches_score ON matches(compatibility_score DESC);
CREATE INDEX idx_matches_matched ON matches(matched, matched_at DESC);

-- Messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_conversations_participants ON conversations(participant1_id, participant2_id);

-- Payments
CREATE INDEX idx_payments_household ON payments(household_id, created_at DESC);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status, due_date);

-- Reports
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);

-- Audit Logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA FOR DEVELOPMENT
-- ============================================================================

-- Note: Seed data should be added via separate migration files
-- This schema file only contains structure definitions
