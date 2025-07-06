const database = require('../db/database');
const { logger } = require('../utils/logger');

/**
 * EmailDelivery Model
 * Handles email delivery tracking, opens, and clicks
 */
class EmailDelivery {
  constructor(data = {}) {
    this.id = data.id || null;
    this.message_id = data.message_id || null;
    this.template_name = data.template_name || null;
    this.recipient_email = data.recipient_email || null;
    this.user_id = data.user_id || null;
    this.subject = data.subject || null;
    this.status = data.status || 'sent';
    this.bounce_reason = data.bounce_reason || null;
    this.smtp_response = data.smtp_response || null;
    this.sent_at = data.sent_at || null;
    this.delivered_at = data.delivered_at || null;
    this.first_opened_at = data.first_opened_at || null;
    this.last_opened_at = data.last_opened_at || null;
    this.open_count = data.open_count || 0;
    this.click_count = data.click_count || 0;
    this.tracking_pixel_url = data.tracking_pixel_url || null;
    this.metadata = data.metadata || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Create a new email delivery record
   * @param {Object} deliveryData - Delivery data
   * @returns {Promise<EmailDelivery>} - Created delivery record
   */
  static async create(deliveryData) {
    try {
      const db = database.db;
      
      const data = {
        message_id: deliveryData.message_id,
        template_name: deliveryData.template_name,
        recipient_email: deliveryData.recipient_email,
        user_id: deliveryData.user_id || null,
        subject: deliveryData.subject,
        status: deliveryData.status || 'sent',
        bounce_reason: deliveryData.bounce_reason || null,
        smtp_response: deliveryData.smtp_response || null,
        sent_at: deliveryData.sent_at || new Date(),
        delivered_at: deliveryData.delivered_at || null,
        first_opened_at: deliveryData.first_opened_at || null,
        last_opened_at: deliveryData.last_opened_at || null,
        open_count: deliveryData.open_count || 0,
        click_count: deliveryData.click_count || 0,
        tracking_pixel_url: deliveryData.tracking_pixel_url || null,
        metadata: deliveryData.metadata ? JSON.stringify(deliveryData.metadata) : null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [deliveryId] = await db('email_deliveries').insert(data);
      
      logger.info(`Email delivery created: ${deliveryData.recipient_email} (ID: ${deliveryId})`);
      
      return new EmailDelivery({ id: deliveryId, ...data });
    } catch (error) {
      logger.error('Error creating email delivery:', error);
      throw new Error('Email delivery creation failed');
    }
  }

  /**
   * Find delivery by message ID
   * @param {string} messageId - SMTP message ID
   * @returns {Promise<EmailDelivery|null>} - Delivery record or null
   */
  static async findByMessageId(messageId) {
    try {
      const db = database.db;
      const deliveryData = await db('email_deliveries')
        .where('message_id', messageId)
        .first();
      
      return deliveryData ? new EmailDelivery(deliveryData) : null;
    } catch (error) {
      logger.error('Error finding email delivery by message ID:', error);
      throw new Error('Email delivery lookup failed');
    }
  }

  /**
   * Find delivery by ID
   * @param {number} id - Delivery ID
   * @returns {Promise<EmailDelivery|null>} - Delivery record or null
   */
  static async findById(id) {
    try {
      const db = database.db;
      const deliveryData = await db('email_deliveries')
        .where('id', id)
        .first();
      
      return deliveryData ? new EmailDelivery(deliveryData) : null;
    } catch (error) {
      logger.error('Error finding email delivery by ID:', error);
      throw new Error('Email delivery lookup failed');
    }
  }

  /**
   * Get deliveries for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - List of deliveries
   */
  static async getByUserId(userId, options = {}) {
    try {
      const db = database.db;
      let query = db('email_deliveries').where('user_id', userId);
      
      if (options.status) {
        query = query.where('status', options.status);
      }
      
      if (options.template_name) {
        query = query.where('template_name', options.template_name);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const deliveries = await query.orderBy('sent_at', 'desc');
      
      return deliveries.map(delivery => new EmailDelivery(delivery));
    } catch (error) {
      logger.error('Error getting user email deliveries:', error);
      throw new Error('Email delivery retrieval failed');
    }
  }

  /**
   * Get deliveries by template
   * @param {string} templateName - Template name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - List of deliveries
   */
  static async getByTemplate(templateName, options = {}) {
    try {
      const db = database.db;
      let query = db('email_deliveries').where('template_name', templateName);
      
      if (options.status) {
        query = query.where('status', options.status);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const deliveries = await query.orderBy('sent_at', 'desc');
      
      return deliveries.map(delivery => new EmailDelivery(delivery));
    } catch (error) {
      logger.error('Error getting template email deliveries:', error);
      throw new Error('Email delivery retrieval failed');
    }
  }

  /**
   * Update delivery status
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<EmailDelivery>} - Updated delivery
   */
  async updateStatus(status, additionalData = {}) {
    try {
      const db = database.db;
      
      const updateData = {
        status,
        updated_at: new Date(),
        ...additionalData
      };
      
      // Set delivered_at if status is delivered
      if (status === 'delivered' && !this.delivered_at) {
        updateData.delivered_at = new Date();
      }
      
      await db('email_deliveries')
        .where('id', this.id)
        .update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      
      logger.info(`Email delivery status updated: ${this.recipient_email} -> ${status}`);
      
      return this;
    } catch (error) {
      logger.error('Error updating email delivery status:', error);
      throw new Error('Email delivery update failed');
    }
  }

  /**
   * Record email open
   * @returns {Promise<EmailDelivery>} - Updated delivery
   */
  async recordOpen() {
    try {
      const db = database.db;
      const now = new Date();
      
      const updateData = {
        last_opened_at: now,
        open_count: this.open_count + 1,
        updated_at: now
      };
      
      // Set first_opened_at if this is the first open
      if (!this.first_opened_at) {
        updateData.first_opened_at = now;
      }
      
      await db('email_deliveries')
        .where('id', this.id)
        .update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      
      logger.info(`Email open recorded: ${this.recipient_email} (Count: ${this.open_count})`);
      
      return this;
    } catch (error) {
      logger.error('Error recording email open:', error);
      throw new Error('Email open recording failed');
    }
  }

  /**
   * Record email click
   * @param {string} url - Clicked URL
   * @param {Object} clickData - Additional click data
   * @returns {Promise<EmailDelivery>} - Updated delivery
   */
  async recordClick(url, clickData = {}) {
    try {
      const db = database.db;
      const now = new Date();
      
      // Create click record
      const clickRecord = {
        delivery_id: this.id,
        url,
        ip_address: clickData.ip_address || null,
        user_agent: clickData.user_agent || null,
        clicked_at: now,
        referrer: clickData.referrer || null,
        metadata: clickData.metadata ? JSON.stringify(clickData.metadata) : null
      };
      
      await db('email_clicks').insert(clickRecord);
      
      // Update delivery click count
      const updateData = {
        click_count: this.click_count + 1,
        updated_at: now
      };
      
      await db('email_deliveries')
        .where('id', this.id)
        .update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      
      logger.info(`Email click recorded: ${this.recipient_email} -> ${url}`);
      
      return this;
    } catch (error) {
      logger.error('Error recording email click:', error);
      throw new Error('Email click recording failed');
    }
  }

  /**
   * Get click history for this delivery
   * @returns {Promise<Array>} - List of clicks
   */
  async getClicks() {
    try {
      const db = database.db;
      const clicks = await db('email_clicks')
        .where('delivery_id', this.id)
        .orderBy('clicked_at', 'desc');
      
      return clicks;
    } catch (error) {
      logger.error('Error getting email clicks:', error);
      throw new Error('Email click retrieval failed');
    }
  }

  /**
   * Get delivery statistics
   * @param {Object} filters - Filters for statistics
   * @returns {Promise<Object>} - Delivery statistics
   */
  static async getStatistics(filters = {}) {
    try {
      const db = database.db;
      let query = db('email_deliveries');
      
      if (filters.template_name) {
        query = query.where('template_name', filters.template_name);
      }
      
      if (filters.user_id) {
        query = query.where('user_id', filters.user_id);
      }
      
      if (filters.date_from) {
        query = query.where('sent_at', '>=', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.where('sent_at', '<=', filters.date_to);
      }
      
      const stats = await query
        .select(
          db.raw('COUNT(*) as total_sent'),
          db.raw('COUNT(CASE WHEN status = "delivered" THEN 1 END) as delivered'),
          db.raw('COUNT(CASE WHEN status = "bounced" THEN 1 END) as bounced'),
          db.raw('COUNT(CASE WHEN status = "failed" THEN 1 END) as failed'),
          db.raw('COUNT(CASE WHEN first_opened_at IS NOT NULL THEN 1 END) as opened'),
          db.raw('SUM(open_count) as total_opens'),
          db.raw('SUM(click_count) as total_clicks'),
          db.raw('COUNT(DISTINCT recipient_email) as unique_recipients')
        )
        .first();
      
      return {
        total_sent: stats.total_sent || 0,
        delivered: stats.delivered || 0,
        bounced: stats.bounced || 0,
        failed: stats.failed || 0,
        opened: stats.opened || 0,
        total_opens: stats.total_opens || 0,
        total_clicks: stats.total_clicks || 0,
        unique_recipients: stats.unique_recipients || 0,
        delivery_rate: stats.total_sent > 0 ? (stats.delivered / stats.total_sent * 100).toFixed(2) : 0,
        bounce_rate: stats.total_sent > 0 ? (stats.bounced / stats.total_sent * 100).toFixed(2) : 0,
        open_rate: stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(2) : 0,
        click_rate: stats.delivered > 0 ? (stats.total_clicks / stats.delivered * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('Error getting delivery statistics:', error);
      return {
        total_sent: 0,
        delivered: 0,
        bounced: 0,
        failed: 0,
        opened: 0,
        total_opens: 0,
        total_clicks: 0,
        unique_recipients: 0,
        delivery_rate: 0,
        bounce_rate: 0,
        open_rate: 0,
        click_rate: 0
      };
    }
  }

  /**
   * Get metadata
   * @returns {Object} - Parsed metadata
   */
  getMetadata() {
    try {
      return this.metadata ? JSON.parse(this.metadata) : {};
    } catch (error) {
      logger.error('Error parsing delivery metadata:', error);
      return {};
    }
  }

  /**
   * Update metadata
   * @param {Object} metadata - New metadata
   * @returns {Promise<EmailDelivery>} - Updated delivery
   */
  async updateMetadata(metadata) {
    try {
      const db = database.db;
      
      const updateData = {
        metadata: JSON.stringify(metadata),
        updated_at: new Date()
      };
      
      await db('email_deliveries')
        .where('id', this.id)
        .update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      
      return this;
    } catch (error) {
      logger.error('Error updating delivery metadata:', error);
      throw new Error('Delivery metadata update failed');
    }
  }

  /**
   * Clean up old delivery records
   * @param {number} daysToKeep - Days to keep records
   * @returns {Promise<number>} - Number of deleted records
   */
  static async cleanup(daysToKeep = 90) {
    try {
      const db = database.db;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const deletedCount = await db('email_deliveries')
        .where('created_at', '<', cutoffDate)
        .del();
      
      logger.info(`Cleaned up ${deletedCount} old email delivery records`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up email deliveries:', error);
      throw new Error('Email delivery cleanup failed');
    }
  }
}

module.exports = EmailDelivery; 