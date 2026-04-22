/**
 * T032: Integration Test - Household Creation Flow
 *
 * Tests the complete household creation workflow:
 * 1. Create household
 * 2. Add member to household
 * 3. Fetch members list
 * 4. Verify household state
 *
 * **CRITICAL CHILD SAFETY**: NO child PII in any household data
 */

import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/config/database';

describe('Household Creation Flow - Integration Tests', () => {
  let adminToken: string;
  let adminUserId: string;
  let memberUserId: string;
  let householdId: string;

  beforeAll(async () => {
    // Setup test data
    adminUserId = 'admin-user-integration-test';
    memberUserId = 'member-user-integration-test';
    adminToken = 'mock-jwt-token-admin';
  });

  afterAll(async () => {
    // Cleanup test data
    await db('household_members').where({ household_id: householdId }).del();
    await db('households').where({ id: householdId }).del();
    await db.destroy();
  });

  describe('Complete Household Creation Workflow', () => {
    it('should create household → add member → fetch members successfully', async () => {
      // STEP 1: Create household
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test CoNest Home',
          address: '123 Main Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          monthlyRent: 300000, // $3,000.00 in cents
          leaseStartDate: '2025-11-01',
          leaseEndDate: '2026-10-31',
        })
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body).toHaveProperty('name', 'Test CoNest Home');
      expect(createResponse.body).toHaveProperty('status', 'active');

      householdId = createResponse.body.id;

      // STEP 2: Add member to household
      const addMemberResponse = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberUserId,
          rentShare: 150000, // $1,500.00 in cents
          role: 'member',
        })
        .expect(201);

      expect(addMemberResponse.body).toHaveProperty('id');
      expect(addMemberResponse.body).toHaveProperty('householdId', householdId);
      expect(addMemberResponse.body).toHaveProperty('userId', memberUserId);
      expect(addMemberResponse.body).toHaveProperty('rentShare', 150000);
      expect(addMemberResponse.body).toHaveProperty('role', 'member');
      expect(addMemberResponse.body).toHaveProperty('status', 'active');

      // STEP 3: Fetch household members
      const getMembersResponse = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getMembersResponse.body).toHaveProperty('members');
      expect(Array.isArray(getMembersResponse.body.members)).toBe(true);
      expect(getMembersResponse.body.members.length).toBeGreaterThanOrEqual(1);

      // Verify newly added member is in the list
      const addedMember = getMembersResponse.body.members.find(
        (m: any) => m.userId === memberUserId
      );
      expect(addedMember).toBeDefined();
      expect(addedMember.rentShare).toBe(150000);
      expect(addedMember.role).toBe('member');
      expect(addedMember.status).toBe('active');

      // STEP 4: Verify household state
      const getHouseholdResponse = await request(app)
        .get(`/api/household/${householdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getHouseholdResponse.body).toHaveProperty('id', householdId);
      expect(getHouseholdResponse.body).toHaveProperty('name', 'Test CoNest Home');
      expect(getHouseholdResponse.body).toHaveProperty('status', 'active');
      expect(getHouseholdResponse.body).toHaveProperty('monthlyRent', 300000);
    });

    it('should enforce child safety: NO child PII in household or member data', async () => {
      // Create household with potential child PII (should be rejected or stripped)
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test CoNest Home 2',
          address: '456 Oak Avenue',
          city: 'Oakland',
          state: 'CA',
          zipCode: '94601',
          monthlyRent: 280000,
        })
        .expect(201);

      householdId = createResponse.body.id;

      // Verify NO child PII in household response
      const responseString = JSON.stringify(createResponse.body);
      expect(responseString).not.toMatch(/childName|childPhoto|childSchool|childAge/i);

      // Add member
      await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberUserId,
          rentShare: 140000,
        })
        .expect(201);

      // Fetch members and verify NO child PII
      const getMembersResponse = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const membersString = JSON.stringify(getMembersResponse.body);
      expect(membersString).not.toMatch(/childName|childPhoto|childSchool|childAge/i);

      getMembersResponse.body.members.forEach((member: any) => {
        expect(member).not.toHaveProperty('childrenNames');
        expect(member).not.toHaveProperty('childrenPhotos');
        expect(member).not.toHaveProperty('childrenAges');
        expect(member).not.toHaveProperty('childrenSchools');
      });
    });
  });

  describe('Multi-Member Household Flow', () => {
    it('should create household with multiple members and verify rent split', async () => {
      // Create household
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Multi-Member Test Home',
          address: '789 Pine Street',
          city: 'Berkeley',
          state: 'CA',
          zipCode: '94704',
          monthlyRent: 360000, // $3,600.00
        })
        .expect(201);

      householdId = createResponse.body.id;

      // Add first member (admin role)
      const member1Response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'member-1-uuid',
          rentShare: 180000, // $1,800.00
          role: 'admin',
        })
        .expect(201);

      expect(member1Response.body.role).toBe('admin');

      // Add second member (regular member)
      const member2Response = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'member-2-uuid',
          rentShare: 180000, // $1,800.00
          role: 'member',
        })
        .expect(201);

      expect(member2Response.body.role).toBe('member');

      // Fetch all members
      const getMembersResponse = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getMembersResponse.body.members.length).toBe(2);

      // Verify rent split totals
      const totalRentShare = getMembersResponse.body.members.reduce(
        (sum: number, member: any) => sum + member.rentShare,
        0
      );
      expect(totalRentShare).toBe(360000); // Should equal total rent

      // Verify at least one admin exists
      const adminMembers = getMembersResponse.body.members.filter(
        (m: any) => m.role === 'admin'
      );
      expect(adminMembers.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Authorization Enforcement in Flow', () => {
    it('should prevent non-admin from adding members', async () => {
      const nonAdminToken = 'mock-jwt-token-non-admin-member';

      // Create household as admin
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Auth Test Home',
          address: '321 Elm Street',
          city: 'Fremont',
          state: 'CA',
          zipCode: '94536',
          monthlyRent: 250000,
        })
        .expect(201);

      householdId = createResponse.body.id;

      // Try to add member as non-admin (should fail)
      const addMemberResponse = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${nonAdminToken}`)
        .send({
          userId: 'new-member-uuid',
          rentShare: 125000,
        })
        .expect(403);

      expect(addMemberResponse.body).toHaveProperty('error');
      expect(addMemberResponse.body.error).toMatch(/not authorized|admin only/i);
    });

    it('should prevent non-member from viewing household members', async () => {
      const nonMemberToken = 'mock-jwt-token-external-user';

      // Create household
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Privacy Test Home',
          address: '555 Cedar Lane',
          city: 'Palo Alto',
          state: 'CA',
          zipCode: '94301',
          monthlyRent: 400000,
        })
        .expect(201);

      householdId = createResponse.body.id;

      // Try to view members as non-member (should fail)
      const getMembersResponse = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(getMembersResponse.body).toHaveProperty('error');
      expect(getMembersResponse.body.error).toMatch(/not authorized|not a member/i);
    });
  });

  describe('Duplicate Member Prevention', () => {
    it('should prevent adding same user twice to household', async () => {
      const duplicateUserId = 'duplicate-user-test';

      // Create household
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate Test Home',
          address: '999 Birch Avenue',
          city: 'Mountain View',
          state: 'CA',
          zipCode: '94040',
          monthlyRent: 320000,
        })
        .expect(201);

      householdId = createResponse.body.id;

      // Add member first time (should succeed)
      await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: duplicateUserId,
          rentShare: 160000,
        })
        .expect(201);

      // Try to add same user again (should fail)
      const secondAddResponse = await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: duplicateUserId,
          rentShare: 160000,
        })
        .expect(400);

      expect(secondAddResponse.body).toHaveProperty('error');
      expect(secondAddResponse.body.error).toMatch(/already.*member|duplicate/i);
    });
  });

  describe('Data Consistency Across Operations', () => {
    it('should maintain consistent household data across create → update → fetch', async () => {
      // Create household
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Consistency Test Home',
          address: '777 Maple Drive',
          city: 'Sunnyvale',
          state: 'CA',
          zipCode: '94086',
          monthlyRent: 350000,
          leaseStartDate: '2025-12-01',
        })
        .expect(201);

      householdId = createResponse.body.id;
      expect(createResponse.body.monthlyRent).toBe(350000);

      // Add member
      await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberUserId,
          rentShare: 175000,
        })
        .expect(201);

      // Fetch household details
      const getHouseholdResponse = await request(app)
        .get(`/api/household/${householdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify data consistency
      expect(getHouseholdResponse.body.id).toBe(householdId);
      expect(getHouseholdResponse.body.monthlyRent).toBe(350000);
      expect(getHouseholdResponse.body.leaseStartDate).toContain('2025-12-01');

      // Fetch members
      const getMembersResponse = await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const member = getMembersResponse.body.members.find(
        (m: any) => m.userId === memberUserId
      );
      expect(member).toBeDefined();
      expect(member.householdId).toBe(householdId);
      expect(member.rentShare).toBe(175000);
    });
  });

  describe('Performance Integration', () => {
    it('should complete entire household creation flow in <1 second', async () => {
      const start = Date.now();

      // Create household
      const createResponse = await request(app)
        .post('/api/household')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Performance Test Home',
          address: '888 Willow Court',
          city: 'Cupertino',
          state: 'CA',
          zipCode: '95014',
          monthlyRent: 380000,
        })
        .expect(201);

      householdId = createResponse.body.id;

      // Add member
      await request(app)
        .post(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: memberUserId,
          rentShare: 190000,
        })
        .expect(201);

      // Fetch members
      await request(app)
        .get(`/api/household/${householdId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const duration = Date.now() - start;
      console.log(`Total flow duration: ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });
  });
});
