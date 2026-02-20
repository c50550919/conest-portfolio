/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Household Redux Slice
 *
 * Purpose: State management for household features
 * Constitution: Principle I (Child Safety - NO child PII)
 *
 * State:
 * - Current household and members
 * - Expenses and transactions
 * - Loading and error states
 *
 * Actions:
 * - Fetch household data
 * - Manage members
 * - Handle expenses and payments
 *
 * Created: 2025-10-08
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import householdAPI from '../../services/api/household';
import templatesAPI from '../../services/api/templatesAPI';
import invitationsAPI from '../../services/api/invitationsAPI';
import {
  Household,
  Member,
  Expense,
  Transaction,
  HouseholdState,
  CreateExpenseRequest,
  AddMemberRequest,
  SplitRentRequest,
} from '../../types/household';
import { Template } from '../../types/templates';
import { Invitation, InvitationWithDetails, SendInvitationRequest } from '../../types/invitation';

// ============================================================================
// Initial State
// ============================================================================

const initialState: HouseholdState = {
  // Current Household
  household: null,
  members: [],

  // Expenses & Payments
  expenses: [],
  recentTransactions: [],
  upcomingPayments: [],

  // Schedule
  scheduleEvents: [],
  chores: [],

  // Documents
  documents: [],
  houseRules: [],

  // Templates
  templates: [] as Template[],
  templatesLoading: false,
  templatesError: null as string | null,
  downloadingTemplateId: null as string | null,

  // Invitations
  pendingInvitations: [] as InvitationWithDetails[],
  sentInvitations: [] as Invitation[],
  invitationsLoading: false,
  invitationsError: null as string | null,

  // UI State
  loading: false,
  error: null,
  refreshing: false,

  // Pagination
  expensesCursor: null,
  transactionsCursor: null,
  hasMoreExpenses: false,
  hasMoreTransactions: false,
};

// ============================================================================
// Async Thunks
// ============================================================================

/**
 * Fetch current user's household
 */
export const fetchMyHousehold = createAsyncThunk(
  'household/fetchMyHousehold',
  async (_, { rejectWithValue }) => {
    try {
      const household = await householdAPI.getMyHousehold();
      if (!household) {
        return rejectWithValue('No household found');
      }

      // Fetch members for the household
      const membersResponse = await householdAPI.getMembers(household.id);

      return {
        household,
        members: membersResponse.members,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch household');
    }
  }
);

/**
 * Create a new household
 */
export const createHousehold = createAsyncThunk(
  'household/createHousehold',
  async (
    data: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      monthlyRent: number; // in cents
      leaseStartDate?: string;
      leaseEndDate?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const household = await householdAPI.createHousehold(data);
      // Fetch members (creator is added automatically)
      const membersResponse = await householdAPI.getMembers(household.id);
      return {
        household,
        members: membersResponse.members,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create household');
    }
  }
);

/**
 * Fetch household by ID
 */
export const fetchHousehold = createAsyncThunk(
  'household/fetchHousehold',
  async (householdId: string, { rejectWithValue }) => {
    try {
      const response = await householdAPI.getHousehold(householdId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch household');
    }
  }
);

/**
 * Fetch household members
 */
export const fetchMembers = createAsyncThunk(
  'household/fetchMembers',
  async (householdId: string, { rejectWithValue }) => {
    try {
      const response = await householdAPI.getMembers(householdId);
      return response.members;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch members');
    }
  }
);

/**
 * Add new member to household
 */
export const addMember = createAsyncThunk(
  'household/addMember',
  async (request: AddMemberRequest, { rejectWithValue }) => {
    try {
      const member = await householdAPI.addMember(request);
      return member;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add member');
    }
  }
);

/**
 * Remove member from household
 */
export const removeMember = createAsyncThunk(
  'household/removeMember',
  async ({ householdId, userId }: { householdId: string; userId: string }, { rejectWithValue }) => {
    try {
      await householdAPI.removeMember(householdId, userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove member');
    }
  }
);

/**
 * Fetch household expenses
 */
export const fetchExpenses = createAsyncThunk(
  'household/fetchExpenses',
  async (
    { householdId, refresh = false }: { householdId: string; refresh?: boolean },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { household: HouseholdState };
      const cursor = refresh ? undefined : state.household.expensesCursor || undefined;

      const response = await householdAPI.getExpenses({
        householdId,
        cursor,
        limit: 20,
      });

      return {
        expenses: response.expenses,
        nextCursor: response.nextCursor || null,
        refresh,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch expenses');
    }
  }
);

/**
 * Create new expense
 */
export const createExpense = createAsyncThunk(
  'household/createExpense',
  async (request: CreateExpenseRequest, { rejectWithValue }) => {
    try {
      const expense = await householdAPI.createExpense(request);
      return expense;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create expense');
    }
  }
);

/**
 * Split monthly rent
 */
export const splitRent = createAsyncThunk(
  'household/splitRent',
  async (request: SplitRentRequest, { rejectWithValue }) => {
    try {
      const result = await householdAPI.splitRent(request);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to split rent');
    }
  }
);

/**
 * Fetch recent transactions
 */
export const fetchRecentTransactions = createAsyncThunk(
  'household/fetchRecentTransactions',
  async (householdId: string, { rejectWithValue }) => {
    try {
      const transactions = await householdAPI.getRecentTransactions(householdId, 10);
      return transactions;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch transactions');
    }
  }
);

/**
 * Fetch upcoming payments
 */
export const fetchUpcomingPayments = createAsyncThunk(
  'household/fetchUpcomingPayments',
  async (householdId: string, { rejectWithValue }) => {
    try {
      const payments = await householdAPI.getUpcomingPayments(householdId, 30);
      return payments;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch upcoming payments');
    }
  }
);

/**
 * Mark expense as paid
 */
export const markExpenseAsPaid = createAsyncThunk(
  'household/markExpenseAsPaid',
  async (
    { householdId, expenseId, notes }: { householdId: string; expenseId: string; notes?: string },
    { rejectWithValue }
  ) => {
    try {
      const expense = await householdAPI.markAsPaid(householdId, expenseId, notes);
      return expense;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark expense as paid');
    }
  }
);

// ============================================================================
// Templates Thunks
// ============================================================================

/**
 * Fetch document templates
 */
export const fetchTemplates = createAsyncThunk(
  'household/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const templates = await templatesAPI.getTemplates();
      return templates;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch templates');
    }
  }
);

/**
 * Get download URL for a template
 * Returns the download URL for opening in browser/PDF viewer
 */
export const getTemplateDownloadUrl = createAsyncThunk(
  'household/getTemplateDownloadUrl',
  async (templateId: string, { rejectWithValue }) => {
    try {
      const response = await templatesAPI.getDownloadUrl(templateId);
      return {
        templateId,
        downloadUrl: response.downloadUrl,
        expiresIn: response.expiresIn,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to get download URL');
    }
  }
);

// ============================================================================
// Invitation Thunks
// ============================================================================

/**
 * Fetch received invitations for current user
 */
export const fetchReceivedInvitations = createAsyncThunk(
  'household/fetchReceivedInvitations',
  async (_, { rejectWithValue }) => {
    try {
      const invitations = await invitationsAPI.getReceivedInvitations();
      return invitations;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch received invitations'
      );
    }
  }
);

/**
 * Fetch sent invitations for a household
 */
export const fetchSentInvitations = createAsyncThunk(
  'household/fetchSentInvitations',
  async (householdId: string, { rejectWithValue }) => {
    try {
      const invitations = await invitationsAPI.getSentInvitations(householdId);
      return invitations;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sent invitations');
    }
  }
);

/**
 * Send an invitation to join a household
 */
export const sendInvitation = createAsyncThunk(
  'household/sendInvitation',
  async (
    { householdId, data }: { householdId: string; data: SendInvitationRequest },
    { rejectWithValue }
  ) => {
    try {
      const invitation = await invitationsAPI.sendInvitation(householdId, data);
      return invitation;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send invitation');
    }
  }
);

/**
 * Accept an invitation to join a household
 */
export const acceptInvitation = createAsyncThunk(
  'household/acceptInvitation',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      const invitation = await invitationsAPI.acceptInvitation(inviteId);
      return invitation;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept invitation');
    }
  }
);

/**
 * Decline an invitation
 */
export const declineInvitation = createAsyncThunk(
  'household/declineInvitation',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      const invitation = await invitationsAPI.declineInvitation(inviteId);
      return invitation;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to decline invitation');
    }
  }
);

/**
 * Cancel a sent invitation
 */
export const cancelInvitation = createAsyncThunk(
  'household/cancelInvitation',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      const invitation = await invitationsAPI.cancelInvitation(inviteId);
      return invitation;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel invitation');
    }
  }
);

// ============================================================================
// Slice
// ============================================================================

const householdSlice = createSlice({
  name: 'household',
  initialState,
  reducers: {
    // Set household manually
    setHousehold: (state, action: PayloadAction<Household>) => {
      state.household = action.payload;
    },

    // Set members manually
    setMembers: (state, action: PayloadAction<Member[]>) => {
      state.members = action.payload;
    },

    // Add member locally
    addMemberLocal: (state, action: PayloadAction<Member>) => {
      state.members.push(action.payload);
    },

    // Remove member locally
    removeMemberLocal: (state, action: PayloadAction<string>) => {
      state.members = state.members.filter((m) => m.userId !== action.payload);
    },

    // Set expenses
    setExpenses: (state, action: PayloadAction<Expense[]>) => {
      state.expenses = action.payload;
    },

    // Add expense locally
    addExpenseLocal: (state, action: PayloadAction<Expense>) => {
      state.expenses.unshift(action.payload);
    },

    // Update expense locally
    updateExpenseLocal: (state, action: PayloadAction<Expense>) => {
      const index = state.expenses.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
      }
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Clear household data (on logout)
    clearHousehold: (state) => {
      return initialState;
    },

    // Set refreshing state
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },

    // Templates reducers
    setTemplates: (state, action: PayloadAction<Template[]>) => {
      state.templates = action.payload;
    },

    setTemplatesLoading: (state, action: PayloadAction<boolean>) => {
      state.templatesLoading = action.payload;
    },

    setTemplatesError: (state, action: PayloadAction<string | null>) => {
      state.templatesError = action.payload;
    },

    setDownloadingTemplateId: (state, action: PayloadAction<string | null>) => {
      state.downloadingTemplateId = action.payload;
    },

    clearTemplatesError: (state) => {
      state.templatesError = null;
    },

    // Invitations reducers
    setPendingInvitations: (state, action: PayloadAction<InvitationWithDetails[]>) => {
      state.pendingInvitations = action.payload;
    },

    setSentInvitations: (state, action: PayloadAction<Invitation[]>) => {
      state.sentInvitations = action.payload;
    },

    setInvitationsLoading: (state, action: PayloadAction<boolean>) => {
      state.invitationsLoading = action.payload;
    },

    setInvitationsError: (state, action: PayloadAction<string | null>) => {
      state.invitationsError = action.payload;
    },

    clearInvitationsError: (state) => {
      state.invitationsError = null;
    },

    // Remove a pending invitation locally (after accept/decline)
    removePendingInvitationLocal: (state, action: PayloadAction<string>) => {
      state.pendingInvitations = state.pendingInvitations.filter(
        (inv) => inv.invitation.id !== action.payload
      );
    },

    // Remove a sent invitation locally (after cancel)
    removeSentInvitationLocal: (state, action: PayloadAction<string>) => {
      state.sentInvitations = state.sentInvitations.filter((inv) => inv.id !== action.payload);
    },

    // Add a sent invitation locally (after send)
    addSentInvitationLocal: (state, action: PayloadAction<Invitation>) => {
      state.sentInvitations.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    // Fetch My Household
    builder
      .addCase(fetchMyHousehold.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyHousehold.fulfilled, (state, action) => {
        state.loading = false;
        state.household = action.payload.household;
        state.members = action.payload.members;
      })
      .addCase(fetchMyHousehold.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Household
    builder
      .addCase(createHousehold.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createHousehold.fulfilled, (state, action) => {
        state.loading = false;
        state.household = action.payload.household;
        state.members = action.payload.members;
      })
      .addCase(createHousehold.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Household
    builder
      .addCase(fetchHousehold.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHousehold.fulfilled, (state, action) => {
        state.loading = false;
        state.household = action.payload.household;
        state.members = action.payload.members;
      })
      .addCase(fetchHousehold.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Members
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.members = action.payload;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add Member
    builder
      .addCase(addMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addMember.fulfilled, (state, action) => {
        state.loading = false;
        state.members.push(action.payload);
      })
      .addCase(addMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Remove Member
    builder
      .addCase(removeMember.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.loading = false;
        state.members = state.members.filter((m) => m.userId !== action.payload);
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Expenses
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.refresh) {
          state.expenses = action.payload.expenses;
        } else {
          state.expenses = [...state.expenses, ...action.payload.expenses];
        }
        state.expensesCursor = action.payload.nextCursor;
        state.hasMoreExpenses = action.payload.nextCursor !== null;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Expense
    builder
      .addCase(createExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses.unshift(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Split Rent
    builder
      .addCase(splitRent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(splitRent.fulfilled, (state) => {
        state.loading = false;
        // Expense will be fetched via fetchExpenses
      })
      .addCase(splitRent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Recent Transactions
    builder
      .addCase(fetchRecentTransactions.pending, (state) => {
        // Don't set loading for background fetch
        state.error = null;
      })
      .addCase(fetchRecentTransactions.fulfilled, (state, action) => {
        state.recentTransactions = action.payload;
      })
      .addCase(fetchRecentTransactions.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch Upcoming Payments
    builder
      .addCase(fetchUpcomingPayments.pending, (state) => {
        // Don't set loading for background fetch
        state.error = null;
      })
      .addCase(fetchUpcomingPayments.fulfilled, (state, action) => {
        state.upcomingPayments = action.payload;
      })
      .addCase(fetchUpcomingPayments.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Mark Expense As Paid
    builder
      .addCase(markExpenseAsPaid.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markExpenseAsPaid.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.expenses.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(markExpenseAsPaid.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Templates
    builder
      .addCase(fetchTemplates.pending, (state) => {
        state.templatesLoading = true;
        state.templatesError = null;
      })
      .addCase(fetchTemplates.fulfilled, (state, action) => {
        state.templatesLoading = false;
        state.templates = action.payload;
      })
      .addCase(fetchTemplates.rejected, (state, action) => {
        state.templatesLoading = false;
        state.templatesError = action.payload as string;
      });

    // Get Template Download URL
    builder
      .addCase(getTemplateDownloadUrl.pending, (state, action) => {
        state.downloadingTemplateId = action.meta.arg;
      })
      .addCase(getTemplateDownloadUrl.fulfilled, (state) => {
        state.downloadingTemplateId = null;
      })
      .addCase(getTemplateDownloadUrl.rejected, (state, action) => {
        state.downloadingTemplateId = null;
        state.templatesError = action.payload as string;
      });

    // Fetch Received Invitations
    builder
      .addCase(fetchReceivedInvitations.pending, (state) => {
        state.invitationsLoading = true;
        state.invitationsError = null;
      })
      .addCase(fetchReceivedInvitations.fulfilled, (state, action) => {
        state.invitationsLoading = false;
        state.pendingInvitations = action.payload;
      })
      .addCase(fetchReceivedInvitations.rejected, (state, action) => {
        state.invitationsLoading = false;
        state.invitationsError = action.payload as string;
      });

    // Fetch Sent Invitations
    builder
      .addCase(fetchSentInvitations.pending, (state) => {
        state.invitationsLoading = true;
        state.invitationsError = null;
      })
      .addCase(fetchSentInvitations.fulfilled, (state, action) => {
        state.invitationsLoading = false;
        state.sentInvitations = action.payload;
      })
      .addCase(fetchSentInvitations.rejected, (state, action) => {
        state.invitationsLoading = false;
        state.invitationsError = action.payload as string;
      });

    // Send Invitation
    builder
      .addCase(sendInvitation.pending, (state) => {
        state.invitationsLoading = true;
        state.invitationsError = null;
      })
      .addCase(sendInvitation.fulfilled, (state, action) => {
        state.invitationsLoading = false;
        state.sentInvitations.unshift(action.payload);
      })
      .addCase(sendInvitation.rejected, (state, action) => {
        state.invitationsLoading = false;
        state.invitationsError = action.payload as string;
      });

    // Accept Invitation
    builder
      .addCase(acceptInvitation.pending, (state) => {
        state.invitationsLoading = true;
        state.invitationsError = null;
      })
      .addCase(acceptInvitation.fulfilled, (state, action) => {
        state.invitationsLoading = false;
        // Remove from pending invitations
        state.pendingInvitations = state.pendingInvitations.filter(
          (inv) => inv.invitation.id !== action.payload.id
        );
      })
      .addCase(acceptInvitation.rejected, (state, action) => {
        state.invitationsLoading = false;
        state.invitationsError = action.payload as string;
      });

    // Decline Invitation
    builder
      .addCase(declineInvitation.pending, (state) => {
        state.invitationsLoading = true;
        state.invitationsError = null;
      })
      .addCase(declineInvitation.fulfilled, (state, action) => {
        state.invitationsLoading = false;
        // Remove from pending invitations
        state.pendingInvitations = state.pendingInvitations.filter(
          (inv) => inv.invitation.id !== action.payload.id
        );
      })
      .addCase(declineInvitation.rejected, (state, action) => {
        state.invitationsLoading = false;
        state.invitationsError = action.payload as string;
      });

    // Cancel Invitation
    builder
      .addCase(cancelInvitation.pending, (state) => {
        state.invitationsLoading = true;
        state.invitationsError = null;
      })
      .addCase(cancelInvitation.fulfilled, (state, action) => {
        state.invitationsLoading = false;
        // Remove from sent invitations
        state.sentInvitations = state.sentInvitations.filter((inv) => inv.id !== action.payload.id);
      })
      .addCase(cancelInvitation.rejected, (state, action) => {
        state.invitationsLoading = false;
        state.invitationsError = action.payload as string;
      });
  },
});

// ============================================================================
// Exports
// ============================================================================

export const {
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
  // Templates
  setTemplates,
  setTemplatesLoading,
  setTemplatesError,
  setDownloadingTemplateId,
  clearTemplatesError,
  // Invitations
  setPendingInvitations,
  setSentInvitations,
  setInvitationsLoading,
  setInvitationsError,
  clearInvitationsError,
  removePendingInvitationLocal,
  removeSentInvitationLocal,
  addSentInvitationLocal,
} = householdSlice.actions;

export default householdSlice.reducer;
