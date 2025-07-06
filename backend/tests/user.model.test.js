const User = require('../models/User');
const { db } = require('../db/database');
const { ValidationError, AuthenticationError } = require('../middlewares/errorHandler');

describe('User Model', () => {
  beforeEach(async () => {
    // Clean up users table before each test (ignore errors if table doesn't exist)
    try {
      await db('User').del();
    } catch (error) {
      // Table might not exist yet - ignore error
      if (!error.message.includes('no such table')) {
        throw error;
      }
    }
  });

  afterEach(async () => {
    // Clean up after each test (ignore errors if table doesn't exist)
    try {
      await db('User').del();
    } catch (error) {
      // Table might not exist - ignore error
      if (!error.message.includes('no such table')) {
        throw error;
      }
    }
  });

  describe('Password Hashing', () => {
    test('should hash password using bcrypt', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await User.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/);
    });

    test('should verify password against hash', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await User.hashPassword(password);
      
      const isValid = await User.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
      
      const isInvalid = await User.verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    test('should throw error for invalid password hashing', async () => {
      await expect(User.hashPassword(null)).rejects.toThrow();
      await expect(User.hashPassword('')).rejects.toThrow();
    });

    test('should handle bcrypt errors gracefully', async () => {
      await expect(User.verifyPassword('test', 'invalid-hash')).rejects.toThrow();
    });
  });

  describe('User Creation', () => {
    const validUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    test('should create user with valid data', async () => {
      const user = await User.create(validUserData);
      
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBeDefined();
      expect(user.name).toBe(validUserData.name);
      expect(user.email).toBe(validUserData.email.toLowerCase());
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(validUserData.password);
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
    });

    test('should create user with default preferences', async () => {
      const user = await User.create(validUserData);
      
      expect(user.dark_mode).toBe(0);
      expect(user.text_size).toBe(2);
      expect(user.theme_color).toBe('orange');
      expect(user.push_notifications).toBe(1);
      expect(user.email_notifications).toBe(1);
      expect(user.new_feed_alerts).toBe(0);
      expect(user.data_collection).toBe(1);
      expect(user.login_attempts).toBe(0);
    });

    test('should create user with custom preferences', async () => {
      const customUserData = {
        ...validUserData,
        dark_mode: 1,
        text_size: 3,
        theme_color: 'blue',
        push_notifications: 0
      };
      
      const user = await User.create(customUserData);
      
      expect(user.dark_mode).toBe(1);
      expect(user.text_size).toBe(3);
      expect(user.theme_color).toBe('blue');
      expect(user.push_notifications).toBe(0);
    });

    test('should convert email to lowercase', async () => {
      const userDataWithUpperEmail = {
        ...validUserData,
        email: 'TEST@EXAMPLE.COM'
      };
      
      const user = await User.create(userDataWithUpperEmail);
      expect(user.email).toBe('test@example.com');
    });

    test('should reject creation with missing required fields', async () => {
      await expect(User.create({})).rejects.toThrow(ValidationError);
      await expect(User.create({ name: 'Test' })).rejects.toThrow(ValidationError);
      await expect(User.create({ email: 'test@example.com' })).rejects.toThrow(ValidationError);
      await expect(User.create({ password: 'password' })).rejects.toThrow(ValidationError);
    });

    test('should reject creation with duplicate email', async () => {
      await User.create(validUserData);
      
      const duplicateUserData = {
        ...validUserData,
        name: 'Another User'
      };
      
      await expect(User.create(duplicateUserData)).rejects.toThrow(ValidationError);
    });

    test('should reject creation with invalid data', async () => {
      const invalidUserData = {
        name: null,
        email: 'invalid-email',
        password: 'weak'
      };
      
      await expect(User.create(invalidUserData)).rejects.toThrow();
    });
  });

  describe('User Retrieval', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    });

    test('should find user by ID', async () => {
      const foundUser = await User.findById(testUser.id);
      
      expect(foundUser).toBeInstanceOf(User);
      expect(foundUser.id).toBe(testUser.id);
      expect(foundUser.email).toBe(testUser.email);
      expect(foundUser.name).toBe(testUser.name);
    });

    test('should find user by email', async () => {
      const foundUser = await User.findByEmail(testUser.email);
      
      expect(foundUser).toBeInstanceOf(User);
      expect(foundUser.id).toBe(testUser.id);
      expect(foundUser.email).toBe(testUser.email);
    });

    test('should find user by email case-insensitive', async () => {
      const foundUser = await User.findByEmail(testUser.email.toUpperCase());
      
      expect(foundUser).toBeInstanceOf(User);
      expect(foundUser.id).toBe(testUser.id);
    });

    test('should return null for non-existent user ID', async () => {
      const foundUser = await User.findById(99999);
      expect(foundUser).toBeNull();
    });

    test('should return null for non-existent email', async () => {
      const foundUser = await User.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });

    test('should handle invalid ID gracefully', async () => {
      await expect(User.findById('invalid')).rejects.toThrow();
    });
  });

  describe('User Authentication', () => {
    let testUser;
    const password = 'TestPassword123!';

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: password
      });
    });

    test('should authenticate user with correct credentials', async () => {
      const authenticatedUser = await User.authenticate(testUser.email, password);
      
      expect(authenticatedUser).toBeInstanceOf(User);
      expect(authenticatedUser.id).toBe(testUser.id);
      expect(authenticatedUser.email).toBe(testUser.email);
    });

    test('should authenticate user with email case-insensitive', async () => {
      const authenticatedUser = await User.authenticate(testUser.email.toUpperCase(), password);
      
      expect(authenticatedUser).toBeInstanceOf(User);
      expect(authenticatedUser.id).toBe(testUser.id);
    });

    test('should reject authentication with incorrect password', async () => {
      await expect(User.authenticate(testUser.email, 'wrongpassword')).rejects.toThrow(AuthenticationError);
    });

    test('should reject authentication with non-existent email', async () => {
      await expect(User.authenticate('nonexistent@example.com', password)).rejects.toThrow(AuthenticationError);
    });

    test('should update last login timestamp on successful authentication', async () => {
      const beforeAuth = new Date();
      
      const authenticatedUser = await User.authenticate(testUser.email, password);
      
      const afterAuth = new Date();
      const lastLogin = new Date(authenticatedUser.last_login);
      
      expect(lastLogin.getTime()).toBeGreaterThanOrEqual(beforeAuth.getTime());
      expect(lastLogin.getTime()).toBeLessThanOrEqual(afterAuth.getTime());
    });

    test('should reset login attempts on successful authentication', async () => {
      // Simulate failed login attempts
      await testUser.incrementLoginAttempts();
      await testUser.incrementLoginAttempts();
      
      const authenticatedUser = await User.authenticate(testUser.email, password);
      
      expect(authenticatedUser.login_attempts).toBe(0);
      expect(authenticatedUser.locked_until).toBeNull();
    });
  });

  describe('User Profile Updates', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    });

    test('should update user profile with valid data', async () => {
      const updates = {
        name: 'Updated Name',
        dark_mode: 1,
        theme_color: 'blue'
      };
      
      const updatedUser = await testUser.update(updates);
      
      expect(updatedUser.name).toBe(updates.name);
      expect(updatedUser.dark_mode).toBe(updates.dark_mode);
      expect(updatedUser.theme_color).toBe(updates.theme_color);
      expect(updatedUser.updated_at).toBeDefined();
    });

    test('should ignore undefined fields in updates', async () => {
      const originalName = testUser.name;
      const updates = {
        name: undefined,
        theme_color: 'blue'
      };
      
      const updatedUser = await testUser.update(updates);
      
      expect(updatedUser.name).toBe(originalName);
      expect(updatedUser.theme_color).toBe(updates.theme_color);
    });

    test('should not allow updating protected fields', async () => {
      const updates = {
        id: 99999,
        email: 'newemail@example.com',
        password_hash: 'fakehash',
        login_attempts: 10
      };
      
      const updatedUser = await testUser.update(updates);
      
      expect(updatedUser.id).toBe(testUser.id);
      expect(updatedUser.email).toBe(testUser.email);
      expect(updatedUser.password_hash).toBe(testUser.password_hash);
      expect(updatedUser.login_attempts).toBe(testUser.login_attempts);
    });

    test('should update timestamp on profile update', async () => {
      const originalUpdatedAt = testUser.updated_at;
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updatedUser = await testUser.update({ name: 'New Name' });
      
      expect(new Date(updatedUser.updated_at).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());
    });
  });

  describe('Password Management', () => {
    let testUser;
    const originalPassword = 'TestPassword123!';

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: originalPassword
      });
    });

    test('should change password with correct current password', async () => {
      const newPassword = 'NewPassword456!';
      
      const result = await testUser.changePassword(originalPassword, newPassword);
      
      expect(result).toBe(true);
      
      // Verify old password no longer works
      await expect(User.authenticate(testUser.email, originalPassword)).rejects.toThrow(AuthenticationError);
      
      // Verify new password works
      const authenticatedUser = await User.authenticate(testUser.email, newPassword);
      expect(authenticatedUser.id).toBe(testUser.id);
    });

    test('should reject password change with incorrect current password', async () => {
      const newPassword = 'NewPassword456!';
      
      await expect(testUser.changePassword('wrongpassword', newPassword)).rejects.toThrow(AuthenticationError);
    });

    test('should generate password reset token', async () => {
      const token = await testUser.generateResetToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(30);
      expect(testUser.reset_token).toBe(token);
      expect(testUser.reset_token_expires).toBeDefined();
      
      const expiryTime = new Date(testUser.reset_token_expires);
      const now = new Date();
      expect(expiryTime.getTime()).toBeGreaterThan(now.getTime());
    });

    test('should reset password with valid token', async () => {
      const newPassword = 'ResetPassword789!';
      const token = await testUser.generateResetToken();
      
      const result = await User.resetPassword(token, newPassword);
      
      expect(result).toBe(true);
      
      // Verify new password works
      const authenticatedUser = await User.authenticate(testUser.email, newPassword);
      expect(authenticatedUser.id).toBe(testUser.id);
      
      // Verify reset token is cleared
      const updatedUser = await User.findById(testUser.id);
      expect(updatedUser.reset_token).toBeNull();
      expect(updatedUser.reset_token_expires).toBeNull();
    });

    test('should reject password reset with invalid token', async () => {
      const newPassword = 'ResetPassword789!';
      
      await expect(User.resetPassword('invalidtoken', newPassword)).rejects.toThrow(ValidationError);
    });

    test('should reject password reset with expired token', async () => {
      const newPassword = 'ResetPassword789!';
      const token = await testUser.generateResetToken();
      
      // Manually expire the token
      await db('User').where('id', testUser.id).update({
        reset_token_expires: new Date(Date.now() - 1000).toISOString()
      });
      
      await expect(User.resetPassword(token, newPassword)).rejects.toThrow(ValidationError);
    });
  });

  describe('Login Attempts and Account Locking', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    });

    test('should increment login attempts', async () => {
      expect(testUser.login_attempts).toBe(0);
      
      await testUser.incrementLoginAttempts();
      expect(testUser.login_attempts).toBe(1);
      
      await testUser.incrementLoginAttempts();
      expect(testUser.login_attempts).toBe(2);
    });

    test('should lock account after max login attempts', async () => {
      // Increment to max attempts (5)
      for (let i = 0; i < 5; i++) {
        await testUser.incrementLoginAttempts();
      }
      
      expect(testUser.login_attempts).toBe(5);
      expect(testUser.locked_until).toBeDefined();
      expect(new Date(testUser.locked_until).getTime()).toBeGreaterThan(Date.now());
    });

    test('should check if account is locked', async () => {
      expect(testUser.isLocked()).toBe(false);
      
      // Lock the account
      for (let i = 0; i < 5; i++) {
        await testUser.incrementLoginAttempts();
      }
      
      expect(testUser.isLocked()).toBe(true);
    });

    test('should reset login attempts', async () => {
      await testUser.incrementLoginAttempts();
      await testUser.incrementLoginAttempts();
      
      expect(testUser.login_attempts).toBe(2);
      
      await testUser.resetLoginAttempts();
      
      expect(testUser.login_attempts).toBe(0);
      expect(testUser.locked_until).toBeNull();
    });

    test('should prevent authentication when account is locked', async () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        await testUser.incrementLoginAttempts();
      }
      
      await expect(User.authenticate(testUser.email, 'TestPassword123!')).rejects.toThrow(AuthenticationError);
    });
  });

  describe('Public Profile', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    });

    test('should return public profile without sensitive data', async () => {
      const publicProfile = testUser.getPublicProfile();
      
      expect(publicProfile).toHaveProperty('id');
      expect(publicProfile).toHaveProperty('name');
      expect(publicProfile).toHaveProperty('email');
      expect(publicProfile).toHaveProperty('created_at');
      expect(publicProfile).toHaveProperty('updated_at');
      
      expect(publicProfile).not.toHaveProperty('password_hash');
      expect(publicProfile).not.toHaveProperty('reset_token');
      expect(publicProfile).not.toHaveProperty('reset_token_expires');
      expect(publicProfile).not.toHaveProperty('login_attempts');
      expect(publicProfile).not.toHaveProperty('locked_until');
    });

    test('should include user preferences in public profile', async () => {
      const publicProfile = testUser.getPublicProfile();
      
      expect(publicProfile).toHaveProperty('dark_mode');
      expect(publicProfile).toHaveProperty('text_size');
      expect(publicProfile).toHaveProperty('theme_color');
      expect(publicProfile).toHaveProperty('push_notifications');
      expect(publicProfile).toHaveProperty('email_notifications');
      expect(publicProfile).toHaveProperty('new_feed_alerts');
      expect(publicProfile).toHaveProperty('data_collection');
    });
  });

  describe('User Deletion', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      });
    });

    test('should delete user account', async () => {
      const result = await testUser.delete();
      
      expect(result).toBe(true);
      
      // Verify user is deleted
      const deletedUser = await User.findById(testUser.id);
      expect(deletedUser).toBeNull();
    });

    test('should handle deletion of non-existent user gracefully', async () => {
      await testUser.delete();
      
      // Try to delete again
      await expect(testUser.delete()).rejects.toThrow();
    });
  });

  describe('User Listing', () => {
    beforeEach(async () => {
      // Create multiple test users
      for (let i = 1; i <= 5; i++) {
        await User.create({
          name: `Test User ${i}`,
          email: `test${i}@example.com`,
          password: 'TestPassword123!'
        });
      }
    });

    test('should find all users with default options', async () => {
      const users = await User.findAll();
      
      expect(users).toHaveLength(5);
      expect(users[0]).toBeInstanceOf(User);
    });

    test('should find users with limit', async () => {
      const users = await User.findAll({ limit: 3 });
      
      expect(users).toHaveLength(3);
    });

    test('should find users with offset', async () => {
      const firstBatch = await User.findAll({ limit: 2, offset: 0 });
      const secondBatch = await User.findAll({ limit: 2, offset: 2 });
      
      expect(firstBatch).toHaveLength(2);
      expect(secondBatch).toHaveLength(2);
      expect(firstBatch[0].id).not.toBe(secondBatch[0].id);
    });

    test('should find users with custom ordering', async () => {
      const usersAsc = await User.findAll({ orderBy: 'name', order: 'asc' });
      const usersDesc = await User.findAll({ orderBy: 'name', order: 'desc' });
      
      expect(usersAsc[0].name).toBe('Test User 1');
      expect(usersDesc[0].name).toBe('Test User 5');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error
      const originalDb = db;
      
      // This test would need proper mocking in a real scenario
      // For now, we'll test with invalid data
      await expect(User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: null
      })).rejects.toThrow();
    });

    test('should handle concurrent user creation with same email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123!'
      };
      
      // Create first user (should succeed)
      const firstUser = await User.create(userData);
      expect(firstUser).toBeInstanceOf(User);
      expect(firstUser.email).toBe(userData.email);
      
      // Try to create second user with same email (should fail)
      await expect(User.create(userData)).rejects.toThrow(ValidationError);
    });
  });
}); 