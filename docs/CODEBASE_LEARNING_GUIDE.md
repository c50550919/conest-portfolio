# CoNest Codebase Learning Guide

> **For**: The founder who wants to understand every line of code they own
> **Approach**: Learn programming concepts through YOUR actual code, not generic examples
> **Time**: Work through at your own pace - each section is ~30-60 minutes

---

## Table of Contents

1. [Your Tech Stack Explained](#1-your-tech-stack-explained)
2. [The Data Flow: How a Request Travels](#2-the-data-flow-how-a-request-travels)
3. [Backend Architecture Deep Dive](#3-backend-architecture-deep-dive)
4. [Mobile Architecture Deep Dive](#4-mobile-architecture-deep-dive)
5. [Database & Models](#5-database--models)
6. [Authentication Flow](#6-authentication-flow)
7. [Real-Time Features (Socket.io)](#7-real-time-features-socketio)
8. [State Management (Redux)](#8-state-management-redux)
9. [Advanced Patterns in Your Code](#9-advanced-patterns-in-your-code)
10. [Exercises: Modify Your Own Code](#10-exercises-modify-your-own-code)

---

## 1. Your Tech Stack Explained

### What You're Using and Why

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   MOBILE APP (React Native)          BACKEND (Node.js)          │
│   ┌─────────────────────┐           ┌─────────────────────┐    │
│   │  Screens (UI)       │           │  Routes (URLs)      │    │
│   │  Components         │  ──API──▶ │  Controllers        │    │
│   │  Redux Store        │  ◀─JSON── │  Services           │    │
│   │  React Query        │           │  Models             │    │
│   └─────────────────────┘           └─────────────────────┘    │
│                                              │                   │
│                                              ▼                   │
│                                     ┌─────────────────────┐     │
│                                     │  PostgreSQL + Redis  │     │
│                                     │  (Data Storage)      │     │
│                                     └─────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Your Stack Decisions Explained

| Technology | What It Does | Why It's in CoNest |
|------------|--------------|-------------------|
| **React Native** | Builds iOS & Android from one codebase | Save 50% development time vs native |
| **TypeScript** | JavaScript with type checking | Catches bugs before they hit users |
| **Node.js + Express** | Runs JavaScript on servers | Same language frontend & backend |
| **PostgreSQL** | Relational database | ACID compliance for financial data |
| **Redis** | In-memory cache | Fast session storage, rate limiting |
| **Knex.js** | Database query builder | SQL without raw string queries |
| **Redux Toolkit** | Centralized state management | Predictable app state |
| **React Query** | Server state management | Automatic caching, refetching |
| **Socket.io** | Real-time communication | Instant messaging |
| **Zod** | Schema validation | Validate data shapes |

---

## 2. The Data Flow: How a Request Travels

Let's trace what happens when a user logs in. This is **YOUR actual code path**:

### Step 1: User Taps "Login" in Mobile App

**File**: `mobile/src/services/api.ts` (lines 57-60)

```typescript
async login(email: string, password: string) {
  const response = await this.client.post('/auth/login', { email, password });
  return response.data;
}
```

**What's happening**:
- `this.client` is an Axios instance (HTTP client)
- `.post('/auth/login', ...)` sends a POST request to your backend
- The data `{ email, password }` becomes the request body (JSON)

### Step 2: Request Hits Your Backend Route

**File**: `backend/src/features/auth/auth.routes.ts` (lines 224-229)

```typescript
router.post(
  '/login',
  authLimiter,              // Middleware 1: Rate limiting
  validateBody(LoginRequestSchema),  // Middleware 2: Validation
  AuthController.login,     // Handler: Actual login logic
);
```

**What's happening**:
- Express matches URL `/auth/login` with method `POST`
- Request passes through **middleware** (functions that run before the handler)
- `authLimiter` prevents brute force attacks (5 requests/15 min)
- `validateBody` checks the request matches your schema
- `AuthController.login` does the actual work

### Step 3: Validation Runs

**File**: `backend/src/features/auth/auth.routes.ts` (lines 38-62)

```typescript
const validateBody = (schema: z.ZodSchema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();  // Continue to next middleware/handler
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(...)
      });
      return;  // Stop here, don't continue
    }
  }
};
```

**Key Concept - Middleware Pattern**:
```
Request → [Middleware 1] → [Middleware 2] → [Handler] → Response
              ↓                 ↓                ↓
           Rate limit        Validate         Process
           (can reject)     (can reject)    (final response)
```

### Step 4: Controller Processes Request

The controller calls the service, which:
1. Finds user by email in database
2. Verifies password hash
3. Generates JWT tokens
4. Returns user data + tokens

### Step 5: Response Returns to Mobile

**File**: `mobile/src/services/api.ts` (lines 27-40)

```typescript
// Response interceptor - runs on EVERY response
this.client.interceptors.response.use(
  (response) => response,  // Success: pass through
  async (error) => {
    if (error.response?.status === 401) {
      await tokenStorage.clearTokens();  // Unauthorized: clear tokens
    }
    return Promise.reject(error);
  }
);
```

### Step 6: Redux State Updates

**File**: `mobile/src/store/slices/authSlice.ts` (lines 50-56)

```typescript
loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
  state.isAuthenticated = true;
  state.user = action.payload.user;
  state.loading = false;
  state.error = null;
},
```

**What's happening**:
- Redux "reducer" receives an "action" with the user data
- It updates the global state
- Any component subscribed to `isAuthenticated` re-renders

---

## 3. Backend Architecture Deep Dive

### Feature-Based Structure

Your backend uses a **feature-based architecture**:

```
backend/src/
├── features/           # Grouped by business domain
│   ├── auth/           # Authentication
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.schemas.ts
│   ├── discovery/      # Profile browsing
│   ├── messages/       # Messaging
│   └── verification/   # ID/background checks
├── models/             # Database table representations
├── middleware/         # Request processors
├── services/           # Shared business logic
└── config/             # Environment configuration
```

**Why this matters**: Each feature is self-contained. To understand messaging, you only need `features/messages/`.

### The Three Layers

```
┌─────────────────────────────────────────────────────┐
│  ROUTES (auth.routes.ts)                            │
│  "What URLs exist and what middleware they use"     │
│  router.post('/login', limiter, validate, handler)  │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  CONTROLLER (auth.controller.ts)                    │
│  "Parse request, call service, format response"     │
│  const user = await AuthService.login(email, pwd);  │
│  res.json({ success: true, data: user });           │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  SERVICE (auth.service.ts)                          │
│  "Business logic - reusable by multiple controllers"│
│  const user = await UserModel.findByEmail(email);   │
│  if (!bcrypt.compare(pwd, user.password_hash))...   │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  MODEL (User.ts)                                    │
│  "Database queries - ONLY talks to database"        │
│  return await db('users').where({ email }).first(); │
└─────────────────────────────────────────────────────┘
```

### Reading Your Discovery Service

**File**: `backend/src/features/discovery/discovery.service.ts`

This is one of the most complex files. Let's break it down:

```typescript
// Line 74-95: Building a SQL query with Knex
let query = db('users as u')                    // FROM users AS u
  .join('parents as p', 'u.id', 'p.user_id')   // JOIN parents ON...
  .leftJoin('verifications as v', 'u.id', 'v.user_id')
  .where('u.id', '!=', userId)                  // WHERE u.id != ?
  .select(
    'u.id as userId',                           // SELECT u.id AS userId
    'p.first_name as firstName',
    // ... more columns
  );
```

**The Knex to SQL translation**:
```sql
SELECT u.id AS userId, p.first_name AS firstName, ...
FROM users AS u
JOIN parents AS p ON u.id = p.user_id
LEFT JOIN verifications AS v ON u.id = v.user_id
WHERE u.id != '123-current-user-id'
```

**Why LEFT JOIN?**: Some users might not have verification records yet. `LEFT JOIN` includes them anyway (with NULL verification data), while regular `JOIN` would exclude them.

### Cursor-Based Pagination

**Lines 102-111**:
```typescript
if (cursor) {
  query = query.where('u.id', '>', cursor);  // Get records AFTER cursor
}

query = query.orderBy('u.id', 'asc').limit(limit + 1);  // Get 1 extra

const results = await query;
const hasMore = results.length > limit;  // If we got extra, there's more
const profiles = hasMore ? results.slice(0, limit) : results;
const nextCursor = hasMore ? profiles[profiles.length - 1].userId : null;
```

**What's happening**:
1. Request 10 profiles, but query for 11
2. If you get 11 back, there are more pages
3. Return only 10, use the 10th's ID as cursor
4. Next request: "get profiles where ID > cursor"

**Why not offset pagination?** (`LIMIT 10 OFFSET 20`)
- Offset rescans all previous rows (slow for page 100)
- If new data is inserted, you might skip or duplicate items
- Cursor is O(1), offset is O(n)

---

## 4. Mobile Architecture Deep Dive

### Folder Structure

```
mobile/src/
├── screens/            # Full-page components
│   ├── auth/           # Login, signup, etc.
│   ├── main/           # Main app screens
│   └── onboarding/     # Profile setup flow
├── components/         # Reusable UI pieces
│   ├── common/         # Buttons, cards, etc.
│   ├── discovery/      # Profile cards, filters
│   └── messaging/      # Chat bubbles, input
├── hooks/              # Custom React hooks
├── services/           # API calls, storage
├── store/              # Redux state
│   └── slices/         # State "slices" by domain
├── navigation/         # Screen routing
├── theme/              # Colors, fonts, spacing
└── utils/              # Helper functions
```

### React Query Explained

**File**: `mobile/src/hooks/useDiscoveryProfiles.ts`

```typescript
export function useDiscoveryProfiles(limit: number = 10) {
  return useInfiniteQuery<DiscoveryResponse, Error>({
    // Cache key - data is stored/retrieved by this
    queryKey: ['discovery', 'profiles', limit],

    // Function that fetches data
    queryFn: async ({ pageParam }) => {
      return await discoveryAPI.getProfiles(pageParam, limit);
    },

    // How to get the next page's cursor
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    // Data is "fresh" for 5 minutes (won't refetch)
    staleTime: 5 * 60 * 1000,
  });
}
```

**Key Concepts**:

| Term | Meaning | In Your Code |
|------|---------|--------------|
| `queryKey` | Unique identifier for cached data | `['discovery', 'profiles', 10]` |
| `queryFn` | How to fetch the data | Calls your API |
| `staleTime` | How long before refetching | 5 minutes |
| `gcTime` | When to delete cached data | 10 minutes |
| `pageParam` | Cursor for infinite scroll | User ID string |

**Using the hook in a component**:
```typescript
const {
  data,           // The fetched profiles
  isLoading,      // First load
  isFetching,     // Any fetch (including background)
  fetchNextPage,  // Load more
  hasNextPage,    // Are there more?
} = useDiscoveryProfiles();

// Get flat array from paginated data
const profiles = data?.pages.flatMap(page => page.profiles) ?? [];
```

### Redux vs React Query

**You use BOTH** - here's why:

| Redux | React Query |
|-------|-------------|
| **Client state** | **Server state** |
| User preferences, UI state | API responses |
| `isAuthenticated`, `theme` | Profiles, messages |
| Persists across navigation | Cached with expiration |
| You control updates | Automatic refetching |

**File**: `mobile/src/store/slices/authSlice.ts` - Redux for auth state
**File**: `mobile/src/hooks/useDiscoveryProfiles.ts` - React Query for profiles

---

## 5. Database & Models

### Your Database Schema (Simplified)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   users     │     │   parents   │     │  verifications  │
├─────────────┤     ├─────────────┤     ├─────────────────┤
│ id (PK)     │◄────│ user_id(FK) │     │ user_id (FK)    │
│ email       │     │ first_name  │     │ id_status       │
│ password_hash│     │ last_name   │     │ bg_check_status │
│ phone       │     │ city        │     │ phone_verified  │
│ created_at  │     │ budget_min  │     │ fully_verified  │
└─────────────┘     │ budget_max  │     └─────────────────┘
                    └─────────────┘

┌──────────────────┐     ┌─────────────┐     ┌─────────────┐
│connection_requests│     │   matches   │     │  messages   │
├──────────────────┤     ├─────────────┤     ├─────────────┤
│ sender_id (FK)   │     │ user_id_1   │     │ sender_id   │
│ recipient_id(FK) │     │ user_id_2   │     │ conversation│
│ status           │     │ created_at  │     │ content     │
│ message          │     └─────────────┘     │ encrypted   │
└──────────────────┘                         └─────────────┘
```

### Reading a Model

**File**: `backend/src/models/User.ts`

```typescript
export const UserModel = {
  // CREATE
  async create(data: CreateUserData): Promise<User> {
    const [user] = await db('users')
      .insert(data)
      .returning('*');  // Return the inserted row
    return user;
  },

  // READ
  async findByEmail(email: string): Promise<User | undefined> {
    return await db('users')
      .where({ email })
      .first();  // Get first match (or undefined)
  },

  // UPDATE
  async update(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db('users')
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return user;
  },

  // DELETE
  async delete(id: string): Promise<void> {
    await db('users').where({ id }).delete();
  },
};
```

### Migrations Explained

**File**: `backend/src/migrations/20250101000000_create_users_table.ts`

Migrations are version control for your database schema:

```typescript
export async function up(knex: Knex): Promise<void> {
  // RUN when migrating forward
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.timestamps(true, true);  // created_at, updated_at
  });
}

export async function down(knex: Knex): Promise<void> {
  // RUN when rolling back
  await knex.schema.dropTable('users');
}
```

**Running migrations**:
```bash
npx knex migrate:latest   # Apply all pending migrations
npx knex migrate:rollback # Undo last migration batch
npx knex migrate:status   # See which migrations have run
```

---

## 6. Authentication Flow

### JWT (JSON Web Tokens) in Your App

```
┌─────────────────────────────────────────────────────────────────┐
│                     JWT AUTHENTICATION FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Login Request                                                │
│     Mobile ──[email, password]──▶ Backend                        │
│                                                                  │
│  2. Backend Validates & Creates Tokens                           │
│     - Check password against hash                                │
│     - Generate ACCESS token (15 min expiry)                      │
│     - Generate REFRESH token (7 day expiry)                      │
│                                                                  │
│  3. Tokens Returned                                              │
│     Backend ──[accessToken, refreshToken]──▶ Mobile              │
│                                                                  │
│  4. Mobile Stores Tokens Securely                                │
│     Keychain (iOS) / Keystore (Android)                          │
│                                                                  │
│  5. API Requests Include Access Token                            │
│     Mobile ──[Authorization: Bearer {token}]──▶ Backend          │
│                                                                  │
│  6. Access Token Expires → Refresh                               │
│     Mobile ──[refreshToken]──▶ Backend                           │
│     Backend ──[new accessToken, new refreshToken]──▶ Mobile      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Token Storage

**File**: `mobile/src/services/tokenStorage.ts`

```typescript
// Secure storage using device Keychain/Keystore
import * as Keychain from 'react-native-keychain';

class TokenStorage {
  async saveTokens(accessToken: string, refreshToken: string) {
    await Keychain.setGenericPassword('tokens', JSON.stringify({
      accessToken,
      refreshToken,
    }));
  }

  async getAccessToken(): Promise<string | null> {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      return JSON.parse(credentials.password).accessToken;
    }
    return null;
  }
}
```

### Auto-Attaching Tokens to Requests

**File**: `mobile/src/services/api.ts` (lines 29-34)

```typescript
// Request interceptor - runs BEFORE every request
this.client.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

---

## 7. Real-Time Features (Socket.io)

### How WebSockets Differ from HTTP

```
HTTP (Request/Response):
┌────────┐                    ┌────────┐
│ Client │ ──GET /messages──▶ │ Server │
│        │ ◀──[messages]───── │        │
└────────┘                    └────────┘
   Must poll repeatedly for new messages

WebSocket (Persistent Connection):
┌────────┐ ════════════════ ┌────────┐
│ Client │ ◀═══ CONNECTED ══▶│ Server │
│        │ ◀─"new message"── │        │
│        │ ──"typing"──────▶ │        │
│        │ ◀─"user online"── │        │
└────────┘ ════════════════ └────────┘
   Server can push data anytime
```

### Your Socket Service

**File**: `mobile/src/services/socket.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(API_URL, {
      auth: { token },  // Send JWT for authentication
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('new_message', (message) => {
      // Dispatch to Redux or update React Query cache
    });
  }

  sendMessage(conversationId: string, content: string) {
    this.socket?.emit('send_message', { conversationId, content });
  }
}
```

### Backend Socket Handler

**File**: `backend/src/services/SocketService.ts`

```typescript
io.on('connection', (socket) => {
  // Authenticate the socket connection
  const token = socket.handshake.auth.token;
  const userId = verifyToken(token);

  // Join user to their personal room
  socket.join(`user:${userId}`);

  // Handle incoming messages
  socket.on('send_message', async (data) => {
    // Save to database
    const message = await MessagesService.create(data);

    // Send to recipient's room
    io.to(`user:${recipientId}`).emit('new_message', message);
  });
});
```

---

## 8. State Management (Redux)

### How Redux Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         REDUX FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐  │
│   │  VIEW   │────▶│ ACTION  │────▶│ REDUCER │────▶│  STATE  │  │
│   │(Button) │     │(loginSuccess)│ │(updates)│     │(new state)│ │
│   └─────────┘     └─────────┘     └─────────┘     └────┬────┘  │
│        ▲                                               │        │
│        └───────────────────────────────────────────────┘        │
│                    (Components re-render)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Your Auth Slice Explained

**File**: `mobile/src/store/slices/authSlice.ts`

```typescript
// 1. Define the shape of this slice's state
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// 2. Set initial values
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

// 3. Create the slice with reducers
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Each reducer handles one action type
    loginSuccess: (state, action: PayloadAction<{ user: User }>) => {
      // Redux Toolkit uses Immer - you CAN mutate state directly
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.loading = false;
    },

    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },
  },
});

// 4. Export actions and reducer
export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
```

### Using Redux in Components

```typescript
// Reading state
import { useSelector } from 'react-redux';

function ProfileScreen() {
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) return <LoginPrompt />;
  return <Text>Welcome, {user.firstName}!</Text>;
}

// Dispatching actions
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';

function LogoutButton() {
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());  // Triggers the logout reducer
  };

  return <Button onPress={handleLogout} title="Logout" />;
}
```

---

## 9. Advanced Patterns in Your Code

### Pattern 1: Middleware Chain

**File**: `backend/src/features/auth/auth.routes.ts`

```typescript
router.post(
  '/register',
  authLimiter,                          // 1. Rate limiting
  validateBody(RegisterRequestSchema),  // 2. Input validation
  AuthController.register,              // 3. Business logic
);
```

Each middleware can:
- Modify the request (`req.body = validated`)
- Short-circuit and return early (`res.status(400).json(...)`)
- Pass to next middleware (`next()`)

### Pattern 2: Repository Pattern (Your Models)

**File**: `backend/src/models/User.ts`

```typescript
// Models encapsulate ALL database access
export const UserModel = {
  findByEmail: (email) => db('users').where({ email }).first(),
  create: (data) => db('users').insert(data).returning('*'),
  // ...
};

// Services use models, never touch database directly
const user = await UserModel.findByEmail(email);
```

**Benefits**:
- Change database without changing services
- Easy to mock for testing
- Single source of truth for queries

### Pattern 3: Dependency Injection (Service Classes)

**File**: `backend/src/features/discovery/discovery.service.ts`

```typescript
export class DiscoveryService {
  // Methods are on a class instance
  async getProfiles(userId, limit, cursor) { ... }

  private async getExcludedUserIds(userId) { ... }
  private calculateCompatibility(user, target) { ... }
}

// Export singleton instance
export default new DiscoveryService();
```

**vs. Plain Functions**:
```typescript
// This approach:
import discoveryService from './discovery.service';
discoveryService.getProfiles(userId, 10);

// vs. importing functions directly:
import { getProfiles } from './discovery.service';
getProfiles(userId, 10);
```

Classes allow:
- Private methods (`getExcludedUserIds` can't be called externally)
- Instance state (if needed)
- Easy mocking for tests

### Pattern 4: Validation Schemas (Zod)

**File**: `backend/src/features/auth/auth.schemas.ts`

```typescript
import { z } from 'zod';

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().regex(/^\+1[0-9]{10}$/),
  firstName: z.string().min(1).max(50),
  childrenCount: z.number().int().min(0).max(10),
  childrenAgeGroups: z.array(
    z.enum(['infant', 'toddler', 'preschool', 'elementary', 'middle_school', 'high_school'])
  ),
});

// TypeScript type automatically derived from schema
type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
```

**Benefits**:
- Runtime validation (catches bad data from API)
- TypeScript types (catches bugs at compile time)
- Single source of truth

### Pattern 5: React Query Infinite Scroll

**File**: `mobile/src/hooks/useDiscoveryProfiles.ts`

```typescript
return useInfiniteQuery({
  queryKey: ['discovery', 'profiles'],
  queryFn: ({ pageParam }) => discoveryAPI.getProfiles(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

**In component**:
```typescript
const { data, fetchNextPage, hasNextPage } = useDiscoveryProfiles();

// FlatList with infinite scroll
<FlatList
  data={data?.pages.flatMap(p => p.profiles)}
  onEndReached={() => hasNextPage && fetchNextPage()}
/>
```

---

## 10. Exercises: Modify Your Own Code

### Exercise 1: Add a Field (Beginner)

**Goal**: Add a "preferred_neighborhood" field to parent profiles

**Steps**:
1. Create migration: `npx knex migrate:make add_preferred_neighborhood`
2. In migration, add: `table.string('preferred_neighborhood')`
3. Update `Parent` interface in `backend/src/models/Parent.ts`
4. Update `RegisterRequestSchema` in `auth.schemas.ts`
5. Update mobile form and Redux slice

### Exercise 2: Add an Endpoint (Intermediate)

**Goal**: Create `GET /api/profiles/:id` to view any profile

**Steps**:
1. Add route in `features/profile/profile.routes.ts`
2. Create controller method `getPublicProfile`
3. Add service method that returns limited data (no email/phone)
4. Test with Postman or curl

### Exercise 3: Add Real-Time Feature (Advanced)

**Goal**: Show "User is typing..." in chat

**Steps**:
1. Backend: Add socket event `typing_start` and `typing_stop`
2. Backend: Broadcast to conversation participants
3. Mobile: Emit events from `MessageInput` component
4. Mobile: Listen and show typing indicator in chat

### Exercise 4: Trace a Bug

**Scenario**: Users report profiles not loading

**Debug process**:
1. Check mobile console logs (`[useDiscoveryProfiles] Error:`)
2. Check backend logs for errors
3. Test API directly: `curl -H "Authorization: Bearer {token}" localhost:3000/api/discovery/profiles`
4. Check database: `SELECT * FROM users LIMIT 5`
5. Check Redis: `redis-cli KEYS "*"`

---

## Quick Reference Cheat Sheet

### File Locations

| What | Where |
|------|-------|
| API base URL config | `mobile/src/services/api.ts:10` |
| Redux store setup | `mobile/src/store/index.ts` |
| Navigation config | `mobile/src/navigation/` |
| Environment variables | `backend/.env` |
| Database config | `backend/src/config/database.ts` |

### Common Commands

```bash
# Backend
cd backend
npm run dev                    # Start with hot reload
npx knex migrate:latest        # Run migrations
npx knex seed:run              # Populate test data

# Mobile
cd mobile
npm start                      # Start Metro bundler
npm run ios                    # Run iOS simulator
npm run android                # Run Android emulator

# Database
docker-compose up -d           # Start PostgreSQL + Redis
docker-compose logs -f         # View logs
```

### Debugging Tips

| Problem | Check |
|---------|-------|
| API not responding | Backend console, network tab |
| State not updating | Redux DevTools, console.log in reducer |
| Query not refetching | React Query DevTools, staleTime |
| Socket not connecting | Network tab (WS), backend Socket.io logs |
| Database error | Migration status, schema matches model |

---

## Next Steps

1. **Read this guide once** - Get the mental model
2. **Open the actual files** - Read them alongside this guide
3. **Make small changes** - Start with Exercise 1
4. **Add console.logs** - Trace data flow in real-time
5. **Break things intentionally** - See what errors look like

The best way to learn YOUR code is to change it and see what happens.

---

*Last updated: February 2026*
*Codebase version: ~102K lines TypeScript*
