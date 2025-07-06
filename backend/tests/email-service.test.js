const request = require('supertest');
const { app } = require('../app');
const { logger } = require('../utils/testLogger');
const EmailTemplate = require('../models/EmailTemplate');
const EmailDelivery = require('../models/EmailDelivery');
const { EmailPreferences, EmailSubscription } = require('../models/EmailPreferences');
const enhancedEmailService = require('../utils/enhancedEmailService');

describe('Email Service (B2.6)', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Email Test User',
        email: 'emailtest@example.com',
        password: 'TestPassword123!'
      });

    testUser = registerResponse.body.data.user;
    authToken = registerResponse.body.data.auth.accessToken;

    logger.debug('Email service test user created', { userId: testUser.id });
  });

  describe('Email Templates', () => {
    let testTemplate;

    describe('POST /api/v1/email/templates', () => {
      it('should create a new email template', async () => {
        const templateData = {
          name: 'test-template',
          subject: 'Test Email - {{name}}',
          html_content: '<h1>Hello {{name}}</h1><p>This is a test email.</p>',
          text_content: 'Hello {{name}}\n\nThis is a test email.',
          variables: ['name'],
          category: 'system',
          description: 'Test template for automated testing'
        };

        const response = await request(app)
          .post('/api/v1/email/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send(templateData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(templateData.name);
        expect(response.body.data.subject).toBe(templateData.subject);
        expect(response.body.data.created_by).toBe(testUser.id);

        testTemplate = response.body.data;
        logger.debug('Test template created', { templateId: testTemplate.id });
      });

      it('should validate template content', async () => {
        const invalidTemplate = {
          name: 'invalid-template',
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/v1/email/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidTemplate)
          .expect(500); // Will fail during template creation/validation

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/email/templates', () => {
      it('should get all email templates', async () => {
        const response = await request(app)
          .get('/api/v1/email/templates')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);

        const template = response.body.data.find(t => t.id === testTemplate.id);
        expect(template).toBeDefined();
      });

      it('should filter templates by category', async () => {
        const response = await request(app)
          .get('/api/v1/email/templates?category=system')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        response.body.data.forEach(template => {
          expect(template.category).toBe('system');
        });
      });
    });

    describe('GET /api/v1/email/templates/:id', () => {
      it('should get specific email template', async () => {
        const response = await request(app)
          .get(`/api/v1/email/templates/${testTemplate.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testTemplate.id);
        expect(response.body.data.name).toBe(testTemplate.name);
      });

      it('should return 404 for non-existent template', async () => {
        const response = await request(app)
          .get('/api/v1/email/templates/999999')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('TEMPLATE_NOT_FOUND');
      });
    });

    describe('PUT /api/v1/email/templates/:id', () => {
      it('should update email template', async () => {
        const updates = {
          subject: 'Updated Test Email - {{name}}',
          description: 'Updated test template'
        };

        const response = await request(app)
          .put(`/api/v1/email/templates/${testTemplate.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.subject).toBe(updates.subject);
        expect(response.body.data.description).toBe(updates.description);
      });
    });

    describe('Template Rendering', () => {
      it('should render template with variables', async () => {
        const template = await EmailTemplate.findById(testTemplate.id);
        const rendered = template.render({ name: 'John Doe' });

        expect(rendered.subject).toBe('Updated Test Email - John Doe');
        expect(rendered.html).toContain('Hello John Doe');
        expect(rendered.text).toContain('Hello John Doe');
      });

      it('should handle missing variables gracefully', async () => {
        const template = await EmailTemplate.findById(testTemplate.id);
        const rendered = template.render({}); // No variables

        expect(rendered.subject).toBe('Updated Test Email - ');
        expect(rendered.html).toContain('Hello ');
      });
    });
  });

  describe('Email Preferences', () => {
    describe('GET /api/v1/email/preferences', () => {
      it('should get user email preferences', async () => {
        const response = await request(app)
          .get('/api/v1/email/preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.availableTypes).toBeDefined();
        expect(Array.isArray(response.body.data.availableTypes)).toBe(true);
        expect(Array.isArray(response.body.data.preferences)).toBe(true);
      });
    });

    describe('PUT /api/v1/email/preferences', () => {
      it('should update user email preferences', async () => {
        const preferences = [
          {
            preference_type: 'newsletter',
            is_enabled: false,
            frequency: 'weekly'
          },
          {
            preference_type: 'marketing',
            is_enabled: true,
            frequency: 'monthly'
          }
        ];

        const response = await request(app)
          .put('/api/v1/email/preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ preferences })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(2);

        const newsletterPref = response.body.data.find(p => p.preference_type === 'newsletter');
        expect(newsletterPref.is_enabled).toBe(false);
        expect(newsletterPref.frequency).toBe('weekly');
      });

      it('should reject invalid preferences format', async () => {
        const response = await request(app)
          .put('/api/v1/email/preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ preferences: 'invalid' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_PREFERENCES_FORMAT');
      });
    });

    describe('Preference Checking', () => {
      it('should check if email type is enabled for user', async () => {
        // System emails should be enabled by default
        const isEnabled = await EmailPreferences.isEmailEnabled(testUser.id, 'welcome');
        expect(isEnabled).toBe(true);

        // Newsletter should be disabled from previous test
        const newsletterEnabled = await EmailPreferences.isEmailEnabled(testUser.id, 'newsletter');
        expect(newsletterEnabled).toBe(false);
      });

      it('should default to enabled for system emails when no preference exists', async () => {
        const isEnabled = await EmailPreferences.isEmailEnabled(testUser.id, 'password_reset');
        expect(isEnabled).toBe(true);
      });
    });
  });

  describe('Email Subscriptions', () => {
    let testSubscription;

    describe('POST /api/v1/email/subscriptions', () => {
      it('should subscribe user to email list', async () => {
        const subscriptionData = {
          listName: 'test-newsletter',
          listDescription: 'Test newsletter for automated testing'
        };

        const response = await request(app)
          .post('/api/v1/email/subscriptions')
          .set('Authorization', `Bearer ${authToken}`)
          .send(subscriptionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.list_name).toBe(subscriptionData.listName);
        expect(response.body.data.email).toBe(testUser.email);
        expect(response.body.data.status).toBe('active');

        testSubscription = response.body.data;
        logger.debug('Test subscription created', { subscriptionId: testSubscription.id });
      });

      it('should require list name', async () => {
        const response = await request(app)
          .post('/api/v1/email/subscriptions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_LIST_NAME');
      });
    });

    describe('GET /api/v1/email/subscriptions', () => {
      it('should get user email subscriptions', async () => {
        const response = await request(app)
          .get('/api/v1/email/subscriptions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);

        const subscription = response.body.data.find(s => s.id === testSubscription.id);
        expect(subscription).toBeDefined();
        expect(subscription.status).toBe('active');
      });
    });

    describe('DELETE /api/v1/email/subscriptions/:listName', () => {
      it('should unsubscribe user from email list', async () => {
        const response = await request(app)
          .delete(`/api/v1/email/subscriptions/${testSubscription.list_name}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('unsubscribed');

        // Verify subscription status changed
        const subscriptions = await EmailSubscription.getByEmail(testUser.email);
        const unsubscribed = subscriptions.find(s => s.list_name === testSubscription.list_name);
        expect(unsubscribed.status).toBe('unsubscribed');
      });

      it('should return 404 for non-existent subscription', async () => {
        const response = await request(app)
          .delete('/api/v1/email/subscriptions/non-existent-list')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SUBSCRIPTION_NOT_FOUND');
      });
    });

    describe('Public Unsubscribe', () => {
      beforeEach(async () => {
        // Resubscribe for testing
        await EmailSubscription.subscribe({
          list_name: 'test-newsletter',
          email: testUser.email,
          user_id: testUser.id
        });
      });

      it('should handle public unsubscribe link', async () => {
        const response = await request(app)
          .get(`/api/v1/email/unsubscribe/test-newsletter/${encodeURIComponent(testUser.email)}`)
          .expect(200);

        expect(response.text).toContain('Unsubscribed Successfully');
        expect(response.text).toContain('test-newsletter');
      });

      it('should handle non-existent subscription in public unsubscribe', async () => {
        const response = await request(app)
          .get('/api/v1/email/unsubscribe/non-existent/nonexistent@example.com')
          .expect(404);

        expect(response.text).toContain('Unsubscribe Failed');
      });
    });
  });

  describe('Email Tracking', () => {
    let testDelivery;

    beforeEach(async () => {
      // Create test delivery record
      testDelivery = await EmailDelivery.create({
        message_id: 'test-message-' + Date.now(),
        template_name: 'test-template',
        recipient_email: testUser.email,
        user_id: testUser.id,
        subject: 'Test Email',
        status: 'sent'
      });
    });

    describe('GET /api/v1/email/track/open/:deliveryId', () => {
      it('should track email open and return tracking pixel', async () => {
        const response = await request(app)
          .get(`/api/v1/email/track/open/${testDelivery.id}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('image/gif');

        // Verify open was recorded
        const updatedDelivery = await EmailDelivery.findById(testDelivery.id);
        expect(updatedDelivery.open_count).toBe(1);
        expect(updatedDelivery.first_opened_at).toBeDefined();
        expect(updatedDelivery.last_opened_at).toBeDefined();
      });

      it('should handle multiple opens', async () => {
        // Track first open
        await request(app)
          .get(`/api/v1/email/track/open/${testDelivery.id}`)
          .expect(200);

        // Track second open
        await request(app)
          .get(`/api/v1/email/track/open/${testDelivery.id}`)
          .expect(200);

        const updatedDelivery = await EmailDelivery.findById(testDelivery.id);
        expect(updatedDelivery.open_count).toBe(2);
      });

      it('should return tracking pixel even for invalid delivery ID', async () => {
        const response = await request(app)
          .get('/api/v1/email/track/open/999999')
          .expect(200);

        expect(response.headers['content-type']).toBe('image/gif');
      });
    });

    describe('GET /api/v1/email/track/click/:deliveryId', () => {
      it('should track email click and redirect', async () => {
        const targetUrl = 'https://example.com/test';
        
        const response = await request(app)
          .get(`/api/v1/email/track/click/${testDelivery.id}?url=${encodeURIComponent(targetUrl)}`)
          .expect(302);

        expect(response.headers.location).toBe(targetUrl);

        // Verify click was recorded
        const updatedDelivery = await EmailDelivery.findById(testDelivery.id);
        expect(updatedDelivery.click_count).toBe(1);

        const clicks = await updatedDelivery.getClicks();
        expect(clicks.length).toBe(1);
        expect(clicks[0].url).toBe(targetUrl);
      });

      it('should require URL parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/email/track/click/${testDelivery.id}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_URL');
      });

      it('should redirect even for invalid delivery ID if URL is provided', async () => {
        const targetUrl = 'https://example.com/test';
        
        const response = await request(app)
          .get(`/api/v1/email/track/click/999999?url=${encodeURIComponent(targetUrl)}`)
          .expect(302);

        expect(response.headers.location).toBe(targetUrl);
      });
    });

    describe('GET /api/v1/email/deliveries', () => {
      it('should get user email deliveries', async () => {
        const response = await request(app)
          .get('/api/v1/email/deliveries')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

        const delivery = response.body.data.find(d => d.id === testDelivery.id);
        expect(delivery).toBeDefined();
        expect(delivery.recipient_email).toBe(testUser.email);
      });

      it('should filter deliveries by template', async () => {
        const response = await request(app)
          .get('/api/v1/email/deliveries?template_name=test-template')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach(delivery => {
          expect(delivery.template_name).toBe('test-template');
        });
      });

      it('should limit number of deliveries returned', async () => {
        const response = await request(app)
          .get('/api/v1/email/deliveries?limit=1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Bulk Email Operations', () => {
    describe('POST /api/v1/email/send/template', () => {
      it('should send templated email', async () => {
        const emailData = {
          templateName: testTemplate.name,
          recipientEmail: 'recipient@example.com',
          variables: {
            name: 'Test Recipient'
          },
          trackingEnabled: false // Disable tracking for test
        };

        const response = await request(app)
          .post('/api/v1/email/send/template')
          .set('Authorization', `Bearer ${authToken}`)
          .send(emailData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.success).toBe(true);
        expect(response.body.data.messageId).toBeDefined();
      });

      it('should require template name and recipient email', async () => {
        const response = await request(app)
          .post('/api/v1/email/send/template')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
      });
    });

    describe('POST /api/v1/email/send/bulk', () => {
      it('should send bulk email', async () => {
        const bulkData = {
          templateName: testTemplate.name,
          recipients: [
            { email: 'recipient1@example.com', variables: { name: 'Recipient 1' } },
            { email: 'recipient2@example.com', variables: { name: 'Recipient 2' } }
          ],
          globalVariables: {
            company: 'RSSFeeder'
          },
          batchSize: 2,
          delayBetweenBatches: 100
        };

        const response = await request(app)
          .post('/api/v1/email/send/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send(bulkData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(2);
        expect(response.body.data.sent).toBeGreaterThan(0);
      });

      it('should require template name and recipients array', async () => {
        const response = await request(app)
          .post('/api/v1/email/send/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ templateName: 'test' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
      });
    });

    describe('POST /api/v1/email/send/list', () => {
      beforeEach(async () => {
        // Create test subscription for list sending
        await EmailSubscription.subscribe({
          list_name: 'bulk-test-list',
          email: 'listsubscriber@example.com',
          user_id: null
        });
      });

      it('should send email to subscription list', async () => {
        const listData = {
          listName: 'bulk-test-list',
          templateName: testTemplate.name,
          globalVariables: {
            announcement: 'Important Update'
          },
          batchSize: 5,
          delayBetweenBatches: 100
        };

        const response = await request(app)
          .post('/api/v1/email/send/list')
          .set('Authorization', `Bearer ${authToken}`)
          .send(listData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBeGreaterThan(0);
      });

      it('should handle empty subscription list', async () => {
        const listData = {
          listName: 'empty-list',
          templateName: testTemplate.name
        };

        const response = await request(app)
          .post('/api/v1/email/send/list')
          .set('Authorization', `Bearer ${authToken}`)
          .send(listData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total).toBe(0);
      });

      it('should require list name and template name', async () => {
        const response = await request(app)
          .post('/api/v1/email/send/list')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ listName: 'test' })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
      });
    });
  });

  describe('Email Statistics', () => {
    describe('GET /api/v1/email/stats', () => {
      it('should get email service statistics', async () => {
        const response = await request(app)
          .get('/api/v1/email/stats')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.delivery).toBeDefined();
        expect(response.body.data.preferences).toBeDefined();
        expect(response.body.data.subscriptions).toBeDefined();
        expect(response.body.data.service).toBeDefined();
        expect(typeof response.body.data.delivery.total_sent).toBe('number');
      });
    });
  });

  describe('Email Service Setup', () => {
    describe('POST /api/v1/email/setup', () => {
      it('should setup default email templates and preferences', async () => {
        const response = await request(app)
          .post('/api/v1/email/setup')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.templates).toBeDefined();
        expect(response.body.data.preferences).toBeDefined();
        expect(response.body.message).toContain('setup completed');
      });
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for protected email endpoints', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/v1/email/templates' },
        { method: 'post', path: '/api/v1/email/templates' },
        { method: 'get', path: '/api/v1/email/preferences' },
        { method: 'put', path: '/api/v1/email/preferences' },
        { method: 'get', path: '/api/v1/email/subscriptions' },
        { method: 'post', path: '/api/v1/email/subscriptions' },
        { method: 'get', path: '/api/v1/email/stats' },
        { method: 'get', path: '/api/v1/email/deliveries' },
        { method: 'post', path: '/api/v1/email/setup' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .send({})
          .expect(401);

        expect(response.body.success).toBe(false);
        logger.debug(`Authentication required for ${endpoint.method.toUpperCase()} ${endpoint.path}`);
      }
    });

    it('should allow public access to tracking endpoints', async () => {
      // These endpoints should work without authentication
      await request(app)
        .get('/api/v1/email/track/open/999999')
        .expect(200);

      await request(app)
        .get('/api/v1/email/track/click/999999')
        .expect(400); // Should fail due to missing URL, not auth

      await request(app)
        .get('/api/v1/email/unsubscribe/test-list/test@example.com')
        .expect(404); // Should fail due to non-existent subscription, not auth
    });
  });

  describe('Error Handling', () => {
    it('should handle email service errors gracefully', async () => {
      // Test with invalid template
      const response = await request(app)
        .post('/api/v1/email/send/template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateName: 'non-existent-template',
          recipientEmail: 'test@example.com'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_SEND_FAILED');
    });

    it('should handle database errors in model operations', async () => {
      // Test template creation with duplicate name
      const duplicateTemplate = {
        name: testTemplate.name, // Use existing template name
        subject: 'Duplicate Template',
        html_content: '<p>Test</p>',
        text_content: 'Test'
      };

      const response = await request(app)
        .post('/api/v1/email/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateTemplate)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('should validate email template data', async () => {
      const template = new EmailTemplate({
        name: 'test-validation',
        subject: 'Test Subject',
        html_content: '<p>{{unclosed</p>', // Invalid template variable
        text_content: 'Valid text'
      });

      const validation = template.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Template contains unclosed variables');
    });

    it('should validate email preferences data', async () => {
      const availableTypes = EmailPreferences.getAvailableTypes();
      expect(Array.isArray(availableTypes)).toBe(true);
      expect(availableTypes.length).toBeGreaterThan(0);

      availableTypes.forEach(type => {
        expect(type.type).toBeDefined();
        expect(type.name).toBeDefined();
        expect(type.description).toBeDefined();
        expect(type.category).toBeDefined();
        expect(typeof type.required).toBe('boolean');
      });
    });
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testTemplate) {
        const template = await EmailTemplate.findById(testTemplate.id);
        if (template) {
          await template.delete();
        }
      }
      logger.debug('Email service test cleanup completed');
    } catch (error) {
      logger.error('Error during email service test cleanup:', error);
    }
  });
}); 