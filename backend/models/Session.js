const crypto = require('crypto');
const { db } = require('../db/database');
const { ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('../utils/logger');
const config = require('../config');

/**
 * Session Model
 * Handles user session management and tracking
 */
class Session {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.session_token = data.session_token;
    this.refresh_token = data.refresh_token;
    this.device_info = data.device_info;
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
    this.last_activity = data.last_activity;
    this.expires_at = data.expires_at;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Create a new session
   * @param {Object} sessionData - Session data
   * @returns {Promise<Session>} - Created session instance
   */
  static async create(sessionData) {
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      const sessionToCreate = {
        user_id: sessionData.user_id,
        session_token: sessionToken,
        refresh_token: sessionData.refresh_token || null,
        device_info: sessionData.device_info || null,
        ip_address: sessionData.ip_address || null,
        user_agent: sessionData.user_agent || null,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const [sessionId] = await db('Session').insert(sessionToCreate);
      const createdSession = await Session.findById(sessionId);

      logger.info(`Session created for user ${sessionData.user_id}: ${sessionToken}`);
      return createdSession;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw new Error('Session creation failed');
    }
  }

  /**
   * Find session by ID
   * @param {number} id - Session ID
   * @returns {Promise<Session|null>} - Session instance or null
   */
  static async findById(id) {
    try {
      const sessionData = await db('Session').where('id', id).first();
      return sessionData ? new Session(sessionData) : null;
    } catch (error) {
      logger.error('Error finding session by ID:', error);
      throw new Error('Session lookup failed');
    }
  }

  /**
   * Find session by token
   * @param {string} token - Session token
   * @returns {Promise<Session|null>} - Session instance or null
   */
  static async findByToken(token) {
    try {
      const sessionData = await db('Session')
        .where('session_token', token)
        .where('is_active', true)
        .first();
      return sessionData ? new Session(sessionData) : null;
    } catch (error) {
      logger.error('Error finding session by token:', error);
      throw new Error('Session lookup failed');
    }
  }

  /**
   * Find active sessions for user
   * @param {number} userId - User ID
   * @returns {Promise<Session[]>} - Array of active sessions
   */
  static async findActiveByUserId(userId) {
    try {
      const sessions = await db('Session')
        .where('user_id', userId)
        .where('is_active', true)
        .where('expires_at', '>', new Date().toISOString())
        .orderBy('last_activity', 'desc');

      return sessions.map(sessionData => new Session(sessionData));
    } catch (error) {
      logger.error('Error finding user sessions:', error);
      throw new Error('Session lookup failed');
    }
  }

  /**
   * Update session activity
   * @returns {Promise<void>}
   */
  async updateActivity() {
    try {
      const now = new Date().toISOString();
      
      await db('Session').where('id', this.id).update({
        last_activity: now,
        updated_at: now
      });

      this.last_activity = now;
      this.updated_at = now;
    } catch (error) {
      logger.error('Error updating session activity:', error);
      throw new Error('Session activity update failed');
    }
  }

  /**
   * Deactivate session
   * @returns {Promise<void>}
   */
  async deactivate() {
    try {
      await db('Session').where('id', this.id).update({
        is_active: false,
        updated_at: new Date().toISOString()
      });

      this.is_active = false;
      this.updated_at = new Date().toISOString();

      logger.info(`Session deactivated: ${this.session_token}`);
    } catch (error) {
      logger.error('Error deactivating session:', error);
      throw new Error('Session deactivation failed');
    }
  }

  /**
   * Check if session is valid
   * @returns {boolean} - True if session is valid
   */
  isValid() {
    if (!this.is_active) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(this.expires_at);
    
    return now < expiresAt;
  }

  /**
   * Deactivate all sessions for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Number of deactivated sessions
   */
  static async deactivateAllForUser(userId) {
    try {
      const count = await db('Session')
        .where('user_id', userId)
        .where('is_active', true)
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        });

      logger.info(`Deactivated ${count} sessions for user ${userId}`);
      return count;
    } catch (error) {
      logger.error('Error deactivating user sessions:', error);
      throw new Error('Session deactivation failed');
    }
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} - Number of cleaned sessions
   */
  static async cleanupExpired() {
    try {
      const count = await db('Session')
        .where('expires_at', '<', new Date().toISOString())
        .orWhere('is_active', false)
        .del();

      if (count > 0) {
        logger.info(`Cleaned up ${count} expired sessions`);
      }
      
      return count;
    } catch (error) {
      logger.error('Error cleaning up sessions:', error);
      throw new Error('Session cleanup failed');
    }
  }

  /**
   * Get session summary for user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Session summary
   */
  static async getUserSessionSummary(userId) {
    try {
      const sessions = await Session.findActiveByUserId(userId);
      
      return {
        total_sessions: sessions.length,
        current_devices: sessions.map(session => ({
          id: session.id,
          device_info: session.device_info,
          ip_address: session.ip_address,
          last_activity: session.last_activity,
          created_at: session.created_at
        }))
      };
    } catch (error) {
      logger.error('Error getting session summary:', error);
      throw new Error('Session summary failed');
    }
  }

  /**
   * Delete session
   * @returns {Promise<boolean>} - Success status
   */
  async delete() {
    try {
      const deletedRows = await db('Session').where('id', this.id).del();
      
      if (deletedRows === 0) {
        throw new ValidationError('Session not found or already deleted');
      }
      
      logger.info(`Session deleted: ${this.session_token}`);
      return true;
    } catch (error) {
      logger.error('Error deleting session:', error);
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('Session deletion failed');
    }
  }
}

module.exports = Session; 