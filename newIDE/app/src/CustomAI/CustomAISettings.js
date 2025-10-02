// @flow

/**
 * Custom AI settings management.
 * Stores and retrieves custom AI configuration from user preferences.
 *
 * Note: This module provides the type definition and default values.
 * Actual storage is handled by PreferencesContext/PreferencesProvider.
 * Use the PreferencesContext hooks to get/set settings in React components.
 */

export type CustomAISettings = {|
  enabled: boolean,
  provider: 'openai' | 'anthropic' | 'openrouter' | 'gdevelop',
  model: string,
  fallbackToGDevelop: boolean,
|};

/**
 * Get default custom AI settings.
 * Used for initialization and fallback.
 */
export const getDefaultCustomAISettings = (): CustomAISettings => ({
  enabled: false,
  provider: 'gdevelop',
  model: '',
  fallbackToGDevelop: false,
});

