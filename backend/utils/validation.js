const { ValidationError } = require('../middlewares/errorHandler');
const { logger } = require('./logger');

/**
 * Input Validation Utilities
 * Handles validation of request data for authentication endpoints
 */
class ValidationUtils {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} - True if email is valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with isValid and issues
   */
  static validatePassword(password) {
    const issues = [];
    
    if (!password) {
      issues.push('Password is required');
    } else {
      if (password.length < 8) {
        issues.push('Password must be at least 8 characters long');
      }
      if (password.length > 128) {
        issues.push('Password must be less than 128 characters long');
      }
      if (!/[a-z]/.test(password)) {
        issues.push('Password must contain at least one lowercase letter');
      }
      if (!/[A-Z]/.test(password)) {
        issues.push('Password must contain at least one uppercase letter');
      }
      if (!/\d/.test(password)) {
        issues.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        issues.push('Password must contain at least one special character');
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Validate name format
   * @param {string} name - Name to validate
   * @returns {boolean} - True if name is valid
   */
  static isValidName(name) {
    if (!name || typeof name !== 'string') {
      return false;
    }
    
    const trimmedName = name.trim();
    return trimmedName.length >= 2 && trimmedName.length <= 100;
  }

  /**
   * Sanitize string input
   * @param {string} input - Input to sanitize
   * @returns {string} - Sanitized input
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate required fields
   * @param {Object} data - Data object to validate
   * @param {string[]} requiredFields - Array of required field names
   * @returns {string[]} - Array of missing fields
   */
  static getMissingFields(data, requiredFields) {
    return requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });
  }
}

/**
 * Authentication Validation Schemas
 */
class AuthValidation {
  /**
   * Validate user registration data
   * @param {Object} data - Registration data
   * @returns {Object} - Validation result
   */
  static validateRegistration(data) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['name', 'email', 'password'];
    const missingFields = ValidationUtils.getMissingFields(data, requiredFields);
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate email
    if (data.email) {
      if (!ValidationUtils.isValidEmail(data.email)) {
        errors.push('Please provide a valid email address');
      }
      if (data.email.length > 255) {
        errors.push('Email address is too long');
      }
    }

    // Validate name
    if (data.name) {
      if (!ValidationUtils.isValidName(data.name)) {
        errors.push('Name must be between 2 and 100 characters');
      }
    }

    // Validate password
    if (data.password) {
      const passwordValidation = ValidationUtils.validatePassword(data.password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.issues);
      }
    }

    // Validate optional fields
    if (data.avatar_url && data.avatar_url.length > 500) {
      errors.push('Avatar URL is too long');
    }

    if (data.theme_color && !/^[a-zA-Z0-9#]+$/.test(data.theme_color)) {
      errors.push('Invalid theme color format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        name: ValidationUtils.sanitizeString(data.name),
        email: data.email ? data.email.toLowerCase().trim() : '',
        password: data.password,
        avatar_url: data.avatar_url ? ValidationUtils.sanitizeString(data.avatar_url) : null,
        dark_mode: data.dark_mode ? parseInt(data.dark_mode) : 0,
        text_size: data.text_size ? parseInt(data.text_size) : 2,
        theme_color: data.theme_color ? ValidationUtils.sanitizeString(data.theme_color) : 'orange',
        push_notifications: data.push_notifications ? parseInt(data.push_notifications) : 1,
        email_notifications: data.email_notifications ? parseInt(data.email_notifications) : 1,
        new_feed_alerts: data.new_feed_alerts ? parseInt(data.new_feed_alerts) : 0,
        data_collection: data.data_collection ? parseInt(data.data_collection) : 1
      }
    };
  }

  /**
   * Validate user login data
   * @param {Object} data - Login data
   * @returns {Object} - Validation result
   */
  static validateLogin(data) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['email', 'password'];
    const missingFields = ValidationUtils.getMissingFields(data, requiredFields);
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate email format
    if (data.email && !ValidationUtils.isValidEmail(data.email)) {
      errors.push('Please provide a valid email address');
    }

    // Basic password check (don't reveal password requirements on login)
    if (data.password && (data.password.length < 1 || data.password.length > 128)) {
      errors.push('Invalid password length');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        email: data.email ? data.email.toLowerCase().trim() : '',
        password: data.password || ''
      }
    };
  }

  /**
   * Validate password change data
   * @param {Object} data - Password change data
   * @returns {Object} - Validation result
   */
  static validatePasswordChange(data) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['currentPassword', 'newPassword'];
    const missingFields = ValidationUtils.getMissingFields(data, requiredFields);
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate current password
    if (data.currentPassword && (data.currentPassword.length < 1 || data.currentPassword.length > 128)) {
      errors.push('Invalid current password length');
    }

    // Validate new password
    if (data.newPassword) {
      const passwordValidation = ValidationUtils.validatePassword(data.newPassword);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.issues);
      }

      // Check if new password is different from current
      if (data.currentPassword && data.newPassword === data.currentPassword) {
        errors.push('New password must be different from current password');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        currentPassword: data.currentPassword || '',
        newPassword: data.newPassword || ''
      }
    };
  }

  /**
   * Validate password reset request data
   * @param {Object} data - Reset request data
   * @returns {Object} - Validation result
   */
  static validatePasswordResetRequest(data) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['email'];
    const missingFields = ValidationUtils.getMissingFields(data, requiredFields);
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate email
    if (data.email && !ValidationUtils.isValidEmail(data.email)) {
      errors.push('Please provide a valid email address');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        email: data.email ? data.email.toLowerCase().trim() : ''
      }
    };
  }

  /**
   * Validate password reset data
   * @param {Object} data - Reset data
   * @returns {Object} - Validation result
   */
  static validatePasswordReset(data) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['token', 'newPassword'];
    const missingFields = ValidationUtils.getMissingFields(data, requiredFields);
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate token
    if (data.token && (typeof data.token !== 'string' || data.token.length < 10)) {
      errors.push('Invalid reset token');
    }

    // Validate new password
    if (data.newPassword) {
      const passwordValidation = ValidationUtils.validatePassword(data.newPassword);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.issues);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        token: data.token || '',
        newPassword: data.newPassword || ''
      }
    };
  }

  /**
   * Validate refresh token data
   * @param {Object} data - Refresh token data
   * @returns {Object} - Validation result
   */
  static validateRefreshToken(data) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['refreshToken'];
    const missingFields = ValidationUtils.getMissingFields(data, requiredFields);
    
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Basic token format validation
    if (data.refreshToken && typeof data.refreshToken !== 'string') {
      errors.push('Invalid refresh token format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: {
        refreshToken: data.refreshToken || ''
      }
    };
  }

  /**
   * Validate user profile update data
   * @param {Object} data - Profile update data
   * @returns {Object} - Validation result
   */
  static validateProfileUpdate(data) {
    const errors = [];
    
    // Validate name if provided
    if (data.name !== undefined) {
      if (!ValidationUtils.isValidName(data.name)) {
        errors.push('Name must be between 2 and 100 characters');
      }
    }

    // Validate avatar URL if provided
    if (data.avatar_url !== undefined && data.avatar_url !== null) {
      if (typeof data.avatar_url !== 'string' || data.avatar_url.length > 500) {
        errors.push('Avatar URL is too long');
      }
    }

    // Validate boolean and integer fields
    const booleanFields = ['dark_mode', 'push_notifications', 'email_notifications', 'new_feed_alerts', 'data_collection'];
    booleanFields.forEach(field => {
      if (data[field] !== undefined) {
        const value = parseInt(data[field]);
        if (isNaN(value) || (value !== 0 && value !== 1)) {
          errors.push(`${field} must be 0 or 1`);
        }
      }
    });

    // Validate text size
    if (data.text_size !== undefined) {
      const textSize = parseInt(data.text_size);
      if (isNaN(textSize) || textSize < 1 || textSize > 3) {
        errors.push('Text size must be 1, 2, or 3');
      }
    }

    // Validate theme color
    if (data.theme_color !== undefined) {
      if (typeof data.theme_color !== 'string' || data.theme_color.length > 50) {
        errors.push('Invalid theme color');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: Object.keys(data).reduce((acc, key) => {
        if (data[key] !== undefined) {
          if (typeof data[key] === 'string') {
            acc[key] = ValidationUtils.sanitizeString(data[key]);
          } else {
            acc[key] = data[key];
          }
        }
        return acc;
      }, {})
    };
  }
}

/**
 * Express middleware for validation
 */
class ValidationMiddleware {
  /**
   * Create validation middleware for a specific validator
   * @param {Function} validator - Validation function
   * @returns {Function} - Express middleware
   */
  static validate(validator) {
    return (req, res, next) => {
      try {
        const validation = validator(req.body);
        
        if (!validation.isValid) {
          logger.warn('Validation failed:', { 
            errors: validation.errors,
            ip: req.ip,
            endpoint: req.path 
          });
          
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: validation.errors
            }
          });
        }
        
        // Attach sanitized data to request
        req.validatedData = validation.sanitizedData;
        next();
      } catch (error) {
        logger.error('Validation middleware error:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Validation process failed'
          }
        });
      }
    };
  }

  /**
   * Registration validation middleware
   */
  static validateRegistration = ValidationMiddleware.validate(AuthValidation.validateRegistration);

  /**
   * Login validation middleware
   */
  static validateLogin = ValidationMiddleware.validate(AuthValidation.validateLogin);

  /**
   * Password change validation middleware
   */
  static validatePasswordChange = ValidationMiddleware.validate(AuthValidation.validatePasswordChange);

  /**
   * Password reset request validation middleware
   */
  static validatePasswordResetRequest = ValidationMiddleware.validate(AuthValidation.validatePasswordResetRequest);

  /**
   * Password reset validation middleware
   */
  static validatePasswordReset = ValidationMiddleware.validate(AuthValidation.validatePasswordReset);

  /**
   * Refresh token validation middleware
   */
  static validateRefreshToken = ValidationMiddleware.validate(AuthValidation.validateRefreshToken);

  /**
   * Profile update validation middleware
   */
  static validateProfileUpdate = ValidationMiddleware.validate(AuthValidation.validateProfileUpdate);
}

module.exports = {
  ValidationUtils,
  AuthValidation,
  ValidationMiddleware
}; 