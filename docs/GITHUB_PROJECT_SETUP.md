# GitHub Project Setup Guide

This guide explains how to set up and configure a GitHub Project for CoNest to enable Kanban-style project management, sprint planning, and velocity tracking.

## Table of Contents

- [Overview](#overview)
- [Creating the Project](#creating-the-project)
- [Configuring Custom Fields](#configuring-custom-fields)
- [Setting Up Views](#setting-up-views)
- [Branch Protection Rules](#branch-protection-rules)
- [Label Sync](#label-sync)
- [Workflow Summary](#workflow-summary)

---

## Overview

GitHub Projects provides:

- **Kanban Board**: Visual workflow management
- **Sprint Planning**: Iteration tracking with velocity
- **Custom Fields**: Story points, priority, sprint assignment
- **Automation**: Auto-add issues/PRs, status updates
- **Insights**: Burndown charts, velocity metrics

---

## Creating the Project

### Step 1: Create New Project

1. Go to your GitHub profile or organization
2. Click **Projects** tab → **New project**
3. Select **Board** template (or Table for sprint planning)
4. Name it: `CoNest Development`
5. Click **Create project**

### Step 2: Link to Repository

1. In the project, click **⚙️ Settings** (gear icon)
2. Under **Manage access**, add the `conest` repository
3. Enable "Issues" and "Pull requests" from this repo

---

## Configuring Custom Fields

Navigate to project settings and add these custom fields:

### 1. Story Points (Number)

- **Name**: `Story Points`
- **Type**: Number
- **Description**: Fibonacci estimation (1, 2, 3, 5, 8, 13)

### 2. Sprint (Iteration)

- **Name**: `Sprint`
- **Type**: Iteration
- **Duration**: 2 weeks (recommended)
- **Start Date**: Your sprint start date

This enables:
- Sprint velocity tracking
- Burndown charts
- Capacity planning

### 3. Priority (Single Select)

- **Name**: `Priority`
- **Type**: Single select
- **Options**:
  - 🔴 High (color: red)
  - 🟡 Medium (color: yellow)
  - 🟢 Low (color: green)

### 4. Type (Single Select)

- **Name**: `Type`
- **Type**: Single select
- **Options**:
  - ✨ Feature (color: green)
  - 🐛 Bug (color: red)
  - 🔧 Technical Debt (color: purple)
  - 🔬 Spike (color: blue)

### 5. Component (Single Select)

- **Name**: `Component`
- **Type**: Single select
- **Options**:
  - 📱 Frontend
  - ⚙️ Backend
  - 🗄️ Database
  - 🏗️ Infrastructure

---

## Setting Up Views

### Kanban Board View

1. Click **+ New view** → **Board**
2. Name: `Kanban`
3. Configure columns by **Status**:
   - 📋 Triage (status:triage)
   - 📚 Backlog (status:backlog)
   - ✅ Ready (status:ready)
   - 🔄 In Progress (status:in-progress)
   - 👀 In Review (status:in-review)
   - ✔️ Done (closed)

4. Enable **Sum of Story Points** for each column

### Sprint Planning View

1. Click **+ New view** → **Table**
2. Name: `Sprint Planning`
3. Group by: **Sprint**
4. Columns to show:
   - Title
   - Status
   - Type
   - Priority
   - Story Points
   - Assignees

### Backlog View

1. Click **+ New view** → **Table**
2. Name: `Backlog`
3. Filter: `no:sprint`
4. Sort by: Priority (High to Low)

### My Work View

1. Click **+ New view** → **Table**
2. Name: `My Work`
3. Filter: `assignee:@me`
4. Group by: Status

---

## Branch Protection Rules

### Configure for `main` branch

Go to **Settings** → **Branches** → **Add rule**

**Branch name pattern**: `main`

**Protection rules**:

- [x] Require a pull request before merging
  - [x] Require approvals: **2** (for production code)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners

- [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - Status checks:
    - `lint-and-format`
    - `unit-tests`
    - `integration-tests`
    - `Validate PR Title`

- [x] Require conversation resolution before merging

- [x] Do not allow bypassing the above settings
  - Even administrators must follow rules

- [ ] Allow force pushes (DISABLED)
- [ ] Allow deletions (DISABLED)

---

## Label Sync

### Option 1: GitHub CLI

```bash
# Install labels from configuration
cd /path/to/conest

# View current labels
gh label list

# Create labels manually or use a sync tool
```

### Option 2: Label Sync Tool

```bash
# Install the tool
npm install -g github-label-sync

# Sync labels (requires GitHub token)
github-label-sync \
  --access-token YOUR_GITHUB_TOKEN \
  --labels .github/labels.yml \
  ghostmac/conest
```

### Option 3: Manual Setup

Create labels in GitHub UI at: `https://github.com/ghostmac/conest/labels`

Use the colors and descriptions from `.github/labels.yml`

---

## Workflow Summary

### Daily Workflow

1. **Standup**: Review "In Progress" column
2. **Pick Work**: Move items from "Ready" to "In Progress"
3. **Create Branch**: `feature/ISSUE-description`
4. **Develop**: Commit with conventional format
5. **Open PR**: Link to issue, use template
6. **Review**: Get approvals, address feedback
7. **Merge**: Squash to main

### Sprint Workflow

#### Sprint Planning (Day 1)

1. Open **Sprint Planning** view
2. Review velocity from previous sprint (Insights tab)
3. Drag items from Backlog to current Sprint
4. Ensure Story Points don't exceed velocity

#### During Sprint

1. Daily: Update issue status on Kanban
2. Add comments for blockers
3. Create new issues for discovered work

#### Sprint Review (Last Day)

1. Demo completed work
2. Move incomplete items to next sprint
3. Close completed issues

#### Retrospective

1. Use GitHub Discussions for retro thread
2. Review Insights → Velocity chart
3. Document action items

---

## Insights & Metrics

### Velocity Tracking

1. Go to project **Insights** tab
2. Select **Burndown** chart
3. View completed Story Points per sprint

### Custom Charts

Create charts for:

- **Velocity Trend**: Story Points completed per sprint
- **Bug Rate**: Bugs vs Features per sprint
- **Cycle Time**: Average time from Ready to Done

---

## Automation Rules

GitHub Projects supports built-in automation:

### Recommended Automations

1. **Auto-add from repository**
   - When: Issue/PR created
   - Action: Add to project

2. **Set status from PR**
   - When: PR opened
   - Action: Set status to "In Review"

3. **Close completed**
   - When: PR merged
   - Action: Set status to "Done"

### Custom Workflows

Additional automation is handled by:
- `.github/workflows/project-automation.yml`
- `.github/workflows/auto-label.yml`

---

## Quick Reference

### Story Point Scale

| Points | Time | Complexity |
|--------|------|------------|
| 1 | 2-4h | Trivial |
| 2 | Half day | Simple |
| 3 | 1 day | Moderate |
| 5 | 2-3 days | Complex |
| 8 | 1 week | Very complex |
| 13 | 1-2 weeks | Break down |

### Status Flow

```
Triage → Backlog → Ready → In Progress → In Review → Done
                    ↓           ↓
                 Blocked     Blocked
```

### Branch Naming

```
feature/123-add-profile-search
bugfix/456-fix-login-error
hotfix/789-security-patch
tech/321-upgrade-dependencies
spike/654-evaluate-caching
```

### Commit Format

```
feat(scope): description
fix(scope): description
docs(scope): description
```

---

## Troubleshooting

### Items not appearing in project

1. Check repository is linked to project
2. Verify automation rules are enabled
3. Check issue/PR labels match filters

### Velocity not calculating

1. Ensure "Story Points" field is populated
2. Verify Sprint iteration is assigned
3. Check items are properly closed

### Branch protection blocking merge

1. Verify all status checks pass
2. Get required approvals
3. Resolve all conversations
4. Ensure branch is up to date

---

## Resources

- [GitHub Projects Documentation](https://docs.github.com/en/issues/planning-and-tracking-with-projects)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow Guide](https://docs.github.com/en/get-started/quickstart/github-flow)
