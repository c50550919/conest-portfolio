#!/bin/bash
###############################################################################
# Wave Completion Script
# Automates git operations after wave validation
#
# Usage: ./wave-completion.sh <wave-number> <wave-description> [commit-files...]
# Example: ./wave-completion.sh 3 "API Layer" backend/src/controllers/*.ts
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
    exit 1
}

# Validate arguments
if [ "$#" -lt 2 ]; then
    print_error "Usage: $0 <wave-number> <wave-description> [commit-files...]"
fi

WAVE_NUM=$1
WAVE_DESC=$2
shift 2
FILES_TO_COMMIT=("$@")

# Get current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Current branch: $CURRENT_BRANCH"

# Ensure we're not on main/master
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    print_error "Cannot commit waves directly to main/master branch. Switch to a feature branch first."
fi

# Check if there are changes to commit
if [ ${#FILES_TO_COMMIT[@]} -eq 0 ]; then
    print_warning "No files specified. Committing all staged changes."
    git add -u
else
    print_info "Staging ${#FILES_TO_COMMIT[@]} files..."
    git add "${FILES_TO_COMMIT[@]}"
fi

# Check if there are staged changes
if git diff --cached --quiet; then
    print_warning "No changes staged for commit. Exiting."
    exit 0
fi

# Show what will be committed
print_info "Files to be committed:"
git diff --cached --name-status

# Generate commit message
print_info "Generating commit message for Wave $WAVE_NUM..."

COMMIT_MSG=$(cat <<EOF
feat: Wave $WAVE_NUM - $WAVE_DESC

Wave $WAVE_NUM Status: COMPLETE
EOF
)

# Commit changes
print_info "Committing changes..."
git commit -m "$COMMIT_MSG"
print_success "Committed: Wave $WAVE_NUM - $WAVE_DESC"

# Push to remote
print_info "Pushing to remote branch: $CURRENT_BRANCH..."
if git push origin "$CURRENT_BRANCH"; then
    print_success "Pushed to origin/$CURRENT_BRANCH"

    # Check if remote has PR URL
    PR_URL=$(git config --get remote.origin.url | sed 's/\.git$//' | sed 's/git@github\.com:/https:\/\/github.com\//')
    print_success "Create PR at: $PR_URL/pull/new/$CURRENT_BRANCH"
else
    print_warning "Push failed. You may need to set upstream: git push -u origin $CURRENT_BRANCH"
fi

print_success "Wave $WAVE_NUM completion automated!"
print_info "Next steps:"
print_info "  1. Review changes on GitHub"
print_info "  2. Create Pull Request when all waves complete"
print_info "  3. Run tests in CI/CD pipeline"
