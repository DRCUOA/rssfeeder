const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middlewares/auth');
const TokenBlacklist = require('../models/TokenBlacklist');
const Session = require('../models/Session');
const JWTUtils = require('../utils/jwt');
const logger = require('../utils/logger');

// Get token blacklist statistics (admin only)
router.get('/blacklist/stats', AuthMiddleware.authenticate, async (req, res) => {
  try {
    // Simple admin check - in production you'd have proper role-based access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }
    
    const stats = await TokenBlacklist.getStatistics();
    
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    logger.error('Token blacklist stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve blacklist statistics'
    });
  }
});

// Get user's blacklisted tokens
router.get('/blacklist/mine', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const entries = await TokenBlacklist.getUserBlacklist(req.user.id);
    
    res.json({
      status: 'success',
      data: {
        entries: entries.map(entry => ({
          id: entry.id,
          token_id: entry.token_id,
          reason: entry.reason,
          expires_at: entry.expires_at,
          created_at: entry.created_at
        }))
      }
    });
  } catch (error) {
    logger.error('User blacklist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user blacklist'
    });
  }
});

// Revoke current token
router.post('/revoke/current', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Create blacklist entry for current token
    const tokenData = {
      jti: req.tokenPayload.jti || `token_${Date.now()}`,
      userId: req.user.id,
      expiresAt: new Date(req.tokenPayload.exp * 1000)
    };
    
    await TokenBlacklist.create(tokenData, reason || 'user_requested');
    
    // Deactivate current session if exists
    if (req.sessionId) {
      await Session.deactivate(req.sessionId);
    }
    
    logger.info(`Token revoked by user ${req.user.id}`);
    
    res.json({
      status: 'success',
      message: 'Token revoked successfully'
    });
  } catch (error) {
    logger.error('Token revocation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke token'
    });
  }
});

// Revoke all tokens for current user
router.post('/revoke/all', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // Blacklist all user tokens
    const revokedCount = await TokenBlacklist.blacklistUserTokens(
      req.user.id, 
      reason || 'user_requested_all'
    );
    
    logger.info(`All tokens revoked for user ${req.user.id} (${revokedCount} tokens)`);
    
    res.json({
      status: 'success',
      message: `Successfully revoked ${revokedCount} tokens`,
      data: {
        revokedCount
      }
    });
  } catch (error) {
    logger.error('Bulk token revocation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to revoke all tokens'
    });
  }
});

// Check if token is blacklisted (internal use)
router.post('/check-blacklist', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const { token_id } = req.body;
    
    if (!token_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Token ID is required'
      });
    }
    
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token_id);
    
    res.json({
      status: 'success',
      data: {
        token_id,
        is_blacklisted: isBlacklisted
      }
    });
  } catch (error) {
    logger.error('Token blacklist check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check token blacklist status'
    });
  }
});

// Cleanup expired blacklist entries (admin only)
router.post('/cleanup', AuthMiddleware.authenticate, async (req, res) => {
  try {
    // Simple admin check - in production you'd have proper role-based access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }
    
    const cleanedCount = await TokenBlacklist.cleanupExpired();
    
    logger.info(`Cleaned up ${cleanedCount} expired blacklist entries`);
    
    res.json({
      status: 'success',
      message: `Cleaned up ${cleanedCount} expired entries`,
      data: {
        cleanedCount
      }
    });
  } catch (error) {
    logger.error('Blacklist cleanup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cleanup expired blacklist entries'
    });
  }
});

// Get token info (for debugging)
router.get('/info', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const tokenInfo = {
      user_id: req.user.id,
      token_payload: {
        id: req.tokenPayload.id,
        email: req.tokenPayload.email,
        iat: req.tokenPayload.iat,
        exp: req.tokenPayload.exp,
        iss: req.tokenPayload.iss,
        aud: req.tokenPayload.aud
      },
      session_id: req.sessionId || null,
      expires_at: new Date(req.tokenPayload.exp * 1000)
    };
    
    res.json({
      status: 'success',
      data: tokenInfo
    });
  } catch (error) {
    logger.error('Token info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve token information'
    });
  }
});

module.exports = router; 