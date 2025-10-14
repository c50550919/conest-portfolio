import express, { Express } from 'express';
import dotenv from 'dotenv';
import { setupSecurity } from './middleware/security';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import verificationRoutes from './routes/verification';
import matchRoutes from './routes/matches';
import messageRoutes from './routes/messages';
import paymentRoutes, { stripeWebhookRouter } from './routes/payments';
import discoveryRoutes from './routes/discovery';
import householdRoutes from './routes/household';
import savedProfileRoutes from './routes/savedProfiles';
import connectionRequestRoutes from './routes/connectionRequests';

// Load environment variables
dotenv.config();

const app: Express = express();

// Security middleware
setupSecurity(app);

// Stripe webhook endpoint (requires raw body for signature verification)
// MUST be before body parsing middleware
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
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
app.use('/api/discovery', discoveryRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/saved-profiles', savedProfileRoutes);
app.use('/api/connection-requests', connectionRequestRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
export { app };
