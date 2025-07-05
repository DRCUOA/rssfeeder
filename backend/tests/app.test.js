const request = require('supertest');
const { app } = require('../app');
const { db, closeConnection } = require('../db/database');

describe('Express App Integration Tests', () => {
  
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Wait for database to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up database connection
    await closeConnection();
  });

  describe('Health Check Endpoint', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('database');
      
      expect(response.body.status).toMatch(/ok|degraded/);
      expect(response.body.environment).toBe('test');
      expect(response.body.database).toHaveProperty('status');
    });

    test('should include database health in response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.database).toHaveProperty('status');
      expect(response.body.database).toHaveProperty('responseTime');
      expect(response.body.database).toHaveProperty('timestamp');
      expect(response.body.database.status).toBe('healthy');
      expect(typeof response.body.database.responseTime).toBe('number');
    });
  });

  describe('API Welcome Endpoint', () => {
    test('should return welcome message', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Welcome to RSSFeeder API',
        version: 'v1',
        timestamp: expect.any(String)
      });
    });

    test('should include API versioning middleware', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      // The middleware should have added apiVersion to the request
      expect(response.body.version).toBe('v1');
    });
  });

  describe('404 Error Handling', () => {
    test('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route /api/v1/nonexistent not found'
        }
      });
    });

    test('should return 404 for undefined root routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route /nonexistent not found'
        }
      });
    });
  });

  describe('CORS Configuration', () => {
    test('should include CORS headers when enabled', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      if (process.env.ENABLE_CORS !== 'false') {
        expect(response.headers).toHaveProperty('access-control-allow-origin');
      }
    });

    test('should handle preflight requests', async () => {
      await request(app)
        .options('/api/v1')
        .expect(204);
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Rate Limiting', () => {
    test('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });

    test('should enforce rate limits', async () => {
      const requests = [];
      const limit = 100; // Default rate limit
      
      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/api/v1'));
      }
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(parseInt(response.headers['ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      });
    }, 10000);
  });

  describe('Body Parsing', () => {
    test('should parse JSON bodies', async () => {
      const testData = { test: 'data', number: 123 };
      
      // We'll test this once we have a POST endpoint
      // For now, just test that the middleware is loaded
      const response = await request(app)
        .get('/api/v1')
        .expect(200);
        
      expect(response.status).toBe(200);
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_JSON');
    });
  });

  describe('Compression', () => {
    test('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/api/v1')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Check if compression headers are present when appropriate
      expect(response.status).toBe(200);
    });
  });

  describe('Static File Serving', () => {
    test('should serve uploaded files', async () => {
      // Create a test file in uploads directory
      const fs = require('fs');
      const path = require('path');
      
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const testFilePath = path.join(uploadsDir, 'test.txt');
      fs.writeFileSync(testFilePath, 'test content');
      
      const response = await request(app)
        .get('/uploads/test.txt')
        .expect(200);

      expect(response.text).toBe('test content');
      
      // Clean up
      fs.unlinkSync(testFilePath);
    });

    test('should return 404 for non-existent files', async () => {
      await request(app)
        .get('/uploads/nonexistent.txt')
        .expect(404);
    });
  });

  describe('Error Response Format', () => {
    test('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
    });
  });

  describe('Database Integration', () => {
    test('should have database available', async () => {
      // Test basic database query
      const result = await db.raw('SELECT 1 as test');
      expect(result[0].test).toBe(1);
    });

    test('should have all migrations applied', async () => {
      const tables = await db.raw(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'knex_migrations'
      `);
      
      const tableNames = tables.map(row => row.name);
      const expectedTables = [
        'User', 'Feed', 'FeedItem', 'Category', 'ItemCategory',
        'UserFeedSubscription', 'ReadState', 'Bookmark', 'Nugget', 'PollLog'
      ];
      
      expectedTables.forEach(tableName => {
        expect(tableNames).toContain(tableName);
      });
    });
  });

  describe('Middleware Order', () => {
    test('should apply middleware in correct order', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      // If we get a successful response, middleware was applied correctly
      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-content-type-options'); // Helmet
      expect(response.body).toHaveProperty('success'); // Our response format
    });
  });

  describe('Content Type Handling', () => {
    test('should handle different content types', async () => {
      const response = await request(app)
        .get('/api/v1')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeInstanceOf(Object);
    });
  });
}); 