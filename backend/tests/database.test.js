const { 
  db, 
  testConnection, 
  runMigrations, 
  rollbackMigrations, 
  getMigrationStatus,
  initializeDatabase,
  transaction,
  healthCheck 
} = require('../db/database');

describe('Database Tests', () => {
  
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    // Clean up database connection
    await db.destroy();
  });

  describe('Database Connection', () => {
    test('should establish database connection successfully', async () => {
      const result = await testConnection();
      expect(result).toBe(true);
    });

    test('should perform health check successfully', async () => {
      const health = await healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Database Migrations', () => {
    test('should run migrations successfully', async () => {
      const result = await runMigrations();
      expect(result).toHaveProperty('batchNo');
      expect(result).toHaveProperty('migrations');
      expect(Array.isArray(result.migrations)).toBe(true);
    });

    test('should get migration status', async () => {
      const status = await getMigrationStatus();
      expect(status).toHaveProperty('currentVersion');
      expect(status).toHaveProperty('pendingMigrations');
      expect(Array.isArray(status.pendingMigrations)).toBe(true);
    });

    test('should rollback migrations successfully', async () => {
      // First ensure we have migrations to rollback
      await runMigrations();
      
      const result = await rollbackMigrations();
      expect(result).toHaveProperty('batchNo');
      expect(result).toHaveProperty('migrations');
      expect(Array.isArray(result.migrations)).toBe(true);
      
      // Re-run migrations for other tests
      await runMigrations();
    });
  });

  describe('Database Schema', () => {
    test('should have all required tables after migration', async () => {
      const tables = await db.raw(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'knex_migrations'
      `);
      
      const tableNames = tables.map(row => row.name);
      const expectedTables = [
        'User',
        'Feed',
        'FeedItem',
        'Category',
        'ItemCategory',
        'UserFeedSubscription',
        'ReadState',
        'Bookmark',
        'Nugget',
        'PollLog'
      ];
      
      expectedTables.forEach(tableName => {
        expect(tableNames).toContain(tableName);
      });
    });

    test('should have correct User table structure', async () => {
      const userTableInfo = await db.raw(`PRAGMA table_info(User)`);
      const columns = userTableInfo.map(col => col.name);
      
      const expectedColumns = [
        'id', 'name', 'email', 'avatar_url', 'dark_mode', 'text_size',
        'theme_color', 'push_notifications', 'email_notifications',
        'new_feed_alerts', 'data_collection', 'created_at', 'updated_at'
      ];
      
      expectedColumns.forEach(column => {
        expect(columns).toContain(column);
      });
    });

    test('should have correct Feed table structure', async () => {
      const feedTableInfo = await db.raw(`PRAGMA table_info(Feed)`);
      const columns = feedTableInfo.map(col => col.name);
      
      const expectedColumns = [
        'id', 'name', 'url', 'status', 'fetch_interval',
        'last_fetched_at', 'created_at', 'updated_at'
      ];
      
      expectedColumns.forEach(column => {
        expect(columns).toContain(column);
      });
    });
  });

  describe('Database Operations', () => {
    test('should insert and retrieve data from User table', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        dark_mode: 0,
        text_size: 2,
        theme_color: 'blue'
      };
      
      const [userId] = await db('User').insert(userData);
      expect(userId).toBeDefined();
      
      const user = await db('User').where('id', userId).first();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.theme_color).toBe(userData.theme_color);
    });

    test('should insert and retrieve data from Feed table', async () => {
      const feedData = {
        name: 'Test Feed',
        url: 'https://example.com/feed.xml',
        status: 'active',
        fetch_interval: 3600
      };
      
      const [feedId] = await db('Feed').insert(feedData);
      expect(feedId).toBeDefined();
      
      const feed = await db('Feed').where('id', feedId).first();
      expect(feed.name).toBe(feedData.name);
      expect(feed.url).toBe(feedData.url);
      expect(feed.status).toBe(feedData.status);
    });

    test('should enforce unique constraint on email', async () => {
      const userData = {
        name: 'Test User 2',
        email: 'duplicate@example.com',
        theme_color: 'green'
      };
      
      // Insert first user
      await db('User').insert(userData);
      
      // Try to insert duplicate email
      await expect(db('User').insert({
        ...userData,
        name: 'Different Name'
      })).rejects.toThrow();
    });

    test('should enforce unique constraint on feed URL', async () => {
      const feedData = {
        name: 'Test Feed 2',
        url: 'https://duplicate.com/feed.xml',
        status: 'active'
      };
      
      // Insert first feed
      await db('Feed').insert(feedData);
      
      // Try to insert duplicate URL
      await expect(db('Feed').insert({
        ...feedData,
        name: 'Different Name'
      })).rejects.toThrow();
    });
  });

  describe('Database Transactions', () => {
    test('should commit transaction successfully', async () => {
      const result = await transaction(async (trx) => {
        const [userId] = await trx('User').insert({
          name: 'Transaction User',
          email: 'transaction@example.com',
          theme_color: 'red'
        });
        
        const user = await trx('User').where('id', userId).first();
        return user;
      });
      
      expect(result.name).toBe('Transaction User');
      expect(result.email).toBe('transaction@example.com');
      
      // Verify the user was actually saved
      const savedUser = await db('User').where('email', 'transaction@example.com').first();
      expect(savedUser).toBeDefined();
    });

    test('should rollback transaction on error', async () => {
      const initialCount = await db('User').count('id as count').first();
      
      await expect(transaction(async (trx) => {
        await trx('User').insert({
          name: 'Rollback User',
          email: 'rollback@example.com',
          theme_color: 'purple'
        });
        
        // Force an error
        throw new Error('Test error');
      })).rejects.toThrow('Test error');
      
      // Verify no user was added
      const finalCount = await db('User').count('id as count').first();
      expect(finalCount.count).toBe(initialCount.count);
    });
  });

  describe('Database Initialization', () => {
    test('should initialize database successfully', async () => {
      // This test ensures initializeDatabase doesn't throw
      await expect(initializeDatabase()).resolves.not.toThrow();
    });
  });

  describe('Foreign Key Constraints', () => {
    test('should enforce foreign key constraints', async () => {
      // Insert a user first
      const [userId] = await db('User').insert({
        name: 'FK Test User',
        email: 'fk@example.com',
        theme_color: 'yellow'
      });
      
      // Insert a feed
      const [feedId] = await db('Feed').insert({
        name: 'FK Test Feed',
        url: 'https://fk.com/feed.xml',
        status: 'active'
      });
      
      // Should be able to create subscription with valid foreign keys
      await expect(db('UserFeedSubscription').insert({
        user_id: userId,
        feed_id: feedId,
        created_at: new Date().toISOString()
      })).resolves.not.toThrow();
      
      // Should fail with invalid foreign key
      await expect(db('UserFeedSubscription').insert({
        user_id: 99999, // Non-existent user
        feed_id: feedId,
        created_at: new Date().toISOString()
      })).rejects.toThrow();
    });
  });
}); 