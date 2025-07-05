const config = require('./config');
const path = require('path');

// Base configuration
const baseConfig = {
  client: 'sqlite3',
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'db', 'migrations'),
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: path.join(__dirname, 'db', 'seeds')
  },
  pool: {
    min: config.DATABASE_POOL_MIN,
    max: config.DATABASE_POOL_MAX,
    afterCreate: (conn, done) => {
      // Enable foreign key constraints
      conn.run('PRAGMA foreign_keys = ON', done);
    }
  }
};

// Environment-specific configurations
const configurations = {
  development: {
    ...baseConfig,
    connection: {
      filename: path.resolve(__dirname, '..', 'data', 'rssfeeder-dev.db')
    },
    debug: config.VERBOSE_LOGGING
  },

  test: {
    ...baseConfig,
    connection: {
      filename: ':memory:'
    },
    migrations: {
      ...baseConfig.migrations,
      // For tests, we want to run migrations fresh each time
      disableMigrationsListValidation: true
    }
  },

  staging: {
    ...baseConfig,
    connection: {
      filename: path.resolve(__dirname, '..', 'data', 'rssfeeder-staging.db')
    },
    debug: false
  },

  production: {
    ...baseConfig,
    connection: {
      filename: path.resolve(__dirname, '..', 'data', 'rssfeeder-production.db')
    },
    debug: false,
    pool: {
      ...baseConfig.pool,
      min: 2,
      max: 20
    }
  }
};

// Export configuration based on NODE_ENV
module.exports = configurations[config.NODE_ENV] || configurations.development;

// Export all configurations for testing purposes
module.exports.configurations = configurations; 