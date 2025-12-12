/**
 * Unit Tests for Household API Client
 * Tests household management operations
 */

import apiClient from '../../../src/config/api';

jest.mock('../../../src/config/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import HouseholdAPI from '../../../src/services/api/household';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('HouseholdAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHousehold', () => {
    it('should fetch household details', async () => {
      const mockHousehold = {
        id: 'household-123',
        name: 'Our Home',
        address: '123 Main St',
        members: [],
      };
      mockApiClient.get.mockResolvedValueOnce({ data: mockHousehold });

      const result = await HouseholdAPI.getHousehold('household-123');

      expect(result).toEqual(mockHousehold);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/households/household-123');
    });

    it('should handle not found (404)', async () => {
      const error = new Error('Not found') as any;
      error.response = { status: 404 };
      mockApiClient.get.mockRejectedValueOnce(error);
      await expect(HouseholdAPI.getHousehold('invalid')).rejects.toMatchObject({ response: { status: 404 } });
    });
  });

  describe('getMembers', () => {
    it('should fetch household members', async () => {
      const mockMembers = {
        members: [
          { userId: 'user-1', role: 'owner', rentShare: 50 },
          { userId: 'user-2', role: 'member', rentShare: 50 },
        ],
      };
      mockApiClient.get.mockResolvedValueOnce({ data: mockMembers });

      const result = await HouseholdAPI.getMembers('household-123');

      expect(result.members).toHaveLength(2);
    });
  });

  describe('addMember', () => {
    it('should add member to household', async () => {
      const newMember = { userId: 'user-3', role: 'member', rentShare: 33, householdId: 'household-123' };
      mockApiClient.post.mockResolvedValueOnce({ data: { ...newMember, id: 'member-123' } });

      const result = await HouseholdAPI.addMember(newMember);

      expect(result.userId).toBe('user-3');
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/households/household-123/members', expect.objectContaining({
        userId: 'user-3',
        role: 'member',
      }));
    });

    it('should handle duplicate member (409)', async () => {
      const error = new Error('Duplicate member') as any;
      error.response = { status: 409 };
      mockApiClient.post.mockRejectedValueOnce(error);
      await expect(HouseholdAPI.addMember({
        userId: 'user-2',
        householdId: 'household-123',
        role: 'member',
      })).rejects.toMatchObject({ response: { status: 409 } });
    });
  });

  describe('removeMember', () => {
    it('should remove member from household', async () => {
      mockApiClient.delete.mockResolvedValueOnce({ data: { success: true, message: 'Member removed' } });

      const result = await HouseholdAPI.removeMember('household-123', 'user-2');

      expect(result.success).toBe(true);
      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/households/household-123/members/user-2');
    });
  });

  describe('getExpenses', () => {
    it('should fetch expenses with filters', async () => {
      const mockExpenses = {
        expenses: [
          { id: 'exp-1', description: 'Rent', amount: 2000, category: 'rent' },
          { id: 'exp-2', description: 'Utilities', amount: 150, category: 'utilities' },
        ],
        total: 2150,
      };
      mockApiClient.get.mockResolvedValueOnce({ data: mockExpenses });

      const result = await HouseholdAPI.getExpenses({
        householdId: 'household-123',
        category: 'rent',
      });

      expect(result.expenses).toHaveLength(2);
    });
  });

  describe('createExpense', () => {
    it('should create new expense', async () => {
      const newExpense = {
        householdId: 'household-123',
        description: 'Groceries',
        amount: 150,
        category: 'groceries',
        splitType: 'equal',
      };
      mockApiClient.post.mockResolvedValueOnce({ data: { id: 'exp-123', ...newExpense } });

      const result = await HouseholdAPI.createExpense(newExpense);

      expect(result.description).toBe('Groceries');
    });

    it('should handle validation error (400)', async () => {
      const error = new Error('Validation error') as any;
      error.response = { status: 400, data: { error: 'Invalid amount' } };
      mockApiClient.post.mockRejectedValueOnce(error);
      await expect(HouseholdAPI.createExpense({
        householdId: 'household-123',
        description: 'Test',
        amount: -100,
      })).rejects.toMatchObject({ response: { status: 400 } });
    });
  });

  describe('updateExpense', () => {
    it('should update expense', async () => {
      mockApiClient.patch.mockResolvedValueOnce({ data: { id: 'exp-123', amount: 200 } });

      const result = await HouseholdAPI.updateExpense('household-123', 'exp-123', { amount: 200 });

      expect(result.amount).toBe(200);
    });
  });

  describe('deleteExpense', () => {
    it('should delete expense', async () => {
      mockApiClient.delete.mockResolvedValueOnce({ data: { success: true } });

      const result = await HouseholdAPI.deleteExpense('household-123', 'exp-123');

      expect(result.success).toBe(true);
    });
  });

  describe('splitRent', () => {
    it('should split rent among members', async () => {
      const mockResult = {
        expense: { id: 'exp-123', amount: 2000, category: 'rent' },
        splits: [
          { userId: 'user-1', amount: 1000 },
          { userId: 'user-2', amount: 1000 },
        ],
      };
      mockApiClient.post.mockResolvedValueOnce({ data: mockResult });

      const result = await HouseholdAPI.splitRent({
        householdId: 'household-123',
        totalAmount: 2000,
        dueDate: '2024-01-01',
      });

      expect(result.splits).toHaveLength(2);
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions with pagination', async () => {
      const mockTransactions = {
        transactions: [
          { id: 'txn-1', amount: 500, type: 'payment' },
        ],
        total: 1,
      };
      mockApiClient.get.mockResolvedValueOnce({ data: mockTransactions });

      const result = await HouseholdAPI.getTransactions({
        householdId: 'household-123',
        limit: 10,
      });

      expect(result.transactions).toHaveLength(1);
    });
  });

  describe('processPayment', () => {
    it('should process payment', async () => {
      const mockPaymentIntent = {
        id: 'pi-123',
        clientSecret: 'secret-123',
        amount: 1000,
      };
      mockApiClient.post.mockResolvedValueOnce({ data: mockPaymentIntent });

      const result = await HouseholdAPI.processPayment('household-123', 'exp-123', 'pm-123');

      expect(result.clientSecret).toBe('secret-123');
    });

    it('should handle payment failure', async () => {
      const error = new Error('Payment failed') as any;
      error.response = { status: 402, data: { error: 'Card declined' } };
      mockApiClient.post.mockRejectedValueOnce(error);
      await expect(HouseholdAPI.processPayment('household-123', 'exp-123', 'pm-123')).rejects.toMatchObject({
        response: { status: 402 },
      });
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { id: 'exp-123', status: 'paid' } });

      const result = await HouseholdAPI.confirmPayment('household-123', 'exp-123', 'pi-123');

      expect(result.status).toBe('paid');
    });
  });

  describe('getMyHousehold', () => {
    it('should get user household', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: { id: 'household-123', name: 'My Home' } });

      const result = await HouseholdAPI.getMyHousehold();

      expect(result?.id).toBe('household-123');
    });

    it('should return null if no household', async () => {
      const error = new Error('Not found') as any;
      error.response = { status: 404 };
      mockApiClient.get.mockRejectedValueOnce(error);

      const result = await HouseholdAPI.getMyHousehold();

      expect(result).toBeNull();
    });
  });

  describe('getUpcomingPayments', () => {
    it('should fetch upcoming payments', async () => {
      const mockExpenses = [
        { id: 'exp-1', description: 'Rent', dueDate: '2024-01-15' },
      ];
      mockApiClient.get.mockResolvedValueOnce({ data: mockExpenses });

      const result = await HouseholdAPI.getUpcomingPayments('household-123', 30);

      expect(result).toHaveLength(1);
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/households/household-123/upcoming-payments', {
        params: { daysAhead: 30 },
      });
    });
  });

  describe('markAsPaid', () => {
    it('should mark expense as paid', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { id: 'exp-123', status: 'paid' } });

      const result = await HouseholdAPI.markAsPaid('household-123', 'exp-123', 'Cash payment');

      expect(result.status).toBe('paid');
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/households/household-123/expenses/exp-123/mark-paid', {
        notes: 'Cash payment',
      });
    });
  });
});
