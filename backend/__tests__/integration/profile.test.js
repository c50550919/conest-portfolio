"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../../src/server"));
const database_1 = __importDefault(require("../../src/config/database"));
/**
 * Profile Management Integration Tests
 * Tests profile CRUD operations with photo upload simulation
 * CRITICAL: NO child data - only counts and age ranges
 */
describe('Profile Management', () => {
    let authToken;
    let userId;
    beforeAll(async () => {
        await database_1.default.migrate.latest();
    });
    afterAll(async () => {
        await database_1.default.destroy();
    });
    beforeEach(async () => {
        // Clear relevant tables
        await (0, database_1.default)('profiles').del();
        await (0, database_1.default)('users').del();
        // Create and login test user
        const registerRes = await (0, supertest_1.default)(server_1.default)
            .post('/api/auth/register')
            .send({
            email: 'profiletest@test.com',
            password: 'SecurePass123!',
        });
        authToken = registerRes.body.accessToken;
        userId = registerRes.body.user.id;
    });
    describe('POST /api/profiles', () => {
        it('should create a new profile with valid data', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                bio: 'Working mom looking for safe housing',
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
            })
                .expect(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.first_name).toBe('Sarah');
            expect(response.body.children_count).toBe(2);
            expect(response.body.children_ages_range).toBe('5-10');
            // Ensure NO child names or specific details
            expect(response.body).not.toHaveProperty('children_names');
            expect(response.body).not.toHaveProperty('children_details');
        });
        it('should fail without authentication', async () => {
            await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .send({
                first_name: 'Test',
                last_name: 'User',
            })
                .expect(401);
        });
        it('should reject profile with child names (safety check)', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                children_names: ['Tommy', 'Sarah'], // SHOULD BE REJECTED
                children_count: 2,
            })
                .expect(400);
            expect(response.body.error).toContain('child');
        });
        it('should reject profile with child photos (safety check)', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                children_photos: ['photo1.jpg', 'photo2.jpg'], // SHOULD BE REJECTED
                children_count: 2,
            })
                .expect(400);
            expect(response.body.error).toContain('child');
        });
        it('should validate budget range', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                budget_min: 1500,
                budget_max: 1000, // max < min should fail
            })
                .expect(400);
            expect(response.body.error).toContain('budget');
        });
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                // Missing required fields
                bio: 'Test bio',
            })
                .expect(400);
            expect(response.body.error).toBeTruthy();
        });
    });
    describe('GET /api/profiles/:id', () => {
        let profileId;
        beforeEach(async () => {
            const createRes = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                bio: 'Working mom',
                location_city: 'Austin',
                location_state: 'TX',
                location_zip: '78701',
                children_count: 2,
                children_ages_range: '5-10',
                budget_min: 800,
                budget_max: 1200,
            });
            profileId = createRes.body.id;
        });
        it('should retrieve profile by ID', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get(`/api/profiles/${profileId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.id).toBe(profileId);
            expect(response.body.first_name).toBe('Sarah');
        });
        it('should return 404 for non-existent profile', async () => {
            await (0, supertest_1.default)(server_1.default)
                .get('/api/profiles/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });
    describe('PUT /api/profiles/:id', () => {
        let profileId;
        beforeEach(async () => {
            const createRes = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                bio: 'Working mom',
                location_city: 'Austin',
                location_state: 'TX',
                location_zip: '78701',
                children_count: 2,
                children_ages_range: '5-10',
                budget_min: 800,
                budget_max: 1200,
            });
            profileId = createRes.body.id;
        });
        it('should update profile successfully', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .put(`/api/profiles/${profileId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                bio: 'Updated bio - experienced single parent',
                budget_max: 1500,
            })
                .expect(200);
            expect(response.body.bio).toContain('Updated bio');
            expect(response.body.budget_max).toBe(1500);
        });
        it('should not allow updating to include child data', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .put(`/api/profiles/${profileId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                children_names: ['Tommy'], // SHOULD BE REJECTED
            })
                .expect(400);
            expect(response.body.error).toContain('child');
        });
        it('should prevent unauthorized profile updates', async () => {
            // Create another user
            const otherUser = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/register')
                .send({
                email: 'other@test.com',
                password: 'SecurePass123!',
            });
            await (0, supertest_1.default)(server_1.default)
                .put(`/api/profiles/${profileId}`)
                .set('Authorization', `Bearer ${otherUser.body.accessToken}`)
                .send({
                bio: 'Trying to update someone else\'s profile',
            })
                .expect(403);
        });
    });
    describe('DELETE /api/profiles/:id', () => {
        let profileId;
        beforeEach(async () => {
            const createRes = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                bio: 'Working mom',
                location_city: 'Austin',
                location_state: 'TX',
                location_zip: '78701',
                children_count: 2,
                children_ages_range: '5-10',
                budget_min: 800,
                budget_max: 1200,
            });
            profileId = createRes.body.id;
        });
        it('should delete profile successfully', async () => {
            await (0, supertest_1.default)(server_1.default)
                .delete(`/api/profiles/${profileId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            // Verify deletion
            await (0, supertest_1.default)(server_1.default)
                .get(`/api/profiles/${profileId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
        it('should prevent unauthorized profile deletion', async () => {
            const otherUser = await (0, supertest_1.default)(server_1.default)
                .post('/api/auth/register')
                .send({
                email: 'other@test.com',
                password: 'SecurePass123!',
            });
            await (0, supertest_1.default)(server_1.default)
                .delete(`/api/profiles/${profileId}`)
                .set('Authorization', `Bearer ${otherUser.body.accessToken}`)
                .expect(403);
        });
    });
    describe('POST /api/profiles/:id/photo', () => {
        let profileId;
        beforeEach(async () => {
            const createRes = await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                bio: 'Working mom',
                location_city: 'Austin',
                location_state: 'TX',
                location_zip: '78701',
                children_count: 2,
                children_ages_range: '5-10',
                budget_min: 800,
                budget_max: 1200,
            });
            profileId = createRes.body.id;
        });
        it('should upload profile photo successfully (simulation)', async () => {
            // Simulate file upload
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/profiles/${profileId}/photo`)
                .set('Authorization', `Bearer ${authToken}`)
                .attach('photo', Buffer.from('fake-image-data'), 'profile.jpg')
                .expect(200);
            expect(response.body).toHaveProperty('photo_url');
        });
        it('should reject child photos in profile upload', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .post(`/api/profiles/${profileId}/photo`)
                .set('Authorization', `Bearer ${authToken}`)
                .field('photo_type', 'child') // Should be rejected
                .attach('photo', Buffer.from('fake-image-data'), 'child.jpg')
                .expect(400);
            expect(response.body.error).toContain('child');
        });
    });
    describe('GET /api/profiles/search', () => {
        beforeEach(async () => {
            // Create multiple profiles for search testing
            await (0, supertest_1.default)(server_1.default)
                .post('/api/profiles')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                first_name: 'Sarah',
                last_name: 'Johnson',
                bio: 'Working mom',
                location_city: 'Austin',
                location_state: 'TX',
                location_zip: '78701',
                children_count: 2,
                children_ages_range: '5-10',
                budget_min: 800,
                budget_max: 1200,
            });
        });
        it('should search profiles by location', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/profiles/search')
                .query({ city: 'Austin', state: 'TX' })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });
        it('should search profiles by budget range', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/profiles/search')
                .query({ budget_min: 700, budget_max: 1300 })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
        it('should not expose sensitive data in search results', async () => {
            const response = await (0, supertest_1.default)(server_1.default)
                .get('/api/profiles/search')
                .query({ city: 'Austin' })
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            response.body.forEach((profile) => {
                // Verify NO child names or photos
                expect(profile).not.toHaveProperty('children_names');
                expect(profile).not.toHaveProperty('children_photos');
                expect(profile).not.toHaveProperty('children_details');
                // Should have counts and ranges only
                expect(profile).toHaveProperty('children_count');
                expect(profile).toHaveProperty('children_ages_range');
            });
        });
    });
});
//# sourceMappingURL=profile.test.js.map