const database = require('../db/database');
const { logger } = require('../utils/logger');

/**
 * TokenBlacklist Model
 * Handles token blacklisting and revocation
 */
class TokenBlacklist {
  constructor(data = {}) {
    this.id = data.id || null;
    this.token_id = data.token_id || null;
    this.user_id = data.user_id || null;
    this.reason = data.reason || null;
    this.expires_at = data.expires_at || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Create a new token blacklist entry
   * @param {Object} tokenData - Token data to blacklist
   * @param {string} reason - Reason for blacklisting
   * @returns {Promise<TokenBlacklist>} - Created blacklist entry
   */
  static async create(tokenData, reason = 'user_logout') {
    try {
      const db = database.db;
      
      const [id] = await db('token_blacklist').insert({
        token_id: tokenData.jti,
        user_id: tokenData.userId,
        reason: reason,
        expires_at: tokenData.expiresAt,
        created_at: new Date(),
        updated_at: new Date()
      });

      logger.info(`Token blacklisted: ${tokenData.jti} for user ${tokenData.userId}`);
      
      return new TokenBlacklist({ id, ...tokenData, reason });
    } catch (error) {
      logger.error('Error creating token blacklist entry:', error);
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} tokenId - Token ID to check
   * @returns {Promise<boolean>} - True if token is blacklisted
   */
  static async isBlacklisted(tokenId) {
    try {
      const db = database.db;
      
      const result = await db('token_blacklist')
        .where('token_id', tokenId)
        .where('expires_at', '>', new Date())
        .first();
      
      return !!result;
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false; // Fail safe - don't block access on error
    }
  }

  /**
   * Blacklist all tokens for a user
   * @param {number} userId - User ID
   * @param {string} reason - Reason for blacklisting
   * @returns {Promise<number>} - Number of tokens blacklisted
   */
  static async blacklistUserTokens(userId, reason = 'security_action') {
    try {
      const db = database.db;
      
      // Get all active sessions for user
      const sessions = await db('Session')
        .where('user_id', userId)
        .where('is_active', true)
        .where('expires_at', '>', new Date());
      
      let blacklistedCount = 0;
      
      // Blacklist tokens for each session
      // Note: This is a simplified approach - in production you'd want to 
      // track actual token IDs more precisely
      for (const session of sessions) {
        await db('token_blacklist').insert({
          token_id: `session_${session.id}`,
          user_id: userId,
          reason: reason,
          expires_at: session.expires_at,
          created_at: new Date(),
          updated_at: new Date()
        });
        blacklistedCount++;
      }
      
      // Also deactivate all sessions
      await db('Session')
        .where('user_id', userId)
        .where('is_active', true)
        .update({
          is_active: false,
          updated_at: new Date()
        });
      
      logger.info(`Blacklisted ${blacklistedCount} tokens for user ${userId}`);
      
      return blacklistedCount;
    } catch (error) {
      logger.error('Error blacklisting user tokens:', error);
      throw new Error('Failed to blacklist user tokens');
    }
  }

  /**
   * Clean up expired blacklist entries
   * @returns {Promise<number>} - Number of entries cleaned up
   */
  static async cleanupExpired() {
    try {
      const db = database.db;
      
      const deletedCount = await db('token_blacklist')
        .where('expires_at', '<', new Date())
        .del();
      
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired blacklist entries`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired blacklist entries:', error);
      throw new Error('Failed to cleanup expired blacklist entries');
    }
  }

  /**
   * Get blacklist statistics
   * @returns {Promise<Object>} - Blacklist statistics
   */
  static async getStatistics() {
    try {
      const db = database.db;
      
      const stats = await db('token_blacklist')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN expires_at > ? THEN 1 END) as active', [new Date()]),
          db.raw('COUNT(CASE WHEN expires_at <= ? THEN 1 END) as expired', [new Date()])
        )
        .first();
      
      return {
        total: parseInt(stats.total) || 0,
        active: parseInt(stats.active) || 0,
        expired: parseInt(stats.expired) || 0
      };
    } catch (error) {
      logger.error('Error getting blacklist statistics:', error);
      throw new Error('Failed to get blacklist statistics');
    }
  }

  /**
   * Get user blacklist entries
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of blacklist entries
   */
  static async getUserBlacklist(userId) {
    try {
      const db = database.db;
      
      const entries = await db('token_blacklist')
        .where('user_id', userId)
        .orderBy('created_at', 'desc')
        .limit(50);
      
      return entries.map(entry => new TokenBlacklist(entry));
    } catch (error) {
      logger.error('Error getting user blacklist:', error);
      throw new Error('Failed to get user blacklist');
    }
  }
}

module.exports = TokenBlacklist; 