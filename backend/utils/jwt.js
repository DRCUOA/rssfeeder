const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { logger } = require('./logger');
const { AuthenticationError, ValidationError } = require('../middlewares/errorHandler');

/**
 * JWT Utilities
 * Handles JWT token generation, validation, and management
 */
class JWTUtils {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration time
   * @returns {string} - JWT access token
   */
  static generateAccessToken(payload, expiresIn = config.JWT_EXPIRES_IN) {
    try {
      // Add unique identifier and precise timestamp to ensure uniqueness
      const uniquePayload = {
        ...payload,
        jti: crypto.randomUUID(), // Unique JWT ID
        iat: Math.floor(Date.now() / 1000), // Issued at (seconds)
        nonce: crypto.randomBytes(8).toString('hex') // Additional randomness
      };

      const token = jwt.sign(uniquePayload, config.JWT_SECRET, {
        expiresIn,
        issuer: 'rssfeeder',
        audience: 'rssfeeder-users'
      });
      
      logger.debug('Access token generated successfully', { userId: payload.id });
      return token;
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw new Error('Access token generation failed');
    }
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration time
   * @returns {string} - JWT refresh token
   */
  static generateRefreshToken(payload, expiresIn = config.JWT_REFRESH_EXPIRES_IN) {
    try {
      // Add unique identifier and precise timestamp to ensure uniqueness
      const uniquePayload = {
        ...payload,
        jti: crypto.randomUUID(), // Unique JWT ID
        iat: Math.floor(Date.now() / 1000), // Issued at (seconds)
        nonce: crypto.randomBytes(8).toString('hex') // Additional randomness
      };

      const token = jwt.sign(uniquePayload, config.JWT_SECRET, {
        expiresIn,
        issuer: 'rssfeeder',
        audience: 'rssfeeder-refresh'
      });
      
      logger.debug('Refresh token generated successfully', { userId: payload.id });
      return token;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} - Object containing both tokens
   */
  static generateTokenPair(user) {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      const accessToken = this.generateAccessToken(payload);
      const refreshToken = this.generateRefreshToken(payload);

      logger.info('Token pair generated successfully', { userId: user.id });
      
      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: config.JWT_EXPIRES_IN
      };
    } catch (error) {
      logger.error('Error generating token pair:', error);
      throw new Error('Token pair generation failed');
    }
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @param {string} audience - Expected audience
   * @returns {Object} - Decoded token payload
   */
  static verifyToken(token, audience = 'rssfeeder-users') {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        issuer: 'rssfeeder',
        audience: audience
      });

      logger.debug('Token verified successfully', { userId: decoded.id });
      return decoded;
    } catch (error) {
      logger.warn('Token verification failed:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new AuthenticationError('Token not active');
      } else {
        throw new AuthenticationError('Token verification failed');
      }
    }
  }

  /**
   * Verify access token
   * @param {string} token - Access token to verify
   * @returns {Object} - Decoded token payload
   */
  static verifyAccessToken(token) {
    return this.verifyToken(token, 'rssfeeder-users');
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token to verify
   * @returns {Object} - Decoded token payload
   */
  static verifyRefreshToken(token) {
    return this.verifyToken(token, 'rssfeeder-refresh');
  }

  /**
   * Decode token without verification (for inspection purposes)
   * @param {string} token - JWT token to decode
   * @returns {Object|null} - Decoded token payload or null
   */
  static decodeToken(token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      return decoded;
    } catch (error) {
      logger.warn('Token decoding failed:', error.message);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - Extracted token or null
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    // Split on spaces and filter out empty parts to handle extra spaces
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} - Expiration date or null
   */
  static getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      if (decoded && decoded.payload.exp) {
        return new Date(decoded.payload.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.warn('Error getting token expiration:', error.message);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} - True if token is expired
   */
  static isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) {
        return true;
      }
      return new Date() > expiration;
    } catch (error) {
      logger.warn('Error checking token expiration:', error.message);
      return true;
    }
  }

  /**
   * Generate a secure random token (for additional security purposes)
   * @param {number} length - Token length in bytes
   * @returns {string} - Random token in hex format
   */
  static generateSecureToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Error generating secure token:', error);
      throw new Error('Secure token generation failed');
    }
  }

  /**
   * Create token blacklist entry (for logout functionality)
   * @param {string} token - Token to blacklist
   * @returns {Object} - Blacklist entry
   */
  static createBlacklistEntry(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) {
        throw new ValidationError('Invalid token for blacklisting');
      }

      const entry = {
        jti: decoded.payload.jti || crypto.randomUUID(),
        token: token,
        userId: decoded.payload.id,
        expiresAt: new Date(decoded.payload.exp * 1000),
        blacklistedAt: new Date()
      };

      logger.debug('Token blacklist entry created', { userId: entry.userId, jti: entry.jti });
      return entry;
    } catch (error) {
      logger.error('Error creating blacklist entry:', error);
      throw new Error('Token blacklist entry creation failed');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Object} - New token pair
   */
  static refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      // Generate new access token
      const payload = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      };

      const newAccessToken = this.generateAccessToken(payload);
      
      logger.info('Access token refreshed successfully', { userId: decoded.id });
      
      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken, // Keep the same refresh token
        tokenType: 'Bearer',
        expiresIn: config.JWT_EXPIRES_IN
      };
    } catch (error) {
      logger.error('Error refreshing access token:', error);
      throw error; // Re-throw to preserve specific error types
    }
  }

  /**
   * Validate token structure and basic properties
   * @param {string} token - Token to validate
   * @returns {boolean} - True if token structure is valid
   */
  static validateTokenStructure(token) {
    try {
      if (!token || typeof token !== 'string') {
        return false;
      }

      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Each part should be valid base64url encoded (no +, /, or = padding)
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;
      for (const part of parts) {
        if (!part || !base64urlRegex.test(part)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.warn('Token structure validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get token payload without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object|null} - Token payload or null
   */
  static getTokenPayload(token) {
    try {
      const decoded = this.decodeToken(token);
      return decoded ? decoded.payload : null;
    } catch (error) {
      logger.warn('Error getting token payload:', error.message);
      return null;
    }
  }

  /**
   * Calculate token time remaining
   * @param {string} token - JWT token
   * @returns {number|null} - Time remaining in milliseconds or null
   */
  static getTokenTimeRemaining(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) {
        return null;
      }
      
      const now = new Date();
      const remaining = expiration.getTime() - now.getTime();
      
      return Math.max(0, remaining);
    } catch (error) {
      logger.warn('Error calculating token time remaining:', error.message);
      return null;
    }
  }

  /**
   * Check if token needs refresh (within 5 minutes of expiration)
   * @param {string} token - JWT token
   * @returns {boolean} - True if token needs refresh
   */
  static shouldRefreshToken(token) {
    try {
      const timeRemaining = this.getTokenTimeRemaining(token);
      if (timeRemaining === null) {
        return true;
      }
      
      // Refresh if less than 5 minutes remaining
      const fiveMinutes = 5 * 60 * 1000;
      return timeRemaining < fiveMinutes;
    } catch (error) {
      logger.warn('Error checking if token needs refresh:', error.message);
      return true;
    }
  }
}

module.exports = JWTUtils; 