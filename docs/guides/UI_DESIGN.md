# UI Design System

## Color Palette
```typescript
primary: '#2ECC71'        // Trust green - growth, safety
secondary: '#3498DB'      // Calm blue - stability
tertiary: '#F39C12'       // Warm amber - home
error: '#E74C3C'         // Alert red
success: '#27AE60'       // Verified green
background: '#FAFBFC'    // Soft gray
surface: '#FFFFFF'       // Pure white

Typography

Headers: Inter/System Font (Bold)
Body: Inter/System Font (Regular)
Small: Inter/System Font (Light)
Base size: 16px
Line height: 1.5

Spacing System

xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px

Component Library
Core Components

SafetyBadge

Shows verification status
Color-coded (green/yellow/gray)
Icons for different verification types


CompatibilityScore

Circular progress indicator
Percentage display
Color gradient (red→yellow→green)
Breakdown details on tap


ParentCard

Profile photo (80px circle)
Name and location
Verification badges
Children count (no details)
Work schedule chip
Compatibility score
Message/View buttons


TrustIndicator

Days since verification
Number of references
Response rate
Account age



Screen Layouts
Onboarding Flow

Welcome → Safety explanation
Phone verification
Basic profile setup
Children count/age ranges
Work schedule
Housing preferences
ID upload
Background check consent

Main App Navigation

Bottom tabs: Home, Discover, Messages, Household, Profile
Top bar: Location selector, Notifications

Key Screens Design

Discovery Screen

Swipeable cards (Tinder-style)
Filter button (top right)
Safety score prominent
Skip/Message/Like actions


Chat Screen

Encrypted badge visible
Document sharing button
Video call option
Report/Block in menu


Household Dashboard

Expense summary card
Calendar widget
Quick actions grid
Member avatars row



Animation Guidelines

Use Lottie for: Loading, success, verification
React Native Animated for: Swipes, transitions
Duration: 200-300ms for micro-interactions
Easing: EaseInOut for smooth feel

Accessibility Requirements

Minimum contrast: 4.5:1
Touch targets: 44x44pt minimum
Screen reader labels: All interactive elements
Font scaling: Support up to 200%

MCP Server Components

@magicuidesign/mcp: Landing animations, progress indicators
shadcn-ui: Forms, modals, core components
flyonui: Full page layouts, dashboards

---

## 📄 FILE: `DATABASE.sql`
```sql
-- PostgreSQL Schema for SafeNest Platform
-- NO CHILD DATA STORED - Parent profiles only

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parents table (NO child-specific data)
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_photo_url TEXT,
    
    -- Family info (generic only)
    children_count INTEGER NOT NULL,
    children_age_groups TEXT[], -- ['toddler', 'elementary', 'teen']
    
    -- Preferences
    work_schedule JSONB,
    parenting_style VARCHAR(50),
    household_preferences JSONB,
    
    -- Verification
    verified_status VARCHAR(50) DEFAULT 'pending',
    background_check_status VARCHAR(50),
    background_check_date DATE,
    id_verified BOOLEAN DEFAULT false,
    
    -- Location
    location GEOGRAPHY(POINT),
    preferred_radius INTEGER DEFAULT 10,
    school_districts TEXT[],
    
    -- Housing preferences
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    move_in_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Households table
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    address_encrypted TEXT,
    location GEOGRAPHY(POINT),
    school_district VARCHAR(255),
    property_type VARCHAR(50),
    bedrooms INTEGER,
    bathrooms DECIMAL(3,1),
    monthly_rent DECIMAL(10,2),
    child_safety_features JSONB,
    house_rules TEXT,
    max_occupants INTEGER,
    current_occupants INTEGER DEFAULT 0,
    photos JSONB,
    created_by UUID REFERENCES parents(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent1_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    parent2_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    compatibility_score DECIMAL(3,2),
    score_breakdown JSONB,
    parent1_liked BOOLEAN,
    parent2_liked BOOLEAN,
    matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent1_id, parent2_id)
);

-- Messages table (encrypted)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    sender_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES parents(id),
    message_encrypted TEXT NOT NULL,
    message_type VARCHAR(20),
    attachment_url TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Background checks table
CREATE TABLE background_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
    checkr_id VARCHAR(255) UNIQUE,
    status VARCHAR(50),
    criminal_search JSONB,
    sex_offender_search JSONB,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_parents_location ON parents USING GIST (location);
CREATE INDEX idx_parents_school_districts ON parents USING GIN (school_districts);
CREATE INDEX idx_households_location ON households USING GIST (location);
CREATE INDEX idx_matches_scores ON matches(compatibility_score DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);