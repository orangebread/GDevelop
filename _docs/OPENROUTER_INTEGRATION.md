# OpenRouter Integration

This document describes the OpenRouter integration added to GDevelop's custom AI provider system.

## Overview

OpenRouter (https://openrouter.ai) is a unified API gateway that provides access to multiple AI models from different providers (OpenAI, Anthropic, Google, Meta, Mistral, etc.) through a single API interface. This integration allows GDevelop users to access a wide variety of AI models using their OpenRouter API key.

## Key Features

- **Unified Access**: Access to multiple AI providers through a single API key
- **Model Variety**: Support for models from OpenAI, Anthropic, Google, Meta, Mistral, and more
- **Cost Flexibility**: Choose models based on your budget and performance needs
- **OpenAI-Compatible API**: Uses the same API format as OpenAI, making integration straightforward

## Implementation Details

### Files Created

1. **`newIDE/app/src/CustomAI/providers/OpenRouterProvider.js`**
   - Implements the `AIProviderInterface` for OpenRouter
   - Uses OpenAI-compatible API format
   - Adds required OpenRouter headers (`HTTP-Referer`, `X-Title`)
   - Supports both chat and agent modes with function calling

### Files Modified

1. **`newIDE/app/src/CustomAI/CustomAISettings.js`**
   - Added `'openrouter'` to the provider type union

2. **`newIDE/app/src/CustomAI/providers/ProviderRegistry.js`**
   - Added OpenRouter models to the registry:
     - Claude 3.5 Sonnet (via OpenRouter)
     - Claude 3 Opus (via OpenRouter)
     - GPT-4 Turbo (via OpenRouter)
     - GPT-4o (via OpenRouter)
     - Gemini Pro 1.5 (via OpenRouter)
     - Llama 3.1 70B (via OpenRouter)
     - Mistral Large (via OpenRouter)

3. **`newIDE/app/src/CustomAI/SecureStorage.js`**
   - Added support for `GDEVELOP_OPENROUTER_API_KEY` environment variable
   - Added support for `REACT_APP_GDEVELOP_OPENROUTER_API_KEY` for web builds

4. **`newIDE/app/src/CustomAI/useAIService.js`**
   - Added OpenRouter provider instantiation logic
   - Added OpenRouter to environment variable sync loading

5. **`newIDE/app/src/CustomAI/index.js`**
   - Exported `OpenRouterProvider` for external use

6. **`newIDE/app/src/MainFrame/Preferences/CustomAISettingsTab.js`**
   - Added OpenRouter option to provider dropdown
   - Updated API key input placeholder for OpenRouter
   - Updated help text to mention OpenRouter

7. **`newIDE/app/src/MainFrame/Preferences/PreferencesContext.js`**
   - Updated type definitions to include `'openrouter'`

8. **`newIDE/app/src/MainFrame/Preferences/PreferencesProvider.js`**
   - Updated type definitions to include `'openrouter'`

## Usage

### Setting Up OpenRouter

1. **Get an API Key**:
   - Sign up at https://openrouter.ai
   - Generate an API key from your account dashboard

2. **Configure in GDevelop**:
   - Open Settings > Preferences > Custom AI
   - Enable "Use custom AI provider"
   - Select "OpenRouter" from the provider dropdown
   - Choose your preferred model
   - Enter your OpenRouter API key
   - Click "Save API Key"

3. **Using Environment Variables** (Preferred for development):
   - Set `GDEVELOP_OPENROUTER_API_KEY` environment variable
   - For web builds, use `REACT_APP_GDEVELOP_OPENROUTER_API_KEY`
   - The key will be automatically loaded without manual entry

### Available Models

The following models are pre-configured in the registry:

- **Claude 3.5 Sonnet** (`anthropic/claude-3.5-sonnet`) - Default
  - Context: 200K tokens
  - Cost: $3/$15 per million tokens (input/output)

- **Claude 3 Opus** (`anthropic/claude-3-opus`)
  - Context: 200K tokens
  - Cost: $15/$75 per million tokens

- **GPT-4 Turbo** (`openai/gpt-4-turbo`)
  - Context: 128K tokens
  - Cost: $10/$30 per million tokens

- **GPT-4o** (`openai/gpt-4o`)
  - Context: 128K tokens
  - Cost: $2.5/$10 per million tokens

- **Gemini Pro 1.5** (`google/gemini-pro-1.5`)
  - Context: 1M tokens
  - Cost: $1.25/$5 per million tokens

- **Llama 3.1 70B** (`meta-llama/llama-3.1-70b-instruct`)
  - Context: 131K tokens
  - Cost: $0.52/$0.75 per million tokens

- **Mistral Large** (`mistralai/mistral-large`)
  - Context: 128K tokens
  - Cost: $2/$6 per million tokens

## Technical Details

### API Endpoint

OpenRouter uses the OpenAI-compatible endpoint:
```
https://openrouter.ai/api/v1/chat/completions
```

### Required Headers

OpenRouter requires additional headers for attribution:
- `HTTP-Referer`: Set to `https://gdevelop.io`
- `X-Title`: Set to `GDevelop`

### Function Calling

OpenRouter supports function calling using the same format as OpenAI, which enables GDevelop's agent mode to work seamlessly.

### Error Handling

Errors from OpenRouter are normalized using the same error handler as OpenAI (`normalizeOpenAIError`) since the API format is compatible.

## Benefits

1. **Model Diversity**: Access to models from multiple providers without managing multiple API keys
2. **Cost Optimization**: Choose the most cost-effective model for your needs
3. **Flexibility**: Switch between models easily without changing providers
4. **Unified Billing**: Single billing through OpenRouter for all model usage
5. **Competitive Pricing**: OpenRouter often offers competitive or better pricing than direct provider access

## Security

- API keys are stored securely using the same mechanism as other providers:
  - Electron: OS-level encryption via `safeStorage` or system keychain via `keytar`
  - Web: Environment variables (not stored in browser)
- Keys are never sent to GDevelop servers
- Keys are never logged or exposed in error messages

## Future Enhancements

Potential improvements for the OpenRouter integration:

1. **Dynamic Model List**: Fetch available models from OpenRouter API
2. **Model Search**: Allow users to search and select from all available models
3. **Usage Tracking**: Display OpenRouter usage statistics
4. **Model Recommendations**: Suggest models based on task requirements
5. **Streaming Support**: Implement streaming responses for better UX

## References

- OpenRouter Documentation: https://openrouter.ai/docs
- OpenRouter Models: https://openrouter.ai/models
- OpenRouter Pricing: https://openrouter.ai/models (pricing shown per model)

