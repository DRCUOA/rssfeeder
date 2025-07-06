const express = require('express');
const config = require('../config');
const AuthMiddleware = require('../middlewares/auth');
const { logger } = require('../utils/logger');
const EmailTemplate = require('../models/EmailTemplate');
const EmailDelivery = require('../models/EmailDelivery');
const { EmailPreferences, EmailSubscription } = require('../models/EmailPreferences');
const enhancedEmailService = require('../utils/enhancedEmailService');

const router = express.Router();

/**
 * Email Service API Routes
 * Handles email templates, preferences, subscriptions, tracking, and bulk operations
 */

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * @route GET /api/v1/email/templates
 * @desc Get all email templates
 * @access Private (Admin)
 */
router.get('/templates', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const { category, active } = req.query;
      
      const templates = await EmailTemplate.getAll({
        category,
        active: active !== undefined ? active === 'true' : undefined
      });
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      logger.error('Error getting email templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_FAILED',
          message: 'Failed to fetch email templates'
        }
      });
    }
  }
);

/**
 * @route GET /api/v1/email/templates/:id
 * @desc Get specific email template
 * @access Private (Admin)
 */
router.get('/templates/:id', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const template = await EmailTemplate.findById(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Email template not found'
          }
        });
      }
      
      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error getting email template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_FAILED',
          message: 'Failed to fetch email template'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/email/templates
 * @desc Create new email template
 * @access Private (Admin)
 */
router.post('/templates', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const templateData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const template = await EmailTemplate.create(templateData);
      
      // Validate template
      const validation = template.validate();
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TEMPLATE_VALIDATION_FAILED',
            message: 'Template validation failed',
            details: validation.errors
          }
        });
      }
      
      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error) {
      logger.error('Error creating email template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_CREATE_FAILED',
          message: 'Failed to create email template'
        }
      });
    }
  }
);

/**
 * @route PUT /api/v1/email/templates/:id
 * @desc Update email template
 * @access Private (Admin)
 */
router.put('/templates/:id', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const template = await EmailTemplate.findById(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Email template not found'
          }
        });
      }
      
      const updatedTemplate = await template.update(req.body);
      
      res.json({
        success: true,
        data: updatedTemplate
      });
    } catch (error) {
      logger.error('Error updating email template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_UPDATE_FAILED',
          message: 'Failed to update email template'
        }
      });
    }
  }
);

/**
 * @route DELETE /api/v1/email/templates/:id
 * @desc Delete email template
 * @access Private (Admin)
 */
router.delete('/templates/:id', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const template = await EmailTemplate.findById(req.params.id);
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Email template not found'
          }
        });
      }
      
      await template.delete();
      
      res.json({
        success: true,
        message: 'Email template deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting email template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_DELETE_FAILED',
          message: 'Failed to delete email template'
        }
      });
    }
  }
);

// =============================================================================
// EMAIL PREFERENCES
// =============================================================================

/**
 * @route GET /api/v1/email/preferences
 * @desc Get current user's email preferences
 * @access Private
 */
router.get('/preferences', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const preferences = await EmailPreferences.getByUserId(req.user.id);
      const availableTypes = EmailPreferences.getAvailableTypes();
      
      res.json({
        success: true,
        data: {
          preferences,
          availableTypes
        }
      });
    } catch (error) {
      logger.error('Error getting email preferences:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_FETCH_FAILED',
          message: 'Failed to fetch email preferences'
        }
      });
    }
  }
);

/**
 * @route PUT /api/v1/email/preferences
 * @desc Update user's email preferences
 * @access Private
 */
router.put('/preferences', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const { preferences } = req.body;
      
      if (!Array.isArray(preferences)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PREFERENCES_FORMAT',
            message: 'Preferences must be an array'
          }
        });
      }
      
      const updatedPreferences = [];
      
      for (const pref of preferences) {
        const preference = await EmailPreferences.createOrUpdate({
          user_id: req.user.id,
          preference_type: pref.preference_type,
          is_enabled: pref.is_enabled,
          frequency: pref.frequency,
          custom_settings: pref.custom_settings
        });
        updatedPreferences.push(preference);
      }
      
      res.json({
        success: true,
        data: updatedPreferences
      });
    } catch (error) {
      logger.error('Error updating email preferences:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_UPDATE_FAILED',
          message: 'Failed to update email preferences'
        }
      });
    }
  }
);

// =============================================================================
// EMAIL SUBSCRIPTIONS
// =============================================================================

/**
 * @route GET /api/v1/email/subscriptions
 * @desc Get current user's email subscriptions
 * @access Private
 */
router.get('/subscriptions', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      const subscriptions = await EmailSubscription.getByEmail(user.email);
      
      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      logger.error('Error getting email subscriptions:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIPTIONS_FETCH_FAILED',
          message: 'Failed to fetch email subscriptions'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/email/subscriptions
 * @desc Subscribe to email list
 * @access Private
 */
router.post('/subscriptions', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const { listName, listDescription } = req.body;
      
      if (!listName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_LIST_NAME',
            message: 'List name is required'
          }
        });
      }
      
      const subscription = await EmailSubscription.subscribe({
        list_name: listName,
        list_description: listDescription,
        email: req.user.email,
        user_id: req.user.id,
        subscription_source: 'user_request'
      });
      
      res.status(201).json({
        success: true,
        data: subscription
      });
    } catch (error) {
      logger.error('Error subscribing to email list:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to email list'
        }
      });
    }
  }
);

/**
 * @route DELETE /api/v1/email/subscriptions/:listName
 * @desc Unsubscribe from email list
 * @access Private
 */
router.delete('/subscriptions/:listName', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const { listName } = req.params;
      
      const success = await EmailSubscription.unsubscribe(
        req.user.email,
        listName,
        'user_request'
      );
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBSCRIPTION_NOT_FOUND',
            message: 'Subscription not found'
          }
        });
      }
      
      res.json({
        success: true,
        message: 'Successfully unsubscribed from email list'
      });
    } catch (error) {
      logger.error('Error unsubscribing from email list:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from email list'
        }
      });
    }
  }
);

// =============================================================================
// EMAIL TRACKING
// =============================================================================

/**
 * @route GET /api/v1/email/track/open/:deliveryId
 * @desc Track email open
 * @access Public
 */
router.get('/track/open/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    
    const delivery = await EmailDelivery.findById(deliveryId);
    if (delivery) {
      await delivery.recordOpen();
      logger.info(`Email open tracked: Delivery ${deliveryId}`);
    }
    
    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(pixel);
  } catch (error) {
    logger.error('Error tracking email open:', error);
    // Still return pixel even if tracking fails
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.send(pixel);
  }
});

/**
 * @route GET /api/v1/email/track/click/:deliveryId
 * @desc Track email click and redirect
 * @access Public
 */
router.get('/track/click/:deliveryId', async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_URL',
          message: 'URL parameter is required'
        }
      });
    }
    
    const delivery = await EmailDelivery.findById(deliveryId);
    if (delivery) {
      await delivery.recordClick(url, {
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        referrer: req.get('Referer')
      });
      logger.info(`Email click tracked: Delivery ${deliveryId}, URL: ${url}`);
    }
    
    // Redirect to original URL
    res.redirect(decodeURIComponent(url));
  } catch (error) {
    logger.error('Error tracking email click:', error);
    
    // Try to redirect to URL even if tracking fails
    const { url } = req.query;
    if (url) {
      res.redirect(decodeURIComponent(url));
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'CLICK_TRACKING_FAILED',
          message: 'Failed to track email click'
        }
      });
    }
  }
});

/**
 * @route GET /api/v1/email/unsubscribe/:listName/:email
 * @desc Unsubscribe from email list (public link)
 * @access Public
 */
router.get('/unsubscribe/:listName/:email', async (req, res) => {
  try {
    const { listName, email } = req.params;
    
    const success = await EmailSubscription.unsubscribe(
      decodeURIComponent(email),
      listName,
      'unsubscribe_link'
    );
    
    if (success) {
      // Return simple HTML page
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed - RSSFeeder</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .success { color: #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Unsubscribed Successfully</h1>
            <p>You have been unsubscribed from <strong>${listName}</strong>.</p>
            <p>You will no longer receive emails from this list.</p>
            <p><a href="${config.FRONTEND_URL}">Return to RSSFeeder</a></p>
          </div>
        </body>
        </html>
      `);
    } else {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe Failed - RSSFeeder</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">✗ Unsubscribe Failed</h1>
            <p>The subscription was not found or has already been removed.</p>
            <p><a href="${config.FRONTEND_URL}">Return to RSSFeeder</a></p>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    logger.error('Error processing unsubscribe:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribe Error - RSSFeeder</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 600px; margin: 0 auto; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">✗ Unsubscribe Error</h1>
          <p>An error occurred while processing your unsubscribe request.</p>
          <p>Please try again later or contact support.</p>
          <p><a href="${config.FRONTEND_URL}">Return to RSSFeeder</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// =============================================================================
// BULK EMAIL OPERATIONS
// =============================================================================

/**
 * @route POST /api/v1/email/send/template
 * @desc Send templated email
 * @access Private (Admin)
 */
router.post('/send/template', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const {
        templateName,
        recipientEmail,
        recipientUserId,
        variables,
        trackingEnabled = true
      } = req.body;
      
      if (!templateName || !recipientEmail) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Template name and recipient email are required'
          }
        });
      }
      
      const result = await enhancedEmailService.sendTemplatedEmail({
        templateName,
        recipientEmail,
        recipientUserId,
        variables: variables || {},
        trackingEnabled
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error sending templated email:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send templated email'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/email/send/bulk
 * @desc Send bulk email
 * @access Private (Admin)
 */
router.post('/send/bulk', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const {
        templateName,
        recipients,
        globalVariables,
        batchSize = 10,
        delayBetweenBatches = 1000
      } = req.body;
      
      if (!templateName || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Template name and recipients array are required'
          }
        });
      }
      
      const result = await enhancedEmailService.sendBulkEmail({
        templateName,
        recipients,
        globalVariables: globalVariables || {},
        batchSize,
        delayBetweenBatches
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error sending bulk email:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_EMAIL_SEND_FAILED',
          message: 'Failed to send bulk email'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/email/send/list
 * @desc Send email to subscription list
 * @access Private (Admin)
 */
router.post('/send/list', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const {
        listName,
        templateName,
        globalVariables,
        batchSize = 10,
        delayBetweenBatches = 1000
      } = req.body;
      
      if (!listName || !templateName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'List name and template name are required'
          }
        });
      }
      
      const result = await enhancedEmailService.sendToList({
        listName,
        templateName,
        globalVariables: globalVariables || {},
        batchSize,
        delayBetweenBatches
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error sending email to list:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_EMAIL_SEND_FAILED',
          message: 'Failed to send email to list'
        }
      });
    }
  }
);

// =============================================================================
// EMAIL STATISTICS
// =============================================================================

/**
 * @route GET /api/v1/email/stats
 * @desc Get email service statistics
 * @access Private (Admin)
 */
router.get('/stats', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const stats = await enhancedEmailService.getStatistics();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting email statistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_FETCH_FAILED',
          message: 'Failed to fetch email statistics'
        }
      });
    }
  }
);

/**
 * @route GET /api/v1/email/deliveries
 * @desc Get email deliveries for current user
 * @access Private
 */
router.get('/deliveries', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      const { limit = 50, template_name, status } = req.query;
      
      const deliveries = await EmailDelivery.getByUserId(req.user.id, {
        limit: parseInt(limit),
        template_name,
        status
      });
      
      res.json({
        success: true,
        data: deliveries
      });
    } catch (error) {
      logger.error('Error getting email deliveries:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELIVERIES_FETCH_FAILED',
          message: 'Failed to fetch email deliveries'
        }
      });
    }
  }
);

/**
 * @route POST /api/v1/email/setup
 * @desc Setup default email templates and preferences
 * @access Private (Admin)
 */
router.post('/setup', 
  AuthMiddleware.authenticate,
  async (req, res) => {
    try {
      // Create default templates
      const templates = await enhancedEmailService.createDefaultTemplates();
      
      // Initialize preferences for current user
      const preferences = await EmailPreferences.initializeDefaultPreferences(req.user.id);
      
      res.json({
        success: true,
        data: {
          templates: templates.length,
          preferences: preferences.length
        },
        message: 'Email service setup completed'
      });
    } catch (error) {
      logger.error('Error setting up email service:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'EMAIL_SETUP_FAILED',
          message: 'Failed to setup email service'
        }
      });
    }
  }
);

module.exports = router; 