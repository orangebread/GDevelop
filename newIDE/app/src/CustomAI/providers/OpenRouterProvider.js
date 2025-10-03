// @flow

/**
 * OpenRouter AI Provider - implements AIProviderInterface for OpenRouter's API.
 * 
 * OpenRouter provides access to multiple AI models through a unified API.
 * It uses an OpenAI-compatible API format, making integration straightforward.
 * 
 * This provider handles:
 * - Chat completions using OpenRouter's API (OpenAI-compatible)
 * - Streaming responses
 * - Function calling for agent mode
 * - Error normalization
 * - Request cancellation via AbortSignal
 *
 * Key differences from OpenAI:
 * - Uses https://openrouter.ai/api/v1 as the base URL
 * - Requires HTTP-Referer and X-Title headers for attribution
 * - Supports a wider range of models from different providers
 */

import type {
  AIProviderInterface,
  CreateAiRequestParams,
  AddMessageParams,
  GenerateEventsParams,
  AiRequestOptions,
  ProviderInfo,
} from './AIProviderInterface';
import type { AiRequest } from '../../Utils/GDevelopServices/Generation';
import { normalizeOpenAIError } from '../ErrorNormalizer';
import { buildPromptContext, formatMessagesForOpenAI } from '../PromptBuilder';
import { getFunctionDefinitions, parseFunctionCallFromOpenAI } from '../FunctionCallAdapter';
import { checkContextLimit } from '../TokenCounter';
import { getModelMetadata } from './ProviderRegistry';

/**
 * OpenRouter provider implementation.
 * Uses OpenAI-compatible API format.
 */
export class OpenRouterProvider implements AIProviderInterface {
  _apiKey: string;
  _model: string;

  constructor(apiKey: string, model?: string) {
    this._apiKey = apiKey;
    // Default to a popular model if none specified
    this._model = model || 'anthropic/claude-3.5-sonnet';
  }

  getProviderInfo(): ProviderInfo {
    return {
      id: 'openrouter',
      name: 'OpenRouter',
      requiresApiKey: true,
    };
  }

  async createAiRequest(
    params: CreateAiRequestParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    try {
      // Build messages from request
      const messages = buildPromptContext({
        userRequest: params.userRequest,
        gameProjectJson: params.gameProjectJson,
        projectSpecificExtensionsSummaryJson: params.projectSpecificExtensionsSummaryJson,
        mode: params.mode,
      });

      // Check context limit
      const modelMetadata = getModelMetadata('openrouter', this._model);
      if (modelMetadata) {
        const { estimateMessageTokens } = require('../TokenCounter');
        const tokenCount = estimateMessageTokens(messages, this._model);
        const limitCheck = checkContextLimit(tokenCount, 'openrouter', this._model);
        
        if (!limitCheck.withinLimit) {
          throw new Error(limitCheck.recommendedAction || 'Context limit exceeded');
        }
      }

      // Prepare function definitions for agent mode
      const functions = params.mode === 'agent' ? getFunctionDefinitions('agent') : undefined;

      // Make OpenRouter API call using fetch
      const requestBody = {
        model: this._model,
        messages: messages,
      };

      // OpenRouter uses the new "tools" format instead of deprecated "functions"
      if (functions) {
        requestBody.tools = functions.map(fn => ({
          type: 'function',
          function: fn,
        }));
        requestBody.tool_choice = 'auto';
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._apiKey}`,
          'HTTP-Referer': 'https://gdevelop.io',
          'X-Title': 'GDevelop',
        },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw normalizeOpenAIError(new Error(`OpenRouter API error: ${response.status} ${errorText}`));
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      if (!choice) {
        throw new Error('No response from OpenRouter API');
      }

      const message = choice.message;
      const content = message.content || '';

      // OpenRouter uses "tool_calls" instead of "function_call"
      const toolCalls = message.tool_calls;
      const functionCalls = toolCalls?.map(toolCall => {
        if (toolCall.type === 'function') {
          return parseFunctionCallFromOpenAI({
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
            call_id: toolCall.id, // Preserve tool_call_id for response matching
          });
        }
        return null;
      }).filter(Boolean);

      // Create AI request object (GDevelop structured format)
      const aiRequest: AiRequest = {
        id: `openrouter_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: params.userId,
        gameId: params.gameId || null,
        gameProjectJson: params.gameProjectJson || null,
        status: 'ready',
        mode: params.mode,
        error: null,
        output: [
          {
            type: 'message',
            role: 'user',
            status: 'completed',
            content: [
              { type: 'user_request', status: 'completed', text: params.userRequest },
            ],
          },
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [
              ...(content ? [{ type: 'output_text', status: 'completed', text: content, annotations: [] }] : []),
              ...((functionCalls || []).map(fc => ({
                type: 'function_call',
                status: 'completed',
                name: fc.name,
                arguments: fc.args ? JSON.stringify(fc.args) : fc.arguments,
                call_id: fc.call_id,
              }))),
            ],
          },
        ],
      };

      return aiRequest;
    } catch (error) {
      throw normalizeOpenAIError(error);
    }
  }

  async addMessage(
    params: AddMessageParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    try {
      // Get existing AI request
      const existingRequest = params.aiRequest;
      if (!existingRequest) {
        throw new Error('AI request not found');
      }

      // Build messages array from existing conversation
      const messages = formatMessagesForOpenAI(existingRequest);

      // Add function call results if any
      // OpenRouter uses 'tool' role instead of 'function' role
      if (params.functionCallOutputs && params.functionCallOutputs.length > 0) {
        params.functionCallOutputs.forEach(output => {
          messages.push({
            role: 'tool',
            tool_call_id: output.call_id, // OpenRouter requires tool_call_id
            content: output.output,
          });
        });
      }

      // Add user message if provided
      if (params.userMessage) {
        messages.push({
          role: 'user',
          content: params.userMessage,
        });
      }

      // Add project context if provided
      if (params.gameProjectJson || params.projectSpecificExtensionsSummaryJson) {
        const contextMessages = buildPromptContext({
          userRequest: params.userMessage || '',
          gameProjectJson: params.gameProjectJson,
          projectSpecificExtensionsSummaryJson: params.projectSpecificExtensionsSummaryJson,
          mode: existingRequest.mode || 'chat',
        });
        
        // Merge context into messages (skip the user message as we already added it)
        contextMessages.forEach((msg, index) => {
          if (index < contextMessages.length - 1) {
            messages.push(msg);
          }
        });
      }

      // Check context limit
      const modelMetadata = getModelMetadata('openrouter', this._model);
      if (modelMetadata) {
        const { estimateMessageTokens } = require('../TokenCounter');
        const tokenCount = estimateMessageTokens(messages, this._model);
        const limitCheck = checkContextLimit(tokenCount, 'openrouter', this._model);
        
        if (!limitCheck.withinLimit) {
          throw new Error(limitCheck.recommendedAction || 'Context limit exceeded');
        }
      }

      // Prepare function definitions for agent mode
      const functions = existingRequest.mode === 'agent' ? getFunctionDefinitions('agent') : undefined;

      // Make OpenRouter API call
      const requestBody = {
        model: this._model,
        messages: messages,
      };

      // OpenRouter uses the new "tools" format instead of deprecated "functions"
      if (functions) {
        requestBody.tools = functions.map(fn => ({
          type: 'function',
          function: fn,
        }));
        requestBody.tool_choice = 'auto';
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._apiKey}`,
          'HTTP-Referer': 'https://gdevelop.io',
          'X-Title': 'GDevelop',
        },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw normalizeOpenAIError(new Error(`OpenRouter API error: ${response.status} ${errorText}`));
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      if (!choice) {
        throw new Error('No response from OpenRouter API');
      }

      const message = choice.message;
      const content = message.content || '';

      // OpenRouter uses "tool_calls" instead of "function_call"
      const toolCalls = message.tool_calls;
      const functionCalls = toolCalls?.map(toolCall => {
        if (toolCall.type === 'function') {
          return parseFunctionCallFromOpenAI({
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
            call_id: toolCall.id, // Preserve tool_call_id for response matching
          });
        }
        return null;
      }).filter(Boolean);

      // Update AI request with new messages
      const updatedOutput = [...existingRequest.output];

      // Add user message if provided (structured)
      if (params.userMessage) {
        updatedOutput.push({
          type: 'message',
          role: 'user',
          status: 'completed',
          content: [{ type: 'user_request', status: 'completed', text: params.userMessage }],
        });
      }

      // Add function call results if any
      if (params.functionCallOutputs && params.functionCallOutputs.length > 0) {
        params.functionCallOutputs.forEach(output => {
          updatedOutput.push({ type: 'function_call_output', call_id: output.call_id, output: output.output });
        });
      }

      // Add assistant response
      const assistantContent = [];
      if (content) {
        assistantContent.push({ type: 'output_text', status: 'completed', text: content, annotations: [] });
      }
      for (const fc of functionCalls || []) {
        assistantContent.push({
          type: 'function_call',
          status: 'completed',
          name: fc.name,
          arguments: JSON.stringify(fc.args || {}),
          call_id: fc.call_id,
        });
      }
      updatedOutput.push({ type: 'message', role: 'assistant', status: 'completed', content: assistantContent });

      const updatedRequest: AiRequest = {
        ...existingRequest,
        output: updatedOutput,
        updatedAt: new Date().toISOString(),
        status: 'ready',
      };

      return updatedRequest;
    } catch (error) {
      throw normalizeOpenAIError(error);
    }
  }

  async generateEvents(
    params: GenerateEventsParams,
    options?: AiRequestOptions
  ): Promise<any> {
    // Event generation uses the same chat completion API
    // The prompt will be constructed by the caller
    throw new Error('generateEvents should be handled through createAiRequest/addMessage');
  }
}

