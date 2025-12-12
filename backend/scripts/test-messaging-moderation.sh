#!/bin/bash

# Test Script: Messaging + AI Content Moderation Flow (Shell Version)
#
# Tests the messaging system and AI content moderation with curl
#
# Prerequisites:
# - Backend server running on localhost:3000
# - PostgreSQL and Redis running
# - Test users seeded
# - AI_MODERATION_ENABLED=true in .env
#
# Usage: ./scripts/test-messaging-moderation.sh

set -e

API_BASE="${API_BASE:-http://localhost:3000/api}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  MESSAGING + MODERATION TEST SUITE"
echo "========================================"
echo ""

# Test user credentials
USER_EMAIL="sarah.verified@test.com"
USER_PASSWORD="TestPassword123!"
USER2_EMAIL="maria.fullverified@test.com"
USER2_PASSWORD="TestPassword123!"

# Step 1: Login User 1
echo -e "${BLUE}[1/8] Authenticating User 1...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER_EMAIL\", \"password\": \"$USER_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('tokens', {}).get('accessToken', '') or data.get('data', {}).get('accessToken', ''))" 2>/dev/null || echo "")
USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('userId', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to authenticate User 1${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi
echo -e "${GREEN}User 1 authenticated: $USER_ID${NC}"

# Step 2: Login User 2
echo -e "${BLUE}[2/8] Authenticating User 2...${NC}"
LOGIN2_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$USER2_EMAIL\", \"password\": \"$USER2_PASSWORD\"}")

USER2_ID=$(echo "$LOGIN2_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('userId', ''))" 2>/dev/null || echo "")

if [ -z "$USER2_ID" ]; then
  echo -e "${RED}Failed to authenticate User 2${NC}"
  exit 1
fi
echo -e "${GREEN}User 2 authenticated: $USER2_ID${NC}"

CONVERSATION_ID="conv_${USER_ID}_${USER2_ID}"

# Step 3: Send Normal Message
echo ""
echo -e "${BLUE}[3/8] Testing NORMAL message...${NC}"
NORMAL_MSG="Hi! I saw your profile and I think we might be compatible roommates. What's your work schedule like?"
NORMAL_RESPONSE=$(curl -s -X POST "$API_BASE/messages/verified" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"recipientId\": \"$USER2_ID\", \"content\": \"$NORMAL_MSG\", \"messageType\": \"text\"}")

echo "Response: $NORMAL_RESPONSE"

if echo "$NORMAL_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}Normal message sent successfully${NC}"
else
  echo -e "${YELLOW}Note: Message sending may have returned non-success (check if already moderated)${NC}"
fi

# Wait for moderation worker
sleep 3

# Step 4: Send Questionable Message
echo ""
echo -e "${BLUE}[4/8] Testing QUESTIONABLE message...${NC}"
QUESTIONABLE_MSG="So, how old is your kid exactly? And what's their name? I'd love to get to know them better."
QUESTIONABLE_RESPONSE=$(curl -s -X POST "$API_BASE/messages/verified" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"recipientId\": \"$USER2_ID\", \"content\": \"$QUESTIONABLE_MSG\", \"messageType\": \"text\"}")

echo "Response: $QUESTIONABLE_RESPONSE"

if echo "$QUESTIONABLE_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}Questionable message sent (should be flagged for review)${NC}"
else
  echo -e "${YELLOW}Message may have been blocked or flagged${NC}"
fi

sleep 3

# Step 5: Send Predatory Message
echo ""
echo -e "${BLUE}[5/8] Testing PREDATORY message (should be blocked)...${NC}"
PREDATORY_MSG="I love kids! I could watch your children while you're at work. What time does school let out? Do you have cameras in the house?"
PREDATORY_RESPONSE=$(curl -s -X POST "$API_BASE/messages/verified" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"conversationId\": \"$CONVERSATION_ID\", \"recipientId\": \"$USER2_ID\", \"content\": \"$PREDATORY_MSG\", \"messageType\": \"text\"}")

echo "Response: $PREDATORY_RESPONSE"

if echo "$PREDATORY_RESPONSE" | grep -q '"error"' || echo "$PREDATORY_RESPONSE" | grep -q '403'; then
  echo -e "${GREEN}Predatory message was BLOCKED as expected!${NC}"
elif echo "$PREDATORY_RESPONSE" | grep -q '"success":true'; then
  echo -e "${YELLOW}Message sent - will be flagged for urgent review${NC}"
else
  echo -e "${YELLOW}Unknown response - check manually${NC}"
fi

# Wait for all moderation to process
echo ""
echo -e "${BLUE}Waiting for moderation worker (10 seconds)...${NC}"
sleep 10

# Step 6: Check Moderation Stats (if admin endpoints available)
echo ""
echo -e "${BLUE}[6/8] Checking moderation status via database...${NC}"

# Try to get message status
echo "Fetching conversations..."
CONVOS_RESPONSE=$(curl -s -X GET "$API_BASE/messages/conversations" \
  -H "Authorization: Bearer $TOKEN")
echo "Conversations: $CONVOS_RESPONSE"

# Step 7: Check user's pattern summary (requires admin)
echo ""
echo -e "${BLUE}[7/8] Summary of tests...${NC}"
echo ""
echo "Messages tested:"
echo "  1. Normal message: Should be auto-approved"
echo "  2. Questionable message: Should be flagged for standard review"
echo "  3. Predatory message: Should be auto-blocked or flagged urgent"

# Step 8: Manual verification instructions
echo ""
echo -e "${BLUE}[8/8] Manual verification steps:${NC}"
echo ""
echo "1. Check the database for moderation results:"
echo "   psql -c \"SELECT id, content, ai_category, ai_confidence_score, moderation_status FROM messages ORDER BY created_at DESC LIMIT 5;\""
echo ""
echo "2. Check for flagged messages:"
echo "   psql -c \"SELECT * FROM messages WHERE ai_category != 'normal' ORDER BY created_at DESC;\""
echo ""
echo "3. Check user moderation patterns:"
echo "   psql -c \"SELECT * FROM moderation_patterns WHERE user_id = '$USER_ID';\""
echo ""
echo "4. Check user account status:"
echo "   psql -c \"SELECT moderation_status, moderation_strike_count, suspension_until FROM users WHERE id = '$USER_ID';\""
echo ""
echo "5. View the admin moderation queue (requires admin token):"
echo "   curl -H 'Authorization: Bearer <ADMIN_TOKEN>' $API_BASE/admin/moderation/queue"
echo ""

echo "========================================"
echo "        TEST SUITE COMPLETED           "
echo "========================================"
