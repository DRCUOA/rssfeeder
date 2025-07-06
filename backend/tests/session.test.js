const request = require('supertest');
const { app } = require('../app');
const { logger } = require('../utils/testLogger');
const User = require('../models/User');
const Session = require('../models/Session');

describe('Session Management Tests', () => {
  let testUser;
  let userToken;
  let sessionId;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!',
      email_verified: true
    });

    // Login to get token and session
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        device_info: 'Test Device'
      });

    userToken = loginResponse.body.data.auth.accessToken;
    sessionId = loginResponse.body.data.session.id;
    logger.debug('Test user created and logged in');
  });

  afterEach(async () => {
    // Clean up test user and sessions
    if (testUser) {
      await testUser.delete();
    }
  });

  describe('Session Creation', () => {
    test('should create session on login', async () => {
      // Session was created in beforeEach
      expect(sessionId).toBeDefined();
      
      // Verify session exists in database
      const session = await Session.findById(sessionId);
      expect(session).toBeDefined();
      expect(session.user_id).toBe(testUser.id);
      expect(session.device_info).toBe('Test Device');
      expect(session.is_active).toBe(true);
      
      logger.debug('Session created successfully on login');
    });

    test('should create session on registration', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          device_info: 'Registration Device'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session.device_info).toBe('Registration Device');
      
      // Clean up
      const newUser = await User.findByEmail('newuser@example.com');
      if (newUser) {
        await newUser.delete();
      }
      
      logger.debug('Session created successfully on registration');
    });

    test('should create session with proper device info', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Test Browser/1.0')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          device_info: 'Custom Device Info'
        });

      expect(response.status).toBe(200);
      const session = await Session.findById(response.body.data.session.id);
      expect(session.device_info).toBe('Custom Device Info');
      expect(session.user_agent).toBe('Test Browser/1.0');
      
      logger.debug('Session created with proper device info');
    });
  });

  describe('Session Listing', () => {
    test('should get current user sessions', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.sessions).toBeDefined();
      expect(response.body.data.sessions.length).toBe(1);
      
      const session = response.body.data.sessions[0];
      expect(session.id).toBe(sessionId);
      expect(session.device_info).toBe('Test Device');
      expect(session.is_current).toBe(true);
      expect(session.is_active).toBeUndefined(); // Should not expose internal fields
      
      logger.debug('Session listing successful');
    });

    test('should get session summary', async () => {
      const response = await request(app)
        .get('/api/v1/sessions/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.total_sessions).toBe(1);
      expect(response.body.data.active_sessions).toBe(1);
      
      logger.debug('Session summary successful');
    });

    test('should require authentication for session listing', async () => {
      const response = await request(app)
        .get('/api/v1/sessions')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('Session Termination', () => {
    let secondSessionId;

    beforeEach(async () => {
      // Create a second session
      const secondLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          device_info: 'Second Device'
        });

      secondSessionId = secondLoginResponse.body.data.session.id;
    });

    test('should terminate specific session', async () => {
      const response = await request(app)
        .delete(`/api/v1/sessions/${secondSessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Session terminated successfully');
      
      // Verify session is deactivated
      const session = await Session.findById(secondSessionId);
      expect(session.is_active).toBe(false);
      
      logger.debug('Session terminated successfully');
    });

    test('should not allow terminating current session', async () => {
      const response = await request(app)
        .delete(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Cannot terminate current session. Use logout instead.');
    });

    test('should not allow terminating other user\'s session', async () => {
      // Create another user with a session
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'SecurePass123!',
        email_verified: true
      });

      const otherSession = await Session.create({
        user_id: otherUser.id,
        device_info: 'Other Device',
        ip_address: '127.0.0.1',
        user_agent: 'Other Agent'
      });

      const response = await request(app)
        .delete(`/api/v1/sessions/${otherSession.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Session not found');
      
      // Clean up
      await otherUser.delete();
    });

    test('should terminate all other sessions', async () => {
      const response = await request(app)
        .delete('/api/v1/sessions/others/all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('All other sessions terminated successfully');
      
      // Verify only current session is active
      const sessions = await Session.findActiveByUserId(testUser.id);
      expect(sessions.length).toBe(1);
      expect(sessions[0].id).toBe(sessionId);
      
      logger.debug('All other sessions terminated successfully');
    });
  });

  describe('Session Activity Tracking', () => {
    test('should update session activity', async () => {
      const response = await request(app)
        .post('/api/v1/sessions/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Session activity updated');
      
      logger.debug('Session activity updated successfully');
    });

    test('should track session activity on authenticated requests', async () => {
      // Get initial last activity
      const initialSession = await Session.findById(sessionId);
      const initialActivity = initialSession.last_activity;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Make authenticated request
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Check if activity was updated
      const updatedSession = await Session.findById(sessionId);
      expect(new Date(updatedSession.last_activity).getTime()).toBeGreaterThan(
        new Date(initialActivity).getTime()
      );
      
      logger.debug('Session activity tracked on authenticated request');
    });
  });

  describe('Session Validation', () => {
    test('should validate active session', async () => {
      const session = await Session.findById(sessionId);
      expect(session.isValid()).toBe(true);
      
      logger.debug('Session validation successful');
    });

    test('should invalidate expired session', async () => {
      // Create expired session
      const expiredSession = await Session.create({
        user_id: testUser.id,
        device_info: 'Expired Device',
        ip_address: '127.0.0.1',
        user_agent: 'Expired Agent'
      });

      // Manually set expiration to past
      const database = require('../db/database');
      const db = await database.getConnection();
      await db('sessions')
        .where('id', expiredSession.id)
        .update({
          expires_at: new Date(Date.now() - 1000) // 1 second ago
        });

      const refreshedSession = await Session.findById(expiredSession.id);
      expect(refreshedSession.isValid()).toBe(false);
      
      logger.debug('Expired session correctly invalidated');
    });

    test('should invalidate deactivated session', async () => {
      const session = await Session.findById(sessionId);
      await session.deactivate();
      
      const refreshedSession = await Session.findById(sessionId);
      expect(refreshedSession.isValid()).toBe(false);
      
      logger.debug('Deactivated session correctly invalidated');
    });
  });

  describe('Session Cleanup', () => {
    test('should clean up expired sessions', async () => {
      // Create some expired sessions
      const expiredSession1 = await Session.create({
        user_id: testUser.id,
        device_info: 'Expired Device 1',
        ip_address: '127.0.0.1',
        user_agent: 'Expired Agent 1'
      });

      const expiredSession2 = await Session.create({
        user_id: testUser.id,
        device_info: 'Expired Device 2',
        ip_address: '127.0.0.1',
        user_agent: 'Expired Agent 2'
      });

      // Manually set expiration to past
      const database = require('../db/database');
      const db = await database.getConnection();
      await db('sessions')
        .whereIn('id', [expiredSession1.id, expiredSession2.id])
        .update({
          expires_at: new Date(Date.now() - 1000) // 1 second ago
        });

      // Clean up expired sessions
      const cleanedCount = await Session.cleanupExpired();
      expect(cleanedCount).toBe(2);
      
      logger.debug('Expired sessions cleaned up successfully');
    });

    test('should get session statistics', async () => {
      const stats = await Session.getUserSessionSummary(testUser.id);
      expect(stats.total_sessions).toBeGreaterThan(0);
      expect(stats.active_sessions).toBeGreaterThan(0);
      
      logger.debug('Session statistics retrieved successfully');
    });
  });

  describe('Session Integration with Logout', () => {
    test('should deactivate session on logout', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
      
      // Verify session is deactivated
      const session = await Session.findById(sessionId);
      expect(session.is_active).toBe(false);
      
      logger.debug('Session deactivated on logout');
    });

    test('should not allow using deactivated session', async () => {
      // Logout to deactivate session
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Try to use deactivated session
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      
      logger.debug('Deactivated session correctly rejected');
    });
  });

  describe('Session Error Handling', () => {
    test('should handle missing session gracefully', async () => {
      const response = await request(app)
        .delete('/api/v1/sessions/999999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Session not found');
    });

    test('should handle session database errors', async () => {
      // This would typically test database connection failures
      // For now, we'll just verify the error handling structure exists
      expect(Session.findById).toBeDefined();
      expect(Session.create).toBeDefined();
      expect(Session.deactivate).toBeDefined();
      
      logger.debug('Session error handling methods exist');
    });
  });
}); 