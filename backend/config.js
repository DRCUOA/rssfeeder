const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

const config = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || './data/rssfeeder-dev.db',
  DATABASE_POOL_MIN: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  DATABASE_POOL_MAX: parseInt(process.env.DATABASE_POOL_MAX) || 10,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'development-jwt-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Feed Polling
  FEED_POLL_INTERVAL: parseInt(process.env.FEED_POLL_INTERVAL) || 300000,
  FEED_POLL_CONCURRENCY: parseInt(process.env.FEED_POLL_CONCURRENCY) || 5,
  FEED_TIMEOUT: parseInt(process.env.FEED_TIMEOUT) || 30000,
  FEED_MAX_ITEMS_PER_FEED: parseInt(process.env.FEED_MAX_ITEMS_PER_FEED) || 100,

  // Security
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'development-cookie-secret-key-change-in-production',

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',

  // File Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : ['image/jpeg', 'image/png', 'image/webp'],

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  LOG_FILE: process.env.LOG_FILE || './logs/app.log',
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || '20m',
  LOG_MAX_FILES: process.env.LOG_MAX_FILES || '14d',

  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'RSSFeeder <noreply@rssfeeder.com>',

  // Cache
  CACHE_TTL: parseInt(process.env.CACHE_TTL) || 300,
  CACHE_MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE) || 1000,

  // External API
  USER_AGENT: process.env.USER_AGENT || 'RSSFeeder/1.0.0 (https://github.com/your-org/rssfeeder)',

  // Development/Debug
  DEBUG: process.env.DEBUG || 'rssfeeder:*',
  VERBOSE_LOGGING: process.env.VERBOSE_LOGGING === 'true',
  ENABLE_CORS: process.env.ENABLE_CORS !== 'false',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',

  // Database Migration
  MIGRATIONS_DIR: process.env.MIGRATIONS_DIR || './backend/db/migrations',
  SEEDS_DIR: process.env.SEEDS_DIR || './backend/db/seeds'
};

// Validate required configuration
const requiredConfigs = ['JWT_SECRET', 'COOKIE_SECRET'];
const missingConfigs = requiredConfigs.filter(key => !config[key] || config[key].includes('change-in-production'));

if (config.NODE_ENV === 'production' && missingConfigs.length > 0) {
  throw new Error(`Missing required configuration: ${missingConfigs.join(', ')}`);
}

module.exports = config; 