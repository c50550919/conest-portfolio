import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { testConnection } from './config/database';
import { checkRedisHealth } from './config/redis';
import { initializeWebSocket } from './websockets/socketHandler';
import logger from './config/logger';
import SocketService from './services/SocketService';
import { validateEnvironment, validateProductionSecurity } from './config/validation';

// Load environment variables
dotenv.config();

// Validate environment variables (fail fast if misconfigured)
try {
  validateEnvironment();
  validateProductionSecurity();
} catch (error) {
  logger.error('Environment validation failed. Server will not start.');
  process.exit(1);
}

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

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
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏡 CoNest API Server Running                            ║
║                                                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Port: ${PORT}                                             ║
║   API URL: http://localhost:${PORT}                         ║
║                                                            ║
║   📊 Health: http://localhost:${PORT}/health                ║
║   🔌 WebSocket: Enabled                                   ║
║   🔒 Security: Active                                     ║
║                                                            ║
║   MOCK Services Active:                                   ║
║   - Checkr (Background Checks)                            ║
║   - Jumio (ID Verification)                               ║
║   - Twilio (SMS/2FA)                                      ║
║                                                            ║
║   Real Services:                                          ║
║   - Stripe (Test Mode)                                    ║
║   - PostgreSQL                                            ║
║   - Redis                                                 ║
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
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server only if this file is run directly (not imported by tests)
if (require.main === module) {
  startServer();
}

export default app;
