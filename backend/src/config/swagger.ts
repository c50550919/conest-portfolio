/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CoNest API',
      version: '1.0.0',
      description: `
## CoNest - Single Parent Housing Platform API

A platform that helps single parents find safe, verified, and compatible roommates for shared housing.

### Core Safety Principles
- **NO child data storage** - Only parent profiles, no children's names/photos/details
- **Mandatory verification** - Background checks, ID verification for all users
- **End-to-end encryption** - All messages and sensitive data encrypted

### Authentication
All protected endpoints require a JWT bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

### Rate Limits
- General API: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Discovery endpoints: 60 requests per 15 minutes
      `,
      contact: {
        name: 'CoNest Development Team',
      },
      license: {
        name: 'Private',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server',
      },
      {
        url: 'https://api-staging.conest.app',
        description: 'Staging environment',
      },
      {
        url: 'https://api.conest.app',
        description: 'Production environment',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            hasMore: { type: 'boolean', example: true },
          },
        },
        VerificationStatus: {
          type: 'object',
          properties: {
            idVerified: { type: 'boolean' },
            backgroundCheckPassed: { type: 'boolean' },
            phoneVerified: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
          },
        },
        CompatibilityScore: {
          type: 'object',
          properties: {
            overall: { type: 'number', minimum: 0, maximum: 100 },
            schedule: { type: 'number', minimum: 0, maximum: 100 },
            parenting: { type: 'number', minimum: 0, maximum: 100 },
            houseRules: { type: 'number', minimum: 0, maximum: 100 },
            location: { type: 'number', minimum: 0, maximum: 100 },
            budget: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      {
        name: 'Authentication',
        description: 'User registration, login, and token management',
      },
      {
        name: 'Profile',
        description: 'User profile management',
      },
      {
        name: 'Verification',
        description: 'ID verification, background checks, and phone verification',
      },
      {
        name: 'Discovery',
        description: 'Browse and discover compatible parent profiles',
      },
      {
        name: 'Saved Profiles',
        description: 'Save and organize profiles for later review',
      },
      {
        name: 'Connection Requests',
        description: 'Send and manage housing connection requests',
      },
      {
        name: 'Matches',
        description: 'View and manage mutual matches',
      },
      {
        name: 'Messages',
        description: 'Real-time messaging between matched users',
      },
      {
        name: 'Household',
        description: 'Household management and expense sharing',
      },
      {
        name: 'Payments',
        description: 'Subscription and payment processing',
      },
      {
        name: 'Admin',
        description: 'Administrative endpoints (admin users only)',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Swagger UI options
  const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'CoNest API Documentation',
  };

  // Serve Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions),
  );

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export { swaggerSpec };
