const express = require('express');
const User = require('../models/User');
const Session = require('../models/Session');
const JWTUtils = require('../utils/jwt');
const AuthMiddleware = require('../middlewares/auth');
const { ValidationMiddleware } = require('../utils/validation');
const emailService = require('../utils/emailService');
const { logger } = require('../utils/logger');
const { AuthenticationError, ValidationError } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * Authentication Routes
 * Handles user registration, login, password management, and token operations
 */

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', 
  AuthMiddleware.authRateLimit(),
  ValidationMiddleware.validateRegistration,
  async (req, res) => {
    try {
      const start = Date.now();
      
      // Create user
      const user = await User.create(req.validatedData);
      
      // Create session
      const sessionData = {
        user_id: user.id,
        device_info: req.body.device_info || 'Unknown Device',
        ip_address: req.ip || req.connection.remoteAddress || 'Unknown IP',
        user_agent: req.get('User-Agent') || 'Unknown User Agent'
      };
      
      const session = await Session.create(sessionData);
      
      // Generate tokens with session information
      const tokens = JWTUtils.generateTokenPair(user, session.id);
      
      // Send welcome email (don't fail registration if email fails)
      try {
        await emailService.sendWelcomeEmail(user.email, user.name);
        logger.info(`Welcome email sent to ${user.email}`);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
        // Continue with registration success
      }
      
      const duration = Date.now() - start;
      logger.info(`User registered successfully: ${user.email} (${duration}ms)`);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.getPublicProfile(),
          auth: tokens,
          session: {
            id: session.id,
            device_info: session.device_info,
            expires_at: session.expires_at
          }
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'User registration failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/login
 * @desc Authenticate user and return tokens
 * @access Public
 */
router.post('/login',
  AuthMiddleware.authRateLimit(),
  ValidationMiddleware.validateLogin,
  async (req, res) => {
    try {
      const start = Date.now();
      
      // Authenticate user with username/password
      const user = await User.authenticate(req.validatedData.email, req.validatedData.password);
      
      // Check if 2FA is enabled
      if (user.twofa_enabled) {
        const { twofa_token } = req.body;
        
        if (!twofa_token) {
          // 2FA is required but not provided
          return res.status(200).json({
            success: false,
            requires_2fa: true,
            message: '2FA token is required',
            data: {
              user_id: user.id,
              email: user.email
            }
          });
        }
        
        // Verify 2FA token
        const isValid2FA = await user.verify2FA(twofa_token);
        if (!isValid2FA) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_2FA_TOKEN',
              message: 'Invalid 2FA token'
            }
          });
        }
      }
      
      // Create session
      const sessionData = {
        user_id: user.id,
        device_info: req.body.device_info || 'Unknown Device',
        ip_address: req.ip || req.connection.remoteAddress || 'Unknown IP',
        user_agent: req.get('User-Agent') || 'Unknown User Agent'
      };
      
      const session = await Session.create(sessionData);
      
      // Generate tokens with session information
      const tokens = JWTUtils.generateTokenPair(user, session.id);
      
      const duration = Date.now() - start;
      logger.info(`User logged in successfully: ${user.email} (${duration}ms)`);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.getPublicProfile(),
          auth: tokens,
          session: {
            id: session.id,
            device_info: session.device_info,
            expires_at: session.expires_at
          }
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: 'Login process failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh',
  ValidationMiddleware.validateRefreshToken,
  async (req, res) => {
    try {
      const start = Date.now();
      
      // Refresh tokens
      const tokens = JWTUtils.refreshAccessToken(req.validatedData.refreshToken);
      
      const duration = Date.now() - start;
      logger.info(`Token refreshed successfully (${duration}ms)`);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          auth: tokens
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Token refresh failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user and invalidate token
 * @access Private
 */
router.post('/logout',
  AuthMiddleware.authenticate,
  AuthMiddleware.logout,
  async (req, res) => {
    try {
      logger.info(`User logged out successfully: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout process failed'
        }
      });
    }
  }
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me',
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTokenRefresh,
  async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          user: req.user.getPublicProfile()
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to fetch user profile'
        }
      });
    }
  }
);

/**
 * @route PUT /api/v1/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile',
  AuthMiddleware.authenticate,
  ValidationMiddleware.validateProfileUpdate,
  async (req, res) => {
    try {
      const start = Date.now();
      
      // Update user profile
      const updatedUser = await req.user.update(req.validatedData);
      
      const duration = Date.now() - start;
      logger.info(`Profile updated successfully for user: ${updatedUser.email} (${duration}ms)`);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser.getPublicProfile()
        }
      });
    } catch (error) {
      logger.error('Profile update error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: 'Profile update failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireFreshAuth(15 * 60 * 1000), // Require fresh auth within 15 minutes
  ValidationMiddleware.validatePasswordChange,
  async (req, res) => {
    try {
      const start = Date.now();
      
      // Change password
      await req.user.changePassword(
        req.validatedData.currentPassword,
        req.validatedData.newPassword
      );
      
      // Send confirmation email (don't fail if email fails)
      try {
        await emailService.sendPasswordChangeConfirmation(req.user.email, req.user.name);
        logger.info(`Password change confirmation sent to ${req.user.email}`);
      } catch (emailError) {
        logger.error('Failed to send password change confirmation:', emailError);
        // Continue with success response
      }
      
      const duration = Date.now() - start;
      logger.info(`Password changed successfully for user: ${req.user.email} (${duration}ms)`);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Password change error:', error);
      
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: 'Password change failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password',
  AuthMiddleware.authRateLimit(3, 15 * 60 * 1000), // Stricter rate limiting for password reset
  ValidationMiddleware.validatePasswordResetRequest,
  async (req, res) => {
    try {
      const start = Date.now();
      
      // Find user by email
      const user = await User.findByEmail(req.validatedData.email);
      
      // Always return success to prevent email enumeration
      // But only send email if user exists
      if (user) {
        try {
          // Generate reset token
          const resetToken = await user.generateResetToken();
          
          // Send reset email
          await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
          
          logger.info(`Password reset email sent to ${user.email}`);
        } catch (emailError) {
          logger.error('Failed to send password reset email:', emailError);
          // Don't reveal email sending failure to user
        }
      } else {
        logger.warn(`Password reset requested for non-existent email: ${req.validatedData.email}`);
      }
      
      const duration = Date.now() - start;
      logger.info(`Password reset requested for: ${req.validatedData.email} (${duration}ms)`);
      
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'RESET_REQUEST_FAILED',
          message: 'Password reset request failed'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Reset password using token
 * @access Public
 */
router.post('/reset-password',
  AuthMiddleware.authRateLimit(),
  ValidationMiddleware.validatePasswordReset,
  async (req, res) => {
    try {
      const start = Date.now();
      
      // Reset password
      await User.resetPassword(req.validatedData.token, req.validatedData.newPassword);
      
      const duration = Date.now() - start;
      logger.info(`Password reset successfully (${duration}ms)`);
      
      res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.'
      });
    } catch (error) {
      logger.error('Password reset error:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESET_TOKEN',
            message: error.message
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_FAILED',
          message: 'Password reset failed'
        }
      });
    }
  }
);

/**
 * @route GET /api/v1/auth/verify-token
 * @desc Verify if current token is valid
 * @access Private
 */
router.get('/verify-token',
  AuthMiddleware.authenticate,
  AuthMiddleware.checkTokenRefresh,
  async (req, res) => {
    try {
      const tokenTimeRemaining = JWTUtils.getTokenTimeRemaining(req.token);
      const shouldRefresh = JWTUtils.shouldRefreshToken(req.token);
      
      res.json({
        success: true,
        data: {
          valid: true,
          user: req.user.getPublicProfile(),
          tokenInfo: {
            timeRemaining: tokenTimeRemaining,
            shouldRefresh: shouldRefresh,
            expiresAt: JWTUtils.getTokenExpiration(req.token)
          }
        }
      });
    } catch (error) {
      logger.error('Token verification error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_VERIFICATION_FAILED',
          message: 'Token verification failed'
        }
      });
    }
  }
);

/**
 * @route DELETE /api/v1/auth/account
 * @desc Delete user account
 * @access Private
 */
router.delete('/account',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireFreshAuth(5 * 60 * 1000), // Require very fresh auth (5 minutes)
  async (req, res) => {
    try {
      const start = Date.now();
      const userEmail = req.user.email;
      
      // Delete user account
      await req.user.delete();
      
      const duration = Date.now() - start;
      logger.info(`User account deleted: ${userEmail} (${duration}ms)`);
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Account deletion error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'ACCOUNT_DELETION_FAILED',
          message: 'Account deletion failed'
        }
      });
    }
  }
);

/**
 * @route GET /api/v1/auth/status
 * @desc Get authentication service status
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const emailStatus = emailService.getStatus();
    
    res.json({
      success: true,
      data: {
        authService: 'operational',
        emailService: emailStatus.isConfigured ? 'operational' : 'not configured',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Status check error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_FAILED',
        message: 'Status check failed'
      }
    });
  }
});

/**
 * Development/Testing Routes (only available in development)
 */
if (process.env.NODE_ENV === 'development') {
  /**
   * @route POST /api/v1/auth/test-email
   * @desc Send test email (development only)
   * @access Private (admin)
   */
  router.post('/test-email',
    AuthMiddleware.authenticate,
    async (req, res) => {
      try {
        const { email } = req.body;
        const testEmail = email || req.user.email;
        
        await emailService.sendTestEmail(testEmail);
        
        logger.info(`Test email sent to ${testEmail}`);
        
        res.json({
          success: true,
          message: `Test email sent to ${testEmail}`
        });
      } catch (error) {
        logger.error('Test email error:', error);
        
        res.status(500).json({
          success: false,
          error: {
            code: 'TEST_EMAIL_FAILED',
            message: 'Test email sending failed'
          }
        });
      }
    }
  );

  /**
   * @route GET /api/v1/auth/debug/token
   * @desc Debug token information (development only)
   * @access Private
   */
  router.get('/debug/token',
    AuthMiddleware.authenticate,
    async (req, res) => {
      try {
        const tokenPayload = JWTUtils.getTokenPayload(req.token);
        const tokenExpiration = JWTUtils.getTokenExpiration(req.token);
        const timeRemaining = JWTUtils.getTokenTimeRemaining(req.token);
        
        res.json({
          success: true,
          data: {
            payload: tokenPayload,
            expiration: tokenExpiration,
            timeRemaining: timeRemaining,
            shouldRefresh: JWTUtils.shouldRefreshToken(req.token)
          }
        });
      } catch (error) {
        logger.error('Token debug error:', error);
        
        res.status(500).json({
          success: false,
          error: {
            code: 'TOKEN_DEBUG_FAILED',
            message: 'Token debug failed'
          }
        });
      }
    }
  );
}

module.exports = router; 