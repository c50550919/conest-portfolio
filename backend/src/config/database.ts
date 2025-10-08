import knex, { Knex } from 'knex';
import config from '../../knexfile';

// Get environment-specific configuration
const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

if (!dbConfig) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

// Create database instance
const db = knex(dbConfig);

// Export as both default and named export
export default db;
export { db };

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};
