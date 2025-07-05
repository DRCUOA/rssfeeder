const JWTUtils = require('../utils/jwt');
const config = require('../config');
const { AuthenticationError, ValidationError } = require('../middlewares/errorHandler');

describe('JWT Utils', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockPayload = {
    id: mockUser.id,
    email: mockUser.email,
    name: mockUser.name
  };

  describe('Token Generation', () => {
    test('should generate access token', () => {
      const token = JWTUtils.generateAccessToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should generate access token with custom expiration', () => {
      const customExpiration = '1h';
      const token = JWTUtils.generateAccessToken(mockPayload, customExpiration);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should generate refresh token', () => {
      const token = JWTUtils.generateRefreshToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('should generate refresh token with custom expiration', () => {
      const customExpiration = '30d';
      const token = JWTUtils.generateRefreshToken(mockPayload, customExpiration);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should generate token pair', () => {
      const tokens = JWTUtils.generateTokenPair(mockUser);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('tokenType', 'Bearer');
      expect(tokens).toHaveProperty('expiresIn');
      
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBe(config.JWT_EXPIRES_IN);
    });

    test('should include correct issuer and audience in tokens', () => {
      const accessToken = JWTUtils.generateAccessToken(mockPayload);
      const refreshToken = JWTUtils.generateRefreshToken(mockPayload);
      
      const accessDecoded = JWTUtils.decodeToken(accessToken);
      const refreshDecoded = JWTUtils.decodeToken(refreshToken);
      
      expect(accessDecoded.payload.iss).toBe('rssfeeder');
      expect(accessDecoded.payload.aud).toBe('rssfeeder-users');
      
      expect(refreshDecoded.payload.iss).toBe('rssfeeder');
      expect(refreshDecoded.payload.aud).toBe('rssfeeder-refresh');
    });

    test('should handle token generation errors', () => {
      // Test with invalid payload
      expect(() => JWTUtils.generateAccessToken(null)).toThrow();
      expect(() => JWTUtils.generateRefreshToken(undefined)).toThrow();
    });
  });

  describe('Token Verification', () => {
    let accessToken;
    let refreshToken;

    beforeEach(() => {
      accessToken = JWTUtils.generateAccessToken(mockPayload);
      refreshToken = JWTUtils.generateRefreshToken(mockPayload);
    });

    test('should verify valid access token', () => {
      const decoded = JWTUtils.verifyAccessToken(accessToken);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.name).toBe(mockPayload.name);
      expect(decoded.iss).toBe('rssfeeder');
      expect(decoded.aud).toBe('rssfeeder-users');
    });

    test('should verify valid refresh token', () => {
      const decoded = JWTUtils.verifyRefreshToken(refreshToken);
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockPayload.id);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.name).toBe(mockPayload.name);
      expect(decoded.iss).toBe('rssfeeder');
      expect(decoded.aud).toBe('rssfeeder-refresh');
    });

    test('should verify token with correct audience', () => {
      const decoded = JWTUtils.verifyToken(accessToken, 'rssfeeder-users');
      
      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(mockPayload.id);
    });

    test('should reject token with wrong audience', () => {
      expect(() => {
        JWTUtils.verifyToken(accessToken, 'wrong-audience');
      }).toThrow(AuthenticationError);
    });

    test('should reject access token when verifying as refresh token', () => {
      expect(() => {
        JWTUtils.verifyRefreshToken(accessToken);
      }).toThrow(AuthenticationError);
    });

    test('should reject refresh token when verifying as access token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken(refreshToken);
      }).toThrow(AuthenticationError);
    });

    test('should reject invalid token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('invalid.token.here');
      }).toThrow(AuthenticationError);
    });

    test('should reject malformed token', () => {
      expect(() => {
        JWTUtils.verifyAccessToken('malformed-token');
      }).toThrow(AuthenticationError);
    });

    test('should reject expired token', () => {
      // Generate token with very short expiration
      const expiredToken = JWTUtils.generateAccessToken(mockPayload, '1ms');
      
      // Wait for token to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => {
            JWTUtils.verifyAccessToken(expiredToken);
          }).toThrow(AuthenticationError);
          resolve();
        }, 10);
      });
    });

    test('should handle different JWT errors appropriately', () => {
      // Invalid signature
      expect(() => {
        JWTUtils.verifyAccessToken(accessToken + 'tampered');
      }).toThrow(AuthenticationError);
      
      // Empty token
      expect(() => {
        JWTUtils.verifyAccessToken('');
      }).toThrow(AuthenticationError);
      
      // Null token
      expect(() => {
        JWTUtils.verifyAccessToken(null);
      }).toThrow(AuthenticationError);
    });
  });

  describe('Token Decoding', () => {
    let accessToken;

    beforeEach(() => {
      accessToken = JWTUtils.generateAccessToken(mockPayload);
    });

    test('should decode token without verification', () => {
      const decoded = JWTUtils.decodeToken(accessToken);
      
      expect(decoded).toBeDefined();
      expect(decoded).toHaveProperty('header');
      expect(decoded).toHaveProperty('payload');
      expect(decoded).toHaveProperty('signature');
      
      expect(decoded.payload.id).toBe(mockPayload.id);
      expect(decoded.payload.email).toBe(mockPayload.email);
    });

    test('should return null for invalid token during decoding', () => {
      const decoded = JWTUtils.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    test('should return null for null token during decoding', () => {
      const decoded = JWTUtils.decodeToken(null);
      expect(decoded).toBeNull();
    });

    test('should get token payload', () => {
      const payload = JWTUtils.getTokenPayload(accessToken);
      
      expect(payload).toBeDefined();
      expect(payload.id).toBe(mockPayload.id);
      expect(payload.email).toBe(mockPayload.email);
      expect(payload.name).toBe(mockPayload.name);
    });

    test('should return null for invalid token payload', () => {
      const payload = JWTUtils.getTokenPayload('invalid-token');
      expect(payload).toBeNull();
    });
  });

  describe('Header Token Extraction', () => {
    test('should extract token from valid Authorization header', () => {
      const token = 'valid.jwt.token';
      const authHeader = `Bearer ${token}`;
      
      const extracted = JWTUtils.extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    test('should return null for missing Authorization header', () => {
      const extracted = JWTUtils.extractTokenFromHeader(null);
      expect(extracted).toBeNull();
    });

    test('should return null for empty Authorization header', () => {
      const extracted = JWTUtils.extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });

    test('should return null for invalid Authorization header format', () => {
      expect(JWTUtils.extractTokenFromHeader('InvalidFormat')).toBeNull();
      expect(JWTUtils.extractTokenFromHeader('Basic token')).toBeNull();
      expect(JWTUtils.extractTokenFromHeader('Bearer')).toBeNull();
      expect(JWTUtils.extractTokenFromHeader('Bearer token1 token2')).toBeNull();
    });

    test('should handle Authorization header with extra spaces', () => {
      const token = 'valid.jwt.token';
      const authHeader = `Bearer  ${token}`;
      
      const extracted = JWTUtils.extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });
  });

  describe('Token Expiration', () => {
    let accessToken;

    beforeEach(() => {
      accessToken = JWTUtils.generateAccessToken(mockPayload);
    });

    test('should get token expiration time', () => {
      const expiration = JWTUtils.getTokenExpiration(accessToken);
      
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration.getTime()).toBeGreaterThan(Date.now());
    });

    test('should return null for invalid token expiration', () => {
      const expiration = JWTUtils.getTokenExpiration('invalid-token');
      expect(expiration).toBeNull();
    });

    test('should check if token is expired', () => {
      const isExpired = JWTUtils.isTokenExpired(accessToken);
      expect(isExpired).toBe(false);
    });

    test('should detect expired token', () => {
      const expiredToken = JWTUtils.generateAccessToken(mockPayload, '1ms');
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const isExpired = JWTUtils.isTokenExpired(expiredToken);
          expect(isExpired).toBe(true);
          resolve();
        }, 10);
      });
    });

    test('should return true for invalid token expiration check', () => {
      const isExpired = JWTUtils.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });

    test('should calculate time remaining', () => {
      const timeRemaining = JWTUtils.getTokenTimeRemaining(accessToken);
      
      expect(typeof timeRemaining).toBe('number');
      expect(timeRemaining).toBeGreaterThan(0);
    });

    test('should return null for invalid token time remaining', () => {
      const timeRemaining = JWTUtils.getTokenTimeRemaining('invalid-token');
      expect(timeRemaining).toBeNull();
    });

    test('should return 0 for expired token time remaining', () => {
      const expiredToken = JWTUtils.generateAccessToken(mockPayload, '1ms');
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const timeRemaining = JWTUtils.getTokenTimeRemaining(expiredToken);
          expect(timeRemaining).toBe(0);
          resolve();
        }, 10);
      });
    });
  });

  describe('Token Refresh Logic', () => {
    let accessToken;
    let refreshToken;

    beforeEach(() => {
      const tokens = JWTUtils.generateTokenPair(mockUser);
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
    });

    test('should refresh access token with valid refresh token', () => {
      const newTokens = JWTUtils.refreshAccessToken(refreshToken);
      
      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');
      expect(newTokens).toHaveProperty('tokenType', 'Bearer');
      expect(newTokens).toHaveProperty('expiresIn');
      
      expect(newTokens.accessToken).not.toBe(accessToken);
      expect(newTokens.refreshToken).toBe(refreshToken); // Same refresh token
      
      // Verify new access token is valid
      const decoded = JWTUtils.verifyAccessToken(newTokens.accessToken);
      expect(decoded.id).toBe(mockUser.id);
    });

    test('should reject refresh with invalid refresh token', () => {
      expect(() => {
        JWTUtils.refreshAccessToken('invalid-refresh-token');
      }).toThrow(AuthenticationError);
    });

    test('should reject refresh with access token instead of refresh token', () => {
      expect(() => {
        JWTUtils.refreshAccessToken(accessToken);
      }).toThrow(AuthenticationError);
    });

    test('should check if token needs refresh', () => {
      // Fresh token should not need refresh
      const needsRefresh = JWTUtils.shouldRefreshToken(accessToken);
      expect(needsRefresh).toBe(false);
    });

    test('should detect token that needs refresh', () => {
      // Generate token with short expiration
      const shortToken = JWTUtils.generateAccessToken(mockPayload, '1m');
      
      const needsRefresh = JWTUtils.shouldRefreshToken(shortToken);
      expect(needsRefresh).toBe(true); // Should need refresh within 5 minutes
    });

    test('should return true for invalid token refresh check', () => {
      const needsRefresh = JWTUtils.shouldRefreshToken('invalid-token');
      expect(needsRefresh).toBe(true);
    });
  });

  describe('Token Structure Validation', () => {
    test('should validate correct token structure', () => {
      const token = JWTUtils.generateAccessToken(mockPayload);
      const isValid = JWTUtils.validateTokenStructure(token);
      
      expect(isValid).toBe(true);
    });

    test('should reject token with wrong number of parts', () => {
      expect(JWTUtils.validateTokenStructure('invalid.token')).toBe(false);
      expect(JWTUtils.validateTokenStructure('too.many.parts.here')).toBe(false);
      expect(JWTUtils.validateTokenStructure('singlepart')).toBe(false);
    });

    test('should reject non-string tokens', () => {
      expect(JWTUtils.validateTokenStructure(null)).toBe(false);
      expect(JWTUtils.validateTokenStructure(undefined)).toBe(false);
      expect(JWTUtils.validateTokenStructure(123)).toBe(false);
      expect(JWTUtils.validateTokenStructure({})).toBe(false);
    });

    test('should reject empty token', () => {
      expect(JWTUtils.validateTokenStructure('')).toBe(false);
    });

    test('should reject token with invalid base64url encoding', () => {
      expect(JWTUtils.validateTokenStructure('invalid@.token!.here#')).toBe(false);
    });
  });

  describe('Secure Token Generation', () => {
    test('should generate secure random token', () => {
      const token = JWTUtils.generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
      expect(/^[a-f0-9]+$/.test(token)).toBe(true); // Only hex characters
    });

    test('should generate secure token with custom length', () => {
      const token = JWTUtils.generateSecureToken(16);
      
      expect(token).toBeDefined();
      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });

    test('should generate different tokens each time', () => {
      const token1 = JWTUtils.generateSecureToken();
      const token2 = JWTUtils.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Blacklisting', () => {
    let accessToken;

    beforeEach(() => {
      accessToken = JWTUtils.generateAccessToken(mockPayload);
    });

    test('should create blacklist entry', () => {
      const entry = JWTUtils.createBlacklistEntry(accessToken);
      
      expect(entry).toHaveProperty('jti');
      expect(entry).toHaveProperty('token', accessToken);
      expect(entry).toHaveProperty('userId', mockPayload.id);
      expect(entry).toHaveProperty('expiresAt');
      expect(entry).toHaveProperty('blacklistedAt');
      
      expect(entry.expiresAt).toBeInstanceOf(Date);
      expect(entry.blacklistedAt).toBeInstanceOf(Date);
    });

    test('should reject blacklist entry for invalid token', () => {
      expect(() => {
        JWTUtils.createBlacklistEntry('invalid-token');
      }).toThrow();
    });

    test('should handle blacklist entry creation errors', () => {
      expect(() => {
        JWTUtils.createBlacklistEntry(null);
      }).toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle JWT library errors gracefully', () => {
      // Mock JWT library error
      const originalJwt = require('jsonwebtoken');
      const jwt = require('jsonwebtoken');
      
      // Test various error scenarios
      expect(() => {
        JWTUtils.verifyAccessToken('malformed');
      }).toThrow(AuthenticationError);
    });

    test('should handle configuration errors', () => {
      // Test with missing config
      const originalSecret = config.JWT_SECRET;
      config.JWT_SECRET = '';
      
      expect(() => {
        JWTUtils.generateAccessToken(mockPayload);
      }).toThrow();
      
      config.JWT_SECRET = originalSecret;
    });

    test('should handle payload validation', () => {
      // Test with various invalid payloads
      expect(() => {
        JWTUtils.generateAccessToken({});
      }).not.toThrow(); // Empty object should work
      
      expect(() => {
        JWTUtils.generateAccessToken({ circular: {} });
      }).not.toThrow(); // Should handle most objects
    });

    test('should handle concurrent token operations', async () => {
      // Test concurrent token generation
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(JWTUtils.generateAccessToken(mockPayload))
      );
      
      const tokens = await Promise.all(promises);
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
      
      // All tokens should be valid
      tokens.forEach(token => {
        expect(() => JWTUtils.verifyAccessToken(token)).not.toThrow();
      });
    });

    test('should handle token verification edge cases', () => {
      // Test with tokens that have been tampered with
      const token = JWTUtils.generateAccessToken(mockPayload);
      const parts = token.split('.');
      
      // Tamper with header
      const tamperedHeader = parts[0] + 'x';
      const tamperedToken1 = [tamperedHeader, parts[1], parts[2]].join('.');
      expect(() => JWTUtils.verifyAccessToken(tamperedToken1)).toThrow(AuthenticationError);
      
      // Tamper with payload
      const tamperedPayload = parts[1] + 'x';
      const tamperedToken2 = [parts[0], tamperedPayload, parts[2]].join('.');
      expect(() => JWTUtils.verifyAccessToken(tamperedToken2)).toThrow(AuthenticationError);
      
      // Tamper with signature
      const tamperedSignature = parts[2] + 'x';
      const tamperedToken3 = [parts[0], parts[1], tamperedSignature].join('.');
      expect(() => JWTUtils.verifyAccessToken(tamperedToken3)).toThrow(AuthenticationError);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle token generation performance', () => {
      const startTime = Date.now();
      
      // Generate 100 tokens
      for (let i = 0; i < 100; i++) {
        JWTUtils.generateAccessToken(mockPayload);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust based on requirements)
      expect(duration).toBeLessThan(1000); // 1 second for 100 tokens
    });

    test('should handle token verification performance', () => {
      // Generate tokens first
      const tokens = Array.from({ length: 100 }, () => 
        JWTUtils.generateAccessToken(mockPayload)
      );
      
      const startTime = Date.now();
      
      // Verify all tokens
      tokens.forEach(token => {
        JWTUtils.verifyAccessToken(token);
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second for 100 verifications
    });

    test('should handle large payloads', () => {
      const largePayload = {
        ...mockPayload,
        largeData: 'x'.repeat(1000), // 1KB of data
        arrayData: Array.from({ length: 100 }, (_, i) => `item${i}`)
      };
      
      expect(() => {
        const token = JWTUtils.generateAccessToken(largePayload);
        const decoded = JWTUtils.verifyAccessToken(token);
        expect(decoded.largeData).toBe(largePayload.largeData);
      }).not.toThrow();
    });
  });
}); 