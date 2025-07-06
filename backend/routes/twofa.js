const express = require('express');
const User = require('../models/User');
const AuthMiddleware = require('../middlewares/auth');
const { ValidationMiddleware } = require('../utils/validation');
const { logger } = require('../utils/logger');
const { ValidationError, AuthenticationError } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * Two-Factor Authentication Routes
 * Handles 2FA setup, verification, and management
 */

/**
 * @route GET /api/v1/auth/2fa/setup
 * @desc Generate 2FA secret and QR code
 * @access Private
 */
router.get('/setup',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;

      // Check if 2FA is already enabled
      if (user.twofa_enabled) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TWOFA_ALREADY_ENABLED',
            message: '2FA is already enabled for this account'
          }
        });
      }

      // Generate 2FA secret and QR code
      const twofaData = await user.generate2FASecret();

      logger.info(`2FA setup initiated for user: ${user.email}`);

      res.json({
        success: true,
        message: '2FA setup data generated',
        data: {
          secret: twofaData.secret,
          qrCode: twofaData.qrCode,
          instructions: 'Scan the QR code with your authenticator app, then verify with a code to enable 2FA'
        }
      });
    } catch (error) {
      logger.error('2FA setup error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TWOFA_SETUP_FAILED',
          message: '2FA setup failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/2fa/enable
 * @desc Enable 2FA after verification
 * @access Private
 */
router.post('/enable',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      const { token, secret } = req.body;

      // Validate input
      if (!token || !secret) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'Token and secret are required'
          }
        });
      }

      // Check if 2FA is already enabled
      if (user.twofa_enabled) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TWOFA_ALREADY_ENABLED',
            message: '2FA is already enabled for this account'
          }
        });
      }

      // Enable 2FA
      const backupCodes = await user.enable2FA(token, secret);

      logger.info(`2FA enabled for user: ${user.email}`);

      res.json({
        success: true,
        message: '2FA enabled successfully',
        data: {
          backupCodes: backupCodes,
          message: 'Save these backup codes in a safe place. They can be used to access your account if you lose your authenticator device.'
        }
      });
    } catch (error) {
      logger.error('2FA enable error:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TWOFA_ENABLE_FAILED',
          message: '2FA enable failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/2fa/disable
 * @desc Disable 2FA
 * @access Private
 */
router.post('/disable',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      const { password, token } = req.body;

      // Validate input
      if (!password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PASSWORD',
            message: 'Password is required to disable 2FA'
          }
        });
      }

      // Verify password
      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Invalid password'
          }
        });
      }

      // Check if 2FA is enabled
      if (!user.twofa_enabled) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TWOFA_NOT_ENABLED',
            message: '2FA is not enabled for this account'
          }
        });
      }

      // If 2FA is enabled, verify 2FA token
      if (token) {
        const isValid2FA = await user.verify2FA(token);
        if (!isValid2FA) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_2FA_TOKEN',
              message: 'Invalid 2FA token'
            }
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_2FA_TOKEN',
            message: '2FA token is required'
          }
        });
      }

      // Disable 2FA
      await user.disable2FA();

      logger.info(`2FA disabled for user: ${user.email}`);

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    } catch (error) {
      logger.error('2FA disable error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TWOFA_DISABLE_FAILED',
          message: '2FA disable failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/2fa/verify
 * @desc Verify 2FA token (for login or sensitive operations)
 * @access Private
 */
router.post('/verify',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      const { token } = req.body;

      // Validate input
      if (!token) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Token is required'
          }
        });
      }

      // Check if 2FA is enabled
      if (!user.twofa_enabled) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TWOFA_NOT_ENABLED',
            message: '2FA is not enabled for this account'
          }
        });
      }

      // Verify 2FA token
      const isValid = await user.verify2FA(token);

      if (isValid) {
        logger.info(`2FA verification successful for user: ${user.email}`);
        
        res.json({
          success: true,
          message: '2FA verification successful'
        });
      } else {
        logger.warn(`2FA verification failed for user: ${user.email}`);
        
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid 2FA token'
          }
        });
      }
    } catch (error) {
      logger.error('2FA verification error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TWOFA_VERIFICATION_FAILED',
          message: '2FA verification failed'
        }
      });
    }
  }
);

/**
 * @route GET /api/v1/auth/2fa/status
 * @desc Get 2FA status for current user
 * @access Private
 */
router.get('/status',
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      const backupCodesCount = user.twofa_backup_codes ? 
        JSON.parse(user.twofa_backup_codes).length : 0;

      res.json({
        success: true,
        data: {
          twofa_enabled: user.twofa_enabled || false,
          backup_codes_remaining: backupCodesCount
        }
      });
    } catch (error) {
      logger.error('2FA status error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TWOFA_STATUS_FAILED',
          message: 'Failed to get 2FA status'
        }
      });
    }
  }
);

module.exports = router; 