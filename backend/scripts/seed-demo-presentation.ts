/**
 * Demo Presentation Seed Script
 *
 * Purpose: Create two fully-configured demo users for live presentations
 * - Both users verified (bypass verification requirements)
 * - Same city (Austin, TX) for discovery matching
 * - Pre-established match and conversation for messaging demo
 * - One user with household (optional) for invitation demo
 *
 * Usage:
 *   # Basic setup (2 users, matched, can message)
 *   npm run seed:demo
 *
 *   # Discovery demo (2 users, NOT matched, appear in Discovery)
 *   npm run seed:demo -- --discovery-only
 *
 *   # With household (User A has household, can invite User B)
 *   npm run seed:demo:household
 *
 * Credentials:
 *   User A: demo.sarah@conest.app / Demo1234!
 *   User B: demo.mike@conest.app / Demo1234!
 *
 * Created: 2026-01-22
 * Updated: 2026-01-26 - Fixed schema compatibility
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Knex } from 'knex';

// Load environment variables - don't override if already set by dotenv-cli
if (!process.env.DB_NAME) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      `Set it in backend/.env (see backend/.env.example) before running this script.`,
    );
  }
  return value;
}

// Demo user configuration
// Profile images from pravatar.cc (realistic stock photos)
const DEMO_USERS = [
  {
    email: 'demo.sarah@conest.app',
    password: 'Demo1234!',
    firstName: 'Sarah',
    lastName: 'Chen',
    phone: '+15559990001',
    dateOfBirth: '1988-05-15',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    childrenCount: 2,
    childrenAgeGroups: 'elementary,toddler',
    bio: 'Single mom of two amazing kids. Software engineer who values work-life balance. Looking for a responsible co-parent to share a home with.',
    budgetMin: 1200,
    budgetMax: 1800,
    profileImageUrl: 'https://i.pravatar.cc/300?img=47', // Friendly woman
  },
  {
    email: 'demo.maria@conest.app',
    password: 'Demo1234!',
    firstName: 'Maria',
    lastName: 'Garcia',
    phone: '+15559990003',
    dateOfBirth: '1990-03-12',
    city: 'Austin',
    state: 'TX',
    zipCode: '78703',
    childrenCount: 1,
    childrenAgeGroups: 'toddler',
    bio: 'Nurse and single mom. My little one keeps me busy but I love it. Looking for a safe household with another parent who gets the juggle.',
    budgetMin: 1000,
    budgetMax: 1600,
    profileImageUrl: 'https://i.pravatar.cc/300?img=48', // Friendly woman
  },
];

interface DemoUserResult {
  userId: string;
  profileId: string;
  email: string;
  firstName: string;
}

/**
 * Connect to database
 */
async function getDatabase(): Promise<Knex> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const knex = require('knex');

  const config = {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: requireEnv('DB_USER'),
      password: requireEnv('DB_PASSWORD'),
      database: process.env.DB_NAME || 'conest_demo',
    },
  };

  console.log(`   Connecting to: ${config.connection.database}`);
  return knex(config);
}

/**
 * Create or get demo user directly in database
 */
async function createDemoUser(
  db: Knex,
  userData: (typeof DEMO_USERS)[0],
): Promise<DemoUserResult | null> {
  // Check if user already exists
  let user = await db('users').where({ email: userData.email }).first();

  if (!user) {
    // Create user
    const passwordHash = await bcrypt.hash(userData.password, 10);
    [user] = await db('users')
      .insert({
        email: userData.email,
        password_hash: passwordHash,
        phone: userData.phone,
        email_verified: true,
        phone_verified: true,
        status: 'active',
      })
      .returning('*');
    console.log(`   ✅ Created user: ${userData.email}`);
  } else {
    // Update existing user to be verified
    await db('users').where({ id: user.id }).update({
      email_verified: true,
      phone_verified: true,
      status: 'active',
    });
    console.log(`   ⏭️  User exists: ${userData.email}`);
  }

  // Check if profile already exists
  let profile = await db('profiles').where({ user_id: user.id }).first();

  if (!profile) {
    // Create profile with profile image
    [profile] = await db('profiles')
      .insert({
        user_id: user.id,
        first_name: userData.firstName,
        last_name: userData.lastName,
        date_of_birth: userData.dateOfBirth,
        bio: userData.bio,
        city: userData.city,
        state: userData.state,
        zip_code: userData.zipCode,
        budget_min: userData.budgetMin,
        budget_max: userData.budgetMax,
        children_count: userData.childrenCount,
        children_age_groups: userData.childrenAgeGroups,
        schedule_type: 'flexible',
        verified: true,
        verification_level: 'full',
        profile_image_url: userData.profileImageUrl,
      })
      .returning('*');
    console.log(`   ✅ Created profile: ${userData.firstName} ${userData.lastName} (with photo)`);
  } else {
    // Update profile to be verified and add image if missing
    await db('profiles').where({ id: profile.id }).update({
      verified: true,
      verification_level: 'full',
      profile_image_url: userData.profileImageUrl,
    });
    console.log(`   ⏭️  Profile exists: ${userData.firstName} ${userData.lastName} (updated photo)`);
  }

  return {
    userId: user.id,
    profileId: profile.id,
    email: user.email,
    firstName: profile.first_name,
  };
}

/**
 * Create verification record for user
 */
async function createVerification(db: Knex, userId: string, email: string): Promise<void> {
  const existing = await db('verifications').where({ user_id: userId }).first();

  if (existing) {
    await db('verifications').where({ user_id: userId }).update({
      id_verification_status: 'approved',
      id_verification_date: db.fn.now(),
      background_check_status: 'approved',
      background_check_date: db.fn.now(),
      phone_verified: true,
      phone_verification_date: db.fn.now(),
      email_verified: true,
      email_verification_date: db.fn.now(),
      verification_score: 100,
      fully_verified: true,
      updated_at: db.fn.now(),
    });
  } else {
    await db('verifications').insert({
      user_id: userId,
      id_verification_status: 'approved',
      id_verification_date: db.fn.now(),
      background_check_status: 'approved',
      background_check_date: db.fn.now(),
      phone_verified: true,
      phone_verification_date: db.fn.now(),
      email_verified: true,
      email_verification_date: db.fn.now(),
      verification_score: 100,
      fully_verified: true,
    });
  }

  console.log(`   🔐 Verified: ${email} (ID + Background Check)`);
}

/**
 * Create a match between two users
 */
async function createMatch(db: Knex, user1: DemoUserResult, user2: DemoUserResult): Promise<string> {
  // Check for existing match
  const existingMatch = await db('matches')
    .where(function () {
      this.where({ user_id_1: user1.userId, user_id_2: user2.userId }).orWhere({
        user_id_1: user2.userId,
        user_id_2: user1.userId,
      });
    })
    .first();

  if (existingMatch) {
    console.log(`   ⏭️  Match already exists between ${user1.firstName} and ${user2.firstName}`);
    return existingMatch.id;
  }

  // Create match (user_id_1 < user_id_2 for consistency)
  const [id1, id2] = user1.userId < user2.userId ? [user1.userId, user2.userId] : [user2.userId, user1.userId];

  const [match] = await db('matches')
    .insert({
      user_id_1: id1,
      user_id_2: id2,
      compatibility_score: 92.5,
      schedule_score: 95.0,
      parenting_score: 90.0,
      rules_score: 88.0,
      location_score: 100.0,
      budget_score: 85.0,
      lifestyle_score: 90.0,
      initiated_by: id1,
      status: 'accepted',
      matched_at: db.fn.now(),
    })
    .returning('*');

  console.log(`   💕 Created match: ${user1.firstName} ↔ ${user2.firstName} (92.5% compatibility)`);
  return match.id;
}

/**
 * Create a conversation between two matched users
 */
async function createConversation(db: Knex, user1: DemoUserResult, user2: DemoUserResult): Promise<string> {
  // Check for existing conversation
  const existingConversation = await db('conversations')
    .where(function () {
      this.where({ participant_1_id: user1.userId, participant_2_id: user2.userId }).orWhere({
        participant_1_id: user2.userId,
        participant_2_id: user1.userId,
      });
    })
    .first();

  if (existingConversation) {
    console.log(`   ⏭️  Conversation already exists between ${user1.firstName} and ${user2.firstName}`);
    return existingConversation.id;
  }

  const [conversation] = await db('conversations')
    .insert({
      participant_1_id: user1.userId,
      participant_2_id: user2.userId,
    })
    .returning('*');

  console.log(`   💬 Created conversation: ${user1.firstName} ↔ ${user2.firstName}`);
  return conversation.id;
}

/**
 * Seed demo messages in a conversation
 */
async function seedDemoMessages(
  db: Knex,
  conversationId: string,
  user1: DemoUserResult,
  user2: DemoUserResult,
): Promise<void> {
  // Check if messages already exist
  const existingMessages = await db('messages').where({ conversation_id: conversationId }).first();

  if (existingMessages) {
    console.log('   ⏭️  Messages already seeded in conversation');
    return;
  }

  const now = new Date();
  const generateIv = () => crypto.randomBytes(12).toString('hex');

  const messages = [
    {
      conversation_id: conversationId,
      sender_id: user2.userId,
      content: "Hi Sarah! I saw your profile and I think we'd be a great match for co-living. Your kids' ages are similar to my daughter's!",
      message_type: 'text',
      encryption_iv: generateIv(),
      read: true,
      read_at: new Date(now.getTime() - 110 * 60000),
      created_at: new Date(now.getTime() - 120 * 60000),
    },
    {
      conversation_id: conversationId,
      sender_id: user1.userId,
      content: "Hi Mike! Nice to meet you! I noticed we're both in Austin and have similar house rules preferences. What part of the city are you looking at?",
      message_type: 'text',
      encryption_iv: generateIv(),
      read: true,
      read_at: new Date(now.getTime() - 85 * 60000),
      created_at: new Date(now.getTime() - 90 * 60000),
    },
    {
      conversation_id: conversationId,
      sender_id: user2.userId,
      content: "I'm flexible! Anywhere with good schools near downtown would be perfect. My daughter just started elementary school.",
      message_type: 'text',
      encryption_iv: generateIv(),
      read: true,
      read_at: new Date(now.getTime() - 55 * 60000),
      created_at: new Date(now.getTime() - 60 * 60000),
    },
    {
      conversation_id: conversationId,
      sender_id: user1.userId,
      content: "That sounds like it would work well! My older one is in 3rd grade. Would you like to set up a time to meet and chat about what we're both looking for?",
      message_type: 'text',
      encryption_iv: generateIv(),
      read: true,
      read_at: new Date(now.getTime() - 25 * 60000),
      created_at: new Date(now.getTime() - 30 * 60000),
    },
    {
      conversation_id: conversationId,
      sender_id: user2.userId,
      content: "Absolutely! How about coffee this Saturday? There's a nice family-friendly café near Mueller Lake Park.",
      message_type: 'text',
      encryption_iv: generateIv(),
      read: false, // UNREAD - will show in bell badge!
      created_at: new Date(now.getTime() - 5 * 60000),
    },
  ];

  await db('messages').insert(messages);
  await db('conversations')
    .where({ id: conversationId })
    .update({ last_message_at: messages[messages.length - 1].created_at });

  console.log(`   📨 Seeded ${messages.length} demo messages (1 unread from ${user2.firstName})`);
}

/**
 * Create a household for demo (optional)
 */
async function createHousehold(db: Knex, owner: DemoUserResult): Promise<string | null> {
  // Check for existing household membership
  const existingMembership = await db('household_members').where({ user_id: owner.userId }).first();

  if (existingMembership) {
    console.log(`   ⏭️  ${owner.firstName} already has a household`);
    return existingMembership.household_id;
  }

  // Create household
  const [household] = await db('households')
    .insert({
      name: 'Austin Family Home',
      address: '1234 Demo Street',
      city: 'Austin',
      state: 'TX',
      zip_code: '78701',
      monthly_rent: 280000,
      status: 'active',
    })
    .returning('*');

  // Add owner as household member (role must be 'admin' or 'member')
  await db('household_members').insert({
    household_id: household.id,
    user_id: owner.userId,
    role: 'admin',
    rent_share: 140000,
    status: 'active',
    joined_at: db.fn.now(),
  });

  console.log(`   🏠 Created household: "Austin Family Home" (Owner: ${owner.firstName})`);
  return household.id;
}

/**
 * Main seed function
 */
async function seedDemoPresentation(): Promise<void> {
  const withHousehold = process.argv.includes('--with-household');
  const discoveryOnly = process.argv.includes('--discovery-only');

  console.log('\n🎬 CoNest Demo Presentation Setup');
  console.log('═══════════════════════════════════\n');

  console.log('🔌 Connecting to database...');
  const db = await getDatabase();

  try {
    // Step 1: Create demo users
    console.log('\n📝 Step 1: Creating demo users...\n');
    const demoUsers: DemoUserResult[] = [];

    for (const userData of DEMO_USERS) {
      const user = await createDemoUser(db, userData);
      if (user) {
        demoUsers.push(user);
      }
    }

    if (demoUsers.length < 2) {
      console.error('\n❌ Need at least 2 demo users.');
      process.exit(1);
    }

    // Step 2: Create verifications
    console.log('\n🔐 Step 2: Creating verifications...\n');
    for (const user of demoUsers) {
      await createVerification(db, user.userId, user.email);
    }

    // Step 3-5: Create match, conversation, and messages (skip for Discovery demo)
    if (discoveryOnly) {
      console.log('\n⏭️  Step 3-5: Skipped (--discovery-only mode)');
      console.log('   Users will appear in each other\'s Discovery feed');
    } else {
      console.log('\n💕 Step 3: Creating match...\n');
      await createMatch(db, demoUsers[0], demoUsers[1]);

      console.log('\n💬 Step 4: Creating conversation...\n');
      const conversationId = await createConversation(db, demoUsers[0], demoUsers[1]);

      console.log('\n📨 Step 5: Seeding demo messages...\n');
      await seedDemoMessages(db, conversationId, demoUsers[0], demoUsers[1]);
    }

    // Step 6: Create household (optional)
    if (withHousehold) {
      console.log('\n🏠 Step 6: Creating household for Sarah...\n');
      await createHousehold(db, demoUsers[0]);
    }

    // Print summary
    console.log('\n═══════════════════════════════════');
    console.log('✅ Demo Setup Complete!');
    console.log('═══════════════════════════════════\n');

    console.log('📱 Demo Credentials:');
    console.log('───────────────────────────────────');
    console.log(`   User A: ${DEMO_USERS[0].email}`);
    console.log(`           Password: ${DEMO_USERS[0].password}`);
    console.log(`           Name: ${DEMO_USERS[0].firstName} ${DEMO_USERS[0].lastName}`);
    console.log('');
    console.log(`   User B: ${DEMO_USERS[1].email}`);
    console.log(`           Password: ${DEMO_USERS[1].password}`);
    console.log(`           Name: ${DEMO_USERS[1].firstName} ${DEMO_USERS[1].lastName}`);
    console.log('');

    console.log('🎯 Demo Features Ready:');
    console.log('───────────────────────────────────');
    console.log('   ✅ Both users verified (ID + Background Check)');
    console.log('   ✅ Same city (Austin, TX) - visible in Discovery');
    if (discoveryOnly) {
      console.log('   ℹ️  Discovery-only mode: No match/messages');
      console.log('   ℹ️  Users appear in each other\'s Discovery feed');
    } else {
      console.log('   ✅ Already matched (92.5% compatibility)');
      console.log('   ✅ Conversation with 5 messages seeded');
      console.log('   ✅ 1 unread message from Mike → Sarah (bell badge!)');
    }
    if (withHousehold) {
      console.log('   ✅ Sarah has household - can invite Mike');
    }
    console.log('');

  } finally {
    await db.destroy();
  }
}

// Run the seed script
seedDemoPresentation()
  .then(() => {
    console.log('🎬 Ready for your presentation! 🎬\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
