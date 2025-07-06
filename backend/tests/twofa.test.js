const request = require('supertest');
const { app } = require('../app');
const { logger } = require('../utils/testLogger');
const User = require('../models/User');

describe('2FA (Two-Factor Authentication) Tests', () => {
  let testUser;
  let userToken;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!',
      email_verified: true
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

    userToken = loginResponse.body.data.auth.accessToken;
    logger.debug('Test user created and logged in');
  });

  afterEach(async () => {
    // Clean up test user
    if (testUser) {
      await testUser.delete();
    }
  });

  describe('2FA Setup', () => {
    test('should generate 2FA setup data', async () => {
      const response = await request(app)
        .get('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('secret');
      expect(response.body.data).toHaveProperty('qr_code');
      expect(response.body.data).toHaveProperty('manual_entry_key');
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.qr_code).toMatch(/^data:image\/png;base64,/);
      
      logger.debug('2FA setup data generated successfully');
    });

    test('should not allow unauthenticated access to 2FA setup', async () => {
      const response = await request(app)
        .get('/api/v1/auth/2fa/setup')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('2FA Enable', () => {
    let twoFaSecret;

    beforeEach(async () => {
      // Get 2FA setup data
      const setupResponse = await request(app)
        .get('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`);
      
      twoFaSecret = setupResponse.body.data.secret;
    });

    test('should enable 2FA with valid token', async () => {
      // Generate a valid TOTP token
      const speakeasy = require('speakeasy');
      const token = speakeasy.totp({
        secret: twoFaSecret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          secret: twoFaSecret,
          token: token
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('backup_codes');
      expect(response.body.data.backup_codes).toHaveLength(10);
      expect(response.body.data.backup_codes[0]).toMatch(/^[A-Z0-9]{8}$/);
      
      // Check that user's 2FA is enabled
      const updatedUser = await User.findById(testUser.id);
      expect(updatedUser.twofa_enabled).toBe(true);
      
      logger.debug('2FA enabled successfully');
    });

    test('should reject invalid 2FA token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          secret: twoFaSecret,
          token: '000000'
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid 2FA token');
    });

    test('should reject missing secret', async () => {
      const response = await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: '123456'
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Secret and token are required');
    });
  });

  describe('2FA Disable', () => {
    beforeEach(async () => {
      // Enable 2FA first
      const setupResponse = await request(app)
        .get('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`);
      
      const twoFaSecret = setupResponse.body.data.secret;
      const speakeasy = require('speakeasy');
      const token = speakeasy.totp({
        secret: twoFaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          secret: twoFaSecret,
          token: token
        });
    });

    test('should disable 2FA with valid credentials', async () => {
      const speakeasy = require('speakeasy');
      const updatedUser = await User.findById(testUser.id);
      const token = speakeasy.totp({
        secret: updatedUser.twofa_secret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          password: 'SecurePass123!',
          twofa_token: token
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('2FA disabled successfully');
      
      // Check that user's 2FA is disabled
      const finalUser = await User.findById(testUser.id);
      expect(finalUser.twofa_enabled).toBe(false);
      
      logger.debug('2FA disabled successfully');
    });

    test('should reject invalid password', async () => {
      const speakeasy = require('speakeasy');
      const updatedUser = await User.findById(testUser.id);
      const token = speakeasy.totp({
        secret: updatedUser.twofa_secret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          password: 'WrongPassword',
          twofa_token: token
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid password or 2FA token');
    });
  });

  describe('2FA Verification', () => {
    beforeEach(async () => {
      // Enable 2FA first
      const setupResponse = await request(app)
        .get('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`);
      
      const twoFaSecret = setupResponse.body.data.secret;
      const speakeasy = require('speakeasy');
      const token = speakeasy.totp({
        secret: twoFaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          secret: twoFaSecret,
          token: token
        });
    });

    test('should verify valid 2FA token', async () => {
      const speakeasy = require('speakeasy');
      const updatedUser = await User.findById(testUser.id);
      const token = speakeasy.totp({
        secret: updatedUser.twofa_secret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: token
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('2FA token verified successfully');
      
      logger.debug('2FA token verified successfully');
    });

    test('should reject invalid 2FA token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: '000000'
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid 2FA token');
    });

    test('should verify backup code', async () => {
      // Get backup codes
      const updatedUser = await User.findById(testUser.id);
      const backupCodes = JSON.parse(updatedUser.twofa_backup_codes);
      const backupCode = backupCodes[0];

      const response = await request(app)
        .post('/api/v1/auth/2fa/verify')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: backupCode
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Backup code verified successfully');
      
      logger.debug('Backup code verified successfully');
    });
  });

  describe('2FA Status', () => {
    test('should get 2FA status when disabled', async () => {
      const response = await request(app)
        .get('/api/v1/auth/2fa/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.backup_codes_count).toBe(0);
    });

    test('should get 2FA status when enabled', async () => {
      // Enable 2FA first
      const setupResponse = await request(app)
        .get('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`);
      
      const twoFaSecret = setupResponse.body.data.secret;
      const speakeasy = require('speakeasy');
      const token = speakeasy.totp({
        secret: twoFaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          secret: twoFaSecret,
          token: token
        });

      const response = await request(app)
        .get('/api/v1/auth/2fa/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.backup_codes_count).toBe(10);
    });
  });

  describe('2FA Login Flow', () => {
    beforeEach(async () => {
      // Enable 2FA first
      const setupResponse = await request(app)
        .get('/api/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${userToken}`);
      
      const twoFaSecret = setupResponse.body.data.secret;
      const speakeasy = require('speakeasy');
      const token = speakeasy.totp({
        secret: twoFaSecret,
        encoding: 'base32'
      });

      await request(app)
        .post('/api/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          secret: twoFaSecret,
          token: token
        });
    });

    test('should require 2FA token during login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.requires_2fa).toBe(true);
      expect(response.body.message).toBe('2FA token is required');
    });

    test('should login with valid 2FA token', async () => {
      const speakeasy = require('speakeasy');
      const updatedUser = await User.findById(testUser.id);
      const token = speakeasy.totp({
        secret: updatedUser.twofa_secret,
        encoding: 'base32'
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          twofa_token: token
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.auth.accessToken).toBeDefined();
      expect(response.body.data.session).toBeDefined();
      
      logger.debug('2FA login successful');
    });

    test('should reject invalid 2FA token during login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          twofa_token: '000000'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_2FA_TOKEN');
    });
  });
}); 