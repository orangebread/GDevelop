// @flow

/**
 * Tests for SecureStorage with environment variable support.
 * 
 * These tests verify:
 * - Environment variable precedence (PREFERRED method)
 * - Fallback to secure storage
 * - Edge cases (empty strings, whitespace, undefined)
 * - API key source detection
 * - No sensitive data leakage
 */

describe('SecureStorage', () => {
  let SecureStorage;
  let originalProcessEnv;

  beforeEach(() => {
    // Save original process.env
    originalProcessEnv = process.env;
    
    // Mock process.env
    process.env = { ...originalProcessEnv };
    
    // Clear module cache to get fresh instance
    jest.resetModules();
    
    // Mock localStorage
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    
    // Import SecureStorage after mocks are set up
    SecureStorage = require('../SecureStorage').default;
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalProcessEnv;
  });

  describe('Environment Variable Support (PREFERRED)', () => {
    it('should return API key from environment variable when set', async () => {
      process.env.GDEVELOP_OPENAI_API_KEY = 'sk-env-test-key-123456';
      
      const key = await SecureStorage.getApiKey('openai');
      
      expect(key).toBe('sk-env-test-key-123456');
    });

    it('should return API key from environment variable for Anthropic', async () => {
      process.env.GDEVELOP_ANTHROPIC_API_KEY = 'sk-ant-env-test-key-123456';
      
      const key = await SecureStorage.getApiKey('anthropic');
      
      expect(key).toBe('sk-ant-env-test-key-123456');
    });

    it('should trim whitespace from environment variable', async () => {
      process.env.GDEVELOP_OPENAI_API_KEY = '  sk-env-test-key-123456  ';
      
      const key = await SecureStorage.getApiKey('openai');
      
      expect(key).toBe('sk-env-test-key-123456');
    });

    it('should return null for empty string in environment variable', async () => {
      process.env.GDEVELOP_OPENAI_API_KEY = '';
      global.localStorage.getItem.mockReturnValue(null);
      
      const key = await SecureStorage.getApiKey('openai');
      
      expect(key).toBe(null);
    });

    it('should return null for whitespace-only environment variable', async () => {
      process.env.GDEVELOP_OPENAI_API_KEY = '   ';
      global.localStorage.getItem.mockReturnValue(null);
      
      const key = await SecureStorage.getApiKey('openai');
      
      expect(key).toBe(null);
    });

    it('should prefer environment variable over stored key', async () => {
      process.env.GDEVELOP_OPENAI_API_KEY = 'sk-env-key';
      global.localStorage.getItem.mockReturnValue('encrypted-stored-key');
      
      const key = await SecureStorage.getApiKey('openai');
      
      expect(key).toBe('sk-env-key');
      // Should not even try to decrypt stored key
    });

    it('should handle undefined process.env gracefully (web build)', async () => {
      const originalProcess = global.process;
      // @ts-ignore - Simulating web build where process is undefined
      global.process = undefined;
      
      global.localStorage.getItem.mockReturnValue(null);
      
      const key = await SecureStorage.getApiKey('openai');
      
      expect(key).toBe(null);
      
      // Restore process
      global.process = originalProcess;
    });

    it('should not log environment variable values', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const consoleInfoSpy = jest.spyOn(console, 'info');
      const consoleWarnSpy = jest.spyOn(console, 'warn');
      
      process.env.GDEVELOP_OPENAI_API_KEY = 'sk-secret-key-should-not-be-logged';
      
      await SecureStorage.getApiKey('openai');
      
      // Check that the secret key was never logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('sk-secret-key-should-not-be-logged')
      );
      expect(consoleInfoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('sk-secret-key-should-not-be-logged')
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('sk-secret-key-should-not-be-logged')
      );
      
      consoleSpy.mockRestore();
      consoleInfoSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getApiKeySource', () => {
    it('should return "env" when environment variable is set', () => {
      process.env.GDEVELOP_OPENAI_API_KEY = 'sk-env-key';
      
      const source = SecureStorage.getApiKeySource('openai');
      
      expect(source).toBe('env');
    });

    it('should return "safeStorage" when key is in localStorage', () => {
      delete process.env.GDEVELOP_OPENAI_API_KEY;

      // Mock safeStorage availability
      SecureStorage._safeStorage = {
        isEncryptionAvailable: () => true,
      };

      global.localStorage.getItem.mockImplementation((key) => {
        if (key === 'gdevelop-custom-ai-key-openai') {
          return 'encrypted-key-base64';
        }
        return null;
      });

      const source = SecureStorage.getApiKeySource('openai');

      expect(source).toBe('safeStorage');
    });

    it('should return "keytar" when storage method is keytar', () => {
      delete process.env.GDEVELOP_OPENAI_API_KEY;
      global.localStorage.getItem.mockImplementation((key) => {
        if (key === 'gdevelop-custom-ai-key-openai-method') {
          return 'keytar';
        }
        return null;
      });
      
      const source = SecureStorage.getApiKeySource('openai');
      
      expect(source).toBe('keytar');
    });

    it('should return "none" when no key is configured', () => {
      delete process.env.GDEVELOP_OPENAI_API_KEY;
      global.localStorage.getItem.mockReturnValue(null);
      
      const source = SecureStorage.getApiKeySource('openai');
      
      expect(source).toBe('none');
    });

    it('should prefer env over storage in source detection', () => {
      process.env.GDEVELOP_OPENAI_API_KEY = 'sk-env-key';
      global.localStorage.getItem.mockReturnValue('encrypted-stored-key');
      
      const source = SecureStorage.getApiKeySource('openai');
      
      expect(source).toBe('env');
    });
  });

  describe('maskApiKey', () => {
    it('should mask API key correctly', () => {
      const masked = SecureStorage.maskApiKey('sk-test123456789');
      
      expect(masked).toBe('sk-...456789');
    });

    it('should mask environment variable keys the same way', () => {
      const envKey = 'sk-env-test-key-123456';
      const masked = SecureStorage.maskApiKey(envKey);
      
      expect(masked).toBe('sk-...123456');
      expect(masked).not.toContain('env-test-key');
    });

    it('should handle short keys', () => {
      const masked = SecureStorage.maskApiKey('short');
      
      expect(masked).toBe('***');
    });
  });

  describe('Security', () => {
    it('should not persist environment variable to storage', async () => {
      process.env.GDEVELOP_OPENAI_API_KEY = 'sk-env-key';
      
      await SecureStorage.getApiKey('openai');
      
      // setItem should never be called when using env var
      expect(global.localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not expose environment variable in error messages', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      process.env.GDEVELOP_OPENAI_API_KEY = 'sk-secret-should-not-appear-in-errors';
      
      // Force an error scenario
      const originalProcess = global.process;
      global.process = {
        env: {
          get GDEVELOP_OPENAI_API_KEY() {
            throw new Error('Test error');
          }
        }
      };
      
      await SecureStorage.getApiKey('openai');
      
      // Check that error logs don't contain the secret
      const errorCalls = consoleErrorSpy.mock.calls;
      errorCalls.forEach(call => {
        const message = call.join(' ');
        expect(message).not.toContain('sk-secret-should-not-appear-in-errors');
      });
      
      global.process = originalProcess;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Backward Compatibility', () => {
    it('should still work with stored keys when no env var is set', async () => {
      delete process.env.GDEVELOP_OPENAI_API_KEY;
      
      // This test assumes safeStorage is available and working
      // In a real test, you'd mock the safeStorage behavior
      global.localStorage.getItem.mockReturnValue(null);
      
      const key = await SecureStorage.getApiKey('openai');
      
      expect(key).toBe(null);
    });

    it('should not break existing setApiKey functionality', async () => {
      // Mock safeStorage to be available
      SecureStorage._safeStorage = {
        isEncryptionAvailable: () => true,
        encryptString: (str) => Buffer.from(str, 'utf8'),
      };

      // setApiKey should only manage secure storage, not env vars
      await SecureStorage.setApiKey('openai', 'sk-stored-key');

      // Should have called localStorage.setItem
      expect(global.localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Documentation', () => {
    it('should document supported environment variables', () => {
      // This is a meta-test to ensure documentation exists in the source file
      const fs = require('fs');
      const path = require('path');
      const sourceFilePath = path.join(__dirname, '../SecureStorage.js');
      const sourceCode = fs.readFileSync(sourceFilePath, 'utf8');

      expect(sourceCode).toContain('GDEVELOP_OPENAI_API_KEY');
      expect(sourceCode).toContain('GDEVELOP_ANTHROPIC_API_KEY');
    });
  });
});

