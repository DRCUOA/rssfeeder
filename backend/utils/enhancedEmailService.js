const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../config');
const { logger } = require('./logger');
const EmailTemplate = require('../models/EmailTemplate');
const EmailDelivery = require('../models/EmailDelivery');
const { EmailPreferences, EmailSubscription } = require('../models/EmailPreferences');

/**
 * Enhanced Email Service
 * Provides templating, tracking, preferences, and bulk email capabilities
 */
class EnhancedEmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.trackingBaseUrl = config.FRONTEND_URL || 'http://localhost:3000';
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    try {
      if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
        logger.warn('Enhanced email service not configured - SMTP credentials missing');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS
        }
      });

      this.isConfigured = true;
      logger.info('Enhanced email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize enhanced email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email using template
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - Send result with tracking
   */
  async sendTemplatedEmail(options) {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      const {
        templateName,
        recipientEmail,
        recipientUserId = null,
        variables = {},
        trackingEnabled = true,
        checkPreferences = true
      } = options;

      // Check user preferences if requested
      if (checkPreferences && recipientUserId) {
        const isEnabled = await EmailPreferences.isEmailEnabled(recipientUserId, templateName);
        if (!isEnabled) {
          logger.info(`Email blocked by user preference: ${recipientEmail}, Template: ${templateName}`);
          return {
            success: false,
            blocked: true,
            reason: 'User preference disabled'
          };
        }
      }

      // Get template
      const template = await EmailTemplate.findByName(templateName);
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      // Render template with variables
      const rendered = template.render(variables);

      // Generate tracking pixel and modify links if tracking is enabled
      let trackingPixelUrl = null;
      let htmlContent = rendered.html;
      let deliveryId = null;

      if (trackingEnabled) {
        // Create delivery record first to get ID
        const deliveryData = {
          message_id: crypto.randomUUID(), // Temporary, will be updated with actual SMTP message ID
          template_name: templateName,
          recipient_email: recipientEmail,
          user_id: recipientUserId,
          subject: rendered.subject,
          status: 'pending',
          tracking_pixel_url: null,
          metadata: {
            variables: variables,
            tracking_enabled: true
          }
        };

        const delivery = await EmailDelivery.create(deliveryData);
        deliveryId = delivery.id;

        // Generate tracking pixel URL
        trackingPixelUrl = `${this.trackingBaseUrl}/api/v1/email/track/open/${delivery.id}`;
        
        // Add tracking pixel to HTML
        htmlContent = this.addTrackingPixel(htmlContent, trackingPixelUrl);
        
        // Transform links for click tracking
        htmlContent = this.addClickTracking(htmlContent, delivery.id);
      }

      // Prepare email options
      const fromEmail = rendered.from_email || config.SMTP_FROM;
      const fromName = rendered.from_name || 'RSSFeeder';
      
      const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: recipientEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: htmlContent
      };

      // Send email
      const result = await this.transporter.sendMail(mailOptions);

      // Update delivery record with actual message ID and status
      if (deliveryId) {
        await EmailDelivery.findById(deliveryId).then(delivery => {
          if (delivery) {
            return delivery.updateStatus('sent', {
              message_id: result.messageId,
              smtp_response: result.response,
              sent_at: new Date()
            });
          }
        });
      }

      logger.info('Templated email sent successfully', {
        template: templateName,
        to: recipientEmail,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        deliveryId: deliveryId,
        trackingEnabled: trackingEnabled
      };

    } catch (error) {
      logger.error('Failed to send templated email:', error);
      throw new Error('Templated email sending failed');
    }
  }

  /**
   * Send bulk email to multiple recipients
   * @param {Object} options - Bulk email options
   * @returns {Promise<Object>} - Bulk send results
   */
  async sendBulkEmail(options) {
    try {
      const {
        templateName,
        recipients, // Array of {email, userId?, variables?}
        globalVariables = {},
        batchSize = 10,
        delayBetweenBatches = 1000,
        trackingEnabled = true,
        checkPreferences = true
      } = options;

      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('Recipients array is required and cannot be empty');
      }

      const results = {
        total: recipients.length,
        sent: 0,
        failed: 0,
        blocked: 0,
        errors: []
      };

      logger.info(`Starting bulk email send: ${recipients.length} recipients, Template: ${templateName}`);

      // Process recipients in batches
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const batchPromises = batch.map(async (recipient) => {
          try {
            const emailOptions = {
              templateName,
              recipientEmail: recipient.email,
              recipientUserId: recipient.userId || null,
              variables: { ...globalVariables, ...recipient.variables },
              trackingEnabled,
              checkPreferences
            };

            const result = await this.sendTemplatedEmail(emailOptions);
            
            if (result.success) {
              results.sent++;
            } else if (result.blocked) {
              results.blocked++;
            } else {
              results.failed++;
              results.errors.push({
                email: recipient.email,
                error: result.reason || 'Unknown error'
              });
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              email: recipient.email,
              error: error.message
            });
            logger.error(`Bulk email failed for ${recipient.email}:`, error);
          }
        });

        // Wait for batch to complete
        await Promise.all(batchPromises);

        // Delay between batches to avoid overwhelming SMTP server
        if (i + batchSize < recipients.length && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }

      logger.info(`Bulk email completed: ${results.sent} sent, ${results.failed} failed, ${results.blocked} blocked`);

      return results;
    } catch (error) {
      logger.error('Bulk email sending failed:', error);
      throw new Error('Bulk email sending failed');
    }
  }

  /**
   * Send email to subscription list
   * @param {Object} options - List email options
   * @returns {Promise<Object>} - Send results
   */
  async sendToList(options) {
    try {
      const {
        listName,
        templateName,
        globalVariables = {},
        batchSize = 10,
        delayBetweenBatches = 1000
      } = options;

      // Get active subscribers for the list
      const subscribers = await EmailSubscription.getActiveSubscribers(listName);
      
      if (subscribers.length === 0) {
        logger.info(`No active subscribers found for list: ${listName}`);
        return {
          total: 0,
          sent: 0,
          failed: 0,
          blocked: 0,
          errors: []
        };
      }

      // Convert subscribers to recipients format
      const recipients = subscribers.map(sub => ({
        email: sub.email,
        userId: sub.user_id,
        variables: {
          unsubscribe_url: `${this.trackingBaseUrl}/api/v1/email/unsubscribe/${listName}/${encodeURIComponent(sub.email)}`
        }
      }));

      return await this.sendBulkEmail({
        templateName,
        recipients,
        globalVariables,
        batchSize,
        delayBetweenBatches,
        trackingEnabled: true,
        checkPreferences: false // List subscribers already opted in
      });
    } catch (error) {
      logger.error('Failed to send email to list:', error);
      throw new Error('List email sending failed');
    }
  }

  /**
   * Add tracking pixel to HTML content
   * @param {string} htmlContent - HTML content
   * @param {string} trackingUrl - Tracking pixel URL
   * @returns {string} - Modified HTML content
   */
  addTrackingPixel(htmlContent, trackingUrl) {
    const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
    
    // Try to insert before closing body tag
    if (htmlContent.includes('</body>')) {
      return htmlContent.replace('</body>', `${trackingPixel}</body>`);
    }
    
    // If no body tag, append to end
    return htmlContent + trackingPixel;
  }

  /**
   * Add click tracking to links
   * @param {string} htmlContent - HTML content
   * @param {number} deliveryId - Delivery ID
   * @returns {string} - Modified HTML content
   */
  addClickTracking(htmlContent, deliveryId) {
    // Find all links and replace with tracking links
    const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
    
    return htmlContent.replace(linkRegex, (match, beforeHref, url, afterHref) => {
      // Skip tracking pixel and unsubscribe links
      if (url.includes('/track/open/') || url.includes('/unsubscribe/')) {
        return match;
      }
      
      // Create tracking URL
      const trackingUrl = `${this.trackingBaseUrl}/api/v1/email/track/click/${deliveryId}?url=${encodeURIComponent(url)}`;
      
      return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`;
    });
  }

  /**
   * Create default email templates
   * @returns {Promise<Array>} - Created templates
   */
  async createDefaultTemplates() {
    try {
      const templates = [
        {
          name: 'welcome',
          subject: 'Welcome to RSSFeeder, {{name}}!',
          category: 'system',
          description: 'Welcome email for new users',
          variables: ['name', 'login_url'],
          html_content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to RSSFeeder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to RSSFeeder!</h1>
        </div>
        
        <div class="content">
            <p>Hello {{name}},</p>
            
            <p>Welcome to RSSFeeder! We're excited to have you on board.</p>
            
            <p>Get started by logging in to your account:</p>
            
            <a href="{{login_url}}" class="button">Login to Your Account</a>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The RSSFeeder Team</p>
        </div>
    </div>
</body>
</html>`,
          text_content: `Welcome to RSSFeeder, {{name}}!

We're excited to have you on board.

Get started by logging in to your account: {{login_url}}

If you have any questions, feel free to reach out to our support team.

Best regards,
The RSSFeeder Team`
        },
        {
          name: 'newsletter',
          subject: 'RSSFeeder Weekly Newsletter',
          category: 'marketing',
          description: 'Weekly newsletter template',
          variables: ['name', 'unsubscribe_url'],
          html_content: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSSFeeder Newsletter</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📰 RSSFeeder Newsletter</h1>
        </div>
        
        <div class="content">
            <p>Hello {{name}},</p>
            
            <p>Here's your weekly roundup of what's happening in the world of RSS and content aggregation.</p>
            
            <p>This week's highlights:</p>
            <ul>
                <li>New features and improvements</li>
                <li>Community spotlights</li>
                <li>Tips and tricks for better feed management</li>
            </ul>
            
            <p>Thank you for being part of the RSSFeeder community!</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The RSSFeeder Team</p>
            <p><a href="{{unsubscribe_url}}">Unsubscribe</a> from this newsletter</p>
        </div>
    </div>
</body>
</html>`,
          text_content: `RSSFeeder Newsletter

Hello {{name}},

Here's your weekly roundup of what's happening in the world of RSS and content aggregation.

This week's highlights:
- New features and improvements
- Community spotlights
- Tips and tricks for better feed management

Thank you for being part of the RSSFeeder community!

Best regards,
The RSSFeeder Team

Unsubscribe: {{unsubscribe_url}}`
        }
      ];

      const createdTemplates = [];
      
      for (const templateData of templates) {
        try {
          // Check if template already exists
          const existing = await EmailTemplate.findByName(templateData.name);
          if (!existing) {
            const template = await EmailTemplate.create(templateData);
            createdTemplates.push(template);
            logger.info(`Created default template: ${templateData.name}`);
          }
        } catch (error) {
          logger.error(`Failed to create template ${templateData.name}:`, error);
        }
      }

      return createdTemplates;
    } catch (error) {
      logger.error('Failed to create default templates:', error);
      throw new Error('Default template creation failed');
    }
  }

  /**
   * Get email service statistics
   * @returns {Promise<Object>} - Service statistics
   */
  async getStatistics() {
    try {
      const deliveryStats = await EmailDelivery.getStatistics();
      const preferenceStats = await EmailPreferences.getStatistics();
      const subscriptionStats = await EmailSubscription.getStatistics();

      return {
        delivery: deliveryStats,
        preferences: preferenceStats,
        subscriptions: subscriptionStats,
        service: {
          isConfigured: this.isConfigured,
          smtpHost: config.SMTP_HOST || 'Not configured',
          trackingEnabled: true
        }
      };
    } catch (error) {
      logger.error('Failed to get email service statistics:', error);
      return {
        delivery: {},
        preferences: {},
        subscriptions: {},
        service: {
          isConfigured: false,
          error: error.message
        }
      };
    }
  }

  /**
   * Verify email service configuration
   * @returns {Promise<boolean>} - True if service is working
   */
  async verifyConfiguration() {
    try {
      if (!this.isConfigured) {
        return false;
      }

      await this.transporter.verify();
      logger.info('Enhanced email service configuration verified');
      return true;
    } catch (error) {
      logger.error('Enhanced email service verification failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const enhancedEmailService = new EnhancedEmailService();

module.exports = enhancedEmailService; 