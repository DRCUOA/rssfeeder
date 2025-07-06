const JWTUtils = require('../utils/jwt');
const User = require('../models/User');
const Session = require('../models/Session');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');
const { logger } = require('../utils/logger');

/**
 * Authentication Middleware
 * Handles JWT token verification and user context for protected routes
 */
class AuthMiddleware {
  /**
   * Authenticate user using JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async authenticate(req, res, next) {
    try {
      const start = Date.now();
      
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      const token = JWTUtils.extractTokenFromHeader(authHeader);
      
      if (!token) {
        throw new AuthenticationError('No token provided');
      }

      // Verify token structure
      if (!JWTUtils.validateTokenStructure(token)) {
        throw new AuthenticationError('Invalid token format');
      }

      // Verify token and get payload
      const decoded = JWTUtils.verifyAccessToken(token);
      
      // Get user from database
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Check if user account is locked
      if (user.isLocked()) {
        throw new AuthenticationError('Account is temporarily locked');
      }

      // Check if there's a session token in the payload
      if (decoded.sessionId) {
        // Validate session
        const session = await Session.findById(decoded.sessionId);
        if (!session || !session.isValid() || session.user_id !== user.id) {
          throw new AuthenticationError('Invalid session');
        }
        
        // Update session activity
        await Session.updateActivity(decoded.sessionId);
        
        // Attach session info to request
        req.session = session;
        req.sessionId = decoded.sessionId;
        req.sessionToken = session.session_token;
      }

      // Attach user to request
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;

      const duration = Date.now() - start;
      logger.debug(`Authentication successful for user ${user.id} (${duration}ms)`);
      
      next();
    } catch (error) {
      logger.warn('Authentication failed:', error.message);
      
      // Return appropriate error response
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: error.message
          }
        });
      }
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Authentication process failed'
        }
      });
    }
  }

  /**
   * Optional authentication - sets user context if token is valid, but doesn't require it
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async optionalAuthenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = JWTUtils.extractTokenFromHeader(authHeader);
      
      if (!token) {
        // No token provided, continue without authentication
        req.user = null;
        req.token = null;
        req.tokenPayload = null;
        return next();
      }

      // Try to authenticate
      const decoded = JWTUtils.verifyAccessToken(token);
      const user = await User.findById(decoded.id);
      
      if (user && !user.isLocked()) {
        req.user = user;
        req.token = token;
        req.tokenPayload = decoded;
        logger.debug(`Optional authentication successful for user ${user.id}`);
      } else {
        req.user = null;
        req.token = null;
        req.tokenPayload = null;
      }
      
      next();
    } catch (error) {
      // Log the error but don't fail the request
      logger.debug('Optional authentication failed:', error.message);
      req.user = null;
      req.token = null;
      req.tokenPayload = null;
      next();
    }
  }

  /**
   * Require specific user roles or permissions
   * @param {string[]} requiredRoles - Array of required roles
   * @returns {Function} - Express middleware function
   */
  static requireRole(...requiredRoles) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthenticationError('Authentication required');
        }

        // For now, we'll implement a simple role system
        // In the future, this could be expanded with a proper role-based access control
        const userRole = req.user.role || 'user';
        
        if (!requiredRoles.includes(userRole)) {
          throw new AuthorizationError('Insufficient permissions');
        }

        next();
      } catch (error) {
        logger.warn('Role authorization failed:', error.message);
        
        if (error instanceof AuthenticationError) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: error.message
            }
          });
        }
        
        if (error instanceof AuthorizationError) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: error.message
            }
          });
        }
        
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Authorization process failed'
          }
        });
      }
    };
  }

  /**
   * Require resource ownership (user can only access their own resources)
   * @param {string} userIdParam - Parameter name containing user ID
   * @returns {Function} - Express middleware function
   */
  static requireOwnership(userIdParam = 'userId') {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw new AuthenticationError('Authentication required');
        }

        const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
        
        if (!resourceUserId) {
          throw new AuthorizationError('Resource user ID not provided');
        }

        if (parseInt(resourceUserId) !== req.user.id) {
          throw new AuthorizationError('Access denied - resource belongs to another user');
        }

        next();
      } catch (error) {
        logger.warn('Ownership authorization failed:', error.message);
        
        if (error instanceof AuthenticationError) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: error.message
            }
          });
        }
        
        if (error instanceof AuthorizationError) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: error.message
            }
          });
        }
        
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Ownership check failed'
          }
        });
      }
    };
  }

  /**
   * Rate limiting for authentication endpoints
   * @param {number} maxAttempts - Maximum attempts per time window
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Function} - Express middleware function
   */
  static authRateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    // More lenient limits for test environment
    if (process.env.NODE_ENV === 'test') {
      maxAttempts = maxAttempts * 10; // 50 attempts instead of 5
      windowMs = Math.min(windowMs, 60 * 1000); // Max 1 minute window
    }
    
    const attempts = new Map();
    
    return (req, res, next) => {
      try {
        // Skip rate limiting in test environment if configured
        if (process.env.NODE_ENV === 'test' && process.env.SKIP_RATE_LIMIT === 'true') {
          return next();
        }
        
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        // Clean up old attempts
        const cutoff = now - windowMs;
        attempts.forEach((value, key) => {
          if (value.timestamp < cutoff) {
            attempts.delete(key);
          }
        });
        
        // Check current attempts
        const clientAttempts = attempts.get(clientId) || { count: 0, timestamp: now };
        
        if (clientAttempts.count >= maxAttempts) {
          const timeRemaining = Math.ceil((clientAttempts.timestamp + windowMs - now) / 1000);
          
          logger.warn(`Authentication rate limit exceeded for ${clientId}`);
          
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Too many authentication attempts. Try again in ${timeRemaining} seconds.`
            }
          });
        }
        
        // Increment attempts
        attempts.set(clientId, {
          count: clientAttempts.count + 1,
          timestamp: clientAttempts.timestamp
        });
        
        next();
      } catch (error) {
        logger.error('Auth rate limit error:', error);
        next(); // Continue on rate limit error
      }
    };
  }

  /**
   * Check if token needs refresh and add header
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static checkTokenRefresh(req, res, next) {
    try {
      if (req.token && JWTUtils.shouldRefreshToken(req.token)) {
        res.setHeader('X-Token-Refresh-Needed', 'true');
        logger.debug('Token refresh needed for user', { userId: req.user?.id });
      }
      next();
    } catch (error) {
      logger.warn('Token refresh check failed:', error.message);
      next(); // Continue on error
    }
  }

  /**
   * Validate API key (for service-to-service communication)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static validateApiKey(req, res, next) {
    try {
      const apiKey = req.headers['x-api-key'];
      
      if (!apiKey) {
        throw new AuthenticationError('API key required');
      }

      // In a real implementation, you'd validate against a database
      // For now, we'll check against environment variable
      const validApiKey = process.env.API_KEY;
      
      if (!validApiKey || apiKey !== validApiKey) {
        throw new AuthenticationError('Invalid API key');
      }

      logger.debug('API key validation successful');
      next();
    } catch (error) {
      logger.warn('API key validation failed:', error.message);
      
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: error.message
        }
      });
    }
  }

  /**
   * Logout middleware - invalidates token and session
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async logout(req, res, next) {
    try {
      if (req.token) {
        // Create blacklist entry
        const blacklistEntry = JWTUtils.createBlacklistEntry(req.token);
        
        // Deactivate session if it exists
        if (req.sessionId) {
          await Session.deactivate(req.sessionId);
          logger.info(`Session ${req.sessionId} deactivated during logout`);
        }
        
        // In a real implementation, you'd store this in a database or Redis
        // For now, we'll just log it
        logger.info('User logged out', { 
          userId: req.user?.id,
          tokenId: blacklistEntry.jti,
          sessionId: req.sessionId 
        });
      }
      
      next();
    } catch (error) {
      logger.error('Logout process failed:', error);
      next(); // Continue even if logout fails
    }
  }

  /**
   * Require fresh authentication (token must be recently issued)
   * @param {number} maxAge - Maximum token age in milliseconds
   * @returns {Function} - Express middleware function
   */
  static requireFreshAuth(maxAge = 30 * 60 * 1000) { // 30 minutes default
    return (req, res, next) => {
      try {
        if (!req.tokenPayload) {
          throw new AuthenticationError('Authentication required');
        }

        const tokenAge = Date.now() - (req.tokenPayload.iat * 1000);
        
        if (tokenAge > maxAge) {
          throw new AuthenticationError('Fresh authentication required');
        }

        next();
      } catch (error) {
        logger.warn('Fresh auth check failed:', error.message);
        
        return res.status(401).json({
          success: false,
          error: {
            code: 'FRESH_AUTH_REQUIRED',
            message: error.message
          }
        });
      }
    };
  }
}

module.exports = AuthMiddleware; 