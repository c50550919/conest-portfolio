# Household Feature

## Overview

The Household feature manages shared living arrangements between matched users. It provides functionality for creating households, managing members with different roles (admin/member), tracking rent shares, and managing household expenses. Child safety is enforced - no child PII is exposed in any responses.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/household` | Create new household | Yes |
| GET | `/api/household/:id` | Get household details | Yes (Member) |
| PATCH | `/api/household/:id` | Update household details | Yes (Admin) |
| DELETE | `/api/household/:id` | Deactivate household | Yes (Admin) |
| GET | `/api/household/:id/members` | Get household members | Yes (Member) |
| POST | `/api/household/:id/members` | Add member to household | Yes (Admin) |
| DELETE | `/api/household/:id/members/:userId` | Remove member | Yes (Admin) |
| PATCH | `/api/household/:id/members/:userId/rent-share` | Update rent share | Yes (Admin) |
| GET | `/api/household/:id/expenses` | Get household expenses | Yes (Member) |
| POST | `/api/household/:id/expenses` | Create expense | Yes (Admin) |

## Services

### HouseholdController
- `createHousehold` - Creates new household with creator as admin
- `getHousehold` - Retrieves household details (members only)
- `updateHousehold` - Updates household info (admin only)
- `getMembers` - Gets household members with profile info
- `addMember` - Adds member to household (admin only)
- `removeMember` - Removes member from household (admin only)
- `getExpenses` - Gets household expenses with filtering

### HouseholdService
- Membership verification
- Rent share calculations
- Expense tracking
- Role management

## Models/Types

### CreateHousehold
```typescript
interface CreateHousehold {
  name: string;
  address: string;
  city: string;
  state: string;           // 2-letter state code
  zipCode: string;         // 5-digit zip
  monthlyRent: number;     // In cents
  leaseStartDate?: string; // ISO date YYYY-MM-DD
  leaseEndDate?: string;   // ISO date YYYY-MM-DD
}
```

### Household
```typescript
interface Household {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  monthlyRent: number;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  stripeAccountId?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

### HouseholdMember
```typescript
interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  firstName: string;
  profilePhotoUrl?: string;
  role: 'admin' | 'member';
  rentShare: number;       // In cents
  joinedAt: Date;
  status: 'active' | 'inactive';
  // Child safety: Only childrenCount and childrenAgeGroups (NO child PII)
}
```

### Expense
```typescript
interface Expense {
  id: string;
  householdId: string;
  payerId: string;
  payerName: string;
  amount: number;          // In cents
  type: 'rent' | 'utilities' | 'deposit' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  description?: string;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
}
```

### AddMember
```typescript
interface AddMember {
  userId: string;
  rentShare: number;        // In cents
  role?: 'admin' | 'member'; // Defaults to 'member'
}
```

## Dependencies

- `../../middleware/auth.middleware` - authMiddleware for JWT validation
- `../../models/Household` - Household data model
- `../../models/Payment` - Payment/expense tracking
- `../payments` - Stripe integration for payments

## Data Flow

### Create Household Flow
1. Validate request body
2. Authenticate user
3. Create household record
4. Add creator as admin member with initial rent share
5. Return household and membership

### Add Member Flow
1. Verify requesting user is household admin
2. Validate target user exists
3. Check for duplicate membership
4. Create membership with specified rent share
5. Notify new member

### Get Expenses Flow
1. Verify user is household member
2. Apply optional filters (status, type)
3. Calculate totals (total, pending, overdue)
4. Return expenses with payer info

## Security Notes

- Only household members can view household details
- Only admins can modify household or manage members
- Cannot remove last admin from household
- No child PII exposed - only childrenCount and childrenAgeGroups
- All amounts stored and transmitted in cents
