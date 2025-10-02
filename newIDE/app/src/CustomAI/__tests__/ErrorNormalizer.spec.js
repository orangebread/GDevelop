// @flow

import {
  AI_ERROR_CODES,
  NormalizedAIError,
  normalizeOpenAIError,
  normalizeAnthropicError,
  normalizeGDevelopError,
} from '../ErrorNormalizer';

describe('ErrorNormalizer', () => {
  describe('NormalizedAIError', () => {
    it('should create error with correct properties', () => {
      const error = new NormalizedAIError(
        AI_ERROR_CODES.INVALID_API_KEY,
        'Test error',
        { original: 'error' },
        'OpenAI'
      );

      expect(error.code).toBe(AI_ERROR_CODES.INVALID_API_KEY);
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('OpenAI');
      expect(error.originalError).toEqual({ original: 'error' });
      expect(error.name).toBe('NormalizedAIError');
    });

    it('should identify retryable errors correctly', () => {
      const retryableError = new NormalizedAIError(
        AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Rate limit',
        null,
        'OpenAI'
      );
      expect(retryableError.isRetryable()).toBe(true);

      const networkError = new NormalizedAIError(
        AI_ERROR_CODES.NETWORK_ERROR,
        'Network error',
        null,
        'OpenAI'
      );
      expect(networkError.isRetryable()).toBe(true);

      const nonRetryableError = new NormalizedAIError(
        AI_ERROR_CODES.INVALID_API_KEY,
        'Invalid key',
        null,
        'OpenAI'
      );
      expect(nonRetryableError.isRetryable()).toBe(false);
    });

    it('should provide user-friendly messages', () => {
      const error = new NormalizedAIError(
        AI_ERROR_CODES.INVALID_API_KEY,
        'Test error',
        null,
        'OpenAI'
      );

      const userMessage = error.getUserMessage();
      expect(userMessage).toContain('Invalid');
      expect(userMessage).toContain('OpenAI');
      expect(userMessage).toContain('API key');
    });

    it('should not expose API keys in user messages', () => {
      const error = new NormalizedAIError(
        AI_ERROR_CODES.INVALID_API_KEY,
        'Error with key sk-1234567890abcdef',
        null,
        'OpenAI'
      );

      const userMessage = error.getUserMessage();
      expect(userMessage).not.toContain('sk-1234567890abcdef');
    });
  });

  describe('normalizeOpenAIError', () => {
    it('should normalize 401 errors to INVALID_API_KEY', () => {
      const error = { status: 401, message: 'Invalid API key' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.INVALID_API_KEY);
      expect(normalized.provider).toBe('OpenAI');
      expect(normalized.isRetryable()).toBe(false);
    });

    it('should normalize 403 errors to INVALID_API_KEY', () => {
      const error = { status: 403, message: 'Forbidden' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.INVALID_API_KEY);
      expect(normalized.provider).toBe('OpenAI');
    });

    it('should normalize 429 errors to RATE_LIMIT_EXCEEDED', () => {
      const error = { status: 429, message: 'Rate limit exceeded' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(normalized.provider).toBe('OpenAI');
      expect(normalized.isRetryable()).toBe(true);
    });

    it('should normalize 404 errors to MODEL_NOT_FOUND', () => {
      const error = { status: 404, message: 'Model not found' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.MODEL_NOT_FOUND);
      expect(normalized.provider).toBe('OpenAI');
    });

    it('should normalize context length errors to CONTEXT_TOO_LARGE', () => {
      const error = {
        status: 400,
        message: 'This model maximum context length is 4096 tokens',
      };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.CONTEXT_TOO_LARGE);
      expect(normalized.provider).toBe('OpenAI');
    });

    it('should normalize content policy errors to CONTENT_POLICY_VIOLATION', () => {
      const error = {
        status: 400,
        message: 'Your request was rejected as a result of our content policy',
      };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.CONTENT_POLICY_VIOLATION);
      expect(normalized.provider).toBe('OpenAI');
    });

    it('should normalize 500 errors to SERVICE_UNAVAILABLE', () => {
      const error = { status: 500, message: 'Internal server error' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.SERVICE_UNAVAILABLE);
      expect(normalized.provider).toBe('OpenAI');
      expect(normalized.isRetryable()).toBe(true);
    });

    it('should normalize network errors to NETWORK_ERROR', () => {
      const error = { code: 'ENOTFOUND', message: 'Network error' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.NETWORK_ERROR);
      expect(normalized.provider).toBe('OpenAI');
      expect(normalized.isRetryable()).toBe(true);
    });

    it('should normalize timeout errors to TIMEOUT', () => {
      const error = { name: 'AbortError', message: 'Request timed out' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.TIMEOUT);
      expect(normalized.provider).toBe('OpenAI');
      expect(normalized.isRetryable()).toBe(true);
    });

    it('should sanitize API keys from error messages', () => {
      const error = {
        status: 401,
        message: 'Invalid API key: sk-1234567890abcdefghijklmnopqrstuvwxyz',
      };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.message).not.toContain('sk-1234567890abcdefghijklmnopqrstuvwxyz');
      expect(normalized.message).toContain('[API_KEY_REDACTED]');
    });

    it('should sanitize bearer tokens from error messages', () => {
      const error = {
        status: 401,
        message: 'Invalid authorization: Bearer sk-1234567890abcdef',
      };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.message).not.toContain('Bearer sk-1234567890abcdef');
      expect(normalized.message).toContain('[TOKEN_REDACTED]');
    });

    it('should handle unknown errors gracefully', () => {
      const error = { status: 999, message: 'Unknown error' };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.UNKNOWN_ERROR);
      expect(normalized.provider).toBe('OpenAI');
    });

    it('should handle errors with nested error objects', () => {
      const error = {
        status: 401,
        error: { message: 'Invalid API key' },
      };
      const normalized = normalizeOpenAIError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.INVALID_API_KEY);
    });
  });

  describe('normalizeAnthropicError', () => {
    it('should normalize 401 errors to INVALID_API_KEY', () => {
      const error = { status: 401, message: 'Invalid API key' };
      const normalized = normalizeAnthropicError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.INVALID_API_KEY);
      expect(normalized.provider).toBe('Anthropic');
    });

    it('should normalize 429 errors to RATE_LIMIT_EXCEEDED', () => {
      const error = { status: 429, message: 'Rate limit exceeded' };
      const normalized = normalizeAnthropicError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(normalized.provider).toBe('Anthropic');
    });

    it('should sanitize API keys from error messages', () => {
      const error = {
        status: 401,
        message: 'Invalid API key: sk-ant-1234567890abcdef',
      };
      const normalized = normalizeAnthropicError(error);

      expect(normalized.message).not.toContain('sk-ant-1234567890abcdef');
      expect(normalized.message).toContain('[API_KEY_REDACTED]');
    });
  });

  describe('normalizeGDevelopError', () => {
    it('should wrap GDevelop errors in normalized format', () => {
      const error = { message: 'GDevelop backend error' };
      const normalized = normalizeGDevelopError(error);

      expect(normalized.code).toBe(AI_ERROR_CODES.UNKNOWN_ERROR);
      expect(normalized.provider).toBe('GDevelop');
    });

    it('should sanitize API keys from GDevelop errors', () => {
      const error = { message: 'Error with key sk-1234567890abcdef' };
      const normalized = normalizeGDevelopError(error);

      expect(normalized.message).not.toContain('sk-1234567890abcdef');
      expect(normalized.message).toContain('[API_KEY_REDACTED]');
    });
  });
});

