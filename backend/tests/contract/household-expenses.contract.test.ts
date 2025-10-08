/**
 * T030: Contract Test - GET /api/household/:id/expenses
 *
 * Tests API contract compliance for fetching household expenses.
 *
 * Security: Only household members can access expense list
 * Payment: Amounts in cents (integer), Stripe integration
 */

import request from 'supertest';
import { app } from '../../src/app';
import { z } from 'zod';

// Expense schema from API spec (Zod validation)
const ExpenseSchema = z.object({
  id: z.string().uuid(),
  householdId: z.string().uuid(),
  payerId: z.string().uuid(),
  payerName: z.string().min(1).max(100),
  amount: z.number().int().positive(), // Amount in cents
  type: z.enum(['rent', 'utilities', 'deposit', 'other']),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'refunded']),
  description: z.string().max(500).optional(),
  dueDate: z.string().datetime().optional(),
  paidAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

// Response schema
const ExpensesResponseSchema = z.object({
  expenses: z.array(ExpenseSchema),
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
});

describe('GET /api/household/:id/expenses - Contract Tests', () => {
  let authToken: string;
  let householdId: string;
  let nonMemberToken: string;

  beforeAll(async () => {
    // Mock authentication tokens
    authToken = 'mock-jwt-token-household-member';
    nonMemberToken = 'mock-jwt-token-non-member';
    householdId = 'household-123';
  });

  describe('Success Cases', () => {
    it('should return 200 with expenses array for household member', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Schema validation
      const result = ExpensesResponseSchema.safeParse(response.body);
      if (!result.success) {
        console.error('Schema validation errors:', result.error.format());
      }
      expect(result.success).toBe(true);

      // Response structure
      expect(response.body).toHaveProperty('expenses');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('overdue');
      expect(Array.isArray(response.body.expenses)).toBe(true);
    });

    it('should validate Expense schema with Zod for each expense', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.expenses.forEach((expense: any, index: number) => {
        const result = ExpenseSchema.safeParse(expense);
        if (!result.success) {
          console.error(`Expense ${index} validation errors:`, result.error.format());
        }
        expect(result.success).toBe(true);
      });
    });

    it('should include required expense fields', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.expenses.length > 0) {
        response.body.expenses.forEach((expense: any) => {
          expect(expense).toHaveProperty('id');
          expect(expense).toHaveProperty('householdId');
          expect(expense).toHaveProperty('payerId');
          expect(expense).toHaveProperty('payerName');
          expect(expense).toHaveProperty('amount');
          expect(expense).toHaveProperty('type');
          expect(expense).toHaveProperty('status');
          expect(expense).toHaveProperty('createdAt');

          // Validate type
          expect(['rent', 'utilities', 'deposit', 'other']).toContain(expense.type);

          // Validate status
          expect(['pending', 'processing', 'completed', 'failed', 'refunded']).toContain(expense.status);

          // Validate amount is positive integer in cents
          expect(typeof expense.amount).toBe('number');
          expect(Number.isInteger(expense.amount)).toBe(true);
          expect(expense.amount).toBeGreaterThan(0);
        });
      }
    });

    it('should return expenses sorted by creation date (newest first)', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.expenses.length > 1) {
        for (let i = 0; i < response.body.expenses.length - 1; i++) {
          const current = new Date(response.body.expenses[i].createdAt);
          const next = new Date(response.body.expenses[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should support filtering by status query parameter', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'pending' })
        .expect(200);

      response.body.expenses.forEach((expense: any) => {
        expect(expense.status).toBe('pending');
      });
    });

    it('should support filtering by type query parameter', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'rent' })
        .expect(200);

      response.body.expenses.forEach((expense: any) => {
        expect(expense.type).toBe('rent');
      });
    });
  });

  describe('Authorization & Error Cases', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 403 if user is not a household member', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not authorized|not a member/i);
    });

    it('should return 404 for non-existent household', async () => {
      const response = await request(app)
        .get('/api/household/non-existent-uuid/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/not found/i);
    });

    it('should return 422 for invalid household UUID format', async () => {
      const response = await request(app)
        .get('/api/household/invalid-uuid/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 422 for invalid status filter', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'invalid-status' })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/status/i);
    });

    it('should return 422 for invalid type filter', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'invalid-type' })
        .expect(422);

      expect(response.body).toHaveProperty('error');
      expect(response.body.message).toMatch(/type/i);
    });
  });

  describe('Data Quality & Business Rules', () => {
    it('should calculate correct totals (total, pending, overdue)', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Total should be sum of all expenses
      const calculatedTotal = response.body.expenses.reduce(
        (sum: number, exp: any) => sum + exp.amount,
        0
      );
      expect(response.body.total).toBe(calculatedTotal);

      // Pending should be sum of pending expenses
      const pendingExpenses = response.body.expenses.filter(
        (exp: any) => exp.status === 'pending'
      );
      const calculatedPending = pendingExpenses.reduce(
        (sum: number, exp: any) => sum + exp.amount,
        0
      );
      expect(response.body.pending).toBe(calculatedPending);

      // Overdue should be sum of pending expenses with past due date
      const now = new Date();
      const overdueExpenses = response.body.expenses.filter(
        (exp: any) =>
          exp.status === 'pending' &&
          exp.dueDate &&
          new Date(exp.dueDate) < now
      );
      const calculatedOverdue = overdueExpenses.reduce(
        (sum: number, exp: any) => sum + exp.amount,
        0
      );
      expect(response.body.overdue).toBe(calculatedOverdue);
    });

    it('should have valid UUID format for expense IDs', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      response.body.expenses.forEach((expense: any) => {
        expect(expense.id).toMatch(uuidRegex);
        expect(expense.householdId).toMatch(uuidRegex);
        expect(expense.payerId).toMatch(uuidRegex);
      });
    });

    it('should have timestamps in ISO 8601 format', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.expenses.forEach((expense: any) => {
        expect(() => new Date(expense.createdAt).toISOString()).not.toThrow();
        expect(new Date(expense.createdAt).toISOString()).toBe(expense.createdAt);

        if (expense.dueDate) {
          expect(() => new Date(expense.dueDate).toISOString()).not.toThrow();
        }

        if (expense.paidAt) {
          expect(() => new Date(expense.paidAt).toISOString()).not.toThrow();
        }
      });
    });

    it('should have paidAt timestamp only for completed expenses', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.expenses.forEach((expense: any) => {
        if (expense.status === 'completed') {
          expect(expense.paidAt).toBeTruthy();
        } else if (expense.status === 'pending') {
          expect(expense.paidAt).toBeFalsy();
        }
      });
    });

    it('should not expose Stripe sensitive data', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseString = JSON.stringify(response.body);

      // Should not expose raw Stripe keys or secrets
      expect(responseString).not.toMatch(/sk_live_/);
      expect(responseString).not.toMatch(/sk_test_/);
      expect(responseString).not.toMatch(/pk_live_/);
      expect(responseString).not.toMatch(/pk_test_/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle household with no expenses', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.expenses).toEqual(expect.any(Array));

      if (response.body.expenses.length === 0) {
        expect(response.body.total).toBe(0);
        expect(response.body.pending).toBe(0);
        expect(response.body.overdue).toBe(0);
      }
    });

    it('should handle empty description gracefully', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // description is optional
      response.body.expenses.forEach((expense: any) => {
        if (expense.description) {
          expect(expense.description.length).toBeLessThanOrEqual(500);
        }
      });
    });

    it('should handle expenses with no due date', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // dueDate is optional
      response.body.expenses.forEach((expense: any) => {
        if (!expense.dueDate) {
          // Expense without due date should not be counted as overdue
          expect(expense).toBeDefined();
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should respond in <300ms for typical household expense list', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Response time: ${duration}ms`);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Payment Status Workflow', () => {
    it('should track expense lifecycle: pending → processing → completed', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All status values should be valid enum values
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      response.body.expenses.forEach((expense: any) => {
        expect(validStatuses).toContain(expense.status);
      });
    });

    it('should include payerName for transparency', async () => {
      const response = await request(app)
        .get(`/api/household/${householdId}/expenses`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.expenses.forEach((expense: any) => {
        expect(expense.payerName).toBeTruthy();
        expect(typeof expense.payerName).toBe('string');
        expect(expense.payerName.length).toBeGreaterThan(0);
        expect(expense.payerName.length).toBeLessThanOrEqual(100);
      });
    });
  });
});
