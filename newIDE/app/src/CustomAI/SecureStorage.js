// @flow

/**
 * Secure storage for API keys using Electron's safeStorage with fallback to keytar.
 * Ensures API keys are encrypted at rest and never stored in plaintext.
 *
 * Security features:
 * - Uses Electron's safeStorage API (OS-level encryption) when available
 * - Falls back to keytar (system keychain) if safeStorage unavailable
 * - Never stores keys in localStorage or Redux
 * - Provides key masking for UI display
 * - Keys are never logged or sent to GDevelop servers
 */

const optionalRequire = require('../Utils/OptionalRequire');
const electron = optionalRequire('electron');

const STORAGE_KEY_PREFIX = 'gdevelop-custom-ai-key-';

/**
 * Get the environment variable name for a provider.
 * Environment variables are the PREFERRED method for API key configuration.
 *
 * Supported environment variables:
 * - GDEVELOP_OPENAI_API_KEY - OpenAI API key
 * - GDEVELOP_ANTHROPIC_API_KEY - Anthropic API key
 * - GDEVELOP_OPENROUTER_API_KEY - OpenRouter API key
 *
 * @param provider - Provider ID ('openai', 'anthropic', 'openrouter')
 * @returns Environment variable name or null if not supported
 */
const getEnvVarNameForProvider = (provider: string): ?string => {
  if (provider === 'openai') return 'GDEVELOP_OPENAI_API_KEY';
  if (provider === 'anthropic') return 'GDEVELOP_ANTHROPIC_API_KEY';
  if (provider === 'openrouter') return 'GDEVELOP_OPENROUTER_API_KEY';
  return null;
};

// CRA/web builds only expose env vars prefixed with REACT_APP_. In addition, CRA
// replaces references like process.env.REACT_APP_* at build time. Dynamic
// lookups (process.env[variable]) will NOT work in the browser bundle.
// So we expose a small helper to retrieve these values using static property
// accesses, which CRA can inline at build time.
const getBrowserEnvValueForProvider = (provider: string): ?string => {
  // Note: the direct references below are intentional so CRA inlines values.
  // eslint-disable-next-line no-undef
  const openAI = typeof process !== 'undefined' ? (process.env && process.env.REACT_APP_GDEVELOP_OPENAI_API_KEY) : undefined;
  // eslint-disable-next-line no-undef
  const anthropic = typeof process !== 'undefined' ? (process.env && process.env.REACT_APP_GDEVELOP_ANTHROPIC_API_KEY) : undefined;
  // eslint-disable-next-line no-undef
  const openRouter = typeof process !== 'undefined' ? (process.env && process.env.REACT_APP_GDEVELOP_OPENROUTER_API_KEY) : undefined;

  // Debug logging (only logs presence, not the actual key value)
  if (provider === 'openai' && openAI) {
    console.log('[SecureStorage] OpenAI API key found in REACT_APP_GDEVELOP_OPENAI_API_KEY');
  }
  if (provider === 'anthropic' && anthropic) {
    console.log('[SecureStorage] Anthropic API key found in REACT_APP_GDEVELOP_ANTHROPIC_API_KEY');
  }
  if (provider === 'openrouter' && openRouter) {
    console.log('[SecureStorage] OpenRouter API key found in REACT_APP_GDEVELOP_OPENROUTER_API_KEY');
  }

  if (provider === 'openai') return openAI || null;
  if (provider === 'anthropic') return anthropic || null;
  if (provider === 'openrouter') return openRouter || null;
  return null;
};

class SecureStorageClass {
  _safeStorage: any;
  _keytar: any;
  _isElectron: boolean;

  constructor() {
    this._isElectron = !!electron;

    if (this._isElectron && electron.remote) {
      // Try to get safeStorage from remote (main process)
      try {
        this._safeStorage = electron.remote.safeStorage;
      } catch (error) {
        console.warn('safeStorage not available, will try keytar fallback', error);
      }
    }

    // Try to load keytar as fallback
    if (!this._safeStorage) {
      try {
        this._keytar = optionalRequire('keytar');
      } catch (error) {
        console.warn('keytar not available, secure storage will be limited', error);
      }
    }
  }

  /**
   * Store an API key securely.
   *
   * @param provider - Provider ID ('openai', 'anthropic')
   * @param key - API key to store
   */
  async setApiKey(provider: string, key: string): Promise<void> {
    if (!key) {
      throw new Error('API key cannot be empty');
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${provider}`;

    // Try safeStorage first (Electron's OS-level encryption)
    if (this._safeStorage && this._safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = this._safeStorage.encryptString(key);
        const encryptedBase64 = encrypted.toString('base64');
        localStorage.setItem(storageKey, encryptedBase64);
        return;
      } catch (error) {
        console.error('Failed to encrypt with safeStorage, trying keytar', error);
      }
    }

    // Fallback to keytar (system keychain)
    if (this._keytar) {
      try {
        await this._keytar.setPassword('GDevelop Custom AI', provider, key);
        // Mark that we used keytar for this key
        localStorage.setItem(`${storageKey}-method`, 'keytar');
        return;
      } catch (error) {
        console.error('Failed to store with keytar', error);
        throw new Error('Failed to securely store API key. Please ensure your system keychain is accessible.');
      }
    }

    // No secure storage available
    throw new Error('Secure storage not available. API keys cannot be stored safely.');
  }

  /**
   * Retrieve an API key.
   *
   * Precedence order (PREFERRED method listed first):
   * 1. Environment variable (e.g., GDEVELOP_OPENAI_API_KEY) - PREFERRED
   * 2. Secure storage (safeStorage or keytar)
   *
   * Environment variables are the recommended method for:
   * - Development and testing workflows
   * - CI/CD environments
   * - Users who prefer environment-based configuration
   * - Avoiding the need to enter keys through the UI
   *
   * @param provider - Provider ID ('openai', 'anthropic')
   * @returns API key or null if not found
   */
  async getApiKey(provider: string): Promise<?string> {
    // 1. Check environment variable first (PREFERRED method)
    try {
      const envVarName = getEnvVarNameForProvider(provider);
      const browserValue = getBrowserEnvValueForProvider(provider);

      // 1.a Electron/Node (plain env vars available at runtime)
      if (typeof process !== 'undefined' && process.env && envVarName) {
        const nodeEnvValue = process.env[envVarName];
        if (nodeEnvValue !== undefined && nodeEnvValue !== null && nodeEnvValue !== '') {
          const trimmed = String(nodeEnvValue).trim();
          if (trimmed) {
            console.log(`[SecureStorage] API key loaded from ${envVarName}`);
            return trimmed;
          }
        }
      }

      // 1.b CRA/Web (env is inlined at build: use static access value)
      if (browserValue !== undefined && browserValue !== null && browserValue !== '') {
        const trimmed = String(browserValue).trim();
        if (trimmed) {
          console.log(`[SecureStorage] API key loaded from REACT_APP_${envVarName}`);
          return trimmed;
        }
      }
    } catch (error) {
      // process.env not available (web build) or other error - silently continue to storage
      console.warn('[SecureStorage] Error checking environment variables:', error);
    }

    // 2. Fall back to secure storage
    const storageKey = `${STORAGE_KEY_PREFIX}${provider}`;
    const storageMethod = localStorage.getItem(`${storageKey}-method`);

    // If stored with keytar
    if (storageMethod === 'keytar' && this._keytar) {
      try {
        const key = await this._keytar.getPassword('GDevelop Custom AI', provider);
        return key || null;
      } catch (error) {
        console.error('Failed to retrieve from keytar', error);
        return null;
      }
    }

    // Try safeStorage (default method)
    if (this._safeStorage && this._safeStorage.isEncryptionAvailable()) {
      try {
        const encryptedBase64 = localStorage.getItem(storageKey);
        if (!encryptedBase64) return null;

        const encrypted = Buffer.from(encryptedBase64, 'base64');
        const decrypted = this._safeStorage.decryptString(encrypted);
        return decrypted;
      } catch (error) {
        console.error('Failed to decrypt with safeStorage', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Delete an API key.
   *
   * @param provider - Provider ID
   */
  async deleteApiKey(provider: string): Promise<void> {
    const storageKey = `${STORAGE_KEY_PREFIX}${provider}`;
    const storageMethod = localStorage.getItem(`${storageKey}-method`);

    // Delete from keytar if that's where it was stored
    if (storageMethod === 'keytar' && this._keytar) {
      try {
        await this._keytar.deletePassword('GDevelop Custom AI', provider);
      } catch (error) {
        console.error('Failed to delete from keytar', error);
      }
      localStorage.removeItem(`${storageKey}-method`);
    }

    // Always clean up localStorage
    localStorage.removeItem(storageKey);
  }

  /**
   * Mask an API key for display in UI.
   * Shows only first 3 and last 6 characters.
   *
   * @param key - API key to mask
   * @returns Masked key (e.g., 'sk-...xyz123')
   */
  maskApiKey(key: string): string {
    if (!key || key.length < 10) return '***';
    return `${key.substring(0, 3)}...${key.substring(key.length - 6)}`;
  }

  /**
   * Check if secure storage is available.
   *
   * @returns true if secure storage is available
   */
  isAvailable(): boolean {
    return !!(
      (this._safeStorage && this._safeStorage.isEncryptionAvailable()) ||
      this._keytar
    );
  }

  /**
   * Get the storage method being used.
   *
   * @returns 'safeStorage', 'keytar', or 'none'
   */
  getStorageMethod(): 'safeStorage' | 'keytar' | 'none' {
    if (this._safeStorage && this._safeStorage.isEncryptionAvailable()) {
      return 'safeStorage';
    }
    if (this._keytar) {
      return 'keytar';
    }
    return 'none';
  }

  /**
   * Get the source of the API key for a provider.
   * Useful for UI to show where the key is coming from.
   *
   * @param provider - Provider ID ('openai', 'anthropic')
   * @returns 'env' (PREFERRED), 'keytar', 'safeStorage', or 'none'
   */
  getApiKeySource(provider: string): 'env' | 'keytar' | 'safeStorage' | 'none' {
    // Check environment variable first (PREFERRED)
    try {
      const envVarName = getEnvVarNameForProvider(provider);
      const browserValue = getBrowserEnvValueForProvider(provider);
      if (typeof process !== 'undefined' && process.env && envVarName) {
        const nodeEnvValue = process.env[envVarName];
        if (nodeEnvValue !== undefined && nodeEnvValue !== null && nodeEnvValue !== '') {
          const trimmed = String(nodeEnvValue).trim();
          if (trimmed) return 'env';
        }
      }
      if (browserValue !== undefined && browserValue !== null && browserValue !== '') {
        const trimmed = String(browserValue).trim();
        if (trimmed) return 'env';
      }
    } catch (error) {
      // process.env not available - continue to check storage
    }

    // Check secure storage
    const storageKey = `${STORAGE_KEY_PREFIX}${provider}`;
    const storageMethod = localStorage.getItem(`${storageKey}-method`);

    if (storageMethod === 'keytar') {
      return 'keytar';
    }

    if (this._safeStorage && this._safeStorage.isEncryptionAvailable()) {
      const encryptedBase64 = localStorage.getItem(storageKey);
      if (encryptedBase64) {
        return 'safeStorage';
      }
    }

    return 'none';
  }
}

const SecureStorage = new SecureStorageClass();
export default SecureStorage;

