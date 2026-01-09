# GitHub Project Views Setup Guide

This guide explains how to configure views in the CoNest GitHub Project for optimal workflow management.

## Sprint Overview

### Sprint 1 (Current) - 16 Story Points
| # | Issue | Points | Priority |
|---|-------|--------|----------|
| #1 | Payment System Enhancement - Backend API | 5 | 🔴 High |
| #2 | Mobile Billing Integration - iOS & Android | 5 | 🔴 High |
| #3 | Feature Documentation - Backend READMEs | 3 | 🟡 Medium |
| #6 | Core Backend Updates - Config & Utilities | 3 | 🟡 Medium |

### Sprint 2 (Next) - 5 Story Points
| # | Issue | Points | Priority |
|---|-------|--------|----------|
| #4 | Testing Infrastructure - Mobile & Backend | 3 | 🟡 Medium |
| #5 | Developer Tooling & Quality Standards | 2 | 🟢 Low |

**Total Velocity Target**: 16 points/sprint

---

## View Configuration

### 1. Sprint Board View

**Purpose**: Track current sprint progress

**Setup**:
1. Click **+ New view** → Select **Board**
2. Name: `Sprint Board`
3. **Filter**: `label:sprint:1` (or current sprint)
4. **Group by**: Status
5. Columns:
   - Ready (`status:ready`)
   - In Progress (`status:in-progress`)
   - In Review (`status:in-review`)
   - Done (closed)

### 2. Roadmap View

**Purpose**: Timeline planning across sprints

**Setup**:
1. Click **+ New view** → Select **Roadmap**
2. Name: `Roadmap`
3. **Date field**: Use Sprint labels for grouping
4. **Group by**: Sprint label
5. **Sort by**: Priority (High → Low)

**Alternative (Table-based)**:
1. Create Table view
2. Group by: `sprint:*` labels
3. Show columns: Title, Status, Priority, Points

### 3. Priority Board View

**Purpose**: Focus on high-impact items

**Setup**:
1. Click **+ New view** → Select **Board**
2. Name: `Priority Board`
3. **Group by**: Priority labels
4. Columns:
   - 🔴 High Priority (`priority:high`)
   - 🟡 Medium Priority (`priority:medium`)
   - 🟢 Low Priority (`priority:low`)

### 4. Team Items View

**Purpose**: Per-person workload view

**Setup**:
1. Click **+ New view** → Select **Table**
2. Name: `Team Items`
3. **Group by**: Assignee
4. **Show columns**: Title, Status, Sprint, Points, Priority
5. **Sort by**: Status

### 5. My Items View

**Purpose**: Personal task list

**Setup**:
1. Click **+ New view** → Select **Table**
2. Name: `My Items`
3. **Filter**: `assignee:@me`
4. **Sort by**: Priority (High → Low), then Status

### 6. Backlog View

**Purpose**: Unscheduled work

**Setup**:
1. Click **+ New view** → Select **Table**
2. Name: `Backlog`
3. **Filter**: `-label:sprint:1 -label:sprint:2` (no sprint assigned)
4. **Sort by**: Priority

### 7. Velocity Tracker View

**Purpose**: Track points completed per sprint

**Setup**:
1. Click **+ New view** → Select **Table**
2. Name: `Velocity`
3. **Group by**: Sprint label
4. **Show columns**: Title, Points, Status
5. Use **Insights** tab for burndown charts

---

## Label-Based Filtering Reference

### Sprint Filters
```
label:sprint:1          # Current sprint items
label:sprint:2          # Next sprint items
label:sprint:backlog    # Backlog items
-label:sprint:1         # NOT in current sprint
```

### Priority Filters
```
label:priority:high     # High priority
label:priority:medium   # Medium priority
label:priority:low      # Low priority
```

### Story Point Filters
```
label:points:1          # 1 point (2-4 hours)
label:points:2          # 2 points (half day)
label:points:3          # 3 points (1 day)
label:points:5          # 5 points (2-3 days)
label:points:8          # 8 points (1 week)
```

### Component Filters
```
label:component:backend     # Backend issues
label:component:frontend    # Mobile app issues
label:scope:payments        # Payment-related
```

### Combined Filters
```
# High priority backend items in Sprint 1
label:sprint:1 label:priority:high label:component:backend

# My in-progress items
assignee:@me label:status:in-progress

# Large items (5+ points) needing review
label:points:5,points:8 label:status:in-review
```

---

## Automation Tips

### Auto-Move on Status Change
When you change `status:*` labels, items move columns automatically.

### CLI Commands for Status Updates
```bash
# Start working on issue
gh issue edit 1 --remove-label "status:ready" --add-label "status:in-progress"

# Submit for review
gh issue edit 1 --remove-label "status:in-progress" --add-label "status:in-review"

# Complete issue
gh issue close 1
```

### Bulk Sprint Planning
```bash
# Move issues to Sprint 2
gh issue edit 4 5 --add-label "sprint:2" --remove-label "sprint:1"

# Assign story points
gh issue edit 7 --add-label "points:3"
```

---

## Recommended Workflow

### Daily Standup
1. Open **Sprint Board** view
2. Review "In Progress" column
3. Update blockers in issue comments

### Sprint Planning
1. Open **Backlog** view
2. Prioritize items by dragging or adding `priority:*` labels
3. Assign `sprint:*` and `points:*` labels
4. Verify total points ≤ velocity target

### Sprint Review
1. Open **Velocity** view
2. Check completed points
3. Use **Insights** for burndown chart

### Retrospective
1. Review **Insights** → Velocity trends
2. Discuss in GitHub Discussions
3. Create improvement issues for next sprint

---

## Quick Reference Card

| View | Filter | Group By |
|------|--------|----------|
| Sprint Board | `label:sprint:1` | Status |
| Roadmap | (all) | Sprint |
| Priority | (all) | Priority |
| Team Items | (all) | Assignee |
| My Items | `assignee:@me` | Status |
| Backlog | `-label:sprint:*` | Priority |
| Velocity | (all) | Sprint |

---

## Troubleshooting

### Items not appearing in view
- Check filter matches item labels
- Verify item is added to project

### Can't see story points
- Points are stored in `points:*` labels
- For native fields, run `.github/scripts/setup-project.sh`

### Velocity not calculating
- Ensure `points:*` labels are assigned
- Use Insights tab after closing issues
