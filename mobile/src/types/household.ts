/**
 * Household Management Type Definitions
 *
 * Purpose: Comprehensive types for household features
 * Constitution: Principle I (Child Safety - NO child PII in household data)
 *
 * Features:
 * - Household info and member management
 * - Expense tracking and splitting
 * - Payment processing with Stripe
 * - Schedule coordination
 * - House rules and agreements
 *
 * Created: 2025-10-08
 */

// ============================================================================
// Core Household Types
// ============================================================================

export interface Household {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  establishedAt: string; // ISO timestamp
  leaseStartDate: string; // ISO date
  leaseEndDate: string; // ISO date
  monthlyRent: number;
  totalMembers: number;
  maxMembers: number;
  status: 'active' | 'pending' | 'dissolved';

  // Settings
  settings: {
    requireApprovalForNewMembers: boolean;
    allowGuestVisitors: boolean;
    quietHoursStart?: string; // "22:00"
    quietHoursEnd?: string; // "07:00"
    petPolicy: 'allowed' | 'not-allowed' | 'with-approval';
    smokingPolicy: 'prohibited' | 'designated-area' | 'allowed';
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Member Types
// ============================================================================

export interface VerificationBadges {
  idVerified: boolean;
  backgroundCheckComplete: boolean;
  incomeVerified: boolean;
  referencesChecked: boolean;
}

export interface Member {
  userId: string;
  householdId: string;

  // Basic Info (NO child PII - Constitution Principle I)
  firstName: string;
  lastName?: string; // Optional for privacy
  profilePhoto?: string;

  // Role & Status
  role: 'lease-holder' | 'co-tenant' | 'subletter';
  status: 'active' | 'pending' | 'inactive';
  isCurrentUser: boolean;

  // Verification
  verificationBadges: VerificationBadges;
  verifiedAt?: string;

  // Children Info (NO PII - only counts and age groups)
  childrenCount: number;
  childrenAgeGroups?: ('infant' | 'toddler' | 'elementary' | 'teen')[];

  // Housing Details
  rentShare: number; // Monthly amount
  rentSharePercentage: number; // 0-100
  moveInDate: string; // ISO date
  moveOutDate?: string; // ISO date if leaving

  // Payment Status
  paymentStatus: {
    currentMonth: 'paid' | 'pending' | 'overdue';
    lastPaymentDate?: string;
    nextPaymentDue: string;
  };

  // Contact (for household coordination only)
  phone?: string;
  email?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  // Metadata
  joinedAt: string;
  lastActive?: string;
}

// ============================================================================
// Expense Types
// ============================================================================

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'internet'
  | 'groceries'
  | 'cleaning'
  | 'maintenance'
  | 'repairs'
  | 'furniture'
  | 'supplies'
  | 'other';

export type ExpenseStatus =
  | 'pending' // Created but not all paid
  | 'partial' // Some members paid
  | 'paid' // All members paid
  | 'overdue'; // Past due date

export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: string;
  paymentIntentId?: string; // Stripe payment intent
}

export interface Expense {
  id: string;
  householdId: string;

  // Expense Details
  category: ExpenseCategory;
  description: string;
  totalAmount: number;
  currency: 'USD'; // Can extend to other currencies

  // Timing
  createdBy: string; // userId who created expense
  createdAt: string;
  dueDate: string; // ISO date
  paidDate?: string; // When fully paid

  // Splitting
  splitMethod: 'equal' | 'percentage' | 'custom';
  splits: ExpenseSplit[];

  // Status
  status: ExpenseStatus;

  // Proof & Documentation
  receiptUrl?: string; // S3 URL to receipt image
  notes?: string;

  // Recurring
  isRecurring: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextOccurrence?: string; // ISO date
}

// ============================================================================
// Payment Types (Stripe Integration)
// ============================================================================

export interface PaymentIntent {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  currency: 'USD';
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'processing'
    | 'succeeded'
    | 'canceled';
  clientSecret: string; // For Stripe SDK
  createdAt: string;
}

export interface SplitRentRequest {
  householdId: string;
  amount: number;
  dueDate: string;
  splitMethod: 'equal' | 'custom';
  customSplits?: { userId: string; amount: number }[];
}

export interface SplitRentResult {
  expenseId: string;
  splits: ExpenseSplit[];
  paymentIntents: PaymentIntent[];
}

// ============================================================================
// Schedule & Chores Types
// ============================================================================

export interface ScheduleEvent {
  id: string;
  householdId: string;
  title: string;
  description?: string;
  eventType: 'chore' | 'meeting' | 'payment' | 'maintenance' | 'other';
  date: string; // ISO date
  time?: string; // "14:00"
  assignedTo?: string; // userId
  location?: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  createdBy: string;
  createdAt: string;
}

export interface ChoreSchedule {
  id: string;
  householdId: string;
  taskName: string;
  description?: string;
  assignedTo: string; // userId
  dueDate: string; // ISO date
  completedAt?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

export type TransactionType = 'payment' | 'refund' | 'split' | 'reimbursement';

export interface Transaction {
  id: string;
  householdId: string;
  expenseId?: string;

  // Transaction Details
  type: TransactionType;
  amount: number;
  currency: 'USD';
  description: string;

  // Participants
  fromUserId: string;
  toUserId?: string; // For transfers between members

  // Payment Processing
  paymentMethod?: 'stripe' | 'cash' | 'check' | 'venmo' | 'other';
  stripePaymentIntentId?: string;

  // Status & Timing
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  processedAt?: string;
  createdAt: string;
}

// ============================================================================
// House Rules & Documents Types
// ============================================================================

export interface HouseRule {
  id: string;
  householdId: string;
  category: 'quiet-hours' | 'guests' | 'cleaning' | 'pets' | 'smoking' | 'parking' | 'other';
  title: string;
  description: string;
  agreedBy: string[]; // userIds who agreed
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  householdId: string;
  type: 'lease' | 'agreement' | 'rules' | 'inventory' | 'other';
  title: string;
  description?: string;
  fileUrl: string; // S3 URL
  uploadedBy: string;
  uploadedAt: string;
  sharedWith: string[]; // userIds with access
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface GetHouseholdResponse {
  household: Household;
  members: Member[];
}

export interface GetMembersResponse {
  members: Member[];
  totalCount: number;
}

export interface AddMemberRequest {
  householdId: string;
  userId: string;
  role: 'co-tenant' | 'subletter';
  rentShare: number;
  moveInDate: string;
}

export interface GetExpensesRequest {
  householdId: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

export interface GetExpensesResponse {
  expenses: Expense[];
  totalCount: number;
  nextCursor?: string;
}

export interface CreateExpenseRequest {
  householdId: string;
  category: ExpenseCategory;
  description: string;
  totalAmount: number;
  dueDate: string;
  splitMethod: 'equal' | 'percentage' | 'custom';
  customSplits?: { userId: string; amount: number; percentage?: number }[];
  receiptUrl?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface GetTransactionsRequest {
  householdId: string;
  userId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}

export interface GetTransactionsResponse {
  transactions: Transaction[];
  totalCount: number;
  nextCursor?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface HouseholdState {
  // Current Household
  household: Household | null;
  members: Member[];

  // Expenses & Payments
  expenses: Expense[];
  recentTransactions: Transaction[];
  upcomingPayments: Expense[];

  // Schedule
  scheduleEvents: ScheduleEvent[];
  chores: ChoreSchedule[];

  // Documents
  documents: Document[];
  houseRules: HouseRule[];

  // UI State
  loading: boolean;
  error: string | null;
  refreshing: boolean;

  // Pagination
  expensesCursor: string | null;
  transactionsCursor: string | null;
  hasMoreExpenses: boolean;
  hasMoreTransactions: boolean;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface HouseholdAnalytics {
  totalExpenses: number;
  averageMonthlyExpenses: number;
  onTimePaymentRate: number; // 0-100
  mostCommonExpenseCategory: ExpenseCategory;
  memberContributions: {
    userId: string;
    totalPaid: number;
    onTimePayments: number;
  }[];
}
