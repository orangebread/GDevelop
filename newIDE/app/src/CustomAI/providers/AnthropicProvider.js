// @flow

/**
 * Anthropic AI Provider - implements AIProviderInterface for Anthropic's Claude API.
 * 
 * This provider handles:
 * - Chat completions using Anthropic's Messages API
 * - Streaming responses via Server-Sent Events (SSE)
 * - Tool calling (Anthropic's function calling format)
 * - Error normalization
 * - Request cancellation via AbortSignal
 *
 * Key differences from OpenAI:
 * - System prompt is a separate parameter (not in messages array)
 * - Uses "tools" instead of "functions"
 * - Different streaming format (SSE with specific event types)
 * - Tool results use tool_use_id instead of call_id
 *
 * Note: Requires the '@anthropic-ai/sdk' npm package to be installed.
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
import { normalizeAnthropicError } from '../ErrorNormalizer';
import { buildAnthropicRequest, formatMessagesForAnthropic } from '../PromptBuilder';
import { getAnthropicTools, parseToolCallFromAnthropic } from '../FunctionCallAdapter';
import { checkContextLimit } from '../TokenCounter';
import { getModelMetadata } from './ProviderRegistry';

/**
 * Anthropic provider implementation.
 */
export class AnthropicProvider implements AIProviderInterface {
  _apiKey: string;
  _model: string;

  constructor(apiKey: string, model?: string) {
    this._apiKey = apiKey;
    this._model = model || 'claude-sonnet-4-5-20250929';

    // Note: We use fetch API directly instead of @anthropic-ai/sdk
    // because the SDK doesn't bundle well with webpack in production builds.
    // This is simpler and more reliable for Electron/browser environments.
  }

  getProviderInfo(): ProviderInfo {
    return {
      id: 'anthropic',
      name: 'Anthropic',
      requiresApiKey: true,
    };
  }

  async createAiRequest(
    params: CreateAiRequestParams,
    options?: AiRequestOptions
  ): Promise<AiRequest> {
    try {
      // Build system prompt and messages for Anthropic
      const { system, messages } = buildAnthropicRequest({
        userRequest: params.userRequest,
        gameProjectJson: params.gameProjectJson,
        projectSpecificExtensionsSummaryJson: params.projectSpecificExtensionsSummaryJson,
        mode: params.mode,
      });

      // Check context limit
      const modelMetadata = getModelMetadata('anthropic', this._model);
      if (modelMetadata) {
        const { estimateMessageTokens } = require('../TokenCounter');
        const tokenCount = estimateMessageTokens(messages, this._model);
        const limitCheck = checkContextLimit(tokenCount, 'anthropic', this._model);
        
        if (!limitCheck.withinLimit) {
          throw new Error(limitCheck.recommendedAction || 'Context limit exceeded');
        }
      }

      // Prepare tools for agent mode
      const tools = params.mode === 'agent' ? getAnthropicTools('agent') : undefined;

      // Make Anthropic API call using fetch
      const requestBody = {
        model: this._model,
        system: system,
        messages: messages,
        max_tokens: 4096, // Anthropic requires max_tokens
      };

      if (tools) {
        requestBody.tools = tools;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Anthropic API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Handle non-streaming response
      return this._convertToAiRequest(data, params);
    } catch (error) {
      // Normalize error before throwing
      const normalized = normalizeAnthropicError(error);
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

      // Start from full history in Anthropic format (system separate)
      const { system, messages } = formatMessagesForAnthropic(existingRequest);

      // Build a new user turn that can include tool results followed by user text
      const userBlocks: any[] = [];
      if (params.functionCallOutputs && params.functionCallOutputs.length > 0) {
        params.functionCallOutputs.forEach(output => {
          userBlocks.push({ type: 'tool_result', tool_use_id: output.call_id, content: output.output });
        });
      }
      if (params.userMessage) {
        userBlocks.push({ type: 'text', text: params.userMessage });
      }
      if (userBlocks.length > 0) {
        messages.push({ role: 'user', content: userBlocks.length === 1 ? userBlocks[0].text || userBlocks : userBlocks });
      }

      // Tools only in agent mode
      const tools = (existingRequest.mode === 'agent') ? getAnthropicTools('agent') : undefined;

      const requestBody: any = {
        model: this._model,
        system,
        messages,
        max_tokens: 4096,
      };
      if (tools) requestBody.tools = tools;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this._apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
        signal: options?.abortSignal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract assistant content and tool uses
      let textContent = '';
      let toolUses: Array<any> = [];
      for (const content of data.content || []) {
        if (content.type === 'text') textContent += content.text;
        if (content.type === 'tool_use') toolUses.push(content);
      }

      // Build updated AiRequest
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
      if (textContent) {
        assistantContent.push({ type: 'output_text', status: 'completed', text: textContent, annotations: [] });
      }
      for (const toolUse of toolUses) {
        assistantContent.push({
          type: 'function_call',
          status: 'completed',
          name: toolUse.name,
          arguments: JSON.stringify(toolUse.input || {}),
          call_id: toolUse.id,
        });
      }
      updatedOutput.push({ type: 'message', role: 'assistant', status: 'completed', content: assistantContent });

      return { ...existingRequest, updatedAt: new Date().toISOString(), status: 'ready', output: updatedOutput };
    } catch (error) {
      const normalized = normalizeAnthropicError(error);
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
   * Handle streaming response from Anthropic.
   * Processes SSE events as they arrive and calls the onStreamChunk callback.
   */
  async _handleStreamingResponse(
    stream: any,
    params: CreateAiRequestParams | AddMessageParams,
    options: AiRequestOptions
  ): Promise<AiRequest> {
    let fullContent = '';
    let toolUses = [];

    try {
      for await (const event of stream) {
        // Handle different event types
        if (event.type === 'content_block_start') {
          // New content block starting
          if (event.content_block?.type === 'tool_use') {
            toolUses.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            });
          }
        }

        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          
          // Handle text deltas
          if (delta?.type === 'text_delta') {
            fullContent += delta.text;
            if (options.onStreamChunk) {
              options.onStreamChunk(delta.text);
            }
          }

          // Handle tool input deltas
          if (delta?.type === 'input_json_delta') {
            // Accumulate tool input (Anthropic streams JSON incrementally)
            const lastTool = toolUses[toolUses.length - 1];
            if (lastTool) {
              const inputStr = JSON.stringify(lastTool.input) + delta.partial_json;
              try {
                lastTool.input = JSON.parse(inputStr);
              } catch (e) {
                // JSON not complete yet, continue accumulating
              }
            }
          }
        }

        if (event.type === 'message_stop') {
          // Message complete
          if (options.onStreamComplete) {
            options.onStreamComplete();
          }
        }
      }

      // Create AI request from streamed response
      return this._createAiRequestFromContent(fullContent, toolUses, params);
    } catch (error) {
      if (options.onStreamError) {
        options.onStreamError(error);
      }
      throw error;
    }
  }

  /**
   * Convert Anthropic response to GDevelop AiRequest format.
   */
  _convertToAiRequest(response: any, params: CreateAiRequestParams | AddMessageParams): AiRequest {
    let textContent = '';
    let toolUses = [];

    // Extract content from response
    for (const content of response.content || []) {
      if (content.type === 'text') {
        textContent += content.text;
      }
      if (content.type === 'tool_use') {
        toolUses.push(content);
      }
    }

    return this._createAiRequestFromContent(textContent, toolUses, params);
  }

  /**
   * Create AiRequest from content and tool uses.
   */
  _createAiRequestFromContent(
    content: string,
    toolUses: Array<any>,
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

    // Add tool uses as function calls
    for (const toolUse of toolUses) {
      assistantContent.push({
        type: 'function_call',
        status: 'completed',
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input),
        call_id: toolUse.id,
      });
    }

    output.push({
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: assistantContent,
    });

    return {
      id: `anthropic_${Date.now()}`,
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

