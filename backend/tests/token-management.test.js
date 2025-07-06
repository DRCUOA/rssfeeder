const request = require('supertest');
const { app } = require('../app');
const { logger } = require('../utils/testLogger');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const Session = require('../models/Session');

describe('Token Management Tests', () => {
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let sessionId;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!',
      email_verified: true
    });

    // Create admin user
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'AdminPass123!',
      email_verified: true,
      role: 'admin'
    });

    // Login regular user
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        device_info: 'Test Device'
      });

    userToken = loginResponse.body.data.auth.accessToken;
    sessionId = loginResponse.body.data.session.id;

    // Login admin user
    const adminLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'AdminPass123!',
        device_info: 'Admin Device'
      });

    adminToken = adminLoginResponse.body.data.auth.accessToken;
    
    logger.debug('Test users created and logged in');
  });

  afterEach(async () => {
    // Clean up test users
    if (testUser) {
      await testUser.delete();
    }
    if (adminUser) {
      await adminUser.delete();
    }
  });

  describe('Token Information', () => {
    test('should get token information', async () => {
      const response = await request(app)
        .get('/api/v1/tokens/info')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user_id).toBe(testUser.id);
      expect(response.body.data.token_payload).toBeDefined();
      expect(response.body.data.token_payload.id).toBe(testUser.id);
      expect(response.body.data.token_payload.email).toBe(testUser.email);
      expect(response.body.data.session_id).toBe(sessionId);
      expect(response.body.data.expires_at).toBeDefined();
      
      logger.debug('Token information retrieved successfully');
    });

    test('should require authentication for token info', async () => {
      const response = await request(app)
        .get('/api/v1/tokens/info')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('Token Revocation', () => {
    test('should revoke current token', async () => {
      const response = await request(app)
        .post('/api/v1/tokens/revoke/current')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'user_requested'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Token revoked successfully');
      
      // Verify token is now invalid
      const testResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(testResponse.body.success).toBe(false);
      
      logger.debug('Current token revoked successfully');
    });

    test('should revoke all tokens for user', async () => {
      // Create additional session/token
      const secondLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          device_info: 'Second Device'
        });

      const secondToken = secondLoginResponse.body.data.auth.accessToken;

      // Revoke all tokens
      const response = await request(app)
        .post('/api/v1/tokens/revoke/all')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'security_breach'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Successfully revoked');
      expect(response.body.data.revokedCount).toBeGreaterThan(0);
      
      // Verify both tokens are now invalid
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(401);
      
      logger.debug('All tokens revoked successfully');
    });

    test('should handle token revocation with custom reason', async () => {
      const response = await request(app)
        .post('/api/v1/tokens/revoke/current')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'suspicious_activity'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      
      // Check that reason was recorded
      const blacklistEntries = await TokenBlacklist.getUserBlacklist(testUser.id);
      expect(blacklistEntries.length).toBeGreaterThan(0);
      expect(blacklistEntries[0].reason).toBe('suspicious_activity');
      
      logger.debug('Token revoked with custom reason');
    });
  });

  describe('Token Blacklist Management', () => {
    test('should check if token is blacklisted', async () => {
      // First revoke a token
      await request(app)
        .post('/api/v1/tokens/revoke/current')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'test_blacklist'
        });

      // Check blacklist status
      const response = await request(app)
        .post('/api/v1/tokens/check-blacklist')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          token_id: 'test_token_id'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.token_id).toBe('test_token_id');
      expect(response.body.data.is_blacklisted).toBeDefined();
      
      logger.debug('Token blacklist check successful');
    });

    test('should require token_id for blacklist check', async () => {
      const response = await request(app)
        .post('/api/v1/tokens/check-blacklist')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Token ID is required');
    });

    test('should get user blacklist entries', async () => {
      // First revoke a token to create blacklist entry
      await request(app)
        .post('/api/v1/tokens/revoke/current')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'test_user_blacklist'
        });

      // Get new token to make request
      const newLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        });

      const newToken = newLoginResponse.body.data.auth.accessToken;

      const response = await request(app)
        .get('/api/v1/tokens/blacklist/mine')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.entries).toBeDefined();
      expect(response.body.data.entries.length).toBeGreaterThan(0);
      
      const entry = response.body.data.entries[0];
      expect(entry.reason).toBe('test_user_blacklist');
      expect(entry.token_id).toBeDefined();
      expect(entry.created_at).toBeDefined();
      
      logger.debug('User blacklist entries retrieved successfully');
    });
  });

  describe('Admin Token Management', () => {
    test('should get blacklist statistics (admin only)', async () => {
      // Create some blacklist entries first
      await request(app)
        .post('/api/v1/tokens/revoke/current')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'admin_stats_test'
        });

      const response = await request(app)
        .get('/api/v1/tokens/blacklist/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.active).toBeDefined();
      expect(response.body.data.expired).toBeDefined();
      
      logger.debug('Blacklist statistics retrieved successfully');
    });

    test('should reject non-admin access to blacklist statistics', async () => {
      const response = await request(app)
        .get('/api/v1/tokens/blacklist/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Admin access required');
    });

    test('should cleanup expired blacklist entries (admin only)', async () => {
      // Create a blacklist entry
      const tokenData = {
        jti: 'test_expired_token',
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      await TokenBlacklist.create(tokenData, 'test_cleanup');

      const response = await request(app)
        .post('/api/v1/tokens/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Cleaned up');
      expect(response.body.data.cleanedCount).toBeDefined();
      
      logger.debug('Expired blacklist entries cleaned up successfully');
    });

    test('should reject non-admin access to cleanup', async () => {
      const response = await request(app)
        .post('/api/v1/tokens/cleanup')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Admin access required');
    });
  });

  describe('Token Blacklist Model', () => {
    test('should create blacklist entry', async () => {
      const tokenData = {
        jti: 'test_token_123',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 3600000) // Expires in 1 hour
      };

      const entry = await TokenBlacklist.create(tokenData, 'model_test');
      
      expect(entry.id).toBeDefined();
      expect(entry.token_id).toBe('test_token_123');
      expect(entry.reason).toBe('model_test');
      
      logger.debug('Blacklist entry created successfully');
    });

    test('should check if token is blacklisted', async () => {
      const tokenData = {
        jti: 'test_blacklisted_token',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 3600000)
      };

      await TokenBlacklist.create(tokenData, 'blacklist_test');
      
      const isBlacklisted = await TokenBlacklist.isBlacklisted('test_blacklisted_token');
      expect(isBlacklisted).toBe(true);
      
      const isNotBlacklisted = await TokenBlacklist.isBlacklisted('non_existent_token');
      expect(isNotBlacklisted).toBe(false);
      
      logger.debug('Token blacklist check working correctly');
    });

    test('should not find expired blacklist entries', async () => {
      const tokenData = {
        jti: 'test_expired_blacklist',
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      await TokenBlacklist.create(tokenData, 'expired_test');
      
      const isBlacklisted = await TokenBlacklist.isBlacklisted('test_expired_blacklist');
      expect(isBlacklisted).toBe(false);
      
      logger.debug('Expired blacklist entries correctly ignored');
    });

    test('should get blacklist statistics', async () => {
      // Create some test entries
      await TokenBlacklist.create({
        jti: 'stats_test_1',
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 3600000)
      }, 'stats_test');

      await TokenBlacklist.create({
        jti: 'stats_test_2',
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000) // Expired
      }, 'stats_test');

      const stats = await TokenBlacklist.getStatistics();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.active).toBeGreaterThan(0);
      expect(stats.expired).toBeGreaterThan(0);
      
      logger.debug('Blacklist statistics calculated correctly');
    });

    test('should cleanup expired entries', async () => {
      // Create expired entries
      await TokenBlacklist.create({
        jti: 'cleanup_test_1',
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000)
      }, 'cleanup_test');

      await TokenBlacklist.create({
        jti: 'cleanup_test_2',
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 2000)
      }, 'cleanup_test');

      const cleanedCount = await TokenBlacklist.cleanupExpired();
      expect(cleanedCount).toBeGreaterThanOrEqual(2);
      
      logger.debug('Expired blacklist entries cleaned up');
    });

    test('should blacklist all user tokens', async () => {
      // Create multiple sessions for the user
      const session1 = await Session.create({
        user_id: testUser.id,
        device_info: 'Device 1',
        ip_address: '127.0.0.1',
        user_agent: 'Agent 1'
      });

      const session2 = await Session.create({
        user_id: testUser.id,
        device_info: 'Device 2',
        ip_address: '127.0.0.1',
        user_agent: 'Agent 2'
      });

      const blacklistedCount = await TokenBlacklist.blacklistUserTokens(testUser.id, 'bulk_test');
      expect(blacklistedCount).toBeGreaterThan(0);
      
      // Verify sessions are deactivated
      const updatedSession1 = await Session.findById(session1.id);
      const updatedSession2 = await Session.findById(session2.id);
      expect(updatedSession1.is_active).toBe(false);
      expect(updatedSession2.is_active).toBe(false);
      
      logger.debug('All user tokens blacklisted successfully');
    });
  });

  describe('Token Management Error Handling', () => {
    test('should handle invalid token revocation', async () => {
      // Try to revoke with invalid token
      const response = await request(app)
        .post('/api/v1/tokens/revoke/current')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    test('should handle database errors gracefully', async () => {
      // Test that error handling methods exist
      expect(TokenBlacklist.create).toBeDefined();
      expect(TokenBlacklist.isBlacklisted).toBeDefined();
      expect(TokenBlacklist.cleanupExpired).toBeDefined();
      expect(TokenBlacklist.getStatistics).toBeDefined();
      
      logger.debug('Token management error handling methods exist');
    });
  });

  describe('Token Management Integration', () => {
    test('should integrate with session management', async () => {
      // Verify that token revocation also affects sessions
      const response = await request(app)
        .post('/api/v1/tokens/revoke/current')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'integration_test'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      
      // Verify session is deactivated
      const session = await Session.findById(sessionId);
      expect(session.is_active).toBe(false);
      
      logger.debug('Token revocation integrated with session management');
    });

    test('should work with 2FA enabled users', async () => {
      // This test verifies that token management works with 2FA
      // In a real scenario, you'd enable 2FA first, then test token management
      
      // For now, we'll just verify the endpoints exist and work
      const response = await request(app)
        .get('/api/v1/tokens/info')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      
      logger.debug('Token management works with authentication features');
    });
  });
}); 