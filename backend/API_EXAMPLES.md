# CoNest/CoNest API Examples

Complete cURL examples for all 47 API endpoints with expected responses and error cases.

## Authentication Endpoints

### 1. Register New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "phone": "+15551234567"
  }'
```

**Success Response (201):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "newuser@example.com",
    "phone_verified": false,
    "email_verified": false
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (400):**
```json
{
  "error": "Email already exists"
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### 4. Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 5. Send Email Verification

```bash
curl -X POST http://localhost:3000/api/auth/verify-email/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid"
  }'
```

### 6. Verify Email

```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "code": "123456"
  }'
```

### 7. Send Phone Verification

```bash
curl -X POST http://localhost:3000/api/auth/verify-phone/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid"
  }'
```

### 8. Verify Phone

```bash
curl -X POST http://localhost:3000/api/auth/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "code": "123456"
  }'
```

### 9. Request Password Reset

```bash
curl -X POST http://localhost:3000/api/auth/password/reset-request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 10. Reset Password

```bash
curl -X POST http://localhost:3000/api/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset-token",
    "newPassword": "NewSecurePass123!"
  }'
```

## Profile Endpoints

### 11. Create Profile

```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Sarah",
    "last_name": "Johnson",
    "bio": "Working teacher looking for safe housing",
    "location_city": "Austin",
    "location_state": "TX",
    "location_zip": "78701",
    "children_count": 2,
    "children_ages_range": "5-10",
    "budget_min": 800,
    "budget_max": 1200,
    "work_schedule": "Mon-Fri 8am-4pm",
    "parenting_style": "structured",
    "house_rules": {
      "no_smoking": true,
      "no_pets": false,
      "quiet_hours": "9pm-7am"
    }
  }'
```

**Success Response (201):**
```json
{
  "id": "profile-uuid",
  "user_id": "user-uuid",
  "first_name": "Sarah",
  "last_name": "Johnson",
  "children_count": 2,
  "children_ages_range": "5-10",
  "created_at": "2025-10-03T10:00:00Z"
}
```

### 12. Get Profile

```bash
curl -X GET http://localhost:3000/api/profiles/PROFILE_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 13. Update Profile

```bash
curl -X PUT http://localhost:3000/api/profiles/PROFILE_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio",
    "budget_max": 1500
  }'
```

### 14. Delete Profile

```bash
curl -X DELETE http://localhost:3000/api/profiles/PROFILE_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 15. Upload Profile Photo

```bash
curl -X POST http://localhost:3000/api/profiles/PROFILE_ID/photo \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "photo=@/path/to/photo.jpg" \
  -F "photo_type=profile"
```

### 16. Search Profiles

```bash
curl -X GET "http://localhost:3000/api/profiles/search?city=Austin&state=TX&budget_min=700&budget_max=1300" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Matching Endpoints

### 17. Get Potential Matches

```bash
curl -X GET "http://localhost:3000/api/matches/potential?min_score=0.6" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Success Response (200):**
```json
[
  {
    "profile_id": "profile-uuid",
    "compatibility_score": 0.87,
    "score_breakdown": {
      "schedule": 0.9,
      "parenting": 0.85,
      "house_rules": 0.88,
      "location": 0.95,
      "budget": 0.82,
      "lifestyle": 0.83
    },
    "profile": {
      "first_name": "Michelle",
      "location_city": "Austin",
      "children_count": 2
    }
  }
]
```

### 18. Express Interest

```bash
curl -X POST http://localhost:3000/api/matches/interest \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profile_id": "target-profile-uuid"
  }'
```

### 19. Get My Matches

```bash
curl -X GET "http://localhost:3000/api/matches?status=mutual_interest" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 20. Remove Match

```bash
curl -X DELETE http://localhost:3000/api/matches/MATCH_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Verification Endpoints

### 21. Request ID Verification

```bash
curl -X POST http://localhost:3000/api/verifications/id \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "jumio"
  }'
```

### 22. Request Background Check

```bash
curl -X POST http://localhost:3000/api/verifications/background \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 23. Submit Income Verification

```bash
curl -X POST http://localhost:3000/api/verifications/income \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "document=@/path/to/paystub.pdf" \
  -F "annual_income=55000"
```

### 24. Get Verification Status

```bash
curl -X GET http://localhost:3000/api/verifications \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Messaging Endpoints

### 25. Create Conversation

```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "participant_id": "other-user-uuid"
  }'
```

### 26. Get My Conversations

```bash
curl -X GET http://localhost:3000/api/conversations \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 27. Send Message

```bash
curl -X POST http://localhost:3000/api/conversations/CONVERSATION_ID/messages \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hi! Would you like to discuss housing options?"
  }'
```

### 28. Get Messages

```bash
curl -X GET http://localhost:3000/api/conversations/CONVERSATION_ID/messages \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 29. Mark Message as Read

```bash
curl -X PUT http://localhost:3000/api/messages/MESSAGE_ID/read \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 30. Archive Conversation

```bash
curl -X PUT http://localhost:3000/api/conversations/CONVERSATION_ID/archive \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Household Endpoints

### 31. Create Household

```bash
curl -X POST http://localhost:3000/api/households \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sunshine House",
    "address_street": "123 Oak Avenue",
    "address_city": "Austin",
    "address_state": "TX",
    "address_zip": "78701",
    "monthly_rent": 2000,
    "bedrooms": 3,
    "bathrooms": 2,
    "lease_start_date": "2025-03-01",
    "lease_end_date": "2026-03-01",
    "house_rules": {
      "no_smoking": true,
      "shared_expenses": true
    }
  }'
```

### 32. Get Household

```bash
curl -X GET http://localhost:3000/api/households/HOUSEHOLD_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 33. Update Household

```bash
curl -X PUT http://localhost:3000/api/households/HOUSEHOLD_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_rent": 2100
  }'
```

### 34. Invite Member

```bash
curl -X POST http://localhost:3000/api/households/HOUSEHOLD_ID/members \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "invitee-uuid",
    "role": "member",
    "rent_share": 1000
  }'
```

### 35. Accept Invitation

```bash
curl -X PUT http://localhost:3000/api/households/HOUSEHOLD_ID/members/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

### 36. Remove Member

```bash
curl -X DELETE http://localhost:3000/api/households/HOUSEHOLD_ID/members/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 37. Get Household Members

```bash
curl -X GET http://localhost:3000/api/households/HOUSEHOLD_ID/members \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Payment Endpoints

### 38. Create Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "household_id": "household-uuid",
    "amount": 1000,
    "payment_type": "rent",
    "description": "March 2025 rent",
    "payment_method": "stripe_test_token"
  }'
```

### 39. Get Payment History

```bash
curl -X GET "http://localhost:3000/api/households/HOUSEHOLD_ID/payments?status=completed" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 40. Get Payment Details

```bash
curl -X GET http://localhost:3000/api/payments/PAYMENT_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 41. Refund Payment

```bash
curl -X POST http://localhost:3000/api/payments/PAYMENT_ID/refund \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Duplicate payment"
  }'
```

## Reporting & Safety Endpoints

### 42. Report User

```bash
curl -X POST http://localhost:3000/api/reports/user \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reported_user_id": "user-uuid",
    "reason": "inappropriate_behavior",
    "description": "Detailed description of the issue"
  }'
```

### 43. Block User

```bash
curl -X POST http://localhost:3000/api/users/block \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blocked_user_id": "user-uuid"
  }'
```

### 44. Unblock User

```bash
curl -X DELETE http://localhost:3000/api/users/block/USER_ID \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 45. Get Blocked Users

```bash
curl -X GET http://localhost:3000/api/users/blocked \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Admin Endpoints

### 46. Get User Reports (Admin Only)

```bash
curl -X GET http://localhost:3000/api/admin/reports \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 47. Suspend User (Admin Only)

```bash
curl -X PUT http://localhost:3000/api/admin/users/USER_ID/suspend \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violation of terms of service"
  }'
```

## Error Responses

### Common Error Codes

**400 Bad Request**
```json
{
  "error": "Invalid input data",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "request_id": "req-uuid-for-tracking"
}
```

## Testing with Postman

Import the included `POSTMAN_COLLECTION.json` file for a complete Postman collection with:
- All 47 endpoints pre-configured
- Environment variables for easy switching
- Test scripts for automated validation
- Example payloads

## Notes

- Replace `ACCESS_TOKEN` with your actual JWT token
- Replace UUIDs (`PROFILE_ID`, `USER_ID`, etc.) with actual values
- All timestamps are in ISO 8601 format
- File uploads use multipart/form-data
- Test users are available with password `TestPassword123!`

---

**Last Updated:** 2025-10-03
