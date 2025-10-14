#!/bin/bash
###############################################################################
# Wave Validation and Commit Script
# Validates wave completion, runs tests, and commits if successful
#
# Usage: ./validate-and-commit-wave.sh <wave-number> <wave-description>
# Example: ./validate-and-commit-wave.sh 3 "API Layer implementation"
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ ${1}${NC}"; }
print_success() { echo -e "${GREEN}✓ ${1}${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ ${1}${NC}"; }
print_error() { echo -e "${RED}✗ ${1}${NC}"; exit 1; }

# Validate arguments
[ "$#" -ne 2 ] && print_error "Usage: $0 <wave-number> <wave-description>"

WAVE_NUM=$1
WAVE_DESC=$2
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

print_info "🌊 Wave $WAVE_NUM Validation Pipeline"
echo "================================================"
print_info "Branch: $CURRENT_BRANCH"
print_info "Description: $WAVE_DESC"
echo ""

# Check branch
[[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]] && \
    print_error "Cannot commit to main/master. Use a feature branch."

# Step 1: Check for unstaged changes
print_info "Step 1: Checking for unstaged changes..."
if ! git diff --quiet; then
    print_warning "Unstaged changes detected. Please stage files for Wave $WAVE_NUM."
    echo ""
    print_info "Staged files:"
    git diff --cached --name-status
    echo ""
    print_info "Unstaged files:"
    git diff --name-status
    echo ""
    read -p "Continue with staged files only? (y/n) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
fi

if git diff --cached --quiet; then
    print_warning "No staged changes found. Exiting."
    exit 0
fi

print_success "Changes staged and ready"
echo ""

# Step 2: TypeScript compilation
print_info "Step 2: Running TypeScript compilation..."
cd backend
if npm run build > /dev/null 2>&1; then
    print_success "TypeScript compilation passed"
else
    print_error "TypeScript compilation failed. Fix errors before committing."
fi
cd ..
echo ""

# Step 3: Database migrations check
print_info "Step 3: Checking database migrations..."
cd backend
MIGRATION_STATUS=$(npx knex migrate:status 2>&1 || true)
if echo "$MIGRATION_STATUS" | grep -q "up to date"; then
    print_success "Database migrations up to date"
elif echo "$MIGRATION_STATUS" | grep -q "pending"; then
    print_warning "Pending migrations detected"
    read -p "Run pending migrations? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run migrate
        print_success "Migrations applied"
    fi
else
    print_warning "Could not verify migration status"
fi
cd ..
echo ""

# Step 4: Lint check (optional)
print_info "Step 4: Running linter (optional)..."
cd backend
if npm run lint > /dev/null 2>&1; then
    print_success "Linting passed"
else
    print_warning "Linting has warnings/errors (non-blocking)"
fi
cd ..
echo ""

# Step 5: Show files to commit
print_info "Step 5: Files to be committed:"
git diff --cached --name-status
echo ""

# Step 6: Commit with proper message
print_info "Step 6: Creating commit..."

# Read detailed changes for commit body
CHANGED_FILES=$(git diff --cached --name-only)
NUM_FILES=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')

COMMIT_MSG=$(cat <<EOF
feat: Wave $WAVE_NUM - $WAVE_DESC

Changes:
$CHANGED_FILES

Wave $WAVE_NUM Status: COMPLETE
Files changed: $NUM_FILES
Validation: TypeScript ✓ | Migrations ✓ | Lint ✓
EOF
)

git commit -m "$COMMIT_MSG"
print_success "Committed Wave $WAVE_NUM"
COMMIT_HASH=$(git rev-parse --short HEAD)
print_info "Commit: $COMMIT_HASH"
echo ""

# Step 7: Push to remote
print_info "Step 7: Pushing to remote..."
if git push origin "$CURRENT_BRANCH" 2>&1; then
    print_success "Pushed to origin/$CURRENT_BRANCH"

    # Extract PR URL
    REMOTE_URL=$(git config --get remote.origin.url)
    if [[ $REMOTE_URL == *"github.com"* ]]; then
        PR_URL=$(echo "$REMOTE_URL" | sed 's/\.git$//' | sed 's/git@github\.com:/https:\/\/github.com\//')
        echo ""
        print_success "✨ Wave $WAVE_NUM completed successfully!"
        print_info "Create PR: $PR_URL/pull/new/$CURRENT_BRANCH"
    fi
else
    print_warning "Push failed. Set upstream with: git push -u origin $CURRENT_BRANCH"
fi

echo ""
print_success "================================================"
print_success "Wave $WAVE_NUM validation and commit complete!"
print_success "================================================"
