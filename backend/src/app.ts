import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { setupSecurity } from './middleware/security';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import storageService from './services/s3Service';
import { setupSwagger } from './config/swagger';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import verificationRoutes from './routes/verification';
import matchRoutes from './routes/matches';
import messageRoutes from './routes/messages';
import enhancedMessageRoutes from './routes/enhancedMessages';
import paymentRoutes, { stripeWebhookRouter } from './routes/payments';
import discoveryRoutes from './routes/discovery';
import householdRoutes from './routes/household';
import savedProfileRoutes from './routes/savedProfiles';
import connectionRequestRoutes from './routes/connectionRequests';
import comparisonRoutes from './routes/comparison';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';

// Load environment variables
dotenv.config();

const app: Express = express();

// Security middleware
setupSecurity(app);

// Webhook endpoints (require raw body for signature verification)
// MUST be before body parsing middleware
app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);
app.use('/api/webhooks', webhookRoutes);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalLimiter);

// API Documentation (Swagger)
// Available at /api-docs
setupSwagger(app);

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
app.use('/api/messages', enhancedMessageRoutes); // Enhanced messaging with verification & moderation
app.use('/api/payments', paymentRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/saved-profiles', savedProfileRoutes);
app.use('/api/connection-requests', connectionRequestRoutes);
app.use('/api/compatibility', comparisonRoutes);
app.use('/api/admin', adminRoutes);

// Development-only routes (test token generation, etc.)
// SECURITY: Only registered in development/test environments
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  // Dynamic import to ensure this code is never bundled in production
  import('./routes/dev').then((devRoutes) => {
    app.use('/api/dev', devRoutes.default);
    console.log('⚠️  DEV ROUTES ENABLED - /api/dev/* endpoints are active');
  }).catch((err) => {
    console.error('Failed to load dev routes:', err);
  });
}

// Local file uploads serving (development mode only)
// Security: Only serves files in the uploads directory with proper MIME types
app.use('/api/uploads', (req: Request, res: Response, next: NextFunction) => {
  // Only serve files in local storage mode
  if (!storageService.isLocalStorageMode()) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }

  const uploadDir = storageService.getLocalUploadDir();
  const requestedPath = req.path.replace(/^\//, ''); // Remove leading slash
  const filePath = path.join(uploadDir, requestedPath);

  // Security: Prevent path traversal attacks
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(uploadDir)) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, error: 'File not found' });
    return;
  }

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  res.setHeader('Cache-Control', 'private, max-age=3600');

  // Send the file
  res.sendFile(filePath);
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
export { app };
