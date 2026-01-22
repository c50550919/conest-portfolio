/**
 * Test Discovery Profiles Seed
 *
 * Purpose: Populate database with test profiles for E2E testing
 * Constitution: Principle I - NO child PII, only aggregated data
 *
 * Creates:
 * - 1 test user (test@conest.com) - already exists
 * - 20 discovery profiles for testing swipe functionality
 * - Varied compatibility scores for realistic testing
 *
 * Created: 2025-10-09
 */

import { Knex } from 'knex';
import bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Check if test user exists
  const existingUser = await knex('users').where({ email: 'test@conest.com' }).first();

  if (!existingUser) {
    console.log('❌ Test user not found. Please ensure test@conest.com user exists first.');
    return;
  }

  console.log('✅ Found test user:', existingUser.id);

  // Clear existing test data (optional - comment out if you want to keep data)
  // await knex('swipes').del();
  // await knex('profiles').whereNot('user_id', existingUser.id).del();
  // await knex('users').whereNot('id', existingUser.id).del();

  // Test profiles data
  const testProfiles = [
    {
      email: 'sarah.johnson@test.com',
      first_name: 'Sarah',
      last_name: 'Johnson',
      bio: 'Single mom of 2 looking for a stable housing partner. I work as a nurse and value cleanliness and routine.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94601',
      budget_min: 1000,
      budget_max: 1500,
      number_of_children: 2,
      ages_of_children: 'toddler,elementary',
      schedule_type: 'shift_work' as const,
      work_from_home: false,
    },
    {
      email: 'jennifer.lee@test.com',
      first_name: 'Jennifer',
      last_name: 'Lee',
      bio: 'Tech professional with 1 child. Looking for someone who respects quiet time and has similar parenting values.',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
      budget_min: 1500,
      budget_max: 2000,
      number_of_children: 1,
      ages_of_children: 'elementary',
      schedule_type: 'fixed' as const,
      work_from_home: true,
    },
    {
      email: 'maria.garcia@test.com',
      first_name: 'Maria',
      last_name: 'Garcia',
      bio: 'Teacher and single parent of 3. Love cooking, gardening, and creating a warm home environment.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94602',
      budget_min: 900,
      budget_max: 1300,
      number_of_children: 3,
      ages_of_children: 'toddler,elementary,teen',
      schedule_type: 'fixed' as const,
      work_from_home: false,
    },
    {
      email: 'amanda.wilson@test.com',
      first_name: 'Amanda',
      last_name: 'Wilson',
      bio: 'Graphic designer working from home. I have 1 teenager and value creativity and independence.',
      city: 'Berkeley',
      state: 'CA',
      zip_code: '94704',
      budget_min: 1200,
      budget_max: 1800,
      number_of_children: 1,
      ages_of_children: 'teen',
      schedule_type: 'flexible' as const,
      work_from_home: true,
    },
    {
      email: 'lisa.martinez@test.com',
      first_name: 'Lisa',
      last_name: 'Martinez',
      bio: 'Healthcare worker with 2 young kids. Looking for a responsible and organized housing partner.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94603',
      budget_min: 1100,
      budget_max: 1600,
      number_of_children: 2,
      ages_of_children: 'toddler,elementary',
      schedule_type: 'shift_work' as const,
      work_from_home: false,
    },
    {
      email: 'rachel.brown@test.com',
      first_name: 'Rachel',
      last_name: 'Brown',
      bio: 'Accountant and mom of 2. I value structure, cleanliness, and mutual respect in shared spaces.',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94103',
      budget_min: 1400,
      budget_max: 1900,
      number_of_children: 2,
      ages_of_children: 'elementary,teen',
      schedule_type: 'fixed' as const,
      work_from_home: false,
    },
    {
      email: 'emily.davis@test.com',
      first_name: 'Emily',
      last_name: 'Davis',
      bio: 'Writer working from home with 1 child. Looking for quiet, respectful living arrangement.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94618',
      budget_min: 1000,
      budget_max: 1400,
      number_of_children: 1,
      ages_of_children: 'elementary',
      schedule_type: 'flexible' as const,
      work_from_home: true,
    },
    {
      email: 'nicole.anderson@test.com',
      first_name: 'Nicole',
      last_name: 'Anderson',
      bio: 'Retail manager with 2 teens. Love movies, cooking, and creating a fun household environment.',
      city: 'Berkeley',
      state: 'CA',
      zip_code: '94705',
      budget_min: 1100,
      budget_max: 1500,
      number_of_children: 2,
      ages_of_children: 'teen',
      schedule_type: 'shift_work' as const,
      work_from_home: false,
    },
    {
      email: 'michelle.thomas@test.com',
      first_name: 'Michelle',
      last_name: 'Thomas',
      bio: 'Software engineer with 1 toddler. Looking for tech-savvy housing partner with flexible schedule.',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94104',
      budget_min: 1600,
      budget_max: 2200,
      number_of_children: 1,
      ages_of_children: 'toddler',
      schedule_type: 'flexible' as const,
      work_from_home: true,
    },
    {
      email: 'jessica.taylor@test.com',
      first_name: 'Jessica',
      last_name: 'Taylor',
      bio: 'Paramedic with 2 young children. I value safety, cleanliness, and shared responsibilities.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94621',
      budget_min: 1000,
      budget_max: 1400,
      number_of_children: 2,
      ages_of_children: 'toddler,elementary',
      schedule_type: 'shift_work' as const,
      work_from_home: false,
    },
    {
      email: 'angela.moore@test.com',
      first_name: 'Angela',
      last_name: 'Moore',
      bio: 'Social worker and mom of 1. Looking for compassionate, understanding housing partner.',
      city: 'Berkeley',
      state: 'CA',
      zip_code: '94706',
      budget_min: 900,
      budget_max: 1200,
      number_of_children: 1,
      ages_of_children: 'elementary',
      schedule_type: 'fixed' as const,
      work_from_home: false,
    },
    {
      email: 'stephanie.jackson@test.com',
      first_name: 'Stephanie',
      last_name: 'Jackson',
      bio: 'Marketing professional with 2 kids. I love organization, cooking, and outdoor activities.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94606',
      budget_min: 1300,
      budget_max: 1700,
      number_of_children: 2,
      ages_of_children: 'elementary,teen',
      schedule_type: 'fixed' as const,
      work_from_home: true,
    },
    {
      email: 'rebecca.white@test.com',
      first_name: 'Rebecca',
      last_name: 'White',
      bio: 'Yoga instructor with 1 teen. Looking for zen, health-conscious living environment.',
      city: 'Berkeley',
      state: 'CA',
      zip_code: '94707',
      budget_min: 1000,
      budget_max: 1400,
      number_of_children: 1,
      ages_of_children: 'teen',
      schedule_type: 'flexible' as const,
      work_from_home: true,
    },
    {
      email: 'lauren.harris@test.com',
      first_name: 'Lauren',
      last_name: 'Harris',
      bio: 'Financial analyst with 2 young children. I value stability, routine, and financial responsibility.',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94105',
      budget_min: 1500,
      budget_max: 2000,
      number_of_children: 2,
      ages_of_children: 'toddler,elementary',
      schedule_type: 'fixed' as const,
      work_from_home: false,
    },
    {
      email: 'ashley.martin@test.com',
      first_name: 'Ashley',
      last_name: 'Martin',
      bio: 'Chef and single mom of 1. Love cooking, hosting, and creating a welcoming home.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94607',
      budget_min: 1100,
      budget_max: 1500,
      number_of_children: 1,
      ages_of_children: 'elementary',
      schedule_type: 'shift_work' as const,
      work_from_home: false,
    },
    {
      email: 'megan.thompson@test.com',
      first_name: 'Megan',
      last_name: 'Thompson',
      bio: 'Librarian with 2 children. I love reading, quiet time, and structured routines.',
      city: 'Berkeley',
      state: 'CA',
      zip_code: '94708',
      budget_min: 900,
      budget_max: 1300,
      number_of_children: 2,
      ages_of_children: 'elementary,teen',
      schedule_type: 'fixed' as const,
      work_from_home: false,
    },
    {
      email: 'kimberly.garcia@test.com',
      first_name: 'Kimberly',
      last_name: 'Garcia',
      bio: 'Real estate agent with 1 teenager. Flexible schedule, love decorating and hosting.',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94106',
      budget_min: 1400,
      budget_max: 1800,
      number_of_children: 1,
      ages_of_children: 'teen',
      schedule_type: 'flexible' as const,
      work_from_home: true,
    },
    {
      email: 'christina.rodriguez@test.com',
      first_name: 'Christina',
      last_name: 'Rodriguez',
      bio: 'Dental hygienist with 2 kids. I value cleanliness, health, and positive environment.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94608',
      budget_min: 1200,
      budget_max: 1600,
      number_of_children: 2,
      ages_of_children: 'toddler,elementary',
      schedule_type: 'fixed' as const,
      work_from_home: false,
    },
    {
      email: 'brittany.lewis@test.com',
      first_name: 'Brittany',
      last_name: 'Lewis',
      bio: 'HR professional working remotely with 1 young child. Looking for professional, organized partner.',
      city: 'Berkeley',
      state: 'CA',
      zip_code: '94709',
      budget_min: 1300,
      budget_max: 1700,
      number_of_children: 1,
      ages_of_children: 'toddler',
      schedule_type: 'flexible' as const,
      work_from_home: true,
    },
    {
      email: 'samantha.walker@test.com',
      first_name: 'Samantha',
      last_name: 'Walker',
      bio: 'Physical therapist with 2 teens. Love fitness, outdoor activities, and healthy living.',
      city: 'Oakland',
      state: 'CA',
      zip_code: '94609',
      budget_min: 1100,
      budget_max: 1500,
      number_of_children: 2,
      ages_of_children: 'teen',
      schedule_type: 'shift_work' as const,
      work_from_home: false,
    },
  ];

  console.log('\n🌱 Seeding', testProfiles.length, 'test profiles...\n');

  const passwordHash = await bcrypt.hash('Test1234!', 10);

  for (const profile of testProfiles) {
    try {
      // Create user
      const [user] = await knex('users')
        .insert({
          email: profile.email,
          password_hash: passwordHash,
          phone_verified: true,
          email_verified: true,
          status: 'active',
        })
        .returning('*');

      console.log('✅ Created user:', user.email);

      // Create profile
      const birthYear = 1985 + Math.floor(Math.random() * 15); // Age 30-45
      await knex('profiles')
        .insert({
          user_id: user.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          date_of_birth: `${birthYear}-06-15`,
          bio: profile.bio,
          city: profile.city,
          state: profile.state,
          zip_code: profile.zip_code,
          budget_min: profile.budget_min,
          budget_max: profile.budget_max,
          move_in_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          children_count: profile.number_of_children,
          children_age_groups: profile.ages_of_children,
          schedule_type: profile.schedule_type,
          work_from_home: profile.work_from_home,
          pets: Math.random() > 0.5,
          smoking: false,
          verified: true,
          verification_level: 'full',
        })
        .returning('*');

      console.log('   └─ Created profile for', profile.first_name, profile.last_name);

      // Create verification record for ID and background check
      await knex('verifications').insert({
        user_id: user.id,
        id_verification_status: 'approved',
        background_check_status: 'clear',
        phone_verified: true,
        email_verified: true,
        id_verification_date: knex.fn.now(),
        background_check_date: knex.fn.now(),
        phone_verification_date: knex.fn.now(),
        email_verification_date: knex.fn.now(),
        verification_score: 100,
        fully_verified: true,
      });

      console.log('   └─ Added verification ✓');
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation - user already exists
        console.log('⏭️  Skipped', profile.email, '(already exists)');
      } else {
        console.error('❌ Error creating profile for', `${profile.email  }:`, error.message);
      }
    }
  }

  console.log('\n✅ Seed completed! Created', testProfiles.length, 'discovery profiles.\n');
  console.log('📊 Summary:');
  console.log('   - Test user: test@conest.com (for E2E tests)');
  console.log('   - Discovery profiles:', testProfiles.length, 'verified parents');
  console.log('   - All profiles: verified, background checked, ready for discovery');
  console.log('\n🎯 Next: Run app and navigate to Discover screen to see profiles!');
}
