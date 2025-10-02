// @flow

/**
 * Registry of AI model metadata including context windows, pricing, and capabilities.
 * This centralizes all model information for easy reference and cost estimation.
 *
 * Pricing data as of October 2, 2025:
 * - OpenAI: https://openai.com/api/pricing/
 * - Anthropic: https://www.anthropic.com/pricing
 */

export type ModelMetadata = {|
  id: string,
  name: string,
  provider: string,
  contextWindow: number,
  maxOutputTokens: number,
  inputPricePerMillion: number,
  outputPricePerMillion: number,
  supportsStreaming: boolean,
  supportsFunctionCalling: boolean,
|};

/**
 * Complete registry of AI models with their metadata.
 * Organized by provider for easy lookup.
 */
export const MODEL_REGISTRY: { [provider: string]: { [modelId: string]: ModelMetadata } } = {
  openai: {
    'gpt-5': {
      id: 'gpt-5',
      name: 'GPT-5',
      provider: 'openai',
      contextWindow: 131072,
      maxOutputTokens: 16384,
      inputPricePerMillion: 1.25,
      outputPricePerMillion: 10.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'gpt-5-mini': {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      provider: 'openai',
      contextWindow: 131072,
      maxOutputTokens: 16384,
      inputPricePerMillion: 0.25,
      outputPricePerMillion: 2.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'gpt-5-nano': {
      id: 'gpt-5-nano',
      name: 'GPT-5 Nano',
      provider: 'openai',
      contextWindow: 131072,
      maxOutputTokens: 16384,
      inputPricePerMillion: 0.05,
      outputPricePerMillion: 0.4,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'gpt-4.1': {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      provider: 'openai',
      contextWindow: 1000000,
      maxOutputTokens: 32768,
      inputPricePerMillion: 2.0,
      outputPricePerMillion: 8.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'gpt-4.1-mini': {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      provider: 'openai',
      contextWindow: 1000000,
      maxOutputTokens: 32768,
      inputPricePerMillion: 0.4,
      outputPricePerMillion: 1.6,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'gpt-4.1-nano': {
      id: 'gpt-4.1-nano',
      name: 'GPT-4.1 Nano',
      provider: 'openai',
      contextWindow: 1000000,
      maxOutputTokens: 32768,
      inputPricePerMillion: 0.1,
      outputPricePerMillion: 0.4,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'gpt-4o': {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      inputPricePerMillion: 2.5,
      outputPricePerMillion: 10.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'gpt-4o-mini': {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      inputPricePerMillion: 0.15,
      outputPricePerMillion: 0.6,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
  },
  anthropic: {
    'claude-sonnet-4-5-20250929': {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 64000,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'claude-sonnet-4-20250514': {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 64000,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'claude-3-7-sonnet-20250219': {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude Sonnet 3.7',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 64000,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'claude-opus-4-1-20250805': {
      id: 'claude-opus-4-1-20250805',
      name: 'Claude Opus 4.1',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 32000,
      inputPricePerMillion: 15.0,
      outputPricePerMillion: 75.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'claude-opus-4-20250514': {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 32000,
      inputPricePerMillion: 15.0,
      outputPricePerMillion: 75.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'claude-3-5-haiku-20241022': {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude Haiku 3.5',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      inputPricePerMillion: 1.0,
      outputPricePerMillion: 5.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
  },
  openrouter: {
    'z-ai/glm-4.6': {
      id: 'z-ai/glm-4.6',
      name: 'GLM 4.6 (OpenRouter)',
      provider: 'openrouter',
      contextWindow: 202752,
      maxOutputTokens: 202752,
      inputPricePerMillion: 0.5,
      outputPricePerMillion: 1.75,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'anthropic/claude-sonnet-4.5': {
      id: 'anthropic/claude-sonnet-4.5',
      name: 'Claude Sonnet 4.5 (OpenRouter)',
      provider: 'openrouter',
      contextWindow: 1000000,
      maxOutputTokens: 64000,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'deepseek/deepseek-v3.2-exp': {
      id: 'deepseek/deepseek-v3.2-exp',
      name: 'DeepSeek V3.2 Exp (OpenRouter)',
      provider: 'openrouter',
      contextWindow: 128000,
      maxOutputTokens: 8192,
      inputPricePerMillion: 0.14,
      outputPricePerMillion: 0.28,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'qwen/qwen3-coder-plus': {
      id: 'qwen/qwen3-coder-plus',
      name: 'Qwen3 Coder Plus (OpenRouter)',
      provider: 'openrouter',
      contextWindow: 1000000,
      maxOutputTokens: 32768,
      inputPricePerMillion: 0.5,
      outputPricePerMillion: 1.5,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
    'x-ai/grok-4-fast:free': {
      id: 'x-ai/grok-4-fast:free',
      name: 'Grok 4 Fast Free (OpenRouter)',
      provider: 'openrouter',
      contextWindow: 2000000,
      maxOutputTokens: 30000,
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
      supportsStreaming: true,
      supportsFunctionCalling: true,
    },
  },
  gdevelop: {
    'gdevelop-default': {
      id: 'gdevelop-default',
      name: 'GDevelop AI',
      provider: 'gdevelop',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
      supportsStreaming: false,
      supportsFunctionCalling: true,
    },
  },
};

/**
 * Get all models for a specific provider.
 *
 * @param provider - Provider ID ('openai', 'anthropic', 'openrouter', 'gdevelop')
 * @returns Array of model metadata for the provider
 */
export const getProviderModels = (provider: string): Array<ModelMetadata> => {
  const providerModels = MODEL_REGISTRY[provider];
  if (!providerModels) return [];
  return (Object.values(providerModels): any);
};

/**
 * Get metadata for a specific model.
 *
 * @param provider - Provider ID
 * @param modelId - Model ID
 * @returns Model metadata or null if not found
 */
export const getModelMetadata = (provider: string, modelId: string): ?ModelMetadata => {
  const providerModels = MODEL_REGISTRY[provider];
  if (!providerModels) return null;
  return providerModels[modelId] || null;
};

/**
 * Estimate the cost of an AI request based on token usage.
 *
 * @param provider - Provider ID
 * @param modelId - Model ID
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 */
export const estimateCost = (
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number => {
  const model = getModelMetadata(provider, modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1000000) * model.inputPricePerMillion;
  const outputCost = (outputTokens / 1000000) * model.outputPricePerMillion;

  return inputCost + outputCost;
};

/**
 * Get all available providers.
 *
 * @returns Array of provider IDs
 */
export const getAvailableProviders = (): Array<string> => {
  return Object.keys(MODEL_REGISTRY);
};

/**
 * Get the default model for a provider.
 *
 * @param provider - Provider ID
 * @returns Default model ID or null if provider not found
 */
export const getDefaultModelForProvider = (provider: string): ?string => {
  const models = getProviderModels(provider);
  if (models.length === 0) return null;

  // Return the first model as default
  // For OpenAI: gpt-5 (latest flagship model)
  // For Anthropic: claude-sonnet-4-5-20250929 (latest Sonnet model)
  // For GDevelop: gdevelop-default
  return models[0].id;
};

