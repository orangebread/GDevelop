// @flow

/**
 * Prompt building for AI providers.
 * Converts GDevelop context and requests into provider-specific prompt formats.
 *
 * This module handles:
 * - System prompt generation for different modes (chat, agent, event generation)
 * - User prompt formatting with project context
 * - Message format conversion (GDevelop → OpenAI/Anthropic)
 * - Context truncation to fit within token limits
 */

import type { AiRequest, AiRequestMessage } from '../Utils/GDevelopServices/Generation';
import { countTokens, estimateMessageTokens, truncateMessagesToTokenLimit } from './TokenCounter';

/**
 * OpenAI message format.
 */
export type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'function',
  content: string | null,
  name?: string,
  function_call?: {
    name: string,
    arguments: string,
  },
};

/**
 * Anthropic message format.
 * Note: Anthropic does NOT include 'system' in messages - it's a separate parameter.
 */
export type AnthropicMessage = {
  role: 'user' | 'assistant',
  content: string | Array<{
    type: 'text' | 'tool_use' | 'tool_result',
    text?: string,
    id?: string,
    name?: string,
    input?: any,
    tool_use_id?: string,
    content?: string,
  }>,
};

/**
 * Build system prompt for a given mode.
 * The system prompt sets the AI's behavior and capabilities.
 *
 * @param mode - AI mode ('chat' or 'agent')
 * @returns System prompt text
 */
export const buildSystemPrompt = (mode: 'chat' | 'agent'): string => {
  if (mode === 'agent') {
    return `You are an expert game development assistant specialized in GDevelop, a no-code game engine.

Your role is to help users create games by:
- Creating scenes and game objects
- Adding behaviors to objects
- Generating game events and logic
- Providing guidance on game design and implementation

You have access to function calls to manipulate the GDevelop project:
- create_scene: Create a new scene in the project
- add_object: Add an object to a scene
- add_behavior: Add a behavior to an object
- add_scene_events: Create events in a scene

When the user asks you to create or modify something in their game:
1. Use the appropriate function calls to make the changes
2. Explain what you're doing in a friendly, educational way
3. Provide tips and best practices when relevant

Be concise but helpful. Focus on practical implementation.`;
  }

  // Chat mode
  return `You are a helpful game development assistant specialized in GDevelop, a no-code game engine.

Your role is to:
- Answer questions about GDevelop features and capabilities
- Provide guidance on game design and implementation
- Help troubleshoot issues
- Suggest best practices and optimization tips

Be concise, friendly, and educational. Provide practical examples when helpful.`;
};

/**
 * Build user prompt with project context.
 * Combines the user's request with relevant project information.
 *
 * @param userRequest - User's request text
 * @param gameProjectJson - Simplified project JSON (optional)
 * @param projectSpecificExtensionsSummaryJson - Extensions summary (optional)
 * @returns Formatted user prompt
 */
export const buildUserPrompt = (
  userRequest: string,
  gameProjectJson?: string | null,
  projectSpecificExtensionsSummaryJson?: string | null
): string => {
  let prompt = userRequest;

  // Add project context if available
  if (gameProjectJson) {
    try {
      const project = JSON.parse(gameProjectJson);
      
      // Add scene information
      if (project.layouts && project.layouts.length > 0) {
        prompt += '\n\nProject scenes:';
        project.layouts.forEach((layout: any) => {
          prompt += `\n- ${layout.name}`;
          
          // Add object information for the scene
          if (layout.objects && layout.objects.length > 0) {
            prompt += ' (objects: ';
            const objectNames = layout.objects.map((obj: any) => obj.name).slice(0, 5);
            prompt += objectNames.join(', ');
            if (layout.objects.length > 5) {
              prompt += `, and ${layout.objects.length - 5} more`;
            }
            prompt += ')';
          }
        });
      }

      // Add global objects
      if (project.objects && project.objects.length > 0) {
        prompt += '\n\nGlobal objects:';
        const globalObjectNames = project.objects.map((obj: any) => obj.name).slice(0, 10);
        prompt += '\n- ' + globalObjectNames.join(', ');
        if (project.objects.length > 10) {
          prompt += `, and ${project.objects.length - 10} more`;
        }
      }
    } catch (error) {
      // If project JSON is invalid, just use the user request
      console.warn('Failed to parse project JSON for prompt building:', error);
    }
  }

  // Add extensions context if available
  if (projectSpecificExtensionsSummaryJson) {
    try {
      const extensions = JSON.parse(projectSpecificExtensionsSummaryJson);
      if (extensions && extensions.length > 0) {
        prompt += '\n\nAvailable extensions:';
        extensions.forEach((ext: any) => {
          prompt += `\n- ${ext.name || ext.fullName}`;
        });
      }
    } catch (error) {
      console.warn('Failed to parse extensions summary for prompt building:', error);
    }
  }

  return prompt;
};

/**
 * Convert GDevelop message format to OpenAI format.
 * Handles the different message types and structures.
 *
 * @param gdMessage - GDevelop message
 * @returns OpenAI message (or null if message should be skipped)
 */
const convertGDevelopMessageToOpenAI = (gdMessage: AiRequestMessage): OpenAIMessage | null => {
  // Handle function call outputs
  if (gdMessage.type === 'function_call_output') {
    return {
      role: 'function',
      name: gdMessage.call_id,
      content: gdMessage.output,
    };
  }

  // Handle regular messages
  if (gdMessage.type === 'message') {
    const role = gdMessage.role;
    
    // Extract content from the message
    let content = '';
    let functionCall = null;

    if (gdMessage.content && Array.isArray(gdMessage.content)) {
      for (const contentItem of gdMessage.content) {
        if (contentItem.type === 'user_request' && contentItem.text) {
          content += contentItem.text;
        } else if (contentItem.type === 'output_text' && contentItem.text) {
          content += contentItem.text;
        } else if (contentItem.type === 'reasoning' && contentItem.summary?.text) {
          // Include reasoning as part of the content
          content += contentItem.summary.text + '\n';
        } else if (contentItem.type === 'function_call') {
          // Extract function call
          functionCall = {
            name: contentItem.name,
            arguments: contentItem.arguments,
          };
        }
      }
    }

    // Create OpenAI message
    const message: OpenAIMessage = {
      role: role === 'user' ? 'user' : 'assistant',
      content: content || null,
    };

    if (functionCall) {
      message.function_call = functionCall;
    }

    return message;
  }

  return null;
};

/**
 * Format messages for OpenAI API.
 * Converts GDevelop message history to OpenAI format.
 *
 * @param aiRequest - GDevelop AI request with message history
 * @returns Array of OpenAI messages
 */
export const formatMessagesForOpenAI = (aiRequest: AiRequest): Array<OpenAIMessage> => {
  const messages: Array<OpenAIMessage> = [];

  // Add system message
  const systemPrompt = buildSystemPrompt(aiRequest.mode || 'chat');
  messages.push({
    role: 'system',
    content: systemPrompt,
  });

  // Pre-compute mapping from call_id -> function name to correctly attach tool/function results
  const callIdToFunctionName: { [string]: string } = {};
  if (aiRequest.output && Array.isArray(aiRequest.output)) {
    for (const msg of aiRequest.output) {
      if (msg.type === 'message' && msg.role === 'assistant' && Array.isArray(msg.content)) {
        for (const contentItem of msg.content) {
          if (contentItem.type === 'function_call' && contentItem.call_id && contentItem.name) {
            callIdToFunctionName[contentItem.call_id] = contentItem.name;
          }
        }
      }
    }
  }

  // Convert GDevelop messages to OpenAI format
  if (aiRequest.output && Array.isArray(aiRequest.output)) {
    for (const gdMessage of aiRequest.output) {
      if (gdMessage.type === 'function_call_output') {
        const functionName = callIdToFunctionName[gdMessage.call_id] || 'tool_result';
        messages.push({
          role: 'function',
          name: functionName,
          content: gdMessage.output,
        });
        continue;
      }

      const openAIMessage = convertGDevelopMessageToOpenAI(gdMessage);
      if (openAIMessage) messages.push(openAIMessage);
    }
  }

  return messages;
};

/**
 * Truncate messages to fit within token limit.
 * Preserves system message and most recent context.
 *
 * @param messages - Array of OpenAI messages
 * @param maxTokens - Maximum token count
 * @param model - Model ID (for token estimation)
 * @returns Truncated messages array
 */
export const truncateMessages = (
  messages: Array<OpenAIMessage>,
  maxTokens: number,
  model?: string
): Array<OpenAIMessage> => {
  // Convert to format expected by TokenCounter
  const messagesForCounting = messages.map(msg => ({
    role: msg.role,
    content: msg.content || '',
    name: msg.name,
    function_call: msg.function_call,
  }));

  const truncated = truncateMessagesToTokenLimit(messagesForCounting, maxTokens, model);

  // Convert back to OpenAI format
  return truncated.map(msg => ({
    role: msg.role,
    content: msg.content || null,
    name: msg.name,
    function_call: msg.function_call,
  }));
};

/**
 * Build complete prompt context for a request.
 * Combines system prompt, user request, and project context.
 *
 * @param params - Request parameters
 * @returns Formatted messages for OpenAI
 */
export const buildPromptContext = (params: {
  userRequest: string,
  gameProjectJson?: string | null,
  projectSpecificExtensionsSummaryJson?: string | null,
  mode: 'chat' | 'agent',
  maxTokens?: number,
  model?: string,
}): Array<OpenAIMessage> => {
  const { userRequest, gameProjectJson, projectSpecificExtensionsSummaryJson, mode, maxTokens, model } = params;

  const messages: Array<OpenAIMessage> = [];

  // Add system message
  messages.push({
    role: 'system',
    content: buildSystemPrompt(mode),
  });

  // Add user message with context
  const userPrompt = buildUserPrompt(userRequest, gameProjectJson, projectSpecificExtensionsSummaryJson);
  messages.push({
    role: 'user',
    content: userPrompt,
  });

  // Truncate if needed
  if (maxTokens) {
    return truncateMessages(messages, maxTokens, model);
  }

  return messages;
};

/**
 * Format messages for Anthropic API.
 * Anthropic requires system prompt as a separate parameter, not in messages array.
 * Also converts GDevelop message format to Anthropic format.
 *
 * @param aiRequest - GDevelop AI request
 * @returns Object with system prompt and messages array
 */
export const formatMessagesForAnthropic = (aiRequest: AiRequest): {
  system: string,
  messages: Array<AnthropicMessage>,
} => {
  const messages: Array<AnthropicMessage> = [];
  let systemPrompt = '';

  // Extract system prompt and convert messages
  for (const msg of aiRequest.output || []) {
    if (msg.type !== 'message') continue;

    // Handle system messages (extract to system parameter)
    if (msg.role === 'system') {
      const content = msg.content?.[0];
      if (content && content.type === 'output_text') {
        systemPrompt = content.text || '';
      }
      continue; // Don't add to messages array
    }

    // Handle user messages
    if (msg.role === 'user') {
      const content = msg.content?.[0];
      if (content && content.type === 'user_request') {
        messages.push({
          role: 'user',
          content: content.text || '',
        });
      }
      continue;
    }

    // Handle assistant messages
    if (msg.role === 'assistant') {
      const contentBlocks = [];

      for (const content of msg.content || []) {
        // Text content
        if (content.type === 'output_text') {
          contentBlocks.push({
            type: 'text',
            text: content.text || '',
          });
        }

        // Function calls → tool_use
        if (content.type === 'function_call') {
          contentBlocks.push({
            type: 'tool_use',
            id: content.call_id || `tool_${Date.now()}`,
            name: content.name || '',
            input: JSON.parse(content.arguments || '{}'),
          });
        }
      }

      if (contentBlocks.length > 0) {
        messages.push({
          role: 'assistant',
          content: contentBlocks,
        });
      }
    }
  }

  return {
    system: systemPrompt || buildSystemPrompt(aiRequest.mode || 'chat'),
    messages,
  };
};

/**
 * Build Anthropic request from parameters.
 * Returns system prompt and messages in Anthropic format.
 *
 * @param params - Request parameters
 * @returns Object with system and messages for Anthropic API
 */
export const buildAnthropicRequest = (params: {
  userRequest: string,
  gameProjectJson?: string | null,
  projectSpecificExtensionsSummaryJson?: string | null,
  mode: 'chat' | 'agent',
  maxTokens?: number,
  model?: string,
}): {
  system: string,
  messages: Array<AnthropicMessage>,
} => {
  const { userRequest, gameProjectJson, projectSpecificExtensionsSummaryJson, mode, maxTokens, model } = params;

  // Build system prompt
  const system = buildSystemPrompt(mode);

  // Build user message with context
  const userPrompt = buildUserPrompt(userRequest, gameProjectJson, projectSpecificExtensionsSummaryJson);

  // Create messages array (no system message in Anthropic)
  const messages: Array<AnthropicMessage> = [
    {
      role: 'user',
      content: userPrompt,
    },
  ];

  // TODO: Implement truncation for Anthropic if needed
  // For now, return as-is

  return {
    system,
    messages,
  };
};

