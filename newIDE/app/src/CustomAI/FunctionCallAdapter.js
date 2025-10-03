// @flow

/**
 * Function calling adapter for AI providers.
 * Handles conversion between GDevelop function calls and provider-specific formats (OpenAI, Anthropic).
 *
 * This module provides:
 * - Function schemas for GDevelop operations (create_scene, add_object, add_behavior, add_scene_events)
 * - Conversion to/from OpenAI function calling format
 * - Validation of function call arguments
 *
 * Note: The actual execution of function calls is handled by EditorFunctionCallRunner.
 * This adapter only handles the format conversion and schema definition.
 */

/**
 * OpenAI function definition format.
 */
export type OpenAIFunctionDefinition = {
  name: string,
  description: string,
  parameters: {
    type: 'object',
    properties: { [string]: any },
    required: Array<string>,
  },
};

/**
 * Anthropic tool definition format.
 * Anthropic uses "tools" instead of "functions" and "input_schema" instead of "parameters".
 */
export type AnthropicToolDefinition = {
  name: string,
  description: string,
  input_schema: {
    type: 'object',
    properties: { [string]: any },
    required: Array<string>,
  },
};

/**
 * Parsed function call from AI provider.
 */
export type ParsedFunctionCall = {
  name: string,
  args: any,
  call_id?: string,
};

/**
 * Get function definitions for OpenAI.
 * Returns the list of available functions based on the mode.
 *
 * @param mode - AI mode ('chat' or 'agent')
 * @returns Array of OpenAI function definitions
 */
export const getFunctionDefinitions = (mode: 'chat' | 'agent'): Array<OpenAIFunctionDefinition> => {
  // Only agent mode supports function calling
  if (mode !== 'agent') {
    return [];
  }

  return [
    {
      name: 'create_scene',
      description: 'Create a new scene in the GDevelop project. A scene is a level or screen in the game.',
      parameters: {
        type: 'object',
        properties: {
          scene_name: {
            type: 'string',
            description: 'The name of the scene to create (e.g., "Level1", "MainMenu", "GameOver")',
          },
        },
        required: ['scene_name'],
      },
    },
    {
      name: 'add_object',
      description: 'Add a new object to a scene. Objects are game entities like sprites, text, particles, etc.',
      parameters: {
        type: 'object',
        properties: {
          scene_name: {
            type: 'string',
            description: 'The name of the scene to add the object to',
          },
          object_name: {
            type: 'string',
            description: 'The name of the object to create (e.g., "Player", "Enemy", "Platform")',
          },
          object_type: {
            type: 'string',
            description: 'The type of object (e.g., "Sprite", "TextObject::Text", "ParticleSystem::ParticleEmitter")',
          },
        },
        required: ['scene_name', 'object_name', 'object_type'],
      },
    },
    {
      name: 'add_behavior',
      description: 'Add a behavior to an object. Behaviors add functionality like physics, platformer controls, etc.',
      parameters: {
        type: 'object',
        properties: {
          scene_name: {
            type: 'string',
            description: 'The name of the scene containing the object',
          },
          object_name: {
            type: 'string',
            description: 'The name of the object to add the behavior to',
          },
          behavior_type: {
            type: 'string',
            description: 'The type of behavior to add (e.g., "PlatformBehavior::PlatformerObjectBehavior", "Physics2::Physics2Behavior")',
          },
          behavior_name: {
            type: 'string',
            description: 'The name to give to the behavior instance (optional, will be auto-generated if not provided)',
          },
        },
        required: ['scene_name', 'object_name', 'behavior_type'],
      },
    },
    {
      name: 'add_scene_events',
      description: 'Add or modify events in a scene. Events define the game logic and behavior.',
      parameters: {
        type: 'object',
        properties: {
          scene_name: {
            type: 'string',
            description: 'The name of the scene to add events to',
          },
          events_description: {
            type: 'string',
            description: 'A natural language description of the events to create (e.g., "When player collides with enemy, decrease health by 1")',
          },
          objects_list: {
            type: 'string',
            description: 'Comma-separated list of object names that will be used in the events (e.g., "Player, Enemy, Coin")',
          },
          extension_names_list: {
            type: 'string',
            description: 'Comma-separated list of extensions/behaviors needed for the events (e.g., "Keyboard, PlatformBehavior::PlatformerObjectBehavior")',
          },
          placement_hint: {
            type: 'string',
            description: 'Optional hint about where to place the events (e.g., "replace event named <event-0>", "at the end")',
          },
        },
        required: ['scene_name', 'events_description', 'objects_list', 'extension_names_list'],
      },
    },
  ];
};

/**
 * Format a function call for OpenAI.
 * Converts GDevelop function call format to OpenAI format.
 *
 * @param functionName - Name of the function
 * @param args - Function arguments
 * @returns OpenAI function call format
 */
export const formatFunctionCallForOpenAI = (
  functionName: string,
  args: any
): { name: string, arguments: string } => {
  return {
    name: functionName,
    arguments: JSON.stringify(args),
  };
};

/**
 * Parse a function call from OpenAI response.
 * Extracts function name and arguments from OpenAI format.
 *
 * @param functionCall - OpenAI function call object
 * @returns Parsed function call
 */
export const parseFunctionCallFromOpenAI = (functionCall: {
  name: string,
  arguments: string,
  call_id?: string,
}): ParsedFunctionCall => {
  let args;
  try {
    args = JSON.parse(functionCall.arguments);
  } catch (error) {
    throw new Error(`Failed to parse function call arguments: ${error.message}`);
  }

  return {
    name: functionCall.name,
    args,
    call_id: functionCall.call_id,
  };
};

/**
 * Validate function call arguments.
 * Checks that required arguments are present and have correct types.
 *
 * @param functionName - Name of the function
 * @param args - Function arguments
 * @returns Validation result { valid: boolean, error?: string }
 */
export const validateFunctionCall = (
  functionName: string,
  args: any
): { valid: boolean, error?: string } => {
  const functionDef = getFunctionDefinitions('agent').find(f => f.name === functionName);
  
  if (!functionDef) {
    return {
      valid: false,
      error: `Unknown function: ${functionName}`,
    };
  }

  const required = functionDef.parameters.required || [];
  const properties = functionDef.parameters.properties || {};

  // Check required arguments
  for (const requiredArg of required) {
    if (!(requiredArg in args)) {
      return {
        valid: false,
        error: `Missing required argument: ${requiredArg}`,
      };
    }
  }

  // Check argument types (basic validation)
  for (const [argName, argValue] of Object.entries(args)) {
    const propDef = properties[argName];
    if (!propDef) {
      // Unknown argument - warn but don't fail
      console.warn(`Unknown argument for ${functionName}: ${argName}`);
      continue;
    }

    const expectedType = propDef.type;
    const actualType = typeof argValue;

    if (expectedType === 'string' && actualType !== 'string') {
      return {
        valid: false,
        error: `Argument ${argName} should be a string, got ${actualType}`,
      };
    }

    if (expectedType === 'number' && actualType !== 'number') {
      return {
        valid: false,
        error: `Argument ${argName} should be a number, got ${actualType}`,
      };
    }

    if (expectedType === 'boolean' && actualType !== 'boolean') {
      return {
        valid: false,
        error: `Argument ${argName} should be a boolean, got ${actualType}`,
      };
    }
  }

  return { valid: true };
};

/**
 * Convert GDevelop function call to EditorFunctionCall format.
 * This is the format expected by EditorFunctionCallRunner.
 *
 * @param functionCall - Parsed function call
 * @returns EditorFunctionCall format
 */
export const toEditorFunctionCall = (functionCall: ParsedFunctionCall): {
  name: string,
  arguments: string,
  call_id: string,
} => {
  return {
    name: functionCall.name,
    arguments: JSON.stringify(functionCall.args),
    call_id: functionCall.call_id || `call_${Date.now()}`,
  };
};

/**
 * Get function description for display.
 * Returns a human-readable description of what a function call will do.
 *
 * @param functionName - Name of the function
 * @param args - Function arguments
 * @returns Human-readable description
 */
export const getFunctionCallDescription = (functionName: string, args: any): string => {
  switch (functionName) {
    case 'create_scene':
      return `Create scene "${args.scene_name}"`;
    
    case 'add_object':
      return `Add ${args.object_type} object "${args.object_name}" to scene "${args.scene_name}"`;
    
    case 'add_behavior':
      return `Add ${args.behavior_type} behavior to object "${args.object_name}" in scene "${args.scene_name}"`;
    
    case 'add_scene_events':
      return `Add events to scene "${args.scene_name}": ${args.events_description}`;
    
    default:
      return `Execute ${functionName}`;
  }
};

/**
 * Convert OpenAI function definitions to Anthropic tools format.
 * Anthropic uses "tools" with "input_schema" instead of "functions" with "parameters".
 *
 * @param functions - OpenAI function definitions
 * @returns Anthropic tool definitions
 */
export const formatToolsForAnthropic = (
  functions: Array<OpenAIFunctionDefinition>
): Array<AnthropicToolDefinition> => {
  return functions.map(func => ({
    name: func.name,
    description: func.description,
    input_schema: {
      type: func.parameters.type,
      properties: func.parameters.properties,
      required: func.parameters.required,
    },
  }));
};

/**
 * Get tool definitions for Anthropic.
 * Returns the list of available tools based on the mode.
 *
 * @param mode - AI mode ('chat' or 'agent')
 * @returns Array of Anthropic tool definitions
 */
export const getAnthropicTools = (mode: 'chat' | 'agent'): Array<AnthropicToolDefinition> => {
  const functions = getFunctionDefinitions(mode);
  return formatToolsForAnthropic(functions);
};

/**
 * Parse a tool call from Anthropic response.
 * Anthropic uses "tool_use" blocks with "input" instead of "arguments".
 *
 * @param toolUse - Anthropic tool_use block
 * @returns Parsed function call
 */
export const parseToolCallFromAnthropic = (toolUse: {
  id: string,
  name: string,
  input: any,
}): ParsedFunctionCall => {
  return {
    name: toolUse.name,
    args: toolUse.input,
    call_id: toolUse.id,
  };
};

/**
 * Format tool result for Anthropic.
 * Anthropic requires tool results to reference the tool_use_id.
 *
 * @param toolUseId - ID of the tool use
 * @param result - Result of the tool execution
 * @returns Formatted tool result for Anthropic
 */
export const formatToolResultForAnthropic = (
  toolUseId: string,
  result: any
): {
  type: 'tool_result',
  tool_use_id: string,
  content: string,
} => {
  return {
    type: 'tool_result',
    tool_use_id: toolUseId,
    content: typeof result === 'string' ? result : JSON.stringify(result),
  };
};

