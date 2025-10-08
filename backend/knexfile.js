"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    development: {
        client: 'postgresql',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'safenest_db',
            user: process.env.DB_USER || 'safenest',
            password: process.env.DB_PASSWORD || '',
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
            port: Number(process.env.DB_PORT) || 5433,
            database: process.env.DB_NAME || 'conest_test',
            user: process.env.DB_USER || 'test_user',
            password: process.env.DB_PASSWORD || 'test_password',
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
            ssl: { rejectUnauthorized: false },
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
            ssl: { rejectUnauthorized: false },
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
exports.default = config;
//# sourceMappingURL=knexfile.js.map