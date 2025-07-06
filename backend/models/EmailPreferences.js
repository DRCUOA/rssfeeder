const database = require('../db/database');
const { logger } = require('../utils/logger');

/**
 * EmailPreferences Model
 * Handles user email preferences and subscription management
 */
class EmailPreferences {
  constructor(data = {}) {
    this.id = data.id || null;
    this.user_id = data.user_id || null;
    this.preference_type = data.preference_type || null;
    this.is_enabled = data.is_enabled !== undefined ? data.is_enabled : true;
    this.frequency = data.frequency || 'immediate';
    this.delivery_method = data.delivery_method || 'email';
    this.custom_settings = data.custom_settings || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Create or update user email preference
   * @param {Object} preferenceData - Preference data
   * @returns {Promise<EmailPreferences>} - Created/updated preference
   */
  static async createOrUpdate(preferenceData) {
    try {
      const db = database.db;
      
      // Check if preference already exists
      const existing = await db('email_preferences')
        .where('user_id', preferenceData.user_id)
        .where('preference_type', preferenceData.preference_type)
        .first();
      
      if (existing) {
        // Update existing preference
        const updateData = {
          is_enabled: preferenceData.is_enabled !== undefined ? preferenceData.is_enabled : existing.is_enabled,
          frequency: preferenceData.frequency || existing.frequency,
          delivery_method: preferenceData.delivery_method || existing.delivery_method,
          custom_settings: preferenceData.custom_settings ? JSON.stringify(preferenceData.custom_settings) : existing.custom_settings,
          updated_at: new Date()
        };
        
        await db('email_preferences')
          .where('id', existing.id)
          .update(updateData);
        
        logger.info(`Email preference updated: User ${preferenceData.user_id}, Type: ${preferenceData.preference_type}`);
        
        return new EmailPreferences({ ...existing, ...updateData });
      } else {
        // Create new preference
        const data = {
          user_id: preferenceData.user_id,
          preference_type: preferenceData.preference_type,
          is_enabled: preferenceData.is_enabled !== undefined ? preferenceData.is_enabled : true,
          frequency: preferenceData.frequency || 'immediate',
          delivery_method: preferenceData.delivery_method || 'email',
          custom_settings: preferenceData.custom_settings ? JSON.stringify(preferenceData.custom_settings) : null,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        const [preferenceId] = await db('email_preferences').insert(data);
        
        logger.info(`Email preference created: User ${preferenceData.user_id}, Type: ${preferenceData.preference_type}`);
        
        return new EmailPreferences({ id: preferenceId, ...data });
      }
    } catch (error) {
      logger.error('Error creating/updating email preference:', error);
      throw new Error('Email preference creation/update failed');
    }
  }

  /**
   * Get user preferences
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - List of user preferences
   */
  static async getByUserId(userId) {
    try {
      const db = database.db;
      const preferences = await db('email_preferences')
        .where('user_id', userId)
        .orderBy('preference_type', 'asc');
      
      return preferences.map(pref => new EmailPreferences(pref));
    } catch (error) {
      logger.error('Error getting user email preferences:', error);
      throw new Error('Email preference retrieval failed');
    }
  }

  /**
   * Get user preference for specific type
   * @param {number} userId - User ID
   * @param {string} preferenceType - Preference type
   * @returns {Promise<EmailPreferences|null>} - Preference or null
   */
  static async getUserPreference(userId, preferenceType) {
    try {
      const db = database.db;
      const preference = await db('email_preferences')
        .where('user_id', userId)
        .where('preference_type', preferenceType)
        .first();
      
      return preference ? new EmailPreferences(preference) : null;
    } catch (error) {
      logger.error('Error getting user email preference:', error);
      throw new Error('Email preference lookup failed');
    }
  }

  /**
   * Check if user has enabled a specific email type
   * @param {number} userId - User ID
   * @param {string} emailType - Email type to check
   * @returns {Promise<boolean>} - True if enabled
   */
  static async isEmailEnabled(userId, emailType) {
    try {
      const preference = await EmailPreferences.getUserPreference(userId, emailType);
      
      // If no preference exists, default to enabled for system emails
      if (!preference) {
        const systemEmails = ['welcome', 'password_reset', 'password_change', 'security_alert'];
        return systemEmails.includes(emailType);
      }
      
      return preference.is_enabled;
    } catch (error) {
      logger.error('Error checking email preference:', error);
      // Default to enabled for system emails if error occurs
      const systemEmails = ['welcome', 'password_reset', 'password_change', 'security_alert'];
      return systemEmails.includes(emailType);
    }
  }

  /**
   * Initialize default preferences for new user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Created preferences
   */
  static async initializeDefaultPreferences(userId) {
    try {
      const defaultPreferences = [
        { type: 'welcome', enabled: true, frequency: 'immediate' },
        { type: 'password_reset', enabled: true, frequency: 'immediate' },
        { type: 'password_change', enabled: true, frequency: 'immediate' },
        { type: 'security_alert', enabled: true, frequency: 'immediate' },
        { type: 'newsletter', enabled: true, frequency: 'weekly' },
        { type: 'marketing', enabled: false, frequency: 'weekly' },
        { type: 'product_updates', enabled: true, frequency: 'monthly' }
      ];
      
      const createdPreferences = [];
      
      for (const pref of defaultPreferences) {
        const preference = await EmailPreferences.createOrUpdate({
          user_id: userId,
          preference_type: pref.type,
          is_enabled: pref.enabled,
          frequency: pref.frequency
        });
        createdPreferences.push(preference);
      }
      
      logger.info(`Default email preferences initialized for user: ${userId}`);
      
      return createdPreferences;
    } catch (error) {
      logger.error('Error initializing default email preferences:', error);
      throw new Error('Default email preferences initialization failed');
    }
  }

  /**
   * Update preference
   * @param {Object} updates - Updates to apply
   * @returns {Promise<EmailPreferences>} - Updated preference
   */
  async update(updates) {
    try {
      const db = database.db;
      
      const updateData = {
        ...updates,
        updated_at: new Date()
      };
      
      if (updates.custom_settings && typeof updates.custom_settings === 'object') {
        updateData.custom_settings = JSON.stringify(updates.custom_settings);
      }
      
      await db('email_preferences')
        .where('id', this.id)
        .update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      
      logger.info(`Email preference updated: User ${this.user_id}, Type: ${this.preference_type}`);
      
      return this;
    } catch (error) {
      logger.error('Error updating email preference:', error);
      throw new Error('Email preference update failed');
    }
  }

  /**
   * Delete preference
   * @returns {Promise<boolean>} - Success status
   */
  async delete() {
    try {
      const db = database.db;
      
      await db('email_preferences')
        .where('id', this.id)
        .del();
      
      logger.info(`Email preference deleted: User ${this.user_id}, Type: ${this.preference_type}`);
      
      return true;
    } catch (error) {
      logger.error('Error deleting email preference:', error);
      throw new Error('Email preference deletion failed');
    }
  }

  /**
   * Get custom settings
   * @returns {Object} - Parsed custom settings
   */
  getCustomSettings() {
    try {
      return this.custom_settings ? JSON.parse(this.custom_settings) : {};
    } catch (error) {
      logger.error('Error parsing custom settings:', error);
      return {};
    }
  }

  /**
   * Get available preference types
   * @returns {Array} - List of available preference types
   */
  static getAvailableTypes() {
    return [
      {
        type: 'welcome',
        name: 'Welcome Emails',
        description: 'Welcome emails for new users',
        category: 'system',
        required: true
      },
      {
        type: 'password_reset',
        name: 'Password Reset',
        description: 'Password reset and security emails',
        category: 'system',
        required: true
      },
      {
        type: 'password_change',
        name: 'Password Change',
        description: 'Password change confirmations',
        category: 'system',
        required: true
      },
      {
        type: 'security_alert',
        name: 'Security Alerts',
        description: 'Security-related notifications',
        category: 'system',
        required: true
      },
      {
        type: 'newsletter',
        name: 'Newsletter',
        description: 'Weekly newsletter with updates',
        category: 'marketing',
        required: false
      },
      {
        type: 'marketing',
        name: 'Marketing',
        description: 'Promotional emails and offers',
        category: 'marketing',
        required: false
      },
      {
        type: 'product_updates',
        name: 'Product Updates',
        description: 'Product updates and new features',
        category: 'transactional',
        required: false
      }
    ];
  }

  /**
   * Get preference statistics
   * @returns {Promise<Object>} - Preference statistics
   */
  static async getStatistics() {
    try {
      const db = database.db;
      
      const stats = await db('email_preferences')
        .select('preference_type')
        .select(db.raw('COUNT(*) as total'))
        .select(db.raw('SUM(CASE WHEN is_enabled = 1 THEN 1 ELSE 0 END) as enabled'))
        .select(db.raw('SUM(CASE WHEN is_enabled = 0 THEN 1 ELSE 0 END) as disabled'))
        .groupBy('preference_type');
      
      const formattedStats = {};
      stats.forEach(stat => {
        formattedStats[stat.preference_type] = {
          total: stat.total,
          enabled: stat.enabled,
          disabled: stat.disabled,
          enable_rate: stat.total > 0 ? (stat.enabled / stat.total * 100).toFixed(2) : 0
        };
      });
      
      return formattedStats;
    } catch (error) {
      logger.error('Error getting preference statistics:', error);
      return {};
    }
  }
}

/**
 * EmailSubscription Model
 * Handles bulk email subscriptions and lists
 */
class EmailSubscription {
  constructor(data = {}) {
    this.id = data.id || null;
    this.list_name = data.list_name || null;
    this.list_description = data.list_description || null;
    this.email = data.email || null;
    this.user_id = data.user_id || null;
    this.status = data.status || 'active';
    this.subscription_source = data.subscription_source || null;
    this.subscribed_at = data.subscribed_at || null;
    this.unsubscribed_at = data.unsubscribed_at || null;
    this.unsubscribe_reason = data.unsubscribe_reason || null;
    this.metadata = data.metadata || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Subscribe email to list
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<EmailSubscription>} - Created subscription
   */
  static async subscribe(subscriptionData) {
    try {
      const db = database.db;
      
      // Check if subscription already exists
      const existing = await db('email_subscriptions')
        .where('list_name', subscriptionData.list_name)
        .where('email', subscriptionData.email.toLowerCase())
        .first();
      
      if (existing) {
        if (existing.status === 'unsubscribed') {
          // Resubscribe
          const updateData = {
            status: 'active',
            subscribed_at: new Date(),
            unsubscribed_at: null,
            unsubscribe_reason: null,
            subscription_source: subscriptionData.subscription_source || 'resubscribe',
            updated_at: new Date()
          };
          
          await db('email_subscriptions')
            .where('id', existing.id)
            .update(updateData);
          
          logger.info(`Email resubscribed: ${subscriptionData.email} to ${subscriptionData.list_name}`);
          
          return new EmailSubscription({ ...existing, ...updateData });
        } else {
          // Already subscribed
          return new EmailSubscription(existing);
        }
      } else {
        // Create new subscription
        const data = {
          list_name: subscriptionData.list_name,
          list_description: subscriptionData.list_description || null,
          email: subscriptionData.email.toLowerCase(),
          user_id: subscriptionData.user_id || null,
          status: 'active',
          subscription_source: subscriptionData.subscription_source || 'manual',
          subscribed_at: new Date(),
          unsubscribed_at: null,
          unsubscribe_reason: null,
          metadata: subscriptionData.metadata ? JSON.stringify(subscriptionData.metadata) : null,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        const [subscriptionId] = await db('email_subscriptions').insert(data);
        
        logger.info(`Email subscribed: ${subscriptionData.email} to ${subscriptionData.list_name}`);
        
        return new EmailSubscription({ id: subscriptionId, ...data });
      }
    } catch (error) {
      logger.error('Error subscribing email:', error);
      throw new Error('Email subscription failed');
    }
  }

  /**
   * Unsubscribe email from list
   * @param {string} email - Email address
   * @param {string} listName - List name
   * @param {string} reason - Unsubscribe reason
   * @returns {Promise<boolean>} - Success status
   */
  static async unsubscribe(email, listName, reason = 'user_request') {
    try {
      const db = database.db;
      
      const updateData = {
        status: 'unsubscribed',
        unsubscribed_at: new Date(),
        unsubscribe_reason: reason,
        updated_at: new Date()
      };
      
      const updated = await db('email_subscriptions')
        .where('email', email.toLowerCase())
        .where('list_name', listName)
        .update(updateData);
      
      if (updated > 0) {
        logger.info(`Email unsubscribed: ${email} from ${listName}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error unsubscribing email:', error);
      throw new Error('Email unsubscription failed');
    }
  }

  /**
   * Get subscriptions for email
   * @param {string} email - Email address
   * @returns {Promise<Array>} - List of subscriptions
   */
  static async getByEmail(email) {
    try {
      const db = database.db;
      const subscriptions = await db('email_subscriptions')
        .where('email', email.toLowerCase())
        .orderBy('subscribed_at', 'desc');
      
      return subscriptions.map(sub => new EmailSubscription(sub));
    } catch (error) {
      logger.error('Error getting email subscriptions:', error);
      throw new Error('Email subscription retrieval failed');
    }
  }

  /**
   * Get active subscribers for list
   * @param {string} listName - List name
   * @returns {Promise<Array>} - List of active subscribers
   */
  static async getActiveSubscribers(listName) {
    try {
      const db = database.db;
      const subscribers = await db('email_subscriptions')
        .where('list_name', listName)
        .where('status', 'active')
        .orderBy('subscribed_at', 'desc');
      
      return subscribers.map(sub => new EmailSubscription(sub));
    } catch (error) {
      logger.error('Error getting active subscribers:', error);
      throw new Error('Subscriber retrieval failed');
    }
  }

  /**
   * Get subscription statistics
   * @param {string} listName - List name (optional)
   * @returns {Promise<Object>} - Subscription statistics
   */
  static async getStatistics(listName = null) {
    try {
      const db = database.db;
      let query = db('email_subscriptions');
      
      if (listName) {
        query = query.where('list_name', listName);
      }
      
      const stats = await query
        .select('list_name')
        .select(db.raw('COUNT(*) as total'))
        .select(db.raw('SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as active'))
        .select(db.raw('SUM(CASE WHEN status = "unsubscribed" THEN 1 ELSE 0 END) as unsubscribed'))
        .select(db.raw('SUM(CASE WHEN status = "bounced" THEN 1 ELSE 0 END) as bounced'))
        .groupBy('list_name');
      
      if (listName) {
        const stat = stats[0];
        return stat ? {
          list_name: stat.list_name,
          total: stat.total,
          active: stat.active,
          unsubscribed: stat.unsubscribed,
          bounced: stat.bounced,
          unsubscribe_rate: stat.total > 0 ? (stat.unsubscribed / stat.total * 100).toFixed(2) : 0
        } : null;
      }
      
      const formattedStats = {};
      stats.forEach(stat => {
        formattedStats[stat.list_name] = {
          total: stat.total,
          active: stat.active,
          unsubscribed: stat.unsubscribed,
          bounced: stat.bounced,
          unsubscribe_rate: stat.total > 0 ? (stat.unsubscribed / stat.total * 100).toFixed(2) : 0
        };
      });
      
      return formattedStats;
    } catch (error) {
      logger.error('Error getting subscription statistics:', error);
      return listName ? null : {};
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
      logger.error('Error parsing subscription metadata:', error);
      return {};
    }
  }
}

module.exports = {
  EmailPreferences,
  EmailSubscription
}; 