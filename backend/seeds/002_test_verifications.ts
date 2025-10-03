import { Knex } from 'knex';

/**
 * Test verification seeds for development and testing
 * Covers various verification statuses and scenarios
 */
export async function seed(knex: Knex): Promise<void> {
  // Get test users
  const users = await knex('users').select('id', 'email');
  const userMap = users.reduce((acc, user) => {
    acc[user.email] = user.id;
    return acc;
  }, {} as Record<string, string>);

  // Insert verification records with varied statuses
  await knex('verifications').insert([
    // Fully verified user
    {
      user_id: userMap['sarah.verified@test.com'],
      verification_type: 'phone',
      status: 'verified',
      verified_at: new Date('2025-01-15'),
    },
    {
      user_id: userMap['sarah.verified@test.com'],
      verification_type: 'email',
      status: 'verified',
      verified_at: new Date('2025-01-15'),
    },
    {
      user_id: userMap['sarah.verified@test.com'],
      verification_type: 'government_id',
      status: 'verified',
      provider: 'jumio',
      provider_id: 'jumio_12345',
      verified_at: new Date('2025-01-16'),
      metadata: JSON.stringify({
        id_type: 'drivers_license',
        state: 'TX',
        expiry: '2028-05-15',
      }),
    },
    {
      user_id: userMap['sarah.verified@test.com'],
      verification_type: 'background_check',
      status: 'verified',
      provider: 'checkr',
      provider_id: 'checkr_67890',
      verified_at: new Date('2025-01-17'),
      metadata: JSON.stringify({
        report_id: 'rpt_12345',
        clear: true,
      }),
    },

    // Fully verified with 2FA
    {
      user_id: userMap['maria.fullverified@test.com'],
      verification_type: 'phone',
      status: 'verified',
      verified_at: new Date('2025-01-10'),
    },
    {
      user_id: userMap['maria.fullverified@test.com'],
      verification_type: 'email',
      status: 'verified',
      verified_at: new Date('2025-01-10'),
    },
    {
      user_id: userMap['maria.fullverified@test.com'],
      verification_type: 'government_id',
      status: 'verified',
      provider: 'jumio',
      provider_id: 'jumio_22345',
      verified_at: new Date('2025-01-11'),
      metadata: JSON.stringify({
        id_type: 'passport',
        country: 'USA',
        expiry: '2030-08-20',
      }),
    },
    {
      user_id: userMap['maria.fullverified@test.com'],
      verification_type: 'background_check',
      status: 'verified',
      provider: 'checkr',
      provider_id: 'checkr_77890',
      verified_at: new Date('2025-01-12'),
    },
    {
      user_id: userMap['maria.fullverified@test.com'],
      verification_type: 'income',
      status: 'verified',
      verified_at: new Date('2025-01-13'),
      metadata: JSON.stringify({
        annual_income: 55000,
        employment_type: 'full_time',
        employer: 'Memorial Hospital',
      }),
    },

    // Pending verifications
    {
      user_id: userMap['lisa.pending@test.com'],
      verification_type: 'email',
      status: 'verified',
      verified_at: new Date('2025-01-20'),
    },
    {
      user_id: userMap['lisa.pending@test.com'],
      verification_type: 'phone',
      status: 'pending',
      attempts: 1,
      metadata: JSON.stringify({
        code_sent_at: new Date('2025-01-20'),
      }),
    },
    {
      user_id: userMap['lisa.pending@test.com'],
      verification_type: 'government_id',
      status: 'verified',
      provider: 'jumio',
      provider_id: 'jumio_32345',
      verified_at: new Date('2025-01-21'),
    },

    // Complete profile with all verifications
    {
      user_id: userMap['jennifer.complete@test.com'],
      verification_type: 'phone',
      status: 'verified',
      verified_at: new Date('2025-01-05'),
    },
    {
      user_id: userMap['jennifer.complete@test.com'],
      verification_type: 'email',
      status: 'verified',
      verified_at: new Date('2025-01-05'),
    },
    {
      user_id: userMap['jennifer.complete@test.com'],
      verification_type: 'government_id',
      status: 'verified',
      provider: 'jumio',
      provider_id: 'jumio_42345',
      verified_at: new Date('2025-01-06'),
    },
    {
      user_id: userMap['jennifer.complete@test.com'],
      verification_type: 'background_check',
      status: 'verified',
      provider: 'checkr',
      provider_id: 'checkr_87890',
      verified_at: new Date('2025-01-07'),
    },
    {
      user_id: userMap['jennifer.complete@test.com'],
      verification_type: 'income',
      status: 'verified',
      verified_at: new Date('2025-01-08'),
      metadata: JSON.stringify({
        annual_income: 48000,
        employment_type: 'full_time',
        employer: 'The Grove Restaurant',
      }),
    },

    // New user - no verifications yet
    // (amanda.new@test.com has no verifications)

    // Budget-conscious user
    {
      user_id: userMap['michelle.budget@test.com'],
      verification_type: 'phone',
      status: 'verified',
      verified_at: new Date('2025-01-18'),
    },
    {
      user_id: userMap['michelle.budget@test.com'],
      verification_type: 'email',
      status: 'verified',
      verified_at: new Date('2025-01-18'),
    },
    {
      user_id: userMap['michelle.budget@test.com'],
      verification_type: 'government_id',
      status: 'verified',
      provider: 'jumio',
      provider_id: 'jumio_52345',
      verified_at: new Date('2025-01-19'),
    },
    {
      user_id: userMap['michelle.budget@test.com'],
      verification_type: 'background_check',
      status: 'verified',
      provider: 'checkr',
      provider_id: 'checkr_97890',
      verified_at: new Date('2025-01-20'),
    },
    {
      user_id: userMap['michelle.budget@test.com'],
      verification_type: 'income',
      status: 'verified',
      verified_at: new Date('2025-01-21'),
      metadata: JSON.stringify({
        annual_income: 36000,
        employment_type: 'full_time',
        employer: 'Target Store',
      }),
    },

    // Flexible schedule user with partial verification
    {
      user_id: userMap['patricia.schedule@test.com'],
      verification_type: 'phone',
      status: 'verified',
      verified_at: new Date('2025-01-22'),
    },
    {
      user_id: userMap['patricia.schedule@test.com'],
      verification_type: 'email',
      status: 'verified',
      verified_at: new Date('2025-01-22'),
    },
    {
      user_id: userMap['patricia.schedule@test.com'],
      verification_type: 'government_id',
      status: 'verified',
      provider: 'jumio',
      provider_id: 'jumio_62345',
      verified_at: new Date('2025-01-23'),
    },
    {
      user_id: userMap['patricia.schedule@test.com'],
      verification_type: 'background_check',
      status: 'verified',
      provider: 'checkr',
      provider_id: 'checkr_07890',
      verified_at: new Date('2025-01-24'),
    },

    // Health-focused lifestyle user
    {
      user_id: userMap['karen.lifestyle@test.com'],
      verification_type: 'phone',
      status: 'verified',
      verified_at: new Date('2025-01-12'),
    },
    {
      user_id: userMap['karen.lifestyle@test.com'],
      verification_type: 'email',
      status: 'verified',
      verified_at: new Date('2025-01-12'),
    },
    {
      user_id: userMap['karen.lifestyle@test.com'],
      verification_type: 'government_id',
      status: 'verified',
      provider: 'jumio',
      provider_id: 'jumio_72345',
      verified_at: new Date('2025-01-13'),
    },
    {
      user_id: userMap['karen.lifestyle@test.com'],
      verification_type: 'background_check',
      status: 'verified',
      provider: 'checkr',
      provider_id: 'checkr_17890',
      verified_at: new Date('2025-01-14'),
    },
    {
      user_id: userMap['karen.lifestyle@test.com'],
      verification_type: 'income',
      status: 'verified',
      verified_at: new Date('2025-01-15'),
      metadata: JSON.stringify({
        annual_income: 42000,
        employment_type: 'self_employed',
        business: 'Wellness & Yoga Studio',
      }),
    },
  ]);

  console.log('✅ Seed: Test verifications created successfully');
}
