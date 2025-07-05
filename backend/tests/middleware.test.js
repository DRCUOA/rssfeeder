const { 
  errorHandler, 
  notFoundHandler, 
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError
} = require('../middlewares/errorHandler');

const { logger, requestLogger } = require('../utils/logger');

describe('Middleware Tests', () => {
  
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Mock request object
    mockReq = {
      originalUrl: '/api/v1/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      user: { id: 1 },
      body: { test: 'data' }
    };

    // Mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    // Mock next function
    mockNext = jest.fn();

    // Mock logger
    jest.spyOn(logger, 'info').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handler Middleware', () => {
    test('should handle AppError correctly', () => {
      const error = new AppError('Test error message', 400, 'TEST_ERROR');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message'
        }
      });
    });

    test('should handle ValidationError with errors array', () => {
      const validationErrors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is too short' }
      ];
      const error = new ValidationError('Validation failed', validationErrors);
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: validationErrors
        }
      });
    });

    test('should handle AuthenticationError', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid credentials'
        }
      });
    });

    test('should handle AuthorizationError', () => {
      const error = new AuthorizationError('Insufficient permissions');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions'
        }
      });
    });

    test('should handle NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found'
        }
      });
    });

    test('should handle DatabaseError', () => {
      const error = new DatabaseError('Database connection failed');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database connection failed'
        }
      });
    });

    test('should handle JWT errors', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    });

    test('should handle expired token errors', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expired'
        }
      });
    });

    test('should handle SQLite unique constraint errors', () => {
      const error = new Error('Unique constraint failed');
      error.code = 'SQLITE_CONSTRAINT_UNIQUE';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'DUPLICATE_RESOURCE',
          message: 'Resource already exists'
        }
      });
    });

    test('should handle file upload errors', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File too large'
        }
      });
    });

    test('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    test('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Clear module cache to reload config
      delete require.cache[require.resolve('../config')];
      
      const error = new Error('Development error');
      error.stack = 'Error: Development error\n    at test';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          stack: 'Error: Development error\n    at test'
        }
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Not Found Handler', () => {
    test('should create NotFoundError for undefined routes', () => {
      notFoundHandler(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Route /api/v1/test not found'
        })
      );
    });
  });

  describe('Async Handler', () => {
    test('should handle successful async operations', async () => {
      const asyncFunction = async (req, res, next) => {
        res.json({ success: true });
      };
      
      const wrappedFunction = asyncHandler(asyncFunction);
      await wrappedFunction(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should catch and forward async errors', async () => {
      const asyncFunction = async (req, res, next) => {
        throw new Error('Async error');
      };
      
      const wrappedFunction = asyncHandler(asyncFunction);
      await wrappedFunction(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Async error'
      }));
    });
  });

  describe('Error Classes', () => {
    test('should create AppError with correct properties', () => {
      const error = new AppError('Test message', 400, 'TEST_CODE');
      
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_CODE');
      expect(error.isOperational).toBe(true);
    });

    test('should create ValidationError with errors array', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      const error = new ValidationError('Validation failed', errors);
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
    });

    test('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('should create AuthorizationError with default message', () => {
      const error = new AuthorizationError();
      
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });

    test('should create NotFoundError with default message', () => {
      const error = new NotFoundError();
      
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    test('should create DatabaseError with default message', () => {
      const error = new DatabaseError();
      
      expect(error.message).toBe('Database operation failed');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Request Logger Middleware', () => {
    test('should log request information', () => {
      const originalSend = mockRes.send;
      mockRes.send = jest.fn().mockImplementation(function(body) {
        return originalSend.call(this, body);
      });
      
      requestLogger(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      
      // Simulate response
      mockRes.statusCode = 200;
      mockRes.send('test response');
      
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('GET /api/v1/test - 200')
      );
    });
  });
}); 