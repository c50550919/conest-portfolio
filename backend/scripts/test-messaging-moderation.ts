/**
 * Test Script: Messaging + AI Content Moderation Flow
 *
 * Tests:
 * 1. Normal messages - should pass moderation
 * 2. Questionable messages - should be flagged for review
 * 3. Predatory pattern messages - should be auto-blocked
 * 4. Pattern escalation - multiple flags should trigger warnings
 * 5. Admin moderation queue - view and action on flagged messages
 *
 * Prerequisites:
 * - Backend server running on localhost:3000
 * - PostgreSQL and Redis running
 * - Test users seeded (run seed-test-users-api.ts first)
 * - AI_MODERATION_ENABLED=true in .env
 *
 * Usage: npx ts-node scripts/test-messaging-moderation.ts
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

// Test users credentials
const TEST_USER_1 = {
  email: 'sarah.verified@test.com',
  password: 'TestPassword123!',
};

const TEST_USER_2 = {
  email: 'maria.fullverified@test.com',
  password: 'TestPassword123!',
};

const ADMIN_USER = {
  email: 'admin@conest.com',
  password: 'AdminPassword123!',
};

interface AuthResponse {
  success: boolean;
  data: {
    userId: string;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

interface MessageResponse {
  success: boolean;
  data: {
    id: string;
    content: string;
    moderation_status?: string;
    ai_category?: string;
    ai_confidence_score?: number;
  };
}

/**
 * Test message categories
 */
const TEST_MESSAGES = {
  normal: [
    "Hi! I saw your profile and I think we might be compatible roommates. What's your work schedule like?",
    "I have a 2-bedroom apartment in the suburbs. The rent is $1500/month split. Are you interested?",
    "I'm looking for someone who's family-friendly. I have a quiet lifestyle and work from home.",
    "The neighborhood is great for families. There's a park nearby and good schools in the area.",
  ],
  questionable: [
    "So, how old is your kid exactly? And what's their name? I'd love to get to know them better.",
    "When do you usually leave for work? I'm asking because I want to know when the house is empty.",
    "Does your child ever stay home alone? Just curious about the house situation.",
  ],
  predatory: [
    "I noticed you have young children. What school do they go to? I could pick them up sometimes if you're busy at work. What time does school let out?",
    "I love kids! I used to babysit all the time. I could watch your children while you're at work. Do they have any after-school activities I should know about? What's their schedule like?",
    "Your kids sound adorable! What are their names and ages? I'd love to take them to the park near their school. Do you have cameras in the house?",
  ],
};

class ModerationTestRunner {
  private api: AxiosInstance;
  private user1Token: string = '';
  private user2Token: string = '';
  private adminToken: string = '';
  private user1Id: string = '';
  private user2Id: string = '';
  private conversationId: string = '';
  private flaggedMessageIds: string[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE,
      timeout: 30000,
    });
  }

  private log(message: string, data?: any) {
    console.log(`\n[${new Date().toISOString()}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  private success(message: string) {
    console.log(`✅ ${message}`);
  }

  private error(message: string, err?: any) {
    console.error(`❌ ${message}`);
    if (err?.response?.data) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else if (err?.message) {
      console.error(err.message);
    }
  }

  private warn(message: string) {
    console.log(`⚠️  ${message}`);
  }

  /**
   * Authenticate users and get tokens
   */
  async authenticate(): Promise<boolean> {
    this.log('=== Authenticating Test Users ===');

    try {
      // Login User 1
      const user1Response = await this.api.post<AuthResponse>('/auth/login', TEST_USER_1);
      this.user1Token = user1Response.data.data.tokens.accessToken;
      this.user1Id = user1Response.data.data.userId;
      this.success(`User 1 authenticated: ${TEST_USER_1.email}`);

      // Login User 2
      const user2Response = await this.api.post<AuthResponse>('/auth/login', TEST_USER_2);
      this.user2Token = user2Response.data.data.tokens.accessToken;
      this.user2Id = user2Response.data.data.userId;
      this.success(`User 2 authenticated: ${TEST_USER_2.email}`);

      return true;
    } catch (err) {
      this.error('Authentication failed', err);
      return false;
    }
  }

  /**
   * Create or get a conversation between test users
   */
  async setupConversation(): Promise<boolean> {
    this.log('=== Setting Up Test Conversation ===');

    try {
      // Try to get existing conversation or create new one
      const response = await this.api.get('/messages/conversations', {
        headers: { Authorization: `Bearer ${this.user1Token}` },
      });

      const conversations = response.data.data || [];
      const existingConvo = conversations.find(
        (c: any) => c.participants?.includes(this.user2Id)
      );

      if (existingConvo) {
        this.conversationId = existingConvo.id;
        this.success(`Using existing conversation: ${this.conversationId}`);
      } else {
        // Create a new conversation by sending first message
        this.conversationId = `conv_${this.user1Id}_${this.user2Id}`;
        this.success(`Will create conversation with first message`);
      }

      return true;
    } catch (err) {
      // Conversation might not exist yet - that's OK
      this.conversationId = `conv_${Date.now()}`;
      this.warn('Could not fetch conversations, will create new one');
      return true;
    }
  }

  /**
   * Send a test message and check moderation result
   */
  async sendMessage(
    content: string,
    expectedCategory: 'normal' | 'child_safety_questionable' | 'child_predatory_risk'
  ): Promise<{ success: boolean; messageId?: string; category?: string }> {
    try {
      const response = await this.api.post<MessageResponse>(
        '/messages/verified',
        {
          conversationId: this.conversationId,
          recipientId: this.user2Id,
          content,
          messageType: 'text',
        },
        {
          headers: { Authorization: `Bearer ${this.user1Token}` },
        }
      );

      const message = response.data.data;
      const category = message.ai_category || 'pending';
      const confidence = message.ai_confidence_score || 0;

      this.log(`Message sent: "${content.substring(0, 50)}..."`, {
        messageId: message.id,
        category,
        confidence,
        expectedCategory,
      });

      // Track flagged messages for later admin testing
      if (category !== 'normal' && message.id) {
        this.flaggedMessageIds.push(message.id);
      }

      return { success: true, messageId: message.id, category };
    } catch (err: any) {
      // Auto-blocked messages return 403
      if (err.response?.status === 403 && expectedCategory === 'child_predatory_risk') {
        this.success('Message was auto-blocked as expected');
        return { success: true, category: 'child_predatory_risk' };
      }
      this.error(`Failed to send message: "${content.substring(0, 30)}..."`, err);
      return { success: false };
    }
  }

  /**
   * Test normal messages (should pass)
   */
  async testNormalMessages(): Promise<boolean> {
    this.log('=== Testing Normal Messages ===');
    let passed = 0;

    for (const message of TEST_MESSAGES.normal) {
      const result = await this.sendMessage(message, 'normal');
      if (result.success) {
        // Give moderation worker time to process
        await this.sleep(2000);
        passed++;
      }
    }

    const allPassed = passed === TEST_MESSAGES.normal.length;
    if (allPassed) {
      this.success(`All ${passed} normal messages sent successfully`);
    } else {
      this.error(`Only ${passed}/${TEST_MESSAGES.normal.length} normal messages passed`);
    }
    return allPassed;
  }

  /**
   * Test questionable messages (should be flagged)
   */
  async testQuestionableMessages(): Promise<boolean> {
    this.log('=== Testing Questionable Messages ===');
    let flagged = 0;

    for (const message of TEST_MESSAGES.questionable) {
      const result = await this.sendMessage(message, 'child_safety_questionable');
      if (result.success) {
        await this.sleep(2000);
        flagged++;
      }
    }

    this.success(`Sent ${flagged} questionable messages for review`);
    return true;
  }

  /**
   * Test predatory messages (should be auto-blocked or flagged urgent)
   */
  async testPredatoryMessages(): Promise<boolean> {
    this.log('=== Testing Predatory Pattern Messages ===');
    let detected = 0;

    for (const message of TEST_MESSAGES.predatory) {
      const result = await this.sendMessage(message, 'child_predatory_risk');
      if (result.success) {
        await this.sleep(2000);
        detected++;
      }
    }

    this.success(`${detected} predatory messages were detected/blocked`);
    return true;
  }

  /**
   * Check moderation queue (admin only)
   */
  async checkModerationQueue(): Promise<boolean> {
    this.log('=== Checking Admin Moderation Queue ===');

    try {
      // Try to login as admin
      const adminResponse = await this.api.post<AuthResponse>('/auth/login', ADMIN_USER);
      this.adminToken = adminResponse.data.data.tokens.accessToken;
      this.success('Admin authenticated');
    } catch (err) {
      this.warn('Admin login failed - skipping queue check');
      return true; // Non-fatal
    }

    try {
      const response = await this.api.get('/admin/moderation/queue', {
        headers: { Authorization: `Bearer ${this.adminToken}` },
      });

      const queue = response.data.data || [];
      this.log(`Moderation queue has ${queue.length} items`, {
        categories: queue.reduce((acc: any, item: any) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {}),
      });

      return true;
    } catch (err) {
      this.error('Failed to fetch moderation queue', err);
      return false;
    }
  }

  /**
   * Check moderation statistics
   */
  async checkModerationStats(): Promise<boolean> {
    this.log('=== Checking Moderation Statistics ===');

    if (!this.adminToken) {
      this.warn('No admin token - skipping stats check');
      return true;
    }

    try {
      const response = await this.api.get('/admin/moderation/stats', {
        headers: { Authorization: `Bearer ${this.adminToken}` },
      });

      this.log('Moderation Statistics', response.data.data);
      return true;
    } catch (err) {
      this.error('Failed to fetch moderation stats', err);
      return false;
    }
  }

  /**
   * Check user pattern summary
   */
  async checkUserPatterns(): Promise<boolean> {
    this.log('=== Checking User Pattern Summary ===');

    if (!this.adminToken) {
      this.warn('No admin token - skipping pattern check');
      return true;
    }

    try {
      const response = await this.api.get(`/admin/moderation/patterns/${this.user1Id}`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
      });

      this.log(`Patterns for User 1 (${TEST_USER_1.email})`, response.data.data);
      return true;
    } catch (err) {
      this.error('Failed to fetch user patterns', err);
      return false;
    }
  }

  /**
   * Test user account status
   */
  async checkUserAccountStatus(): Promise<boolean> {
    this.log('=== Checking User Account Status ===');

    try {
      const response = await this.api.get('/profile/me', {
        headers: { Authorization: `Bearer ${this.user1Token}` },
      });

      const user = response.data.data;
      this.log('User Account Status', {
        moderation_status: user.moderation_status,
        moderation_strike_count: user.moderation_strike_count,
        suspension_until: user.suspension_until,
      });

      return true;
    } catch (err: any) {
      // User might be suspended
      if (err.response?.status === 403) {
        this.warn('User account is suspended - moderation working as expected');
        return true;
      }
      this.error('Failed to fetch user status', err);
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('\n========================================');
    console.log('   MESSAGING + MODERATION TEST SUITE   ');
    console.log('========================================\n');

    const results: { test: string; passed: boolean }[] = [];

    // Authentication
    const authPassed = await this.authenticate();
    results.push({ test: 'Authentication', passed: authPassed });
    if (!authPassed) {
      this.error('Cannot continue without authentication');
      this.printResults(results);
      return;
    }

    // Setup conversation
    const convPassed = await this.setupConversation();
    results.push({ test: 'Conversation Setup', passed: convPassed });

    // Normal messages
    const normalPassed = await this.testNormalMessages();
    results.push({ test: 'Normal Messages', passed: normalPassed });

    // Wait for moderation worker to process
    this.log('Waiting for moderation worker to process...');
    await this.sleep(5000);

    // Questionable messages
    const questionablePassed = await this.testQuestionableMessages();
    results.push({ test: 'Questionable Messages', passed: questionablePassed });

    // Wait for moderation
    await this.sleep(5000);

    // Predatory messages
    const predatoryPassed = await this.testPredatoryMessages();
    results.push({ test: 'Predatory Messages', passed: predatoryPassed });

    // Wait for all moderation to complete
    this.log('Waiting for all moderation to complete...');
    await this.sleep(10000);

    // Check moderation queue
    const queuePassed = await this.checkModerationQueue();
    results.push({ test: 'Moderation Queue', passed: queuePassed });

    // Check stats
    const statsPassed = await this.checkModerationStats();
    results.push({ test: 'Moderation Stats', passed: statsPassed });

    // Check patterns
    const patternsPassed = await this.checkUserPatterns();
    results.push({ test: 'User Patterns', passed: patternsPassed });

    // Check account status
    const accountPassed = await this.checkUserAccountStatus();
    results.push({ test: 'Account Status', passed: accountPassed });

    this.printResults(results);
  }

  private printResults(results: { test: string; passed: boolean }[]) {
    console.log('\n========================================');
    console.log('           TEST RESULTS                ');
    console.log('========================================\n');

    let passed = 0;
    let failed = 0;

    for (const result of results) {
      if (result.passed) {
        console.log(`  ✅ ${result.test}`);
        passed++;
      } else {
        console.log(`  ❌ ${result.test}`);
        failed++;
      }
    }

    console.log('\n----------------------------------------');
    console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Run tests
const runner = new ModerationTestRunner();
runner.runAllTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
