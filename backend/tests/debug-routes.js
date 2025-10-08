/**
 * Debug script to check if routes are properly registered
 */

const app = require('../src/server').default;

console.log('\n=== DEBUG: Checking Express Route Registration ===\n');

// Get all registered routes
const routes = [];
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Route registered directly on the app
    routes.push({
      path: middleware.route.path,
      methods: Object.keys(middleware.route.methods)
    });
  } else if (middleware.name === 'router') {
    // Router middleware
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const routePath = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/');
        routes.push({
          path: routePath + handler.route.path,
          methods: Object.keys(handler.route.methods)
        });
      }
    });
  }
});

console.log('Total routes found:', routes.length);
console.log('\nRegistered routes:');
routes.forEach((route) => {
  console.log(`  ${route.methods.join(', ').toUpperCase()}: ${route.path}`);
});

console.log('\n=== Checking for /api/auth routes specifically ===\n');
const authRoutes = routes.filter(r => r.path.includes('/api/auth'));
console.log('Auth routes found:', authRoutes.length);
authRoutes.forEach((route) => {
  console.log(`  ${route.methods.join(', ').toUpperCase()}: ${route.path}`);
});

console.log('\n=== END DEBUG ===\n');
