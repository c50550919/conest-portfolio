/**
 * Detox E2E Test Helper - Seed Test Users
 *
 * Purpose: Automatically seed test users before E2E tests run
 * Usage: Import and call seedTestUsers() in test setup
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  city: string;
  state: string;
  zipCode: string;
  childrenCount: number;
  childrenAgeGroups: string[];
}

/**
 * Essential test users for E2E testing
 * Reduced set for faster test execution
 */
const essentialTestUsers: TestUser[] = [
  {
    email: 'sarah.verified@test.com',
    password: 'TestPassword123',
    firstName: 'Sarah',
    lastName: 'Verified',
    phone: '+15555550001',
    dateOfBirth: '1990-05-15',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    childrenCount: 2,
    childrenAgeGroups: ['elementary'],
  },
  {
    email: 'test@conest.com',
    password: 'Test1234',
    firstName: 'Test',
    lastName: 'User',
    phone: '+15555550099',
    dateOfBirth: '1990-01-01',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94601',
    childrenCount: 1,
    childrenAgeGroups: ['elementary'],
  },
];

/**
 * Full discovery test users (20 profiles)
 * Use for comprehensive discovery testing
 */
const discoveryTestUsers: TestUser[] = [
  {
    email: 'sarah.johnson@test.com',
    password: 'Test1234',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+15551000001',
    dateOfBirth: '1988-03-15',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94601',
    childrenCount: 2,
    childrenAgeGroups: ['toddler', 'elementary'],
  },
  {
    email: 'jennifer.lee@test.com',
    password: 'Test1234',
    firstName: 'Jennifer',
    lastName: 'Lee',
    phone: '+15551000002',
    dateOfBirth: '1990-07-22',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    childrenCount: 1,
    childrenAgeGroups: ['elementary'],
  },
  {
    email: 'maria.garcia@test.com',
    password: 'Test1234',
    firstName: 'Maria',
    lastName: 'Garcia',
    phone: '+15551000003',
    dateOfBirth: '1985-11-08',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94602',
    childrenCount: 3,
    childrenAgeGroups: ['toddler', 'elementary', 'teen'],
  },
  // Add more as needed...
];

/**
 * Seed test users via API
 * @param mode 'essential' for 2 users, 'discovery' for 20+ users
 * @returns Summary of seeding operation
 */
export async function seedTestUsers(
  mode: 'essential' | 'discovery' = 'essential'
): Promise<{ created: number; skipped: number; errors: number }> {
  const users = mode === 'essential' ? essentialTestUsers : discoveryTestUsers;

  console.log(`\n🌱 Seeding ${users.length} ${mode} test users...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const response = await axios.post(`${API_BASE}/auth/register`, user, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      if (response.status === 201 || response.data.success) {
        console.log(`✅ Created: ${user.email}`);
        created++;
      }
    } catch (error: any) {
      if (
        error.response?.status === 409 ||
        error.response?.data?.error?.includes('already exists') ||
        error.response?.data?.message?.includes('already exists')
      ) {
        console.log(`⏭️  Skipped: ${user.email} (already exists)`);
        skipped++;
      } else {
        console.error(
          `❌ Error: ${user.email} - ${
            error.response?.data?.error || error.response?.data?.message || error.message
          }`
        );
        errors++;
      }
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log(`\n📊 Seeding Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}\n`);

  return { created, skipped, errors };
}

/**
 * Check if backend is ready
 */
export async function waitForBackend(maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await axios.get(`${API_BASE.replace('/api', '')}/health`, {
        timeout: 2000,
      });
      if (response.status === 200) {
        console.log('✅ Backend is ready');
        return true;
      }
    } catch (error) {
      console.log(`⏳ Waiting for backend... (attempt ${i + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.error('❌ Backend not ready after maximum attempts');
  return false;
}
