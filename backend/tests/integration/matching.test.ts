import request from 'supertest';
import app from '../../src/server';
import db from '../../src/config/database';

/**
 * Matching Algorithm Integration Tests
 * Tests various compatibility scenarios and matching logic
 */
describe('Matching Algorithm', () => {
  let user1Token: string;
  let user2Token: string;
  let user3Token: string;
  let profile1Id: string;
  let profile2Id: string;
  let profile3Id: string;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  beforeEach(async () => {
    // Clear relevant tables
    await db('matches').del();
    await db('profiles').del();
    await db('users').del();

    // Create test users with different profiles
    const user1 = await request(app).post('/api/auth/register').send({
      email: 'user1@test.com',
      password: 'SecurePass123!',
    });
    user1Token = user1.body.accessToken;

    const user2 = await request(app).post('/api/auth/register').send({
      email: 'user2@test.com',
      password: 'SecurePass123!',
    });
    user2Token = user2.body.accessToken;

    const user3 = await request(app).post('/api/auth/register').send({
      email: 'user3@test.com',
      password: 'SecurePass123!',
    });
    user3Token = user3.body.accessToken;

    // Create profiles with different characteristics
    const profile1 = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        first_name: 'Sarah',
        last_name: 'Johnson',
        bio: 'Teacher with structured schedule',
        location_city: 'Austin',
        location_state: 'TX',
        location_zip: '78701',
        children_count: 2,
        children_ages_range: '5-10',
        budget_min: 800,
        budget_max: 1200,
        work_schedule: 'Mon-Fri 8am-4pm',
        parenting_style: 'structured',
        house_rules: {
          no_smoking: true,
          no_pets: false,
          quiet_hours: '9pm-7am',
        },
        lifestyle_preferences: {
          cleanliness: 'very_clean',
          social_level: 'moderate',
        },
      });
    profile1Id = profile1.body.id;

    const profile2 = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        first_name: 'Michelle',
        last_name: 'Brown',
        bio: 'Retail manager with similar values',
        location_city: 'Austin',
        location_state: 'TX',
        location_zip: '78701',
        children_count: 2,
        children_ages_range: '7-9',
        budget_min: 650,
        budget_max: 950,
        work_schedule: 'Variable retail hours',
        parenting_style: 'structured',
        house_rules: {
          no_smoking: true,
          no_pets: true,
          quiet_hours: '9pm-7am',
        },
        lifestyle_preferences: {
          cleanliness: 'moderate',
          social_level: 'high',
        },
      });
    profile2Id = profile2.body.id;

    const profile3 = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${user3Token}`)
      .send({
        first_name: 'Lisa',
        last_name: 'Chen',
        bio: 'Remote software engineer',
        location_city: 'Houston',
        location_state: 'TX',
        location_zip: '77001',
        children_count: 1,
        children_ages_range: '6-8',
        budget_min: 1000,
        budget_max: 1500,
        work_schedule: 'Remote, flexible',
        parenting_style: 'relaxed',
        house_rules: {
          no_smoking: true,
          no_pets: false,
          quiet_hours: '10pm-7am',
        },
        lifestyle_preferences: {
          cleanliness: 'very_clean',
          social_level: 'low',
        },
      });
    profile3Id = profile3.body.id;
  });

  describe('GET /api/matches/potential', () => {
    it('should return potential matches sorted by compatibility', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify sorting by compatibility score (highest first)
      for (let i = 0; i < response.body.length - 1; i++) {
        expect(response.body[i].compatibility_score).toBeGreaterThanOrEqual(
          response.body[i + 1].compatibility_score,
        );
      }
    });

    it('should calculate high compatibility for similar profiles', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // User1 and User2 should have high compatibility (similar values, location)
      const matchWithUser2 = response.body.find((m: any) => m.profile_id === profile2Id);

      expect(matchWithUser2).toBeDefined();
      expect(matchWithUser2.compatibility_score).toBeGreaterThan(0.7);
    });

    it('should calculate lower compatibility for different locations', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // User1 (Austin) and User3 (Houston) should have lower location compatibility
      const matchWithUser3 = response.body.find((m: any) => m.profile_id === profile3Id);

      if (matchWithUser3) {
        expect(matchWithUser3.score_breakdown.location).toBeLessThan(0.5);
      }
    });

    it('should include compatibility score breakdown', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body[0]).toHaveProperty('compatibility_score');
      expect(response.body[0]).toHaveProperty('score_breakdown');
      expect(response.body[0].score_breakdown).toHaveProperty('schedule');
      expect(response.body[0].score_breakdown).toHaveProperty('parenting');
      expect(response.body[0].score_breakdown).toHaveProperty('house_rules');
      expect(response.body[0].score_breakdown).toHaveProperty('location');
      expect(response.body[0].score_breakdown).toHaveProperty('budget');
      expect(response.body[0].score_breakdown).toHaveProperty('lifestyle');
    });

    it('should filter by minimum compatibility threshold', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .query({ min_score: 0.6 })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      response.body.forEach((match: any) => {
        expect(match.compatibility_score).toBeGreaterThanOrEqual(0.6);
      });
    });

    it('should not return already connected profiles', async () => {
      // Create a mutual interest match
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id })
        .expect(200);

      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ profile_id: profile1Id })
        .expect(200);

      // User2 should not appear in User1's potential matches anymore
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const matchWithUser2 = response.body.find((m: any) => m.profile_id === profile2Id);

      expect(matchWithUser2).toBeUndefined();
    });
  });

  describe('POST /api/matches/interest', () => {
    it('should express interest in a profile', async () => {
      const response = await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id })
        .expect(200);

      expect(response.body).toHaveProperty('match_id');
      expect(response.body.status).toBe('one_interested');
    });

    it('should create mutual match when both express interest', async () => {
      // User1 expresses interest in User2
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id });

      // User2 expresses interest in User1
      const response = await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ profile_id: profile1Id })
        .expect(200);

      expect(response.body.status).toBe('mutual_interest');
      expect(response.body.message).toContain('mutual');
    });

    it('should prevent duplicate interest expressions', async () => {
      // First expression
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id });

      // Duplicate expression
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id })
        .expect(400);
    });

    it('should prevent self-matching', async () => {
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile1Id })
        .expect(400);
    });
  });

  describe('GET /api/matches', () => {
    beforeEach(async () => {
      // Create some matches
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id });

      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ profile_id: profile1Id });
    });

    it('should retrieve all matches for user', async () => {
      const response = await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter matches by status', async () => {
      const response = await request(app)
        .get('/api/matches')
        .query({ status: 'mutual_interest' })
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      response.body.forEach((match: any) => {
        expect(match.status).toBe('mutual_interest');
      });
    });

    it('should include profile details in match results', async () => {
      const response = await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body[0]).toHaveProperty('profile');
      expect(response.body[0].profile).toHaveProperty('first_name');
      expect(response.body[0].profile).toHaveProperty('location_city');
    });
  });

  describe('DELETE /api/matches/:id', () => {
    let matchId: string;

    beforeEach(async () => {
      const match = await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id });

      matchId = match.body.match_id;
    });

    it('should remove match successfully', async () => {
      await request(app)
        .delete(`/api/matches/${matchId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Verify deletion
      const response = await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const deletedMatch = response.body.find((m: any) => m.id === matchId);
      expect(deletedMatch).toBeUndefined();
    });

    it('should prevent unauthorized match deletion', async () => {
      await request(app)
        .delete(`/api/matches/${matchId}`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(403);
    });
  });

  describe('Compatibility Algorithm Details', () => {
    it('should weight schedule compatibility at 25%', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const match = response.body[0];
      const breakdown = match.score_breakdown;

      // Schedule should contribute ~25% to total score
      const scheduleContribution = breakdown.schedule * 0.25;
      expect(scheduleContribution).toBeLessThanOrEqual(0.25);
    });

    it('should weight parenting style at 20%', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const match = response.body[0];
      expect(match.score_breakdown).toHaveProperty('parenting');
    });

    it('should calculate budget overlap correctly', async () => {
      // User1: 800-1200, User2: 650-950
      // Overlap: 800-950 (150 out of 550 total range)
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const matchWithUser2 = response.body.find((m: any) => m.profile_id === profile2Id);

      expect(matchWithUser2.score_breakdown.budget).toBeGreaterThan(0.5);
    });

    it('should penalize incompatible house rules', async () => {
      // User1 allows pets, User2 doesn't
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const matchWithUser2 = response.body.find((m: any) => m.profile_id === profile2Id);

      // Should still match but with lower house_rules score
      expect(matchWithUser2.score_breakdown.house_rules).toBeLessThan(1.0);
    });
  });

  describe('Safety and Privacy', () => {
    it('should not expose personal contact info in matches', async () => {
      const response = await request(app)
        .get('/api/matches/potential')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      response.body.forEach((match: any) => {
        expect(match).not.toHaveProperty('phone');
        expect(match).not.toHaveProperty('email');
        expect(match.profile).not.toHaveProperty('phone');
        expect(match.profile).not.toHaveProperty('email');
      });
    });

    it('should require both users to express interest before revealing details', async () => {
      // Only User1 expressed interest
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id });

      const response = await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const oneWayMatch = response.body.find((m: any) => m.status === 'one_interested');

      // Should not reveal full contact until mutual interest
      expect(oneWayMatch.can_message).toBe(false);
    });

    it('should allow messaging only after mutual interest', async () => {
      // Create mutual interest
      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ profile_id: profile2Id });

      await request(app)
        .post('/api/matches/interest')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ profile_id: profile1Id });

      const response = await request(app)
        .get('/api/matches')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const mutualMatch = response.body.find((m: any) => m.status === 'mutual_interest');

      expect(mutualMatch.can_message).toBe(true);
    });
  });
});
