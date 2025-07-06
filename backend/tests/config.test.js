const config = require('../config');

describe('Configuration Tests', () => {
  
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Loading', () => {
    test('should load default configuration values', () => {
      // Clear environment variables
      delete process.env.PORT;
      delete process.env.NODE_ENV;
      delete process.env.DATABASE_URL;
      
      // Re-require config to get fresh instance
      const freshConfig = require('../config');
      
      expect(freshConfig.PORT).toBe(3000);
      expect(freshConfig.NODE_ENV).toBe('development');
      expect(freshConfig.DATABASE_URL).toBe('./data/rssfeeder-dev.db');
    });

    test('should override defaults with environment variables', () => {
      process.env.PORT = '4000';
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = './production.db';
      // Provide valid secrets for production validation
      process.env.JWT_SECRET = 'production-jwt-secret';
      process.env.COOKIE_SECRET = 'production-cookie-secret';
      
      // Clear module cache and re-require
      delete require.cache[require.resolve('../config')];
      const freshConfig = require('../config');
      
      expect(freshConfig.PORT).toBe(4000);
      expect(freshConfig.NODE_ENV).toBe('production');
      expect(freshConfig.DATABASE_URL).toBe('./production.db');
    });

    test('should parse integer values correctly', () => {
      process.env.PORT = '8080';
      process.env.DATABASE_POOL_MIN = '5';
      process.env.DATABASE_POOL_MAX = '20';
      process.env.BCRYPT_SALT_ROUNDS = '15';
      
      delete require.cache[require.resolve('../config')];
      const freshConfig = require('../config');
      
      expect(freshConfig.PORT).toBe(8080);
      expect(freshConfig.DATABASE_POOL_MIN).toBe(5);
      expect(freshConfig.DATABASE_POOL_MAX).toBe(20);
      expect(freshConfig.BCRYPT_SALT_ROUNDS).toBe(15);
    });

    test('should parse boolean values correctly', () => {
      process.env.VERBOSE_LOGGING = 'true';
      process.env.ENABLE_CORS = 'false';
      process.env.TRUST_PROXY = 'true';
      process.env.SMTP_SECURE = 'false';
      
      delete require.cache[require.resolve('../config')];
      const freshConfig = require('../config');
      
      expect(freshConfig.VERBOSE_LOGGING).toBe(true);
      expect(freshConfig.ENABLE_CORS).toBe(false);
      expect(freshConfig.TRUST_PROXY).toBe(true);
      expect(freshConfig.SMTP_SECURE).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    test('should have all required configuration keys', () => {
      const requiredKeys = [
        'NODE_ENV', 'PORT', 'FRONTEND_URL', 'DATABASE_URL', 'JWT_SECRET',
        'BCRYPT_SALT_ROUNDS', 'LOG_LEVEL', 'FEED_POLL_INTERVAL'
      ];
      
      requiredKeys.forEach(key => {
        expect(config).toHaveProperty(key);
        expect(config[key]).toBeDefined();
      });
    });

    test('should validate JWT secret in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'development-jwt-secret-key-change-in-production';
      
      expect(() => {
        delete require.cache[require.resolve('../config')];
        require('../config');
      }).toThrow('Missing required configuration: JWT_SECRET');
    });

    test('should validate cookie secret in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'proper-production-secret';
      process.env.COOKIE_SECRET = 'development-cookie-secret-key-change-in-production';
      
      expect(() => {
        delete require.cache[require.resolve('../config')];
        require('../config');
      }).toThrow('Missing required configuration: COOKIE_SECRET');
    });

    test('should not validate secrets in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'development-jwt-secret-key-change-in-production';
      process.env.COOKIE_SECRET = 'development-cookie-secret-key-change-in-production';
      
      expect(() => {
        delete require.cache[require.resolve('../config')];
        require('../config');
      }).not.toThrow();
    });
  });

  describe('Default Values', () => {
    test('should have correct default values for application settings', () => {
      expect(config.PORT).toBe(3000);
      expect(config.NODE_ENV).toBe('test'); // Jest sets NODE_ENV=test
      expect(config.FRONTEND_URL).toBe('http://localhost:5173');
    });

    test('should have correct default values for database settings', () => {
      expect(config.DATABASE_URL).toBe('./data/rssfeeder-dev.db');
      expect(config.DATABASE_POOL_MIN).toBe(2);
      expect(config.DATABASE_POOL_MAX).toBe(10);
    });

    test('should have correct default values for JWT settings', () => {
      expect(config.JWT_EXPIRES_IN).toBe('7d');
      expect(config.JWT_REFRESH_EXPIRES_IN).toBe('30d');
    });

    test('should have correct default values for security settings', () => {
      expect(config.BCRYPT_SALT_ROUNDS).toBe(10);
      expect(config.RATE_LIMIT_WINDOW).toBe(15);
      expect(config.RATE_LIMIT_MAX).toBe(100);
    });

    test('should have correct default values for feed settings', () => {
      expect(config.FEED_POLL_INTERVAL).toBe(300000);
      expect(config.FEED_POLL_CONCURRENCY).toBe(5);
      expect(config.FEED_TIMEOUT).toBe(30000);
      expect(config.FEED_MAX_ITEMS_PER_FEED).toBe(100);
    });

    test('should have correct default values for file upload settings', () => {
      expect(config.UPLOAD_DIR).toBe('./uploads');
      expect(config.MAX_FILE_SIZE).toBe(5242880);
      expect(config.ALLOWED_FILE_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    });

    test('should have correct default values for logging settings', () => {
      expect(config.LOG_LEVEL).toBe('debug');
      expect(config.LOG_FILE).toBe('./logs/app.log');
      expect(config.LOG_MAX_SIZE).toBe('20m');
      expect(config.LOG_MAX_FILES).toBe('14d');
    });

    test('should have correct default values for email settings', () => {
      expect(config.SMTP_HOST).toBe('smtp.gmail.com');
      expect(config.SMTP_PORT).toBe(587);
      expect(config.SMTP_SECURE).toBe(false);
      expect(config.SMTP_FROM).toBe('RSSFeeder <noreply@rssfeeder.com>');
    });
  });

  describe('Array Configuration', () => {
    test('should parse comma-separated values into arrays', () => {
      process.env.ALLOWED_FILE_TYPES = 'image/jpeg,image/png,image/gif,image/webp';
      
      delete require.cache[require.resolve('../config')];
      const freshConfig = require('../config');
      
      expect(freshConfig.ALLOWED_FILE_TYPES).toEqual([
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
      ]);
    });

    test('should handle empty array configuration', () => {
      // Clear the environment variable first, then set to empty string
      delete process.env.ALLOWED_FILE_TYPES;
      process.env.ALLOWED_FILE_TYPES = '';
      
      delete require.cache[require.resolve('../config')];
      const freshConfig = require('../config');
      
      expect(freshConfig.ALLOWED_FILE_TYPES).toEqual(['']);
    });
  });

  describe('Environment-Specific Settings', () => {
    test('should have development-specific settings', () => {
      // Clear NODE_ENV and set to development
      delete process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      delete require.cache[require.resolve('../config')];
      const freshConfig = require('../config');
      
      expect(freshConfig.NODE_ENV).toBe('development');
      expect(freshConfig.LOG_LEVEL).toBe('info'); // .env.development sets this to info
      expect(freshConfig.VERBOSE_LOGGING).toBe(false);
      expect(freshConfig.ENABLE_CORS).toBe(true);
    });

    test('should have production-safe defaults', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'production-jwt-secret';
      process.env.COOKIE_SECRET = 'production-cookie-secret';
      
      delete require.cache[require.resolve('../config')];
      const freshConfig = require('../config');
      
      expect(freshConfig.NODE_ENV).toBe('production');
      expect(freshConfig.BCRYPT_SALT_ROUNDS).toBe(10);
      expect(freshConfig.VERBOSE_LOGGING).toBe(false);
    });
  });

  describe('Configuration Types', () => {
    test('should have correct data types for all configuration values', () => {
      expect(typeof config.NODE_ENV).toBe('string');
      expect(typeof config.PORT).toBe('number');
      expect(typeof config.FRONTEND_URL).toBe('string');
      expect(typeof config.DATABASE_URL).toBe('string');
      expect(typeof config.DATABASE_POOL_MIN).toBe('number');
      expect(typeof config.DATABASE_POOL_MAX).toBe('number');
      expect(typeof config.JWT_SECRET).toBe('string');
      expect(typeof config.JWT_EXPIRES_IN).toBe('string');
      expect(typeof config.BCRYPT_SALT_ROUNDS).toBe('number');
      expect(typeof config.VERBOSE_LOGGING).toBe('boolean');
      expect(typeof config.ENABLE_CORS).toBe('boolean');
      expect(Array.isArray(config.ALLOWED_FILE_TYPES)).toBe(true);
    });
  });

  describe('Path Configuration', () => {
    test('should have correct path configurations', () => {
      expect(config.MIGRATIONS_DIR).toBe('./backend/db/migrations');
      expect(config.SEEDS_DIR).toBe('./backend/db/seeds');
      expect(config.UPLOAD_DIR).toBe('./uploads');
      expect(config.LOG_FILE).toBe('./logs/app.log');
    });
  });
}); 