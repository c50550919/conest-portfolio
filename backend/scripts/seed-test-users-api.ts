/**
 * Seed Test Users via API
 *
 * Purpose: Create test users programmatically using signup API
 * Avoids bcrypt Docker architecture issues
 *
 * Usage: ts-node backend/scripts/seed-test-users-api.ts
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const testUsers: TestUser[] = [
  {
    email: 'sarah.verified@test.com',
    password: 'TestPassword123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+15551234567',
  },
  {
    email: 'maria.fullverified@test.com',
    password: 'TestPassword123!',
    firstName: 'Maria',
    lastName: 'Garcia',
    phone: '+15551234568',
  },
  {
    email: 'lisa.pending@test.com',
    password: 'TestPassword123!',
    firstName: 'Lisa',
    lastName: 'Chen',
    phone: '+15551234569',
  },
  {
    email: 'jennifer.complete@test.com',
    password: 'TestPassword123!',
    firstName: 'Jennifer',
    lastName: 'Martinez',
    phone: '+15551234570',
  },
  {
    email: 'amanda.new@test.com',
    password: 'TestPassword123!',
    firstName: 'Amanda',
    lastName: 'Wilson',
    phone: '+15551234571',
  },
  {
    email: 'michelle.budget@test.com',
    password: 'TestPassword123!',
    firstName: 'Michelle',
    lastName: 'Brown',
    phone: '+15551234572',
  },
  {
    email: 'patricia.schedule@test.com',
    password: 'TestPassword123!',
    firstName: 'Patricia',
    lastName: 'Davis',
    phone: '+15551234573',
  },
  {
    email: 'karen.lifestyle@test.com',
    password: 'TestPassword123!',
    firstName: 'Karen',
    lastName: 'Anderson',
    phone: '+15551234574',
  },
];

async function seedUsers() {
  console.log(`\n🌱 Seeding ${testUsers.length} test users via API...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of testUsers) {
    try {
      const response = await axios.post(`${API_BASE}/auth/signup`, {
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      });

      if (response.status === 201) {
        console.log(`✅ Created: ${user.email}`);
        created++;
      }
    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        console.log(`⏭️  Skipped: ${user.email} (already exists)`);
        skipped++;
      } else {
        console.error(`❌ Error: ${user.email} - ${error.response?.data?.message || error.message}`);
        errors++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📝 Total: ${testUsers.length}\n`);

  if (created > 0 || skipped === testUsers.length) {
    console.log('✅ All test users ready for testing!');
    console.log('\n🎯 Test Login:');
    console.log('   Email: sarah.verified@test.com');
    console.log('   Password: TestPassword123!\n');
  }
}

seedUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
