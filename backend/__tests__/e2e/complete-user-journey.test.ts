import request from 'supertest';
import app from '../../src/server';
import db from '../../src/config/database';

/**
 * End-to-End User Journey Test
 * Complete flow: Register → Verify → Create Profile → Find Matches → Message → Form Household
 */
describe('Complete User Journey - E2E', () => {
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let profile1Id: string;
  let profile2Id: string;
  let matchId: string;
  let conversationId: string;
  let householdId: string;

  beforeAll(async () => {
    await db.migrate.latest();
    // Clear all tables
    await db('payments').del();
    await db('household_members').del();
    await db('households').del();
    await db('messages').del();
    await db('conversations').del();
    await db('matches').del();
    await db('verifications').del();
    await db('profiles').del();
    await db('users').del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe('Step 1: User Registration', () => {
    it('should register two users successfully', async () => {
      // Register User 1
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sarah.journey@test.com',
          password: 'SecurePass123!',
          phone: '+15551111111',
        })
        .expect(201);

      user1Token = user1Response.body.accessToken;
      user1Id = user1Response.body.user.id;

      expect(user1Response.body.user.email).toBe('sarah.journey@test.com');

      // Register User 2
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'michelle.journey@test.com',
          password: 'SecurePass123!',
          phone: '+15552222222',
        })
        .expect(201);

      user2Token = user2Response.body.accessToken;
      user2Id = user2Response.body.user.id;

      expect(user2Response.body.user.email).toBe('michelle.journey@test.com');
    });
  });

  describe('Step 2: Email and Phone Verification', () => {
    it('should send email verification', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email/send')
        .send({ userId: user1Id })
        .expect(200);

      expect(response.body.message).toContain('sent');
    });

    it('should send phone verification', async () => {
      const response = await request(app)
        .post('/api/auth/verify-phone/send')
        .send({ userId: user1Id })
        .expect(200);

      expect(response.body.message).toContain('sent');
    });

    // Note: In real scenario, we'd verify with actual codes
    // For E2E testing, we'll assume verification is complete
  });

  describe('Step 3: Create Profiles', () => {
    it('should create profile for User 1', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          first_name: 'Sarah',
          last_name: 'Johnson',
          bio: 'Working teacher looking for stable housing with another parent',
          location_city: 'Austin',
          location_state: 'TX',
          location_zip: '78701',
          children_count: 2,
          children_ages_range: '5-10',
          budget_min: 800,
          budget_max: 1200,
          preferred_move_date: new Date('2025-03-01'),
          work_schedule: 'Mon-Fri 8am-4pm',
          parenting_style: 'structured',
          house_rules: {
            no_smoking: true,
            no_pets: false,
            quiet_hours: '9pm-7am',
            guest_policy: 'weekends_only',
          },
          lifestyle_preferences: {
            cleanliness: 'very_clean',
            social_level: 'moderate',
            dietary: 'omnivore',
          },
        })
        .expect(201);

      profile1Id = response.body.id;
      expect(response.body.first_name).toBe('Sarah');
    });

    it('should create profile for User 2', async () => {
      const response = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          first_name: 'Michelle',
          last_name: 'Brown',
          bio: 'Retail manager seeking affordable housing with compatible roommate',
          location_city: 'Austin',
          location_state: 'TX',
          location_zip: '78701',
          children_count: 2,
          children_ages_range: '7-9',
          budget_min: 650,
          budget_max: 950,
          preferred_move_date: new Date('2025-03-01'),
          work_schedule: 'Variable retail hours',
          parenting_style: 'structured',
          house_rules: {
            no_smoking: true,
            no_pets: true,
            quiet_hours: '9pm-7am',
            guest_policy: 'ask_first',
          },
          lifestyle_preferences: {
            cleanliness: 'moderate',
            social_level: 'high',
            dietary: 'omnivore',
          },
        })
        .expect(201);

      profile2Id = response.body.id;
      expect(response.body.first_name).toBe('Michelle');
    });
  });

  describe('Step 4: Find Matches', () => {
    it('User 1 should find User 2 as potential match', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      const matchWithUser2 = response.body.find(
        (m: any) => m.profile_id === profile2Id
      );

      expect(matchWithUser2).toBeDefined();
      expect(matchWithUser2.compatibility_score).toBeGreaterThan(0.7);
    });

    it('User 2 should find User 1 as potential match', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      const matchWithUser1 = response.body.find(
        (m: any) => m.profile_id === profile1Id
      );

      expect(matchWithUser1).toBeDefined();
      expect(matchWithUser1.compatibility_score).toBeGreaterThan(0.7);
    });
  });

  describe('Step 5: Express Mutual Interest', () => {
    it('User 1 expresses interest in User 2', async () => {
      const response = await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id })
        .expect(200);

      expect(response.body.status).toBe('one_interested');
    });

    it('User 2 expresses interest in User 1 (creates mutual match)', async () => {
      const response = await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ profile_id: profile1Id })
        .expect(200);

      matchId = response.body.match_id;
      expect(response.body.status).toBe('mutual_interest');
    });
  });

  describe('Step 6: Start Messaging', () => {
    it('should create conversation after mutual interest', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participant_id: user2Id })
        .expect(201);

      conversationId = response.body.id;
      expect(response.body.participants).toContain(user1Id);
      expect(response.body.participants).toContain(user2Id);
    });

    it('User 1 sends first message', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: "Hi Michelle! I saw your profile and we seem like a great match. Would you like to discuss housing options?",
        })
        .expect(201);

      expect(response.body.content).toBeTruthy();
      expect(response.body.sender_id).toBe(user1Id);
    });

    it('User 2 responds to message', async () => {
      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: "Hi Sarah! Yes, I'd love to chat more. Your work schedule seems to align well with mine!",
        })
        .expect(201);

      expect(response.body.sender_id).toBe(user2Id);
    });

    it('should retrieve message history', async () => {
      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('Step 7: Form Household', () => {
    it('User 1 creates household', async () => {
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Sunshine House',
          address_street: '123 Oak Avenue',
          address_city: 'Austin',
          address_state: 'TX',
          address_zip: '78701',
          monthly_rent: 2000,
          bedrooms: 3,
          bathrooms: 2,
          lease_start_date: new Date('2025-03-01'),
          lease_end_date: new Date('2026-03-01'),
          house_rules: {
            no_smoking: true,
            no_pets: false,
            quiet_hours: '9pm-7am',
            shared_expenses: true,
          },
        })
        .expect(201);

      householdId = response.body.id;
      expect(response.body.name).toBe('Sunshine House');
      expect(response.body.created_by).toBe(user1Id);
    });

    it('User 1 invites User 2 to household', async () => {
      const response = await request(app)
        .post(`/api/households/${householdId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          user_id: user2Id,
          role: 'member',
          rent_share: 1000,
        })
        .expect(201);

      expect(response.body.status).toBe('invited');
      expect(response.body.user_id).toBe(user2Id);
    });

    it('User 2 accepts household invitation', async () => {
      const response = await request(app)
        .put(`/api/households/${householdId}/members/${user2Id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ status: 'active' })
        .expect(200);

      expect(response.body.status).toBe('active');
    });

    it('should retrieve household with members', async () => {
      const response = await request(app)
        .get(`/api/households/${householdId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.members.length).toBe(2);
    });
  });

  describe('Step 8: Payment Processing', () => {
    it('User 1 pays rent', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          household_id: householdId,
          amount: 1000,
          payment_type: 'rent',
          description: 'March 2025 rent',
          payment_method: 'stripe_test_token',
        })
        .expect(201);

      expect(response.body.amount).toBe(1000);
      expect(response.body.status).toBe('completed');
    });

    it('User 2 pays rent', async () => {
      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          household_id: householdId,
          amount: 1000,
          payment_type: 'rent',
          description: 'March 2025 rent',
          payment_method: 'stripe_test_token',
        })
        .expect(201);

      expect(response.body.status).toBe('completed');
    });

    it('should retrieve payment history', async () => {
      const response = await request(app)
        .get(`/api/households/${householdId}/payments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('Complete Journey Summary', () => {
    it('should have completed full lifecycle successfully', async () => {
      // Verify users exist
      const users = await db('users').whereIn('id', [user1Id, user2Id]);
      expect(users.length).toBe(2);

      // Verify profiles exist
      const profiles = await db('profiles').whereIn('id', [profile1Id, profile2Id]);
      expect(profiles.length).toBe(2);

      // Verify mutual match exists
      const match = await db('matches').where({ id: matchId }).first();
      expect(match.status).toBe('mutual_interest');

      // Verify conversation exists
      const conversation = await db('conversations')
        .where({ id: conversationId })
        .first();
      expect(conversation).toBeDefined();

      // Verify household exists with 2 members
      const household = await db('households').where({ id: householdId }).first();
      expect(household).toBeDefined();

      const members = await db('household_members')
        .where({ household_id: householdId, status: 'active' });
      expect(members.length).toBe(2);

      // Verify payments exist
      const payments = await db('payments')
        .where({ household_id: householdId, status: 'completed' });
      expect(payments.length).toBe(2);

      console.log('✅ Complete user journey test passed successfully!');
    });
  });
});
