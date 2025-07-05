const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../db/database');
const { ValidationError, AuthenticationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');
const config = require('../config');

/**
 * User Model
 * Handles user authentication, password hashing, and user management
 */
class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.avatar_url = data.avatar_url;
    this.dark_mode = data.dark_mode;
    this.text_size = data.text_size;
    this.theme_color = data.theme_color;
    this.push_notifications = data.push_notifications;
    this.email_notifications = data.email_notifications;
    this.new_feed_alerts = data.new_feed_alerts;
    this.data_collection = data.data_collection;
    this.password_hash = data.password_hash;
    this.reset_token = data.reset_token;
    this.reset_token_expires = data.reset_token_expires;
    this.last_login = data.last_login;
    this.login_attempts = data.login_attempts;
    this.locked_until = data.locked_until;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password) {
    // Validate password input
    if (!password || typeof password !== 'string' || password.trim() === '') {
      throw new ValidationError('Password is required and cannot be empty');
    }
    
    try {
      const saltRounds = config.BCRYPT_SALT_ROUNDS;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      logger.error('Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if password matches
   */
  static async verifyPassword(password, hash) {
    // Validate inputs
    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password is required');
    }
    
    if (!hash || typeof hash !== 'string') {
      throw new ValidationError('Hash is required');
    }
    
    // Check if hash has valid bcrypt format (starts with $2a$, $2b$, $2x$, $2y$, etc.)
    const bcryptHashRegex = /^\$2[abxy]?\$\d+\$.{53}$/;
    if (!bcryptHashRegex.test(hash)) {
      throw new ValidationError('Invalid hash format');
    }
    
    try {
      const isValid = await bcrypt.compare(password, hash);
      logger.debug(`Password verification: ${isValid ? 'success' : 'failure'}`);
      return isValid;
    } catch (error) {
      logger.error('Error verifying password:', error);
      throw new Error('Password verification failed');
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data including password
   * @returns {Promise<User>} - Created user instance
   */
  static async create(userData) {
    try {
      // Validate required fields
      if (!userData.name || !userData.email || !userData.password) {
        throw new ValidationError('Name, email, and password are required');
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const password_hash = await User.hashPassword(userData.password);

      // Create user data
      const userToCreate = {
        name: userData.name,
        email: userData.email.toLowerCase(),
        password_hash,
        avatar_url: userData.avatar_url || null,
        dark_mode: userData.dark_mode !== undefined ? userData.dark_mode : 0,
        text_size: userData.text_size !== undefined ? userData.text_size : 2,
        theme_color: userData.theme_color || 'orange',
        push_notifications: userData.push_notifications !== undefined ? userData.push_notifications : 1,
        email_notifications: userData.email_notifications !== undefined ? userData.email_notifications : 1,
        new_feed_alerts: userData.new_feed_alerts !== undefined ? userData.new_feed_alerts : 0,
        data_collection: userData.data_collection !== undefined ? userData.data_collection : 1,
        login_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const [userId] = await db('User').insert(userToCreate);
      
      const createdUser = await User.findById(userId);
      
      logger.info(`User created successfully: ${createdUser.email}`);
      return createdUser;
    } catch (error) {
      logger.error('Error creating user:', error);
      
      // Handle database constraint violations (e.g., duplicate email)
      if (error.code === 'SQLITE_CONSTRAINT' || error.errno === 19) {
        throw new ValidationError('User with this email already exists');
      }
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new Error('User creation failed');
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<User|null>} - User instance or null
   */
  static async findById(id) {
    // Validate ID input
    if (!id || (typeof id !== 'number' && !Number.isInteger(parseInt(id)))) {
      throw new ValidationError('Invalid user ID provided');
    }
    
    try {
      const userData = await db('User').where('id', id).first();
      return userData ? new User(userData) : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw new Error('User lookup failed');
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} - User instance or null
   */
  static async findByEmail(email) {
    try {
      const userData = await db('User').where('email', email.toLowerCase()).first();
      return userData ? new User(userData) : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw new Error('User lookup failed');
    }
  }

  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<User>} - Authenticated user
   */
  static async authenticate(email, password) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check if account is locked
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        throw new AuthenticationError('Account is temporarily locked. Please try again later.');
      }

      // Verify password
      const isValid = await User.verifyPassword(password, user.password_hash);
      if (!isValid) {
        await user.incrementLoginAttempts();
        throw new AuthenticationError('Invalid credentials');
      }

      // Reset login attempts and update last login
      await user.resetLoginAttempts();
      await user.updateLastLogin();

      logger.info(`User authenticated successfully: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Fields to update
   * @returns {Promise<User>} - Updated user instance
   */
  async update(updates) {
    try {
      // Filter out protected fields
      const allowedUpdates = {
        name: updates.name,
        avatar_url: updates.avatar_url,
        dark_mode: updates.dark_mode,
        text_size: updates.text_size,
        theme_color: updates.theme_color,
        push_notifications: updates.push_notifications,
        email_notifications: updates.email_notifications,
        new_feed_alerts: updates.new_feed_alerts,
        data_collection: updates.data_collection,
        updated_at: new Date().toISOString()
      };

      // Remove undefined fields
      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key] === undefined) {
          delete allowedUpdates[key];
        }
      });

      await db('User').where('id', this.id).update(allowedUpdates);
      
      // Update current instance
      Object.assign(this, allowedUpdates);
      
      logger.info(`User updated successfully: ${this.email}`);
      return this;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw new Error('User update failed');
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  async changePassword(currentPassword, newPassword) {
    try {
      // Verify current password
      const isValid = await User.verifyPassword(currentPassword, this.password_hash);
      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await User.hashPassword(newPassword);

      // Update password
      await db('User').where('id', this.id).update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      });

      this.password_hash = newPasswordHash;
      
      logger.info(`Password changed successfully for user: ${this.email}`);
      return true;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Generate password reset token
   * @returns {Promise<string>} - Reset token
   */
  async generateResetToken() {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour from now

      await db('User').where('id', this.id).update({
        reset_token: token,
        reset_token_expires: expires.toISOString(),
        updated_at: new Date().toISOString()
      });

      this.reset_token = token;
      this.reset_token_expires = expires.toISOString();
      
      logger.info(`Password reset token generated for user: ${this.email}`);
      return token;
    } catch (error) {
      logger.error('Error generating reset token:', error);
      throw new Error('Reset token generation failed');
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  static async resetPassword(token, newPassword) {
    try {
      const user = await db('User').where('reset_token', token).first();
      if (!user) {
        throw new ValidationError('Invalid reset token');
      }

      // Check if token has expired
      if (new Date() > new Date(user.reset_token_expires)) {
        throw new ValidationError('Reset token has expired');
      }

      // Hash new password
      const newPasswordHash = await User.hashPassword(newPassword);

      // Update password and clear reset token
      await db('User').where('id', user.id).update({
        password_hash: newPasswordHash,
        reset_token: null,
        reset_token_expires: null,
        login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      });

      logger.info(`Password reset successfully for user: ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Increment login attempts and lock account if necessary
   * @returns {Promise<void>}
   */
  async incrementLoginAttempts() {
    try {
      const attempts = (this.login_attempts || 0) + 1;
      const maxAttempts = config.MAX_LOGIN_ATTEMPTS || 5;
      
      const updates = {
        login_attempts: attempts,
        updated_at: new Date().toISOString()
      };

      // Lock account if max attempts reached
      if (attempts >= maxAttempts) {
        const lockDuration = config.ACCOUNT_LOCK_DURATION || 300000; // 5 minutes
        updates.locked_until = new Date(Date.now() + lockDuration).toISOString();
        logger.warn(`Account locked for user: ${this.email}`);
      }

      await db('User').where('id', this.id).update(updates);
      Object.assign(this, updates);
    } catch (error) {
      logger.error('Error incrementing login attempts:', error);
      throw new Error('Login attempt tracking failed');
    }
  }

  /**
   * Reset login attempts
   * @returns {Promise<void>}
   */
  async resetLoginAttempts() {
    try {
      const updates = {
        login_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      };

      await db('User').where('id', this.id).update(updates);
      Object.assign(this, updates);
    } catch (error) {
      logger.error('Error resetting login attempts:', error);
      throw new Error('Login attempt reset failed');
    }
  }

  /**
   * Update last login timestamp
   * @returns {Promise<void>}
   */
  async updateLastLogin() {
    try {
      const lastLogin = new Date().toISOString();
      
      await db('User').where('id', this.id).update({
        last_login: lastLogin,
        updated_at: lastLogin
      });

      this.last_login = lastLogin;
      this.updated_at = lastLogin;
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw new Error('Last login update failed');
    }
  }

  /**
   * Get user's public profile (without sensitive data)
   * @returns {Object} - Public user data
   */
  getPublicProfile() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      avatar_url: this.avatar_url,
      dark_mode: this.dark_mode,
      text_size: this.text_size,
      theme_color: this.theme_color,
      push_notifications: this.push_notifications,
      email_notifications: this.email_notifications,
      new_feed_alerts: this.new_feed_alerts,
      data_collection: this.data_collection,
      last_login: this.last_login,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Check if user is locked
   * @returns {boolean} - True if account is locked
   */
  isLocked() {
    if (!this.locked_until) {
      return false;
    }
    return new Date() < new Date(this.locked_until);
  }

  /**
   * Get all users (admin function)
   * @param {Object} options - Query options
   * @returns {Promise<User[]>} - Array of users
   */
  static async findAll(options = {}) {
    try {
      const { limit = 50, offset = 0, orderBy = 'created_at', order = 'desc' } = options;
      
      const users = await db('User')
        .select('*')
        .orderBy(orderBy, order)
        .limit(limit)
        .offset(offset);

      return users.map(userData => new User(userData));
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw new Error('User listing failed');
    }
  }

  /**
   * Delete user account
   * @returns {Promise<boolean>} - Success status
   */
  async delete() {
    try {
      const deletedRows = await db('User').where('id', this.id).del();
      
      if (deletedRows === 0) {
        throw new ValidationError('User not found or already deleted');
      }
      
      logger.info(`User deleted successfully: ${this.email}`);
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('User deletion failed');
    }
  }
}

module.exports = User; 