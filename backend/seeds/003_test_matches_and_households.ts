import { Knex } from 'knex';

/**
 * Test matches and households seeds
 * Creates realistic matching scenarios and household examples
 */
export async function seed(knex: Knex): Promise<void> {
  // Get test users and profiles
  const users = await knex('users').select('id', 'email');
  const userMap = users.reduce((acc, user) => {
    acc[user.email] = user.id;
    return acc;
  }, {} as Record<string, string>);

  const profiles = await knex('profiles').select('id', 'user_id');
  const profileMap = profiles.reduce((acc, profile) => {
    acc[profile.user_id] = profile.id;
    return acc;
  }, {} as Record<string, string>);

  // Insert matches with various compatibility scores
  await knex('matches').insert([
    // High compatibility matches (80%+)
    {
      profile_id_1: profileMap[userMap['sarah.verified@test.com']],
      profile_id_2: profileMap[userMap['michelle.budget@test.com']],
      compatibility_score: 0.87,
      score_breakdown: JSON.stringify({
        schedule: 0.9,
        parenting: 0.85,
        house_rules: 0.88,
        location: 0.95,
        budget: 0.82,
        lifestyle: 0.83,
      }),
      status: 'mutual_interest',
      viewed_by_1: true,
      viewed_by_2: true,
      interested_1: true,
      interested_2: true,
    },
    {
      profile_id_1: profileMap[userMap['maria.fullverified@test.com']],
      profile_id_2: profileMap[userMap['karen.lifestyle@test.com']],
      compatibility_score: 0.82,
      score_breakdown: JSON.stringify({
        schedule: 0.75,
        parenting: 0.88,
        house_rules: 0.85,
        location: 0.9,
        budget: 0.8,
        lifestyle: 0.84,
      }),
      status: 'mutual_interest',
      viewed_by_1: true,
      viewed_by_2: true,
      interested_1: true,
      interested_2: true,
    },

    // Medium compatibility matches (60-80%)
    {
      profile_id_1: profileMap[userMap['lisa.pending@test.com']],
      profile_id_2: profileMap[userMap['patricia.schedule@test.com']],
      compatibility_score: 0.73,
      score_breakdown: JSON.stringify({
        schedule: 0.85,
        parenting: 0.75,
        house_rules: 0.7,
        location: 0.88,
        budget: 0.65,
        lifestyle: 0.76,
      }),
      status: 'pending',
      viewed_by_1: true,
      viewed_by_2: false,
      interested_1: false,
      interested_2: false,
    },
    {
      profile_id_1: profileMap[userMap['jennifer.complete@test.com']],
      profile_id_2: profileMap[userMap['sarah.verified@test.com']],
      compatibility_score: 0.68,
      score_breakdown: JSON.stringify({
        schedule: 0.6,
        parenting: 0.8,
        house_rules: 0.72,
        location: 0.85,
        budget: 0.7,
        lifestyle: 0.63,
      }),
      status: 'one_interested',
      viewed_by_1: true,
      viewed_by_2: true,
      interested_1: true,
      interested_2: false,
    },

    // Lower compatibility matches (50-60%)
    {
      profile_id_1: profileMap[userMap['amanda.new@test.com']],
      profile_id_2: profileMap[userMap['michelle.budget@test.com']],
      compatibility_score: 0.56,
      score_breakdown: JSON.stringify({
        schedule: 0.7,
        parenting: 0.65,
        house_rules: 0.5,
        location: 0.75,
        budget: 0.85,
        lifestyle: 0.42,
      }),
      status: 'pending',
      viewed_by_1: false,
      viewed_by_2: false,
      interested_1: false,
      interested_2: false,
    },

    // Additional matches for testing
    {
      profile_id_1: profileMap[userMap['karen.lifestyle@test.com']],
      profile_id_2: profileMap[userMap['patricia.schedule@test.com']],
      compatibility_score: 0.79,
      score_breakdown: JSON.stringify({
        schedule: 0.88,
        parenting: 0.75,
        house_rules: 0.8,
        location: 0.92,
        budget: 0.72,
        lifestyle: 0.85,
      }),
      status: 'one_interested',
      viewed_by_1: true,
      viewed_by_2: true,
      interested_1: false,
      interested_2: true,
    },
  ]);

  // Insert test households
  const households = await knex('households')
    .insert([
      {
        name: 'Sunshine House',
        address_street: '123 Oak Avenue',
        address_city: 'Austin',
        address_state: 'TX',
        address_zip: '78701',
        monthly_rent: 2000,
        bedrooms: 3,
        bathrooms: 2,
        lease_start_date: new Date('2025-02-01'),
        lease_end_date: new Date('2026-02-01'),
        house_rules: JSON.stringify({
          no_smoking: true,
          no_pets: false,
          quiet_hours: '9pm-7am',
          guest_policy: 'weekends_only',
          shared_expenses: true,
        }),
        status: 'active',
        created_by: userMap['sarah.verified@test.com'],
      },
      {
        name: 'Harmony Home',
        address_street: '456 Maple Street',
        address_city: 'Austin',
        address_state: 'TX',
        address_zip: '78702',
        monthly_rent: 1800,
        bedrooms: 3,
        bathrooms: 2,
        lease_start_date: new Date('2025-03-01'),
        lease_end_date: new Date('2026-03-01'),
        house_rules: JSON.stringify({
          no_smoking: true,
          no_pets: true,
          quiet_hours: '8pm-8am',
          guest_policy: 'ask_first',
          shared_expenses: true,
        }),
        status: 'forming',
        created_by: userMap['maria.fullverified@test.com'],
      },
      {
        name: 'Peaceful Place',
        address_street: '789 Pine Road',
        address_city: 'Austin',
        address_state: 'TX',
        address_zip: '78703',
        monthly_rent: 2200,
        bedrooms: 4,
        bathrooms: 2.5,
        lease_start_date: new Date('2025-04-01'),
        lease_end_date: new Date('2026-04-01'),
        house_rules: JSON.stringify({
          no_smoking: true,
          no_pets: false,
          quiet_hours: '10pm-7am',
          guest_policy: 'weekends_only',
          shared_expenses: true,
        }),
        status: 'forming',
        created_by: userMap['jennifer.complete@test.com'],
      },
      // E2E Test Household - for Documents flow testing
      {
        name: 'E2E Test Home',
        address_street: '999 Test Avenue',
        address_city: 'Austin',
        address_state: 'TX',
        address_zip: '78701',
        monthly_rent: 1800,
        bedrooms: 3,
        bathrooms: 2,
        lease_start_date: new Date('2025-01-01'),
        lease_end_date: new Date('2026-01-01'),
        house_rules: JSON.stringify({
          no_smoking: true,
          no_pets: false,
          quiet_hours: '9pm-7am',
          guest_policy: 'weekends_only',
          shared_expenses: true,
        }),
        status: 'active',
        created_by: userMap['test@conest.com'],
      },
    ])
    .returning('*');

  // Insert household members
  await knex('household_members').insert([
    // Sunshine House - Active household with 2 members
    {
      household_id: households[0].id,
      user_id: userMap['sarah.verified@test.com'],
      role: 'admin',
      status: 'active',
      rent_share: 1000,
      joined_at: new Date('2025-02-01'),
    },
    {
      household_id: households[0].id,
      user_id: userMap['michelle.budget@test.com'],
      role: 'member',
      status: 'active',
      rent_share: 1000,
      joined_at: new Date('2025-02-01'),
    },

    // Harmony Home - Forming household with 1 member + 1 invited
    {
      household_id: households[1].id,
      user_id: userMap['maria.fullverified@test.com'],
      role: 'admin',
      status: 'active',
      rent_share: 900,
      joined_at: new Date('2025-01-25'),
    },
    {
      household_id: households[1].id,
      user_id: userMap['karen.lifestyle@test.com'],
      role: 'member',
      status: 'invited',
      rent_share: 900,
    },

    // Peaceful Place - Forming household with admin only
    {
      household_id: households[2].id,
      user_id: userMap['jennifer.complete@test.com'],
      role: 'admin',
      status: 'active',
      rent_share: 1100,
      joined_at: new Date('2025-01-20'),
    },

    // E2E Test Home - Active household for test@conest.com
    {
      household_id: households[3].id,
      user_id: userMap['test@conest.com'],
      role: 'admin',
      status: 'active',
      rent_share: 900,
      joined_at: new Date('2025-01-01'),
    },
  ]);

  // Insert test payments for active household
  await knex('payments').insert([
    {
      household_id: households[0].id,
      payer_id: userMap['sarah.verified@test.com'],
      amount: 1000,
      payment_type: 'rent',
      status: 'completed',
      due_date: new Date('2025-02-01'),
      paid_at: new Date('2025-02-01'),
      stripe_payment_id: 'pi_test_12345',
      description: 'February 2025 rent',
    },
    {
      household_id: households[0].id,
      payer_id: userMap['michelle.budget@test.com'],
      amount: 1000,
      payment_type: 'rent',
      status: 'completed',
      due_date: new Date('2025-02-01'),
      paid_at: new Date('2025-02-01'),
      stripe_payment_id: 'pi_test_67890',
      description: 'February 2025 rent',
    },
    {
      household_id: households[0].id,
      payer_id: userMap['sarah.verified@test.com'],
      amount: 75,
      payment_type: 'utilities',
      status: 'completed',
      due_date: new Date('2025-02-15'),
      paid_at: new Date('2025-02-15'),
      stripe_payment_id: 'pi_test_11111',
      description: 'Internet bill',
    },
    {
      household_id: households[0].id,
      payer_id: userMap['michelle.budget@test.com'],
      amount: 75,
      payment_type: 'utilities',
      status: 'pending',
      due_date: new Date('2025-02-15'),
      description: 'Internet bill',
    },
    {
      household_id: households[0].id,
      payer_id: userMap['sarah.verified@test.com'],
      amount: 1000,
      payment_type: 'rent',
      status: 'pending',
      due_date: new Date('2025-03-01'),
      description: 'March 2025 rent',
    },
    {
      household_id: households[0].id,
      payer_id: userMap['michelle.budget@test.com'],
      amount: 1000,
      payment_type: 'rent',
      status: 'pending',
      due_date: new Date('2025-03-01'),
      description: 'March 2025 rent',
    },
  ]);

  console.log('✅ Seed: Test matches, households, and payments created successfully');
}
