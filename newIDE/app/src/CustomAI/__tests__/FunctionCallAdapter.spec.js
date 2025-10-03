// @flow

import {
  getFunctionDefinitions,
  formatFunctionCallForOpenAI,
  parseFunctionCallFromOpenAI,
  validateFunctionCall,
  toEditorFunctionCall,
  getFunctionCallDescription,
} from '../FunctionCallAdapter';

describe('FunctionCallAdapter', () => {
  describe('getFunctionDefinitions', () => {
    it('should return empty array for chat mode', () => {
      const functions = getFunctionDefinitions('chat');
      expect(functions).toEqual([]);
    });

    it('should return function definitions for agent mode', () => {
      const functions = getFunctionDefinitions('agent');
      
      expect(functions.length).toBeGreaterThan(0);
      expect(functions.some(f => f.name === 'create_scene')).toBe(true);
      expect(functions.some(f => f.name === 'add_object')).toBe(true);
      expect(functions.some(f => f.name === 'add_behavior')).toBe(true);
      expect(functions.some(f => f.name === 'add_scene_events')).toBe(true);
    });

    it('should have valid schema for create_scene', () => {
      const functions = getFunctionDefinitions('agent');
      const createScene = functions.find(f => f.name === 'create_scene');
      
      expect(createScene).toBeDefined();
      expect(createScene.description).toBeTruthy();
      expect(createScene.parameters.type).toBe('object');
      expect(createScene.parameters.required).toContain('scene_name');
      expect(createScene.parameters.properties.scene_name).toBeDefined();
    });

    it('should have valid schema for add_object', () => {
      const functions = getFunctionDefinitions('agent');
      const addObject = functions.find(f => f.name === 'add_object');
      
      expect(addObject).toBeDefined();
      expect(addObject.parameters.required).toContain('scene_name');
      expect(addObject.parameters.required).toContain('object_name');
      expect(addObject.parameters.required).toContain('object_type');
    });

    it('should have valid schema for add_behavior', () => {
      const functions = getFunctionDefinitions('agent');
      const addBehavior = functions.find(f => f.name === 'add_behavior');
      
      expect(addBehavior).toBeDefined();
      expect(addBehavior.parameters.required).toContain('scene_name');
      expect(addBehavior.parameters.required).toContain('object_name');
      expect(addBehavior.parameters.required).toContain('behavior_type');
    });

    it('should have valid schema for add_scene_events', () => {
      const functions = getFunctionDefinitions('agent');
      const addSceneEvents = functions.find(f => f.name === 'add_scene_events');
      
      expect(addSceneEvents).toBeDefined();
      expect(addSceneEvents.parameters.required).toContain('scene_name');
      expect(addSceneEvents.parameters.required).toContain('events_description');
      expect(addSceneEvents.parameters.required).toContain('objects_list');
      expect(addSceneEvents.parameters.required).toContain('extension_names_list');
    });
  });

  describe('formatFunctionCallForOpenAI', () => {
    it('should format function call correctly', () => {
      const formatted = formatFunctionCallForOpenAI('create_scene', {
        scene_name: 'Level1',
      });
      
      expect(formatted.name).toBe('create_scene');
      expect(formatted.arguments).toBe('{"scene_name":"Level1"}');
    });

    it('should handle complex arguments', () => {
      const formatted = formatFunctionCallForOpenAI('add_scene_events', {
        scene_name: 'MainScene',
        events_description: 'When player collides with enemy, decrease health',
        objects_list: 'Player, Enemy',
        extension_names_list: 'Sprite',
      });
      
      expect(formatted.name).toBe('add_scene_events');
      const args = JSON.parse(formatted.arguments);
      expect(args.scene_name).toBe('MainScene');
      expect(args.events_description).toContain('collides');
    });
  });

  describe('parseFunctionCallFromOpenAI', () => {
    it('should parse function call correctly', () => {
      const functionCall = {
        name: 'create_scene',
        arguments: '{"scene_name":"Level1"}',
        call_id: 'call_123',
      };
      
      const parsed = parseFunctionCallFromOpenAI(functionCall);
      
      expect(parsed.name).toBe('create_scene');
      expect(parsed.args.scene_name).toBe('Level1');
      expect(parsed.call_id).toBe('call_123');
    });

    it('should handle missing call_id', () => {
      const functionCall = {
        name: 'create_scene',
        arguments: '{"scene_name":"Level1"}',
      };
      
      const parsed = parseFunctionCallFromOpenAI(functionCall);
      
      expect(parsed.name).toBe('create_scene');
      expect(parsed.args.scene_name).toBe('Level1');
      expect(parsed.call_id).toBeUndefined();
    });

    it('should throw error for invalid JSON', () => {
      const functionCall = {
        name: 'create_scene',
        arguments: 'not valid json {',
      };
      
      expect(() => parseFunctionCallFromOpenAI(functionCall)).toThrow();
    });

    it('should parse complex arguments', () => {
      const functionCall = {
        name: 'add_scene_events',
        arguments: JSON.stringify({
          scene_name: 'MainScene',
          events_description: 'Test events',
          objects_list: 'Player, Enemy',
          extension_names_list: 'Sprite',
        }),
      };
      
      const parsed = parseFunctionCallFromOpenAI(functionCall);
      
      expect(parsed.args.scene_name).toBe('MainScene');
      expect(parsed.args.objects_list).toBe('Player, Enemy');
    });
  });

  describe('validateFunctionCall', () => {
    it('should validate create_scene with valid arguments', () => {
      const result = validateFunctionCall('create_scene', {
        scene_name: 'Level1',
      });
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject create_scene with missing scene_name', () => {
      const result = validateFunctionCall('create_scene', {});
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('scene_name');
    });

    it('should validate add_object with valid arguments', () => {
      const result = validateFunctionCall('add_object', {
        scene_name: 'Level1',
        object_name: 'Player',
        object_type: 'Sprite',
      });
      
      expect(result.valid).toBe(true);
    });

    it('should reject add_object with missing required arguments', () => {
      const result = validateFunctionCall('add_object', {
        scene_name: 'Level1',
        // Missing object_name and object_type
      });
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should reject unknown function', () => {
      const result = validateFunctionCall('unknown_function', {});
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown function');
    });

    it('should validate argument types', () => {
      const result = validateFunctionCall('create_scene', {
        scene_name: 123, // Should be string
      });
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('string');
    });

    it('should allow extra arguments with warning', () => {
      // Mock console.warn to capture warnings
      const originalWarn = console.warn;
      const warnings: Array<any> = [];
      console.warn = (...args) => warnings.push(args);
      
      const result = validateFunctionCall('create_scene', {
        scene_name: 'Level1',
        extra_arg: 'value',
      });
      
      expect(result.valid).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
      
      // Restore console.warn
      console.warn = originalWarn;
    });
  });

  describe('toEditorFunctionCall', () => {
    it('should convert to EditorFunctionCall format', () => {
      const parsed = {
        name: 'create_scene',
        args: { scene_name: 'Level1' },
        call_id: 'call_123',
      };
      
      const editorCall = toEditorFunctionCall(parsed);
      
      expect(editorCall.name).toBe('create_scene');
      expect(editorCall.arguments).toBe('{"scene_name":"Level1"}');
      expect(editorCall.call_id).toBe('call_123');
    });

    it('should generate call_id if not provided', () => {
      const parsed = {
        name: 'create_scene',
        args: { scene_name: 'Level1' },
      };
      
      const editorCall = toEditorFunctionCall(parsed);
      
      expect(editorCall.call_id).toBeTruthy();
      expect(editorCall.call_id).toContain('call_');
    });
  });

  describe('getFunctionCallDescription', () => {
    it('should describe create_scene', () => {
      const description = getFunctionCallDescription('create_scene', {
        scene_name: 'Level1',
      });
      
      expect(description).toContain('Create');
      expect(description).toContain('Level1');
    });

    it('should describe add_object', () => {
      const description = getFunctionCallDescription('add_object', {
        scene_name: 'MainScene',
        object_name: 'Player',
        object_type: 'Sprite',
      });
      
      expect(description).toContain('Add');
      expect(description).toContain('Player');
      expect(description).toContain('Sprite');
      expect(description).toContain('MainScene');
    });

    it('should describe add_behavior', () => {
      const description = getFunctionCallDescription('add_behavior', {
        scene_name: 'Level1',
        object_name: 'Player',
        behavior_type: 'PlatformBehavior::PlatformerObjectBehavior',
      });
      
      expect(description).toContain('Add');
      expect(description).toContain('behavior');
      expect(description).toContain('Player');
    });

    it('should describe add_scene_events', () => {
      const description = getFunctionCallDescription('add_scene_events', {
        scene_name: 'MainScene',
        events_description: 'When player collides with enemy',
        objects_list: 'Player, Enemy',
        extension_names_list: 'Sprite',
      });
      
      expect(description).toContain('Add events');
      expect(description).toContain('MainScene');
      expect(description).toContain('collides');
    });

    it('should handle unknown functions', () => {
      const description = getFunctionCallDescription('unknown_function', {});
      
      expect(description).toContain('Execute');
      expect(description).toContain('unknown_function');
    });
  });
});

