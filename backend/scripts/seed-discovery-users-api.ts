/**
 * Seed Discovery Test Users via API
 *
 * Purpose: Create 20+ discovery test users via registration API
 * Source: Extracted from backend/src/seeds/001_test_discovery_profiles.ts
 *
 * Usage: ts-node backend/scripts/seed-discovery-users-api.ts
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

// Convert "toddler,elementary,teen" to ["toddler", "elementary", "teen"]
function parseAgeGroups(ageString: string): string[] {
  return ageString.split(',').map(s => s.trim());
}

const testUsers: TestUser[] = [
  {
    email: 'sarah.johnson@test.com',
    password: 'Test1234!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+15551000001',
    dateOfBirth: '1988-03-15',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94601',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('toddler,elementary'),
  },
  {
    email: 'jennifer.lee@test.com',
    password: 'Test1234!',
    firstName: 'Jennifer',
    lastName: 'Lee',
    phone: '+15551000002',
    dateOfBirth: '1990-07-22',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('elementary'),
  },
  {
    email: 'maria.garcia@test.com',
    password: 'Test1234!',
    firstName: 'Maria',
    lastName: 'Garcia',
    phone: '+15551000003',
    dateOfBirth: '1985-11-08',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94602',
    childrenCount: 3,
    childrenAgeGroups: parseAgeGroups('toddler,elementary,teen'),
  },
  {
    email: 'amanda.wilson@test.com',
    password: 'Test1234!',
    firstName: 'Amanda',
    lastName: 'Wilson',
    phone: '+15551000004',
    dateOfBirth: '1987-05-19',
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94704',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('teen'),
  },
  {
    email: 'lisa.martinez@test.com',
    password: 'Test1234!',
    firstName: 'Lisa',
    lastName: 'Martinez',
    phone: '+15551000005',
    dateOfBirth: '1989-09-12',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94603',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('toddler,elementary'),
  },
  {
    email: 'rachel.brown@test.com',
    password: 'Test1234!',
    firstName: 'Rachel',
    lastName: 'Brown',
    phone: '+15551000006',
    dateOfBirth: '1986-02-28',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94103',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('elementary,teen'),
  },
  {
    email: 'emily.davis@test.com',
    password: 'Test1234!',
    firstName: 'Emily',
    lastName: 'Davis',
    phone: '+15551000007',
    dateOfBirth: '1991-06-14',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94618',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('elementary'),
  },
  {
    email: 'nicole.anderson@test.com',
    password: 'Test1234!',
    firstName: 'Nicole',
    lastName: 'Anderson',
    phone: '+15551000008',
    dateOfBirth: '1984-10-05',
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94705',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('teen'),
  },
  {
    email: 'michelle.thomas@test.com',
    password: 'Test1234!',
    firstName: 'Michelle',
    lastName: 'Thomas',
    phone: '+15551000009',
    dateOfBirth: '1992-01-30',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94104',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('toddler'),
  },
  {
    email: 'jessica.taylor@test.com',
    password: 'Test1234!',
    firstName: 'Jessica',
    lastName: 'Taylor',
    phone: '+15551000010',
    dateOfBirth: '1988-04-17',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94621',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('toddler,elementary'),
  },
  {
    email: 'angela.moore@test.com',
    password: 'Test1234!',
    firstName: 'Angela',
    lastName: 'Moore',
    phone: '+15551000011',
    dateOfBirth: '1987-08-23',
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94706',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('elementary'),
  },
  {
    email: 'stephanie.jackson@test.com',
    password: 'Test1234!',
    firstName: 'Stephanie',
    lastName: 'Jackson',
    phone: '+15551000012',
    dateOfBirth: '1989-12-11',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94606',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('elementary,teen'),
  },
  {
    email: 'rebecca.white@test.com',
    password: 'Test1234!',
    firstName: 'Rebecca',
    lastName: 'White',
    phone: '+15551000013',
    dateOfBirth: '1986-03-07',
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94707',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('teen'),
  },
  {
    email: 'lauren.harris@test.com',
    password: 'Test1234!',
    firstName: 'Lauren',
    lastName: 'Harris',
    phone: '+15551000014',
    dateOfBirth: '1990-09-25',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('toddler,elementary'),
  },
  {
    email: 'ashley.martin@test.com',
    password: 'Test1234!',
    firstName: 'Ashley',
    lastName: 'Martin',
    phone: '+15551000015',
    dateOfBirth: '1991-05-18',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94607',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('elementary'),
  },
  {
    email: 'megan.thompson@test.com',
    password: 'Test1234!',
    firstName: 'Megan',
    lastName: 'Thompson',
    phone: '+15551000016',
    dateOfBirth: '1988-11-02',
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94708',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('elementary,teen'),
  },
  {
    email: 'kimberly.garcia@test.com',
    password: 'Test1234!',
    firstName: 'Kimberly',
    lastName: 'Garcia',
    phone: '+15551000017',
    dateOfBirth: '1987-07-14',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94106',
    childrenCount: 3,
    childrenAgeGroups: parseAgeGroups('toddler,elementary,teen'),
  },
  {
    email: 'christina.rodriguez@test.com',
    password: 'Test1234!',
    firstName: 'Christina',
    lastName: 'Rodriguez',
    phone: '+15551000018',
    dateOfBirth: '1989-02-20',
    city: 'Oakland',
    state: 'CA',
    zipCode: '94608',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('teen'),
  },
  {
    email: 'brittany.lewis@test.com',
    password: 'Test1234!',
    firstName: 'Brittany',
    lastName: 'Lewis',
    phone: '+15551000019',
    dateOfBirth: '1992-06-09',
    city: 'Berkeley',
    state: 'CA',
    zipCode: '94709',
    childrenCount: 2,
    childrenAgeGroups: parseAgeGroups('toddler,elementary'),
  },
  {
    email: 'samantha.walker@test.com',
    password: 'Test1234!',
    firstName: 'Samantha',
    lastName: 'Walker',
    phone: '+15551000020',
    dateOfBirth: '1990-10-31',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94107',
    childrenCount: 1,
    childrenAgeGroups: parseAgeGroups('elementary'),
  },
];

async function seedUsers() {
  console.log(`\n🌱 Seeding ${testUsers.length} discovery test users via API...\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of testUsers) {
    try {
      const response = await axios.post(`${API_BASE}/auth/register`, user, {
        headers: { 'Content-Type': 'application/json' },
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
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📝 Total: ${testUsers.length}\n`);

  if (created > 0 || skipped === testUsers.length) {
    console.log('✅ All test users ready for Discovery testing!');
    console.log('\n🎯 Test Credentials (all users):');
    console.log('   Password: Test1234!');
    console.log('   Primary: sarah.verified@test.com / TestPassword123!');
    console.log('   Discovery: sarah.johnson@test.com / Test1234!\n');
  }

  process.exit(errors > 0 ? 1 : 0);
}

seedUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
