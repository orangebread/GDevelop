// @flow

import {
  buildSystemPrompt,
  buildUserPrompt,
  formatMessagesForOpenAI,
  truncateMessages,
  buildPromptContext,
} from '../PromptBuilder';

describe('PromptBuilder', () => {
  describe('buildSystemPrompt', () => {
    it('should build system prompt for chat mode', () => {
      const prompt = buildSystemPrompt('chat');
      
      expect(prompt).toContain('game development assistant');
      expect(prompt).toContain('GDevelop');
      expect(prompt).not.toContain('function call');
    });

    it('should build system prompt for agent mode', () => {
      const prompt = buildSystemPrompt('agent');
      
      expect(prompt).toContain('game development assistant');
      expect(prompt).toContain('GDevelop');
      expect(prompt).toContain('function');
      expect(prompt).toContain('create_scene');
      expect(prompt).toContain('add_object');
    });

    it('should include different content for different modes', () => {
      const chatPrompt = buildSystemPrompt('chat');
      const agentPrompt = buildSystemPrompt('agent');
      
      expect(chatPrompt).not.toBe(agentPrompt);
    });
  });

  describe('buildUserPrompt', () => {
    it('should return user request when no context provided', () => {
      const prompt = buildUserPrompt('Create a platformer game');
      
      expect(prompt).toBe('Create a platformer game');
    });

    it('should include scene information when project JSON provided', () => {
      const projectJson = JSON.stringify({
        layouts: [
          { name: 'Level1', objects: [] },
          { name: 'Level2', objects: [] },
        ],
      });
      
      const prompt = buildUserPrompt('Add a player', projectJson);
      
      expect(prompt).toContain('Add a player');
      expect(prompt).toContain('Level1');
      expect(prompt).toContain('Level2');
      expect(prompt).toContain('scenes');
    });

    it('should include object information for scenes', () => {
      const projectJson = JSON.stringify({
        layouts: [
          {
            name: 'MainScene',
            objects: [
              { name: 'Player' },
              { name: 'Enemy' },
              { name: 'Platform' },
            ],
          },
        ],
      });
      
      const prompt = buildUserPrompt('Add collision', projectJson);
      
      expect(prompt).toContain('MainScene');
      expect(prompt).toContain('Player');
      expect(prompt).toContain('Enemy');
      expect(prompt).toContain('Platform');
    });

    it('should include global objects when present', () => {
      const projectJson = JSON.stringify({
        objects: [
          { name: 'GlobalPlayer' },
          { name: 'GlobalUI' },
        ],
        layouts: [],
      });
      
      const prompt = buildUserPrompt('Use global objects', projectJson);
      
      expect(prompt).toContain('Global objects');
      expect(prompt).toContain('GlobalPlayer');
      expect(prompt).toContain('GlobalUI');
    });

    it('should include extensions information', () => {
      const extensionsJson = JSON.stringify([
        { name: 'Physics2', fullName: 'Physics Engine 2.0' },
        { name: 'Pathfinding', fullName: 'Pathfinding Behavior' },
      ]);
      
      const prompt = buildUserPrompt('Use physics', null, extensionsJson);
      
      expect(prompt).toContain('extensions');
      expect(prompt).toContain('Physics2');
      expect(prompt).toContain('Pathfinding');
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'not valid json {';
      
      const prompt = buildUserPrompt('Create game', invalidJson);
      
      // Should still return the user request
      expect(prompt).toContain('Create game');
    });

    it('should limit object list to avoid huge prompts', () => {
      const manyObjects = Array.from({ length: 20 }, (_, i) => ({ name: `Object${i}` }));
      const projectJson = JSON.stringify({
        layouts: [{ name: 'Scene', objects: manyObjects }],
      });
      
      const prompt = buildUserPrompt('Test', projectJson);
      
      // Should indicate there are more objects
      expect(prompt).toContain('more');
    });
  });

  describe('formatMessagesForOpenAI', () => {
    it('should format simple chat request', () => {
      const aiRequest = {
        id: 'test-1',
        mode: 'chat',
        output: [
          {
            type: 'message',
            role: 'user',
            status: 'completed',
            content: [
              {
                type: 'user_request',
                status: 'completed',
                text: 'Hello!',
              },
            ],
          },
        ],
      };
      
      const messages = formatMessagesForOpenAI(aiRequest);
      
      // Should have system message + user message
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('Hello!');
    });

    it('should format conversation with multiple messages', () => {
      const aiRequest = {
        id: 'test-2',
        mode: 'chat',
        output: [
          {
            type: 'message',
            role: 'user',
            status: 'completed',
            content: [{ type: 'user_request', status: 'completed', text: 'Hi' }],
          },
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', status: 'completed', text: 'Hello!' }],
          },
          {
            type: 'message',
            role: 'user',
            status: 'completed',
            content: [{ type: 'user_request', status: 'completed', text: 'How are you?' }],
          },
        ],
      };
      
      const messages = formatMessagesForOpenAI(aiRequest);
      
      // Should have system + 3 messages
      expect(messages.length).toBe(4);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[2].role).toBe('assistant');
      expect(messages[3].role).toBe('user');
    });

    it('should format function calls', () => {
      const aiRequest = {
        id: 'test-3',
        mode: 'agent',
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [
              {
                type: 'function_call',
                status: 'completed',
                name: 'create_scene',
                arguments: '{"scene_name": "Level1"}',
                call_id: 'call_1',
              },
            ],
          },
        ],
      };
      
      const messages = formatMessagesForOpenAI(aiRequest);
      
      // Should have system + assistant message with function call
      expect(messages.length).toBe(2);
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].function_call).toBeDefined();
      expect(messages[1].function_call.name).toBe('create_scene');
    });

    it('should format function call outputs', () => {
      const aiRequest = {
        id: 'test-4',
        mode: 'agent',
        output: [
          {
            type: 'function_call_output',
            call_id: 'call_1',
            output: '{"success": true}',
          },
        ],
      };
      
      const messages = formatMessagesForOpenAI(aiRequest);
      
      // Should have system + function message
      expect(messages.length).toBe(2);
      expect(messages[1].role).toBe('function');
      expect(messages[1].name).toBe('call_1');
      expect(messages[1].content).toContain('success');
    });

    it('should include reasoning in content', () => {
      const aiRequest = {
        id: 'test-5',
        mode: 'agent',
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [
              {
                type: 'reasoning',
                status: 'completed',
                summary: { type: 'summary_text', text: 'I will create a scene' },
              },
              {
                type: 'output_text',
                status: 'completed',
                text: 'Creating scene...',
              },
            ],
          },
        ],
      };
      
      const messages = formatMessagesForOpenAI(aiRequest);
      
      expect(messages[1].content).toContain('I will create a scene');
      expect(messages[1].content).toContain('Creating scene...');
    });
  });

  describe('truncateMessages', () => {
    it('should not truncate if within limit', () => {
      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello!' },
      ];
      
      const truncated = truncateMessages(messages, 10000);
      
      expect(truncated.length).toBe(messages.length);
    });

    it('should truncate if exceeds limit', () => {
      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
      ];
      
      const truncated = truncateMessages(messages, 50);
      
      expect(truncated.length).toBeLessThan(messages.length);
      // Should preserve system message
      expect(truncated[0].role).toBe('system');
    });
  });

  describe('buildPromptContext', () => {
    it('should build complete prompt context', () => {
      const messages = buildPromptContext({
        userRequest: 'Create a game',
        mode: 'chat',
      });
      
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toContain('Create a game');
    });

    it('should include project context', () => {
      const projectJson = JSON.stringify({
        layouts: [{ name: 'MainScene', objects: [] }],
      });
      
      const messages = buildPromptContext({
        userRequest: 'Add player',
        gameProjectJson: projectJson,
        mode: 'agent',
      });
      
      expect(messages[1].content).toContain('Add player');
      expect(messages[1].content).toContain('MainScene');
    });

    it('should truncate if maxTokens specified', () => {
      const longRequest = 'a'.repeat(10000);
      
      const messages = buildPromptContext({
        userRequest: longRequest,
        mode: 'chat',
        maxTokens: 100,
      });
      
      // Should be truncated
      expect(messages.length).toBeGreaterThan(0);
    });
  });
});

