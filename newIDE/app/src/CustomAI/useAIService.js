// @flow

/**
 * React hook that returns a configured AIService instance based on user preferences.
 * Handles provider switching and API key loading.
 *
 * This hook:
 * 1. Reads custom AI settings from PreferencesContext
 * 2. Loads API key from SecureStorage if needed
 * 3. Instantiates the correct provider (GDevelop, OpenAI, Anthropic, or OpenRouter)
 * 4. Returns a configured AIService instance
 * 5. Re-creates the service when settings change
 */

import * as React from 'react';
import { AIService } from './AIService';
import { GDevelopProvider } from './providers/GDevelopProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import AuthenticatedUserContext from '../Profile/AuthenticatedUserContext';
import PreferencesContext from '../MainFrame/Preferences/PreferencesContext';
import SecureStorage from './SecureStorage';

/**
 * Hook that returns a configured AIService based on user preferences.
 *
 * Note: This hook loads API keys asynchronously, so it may initially return
 * a GDevelop provider and then switch to the custom provider once the key is loaded.
 *
 * @returns AIService instance configured with the appropriate provider
 */
/**
 * Try to get API key synchronously from environment variables.
 * This avoids the async delay for environment-based keys.
 */
const getApiKeySync = (provider: string): ?string => {
  try {
    // Check Node.js environment variables (Electron with nodeIntegration)
    if (typeof process !== 'undefined' && process.env) {
      const envVarName = provider === 'openai' ? 'GDEVELOP_OPENAI_API_KEY' :
                         provider === 'anthropic' ? 'GDEVELOP_ANTHROPIC_API_KEY' :
                         provider === 'openrouter' ? 'GDEVELOP_OPENROUTER_API_KEY' : null;
      if (envVarName) {
        const value = process.env[envVarName];
        if (value && value.trim()) {
          return value.trim();
        }
      }
    }
  } catch (error) {
    // Ignore - will fall back to async loading
  }
  return null;
};

export const useAIService = (): AIService => {
  const { getAuthorizationHeader } = React.useContext(AuthenticatedUserContext);
  const { getCustomAISettings } = React.useContext(PreferencesContext);

  const customAISettings = getCustomAISettings();

  // Try to load API key synchronously from environment first
  const initialApiKey = customAISettings.enabled && customAISettings.provider !== 'gdevelop'
    ? getApiKeySync(customAISettings.provider)
    : null;

  const [apiKey, setApiKey] = React.useState<?string>(initialApiKey);
  const [isLoadingKey, setIsLoadingKey] = React.useState<boolean>(false);

  // Load API key when provider changes
  React.useEffect(() => {
    if (!customAISettings.enabled || customAISettings.provider === 'gdevelop') {
      setApiKey(null);
      return;
    }

    const loadApiKey = async () => {
      setIsLoadingKey(true);
      try {
        const key = await SecureStorage.getApiKey(customAISettings.provider);
        setApiKey(key);
      } catch (error) {
        console.error('Failed to load API key:', error);
        setApiKey(null);
      } finally {
        setIsLoadingKey(false);
      }
    };

    loadApiKey();
  }, [customAISettings.enabled, customAISettings.provider]);

  // Create AIService with the appropriate provider
  const aiService = React.useMemo(() => {
    // If custom AI is not enabled, use GDevelop provider
    if (!customAISettings.enabled || customAISettings.provider === 'gdevelop') {
      return new AIService(new GDevelopProvider(getAuthorizationHeader));
    }

    // If we're still loading the API key
    if (isLoadingKey) {
      if (customAISettings.fallbackToGDevelop) {
        return new AIService(new GDevelopProvider(getAuthorizationHeader));
      }
      // Return a provider that will error clearly instead of silently using backend
      return new AIService(
        new GDevelopProvider(() => Promise.reject(new Error('Custom AI is enabled but API key is not loaded yet. Please wait or configure your API key.')))
      );
    }

    // OpenAI provider
    if (customAISettings.provider === 'openai') {
      if (!apiKey) {
        // No API key configured - show error to user
        console.error(
          'OpenAI API key not configured. Please add your API key in Settings > Custom AI, ' +
          'or switch to GDevelop backend provider.'
        );
        if (customAISettings.fallbackToGDevelop) {
          return new AIService(new GDevelopProvider(getAuthorizationHeader));
        }
        // Do not fall back silently; surface an erroring provider
        return new AIService(
          new GDevelopProvider(() => Promise.reject(new Error('Custom AI is enabled but no OpenAI API key is configured.')))
        );
      }

      try {
        return new AIService(new OpenAIProvider(apiKey, customAISettings.model));
      } catch (error) {
        console.error('Failed to initialize OpenAI provider:', error);
        // Fall back to GDevelop provider
        return new AIService(new GDevelopProvider(getAuthorizationHeader));
      }
    }

    // Anthropic provider
    if (customAISettings.provider === 'anthropic') {
      if (!apiKey) {
        if (!isLoadingKey) {
          console.error(
            'Anthropic API key not configured. Please add your API key in Settings > Custom AI, ' +
            'or switch to GDevelop backend provider.'
          );
        }
        if (customAISettings.fallbackToGDevelop) {
          return new AIService(new GDevelopProvider(getAuthorizationHeader));
        }
        return new AIService(new GDevelopProvider(() => Promise.reject(new Error('Custom AI is enabled but API key is not loaded yet. Please wait or check your API key configuration.'))));
      }

      try {
        return new AIService(new AnthropicProvider(apiKey, customAISettings.model));
      } catch (error) {
        console.error('Failed to initialize Anthropic provider:', error);
        // Don't fall back to GDevelop provider - throw the error instead
        throw error;
      }
    }

    // OpenRouter provider
    if (customAISettings.provider === 'openrouter') {
      if (!apiKey) {
        if (!isLoadingKey) {
          console.error(
            'OpenRouter API key not configured. Please add your API key in Settings > Custom AI, ' +
            'or switch to GDevelop backend provider.'
          );
        }
        if (customAISettings.fallbackToGDevelop) {
          return new AIService(new GDevelopProvider(getAuthorizationHeader));
        }
        return new AIService(new GDevelopProvider(() => Promise.reject(new Error('Custom AI is enabled but API key is not loaded yet. Please wait or check your API key configuration.'))));
      }

      try {
        return new AIService(new OpenRouterProvider(apiKey, customAISettings.model));
      } catch (error) {
        console.error('Failed to initialize OpenRouter provider:', error);
        // Don't fall back to GDevelop provider - throw the error instead
        throw error;
      }
    }

    // Unknown provider - fall back to GDevelop
    console.warn(
      `Unknown AI provider "${customAISettings.provider}". Using GDevelop provider.`
    );
    return new AIService(new GDevelopProvider(getAuthorizationHeader));
  }, [
    customAISettings.enabled,
    customAISettings.provider,
    customAISettings.model,
    apiKey,
    isLoadingKey,
    getAuthorizationHeader,
  ]);

  return aiService;
};

