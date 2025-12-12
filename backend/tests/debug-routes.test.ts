/**
 * Debug test to check if routes are properly registered
 */
import app from '../src/app';
import request from 'supertest';

describe('Route Registration Debug', () => {
  it('should have routes registered on the app', () => {
    const routes: any[] = [];

    // @ts-ignore - accessing internal Express properties
    app._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods),
        });
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            routes.push({
              path: handler.route.path,
              methods: Object.keys(handler.route.methods),
            });
          }
        });
      }
    });

    console.log('\n=== Routes Found:', routes.length, '===');
    routes.forEach((route: any) => {
      console.log(`  ${route.methods.join(', ').toUpperCase()}: ${route.path}`);
    });
    console.log('===\n');

    expect(routes.length).toBeGreaterThan(0);
  });

  it('should respond to /health endpoint', async () => {
    const response = await request(app).get('/health');
    console.log('Health endpoint response:', response.status, response.body);
    expect(response.status).toBe(200);
  });

  it('should respond to /api/auth/register endpoint', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'testpass123' });

    console.log('Register endpoint response:', response.status, response.body);
    // Don't assert specific status, just log what we get
  });
});
