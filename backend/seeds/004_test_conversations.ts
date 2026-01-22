import { Knex } from 'knex';

/**
 * Test conversations and messages seeds
 * Creates realistic messaging scenarios for testing
 */
export async function seed(knex: Knex): Promise<void> {
  // Get test users
  const users = await knex('users').select('id', 'email');
  const userMap = users.reduce((acc, user) => {
    acc[user.email] = user.id;
    return acc;
  }, {} as Record<string, string>);

  // Insert test conversations
  const conversations = await knex('conversations')
    .insert([
      {
        participant_1: userMap['sarah.verified@test.com'],
        participant_2: userMap['michelle.budget@test.com'],
        status: 'active',
        last_message_at: new Date('2025-02-01T14:30:00'),
      },
      {
        participant_1: userMap['maria.fullverified@test.com'],
        participant_2: userMap['karen.lifestyle@test.com'],
        status: 'active',
        last_message_at: new Date('2025-02-02T10:15:00'),
      },
      {
        participant_1: userMap['lisa.pending@test.com'],
        participant_2: userMap['patricia.schedule@test.com'],
        status: 'active',
        last_message_at: new Date('2025-01-28T16:45:00'),
      },
      {
        participant_1: userMap['jennifer.complete@test.com'],
        participant_2: userMap['sarah.verified@test.com'],
        status: 'active',
        last_message_at: new Date('2025-01-25T09:20:00'),
      },
      {
        participant_1: userMap['karen.lifestyle@test.com'],
        participant_2: userMap['patricia.schedule@test.com'],
        status: 'archived',
        last_message_at: new Date('2025-01-15T13:00:00'),
      },
    ])
    .returning('*');

  // Insert test messages
  await knex('messages').insert([
    // Conversation 1: Sarah and Michelle (active household discussion)
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['sarah.verified@test.com'],
      content: 'Hi Michelle! I saw your profile and we seem like a great match. Are you still looking for a roommate?',
      is_read: true,
      created_at: new Date('2025-01-20T10:00:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['michelle.budget@test.com'],
      content: "Hi Sarah! Yes, I'm definitely still looking. Your schedule seems to align well with mine. Do you have any questions about my profile?",
      is_read: true,
      created_at: new Date('2025-01-20T10:30:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['sarah.verified@test.com'],
      content: "That's great! I'm particularly interested in the house rules and how we'd split expenses. Are you comfortable with a structured chore schedule?",
      is_read: true,
      created_at: new Date('2025-01-20T11:15:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['michelle.budget@test.com'],
      content: "Absolutely! I'm actually very organized when it comes to household management. Would you be open to meeting in person to discuss the details?",
      is_read: true,
      created_at: new Date('2025-01-20T14:00:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['sarah.verified@test.com'],
      content: "Perfect! How about we meet at a coffee shop this Saturday afternoon? I found a great place near the neighborhood we're both interested in.",
      is_read: true,
      created_at: new Date('2025-01-21T09:00:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['michelle.budget@test.com'],
      content: "Saturday works great for me! Send me the details and I'll be there. Looking forward to meeting you!",
      is_read: true,
      created_at: new Date('2025-01-21T10:00:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['sarah.verified@test.com'],
      content: 'Great meeting you today! I think we would work really well together. Should we start looking at places?',
      is_read: true,
      created_at: new Date('2025-01-27T16:00:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['michelle.budget@test.com'],
      content: "Yes! I've already found a few places in our budget. I'll send you the links tonight.",
      is_read: true,
      created_at: new Date('2025-01-27T16:30:00'),
    },
    {
      conversation_id: conversations[0].id,
      sender_id: userMap['sarah.verified@test.com'],
      content: "We got approved for the Oak Avenue house! I'm creating our household profile now. So excited! 🏡",
      is_read: true,
      created_at: new Date('2025-02-01T14:30:00'),
    },

    // Conversation 2: Maria and Karen (discussing compatibility)
    {
      conversation_id: conversations[1].id,
      sender_id: userMap['maria.fullverified@test.com'],
      content: "Hi Karen! I noticed you're also a health-conscious parent. I love your yoga studio work!",
      is_read: true,
      created_at: new Date('2025-01-30T09:00:00'),
    },
    {
      conversation_id: conversations[1].id,
      sender_id: userMap['karen.lifestyle@test.com'],
      content: "Thank you Maria! I saw you're a nurse with night shifts. How do you manage childcare with that schedule?",
      is_read: true,
      created_at: new Date('2025-01-30T11:00:00'),
    },
    {
      conversation_id: conversations[1].id,
      sender_id: userMap['maria.fullverified@test.com'],
      content: "I have a very reliable daycare that opens early. My mom also helps out occasionally. What's your daily routine like?",
      is_read: true,
      created_at: new Date('2025-01-30T13:00:00'),
    },
    {
      conversation_id: conversations[1].id,
      sender_id: userMap['karen.lifestyle@test.com'],
      content: "I teach morning classes mostly, so I'm home by early afternoon. That could work well with your night shifts - we'd rarely overlap!",
      is_read: true,
      created_at: new Date('2025-01-30T15:00:00'),
    },
    {
      conversation_id: conversations[1].id,
      sender_id: userMap['maria.fullverified@test.com'],
      content: "That sounds perfect! I'm looking at a 3-bedroom place on Maple Street. Would you want to see it together?",
      is_read: true,
      created_at: new Date('2025-02-02T10:15:00'),
    },

    // Conversation 3: Lisa and Patricia (initial contact)
    {
      conversation_id: conversations[2].id,
      sender_id: userMap['lisa.pending@test.com'],
      content: "Hi Patricia! I see you're a freelance designer with a flexible schedule. That's similar to my remote work setup.",
      is_read: true,
      created_at: new Date('2025-01-25T14:00:00'),
    },
    {
      conversation_id: conversations[2].id,
      sender_id: userMap['patricia.schedule@test.com'],
      content: 'Hi Lisa! Yes, I love the flexibility. Do you work from home full-time?',
      is_read: true,
      created_at: new Date('2025-01-26T10:00:00'),
    },
    {
      conversation_id: conversations[2].id,
      sender_id: userMap['lisa.pending@test.com'],
      content: "Yes, completely remote. I do have regular video calls though, so I'd need a dedicated workspace. Is that something you'd be okay with?",
      is_read: true,
      created_at: new Date('2025-01-28T16:45:00'),
    },

    // Conversation 4: Jennifer and Sarah (one-sided interest)
    {
      conversation_id: conversations[3].id,
      sender_id: userMap['jennifer.complete@test.com'],
      content: 'Hi Sarah! I really like your profile. I think our parenting styles would mesh well. Would you be interested in chatting more?',
      is_read: true,
      created_at: new Date('2025-01-24T11:00:00'),
    },
    {
      conversation_id: conversations[3].id,
      sender_id: userMap['sarah.verified@test.com'],
      content: "Hi Jennifer! Thanks for reaching out. I'm currently exploring options with a few people. Can I get back to you in a week?",
      is_read: true,
      created_at: new Date('2025-01-25T09:20:00'),
    },

    // Conversation 5: Karen and Patricia (archived - didn't work out)
    {
      conversation_id: conversations[4].id,
      sender_id: userMap['karen.lifestyle@test.com'],
      content: 'Hi Patricia! Interested in discussing a potential roommate situation?',
      is_read: true,
      created_at: new Date('2025-01-10T10:00:00'),
    },
    {
      conversation_id: conversations[4].id,
      sender_id: userMap['patricia.schedule@test.com'],
      content: "Hi Karen! Thanks for the interest, but I've decided to pursue other options. Best of luck!",
      is_read: true,
      created_at: new Date('2025-01-15T13:00:00'),
    },
  ]);

  console.log('✅ Seed: Test conversations and messages created successfully');
}
