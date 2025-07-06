const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middlewares/auth');
const Session = require('../models/Session');
const logger = require('../utils/logger');

// Get all active sessions for current user
router.get('/', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const sessions = await Session.findActiveByUserId(req.user.id);
    
    // Don't expose sensitive session tokens
    const safeSessions = sessions.map(session => ({
      id: session.id,
      device_info: session.device_info,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      last_activity: session.last_activity,
      expires_at: session.expires_at,
      is_current: session.session_token === req.sessionToken
    }));

    res.json({
      status: 'success',
      data: {
        sessions: safeSessions
      }
    });
  } catch (error) {
    logger.error('Session list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve sessions'
    });
  }
});

// Get session summary for current user
router.get('/summary', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const summary = await Session.getUserSessionSummary(req.user.id);
    
    res.json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    logger.error('Session summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve session summary'
    });
  }
});

// Terminate a specific session
router.delete('/:sessionId', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify session belongs to current user
    const session = await Session.findById(sessionId);
    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    // Don't allow terminating current session via this endpoint
    if (session.session_token === req.sessionToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot terminate current session. Use logout instead.'
      });
    }

    await Session.deactivate(sessionId);
    
    logger.info(`Session ${sessionId} terminated by user ${req.user.id}`);
    
    res.json({
      status: 'success',
      message: 'Session terminated successfully'
    });
  } catch (error) {
    logger.error('Session termination error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to terminate session'
    });
  }
});

// Terminate all other sessions (except current)
router.delete('/others/all', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const sessions = await Session.findActiveByUserId(req.user.id);
    
    // Deactivate all sessions except current one
    const terminationPromises = sessions
      .filter(session => session.session_token !== req.sessionToken)
      .map(session => Session.deactivate(session.id));
    
    await Promise.all(terminationPromises);
    
    logger.info(`All other sessions terminated by user ${req.user.id}`);
    
    res.json({
      status: 'success',
      message: 'All other sessions terminated successfully'
    });
  } catch (error) {
    logger.error('Bulk session termination error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to terminate sessions'
    });
  }
});

// Update current session activity (optional - mainly for SPA usage)
router.post('/activity', AuthMiddleware.authenticate, async (req, res) => {
  try {
    if (req.sessionId) {
      await Session.updateActivity(req.sessionId);
    }
    
    res.json({
      status: 'success',
      message: 'Session activity updated'
    });
  } catch (error) {
    logger.error('Session activity update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update session activity'
    });
  }
});

module.exports = router; 