/**
 * Household API Service
 *
 * Purpose: API client for Household Management features
 * Constitution: Principle I (Child Safety - NO child PII in requests/responses)
 * Constitution: Principle IV (Performance - <200ms API calls P95)
 *
 * Endpoints:
 * - GET /api/households/:id - Get household details
 * - GET /api/households/:id/members - Get household members
 * - POST /api/households/:id/members - Add member to household
 * - GET /api/households/:id/expenses - Get household expenses
 * - POST /api/households/:id/expenses - Create new expense
 * - POST /api/households/:id/split-rent - Split monthly rent
 * - GET /api/households/:id/transactions - Get transaction history
 * - POST /api/households/:id/expenses/:expenseId/pay - Process payment
 *
 * Created: 2025-10-08
 */

import apiClient from '../../config/api';
import {
  Household,
  Member,
  Expense,
  Transaction,
  GetHouseholdResponse,
  GetMembersResponse,
  AddMemberRequest,
  GetExpensesRequest,
  GetExpensesResponse,
  CreateExpenseRequest,
  GetTransactionsRequest,
  GetTransactionsResponse,
  SplitRentRequest,
  SplitRentResult,
  PaymentIntent,
} from '../../types/household';

/**
 * Household API Client
 * Handles all household-related API interactions
 */
class HouseholdAPI {
  /**
   * Get household details and members
   * @param householdId - UUID of household
   * @returns Household info with members
   */
  async getHousehold(householdId: string): Promise<GetHouseholdResponse> {
    const response = await apiClient.get<GetHouseholdResponse>(`/api/households/${householdId}`);
    return response.data;
  }

  /**
   * Get all members of a household
   * @param householdId - UUID of household
   * @returns List of household members
   */
  async getMembers(householdId: string): Promise<GetMembersResponse> {
    console.log('[HouseholdAPI] getMembers called for household:', householdId);
    try {
      const response = await apiClient.get<GetMembersResponse>(
        `/api/households/${householdId}/members`
      );
      console.log('[HouseholdAPI] getMembers response status:', response.status);
      console.log('[HouseholdAPI] getMembers response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('[HouseholdAPI] getMembers error:', error.message);
      console.error('[HouseholdAPI] getMembers error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('[HouseholdAPI] getMembers error status:', error.response?.status);
      throw error;
    }
  }

  /**
   * Add a new member to household
   * @param request - Member details
   * @returns Updated member list
   */
  async addMember(request: AddMemberRequest): Promise<Member> {
    const response = await apiClient.post<Member>(
      `/api/households/${request.householdId}/members`,
      {
        userId: request.userId,
        role: request.role,
        rentShare: request.rentShare,
        moveInDate: request.moveInDate,
      }
    );
    return response.data;
  }

  /**
   * Remove a member from household
   * @param householdId - UUID of household
   * @param userId - UUID of member to remove
   * @returns Success status
   */
  async removeMember(
    householdId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/api/households/${householdId}/members/${userId}`);
    return response.data;
  }

  /**
   * Get household expenses with optional filtering
   * @param request - Filter parameters
   * @returns Paginated expenses
   */
  async getExpenses(request: GetExpensesRequest): Promise<GetExpensesResponse> {
    const { householdId, ...params } = request;

    const response = await apiClient.get<GetExpensesResponse>(
      `/api/households/${householdId}/expenses`,
      { params }
    );
    return response.data;
  }

  /**
   * Create a new expense
   * @param request - Expense details
   * @returns Created expense
   */
  async createExpense(request: CreateExpenseRequest): Promise<Expense> {
    const { householdId, ...data } = request;

    const response = await apiClient.post<Expense>(`/api/households/${householdId}/expenses`, data);
    return response.data;
  }

  /**
   * Update an existing expense
   * @param householdId - UUID of household
   * @param expenseId - UUID of expense
   * @param updates - Fields to update
   * @returns Updated expense
   */
  async updateExpense(
    householdId: string,
    expenseId: string,
    updates: Partial<CreateExpenseRequest>
  ): Promise<Expense> {
    const response = await apiClient.patch<Expense>(
      `/api/households/${householdId}/expenses/${expenseId}`,
      updates
    );
    return response.data;
  }

  /**
   * Delete an expense
   * @param householdId - UUID of household
   * @param expenseId - UUID of expense
   * @returns Success status
   */
  async deleteExpense(
    householdId: string,
    expenseId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/api/households/${householdId}/expenses/${expenseId}`);
    return response.data;
  }

  /**
   * Split monthly rent among household members
   * @param request - Rent splitting details
   * @returns Created expense with payment intents
   */
  async splitRent(request: SplitRentRequest): Promise<SplitRentResult> {
    const { householdId, ...data } = request;

    const response = await apiClient.post<SplitRentResult>(
      `/api/households/${householdId}/split-rent`,
      data
    );
    return response.data;
  }

  /**
   * Get transaction history
   * @param request - Filter parameters
   * @returns Paginated transactions
   */
  async getTransactions(request: GetTransactionsRequest): Promise<GetTransactionsResponse> {
    const { householdId, ...params } = request;

    const response = await apiClient.get<GetTransactionsResponse>(
      `/api/households/${householdId}/transactions`,
      { params }
    );
    return response.data;
  }

  /**
   * Process payment for an expense split
   * @param householdId - UUID of household
   * @param expenseId - UUID of expense
   * @param paymentMethodId - Stripe payment method ID
   * @returns Payment intent with client secret
   */
  async processPayment(
    householdId: string,
    expenseId: string,
    paymentMethodId: string
  ): Promise<PaymentIntent> {
    const response = await apiClient.post<PaymentIntent>(
      `/api/households/${householdId}/expenses/${expenseId}/pay`,
      { paymentMethodId }
    );
    return response.data;
  }

  /**
   * Confirm payment intent (after Stripe confirmation)
   * @param householdId - UUID of household
   * @param expenseId - UUID of expense
   * @param paymentIntentId - Stripe payment intent ID
   * @returns Updated expense
   */
  async confirmPayment(
    householdId: string,
    expenseId: string,
    paymentIntentId: string
  ): Promise<Expense> {
    const response = await apiClient.post<Expense>(
      `/api/households/${householdId}/expenses/${expenseId}/confirm`,
      { paymentIntentId }
    );
    return response.data;
  }

  /**
   * Create a new household
   * @param data - Household creation data
   * @returns Created household
   */
  async createHousehold(data: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    monthlyRent: number; // in cents
    leaseStartDate?: string; // YYYY-MM-DD
    leaseEndDate?: string; // YYYY-MM-DD
  }): Promise<Household> {
    console.log('[HouseholdAPI] createHousehold called with:', JSON.stringify(data, null, 2));
    const response = await apiClient.post<Household>('/api/household', data);
    console.log('[HouseholdAPI] createHousehold response:', JSON.stringify(response.data, null, 2));
    return response.data;
  }

  /**
   * Get current user's household
   * @returns User's active household or null
   */
  async getMyHousehold(): Promise<Household | null> {
    try {
      console.log('[HouseholdAPI] getMyHousehold called - fetching /api/households/me');
      const response = await apiClient.get<Household>('/api/households/me');
      console.log('[HouseholdAPI] getMyHousehold response status:', response.status);
      console.log('[HouseholdAPI] getMyHousehold response data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('[HouseholdAPI] getMyHousehold error:', error.message);
      console.error('[HouseholdAPI] Error response status:', error.response?.status);
      console.error('[HouseholdAPI] Error response data:', JSON.stringify(error.response?.data, null, 2));
      if (error.response?.status === 404) {
        console.log('[HouseholdAPI] 404 - User not in a household');
        return null; // User not in a household
      }
      throw error;
    }
  }

  /**
   * Get upcoming payments for current user
   * @param householdId - UUID of household
   * @param daysAhead - Number of days to look ahead (default 30)
   * @returns List of upcoming expenses
   */
  async getUpcomingPayments(householdId: string, daysAhead: number = 30): Promise<Expense[]> {
    const response = await apiClient.get<Expense[]>(
      `/api/households/${householdId}/upcoming-payments`,
      { params: { daysAhead } }
    );
    return response.data;
  }

  /**
   * Get recent transactions (last 30 days)
   * @param householdId - UUID of household
   * @param limit - Number of transactions to fetch
   * @returns Recent transactions
   */
  async getRecentTransactions(householdId: string, limit: number = 10): Promise<Transaction[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const response = await this.getTransactions({
      householdId,
      startDate: thirtyDaysAgo.toISOString(),
      limit,
    });

    return response.transactions;
  }

  /**
   * Mark expense as paid (for cash/check payments)
   * @param householdId - UUID of household
   * @param expenseId - UUID of expense
   * @param notes - Optional payment notes
   * @returns Updated expense
   */
  async markAsPaid(householdId: string, expenseId: string, notes?: string): Promise<Expense> {
    const response = await apiClient.post<Expense>(
      `/api/households/${householdId}/expenses/${expenseId}/mark-paid`,
      { notes }
    );
    return response.data;
  }
}

export default new HouseholdAPI();
