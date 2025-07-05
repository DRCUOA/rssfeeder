const knex = require('knex');
const knexConfig = require('../knexfile');
const { logger, queryLogger, errorLogger } = require('../utils/logger');
const config = require('../config');

// Create database connection
const db = knex(knexConfig);

// Add query logging
if (config.VERBOSE_LOGGING) {
  db.on('query', (queryData) => {
    queryLogger(queryData.sql, queryData.bindings);
  });
}

// Add error logging
db.on('query-error', (error, queryData) => {
  errorLogger(error, {
    sql: queryData.sql,
    bindings: queryData.bindings,
    type: 'database_query_error'
  });
});

// Test database connection
const testConnection = async () => {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    errorLogger(error, { type: 'database_connection_test' });
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    const [batchNo, migrations] = await db.migrate.latest();
    if (migrations.length > 0) {
      logger.info(`Batch ${batchNo} migrations completed: ${migrations.join(', ')}`);
    } else {
      logger.info('Database is already up to date');
    }
    return { batchNo, migrations };
  } catch (error) {
    errorLogger(error, { type: 'database_migration' });
    throw new Error(`Migration failed: ${error.message}`);
  }
};

// Rollback migrations
const rollbackMigrations = async () => {
  try {
    const [batchNo, migrations] = await db.migrate.rollback();
    if (migrations.length > 0) {
      logger.info(`Batch ${batchNo} migrations rolled back: ${migrations.join(', ')}`);
    } else {
      logger.info('No migrations to rollback');
    }
    return { batchNo, migrations };
  } catch (error) {
    errorLogger(error, { type: 'database_rollback' });
    throw new Error(`Migration rollback failed: ${error.message}`);
  }
};

// Get migration status
const getMigrationStatus = async () => {
  try {
    const completed = await db.migrate.currentVersion();
    const pending = await db.migrate.list();
    return {
      currentVersion: completed,
      pendingMigrations: pending[1] || []
    };
  } catch (error) {
    errorLogger(error, { type: 'migration_status' });
    throw new Error(`Failed to get migration status: ${error.message}`);
  }
};

// Create data directory if it doesn't exist
const ensureDataDirectory = () => {
  const fs = require('fs');
  const path = require('path');
  
  if (knexConfig.connection.filename !== ':memory:') {
    const dataDir = path.dirname(knexConfig.connection.filename);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info(`Created data directory: ${dataDir}`);
    }
  }
};

// Initialize database
const initializeDatabase = async () => {
  try {
    ensureDataDirectory();
    await testConnection();
    await runMigrations();
    logger.info('Database initialized successfully');
  } catch (error) {
    errorLogger(error, { type: 'database_initialization' });
    throw error;
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  const trx = await db.transaction();
  try {
    const result = await callback(trx);
    await trx.commit();
    return result;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
};

// Health check
const healthCheck = async () => {
  try {
    const start = Date.now();
    await db.raw('SELECT 1');
    const duration = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime: duration,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await db.destroy();
    logger.info('Database connection closed');
  } catch (error) {
    errorLogger(error, { type: 'database_close' });
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  db,
  testConnection,
  runMigrations,
  rollbackMigrations,
  getMigrationStatus,
  initializeDatabase,
  transaction,
  healthCheck,
  closeConnection
}; 