#!/bin/bash
# CoNest GitHub Project Setup Script
# Run this script after granting project permissions:
#   gh auth refresh -s read:project,project
#
# Usage: ./.github/scripts/setup-project.sh

set -e

echo "🚀 CoNest GitHub Project Setup"
echo "================================"

# Configuration
OWNER="c50550919"
REPO="CoNest"
PROJECT_TITLE="CoNest"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check auth
echo -e "\n${YELLOW}Checking GitHub authentication...${NC}"
if ! gh auth status &>/dev/null; then
    echo -e "${RED}Not authenticated. Run: gh auth login${NC}"
    exit 1
fi

# Check project scope
if ! gh project list --owner "$OWNER" &>/dev/null; then
    echo -e "${RED}Missing project permissions. Run:${NC}"
    echo "  gh auth refresh -s read:project,project"
    exit 1
fi

echo -e "${GREEN}✓ Authentication OK${NC}"

# Get project number
echo -e "\n${YELLOW}Finding project...${NC}"
PROJECT_NUMBER=$(gh project list --owner "$OWNER" --format json | jq -r ".projects[] | select(.title==\"$PROJECT_TITLE\") | .number")

if [ -z "$PROJECT_NUMBER" ]; then
    echo -e "${RED}Project '$PROJECT_TITLE' not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found project #$PROJECT_NUMBER${NC}"

# Get project ID for GraphQL
PROJECT_ID=$(gh api graphql -f query='
query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      id
    }
  }
}' -f owner="$OWNER" -F number="$PROJECT_NUMBER" --jq '.data.user.projectV2.id')

echo "Project ID: $PROJECT_ID"

# Create Story Points field
echo -e "\n${YELLOW}Creating Story Points field...${NC}"
STORY_POINTS_FIELD=$(gh api graphql -f query='
mutation($projectId: ID!, $name: String!) {
  createProjectV2Field(input: {
    projectId: $projectId
    dataType: NUMBER
    name: $name
  }) {
    projectV2Field {
      ... on ProjectV2Field {
        id
        name
      }
    }
  }
}' -f projectId="$PROJECT_ID" -f name="Story Points" --jq '.data.createProjectV2Field.projectV2Field.id' 2>/dev/null || echo "exists")

if [ "$STORY_POINTS_FIELD" != "exists" ] && [ -n "$STORY_POINTS_FIELD" ]; then
    echo -e "${GREEN}✓ Created Story Points field${NC}"
else
    echo -e "${YELLOW}Story Points field already exists${NC}"
fi

# Create Sprint iteration field
echo -e "\n${YELLOW}Creating Sprint iteration field...${NC}"
SPRINT_FIELD=$(gh api graphql -f query='
mutation($projectId: ID!, $name: String!) {
  createProjectV2Field(input: {
    projectId: $projectId
    dataType: ITERATION
    name: $name
  }) {
    projectV2Field {
      ... on ProjectV2IterationField {
        id
        name
      }
    }
  }
}' -f projectId="$PROJECT_ID" -f name="Sprint" --jq '.data.createProjectV2Field.projectV2Field.id' 2>/dev/null || echo "exists")

if [ "$SPRINT_FIELD" != "exists" ] && [ -n "$SPRINT_FIELD" ]; then
    echo -e "${GREEN}✓ Created Sprint field${NC}"
else
    echo -e "${YELLOW}Sprint field already exists${NC}"
fi

# Create Priority field (single select)
echo -e "\n${YELLOW}Creating Priority field...${NC}"
PRIORITY_FIELD=$(gh api graphql -f query='
mutation($projectId: ID!, $name: String!) {
  createProjectV2Field(input: {
    projectId: $projectId
    dataType: SINGLE_SELECT
    name: $name
    singleSelectOptions: [
      {name: "🔴 High", color: RED}
      {name: "🟡 Medium", color: YELLOW}
      {name: "🟢 Low", color: GREEN}
    ]
  }) {
    projectV2Field {
      ... on ProjectV2SingleSelectField {
        id
        name
      }
    }
  }
}' -f projectId="$PROJECT_ID" -f name="Priority" --jq '.data.createProjectV2Field.projectV2Field.id' 2>/dev/null || echo "exists")

echo -e "${GREEN}✓ Priority field configured${NC}"

# List all fields
echo -e "\n${YELLOW}Current project fields:${NC}"
gh api graphql -f query='
query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      fields(first: 20) {
        nodes {
          ... on ProjectV2Field {
            id
            name
            dataType
          }
          ... on ProjectV2IterationField {
            id
            name
            dataType
          }
          ... on ProjectV2SingleSelectField {
            id
            name
            dataType
          }
        }
      }
    }
  }
}' -f owner="$OWNER" -F number="$PROJECT_NUMBER" --jq '.data.user.projectV2.fields.nodes[] | "\(.name): \(.dataType)"'

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✓ Project setup complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "1. Open https://github.com/users/$OWNER/projects/$PROJECT_NUMBER"
echo "2. Configure Sprint iterations (2-week sprints recommended)"
echo "3. Assign Story Points to issues"
echo "4. Create views: Roadmap, Sprint Board, Team Items"
