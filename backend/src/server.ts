import express, { Express } from 'express';
import http from 'http';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { connectRedis } from './config/redis';
import { setupSecurity } from './middleware/security';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initializeWebSocket } from './websockets/socketHandler';
import logger from './config/logger';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import verificationRoutes from './routes/verification';
import matchRoutes from './routes/matches';
import messageRoutes from './routes/messages';
import paymentRoutes from './routes/payments';

// Load environment variables
dotenv.config();

const app: Express = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSocket
const io = initializeWebSocket(server);

// Make io available to routes
app.set('io', io);

// Security middleware
setupSecurity(app);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Initialize server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Connect to Redis
    await connectRedis();

    // Start server
    server.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏡 SafeNest API Server Running                          ║
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

// Start the server
startServer();

export default app;
