import type { Knex } from 'knex';
import * as fs from 'fs';

// Only load .env if DB_NAME isn't already set (allows dotenv-cli to override)
if (!process.env.DB_NAME) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  require('dotenv').config();
}

/**
 * Require an environment variable or fail fast with a helpful error.
 * Credentials must never fall back to hardcoded values — that reintroduces
 * known strings into the codebase.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      `Set it in .env (see .env.example) or your shell environment.`,
    );
  }
  return value;
}

/**
 * Build SSL config for staging / production database connections.
 * Always requires rejectUnauthorized: true. If DB_SSL_CA is set (non-empty,
 * non-whitespace), treat it as either a filesystem path or inline PEM and
 * attach it to the trust chain for the connection.
 */
function buildSSLConfig(): Knex.PgConnectionConfig['ssl'] {
  const raw = process.env.DB_SSL_CA;
  const ca = raw?.trim();
  if (ca) {
    const caContent = fs.existsSync(ca) ? fs.readFileSync(ca, 'utf8') : ca;
    return { rejectUnauthorized: true, ca: caContent };
  }
  return { rejectUnauthorized: true };
}

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: requireEnv('DB_NAME'),
      user: requireEnv('DB_USER'),
      password: requireEnv('DB_PASSWORD'),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/seeds',
      extension: 'ts',
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: requireEnv('DB_NAME'),
      user: requireEnv('DB_USER'),
      password: requireEnv('DB_PASSWORD'),
    },
    pool: {
      min: 0,
      max: 5,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/migrations',
      extension: 'ts',
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: buildSSLConfig(),
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/migrations',
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: buildSSLConfig(),
    },
    pool: {
      min: 5,
      max: 20,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/migrations',
      extension: 'ts',
    },
  },
};

export default config;
