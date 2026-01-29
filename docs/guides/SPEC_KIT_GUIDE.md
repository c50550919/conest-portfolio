# Spec Kit Integration Guide - CoNest Project

## 🌱 What is Spec Kit?

**Spec Kit** is GitHub's official toolkit for **Spec-Driven Development** - a methodology that emphasizes creating detailed specifications before writing code. It helps you focus on the "what" and "why" of your project before determining the technical implementation.

### **Key Philosophy**
Specifications become **executable** - they directly generate working implementations rather than just guiding them.

---

## ✅ **Installation Status**

### **Installed & Configured** ✅

- ✅ Spec Kit CLI installed globally via `uv`
- ✅ Initialized in CoNest project with Claude Code support
- ✅ `.claude/commands/` directory created with 7 slash commands
- ✅ `.gitignore` updated to protect credentials
- ✅ Ready to use in tandem with Claude Code

### **Verification**
```bash
specify --help
# Should show Spec Kit CLI help
```

---

## 📋 **Available Slash Commands**

Spec Kit adds these slash commands to your Claude Code workflow:

### **1. `/constitution` - Establish Project Principles**
Create governing principles and development guidelines

```
/constitution Create principles focused on code quality, testing standards, user experience consistency, and performance requirements
```

**What it does:**
- Establishes project values
- Defines development standards
- Sets quality benchmarks
- Creates governance framework

**Location:** `.claude/commands/constitution.md`

---

### **2. `/specify` - Create Specifications**
Describe what you want to build (focus on "what" and "why", not tech stack)

```
/specify Build a swipeable discovery screen for the mobile app that shows parent profiles as cards. Users can swipe right to like, left to pass. Each card shows compatibility score, verification badges, and basic info. NO child data displayed.
```

**What it does:**
- Creates detailed feature specifications
- Documents requirements
- Focuses on user needs
- Defines expected behavior

**Location:** `.claude/commands/specify.md`

---

### **3. `/plan` - Create Implementation Plan**
Provide tech stack and architecture choices

```
/plan The Discovery screen uses React Native Reanimated for smooth animations, Redux Toolkit for state management, and integrates with our existing matching API. Follow the UI_DESIGN.md color palette and component patterns.
```

**What it does:**
- Defines technical approach
- Selects technologies
- Outlines architecture
- Specifies constraints

**Location:** `.claude/commands/plan.md`

---

### **4. `/tasks` - Generate Actionable Tasks**
Break down the implementation plan into specific tasks

```
/tasks Create a task breakdown for implementing the Discovery screen
```

**What it does:**
- Creates task list from plan
- Defines dependencies
- Estimates effort
- Assigns priorities

**Location:** `.claude/commands/tasks.md`

---

### **5. `/implement` - Execute Implementation**
Implement the planned tasks

```
/implement Implement Task 1: Create swipeable card component
```

**What it does:**
- Generates working code
- Follows specifications exactly
- Implements one task at a time
- Validates against spec

**Location:** `.claude/commands/implement.md`

---

### **6. `/clarify` (Optional) - Ask Structured Questions**
De-risk ambiguous areas before planning

```
/clarify What are the edge cases for the swipe gesture? What happens when a user runs out of matches?
```

**What it does:**
- Identifies ambiguities
- Asks targeted questions
- Reduces implementation risk
- Improves specification quality

**Location:** `.claude/commands/clarify.md`

---

### **7. `/analyze` (Optional) - Consistency Report**
Check cross-artifact alignment (run after `/tasks`, before `/implement`)

```
/analyze Check if the Discovery screen tasks align with our existing architecture and design system
```

**What it does:**
- Validates consistency
- Identifies conflicts
- Ensures alignment
- Reports issues

**Location:** `.claude/commands/analyze.md`

---

## 🔄 **Spec-Driven Development Workflow**

### **Recommended Flow**

```mermaid
graph TD
    A[/constitution] -->|Establish principles| B[/specify]
    B -->|Define feature| C{Clear enough?}
    C -->|No| D[/clarify]
    D --> B
    C -->|Yes| E[/plan]
    E -->|Create technical plan| F[/tasks]
    F -->|Break down work| G[/analyze]
    G -->|Validate consistency| H{Consistent?}
    H -->|No| E
    H -->|Yes| I[/implement]
    I -->|Execute tasks| J{More tasks?}
    J -->|Yes| I
    J -->|No| K[Done!]
```

### **Step-by-Step Process**

#### **Phase 1: Foundation (One-time)**
1. **`/constitution`** - Set project principles
   - Code quality standards
   - Testing requirements
   - Security practices
   - Child safety compliance

#### **Phase 2: Specification (Per Feature)**
2. **`/specify`** - Describe the feature
   - What does it do?
   - Why do we need it?
   - Who is it for?
   - What are the requirements?

3. **`/clarify`** *(Optional)* - Ask questions
   - Edge cases
   - Ambiguities
   - Assumptions
   - Dependencies

#### **Phase 3: Planning (Per Feature)**
4. **`/plan`** - Define technical approach
   - Technology choices
   - Architecture decisions
   - Integration points
   - Constraints

5. **`/tasks`** - Break down into tasks
   - List all work items
   - Define dependencies
   - Estimate effort
   - Set priorities

6. **`/analyze`** *(Optional)* - Validate plan
   - Check consistency
   - Identify conflicts
   - Ensure alignment
   - Review dependencies

#### **Phase 4: Implementation (Per Task)**
7. **`/implement`** - Execute each task
   - Generate code
   - Follow specification
   - Test implementation
   - Validate against requirements

---

## 🎯 **Example: Implementing Discovery Screen**

### **Complete Workflow**

#### **Step 1: Specify the Feature**
```
/specify Build a Discovery screen for the CoNest mobile app:

**Purpose:** Help single parents find compatible roommates

**Requirements:**
- Display parent profiles as swipeable cards (Tinder-style)
- Show compatibility score (0-100%) with color gradient
- Display verification badges (ID, background check, phone, email)
- Show basic info: name, location, children count (NO child names/details)
- Show work schedule chip
- Actions: Swipe right (like), left (pass), or skip button
- Filter button in top-right
- Empty state when no matches
- Loading state while fetching

**User Flow:**
1. User opens Discovery tab
2. Sees stack of parent profile cards
3. Can swipe or tap buttons
4. Mutual like creates a match
5. Match notification appears

**Safety:**
- NO child-identifying information
- Only show verified parents
- Respect privacy settings
```

#### **Step 2: Create Technical Plan**
```
/plan Implementation approach for Discovery screen:

**Technologies:**
- React Native Reanimated for smooth swipe gestures
- React Native Gesture Handler for touch interactions
- Redux Toolkit for state management
- Existing API service (/api/v1/matches endpoint)

**Architecture:**
- Screen: DiscoverScreen.tsx (main container)
- Component: SwipeableCard.tsx (individual card)
- Component: CardStack.tsx (manages card stack)
- Hook: useSwipeGesture.ts (gesture logic)
- Hook: useMatches.ts (data fetching)

**Integration:**
- Use existing ParentCard component as base
- Follow UI_DESIGN.md color palette
- Integrate with existing matching service
- Redux: matchesSlice (actions: like, pass, skip)

**Constraints:**
- Must work on iOS 12+ and Android 8+
- 60fps animation performance
- Offline capability (cache last 10 cards)
- Child safety compliance (NO child data)
```

#### **Step 3: Generate Tasks**
```
/tasks Break down the Discovery screen implementation
```

**Expected Output:**
```markdown
## Discovery Screen Implementation Tasks

### Task 1: SwipeableCard Component
- Create base SwipeableCard component
- Add swipe gesture with Reanimated
- Implement like/pass animations
- Add verification badges display
- Test on iOS and Android

### Task 2: CardStack Management
- Create CardStack component
- Implement card stacking logic
- Add card removal animation
- Handle empty state
- Handle loading state

### Task 3: Gesture Handlers
- Create useSwipeGesture hook
- Implement swipe detection
- Add snap-back animation
- Handle button taps
- Test gesture responsiveness

### Task 4: State Management
- Update matchesSlice with swipe actions
- Add like/pass/skip reducers
- Implement optimistic updates
- Add API integration
- Handle offline mode

### Task 5: Screen Integration
- Create DiscoverScreen container
- Integrate CardStack
- Add filter button
- Implement match notification
- Add analytics tracking

### Task 6: Testing
- Unit tests for components
- Integration tests for gestures
- E2E test for complete flow
- Performance testing (60fps)
- Accessibility testing
```

#### **Step 4: Implement Each Task**
```
/implement Task 1: Create SwipeableCard Component

Create the SwipeableCard component following the specification and plan. Use React Native Reanimated for smooth animations, include verification badges, and ensure NO child data is displayed.
```

---

## 🔀 **Using Spec Kit WITH Claude Code's Task Tool**

### **Hybrid Approach** (Best of Both Worlds)

#### **Use Spec Kit For:**
- ✅ Planning and specification
- ✅ Structured documentation
- ✅ Team collaboration
- ✅ Technology-independent specs
- ✅ Consistency validation

#### **Use Claude Code Task Tool For:**
- ✅ Parallel implementation
- ✅ Fast file generation
- ✅ Multi-agent coordination
- ✅ Complex refactoring
- ✅ Bulk operations

### **Example Hybrid Workflow:**

```bash
# 1. Use Spec Kit to plan
/specify Build messaging UI for CoNest
/plan Use React Native, Socket.io, E2E encryption
/tasks Generate task breakdown

# 2. Use Task tool to implement in parallel
[Use Claude Code's Task tool to delegate]:
- Task 1 → Sub-agent A: Build conversation list
- Task 2 → Sub-agent B: Build chat interface
- Task 3 → Sub-agent C: Integrate Socket.io
- Task 4 → Sub-agent D: Add encryption layer

# 3. Use Spec Kit to validate
/analyze Check if implementation matches specification
```

---

## 📂 **Project Structure with Spec Kit**

```
conest/
├── .claude/                    # Spec Kit slash commands
│   ├── commands/
│   │   ├── constitution.md    # Project principles
│   │   ├── specify.md         # Feature specs
│   │   ├── plan.md           # Technical plans
│   │   ├── tasks.md          # Task breakdowns
│   │   ├── implement.md      # Implementation
│   │   ├── clarify.md        # Questions
│   │   └── analyze.md        # Consistency checks
│   └── settings.local.json   # Local settings (gitignored)
│
├── specs/                     # Specification documents (created by /specify)
│   ├── features/
│   │   ├── discovery-screen.md
│   │   ├── messaging-ui.md
│   │   └── household-management.md
│   └── architecture/
│       └── mobile-app.md
│
├── plans/                     # Technical plans (created by /plan)
│   ├── discovery-implementation.md
│   └── messaging-implementation.md
│
└── tasks/                     # Task lists (created by /tasks)
    ├── discovery-tasks.md
    └── messaging-tasks.md
```

---

## 🎓 **Best Practices**

### **1. Start with Constitution**
Always begin new features with `/constitution` to establish principles:
- Child safety compliance
- Code quality standards
- Performance requirements
- Testing guidelines

### **2. Spec Before Code**
Use `/specify` before writing any code:
- Reduces rework
- Improves clarity
- Enables better estimates
- Facilitates team review

### **3. Clarify Ambiguities Early**
Use `/clarify` when uncertain:
- Edge cases
- Integration points
- User flows
- Error handling

### **4. Validate Before Implementing**
Use `/analyze` before `/implement`:
- Check consistency
- Identify conflicts
- Ensure alignment
- Prevent technical debt

### **5. Implement Incrementally**
Use `/implement` for one task at a time:
- Easier to review
- Faster feedback
- Better quality
- Lower risk

---

## 🔒 **Security Considerations**

### **Protected Files (in .gitignore)**
```
.claude/settings.local.json     # Local settings
.claude/**/*.local.*            # Local configurations
.claude/**/credentials/         # Any credentials
.claude/**/auth/                # Authentication tokens
```

### **Safe to Commit**
```
.claude/commands/               # Slash command definitions
specs/                          # Specification documents
plans/                          # Technical plans
tasks/                          # Task lists
```

---

## 📚 **Resources**

### **Official Documentation**
- GitHub Repo: https://github.com/github/spec-kit
- README: Comprehensive guide
- AGENTS.md: AI agent support
- spec-driven.md: Methodology details

### **Project-Specific**
- [CLAUDE.md](./CLAUDE.md) - CoNest project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [UI_DESIGN.md](./UI_DESIGN.md) - Design system
- [SECURITY.md](./SECURITY.md) - Security practices

---

## 🚀 **Next Steps**

### **Immediate Actions**

1. **Create Project Constitution**
   ```
   /constitution Establish principles for CoNest development:
   - Child safety: NO child data storage
   - Code quality: 85%+ test coverage, max complexity 15
   - Security: All inputs validated, encryption for sensitive data
   - Performance: <200ms API responses, <2s app launch
   - Testing: Unit, integration, E2E, and compliance tests
   ```

2. **Specify Missing Mobile Screens**
   ```
   /specify Create specifications for:
   - Discovery screen (swipeable cards)
   - Messaging UI (real-time chat)
   - Household management (expense tracking)
   - Onboarding flow (7 screens)
   ```

3. **Create Implementation Plans**
   ```
   /plan Define technical approach for each specification
   ```

4. **Generate Task Lists**
   ```
   /tasks Break down each plan into actionable tasks
   ```

5. **Start Implementation**
   ```
   /implement Execute tasks one by one
   ```

---

## 💡 **Example Commands**

### **For Discovery Screen**
```bash
# 1. Specify the feature
/specify Build swipeable discovery screen with parent profile cards, verification badges, and compatibility scoring. NO child data.

# 2. Create technical plan
/plan Use React Native Reanimated, Redux Toolkit, existing API endpoints. Follow UI_DESIGN.md patterns.

# 3. Generate tasks
/tasks Create task breakdown for Discovery screen implementation

# 4. Implement first task
/implement Task 1: Create SwipeableCard component with gesture handlers
```

### **For Messaging UI**
```bash
/specify Build real-time messaging UI with encrypted messages, file sharing, and conversation list
/plan Integrate Socket.io, use existing encryption utilities, Redux for state
/tasks Break down messaging implementation
/implement Task 1: Build conversation list component
```

---

## ✅ **Summary**

**Spec Kit is now fully integrated with your CoNest project!**

**What's Ready:**
- ✅ 7 slash commands available in Claude Code
- ✅ Spec-Driven Development workflow
- ✅ Security configured (.gitignore)
- ✅ Ready to use alongside Task tool

**How to Use:**
1. Start with `/constitution` for principles
2. Use `/specify` for each feature
3. Create plans with `/plan`
4. Generate tasks with `/tasks`
5. Implement with `/implement`
6. Optionally use `/clarify` and `/analyze`

**Tandem Usage:**
- Spec Kit: Planning & documentation
- Task Tool: Parallel implementation
- Combined: Best of both worlds!

---

**Ready to start? Try:**
```
/constitution Create development principles for CoNest focusing on child safety, code quality, and performance
```
