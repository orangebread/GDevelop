// @flow

/**
 * Main AI service layer that routes requests to the appropriate provider.
 * Handles request/response normalization, error handling, and streaming.
 *
 * This service acts as a facade over different AI providers (GDevelop, OpenAI, Anthropic),
 * providing a consistent interface for the rest of the application.
 */

import type {
  AIProviderInterface,
  CreateAiRequestParams,
  AddMessageParams,
  GenerateEventsParams,
  AiRequestOptions,
} from './providers/AIProviderInterface';
import type { AiRequest } from '../Utils/GDevelopServices/Generation';

/**
 * Main AI service class.
 * Routes requests to the configured provider and handles errors.
 */
export class AIService {
  provider: AIProviderInterface;

  constructor(provider: AIProviderInterface) {
    this.provider = provider;
  }

  /**
   * Get the current provider information.
   *
   * @returns Provider info (id, name, requiresApiKey)
   */
  getProviderInfo() {
    return this.provider.getProviderInfo();
  }

  /**
   * Create a new AI request (chat or agent).
   * Delegates to the configured provider with error handling.
   *
   * @param params - Request parameters
   * @param options - Optional streaming/cancellation options
   * @returns AI request object
   * @throws Error if request fails
   */
  async createAiRequest(
    params: CreateAiRequestParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    try {
      return await this.provider.createAiRequest(params, options);
    } catch (error) {
      // Normalize error and re-throw
      throw this._normalizeError(error, 'createAiRequest');
    }
  }

  /**
   * Add a message to an existing AI request.
   * Delegates to the configured provider with error handling.
   *
   * @param params - Message parameters
   * @param options - Optional streaming/cancellation options
   * @returns Updated AI request object
   * @throws Error if request fails
   */
  async addMessage(
    params: AddMessageParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    try {
      return await this.provider.addMessage(params, options);
    } catch (error) {
      // Normalize error and re-throw
      throw this._normalizeError(error, 'addMessage');
    }
  }

  /**
   * Generate events for a scene.
   * Delegates to the configured provider with error handling.
   *
   * @param params - Event generation parameters
   * @param options - Optional streaming/cancellation options
   * @returns Generated events result
   * @throws Error if request fails
   */
  async generateEvents(
    params: GenerateEventsParams,
    options?: AiRequestOptions
  ): Promise<any> {
    try {
      return await this.provider.generateEvents(params, options);
    } catch (error) {
      // Normalize error and re-throw
      throw this._normalizeError(error, 'generateEvents');
    }
  }

  /**
   * Normalize errors from different providers into a consistent format.
   * Ensures sensitive information (like API keys) is never exposed in error messages.
   *
   * @param error - Original error
   * @param operation - Operation that failed
   * @returns Normalized error
   */
  _normalizeError(error: any, operation: string): Error {
    // If it's already an Error object, use it
    if (error instanceof Error) {
      // Make sure error message doesn't contain sensitive data
      const sanitizedMessage = this._sanitizeErrorMessage(error.message);
      const normalizedError = new Error(sanitizedMessage);
      normalizedError.name = error.name;
      return normalizedError;
    }

    // If it's an axios error with response
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Handle common HTTP errors
      if (status === 401) {
        return new Error('Authentication failed. Please check your API key.');
      } else if (status === 403) {
        return new Error('Access forbidden. Please check your API key permissions.');
      } else if (status === 429) {
        return new Error('Rate limit exceeded. Please try again later.');
      } else if (status >= 500) {
        return new Error('AI service is temporarily unavailable. Please try again later.');
      }

      // Try to extract error message from response
      const errorMessage = (data && data.error && data.error.message) || (data && data.message);
      const message = errorMessage || `AI request failed with status ${status}`;
      return new Error(this._sanitizeErrorMessage(message));
    }

    // If it's a network error
    if (error.request) {
      return new Error('Network error. Please check your internet connection.');
    }

    // Generic error
    return new Error(`AI ${operation} failed: ${String(error)}`);
  }

  /**
   * Sanitize error messages to remove sensitive information.
   *
   * @param message - Original error message
   * @returns Sanitized message
   */
  _sanitizeErrorMessage(message: string): string {
    // Remove anything that looks like an API key
    let sanitized = message.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***');
    sanitized = sanitized.replace(/Bearer [a-zA-Z0-9_-]+/g, 'Bearer ***');

    // Remove any other potential secrets (long alphanumeric strings)
    sanitized = sanitized.replace(/[a-zA-Z0-9]{40,}/g, '***');

    return sanitized;
  }
}

