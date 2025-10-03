// @flow

/**
 * OpenAI AI Provider - implements AIProviderInterface for OpenAI's API.
 * 
 * This provider handles:
 * - Chat completions using OpenAI's Chat API
 * - Streaming responses
 * - Function calling for agent mode
 * - Error normalization
 * - Request cancellation via AbortSignal
 *
 * Note: Requires the 'openai' npm package to be installed.
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
 * OpenAI provider implementation.
 */
export class OpenAIProvider implements AIProviderInterface {
  _apiKey: string;
  _model: string;

  constructor(apiKey: string, model?: string) {
    this._apiKey = apiKey;
    this._model = model || 'gpt-4';

    // Note: We use fetch API directly instead of the 'openai' package
    // because the SDK doesn't bundle well with webpack in production builds.
    // This is simpler and more reliable for Electron/browser environments.
  }

  getProviderInfo(): ProviderInfo {
    return {
      id: 'openai',
      name: 'OpenAI',
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
      const modelMetadata = getModelMetadata('openai', this._model);
      if (modelMetadata) {
        const { estimateMessageTokens } = require('../TokenCounter');
        const tokenCount = estimateMessageTokens(messages, this._model);
        const limitCheck = checkContextLimit(tokenCount, 'openai', this._model);
        
        if (!limitCheck.withinLimit) {
          throw new Error(limitCheck.recommendedAction || 'Context limit exceeded');
        }
      }

      // Prepare function definitions for agent mode
      const functions = params.mode === 'agent' ? getFunctionDefinitions('agent') : undefined;

      // Make OpenAI API call using fetch
      const requestBody = {
        model: this._model,
        messages: messages,
      };

      if (functions) {
        requestBody.functions = functions;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Handle non-streaming response
      return this._convertToAiRequest(data, params);
    } catch (error) {
      // Normalize error before throwing
      const normalized = normalizeOpenAIError(error);
      throw normalized;
    }
  }

  async addMessage(
    params: AddMessageParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    try {
      const existingRequest = params.aiRequest;
      if (!existingRequest) throw new Error('AI request not found');

      // Start from full history formatted for OpenAI
      const messages = formatMessagesForOpenAI(existingRequest);

      // Build map from call_id -> function name to properly attach results
      const callIdToName: { [string]: string } = {};
      (existingRequest.output || []).forEach(msg => {
        if (msg.type === 'message' && msg.role === 'assistant') {
          (msg.content || []).forEach(content => {
            if (content.type === 'function_call' && content.call_id && content.name) {
              callIdToName[content.call_id] = content.name;
            }
          });
        }
      });

      // Append function call outputs (as function role messages) if any
      if (params.functionCallOutputs && params.functionCallOutputs.length > 0) {
        for (const output of params.functionCallOutputs) {
          const fnName = callIdToName[output.call_id] || 'tool_result';
          messages.push({ role: 'function', name: fnName, content: output.output });
        }
      }

      // Append the new user message if provided
      if (params.userMessage) {
        messages.push({ role: 'user', content: params.userMessage });
      }

      // Prepare function definitions only in agent mode
      const functions = (existingRequest.mode === 'agent') ? getFunctionDefinitions('agent') : undefined;

      const requestBody: any = { model: this._model, messages };
      if (functions) requestBody.functions = functions;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this._apiKey}` },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      const message = choice?.message;

      // Build updated AiRequest by appending new entries to existing history
      const updatedOutput = [...(existingRequest.output || [])];

      if (params.userMessage) {
        updatedOutput.push({
          type: 'message',
          role: 'user',
          status: 'completed',
          content: [{ type: 'user_request', status: 'completed', text: params.userMessage }],
        });
      }

      if (params.functionCallOutputs && params.functionCallOutputs.length > 0) {
        params.functionCallOutputs.forEach(output => {
          updatedOutput.push({ type: 'function_call_output', call_id: output.call_id, output: output.output });
        });
      }

      const assistantContent = [];
      if (message?.content) {
        assistantContent.push({ type: 'output_text', status: 'completed', text: message.content, annotations: [] });
      }
      if (message?.function_call) {
        assistantContent.push({
          type: 'function_call',
          status: 'completed',
          name: message.function_call.name,
          arguments: message.function_call.arguments,
          call_id: `call_${Date.now()}`,
        });
      }
      updatedOutput.push({ type: 'message', role: 'assistant', status: 'completed', content: assistantContent });

      const updatedRequest: AiRequest = {
        ...existingRequest,
        updatedAt: new Date().toISOString(),
        status: 'ready',
        output: updatedOutput,
      };

      return updatedRequest;
    } catch (error) {
      const normalized = normalizeOpenAIError(error);
      throw normalized;
    }
  }

  async generateEvents(
    params: GenerateEventsParams,
    options?: AiRequestOptions
  ): Promise<any> {
    // For event generation, we use the GDevelop backend
    // This is because event generation requires access to the GDevelop event system
    // and validation logic that's only available on the backend
    throw new Error(
      'Event generation is not yet supported with custom AI providers. ' +
      'Please use the GDevelop backend for event generation.'
    );
  }

  /**
   * Handle streaming response from OpenAI.
   * Processes chunks as they arrive and calls the onStreamChunk callback.
   */
  async _handleStreamingResponse(
    stream: any,
    params: CreateAiRequestParams | AddMessageParams,
    options: AiRequestOptions
  ): Promise<AiRequest> {
    let fullContent = '';
    let functionCall = null;

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (!delta) continue;

        // Handle content chunks
        if (delta.content) {
          fullContent += delta.content;
          if (options.onStreamChunk) {
            options.onStreamChunk(delta.content);
          }
        }

        // Handle function call chunks
        if (delta.function_call) {
          if (!functionCall) {
            functionCall = {
              name: delta.function_call.name || '',
              arguments: delta.function_call.arguments || '',
            };
          } else {
            if (delta.function_call.name) {
              functionCall.name += delta.function_call.name;
            }
            if (delta.function_call.arguments) {
              functionCall.arguments += delta.function_call.arguments;
            }
          }
        }
      }

      if (options.onStreamComplete) {
        options.onStreamComplete();
      }

      // Create AI request from streamed response
      return this._createAiRequestFromContent(fullContent, functionCall, params);
    } catch (error) {
      if (options.onStreamError) {
        options.onStreamError(error);
      }
      throw error;
    }
  }

  /**
   * Convert OpenAI completion to GDevelop AiRequest format.
   */
  _convertToAiRequest(completion: any, params: CreateAiRequestParams | AddMessageParams): AiRequest {
    const choice = completion.choices[0];
    const message = choice.message;

    return this._createAiRequestFromContent(
      message.content,
      message.function_call,
      params
    );
  }

  /**
   * Create AiRequest from content and function call.
   */
  _createAiRequestFromContent(
    content: string | null,
    functionCall: any,
    params: CreateAiRequestParams | AddMessageParams
  ): AiRequest {
    const output = [];

    // Add user message
    if ('userRequest' in params) {
      output.push({
        type: 'message',
        role: 'user',
        status: 'completed',
        content: [
          {
            type: 'user_request',
            status: 'completed',
            text: params.userRequest,
          },
        ],
      });
    } else if ('userMessage' in params) {
      output.push({
        type: 'message',
        role: 'user',
        status: 'completed',
        content: [
          {
            type: 'user_request',
            status: 'completed',
            text: params.userMessage,
          },
        ],
      });
    }

    // Add assistant response
    const assistantContent = [];

    if (content) {
      assistantContent.push({
        type: 'output_text',
        status: 'completed',
        text: content,
        annotations: [],
      });
    }

    if (functionCall) {
      assistantContent.push({
        type: 'function_call',
        status: 'completed',
        name: functionCall.name,
        arguments: functionCall.arguments,
        call_id: `call_${Date.now()}`,
      });
    }

    output.push({
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: assistantContent,
    });

    return {
      id: `openai_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: params.userId,
      gameId: 'gameId' in params ? params.gameId : null,
      gameProjectJson: 'gameProjectJson' in params ? params.gameProjectJson : null,
      status: 'ready',
      mode: 'mode' in params ? params.mode : 'chat',
      error: null,
      output: output,
    };
  }
}

