const { initializeDatabase, closeConnection } = require('../db/database');
const { logger } = require('../utils/logger');

// Set up test environment
beforeAll(async () => {
  try {
    // Initialize test database with migrations
    await initializeDatabase();
    logger.info('Test database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize test database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    await closeConnection();
    logger.info('Test database connection closed');
  } catch (error) {
    logger.error('Failed to close test database connection:', error);
  }
}); 