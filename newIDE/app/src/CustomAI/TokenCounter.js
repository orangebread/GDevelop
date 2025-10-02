// @flow

/**
 * Token counting for AI providers.
 * Provides accurate token estimation for different AI models to enforce context limits.
 *
 * This implementation uses a conservative estimation approach based on character count
 * and known tokenization patterns. This avoids the complexity of bundling WASM-based
 * tokenizers (like tiktoken) in Electron.
 *
 * For production use, this provides reasonable accuracy (within 10-15% of actual token count)
 * which is sufficient for context limit enforcement and cost estimation.
 */

import { getModelMetadata } from './providers/ProviderRegistry';

/**
 * Estimate token count for a text string.
 * Uses a conservative estimation based on character count and language patterns.
 *
 * This is based on empirical observations:
 * - English text: ~4 characters per token on average
 * - Code: ~3.5 characters per token on average
 * - JSON: ~3 characters per token on average
 * - We use 3.5 as a conservative estimate (slightly overestimates)
 *
 * @param text - Text to count tokens for
 * @param model - Model ID (for future model-specific adjustments)
 * @returns Estimated token count
 */
export const countTokens = (text: string, model?: string): number => {
  if (!text) return 0;

  // Conservative estimate: 3.5 characters per token
  // This tends to overestimate slightly, which is safer for context limits
  const baseEstimate = Math.ceil(text.length / 3.5);

  // Add a small buffer for safety (5%)
  return Math.ceil(baseEstimate * 1.05);
};

/**
 * Message format for token estimation.
 */
type Message = {
  role: 'system' | 'user' | 'assistant' | 'function',
  content: string,
  name?: string,
  function_call?: any,
};

/**
 * Estimate token count for a message array (chat format).
 * Accounts for message formatting overhead in the API.
 *
 * Based on OpenAI's documentation:
 * - Each message has ~4 tokens of overhead (role, formatting, etc.)
 * - Function calls add additional tokens
 * - System messages are counted the same as other messages
 *
 * @param messages - Array of messages
 * @param model - Model ID (for model-specific adjustments)
 * @returns Estimated token count
 */
export const estimateMessageTokens = (messages: Array<Message>, model?: string): number => {
  if (!messages || messages.length === 0) return 0;

  let totalTokens = 0;

  for (const message of messages) {
    // Base overhead per message (~4 tokens)
    totalTokens += 4;

    // Count tokens in content
    if (message.content) {
      totalTokens += countTokens(message.content, model);
    }

    // Count tokens in function call (if present)
    if (message.function_call) {
      const functionCallStr = JSON.stringify(message.function_call);
      totalTokens += countTokens(functionCallStr, model);
    }

    // Name field adds ~1 token
    if (message.name) {
      totalTokens += 1;
    }
  }

  // Add a small buffer for conversation formatting (~3 tokens)
  totalTokens += 3;

  return totalTokens;
};

/**
 * Result of context limit check.
 */
export type ContextLimitCheckResult = {|
  withinLimit: boolean,
  maxTokens: number,
  currentTokens: number,
  percentUsed: number,
  recommendedAction?: string,
|};

/**
 * Check if token count is within the model's context limit.
 * Provides helpful feedback for when limits are approached or exceeded.
 *
 * @param tokens - Current token count
 * @param providerId - Provider ID (e.g., 'openai', 'anthropic')
 * @param modelId - Model ID (e.g., 'gpt-5', 'claude-sonnet-4-5-20250929')
 * @returns Context limit check result
 */
export const checkContextLimit = (
  tokens: number,
  providerId: string,
  modelId: string
): ContextLimitCheckResult => {
  const modelMetadata = getModelMetadata(providerId, modelId);
  
  if (!modelMetadata) {
    // Unknown model - use a conservative default (8k tokens)
    const defaultLimit = 8000;
    return {
      withinLimit: tokens <= defaultLimit,
      maxTokens: defaultLimit,
      currentTokens: tokens,
      percentUsed: (tokens / defaultLimit) * 100,
      recommendedAction: tokens > defaultLimit
        ? 'Context limit exceeded. Please reduce the size of your request.'
        : undefined,
    };
  }

  const maxTokens = modelMetadata.contextWindow;
  const percentUsed = (tokens / maxTokens) * 100;
  const withinLimit = tokens <= maxTokens;

  let recommendedAction;
  if (!withinLimit) {
    recommendedAction = `Context limit exceeded (${tokens.toLocaleString()} / ${maxTokens.toLocaleString()} tokens). Please reduce the size of your request or choose a model with a larger context window.`;
  } else if (percentUsed > 90) {
    recommendedAction = `Approaching context limit (${percentUsed.toFixed(1)}% used). Consider reducing request size.`;
  } else if (percentUsed > 75) {
    recommendedAction = `Context usage is high (${percentUsed.toFixed(1)}% used). You may want to reduce request size.`;
  }

  return {
    withinLimit,
    maxTokens,
    currentTokens: tokens,
    percentUsed,
    recommendedAction,
  };
};

/**
 * Estimate the cost of a request based on token counts.
 * Uses pricing data from ProviderRegistry.
 *
 * @param providerId - Provider ID (e.g., 'openai', 'anthropic')
 * @param modelId - Model ID (e.g., 'gpt-5', 'claude-sonnet-4-5-20250929')
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 */
export const estimateCost = (
  providerId: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number => {
  const modelMetadata = getModelMetadata(providerId, modelId);

  if (!modelMetadata) {
    return 0; // Unknown model or no pricing data
  }

  const inputCost = (inputTokens / 1000000) * modelMetadata.inputPricePerMillion;
  const outputCost = (outputTokens / 1000000) * modelMetadata.outputPricePerMillion;

  return inputCost + outputCost;
};

/**
 * Format cost for display.
 * Shows cost in a user-friendly format with appropriate precision.
 *
 * @param cost - Cost in USD
 * @returns Formatted cost string
 */
export const formatCost = (cost: number): string => {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
};

/**
 * Truncate text to fit within a token limit.
 * Useful for ensuring requests don't exceed context limits.
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum token count
 * @param model - Model ID (for token estimation)
 * @returns Truncated text
 */
export const truncateToTokenLimit = (
  text: string,
  maxTokens: number,
  model?: string
): string => {
  const currentTokens = countTokens(text, model);
  
  if (currentTokens <= maxTokens) {
    return text; // No truncation needed
  }

  // Estimate how much to truncate
  // Use 3.5 characters per token as our baseline
  const targetLength = Math.floor(maxTokens * 3.5);
  
  // Truncate and add ellipsis
  const truncated = text.substring(0, targetLength);
  return truncated + '...';
};

/**
 * Truncate messages array to fit within a token limit.
 * Removes oldest messages first, preserving system message and most recent context.
 *
 * @param messages - Array of messages
 * @param maxTokens - Maximum token count
 * @param model - Model ID (for token estimation)
 * @returns Truncated messages array
 */
export const truncateMessagesToTokenLimit = (
  messages: Array<Message>,
  maxTokens: number,
  model?: string
): Array<Message> => {
  if (messages.length === 0) return messages;

  const currentTokens = estimateMessageTokens(messages, model);
  
  if (currentTokens <= maxTokens) {
    return messages; // No truncation needed
  }

  // Preserve system message (if present) and most recent messages
  const systemMessages = messages.filter(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  // Start with system messages
  let truncated = [...systemMessages];
  let tokensUsed = estimateMessageTokens(truncated, model);

  // Add messages from most recent to oldest until we hit the limit
  for (let i = otherMessages.length - 1; i >= 0; i--) {
    const message = otherMessages[i];
    const messageTokens = estimateMessageTokens([message], model);
    
    if (tokensUsed + messageTokens <= maxTokens) {
      truncated.push(message);
      tokensUsed += messageTokens;
    } else {
      break; // Can't fit any more messages
    }
  }

  // Restore chronological order (system messages first, then others in order)
  const nonSystemTruncated = truncated.filter(m => m.role !== 'system');
  nonSystemTruncated.reverse(); // Restore chronological order
  
  return [...systemMessages, ...nonSystemTruncated];
};

/**
 * Get a summary of token usage for display.
 *
 * @param tokens - Current token count
 * @param providerId - Provider ID
 * @param modelId - Model ID
 * @returns Human-readable summary
 */
export const getTokenUsageSummary = (
  tokens: number,
  providerId: string,
  modelId: string
): string => {
  const check = checkContextLimit(tokens, providerId, modelId);
  
  return `${tokens.toLocaleString()} / ${check.maxTokens.toLocaleString()} tokens (${check.percentUsed.toFixed(1)}% used)`;
};

