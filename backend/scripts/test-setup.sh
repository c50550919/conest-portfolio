#!/bin/bash

# CoNest/SafeNest Test Setup Script
# Initializes test database, runs migrations, and seeds test data

set -e  # Exit on error

echo "🚀 CoNest/SafeNest Test Setup"
echo "=============================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -e "\n${YELLOW}Checking PostgreSQL...${NC}"
if ! pg_isready > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    echo "Please start PostgreSQL and try again"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Load environment variables
if [ -f .env.test ]; then
    export $(cat .env.test | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Loaded .env.test${NC}"
else
    echo -e "${YELLOW}⚠️  .env.test not found, using .env${NC}"
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo -e "${RED}❌ No environment file found${NC}"
        exit 1
    fi
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
    echo -e "${RED}❌ Could not extract database name from DATABASE_URL${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Database: ${DB_NAME}${NC}"

# Check if test database exists
echo -e "\n${YELLOW}Checking test database...${NC}"
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}⚠️  Database ${DB_NAME} already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Dropping database ${DB_NAME}...${NC}"
        dropdb $DB_NAME || true
        echo -e "${YELLOW}Creating database ${DB_NAME}...${NC}"
        createdb $DB_NAME
        echo -e "${GREEN}✅ Database recreated${NC}"
    fi
else
    echo -e "${YELLOW}Creating database ${DB_NAME}...${NC}"
    createdb $DB_NAME
    echo -e "${GREEN}✅ Database created${NC}"
fi

# Run migrations
echo -e "\n${YELLOW}Running migrations...${NC}"
npm run migrate || {
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Migrations completed${NC}"

# Seed test data
echo -e "\n${YELLOW}Seeding test data...${NC}"
npm run seed:dev || {
    echo -e "${RED}❌ Seeding failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Test data seeded${NC}"

# Verify setup
echo -e "\n${YELLOW}Verifying setup...${NC}"

# Count users
USER_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM users;")
echo -e "  Users: ${USER_COUNT// /}"

# Count profiles
PROFILE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM profiles;")
echo -e "  Profiles: ${PROFILE_COUNT// /}"

# Count matches
MATCH_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM matches;")
echo -e "  Matches: ${MATCH_COUNT// /}"

# Count households
HOUSEHOLD_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM households;")
echo -e "  Households: ${HOUSEHOLD_COUNT// /}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Test setup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Test Users Available:${NC}"
echo "  sarah.verified@test.com"
echo "  maria.fullverified@test.com"
echo "  lisa.pending@test.com"
echo "  jennifer.complete@test.com"
echo "  amanda.new@test.com"
echo "  michelle.budget@test.com"
echo "  patricia.schedule@test.com"
echo "  karen.lifestyle@test.com"
echo -e "\n${YELLOW}Password for all users: ${GREEN}TestPassword123!${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "  npm test                    # Run all tests"
echo "  npm run test:coverage       # Run tests with coverage"
echo "  npm run test:integration    # Run integration tests only"
echo "  npm run dev                 # Start development server"
