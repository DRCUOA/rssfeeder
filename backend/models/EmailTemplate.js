const database = require('../db/database');
const { logger } = require('../utils/logger');

/**
 * EmailTemplate Model
 * Handles customizable email templates with variable substitution
 */
class EmailTemplate {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.subject = data.subject || null;
    this.html_content = data.html_content || null;
    this.text_content = data.text_content || null;
    this.variables = data.variables || null;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.category = data.category || 'system';
    this.description = data.description || null;
    this.from_name = data.from_name || null;
    this.from_email = data.from_email || null;
    this.created_by = data.created_by || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Create a new email template
   * @param {Object} templateData - Template data
   * @returns {Promise<EmailTemplate>} - Created template
   */
  static async create(templateData) {
    try {
      const db = database.db;
      
      const data = {
        name: templateData.name,
        subject: templateData.subject,
        html_content: templateData.html_content,
        text_content: templateData.text_content,
        variables: templateData.variables ? JSON.stringify(templateData.variables) : null,
        is_active: templateData.is_active !== undefined ? templateData.is_active : true,
        category: templateData.category || 'system',
        description: templateData.description || null,
        from_name: templateData.from_name || null,
        from_email: templateData.from_email || null,
        created_by: templateData.created_by || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [templateId] = await db('email_templates').insert(data);
      
      logger.info(`Email template created: ${templateData.name} (ID: ${templateId})`);
      
      return new EmailTemplate({ id: templateId, ...data });
    } catch (error) {
      logger.error('Error creating email template:', error);
      throw new Error('Email template creation failed');
    }
  }

  /**
   * Find template by name
   * @param {string} name - Template name
   * @returns {Promise<EmailTemplate|null>} - Template or null
   */
  static async findByName(name) {
    try {
      const db = database.db;
      const templateData = await db('email_templates')
        .where('name', name)
        .where('is_active', true)
        .first();
      
      return templateData ? new EmailTemplate(templateData) : null;
    } catch (error) {
      logger.error('Error finding email template:', error);
      throw new Error('Email template lookup failed');
    }
  }

  /**
   * Find template by ID
   * @param {number} id - Template ID
   * @returns {Promise<EmailTemplate|null>} - Template or null
   */
  static async findById(id) {
    try {
      const db = database.db;
      const templateData = await db('email_templates')
        .where('id', id)
        .first();
      
      return templateData ? new EmailTemplate(templateData) : null;
    } catch (error) {
      logger.error('Error finding email template by ID:', error);
      throw new Error('Email template lookup failed');
    }
  }

  /**
   * Get all templates
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - List of templates
   */
  static async getAll(options = {}) {
    try {
      const db = database.db;
      let query = db('email_templates');
      
      if (options.category) {
        query = query.where('category', options.category);
      }
      
      if (options.active !== undefined) {
        query = query.where('is_active', options.active);
      }
      
      const templates = await query.orderBy('name', 'asc');
      
      return templates.map(template => new EmailTemplate(template));
    } catch (error) {
      logger.error('Error getting email templates:', error);
      throw new Error('Email template retrieval failed');
    }
  }

  /**
   * Update template
   * @param {Object} updates - Updates to apply
   * @returns {Promise<EmailTemplate>} - Updated template
   */
  async update(updates) {
    try {
      const db = database.db;
      
      const updateData = {
        ...updates,
        updated_at: new Date()
      };
      
      if (updates.variables && typeof updates.variables === 'object') {
        updateData.variables = JSON.stringify(updates.variables);
      }
      
      await db('email_templates')
        .where('id', this.id)
        .update(updateData);
      
      // Update current instance
      Object.assign(this, updateData);
      
      logger.info(`Email template updated: ${this.name} (ID: ${this.id})`);
      
      return this;
    } catch (error) {
      logger.error('Error updating email template:', error);
      throw new Error('Email template update failed');
    }
  }

  /**
   * Delete template (soft delete by marking inactive)
   * @returns {Promise<boolean>} - Success status
   */
  async delete() {
    try {
      const db = database.db;
      
      await db('email_templates')
        .where('id', this.id)
        .update({ 
          is_active: false, 
          updated_at: new Date() 
        });
      
      this.is_active = false;
      this.updated_at = new Date();
      
      logger.info(`Email template deleted: ${this.name} (ID: ${this.id})`);
      
      return true;
    } catch (error) {
      logger.error('Error deleting email template:', error);
      throw new Error('Email template deletion failed');
    }
  }

  /**
   * Render template with variables
   * @param {Object} variables - Template variables
   * @returns {Object} - Rendered template with subject, html, and text
   */
  render(variables = {}) {
    try {
      const templateVars = this.variables ? JSON.parse(this.variables) : [];
      
      // Helper function to replace variables in content
      const replaceVariables = (content, vars) => {
        let result = content;
        
        // Replace {{variable}} format
        Object.keys(vars).forEach(key => {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          result = result.replace(regex, vars[key] || '');
        });
        
        return result;
      };
      
      const renderedSubject = replaceVariables(this.subject, variables);
      const renderedHtml = replaceVariables(this.html_content, variables);
      const renderedText = replaceVariables(this.text_content, variables);
      
      return {
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText,
        from_name: this.from_name,
        from_email: this.from_email
      };
    } catch (error) {
      logger.error('Error rendering email template:', error);
      throw new Error('Email template rendering failed');
    }
  }

  /**
   * Get template variables
   * @returns {Array} - List of template variables
   */
  getVariables() {
    try {
      return this.variables ? JSON.parse(this.variables) : [];
    } catch (error) {
      logger.error('Error parsing template variables:', error);
      return [];
    }
  }

  /**
   * Validate template content
   * @returns {Object} - Validation result
   */
  validate() {
    const errors = [];
    
    if (!this.name) {
      errors.push('Template name is required');
    }
    
    if (!this.subject) {
      errors.push('Template subject is required');
    }
    
    if (!this.html_content) {
      errors.push('Template HTML content is required');
    }
    
    if (!this.text_content) {
      errors.push('Template text content is required');
    }
    
    // Check for unclosed template variables
    const variableRegex = /{{[^}]*$/;
    if (variableRegex.test(this.html_content) || variableRegex.test(this.text_content)) {
      errors.push('Template contains unclosed variables');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get template statistics
   * @returns {Promise<Object>} - Template usage statistics
   */
  async getStatistics() {
    try {
      const db = database.db;
      
      const stats = await db('email_deliveries')
        .where('template_name', this.name)
        .select(
          db.raw('COUNT(*) as total_sent'),
          db.raw('COUNT(CASE WHEN status = "delivered" THEN 1 END) as delivered'),
          db.raw('COUNT(CASE WHEN status = "bounced" THEN 1 END) as bounced'),
          db.raw('COUNT(CASE WHEN first_opened_at IS NOT NULL THEN 1 END) as opened'),
          db.raw('SUM(click_count) as total_clicks')
        )
        .first();
      
      return {
        total_sent: stats.total_sent || 0,
        delivered: stats.delivered || 0,
        bounced: stats.bounced || 0,
        opened: stats.opened || 0,
        total_clicks: stats.total_clicks || 0,
        delivery_rate: stats.total_sent > 0 ? (stats.delivered / stats.total_sent * 100).toFixed(2) : 0,
        open_rate: stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(2) : 0
      };
    } catch (error) {
      logger.error('Error getting template statistics:', error);
      return {
        total_sent: 0,
        delivered: 0,
        bounced: 0,
        opened: 0,
        total_clicks: 0,
        delivery_rate: 0,
        open_rate: 0
      };
    }
  }
}

module.exports = EmailTemplate; 