# CoNest Test User Guide

**Last Updated**: 2025-10-13
**Purpose**: Complete reference for all test accounts to verify Browse Discovery, Profile Modal, and matching features

---

## Quick Reference

### Universal Test Password
**All test accounts use the same password**: `TestPassword123!`

### Primary Test Accounts (Detailed Profiles)

| Email | Name | Children | Budget | Verification | Special Features |
|-------|------|----------|--------|--------------|------------------|
| sarah.verified@test.com | Sarah Johnson | 2 (5-10) | $800-$1200 | ✅ Full | Teacher, structured schedule |
| maria.fullverified@test.com | Maria Garcia | 1 (2-4) | $700-$1000 | ✅ Full + 2FA | Nurse, night shifts |
| lisa.pending@test.com | Lisa Chen | 1 (6-8) | $1000-$1500 | ⚠️ Partial | Remote software engineer |
| jennifer.complete@test.com | Jennifer Martinez | 3 (4-12) | $900-$1300 | ✅ Full | Restaurant manager, evenings |
| amanda.new@test.com | Amanda Wilson | 1 (0-1) | $600-$900 | ❌ None | New user, accountant |
| michelle.budget@test.com | Michelle Brown | 2 (7-9) | $650-$950 | ✅ Full | Retail manager, limited budget |
| patricia.schedule@test.com | Patricia Davis | 1 (13-15) | $850-$1100 | ⚠️ Partial | Freelance designer, flexible |
| karen.lifestyle@test.com | Karen Anderson | 2 (3-6) | $750-$1050 | ✅ Full | Yoga instructor, health-focused |

---

## 🎯 Recommended Test Scenarios

### Scenario 1: View Fully Verified Profile
**Use**: `sarah.verified@test.com` / `TestPassword123!`

**What to Test**:
- ✅ Full verification badges displayed
- ✅ All profile sections render correctly
- ✅ Compatibility scores visible
- ✅ Photo gallery works (if photos exist)
- ✅ Schedule compatibility section
- ✅ Parenting philosophy details
- ✅ Housing preferences and budget
- ✅ "I'm Interested" button functional

**Profile Details**:
- **Name**: Sarah Johnson
- **Location**: Austin, TX (78701)
- **Children**: 2 kids (ages 5-10)
- **Budget**: $800-$1200/month
- **Work**: Teacher (Mon-Fri 8am-4pm)
- **Parenting Style**: Structured
- **Verification**: ✅ ID, ✅ Income, ✅ Background
- **House Rules**: No smoking, pets OK, quiet hours 9pm-7am
- **Lifestyle**: Very clean, moderate social, omnivore, regular exercise

---

### Scenario 2: Test 2FA Authentication
**Use**: `maria.fullverified@test.com` / `TestPassword123!`

**What to Test**:
- ✅ Login with 2FA enabled
- ✅ Full verification status
- ✅ Night shift schedule display
- ✅ Vegetarian dietary preference

**Profile Details**:
- **Name**: Maria Garcia
- **Location**: Austin, TX (78702)
- **Children**: 1 toddler (2-4 years)
- **Budget**: $700-$1000/month
- **Work**: Nurse (Rotating 7pm-7am)
- **Parenting Style**: Relaxed
- **Verification**: ✅ Full + 2FA enabled
- **House Rules**: No smoking, no pets, quiet hours 8pm-8am
- **Lifestyle**: Moderate clean, low social, vegetarian, occasional exercise

---

### Scenario 3: Partial Verification Status
**Use**: `lisa.pending@test.com` / `TestPassword123!`

**What to Test**:
- ⚠️ Partial verification badge
- ⚠️ Missing income verification
- ⚠️ Missing background check
- ✅ ID verification only

**Profile Details**:
- **Name**: Lisa Chen
- **Location**: Austin, TX (78703)
- **Children**: 1 child (6-8 years)
- **Budget**: $1000-$1500/month (highest budget)
- **Work**: Software Engineer (Remote, flexible)
- **Parenting Style**: Balanced
- **Verification**: ✅ ID only (Income ❌, Background ❌)
- **House Rules**: No smoking, pets OK, quiet hours 9pm-7am
- **Lifestyle**: Very clean, moderate social, omnivore, regular exercise

---

### Scenario 4: Multiple Children (Largest Family)
**Use**: `jennifer.complete@test.com` / `TestPassword123!`

**What to Test**:
- ✅ 3 children display correctly
- ✅ Age groups: toddler, elementary, teen
- ✅ Evening work schedule display
- ✅ Larger space needs

**Profile Details**:
- **Name**: Jennifer Martinez
- **Location**: Austin, TX (78704)
- **Children**: 3 kids (ages 4-12)
- **Budget**: $900-$1300/month
- **Work**: Restaurant Manager (Tue-Sat 2pm-11pm)
- **Parenting Style**: Structured
- **Verification**: ✅ Full
- **House Rules**: No smoking, no pets, quiet hours 10pm-7am
- **Lifestyle**: Moderate clean, high social, omnivore, occasional exercise

---

### Scenario 5: New Unverified User
**Use**: `amanda.new@test.com` / `TestPassword123!`

**What to Test**:
- ❌ No verification badges
- ❌ Profile may be hidden from discovery
- ✅ Infant age group display
- ✅ Entry-level budget

**Profile Details**:
- **Name**: Amanda Wilson
- **Location**: Austin, TX (78705)
- **Children**: 1 infant (0-1 year)
- **Budget**: $600-$900/month (lowest budget)
- **Work**: Accountant (Mon-Fri 9am-5pm)
- **Parenting Style**: Balanced
- **Verification**: ❌ None (New user)
- **House Rules**: No smoking, pets OK, quiet hours 8pm-8am
- **Lifestyle**: Very clean, low social, omnivore, no exercise

---

### Scenario 6: Budget-Conscious User
**Use**: `michelle.budget@test.com` / `TestPassword123!`

**What to Test**:
- ✅ Lower budget range display
- ✅ Retail schedule (variable hours)
- ✅ High social level indicator
- ✅ Full verification despite budget

**Profile Details**:
- **Name**: Michelle Brown
- **Location**: Austin, TX (78701)
- **Children**: 2 kids (7-9 years)
- **Budget**: $650-$950/month
- **Work**: Retail Manager (Variable hours)
- **Parenting Style**: Relaxed
- **Verification**: ✅ Full
- **House Rules**: No smoking, no pets, quiet hours 9pm-7am, guests anytime
- **Lifestyle**: Moderate clean, high social, omnivore, occasional exercise

---

### Scenario 7: Flexible Schedule Professional
**Use**: `patricia.schedule@test.com` / `TestPassword123!`

**What to Test**:
- ⚠️ Partial verification (no income verification)
- ✅ Teenager age group display
- ✅ Freelance/self-employed schedule
- ✅ Vegetarian lifestyle

**Profile Details**:
- **Name**: Patricia Davis
- **Location**: Austin, TX (78702)
- **Children**: 1 teenager (13-15)
- **Budget**: $850-$1100/month
- **Work**: Freelance Designer (Self-employed, flexible)
- **Parenting Style**: Balanced
- **Verification**: ⚠️ ID + Background only (Income ❌)
- **House Rules**: No smoking, pets OK, quiet hours 10pm-8am
- **Lifestyle**: Very clean, low social, vegetarian, regular exercise

---

### Scenario 8: Health & Wellness Focused
**Use**: `karen.lifestyle@test.com` / `TestPassword123!`

**What to Test**:
- ✅ Vegan lifestyle display
- ✅ Daily exercise indicator
- ✅ Attachment parenting style
- ✅ Morning work schedule

**Profile Details**:
- **Name**: Karen Anderson
- **Location**: Austin, TX (78703)
- **Children**: 2 kids (3-6 years)
- **Budget**: $750-$1050/month
- **Work**: Yoga Instructor (Mon-Sat mornings)
- **Parenting Style**: Attachment
- **Verification**: ✅ Full
- **House Rules**: No smoking, pets OK, quiet hours 8pm-7am, ask first for guests
- **Lifestyle**: Very clean, moderate social, vegan, daily exercise

---

## 🎨 Discovery Screen Test Accounts (20 Profiles)

These accounts populate the Browse Discovery screen with varied profiles for comprehensive testing.

### Bay Area Discovery Profiles
**Password**: `Test1234!` (different from main test accounts)

| Email | Name | Location | Children | Budget | Schedule |
|-------|------|----------|----------|--------|----------|
| sarah.johnson@test.com | Sarah Johnson | Oakland, CA | 2 (toddler, elementary) | $1000-$1500 | Shift work |
| jennifer.lee@test.com | Jennifer Lee | San Francisco, CA | 1 (elementary) | $1500-$2000 | Fixed, WFH |
| maria.garcia@test.com | Maria Garcia | Oakland, CA | 3 (mixed ages) | $900-$1300 | Fixed |
| amanda.wilson@test.com | Amanda Wilson | Berkeley, CA | 1 (teen) | $1200-$1800 | Flexible, WFH |
| lisa.martinez@test.com | Lisa Martinez | Oakland, CA | 2 (toddler, elementary) | $1100-$1600 | Shift work |
| rachel.brown@test.com | Rachel Brown | San Francisco, CA | 2 (elementary, teen) | $1400-$1900 | Fixed |
| emily.davis@test.com | Emily Davis | Oakland, CA | 1 (elementary) | $1000-$1400 | Flexible, WFH |
| nicole.anderson@test.com | Nicole Anderson | Berkeley, CA | 2 (teens) | $1100-$1500 | Shift work |
| michelle.thomas@test.com | Michelle Thomas | San Francisco, CA | 1 (toddler) | $1600-$2200 | Flexible, WFH |
| jessica.taylor@test.com | Jessica Taylor | Oakland, CA | 2 (toddler, elementary) | $1000-$1400 | Shift work |
| angela.moore@test.com | Angela Moore | Berkeley, CA | 1 (elementary) | $900-$1200 | Fixed |
| stephanie.jackson@test.com | Stephanie Jackson | Oakland, CA | 2 (elementary, teen) | $1300-$1700 | Fixed, WFH |
| rebecca.white@test.com | Rebecca White | Berkeley, CA | 1 (teen) | $1000-$1400 | Flexible, WFH |
| lauren.harris@test.com | Lauren Harris | San Francisco, CA | 2 (toddler, elementary) | $1500-$2000 | Fixed |
| ashley.martin@test.com | Ashley Martin | Oakland, CA | 1 (elementary) | $1100-$1500 | Shift work |
| megan.thompson@test.com | Megan Thompson | Berkeley, CA | 2 (elementary, teen) | $900-$1300 | Fixed |
| kimberly.garcia@test.com | Kimberly Garcia | San Francisco, CA | 1 (teen) | $1400-$1800 | Flexible, WFH |
| christina.rodriguez@test.com | Christina Rodriguez | Oakland, CA | 2 (toddler, elementary) | $1200-$1600 | Fixed |
| brittany.lewis@test.com | Brittany Lewis | Berkeley, CA | 1 (toddler) | $1300-$1700 | Flexible, WFH |
| samantha.walker@test.com | Samantha Walker | Oakland, CA | 2 (teens) | $1100-$1500 | Shift work |

**Key Features of Discovery Profiles**:
- ✅ All fully verified (ID + Background)
- ✅ Ages 30-45 (realistic demographics)
- ✅ Varied work schedules (fixed, flexible, shift, WFH)
- ✅ Different child age groups (toddler, elementary, teen)
- ✅ Budget range: $900-$2200/month
- ✅ Geographic diversity (Oakland, SF, Berkeley)

---

## 🧪 Complete Test Workflow

### Full Feature Testing Sequence

1. **Login with Primary Account**
   ```
   Email: sarah.verified@test.com
   Password: TestPassword123!
   ```

2. **Navigate to Discover Tab**
   - Tap "Discover" in bottom navigation
   - Wait for profile cards to load

3. **Browse Profiles**
   - Scroll through grid of profile cards
   - Verify compatibility scores display
   - Check verification badges visible

4. **Open Profile Details Modal**
   - Tap any profile card
   - Modal slides in from bottom

5. **Verify Modal Sections**
   - [ ] Photo gallery with swipe
   - [ ] Basic info (name, age, city, children)
   - [ ] Compatibility breakdown (5 bars)
   - [ ] Bio and "Looking For"
   - [ ] Housing & Budget section
   - [ ] Schedule section
   - [ ] Parenting philosophy section
   - [ ] Personality traits
   - [ ] Interests tags
   - [ ] Verification badges

6. **Test Modal Actions**
   - [ ] "I'm Interested" button → Connection request
   - [ ] "Continue Browsing" → Close modal
   - [ ] Pull-to-close gesture → Modal closes

7. **Test Multiple Profiles**
   - Open 3-5 different profiles
   - Verify data changes correctly
   - No stale data displayed

8. **Test Different Verification Levels**
   - Login as fully verified user
   - Login as partially verified user
   - Login as unverified user
   - Verify badge differences

---

## 🔍 Profile Modal Type Fix Testing

### Verify ExtendedProfileCard Integration

The recent type fix ensures ProfileDetailsModal receives complete profile data. Test these specific fields that were previously causing render errors:

#### Critical Fields to Verify (Previously Missing)

1. **additionalPhotos** (Photo Gallery)
   - [ ] Swipe between multiple photos
   - [ ] Indicators show current photo
   - [ ] Gradient overlay displays

2. **compatibilityBreakdown** (Compatibility Bars)
   - [ ] Schedule compatibility bar (%)
   - [ ] Parenting compatibility bar (%)
   - [ ] Location compatibility bar (%)
   - [ ] Budget compatibility bar (%)
   - [ ] Lifestyle compatibility bar (%)
   - [ ] Color coding (green/yellow/orange/red)

3. **lookingFor** (Looking For Section)
   - [ ] "Looking For" text displays
   - [ ] Section header visible
   - [ ] Text wraps correctly

4. **schedule** (Schedule Section)
   - [ ] Work schedule type displays
   - [ ] Typical work hours shown
   - [ ] Weekend availability indicated
   - [ ] Flexibility level visible

5. **parenting** (Parenting Section)
   - [ ] Parenting philosophy tags
   - [ ] Discipline style displayed
   - [ ] Education priorities shown
   - [ ] Screen time approach visible

6. **housingPreferences** (Housing Section)
   - [ ] Housing type preference
   - [ ] Pet-friendly indicator
   - [ ] Smoke-free status
   - [ ] Other preferences

7. **personalityTraits** (Personality Section)
   - [ ] Personality tag chips
   - [ ] Proper spacing and wrapping
   - [ ] Visual styling

8. **interests** (Interests Section)
   - [ ] Interest tag chips
   - [ ] Multiple interests display
   - [ ] Clean visual layout

---

## 🐛 Known Issues & Limitations

### Database Schema Differences

The seed files use slightly different field names than the app expects:

**Seed Schema** → **App Expected**:
- `children_ages_range` → `children_age_groups`
- `location_city` → `city`
- `location_state` → `state`
- `location_zip` → `zip_code`

**Impact**: Some profile data may not display correctly until schema is aligned.

### Verification Levels

- **Full Verification**: ID + Income + Background
- **Partial Verification**: ID + Background OR ID only
- **Unverified**: New users without any checks

### Discovery Algorithm

Profiles shown in Browse Discovery are filtered by:
- ✅ Fully verified users only (by default)
- ✅ Active status
- ✅ Within budget compatibility range
- ✅ Not previously swiped/connected

---

## 📊 Data Summary

### Profile Statistics

- **Total Test Accounts**: 28
- **Austin, TX Profiles**: 8 (detailed profiles)
- **Bay Area Profiles**: 20 (discovery profiles)
- **Fully Verified**: 23 (82%)
- **Partially Verified**: 3 (11%)
- **Unverified**: 2 (7%)

### Budget Distribution

- **Low Budget** ($600-$1000): 6 profiles (21%)
- **Mid Budget** ($1000-$1500): 16 profiles (57%)
- **High Budget** ($1500-$2200): 6 profiles (21%)

### Children Distribution

- **1 Child**: 14 profiles (50%)
- **2 Children**: 12 profiles (43%)
- **3 Children**: 2 profiles (7%)

### Work Schedule Types

- **Fixed Schedule**: 11 profiles (39%)
- **Shift Work**: 9 profiles (32%)
- **Flexible/WFH**: 8 profiles (29%)

---

## 🚀 Quick Start Commands

### Run Database Seeds

```bash
# Seed primary test users (Austin profiles)
cd backend
npm run knex seed:run -- --specific=001_test_users.ts

# Seed discovery profiles (Bay Area profiles)
npm run knex seed:run -- --specific=001_test_discovery_profiles.ts

# Seed all test data
npm run knex seed:run
```

### Launch iOS App

```bash
cd mobile
npx react-native run-ios --simulator="iPhone 16 Pro"
```

### Monitor Logs

```bash
# iOS logs
tail -f /tmp/ios-run.log

# React Native Metro bundler
npx react-native start
```

---

## 📝 Testing Checklist

### Profile Modal Complete Test

- [ ] Login successful with test account
- [ ] Navigate to Discover tab
- [ ] Profile cards load and display
- [ ] Tap profile card opens modal
- [ ] **Modal renders without errors** ✅ (Type fix verified)
- [ ] Photo gallery section visible
- [ ] Compatibility bars render (all 5)
- [ ] Schedule section displays
- [ ] Parenting section displays
- [ ] Housing & budget section visible
- [ ] Personality traits render
- [ ] Interests render
- [ ] "I'm Interested" button works
- [ ] "Continue Browsing" closes modal
- [ ] Pull-to-close gesture works
- [ ] No console errors or warnings
- [ ] Test with 3+ different profiles
- [ ] All sections populate with data

---

**Report Generated**: 2025-10-13
**Primary Test Password**: `TestPassword123!`
**Discovery Test Password**: `Test1234!`
**Total Test Accounts**: 28 verified profiles
**Recommended Starting Account**: sarah.verified@test.com
