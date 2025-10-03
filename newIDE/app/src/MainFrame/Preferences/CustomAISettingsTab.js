// @flow

/**
 * Custom AI Settings tab for the Preferences dialog.
 * Allows users to configure custom AI providers (OpenAI, Anthropic, OpenRouter) with their own API keys.
 */

import * as React from 'react';
import { Trans, t } from '@lingui/macro';
import { type I18n as I18nType } from '@lingui/core';
import { ColumnStackLayout, LineStackLayout } from '../../UI/Layout';
import { Column } from '../../UI/Grid';
import Text from '../../UI/Text';
import { CompactToggleField } from '../../UI/CompactToggleField';
import CompactSelectField from '../../UI/CompactSelectField';
import SelectOption from '../../UI/SelectOption';
import TextField from '../../UI/TextField';
import AlertMessage from '../../UI/AlertMessage';
import { getProviderModels, getModelMetadata, getDefaultModelForProvider } from '../../CustomAI/providers/ProviderRegistry';
import SecureStorage from '../../CustomAI/SecureStorage';
import PreferencesContext from './PreferencesContext';
import RaisedButton from '../../UI/RaisedButton';
import FlatButton from '../../UI/FlatButton';
import { Line } from '../../UI/Grid';

type Props = {|
  i18n: I18nType,
|};

/**
 * Custom AI Settings tab component.
 * Displays settings for enabling custom AI providers and configuring API keys.
 */
export const CustomAISettingsTab = ({ i18n }: Props) => {
  const { getCustomAISettings, setCustomAISettings } = React.useContext(
    PreferencesContext
  );

  const settings = getCustomAISettings();
  const [apiKey, setApiKey] = React.useState<string>('');
  const [apiKeyLoaded, setApiKeyLoaded] = React.useState<boolean>(false);
  const [apiKeySource, setApiKeySource] = React.useState<'env' | 'keytar' | 'safeStorage' | 'none'>('none');
  const [showApiKey, setShowApiKey] = React.useState<boolean>(false);
  const [isSavingApiKey, setIsSavingApiKey] = React.useState<boolean>(false);

  // Load API key when provider changes
  React.useEffect(
    () => {
      if (settings.provider === 'gdevelop') {
        setApiKey('');
        setApiKeySource('none');
        setApiKeyLoaded(true);
        return;
      }

      (async () => {
        try {
          const key = await SecureStorage.getApiKey(settings.provider);
          const source = SecureStorage.getApiKeySource(settings.provider);
          setApiKey(key || '');
          setApiKeySource(source);
          setApiKeyLoaded(true);
        } catch (error) {
          console.error('Failed to load API key:', error);
          setApiKey('');
          setApiKeySource('none');
          setApiKeyLoaded(true);
        }
      })();
    },
    [settings.provider]
  );

  const handleSaveApiKey = async () => {
    if (settings.provider === 'gdevelop') return;

    setIsSavingApiKey(true);
    try {
      if (apiKey.trim()) {
        await SecureStorage.setApiKey(settings.provider, apiKey.trim());
      } else {
        await SecureStorage.deleteApiKey(settings.provider);
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      // TODO: Show error message to user
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (settings.provider === 'gdevelop') return;

    setIsSavingApiKey(true);
    try {
      await SecureStorage.deleteApiKey(settings.provider);
      setApiKey('');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      // TODO: Show error message to user
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const availableModels = getProviderModels(settings.provider);
  const selectedModelMetadata = settings.model
    ? getModelMetadata(settings.provider, settings.model)
    : null;

  const requiresApiKey = settings.provider !== 'gdevelop';
  const hasApiKey = apiKey.trim().length > 0;
  const isApiKeyFromEnv = apiKeySource === 'env';
  const apiKeySourceLabel = isApiKeyFromEnv
    ? i18n._(t`from environment variable`)
    : apiKeySource === 'keytar'
    ? i18n._(t`from system keychain`)
    : apiKeySource === 'safeStorage'
    ? i18n._(t`from secure storage`)
    : '';

  return (
    <ColumnStackLayout noMargin>
      <AlertMessage kind="info">
        <Trans>
          Custom AI allows you to use your own OpenAI, Anthropic, or OpenRouter API keys instead of GDevelop's AI service.
          This gives you more control and can be more cost-effective for heavy usage.
        </Trans>
      </AlertMessage>

      <Text size="block-title">
        <Trans>Enable Custom AI</Trans>
      </Text>

      <CompactToggleField
        labelColor="primary"
        hideTooltip
        onCheck={enabled => {
          setCustomAISettings({
            ...settings,
            enabled,
          });
        }}
        checked={settings.enabled}
        label={i18n._(t`Use custom AI provider`)}
      />

      {settings.enabled && (
        <>
          <Text size="block-title">
            <Trans>Provider</Trans>
          </Text>

          <LineStackLayout noMargin alignItems="center">
            <Column noMargin expand>
              <Text noMargin>
                <Trans>AI Provider</Trans>
              </Text>
            </Column>
            <Column noMargin expand>
              <CompactSelectField
                value={settings.provider}
                onChange={(value: string) => {
                  const newProvider = (value: any);
                  const defaultModel = getDefaultModelForProvider(newProvider) || '';
                  setCustomAISettings({
                    ...settings,
                    provider: newProvider,
                    model: defaultModel, // Set default model for the new provider
                  });
                }}
              >
                <SelectOption value="gdevelop" label="GDevelop" />
                <SelectOption value="openai" label="OpenAI" />
                <SelectOption value="anthropic" label="Anthropic" />
                <SelectOption value="openrouter" label="OpenRouter" />
              </CompactSelectField>
            </Column>
          </LineStackLayout>

          {requiresApiKey && (
            <>
              <Text size="block-title">
                <Trans>API Key</Trans>
              </Text>

              {isApiKeyFromEnv ? (
                <>
                  <AlertMessage kind="success">
                    <Trans>
                      API key loaded from environment variable ({apiKeySourceLabel}).
                      The key is ready to use and you don't need to enter it manually.
                    </Trans>
                  </AlertMessage>

                  {hasApiKey && (
                    <TextField
                      type="text"
                      value={SecureStorage.maskApiKey(apiKey)}
                      floatingLabelText={i18n._(t`Current API Key (masked)`)}
                      fullWidth
                      disabled
                      helperMarkdownText={i18n._(
                        t`This API key is loaded from the environment variable and cannot be edited here. To change it, update your environment configuration.`
                      )}
                    />
                  )}
                </>
              ) : (
                <>
                  <AlertMessage kind="info">
                    <Trans>
                      Your API key is stored securely using your operating system's keychain.
                      It is never sent to GDevelop servers.
                    </Trans>
                  </AlertMessage>

                  <TextField
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e, value) => setApiKey(value)}
                    floatingLabelText={
                      settings.provider === 'openai'
                        ? i18n._(t`OpenAI API Key (sk-...)`)
                        : settings.provider === 'anthropic'
                        ? i18n._(t`Anthropic API Key (sk-ant-...)`)
                        : i18n._(t`OpenRouter API Key (sk-or-...)`)
                    }
                    helperMarkdownText={
                      hasApiKey && apiKeySourceLabel
                        ? i18n._(t`Current key ${apiKeySourceLabel}`)
                        : undefined
                    }
                    fullWidth
                    disabled={!apiKeyLoaded || isSavingApiKey}
                  />

                  <Line>
                    <FlatButton
                      label={showApiKey ? <Trans>Hide</Trans> : <Trans>Show</Trans>}
                      onClick={() => setShowApiKey(!showApiKey)}
                      disabled={!apiKeyLoaded}
                    />
                    <RaisedButton
                      label={<Trans>Save API Key</Trans>}
                      onClick={handleSaveApiKey}
                      disabled={!apiKeyLoaded || isSavingApiKey || !apiKey.trim()}
                      primary
                    />
                    <FlatButton
                      label={<Trans>Delete API Key</Trans>}
                      onClick={handleDeleteApiKey}
                      disabled={!apiKeyLoaded || isSavingApiKey || !hasApiKey}
                    />
                  </Line>

                  {!hasApiKey && (
                    <AlertMessage kind="error">
                      <Trans>
                        You must provide an API key to use this provider.
                      </Trans>
                    </AlertMessage>
                  )}
                </>
              )}
            </>
          )}

          <Text size="block-title">
            <Trans>Model</Trans>
          </Text>

          <LineStackLayout noMargin alignItems="center">
            <Column noMargin expand>
              <Text noMargin>
                <Trans>AI Model</Trans>
              </Text>
            </Column>
            <Column noMargin expand>
              <CompactSelectField
                value={settings.model}
                onChange={(value: string) => {
                  setCustomAISettings({
                    ...settings,
                    model: value,
                  });
                }}
                disabled={availableModels.length === 0}
              >
                {availableModels.length === 0 ? (
                  <SelectOption value="" label="No models available" />
                ) : (
                  <>
                    <SelectOption value="" label="Select a model..." />
                    {availableModels.map(model => (
                      <SelectOption
                        key={model.id}
                        value={model.id}
                        label={model.name}
                      />
                    ))}
                  </>
                )}
              </CompactSelectField>
            </Column>
          </LineStackLayout>

          {selectedModelMetadata && (
            <AlertMessage kind="info">
              <Trans>
                {selectedModelMetadata.name} - Context: {selectedModelMetadata.contextWindow.toLocaleString()} tokens
                {' '}| Input: ${selectedModelMetadata.inputPricePerMillion}/M tokens
                | Output: ${selectedModelMetadata.outputPricePerMillion}/M tokens
              </Trans>
            </AlertMessage>
          )}

          <Text size="block-title">
            <Trans>Advanced</Trans>
          </Text>

          <CompactToggleField
            labelColor="primary"
            hideTooltip
            onCheck={fallback => {
              setCustomAISettings({
                ...settings,
                fallbackToGDevelop: fallback,
              });
            }}
            checked={settings.fallbackToGDevelop}
            label={i18n._(t`Fallback to GDevelop AI if custom provider fails`)}
          />

          {settings.fallbackToGDevelop && (
            <AlertMessage kind="warning">
              <Trans>
                When enabled, GDevelop will use its own AI service if your custom provider fails.
                This may incur GDevelop AI credits.
              </Trans>
            </AlertMessage>
          )}
        </>
      )}
    </ColumnStackLayout>
  );
};

