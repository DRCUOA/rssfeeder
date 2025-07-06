const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const JWTUtils = require('../utils/jwt');
const { logger } = require('../utils/logger');
const config = require('../config');

const router = express.Router();

// Configure Google OAuth Strategy
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: config.OAUTH_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const googleId = profile.id;

      // Check if user already exists
      let user = await User.findByEmail(email);

      if (user) {
        // User exists, update Google ID if not set
        if (!user.google_id) {
          await user.update({ google_id: googleId });
        }
        logger.info(`OAuth login for existing user: ${email}`);
        return done(null, user);
      } else {
        // Create new user
        const userData = {
          name: name,
          email: email,
          password: `oauth_${Date.now()}_${Math.random()}`, // Random password for OAuth users
          google_id: googleId,
          email_verified: true // Google accounts are pre-verified
        };

        user = await User.create(userData);
        logger.info(`New user created via OAuth: ${email}`);
        return done(null, user);
      }
    } catch (error) {
      logger.error('OAuth authentication error:', error);
      return done(error, null);
    }
  }));
} else {
  logger.warn('Google OAuth not configured - missing client ID or secret');
}

// Initialize passport
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * OAuth Routes
 */

/**
 * @route GET /api/v1/auth/oauth/google
 * @desc Initiate Google OAuth login
 * @access Public
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

/**
 * @route GET /api/v1/auth/oauth/google/callback
 * @desc Google OAuth callback
 * @access Public
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
      }

      // Generate JWT tokens
      const tokens = JWTUtils.generateTokenPair(user);

      // Redirect to frontend with tokens
      const redirectUrl = `${config.FRONTEND_URL}/login/callback?` +
        `access_token=${tokens.accessToken}&` +
        `refresh_token=${tokens.refreshToken}&` +
        `user_id=${user.id}`;

      logger.info(`OAuth login successful for user: ${user.email}`);
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.redirect(`${config.FRONTEND_URL}/login?error=oauth_callback_failed`);
    }
  }
);

/**
 * @route POST /api/v1/auth/oauth/link
 * @desc Link OAuth account to existing user
 * @access Private
 */
router.post('/link/google',
  // This would require authentication middleware
  async (req, res) => {
    try {
      // This is a placeholder for account linking functionality
      // In MVP, we'll focus on basic OAuth login
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Account linking not implemented in MVP'
        }
      });
    } catch (error) {
      logger.error('OAuth link error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_LINK_FAILED',
          message: 'OAuth link failed'
        }
      });
    }
  }
);

/**
 * @route DELETE /api/v1/auth/oauth/unlink
 * @desc Unlink OAuth account
 * @access Private
 */
router.delete('/unlink/google',
  // This would require authentication middleware
  async (req, res) => {
    try {
      // This is a placeholder for account unlinking functionality
      // In MVP, we'll focus on basic OAuth login
      res.status(501).json({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Account unlinking not implemented in MVP'
        }
      });
    } catch (error) {
      logger.error('OAuth unlink error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'OAUTH_UNLINK_FAILED',
          message: 'OAuth unlink failed'
        }
      });
    }
  }
);

module.exports = router; 