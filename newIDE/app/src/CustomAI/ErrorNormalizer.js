// @flow

/**
 * Error normalization for AI providers.
 * Provides a consistent error taxonomy across GDevelop, OpenAI, Anthropic, and future providers.
 *
 * This module ensures that errors from different providers are normalized to a standard format,
 * making it easier to handle errors consistently in the UI and provide helpful user messages.
 *
 * Security: All error messages are sanitized to prevent API key exposure.
 */

/**
 * Standard error codes for AI operations.
 * These codes are provider-agnostic and allow consistent error handling.
 */
export const AI_ERROR_CODES = {
  // Authentication errors
  INVALID_API_KEY: 'invalid_api_key',
  EXPIRED_API_KEY: 'expired_api_key',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  QUOTA_EXCEEDED: 'quota_exceeded',

  // Model/request errors
  MODEL_NOT_FOUND: 'model_not_found',
  CONTEXT_TOO_LARGE: 'context_too_large',
  INVALID_REQUEST: 'invalid_request',

  // Policy violations
  CONTENT_POLICY_VIOLATION: 'content_policy_violation',

  // Network/infrastructure
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  SERVICE_UNAVAILABLE: 'service_unavailable',

  // Unknown
  UNKNOWN_ERROR: 'unknown_error',
};

/**
 * Normalized AI error class.
 * Wraps provider-specific errors with a standard interface.
 */
export class NormalizedAIError extends Error {
  code: string;
  originalError: any;
  provider: string;

  constructor(code: string, message: string, originalError: any, provider: string) {
    super(message);
    this.code = code;
    this.originalError = originalError;
    this.provider = provider;
    this.name = 'NormalizedAIError';

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NormalizedAIError);
    }
  }

  /**
   * Check if this error is retryable.
   * Retryable errors are typically transient (rate limits, network issues, etc.)
   *
   * @returns true if the operation can be retried
   */
  isRetryable(): boolean {
    return [
      AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      AI_ERROR_CODES.NETWORK_ERROR,
      AI_ERROR_CODES.TIMEOUT,
      AI_ERROR_CODES.SERVICE_UNAVAILABLE,
    ].includes(this.code);
  }

  /**
   * Get a user-friendly error message.
   * These messages are safe to display in the UI and don't expose sensitive data.
   *
   * @returns User-friendly error message
   */
  getUserMessage(): string {
    const messages = {
      [AI_ERROR_CODES.INVALID_API_KEY]: `Invalid ${this.provider} API key. Please check your settings and ensure your API key is correct.`,
      [AI_ERROR_CODES.EXPIRED_API_KEY]: `Your ${this.provider} API key has expired. Please update it in settings.`,
      [AI_ERROR_CODES.RATE_LIMIT_EXCEEDED]: `${this.provider} rate limit exceeded. Please wait a moment and try again.`,
      [AI_ERROR_CODES.QUOTA_EXCEEDED]: `${this.provider} quota exceeded. Please check your account limits.`,
      [AI_ERROR_CODES.MODEL_NOT_FOUND]: `The selected AI model is not available. Please choose a different model in settings.`,
      [AI_ERROR_CODES.CONTEXT_TOO_LARGE]: `Project context is too large for this model. Try a model with a larger context window, or simplify your project.`,
      [AI_ERROR_CODES.INVALID_REQUEST]: `Invalid request. Please try rephrasing your question or check your project configuration.`,
      [AI_ERROR_CODES.CONTENT_POLICY_VIOLATION]: `Request blocked by content policy. Please rephrase your request.`,
      [AI_ERROR_CODES.NETWORK_ERROR]: `Network error. Please check your internet connection and try again.`,
      [AI_ERROR_CODES.TIMEOUT]: `Request timed out. Please try again.`,
      [AI_ERROR_CODES.SERVICE_UNAVAILABLE]: `${this.provider} service is temporarily unavailable. Please try again later.`,
      [AI_ERROR_CODES.UNKNOWN_ERROR]: `An unexpected error occurred. Please try again.`,
    };
    return messages[this.code] || this.message;
  }
}

/**
 * Sanitize error message to remove sensitive data (API keys, tokens, etc.)
 * This is critical for security - we never want to expose API keys in error messages.
 *
 * @param message - Error message to sanitize
 * @returns Sanitized error message
 */
const sanitizeErrorMessage = (message: string): string => {
  if (!message) return 'Unknown error';

  // Remove anything that looks like an API key
  // OpenAI keys: sk-... or sk-proj-...
  // Anthropic keys: sk-ant-...
  let sanitized = message.replace(/sk-[a-zA-Z0-9-_]{20,}/g, '[API_KEY_REDACTED]');
  
  // Remove bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9-_\.]+/gi, 'Bearer [TOKEN_REDACTED]');
  
  // Remove authorization headers
  sanitized = sanitized.replace(/authorization:\s*[^\s,}]+/gi, 'authorization: [REDACTED]');
  
  return sanitized;
};

/**
 * Normalize OpenAI errors to standard error codes.
 *
 * @param error - OpenAI error object
 * @returns Normalized error
 */
export const normalizeOpenAIError = (error: any): NormalizedAIError => {
  // Sanitize the error message first
  const originalMessage = error?.message || error?.error?.message || 'Unknown OpenAI error';
  const sanitizedMessage = sanitizeErrorMessage(originalMessage);

  // HTTP status code mapping
  const status = error?.status || error?.response?.status;
  
  if (status === 401 || status === 403) {
    return new NormalizedAIError(
      AI_ERROR_CODES.INVALID_API_KEY,
      'Invalid OpenAI API key',
      error,
      'OpenAI'
    );
  }

  if (status === 429) {
    return new NormalizedAIError(
      AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'OpenAI rate limit exceeded',
      error,
      'OpenAI'
    );
  }

  if (status === 404) {
    return new NormalizedAIError(
      AI_ERROR_CODES.MODEL_NOT_FOUND,
      'OpenAI model not found',
      error,
      'OpenAI'
    );
  }

  if (status === 400) {
    // Check for specific error types in the message
    const lowerMessage = sanitizedMessage.toLowerCase();
    
    if (lowerMessage.includes('context') && lowerMessage.includes('length')) {
      return new NormalizedAIError(
        AI_ERROR_CODES.CONTEXT_TOO_LARGE,
        'Context length exceeded',
        error,
        'OpenAI'
      );
    }

    if (lowerMessage.includes('content policy') || lowerMessage.includes('content filter')) {
      return new NormalizedAIError(
        AI_ERROR_CODES.CONTENT_POLICY_VIOLATION,
        'Content policy violation',
        error,
        'OpenAI'
      );
    }

    return new NormalizedAIError(
      AI_ERROR_CODES.INVALID_REQUEST,
      sanitizedMessage,
      error,
      'OpenAI'
    );
  }

  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return new NormalizedAIError(
      AI_ERROR_CODES.SERVICE_UNAVAILABLE,
      'OpenAI service unavailable',
      error,
      'OpenAI'
    );
  }

  // Network errors (no status code)
  if (!status && (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT')) {
    return new NormalizedAIError(
      AI_ERROR_CODES.NETWORK_ERROR,
      'Network error',
      error,
      'OpenAI'
    );
  }

  // Timeout errors
  if (error?.name === 'AbortError' || error?.code === 'ETIMEDOUT') {
    return new NormalizedAIError(
      AI_ERROR_CODES.TIMEOUT,
      'Request timed out',
      error,
      'OpenAI'
    );
  }

  // Unknown error
  return new NormalizedAIError(
    AI_ERROR_CODES.UNKNOWN_ERROR,
    sanitizedMessage,
    error,
    'OpenAI'
  );
};

/**
 * Normalize Anthropic errors to standard error codes.
 * Handles Anthropic-specific error types and status codes.
 *
 * @param error - Anthropic error object
 * @returns Normalized error
 */
export const normalizeAnthropicError = (error: any): NormalizedAIError => {
  // Sanitize the error message first
  const originalMessage = error?.message || error?.error?.message || 'Unknown Anthropic error';
  const sanitizedMessage = sanitizeErrorMessage(originalMessage);

  // HTTP status code mapping
  const status = error?.status || error?.response?.status;

  // Anthropic error type (from error.error.type)
  const errorType = error?.error?.type || error?.type;

  // Authentication errors (401, 403)
  if (status === 401 || status === 403) {
    if (errorType === 'authentication_error') {
      return new NormalizedAIError(
        AI_ERROR_CODES.INVALID_API_KEY,
        'Invalid Anthropic API key. Please check your API key in Settings.',
        error,
        'Anthropic'
      );
    }
    if (errorType === 'permission_error') {
      return new NormalizedAIError(
        AI_ERROR_CODES.INVALID_API_KEY,
        'Anthropic API key does not have permission for this operation.',
        error,
        'Anthropic'
      );
    }
    return new NormalizedAIError(
      AI_ERROR_CODES.INVALID_API_KEY,
      'Authentication failed with Anthropic API.',
      error,
      'Anthropic'
    );
  }

  // Rate limiting (429)
  if (status === 429) {
    if (errorType === 'rate_limit_error') {
      return new NormalizedAIError(
        AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Anthropic rate limit exceeded. Please wait a moment and try again.',
        error,
        'Anthropic'
      );
    }
    return new NormalizedAIError(
      AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'Too many requests to Anthropic. Please slow down.',
      error,
      'Anthropic'
    );
  }

  // Invalid request (400)
  if (status === 400) {
    if (errorType === 'invalid_request_error') {
      // Check for context length errors
      if (sanitizedMessage.toLowerCase().includes('maximum context length') ||
          sanitizedMessage.toLowerCase().includes('too many tokens')) {
        return new NormalizedAIError(
          AI_ERROR_CODES.CONTEXT_TOO_LARGE,
          'Request exceeds Anthropic context limit. Try reducing the project size or conversation length.',
          error,
          'Anthropic'
        );
      }
      return new NormalizedAIError(
        AI_ERROR_CODES.INVALID_REQUEST,
        `Invalid request to Anthropic: ${sanitizedMessage}`,
        error,
        'Anthropic'
      );
    }
    return new NormalizedAIError(
      AI_ERROR_CODES.INVALID_REQUEST,
      'Bad request to Anthropic API.',
      error,
      'Anthropic'
    );
  }

  // Not found (404)
  if (status === 404) {
    if (errorType === 'not_found_error') {
      return new NormalizedAIError(
        AI_ERROR_CODES.MODEL_NOT_FOUND,
        'Anthropic model not found. Please check your model selection.',
        error,
        'Anthropic'
      );
    }
    return new NormalizedAIError(
      AI_ERROR_CODES.MODEL_NOT_FOUND,
      'Anthropic resource not found.',
      error,
      'Anthropic'
    );
  }

  // Overloaded (529) - Anthropic-specific
  if (status === 529) {
    return new NormalizedAIError(
      AI_ERROR_CODES.SERVICE_UNAVAILABLE,
      'Anthropic API is temporarily overloaded. Please try again in a moment.',
      error,
      'Anthropic'
    );
  }

  // Server errors (500, 502, 503, 504)
  if (status >= 500 && status < 600) {
    return new NormalizedAIError(
      AI_ERROR_CODES.SERVICE_UNAVAILABLE,
      'Anthropic service is temporarily unavailable. Please try again later.',
      error,
      'Anthropic'
    );
  }

  // Network errors
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
    return new NormalizedAIError(
      AI_ERROR_CODES.NETWORK_ERROR,
      'Network error connecting to Anthropic. Please check your internet connection.',
      error,
      'Anthropic'
    );
  }

  // Timeout errors
  if (error?.code === 'ETIMEDOUT' || error?.name === 'AbortError') {
    return new NormalizedAIError(
      AI_ERROR_CODES.TIMEOUT,
      'Request to Anthropic timed out. Please try again.',
      error,
      'Anthropic'
    );
  }

  // Unknown error
  return new NormalizedAIError(
    AI_ERROR_CODES.UNKNOWN_ERROR,
    sanitizedMessage || 'An unknown error occurred with Anthropic.',
    error,
    'Anthropic'
  );
};

/**
 * Normalize GDevelop backend errors to standard error codes.
 *
 * @param error - GDevelop error object
 * @returns Normalized error
 */
export const normalizeGDevelopError = (error: any): NormalizedAIError => {
  // Sanitize the error message first
  const originalMessage = error?.message || 'Unknown GDevelop error';
  const sanitizedMessage = sanitizeErrorMessage(originalMessage);

  // GDevelop backend errors are already handled by the existing error handling
  // Just wrap them in our normalized format for consistency
  return new NormalizedAIError(
    AI_ERROR_CODES.UNKNOWN_ERROR,
    sanitizedMessage,
    error,
    'GDevelop'
  );
};

