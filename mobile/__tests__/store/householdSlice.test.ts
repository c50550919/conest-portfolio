/**
 * Unit Tests for Household Redux Slice
 * Tests household feature state management with async thunks
 */

import { configureStore } from '@reduxjs/toolkit';
import householdReducer, {
  fetchMyHousehold,
  fetchHousehold,
  fetchMembers,
  addMember,
  removeMember,
  fetchExpenses,
  createExpense,
  splitRent,
  fetchRecentTransactions,
  fetchUpcomingPayments,
  markExpenseAsPaid,
  setHousehold,
  setMembers,
  addMemberLocal,
  removeMemberLocal,
  setExpenses,
  addExpenseLocal,
  updateExpenseLocal,
  setLoading,
  setError,
  clearHousehold,
  setRefreshing,
} from '../../src/store/slices/householdSlice';
import { Household, Member, Expense, Transaction, HouseholdState } from '../../src/types/household';

// Mock the API
jest.mock('../../src/services/api/household', () => ({
  __esModule: true,
  default: {
    getMyHousehold: jest.fn(),
    getHousehold: jest.fn(),
    getMembers: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    getExpenses: jest.fn(),
    createExpense: jest.fn(),
    splitRent: jest.fn(),
    getRecentTransactions: jest.fn(),
    getUpcomingPayments: jest.fn(),
    markAsPaid: jest.fn(),
  },
}));

describe('householdSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockHousehold: Household = {
    id: 'household-123',
    name: 'Happy Home',
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    monthlyRent: 3000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockMember: Member = {
    userId: 'user-123',
    householdId: 'household-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: 'admin',
    rentShare: 1500,
    moveInDate: new Date().toISOString(),
    profilePhoto: 'https://example.com/photo.jpg',
  };

  const mockExpense: Expense = {
    id: 'expense-123',
    householdId: 'household-123',
    createdBy: 'user-123',
    category: 'utilities',
    description: 'Electric bill',
    amount: 150,
    dueDate: new Date().toISOString(),
    status: 'pending',
    splitType: 'equal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTransaction: Transaction = {
    id: 'transaction-123',
    expenseId: 'expense-123',
    payerId: 'user-123',
    amount: 75,
    status: 'completed',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        household: householdReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().household as HouseholdState;

      expect(state.household).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.expenses).toEqual([]);
      expect(state.recentTransactions).toEqual([]);
      expect(state.upcomingPayments).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.refreshing).toBe(false);
      expect(state.expensesCursor).toBeNull();
      expect(state.hasMoreExpenses).toBe(false);
    });
  });

  describe('fetchMyHousehold', () => {
    it('should set loading to true when pending', () => {
      store.dispatch(fetchMyHousehold.pending('', undefined));

      const state = store.getState().household as HouseholdState;
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update household and members when fulfilled', () => {
      store.dispatch(fetchMyHousehold.fulfilled(
        { household: mockHousehold, members: [mockMember] },
        '',
        undefined
      ));

      const state = store.getState().household as HouseholdState;
      expect(state.loading).toBe(false);
      expect(state.household).toEqual(mockHousehold);
      expect(state.members).toEqual([mockMember]);
    });

    it('should set error when rejected', () => {
      store.dispatch(fetchMyHousehold.rejected(null, '', undefined, 'No household found'));

      const state = store.getState().household as HouseholdState;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('No household found');
    });
  });

  describe('fetchHousehold', () => {
    it('should update household when fulfilled', () => {
      store.dispatch(fetchHousehold.fulfilled(
        { household: mockHousehold, members: [mockMember] },
        '',
        'household-123'
      ));

      const state = store.getState().household as HouseholdState;
      expect(state.household).toEqual(mockHousehold);
      expect(state.members).toEqual([mockMember]);
    });
  });

  describe('fetchMembers', () => {
    it('should update members when fulfilled', () => {
      store.dispatch(fetchMembers.fulfilled([mockMember], '', 'household-123'));

      const state = store.getState().household as HouseholdState;
      expect(state.members).toEqual([mockMember]);
    });
  });

  describe('addMember', () => {
    it('should add member to state when fulfilled', () => {
      const request = {
        householdId: 'household-123',
        email: 'jane@example.com',
        role: 'member' as const,
      };
      const newMember = { ...mockMember, userId: 'user-456', firstName: 'Jane' };
      store.dispatch(addMember.fulfilled(newMember, '', request));

      const state = store.getState().household as HouseholdState;
      expect(state.members).toContainEqual(newMember);
    });
  });

  describe('removeMember', () => {
    it('should remove member from state when fulfilled', () => {
      store.dispatch(fetchMembers.fulfilled([mockMember], '', 'household-123'));
      store.dispatch(removeMember.fulfilled('user-123', '', { householdId: 'household-123', userId: 'user-123' }));

      const state = store.getState().household as HouseholdState;
      expect(state.members).toHaveLength(0);
    });
  });

  describe('fetchExpenses', () => {
    it('should set loading when pending', () => {
      store.dispatch(fetchExpenses.pending('', { householdId: 'household-123' }));

      const state = store.getState().household as HouseholdState;
      expect(state.loading).toBe(true);
    });

    it('should replace expenses on refresh', () => {
      store.dispatch(setExpenses([mockExpense]));
      const newExpense = { ...mockExpense, id: 'expense-456' };
      store.dispatch(fetchExpenses.fulfilled(
        { expenses: [newExpense], nextCursor: null, refresh: true },
        '',
        { householdId: 'household-123', refresh: true }
      ));

      const state = store.getState().household as HouseholdState;
      expect(state.expenses).toEqual([newExpense]);
    });

    it('should append expenses on pagination', () => {
      store.dispatch(setExpenses([mockExpense]));
      const newExpense = { ...mockExpense, id: 'expense-456' };
      store.dispatch(fetchExpenses.fulfilled(
        { expenses: [newExpense], nextCursor: 'cursor-2', refresh: false },
        '',
        { householdId: 'household-123' }
      ));

      const state = store.getState().household as HouseholdState;
      expect(state.expenses).toHaveLength(2);
      expect(state.expensesCursor).toBe('cursor-2');
      expect(state.hasMoreExpenses).toBe(true);
    });
  });

  describe('createExpense', () => {
    it('should add expense to beginning of list when fulfilled', () => {
      store.dispatch(setExpenses([mockExpense]));
      const newExpense = { ...mockExpense, id: 'expense-new', description: 'New expense' };
      const request = {
        householdId: 'household-123',
        category: 'utilities' as const,
        description: 'New expense',
        amount: 100,
        dueDate: new Date().toISOString(),
        splitType: 'equal' as const,
      };
      store.dispatch(createExpense.fulfilled(newExpense, '', request));

      const state = store.getState().household as HouseholdState;
      expect(state.expenses[0]).toEqual(newExpense);
    });
  });

  describe('splitRent', () => {
    it('should complete without error when fulfilled', () => {
      const request = {
        householdId: 'household-123',
        totalRent: 3000,
        dueDate: new Date().toISOString(),
      };
      store.dispatch(splitRent.fulfilled({ success: true }, '', request));

      const state = store.getState().household as HouseholdState;
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchRecentTransactions', () => {
    it('should update recentTransactions when fulfilled', () => {
      store.dispatch(fetchRecentTransactions.fulfilled([mockTransaction], '', 'household-123'));

      const state = store.getState().household as HouseholdState;
      expect(state.recentTransactions).toEqual([mockTransaction]);
    });
  });

  describe('fetchUpcomingPayments', () => {
    it('should update upcomingPayments when fulfilled', () => {
      store.dispatch(fetchUpcomingPayments.fulfilled([mockExpense], '', 'household-123'));

      const state = store.getState().household as HouseholdState;
      expect(state.upcomingPayments).toEqual([mockExpense]);
    });
  });

  describe('markExpenseAsPaid', () => {
    it('should update expense status when fulfilled', () => {
      store.dispatch(setExpenses([mockExpense]));
      const paidExpense = { ...mockExpense, status: 'paid' as const };
      store.dispatch(markExpenseAsPaid.fulfilled(
        paidExpense,
        '',
        { householdId: 'household-123', expenseId: 'expense-123' }
      ));

      const state = store.getState().household as HouseholdState;
      expect(state.expenses[0].status).toBe('paid');
    });
  });

  describe('synchronous actions', () => {
    describe('setHousehold', () => {
      it('should set household', () => {
        store.dispatch(setHousehold(mockHousehold));

        const state = store.getState().household as HouseholdState;
        expect(state.household).toEqual(mockHousehold);
      });
    });

    describe('setMembers', () => {
      it('should set members', () => {
        store.dispatch(setMembers([mockMember]));

        const state = store.getState().household as HouseholdState;
        expect(state.members).toEqual([mockMember]);
      });
    });

    describe('addMemberLocal', () => {
      it('should add member locally', () => {
        const newMember = { ...mockMember, userId: 'user-456' };
        store.dispatch(addMemberLocal(newMember));

        const state = store.getState().household as HouseholdState;
        expect(state.members).toContainEqual(newMember);
      });
    });

    describe('removeMemberLocal', () => {
      it('should remove member locally', () => {
        store.dispatch(setMembers([mockMember]));
        store.dispatch(removeMemberLocal('user-123'));

        const state = store.getState().household as HouseholdState;
        expect(state.members).toHaveLength(0);
      });
    });

    describe('setExpenses', () => {
      it('should set expenses', () => {
        store.dispatch(setExpenses([mockExpense]));

        const state = store.getState().household as HouseholdState;
        expect(state.expenses).toEqual([mockExpense]);
      });
    });

    describe('addExpenseLocal', () => {
      it('should add expense to beginning', () => {
        store.dispatch(setExpenses([mockExpense]));
        const newExpense = { ...mockExpense, id: 'expense-new' };
        store.dispatch(addExpenseLocal(newExpense));

        const state = store.getState().household as HouseholdState;
        expect(state.expenses[0]).toEqual(newExpense);
      });
    });

    describe('updateExpenseLocal', () => {
      it('should update expense locally', () => {
        store.dispatch(setExpenses([mockExpense]));
        const updated = { ...mockExpense, amount: 200 };
        store.dispatch(updateExpenseLocal(updated));

        const state = store.getState().household as HouseholdState;
        expect(state.expenses[0].amount).toBe(200);
      });
    });

    describe('setLoading', () => {
      it('should set loading state', () => {
        store.dispatch(setLoading(true));

        const state = store.getState().household as HouseholdState;
        expect(state.loading).toBe(true);
      });
    });

    describe('setError', () => {
      it('should set error', () => {
        store.dispatch(setError('Something went wrong'));

        const state = store.getState().household as HouseholdState;
        expect(state.error).toBe('Something went wrong');
      });

      it('should clear error when set to null', () => {
        store.dispatch(setError('Error'));
        store.dispatch(setError(null));

        const state = store.getState().household as HouseholdState;
        expect(state.error).toBeNull();
      });
    });

    describe('clearHousehold', () => {
      it('should reset to initial state', () => {
        store.dispatch(setHousehold(mockHousehold));
        store.dispatch(setMembers([mockMember]));
        store.dispatch(setExpenses([mockExpense]));
        store.dispatch(clearHousehold());

        const state = store.getState().household as HouseholdState;
        expect(state.household).toBeNull();
        expect(state.members).toEqual([]);
        expect(state.expenses).toEqual([]);
      });
    });

    describe('setRefreshing', () => {
      it('should set refreshing state', () => {
        store.dispatch(setRefreshing(true));

        const state = store.getState().household as HouseholdState;
        expect(state.refreshing).toBe(true);
      });
    });
  });
});
