const nodemailer = require('nodemailer');
const config = require('../config');
const { logger } = require('./logger');

/**
 * Email Service
 * Handles sending emails for authentication and user notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    try {
      if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
        logger.warn('Email service not configured - SMTP credentials missing');
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
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} - True if email service is working
   */
  async verifyConfiguration() {
    try {
      if (!this.isConfigured) {
        return false;
      }

      await this.transporter.verify();
      logger.info('Email service configuration verified');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(options) {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      const mailOptions = {
        from: config.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Email sending failed');
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's name
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordResetEmail(email, resetToken, userName) {
    try {
      const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      const subject = 'Reset Your RSSFeeder Password';
      
      const textMessage = `
Hello ${userName},

You recently requested to reset your password for your RSSFeeder account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

Best regards,
The RSSFeeder Team
      `.trim();

      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RSSFeeder</h1>
            <h2>Password Reset Request</h2>
        </div>
        
        <div class="content">
            <p>Hello ${userName},</p>
            
            <p>You recently requested to reset your password for your RSSFeeder account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <a href="${resetUrl}" class="button">Reset Your Password</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            
            <div class="warning">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The RSSFeeder Team</p>
            <p style="font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
      `.trim();

      return await this.sendEmail({
        to: email,
        subject: subject,
        text: textMessage,
        html: htmlMessage
      });
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Password reset email sending failed');
    }
  }

  /**
   * Send welcome email for new users
   * @param {string} email - Recipient email
   * @param {string} userName - User's name
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(email, userName) {
    try {
      const loginUrl = `${config.FRONTEND_URL}/login`;
      
      const subject = 'Welcome to RSSFeeder!';
      
      const textMessage = `
Hello ${userName},

Welcome to RSSFeeder! Your account has been created successfully.

RSSFeeder helps you stay up-to-date with your favorite feeds and content sources. You can now:

- Subscribe to RSS and Atom feeds
- Organize content with categories
- Track your reading progress
- Bookmark important articles
- Customize your reading experience

Get started by logging in at: ${loginUrl}

If you have any questions or need help, please don't hesitate to contact our support team.

Best regards,
The RSSFeeder Team
      `.trim();

      const htmlMessage = `
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
        .features { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .feature { margin: 10px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to RSSFeeder!</h1>
        </div>
        
        <div class="content">
            <p>Hello ${userName},</p>
            
            <p>Welcome to RSSFeeder! Your account has been created successfully.</p>
            
            <p>RSSFeeder helps you stay up-to-date with your favorite feeds and content sources.</p>
            
            <div class="features">
                <h3>What you can do with RSSFeeder:</h3>
                <div class="feature">📡 Subscribe to RSS and Atom feeds</div>
                <div class="feature">🗂️ Organize content with categories</div>
                <div class="feature">📊 Track your reading progress</div>
                <div class="feature">🔖 Bookmark important articles</div>
                <div class="feature">⚙️ Customize your reading experience</div>
            </div>
            
            <p>Ready to get started?</p>
            
            <a href="${loginUrl}" class="button">Start Reading</a>
            
            <p>If you have any questions or need help, please don't hesitate to contact our support team.</p>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The RSSFeeder Team</p>
            <p style="font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
      `.trim();

      return await this.sendEmail({
        to: email,
        subject: subject,
        text: textMessage,
        html: htmlMessage
      });
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      throw new Error('Welcome email sending failed');
    }
  }

  /**
   * Send password change confirmation email
   * @param {string} email - Recipient email
   * @param {string} userName - User's name
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordChangeConfirmation(email, userName) {
    try {
      const loginUrl = `${config.FRONTEND_URL}/login`;
      
      const subject = 'Password Changed Successfully';
      
      const textMessage = `
Hello ${userName},

Your RSSFeeder account password has been changed successfully.

If you made this change, no further action is required.

If you didn't change your password, please contact our support team immediately or reset your password at:
${loginUrl}

For your security, we recommend:
- Using a strong, unique password
- Enabling two-factor authentication if available
- Not sharing your login credentials

Best regards,
The RSSFeeder Team
      `.trim();

      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .security-tips { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RSSFeeder</h1>
            <h2>Password Changed Successfully</h2>
        </div>
        
        <div class="content">
            <p>Hello ${userName},</p>
            
            <p>Your RSSFeeder account password has been changed successfully.</p>
            
            <p>If you made this change, no further action is required.</p>
            
            <div class="warning">
                <strong>Didn't change your password?</strong><br>
                If you didn't change your password, please contact our support team immediately or reset your password using the button below.
            </div>
            
            <a href="${loginUrl}" class="button">Login to Your Account</a>
            
            <div class="security-tips">
                <strong>Security Tips:</strong>
                <ul>
                    <li>Use a strong, unique password</li>
                    <li>Enable two-factor authentication if available</li>
                    <li>Don't share your login credentials</li>
                    <li>Log out from shared devices</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The RSSFeeder Team</p>
            <p style="font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
      `.trim();

      return await this.sendEmail({
        to: email,
        subject: subject,
        text: textMessage,
        html: htmlMessage
      });
    } catch (error) {
      logger.error('Failed to send password change confirmation email:', error);
      throw new Error('Password change confirmation email sending failed');
    }
  }

  /**
   * Test email sending (for development/testing)
   * @param {string} email - Test recipient email
   * @returns {Promise<Object>} - Send result
   */
  async sendTestEmail(email) {
    try {
      const subject = 'RSSFeeder Email Service Test';
      
      const textMessage = `
This is a test email from RSSFeeder.

If you received this email, the email service is working correctly.

Timestamp: ${new Date().toISOString()}
      `.trim();

      const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Email Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Email Service Test</h1>
        </div>
        <p>This is a test email from RSSFeeder.</p>
        <p>If you received this email, the email service is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    </div>
</body>
</html>
      `.trim();

      return await this.sendEmail({
        to: email,
        subject: subject,
        text: textMessage,
        html: htmlMessage
      });
    } catch (error) {
      logger.error('Failed to send test email:', error);
      throw new Error('Test email sending failed');
    }
  }

  /**
   * Get email service status
   * @returns {Object} - Service status information
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      smtpHost: config.SMTP_HOST || 'Not configured',
      smtpPort: config.SMTP_PORT || 'Not configured',
      smtpSecure: config.SMTP_SECURE,
      fromAddress: config.SMTP_FROM || 'Not configured'
    };
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService; 