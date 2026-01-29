import http from 'http';
import { initializeSentry } from './config/sentry';

// Initialize Sentry EARLY (before other imports that might throw)
initializeSentry();

import app from './app';
import { testConnection } from './config/database';
import { checkRedisHealth } from './config/redis';
import { initializeWebSocket } from './websockets/socketHandler';
import logger from './config/logger';
import SocketService from './services/SocketService';
import { validateEnv } from './config/env';
import { moderationWorker } from './features/moderation';
import { startWebhookRetryWorker, stopWebhookRetryWorker } from './workers/webhookRetryWorker';

// Validate environment variables (fail fast if misconfigured)
let env;
try {
  env = validateEnv();
  logger.info('✅ Environment validation complete');
} catch (error) {
  logger.error('❌ Environment validation failed. Server will not start.');
  console.error(error);
  process.exit(1);
}

const server = http.createServer(app);
const PORT = env.PORT;

// Initialize WebSocket
const io = initializeWebSocket(server);

// Register Socket.io instance with SocketService
SocketService.setIO(io);

// Make io available to routes
app.set('io', io);

// Initialize server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Connect to Redis
    await checkRedisHealth();

    // Start server
    server.listen(PORT, () => {
      const securityStatus = [
        env.ENABLE_RATE_LIMITING ? '✅ Rate Limiting' : '❌ Rate Limiting',
        env.ENABLE_JWT_VALIDATION ? '✅ JWT Validation' : '❌ JWT Validation',
        env.ENABLE_ENCRYPTION ? '✅ Message Encryption' : '❌ Message Encryption',
        env.ENABLE_ACCOUNT_LOCKOUT ? '✅ Account Lockout' : '⚠️  Account Lockout',
        env.ENABLE_VERIFICATION_CHECKS ? '✅ Verification Checks' : '❌ Verification Checks',
      ].join('\n║   ');

      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏡 CoNest API Server Running                            ║
║                                                            ║
║   Environment: ${env.NODE_ENV.padEnd(20)}                              ║
║   Security Mode: ${env.SECURITY_MODE.toUpperCase().padEnd(16)}                          ║
║   Port: ${PORT}                                             ║
║   API URL: ${env.API_URL || `http://localhost:${PORT}`}                         ║
║                                                            ║
║   📊 Health: http://localhost:${PORT}/health                ║
║   🔌 WebSocket: Enabled                                   ║
║                                                            ║
║   🔒 Security Features:                                   ║
║   ${securityStatus}
║                                                            ║
║   Verification Providers:                                 ║
║   - ID Verification: ${env.ID_PROVIDER.toUpperCase().padEnd(10)}                       ║
║   - Background Check: ${env.BG_CHECK_PROVIDER.toUpperCase().padEnd(9)}                      ║
║                                                            ║
║   Database: PostgreSQL (${env.DB_HOST}:${env.DB_PORT})                      ║
║   Cache: Redis (${env.REDIS_HOST}:${env.REDIS_PORT})                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);

      console.log('\n📝 Available API Endpoints:');
      console.log('   Authentication:');
      console.log('     POST /api/auth/register');
      console.log('     POST /api/auth/login');
      console.log('     POST /api/auth/refresh-token');
      console.log('     POST /api/auth/logout');
      console.log('');
      console.log('   Profiles:');
      console.log('     POST /api/profiles');
      console.log('     GET  /api/profiles/me');
      console.log('     PUT  /api/profiles/me');
      console.log('     GET  /api/profiles/search');
      console.log('');
      console.log('   Verification:');
      console.log('     GET  /api/verification/status');
      console.log('     POST /api/verification/phone/send');
      console.log('     POST /api/verification/id/initiate');
      console.log('     POST /api/verification/background/initiate');
      console.log('');
      console.log('   Matching:');
      console.log('     GET  /api/matches/find');
      console.log('     POST /api/matches/create');
      console.log('     GET  /api/matches/my-matches');
      console.log('');
      console.log('   Messaging:');
      console.log('     POST /api/messages/send');
      console.log('     GET  /api/messages/conversations');
      console.log('     GET  /api/messages/unread-count');
      console.log('');
      console.log('   Payments:');
      console.log('     POST /api/payments/create');
      console.log('     GET  /api/payments/my-payments');
      console.log('     POST /api/payments/stripe/create-account');
      console.log('');

      // Start AI Content Moderation Worker
      const aiModerationEnabled = process.env.AI_MODERATION_ENABLED === 'true';
      if (aiModerationEnabled) {
        void moderationWorker.start();
        const shadowMode = process.env.AI_MODERATION_SHADOW_MODE === 'true';
        console.log(`\n🤖 AI Content Moderation: ${shadowMode ? 'SHADOW MODE (logging only)' : 'ACTIVE'}`);
        console.log(`   - Primary Provider: ${  process.env.AI_MODERATION_PRIMARY_PROVIDER || 'gemini'}`);
        console.log(`   - Fallback Provider: ${  process.env.AI_MODERATION_FALLBACK_PROVIDER || 'openai'}`);
      } else {
        console.log('\n⚠️  AI Content Moderation: DISABLED');
      }

      // TASK-W2-01: Start Webhook Retry Worker
      // This enables automatic retry of failed webhooks with exponential backoff
      startWebhookRetryWorker();
      console.log('\n🔄 Webhook Retry Worker: ACTIVE');
      console.log('   - Max retries: 3 (2s, 4s, 8s backoff)');
      console.log('   - Hourly reprocessing: Enabled');
      console.log('   - Dead letter queue: Enabled');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  moderationWorker.stop();
  stopWebhookRetryWorker();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  moderationWorker.stop();
  stopWebhookRetryWorker();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server only if this file is run directly (not imported by tests)
if (require.main === module) {
  void startServer();
}

export default app;
