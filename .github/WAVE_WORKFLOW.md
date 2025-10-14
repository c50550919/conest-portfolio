# Wave-Based Development Workflow

This document describes the automated workflow for completing and committing waves in the CoNest project.

## Overview

Waves are logical units of work that group related changes (models, services, controllers, tests, etc.). Each wave should be independently committable and testable.

## Automated Scripts

### 1. Basic Wave Completion: `wave-completion.sh`

Simple script for committing completed waves.

**Usage:**
```bash
.github/scripts/wave-completion.sh <wave-number> <description> [files...]

# Example
.github/scripts/wave-completion.sh 3 "API Layer" \
  backend/src/controllers/*.ts \
  backend/src/routes/*.ts
```

**What it does:**
- Stages specified files
- Creates structured commit message
- Pushes to current feature branch
- Provides PR creation link

### 2. Full Validation Pipeline: `validate-and-commit-wave.sh`

Comprehensive script with validation checks.

**Usage:**
```bash
# Stage your files first
git add backend/src/models/MyModel.ts
git add backend/src/services/MyService.ts

# Run validation and commit
.github/scripts/validate-and-commit-wave.sh 3 "API Layer implementation"
```

**Validation Steps:**
1. ✓ Check for staged changes
2. ✓ Run TypeScript compilation
3. ✓ Verify database migrations
4. ✓ Run linter
5. ✓ Display files to commit
6. ✓ Create structured commit
7. ✓ Push to remote branch

## Wave Completion Checklist

Before running wave completion scripts:

- [ ] All wave components implemented
- [ ] TypeScript compiles without errors
- [ ] Database migrations applied and tested
- [ ] Basic smoke tests passed
- [ ] Files staged for commit
- [ ] On correct feature branch (not main/master)

## Commit Message Format

Scripts generate structured commit messages:

```
feat: Wave X - <Description>

<Detailed changes>

Wave X Status: COMPLETE
Files changed: N
Validation: TypeScript ✓ | Migrations ✓ | Lint ✓
```

**No Claude Code tag** - Professional commit messages only.

## Branch Strategy

```
main
  └── feature/003-complete-3-critical
        ├── Wave 1 commit
        ├── Wave 2 commit
        └── Wave 3 commit
```

1. **Create feature branch** from main
2. **Commit waves** incrementally to feature branch
3. **Push after each wave** for backup and visibility
4. **Create PR** after all waves complete
5. **Merge to main** after review and CI passes

## Example Workflow

```bash
# 1. Ensure you're on feature branch
git checkout 003-complete-3-critical

# 2. Implement Wave 3
# ... write code ...

# 3. Stage Wave 3 files
git add backend/src/controllers/savedProfileController.ts
git add backend/src/controllers/connectionRequestController.ts
git add backend/src/routes/savedProfiles.ts
git add backend/src/routes/connectionRequests.ts

# 4. Validate and commit
.github/scripts/validate-and-commit-wave.sh 3 "API Layer - SavedProfile and ConnectionRequest endpoints"

# Output:
# ✓ TypeScript compilation passed
# ✓ Database migrations up to date
# ✓ Linting passed
# ✓ Committed Wave 3
# ✓ Pushed to origin/003-complete-3-critical
# ✨ Create PR: https://github.com/user/repo/pull/new/003-complete-3-critical
```

## Manual Alternative

If you prefer manual commits:

```bash
# Stage files
git add <files>

# Commit with structured message
git commit -m "feat: Wave 3 - API Layer

Controllers:
- SavedProfileController with CRUD endpoints
- ConnectionRequestController with rate limiting

Routes:
- POST /api/saved-profiles
- GET /api/saved-profiles
- PATCH /api/saved-profiles/:id
- DELETE /api/saved-profiles/:id
- POST /api/connection-requests
- PATCH /api/connection-requests/:id

Wave 3 Status: COMPLETE"

# Push to feature branch
git push origin 003-complete-3-critical
```

## CI/CD Integration

Scripts are designed to integrate with CI/CD:

```yaml
# .github/workflows/wave-validation.yml
name: Wave Validation
on: push

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate Wave
        run: |
          .github/scripts/validate-and-commit-wave.sh
```

## Troubleshooting

**Script fails on TypeScript compilation:**
```bash
cd backend && npm run build
# Fix errors, then re-run script
```

**Migration issues:**
```bash
cd backend && npm run migrate:rollback
npm run migrate
```

**Push fails:**
```bash
git push -u origin <branch-name>
```

**Wrong branch:**
```bash
git checkout -b feature/new-feature
# Re-run script
```

## Best Practices

1. **Keep waves atomic** - Each wave should be independently functional
2. **Test before committing** - Validate locally before pushing
3. **Write descriptive messages** - Help reviewers understand changes
4. **Push frequently** - Don't lose work
5. **Review before PR** - Ensure all waves are complete and tested

## Wave History

Track completed waves in commit history:

```bash
# View wave commits
git log --oneline --grep="Wave"

# Example output:
73d5eff feat: Wave 2 - Implement SavedProfile and ConnectionRequest entities
a1b2c3d feat: Wave 1 - Database schema and migrations
```
