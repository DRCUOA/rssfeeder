const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

// Import configuration and utilities
const config = require('./config');
const { logger, requestLogger } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { initializeDatabase, healthCheck } = require('./db/database');

// Create Express app
const app = express();

// Trust proxy if configured
if (config.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
if (config.ENABLE_CORS) {
  app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    optionsSuccessStatus: 200
  }));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000, // Convert minutes to milliseconds
  max: config.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: config.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.COOKIE_SECRET));

// HTTP request logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

// Custom request logger
app.use(requestLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: dbHealth
    };
    
    if (dbHealth.status === 'unhealthy') {
      health.status = 'degraded';
    }
    
    res.status(health.status === 'ok' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/v1', (req, res, next) => {
  // API versioning middleware
  req.apiVersion = 'v1';
  next();
});

// Placeholder for route modules (to be implemented in later stages)
// app.use('/api/v1/auth', require('./routes/auth'));
// app.use('/api/v1/users', require('./routes/users'));
// app.use('/api/v1/feeds', require('./routes/feeds'));
// app.use('/api/v1/items', require('./routes/items'));
// app.use('/api/v1/categories', require('./routes/categories'));
// app.use('/api/v1/subscriptions', require('./routes/subscriptions'));

// Temporary welcome endpoint for testing
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to RSSFeeder API',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

// Serve uploaded files
app.use('/uploads', express.static(config.UPLOAD_DIR));

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Start server
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 RSSFeeder backend server started on port ${config.PORT}`);
      logger.info(`📊 Environment: ${config.NODE_ENV}`);
      logger.info(`🗄️  Database: ${config.DATABASE_URL}`);
      logger.info(`🌐 Frontend URL: ${config.FRONTEND_URL}`);
      logger.info(`📝 Logging level: ${config.LOG_LEVEL}`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // Close database connection
        try {
          const { closeConnection } = require('./db/database');
          await closeConnection();
        } catch (error) {
          logger.error('Error closing database connection:', error);
        }
        
        logger.info('Shutdown complete');
        process.exit(0);
      });
      
      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer }; 