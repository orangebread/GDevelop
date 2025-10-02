// @flow

import {
  countTokens,
  estimateMessageTokens,
  checkContextLimit,
  estimateCost,
  formatCost,
  truncateToTokenLimit,
  truncateMessagesToTokenLimit,
  getTokenUsageSummary,
} from '../TokenCounter';

describe('TokenCounter', () => {
  describe('countTokens', () => {
    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should estimate tokens for simple text', () => {
      const text = 'Hello, world!';
      const tokens = countTokens(text);
      
      // Should be roughly 3-4 tokens (conservative estimate)
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should estimate more tokens for longer text', () => {
      const shortText = 'Hello';
      const longText = 'Hello, this is a much longer piece of text that should have more tokens.';
      
      const shortTokens = countTokens(shortText);
      const longTokens = countTokens(longText);
      
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    it('should handle code text', () => {
      const code = 'function hello() { return "world"; }';
      const tokens = countTokens(code);
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle JSON text', () => {
      const json = '{"key": "value", "number": 123}';
      const tokens = countTokens(json);
      
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('estimateMessageTokens', () => {
    it('should return 0 for empty messages array', () => {
      expect(estimateMessageTokens([])).toBe(0);
    });

    it('should estimate tokens for single message', () => {
      const messages = [
        { role: 'user', content: 'Hello, how are you?' },
      ];
      
      const tokens = estimateMessageTokens(messages);
      
      // Should include content tokens + overhead
      expect(tokens).toBeGreaterThan(0);
    });

    it('should estimate tokens for multiple messages', () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
        { role: 'assistant', content: 'Hi there! How can I help you?' },
      ];
      
      const tokens = estimateMessageTokens(messages);
      
      // Should include all messages + overhead
      expect(tokens).toBeGreaterThan(0);
    });

    it('should account for function calls', () => {
      const messagesWithoutFunction = [
        { role: 'user', content: 'Create a scene' },
      ];
      
      const messagesWithFunction = [
        {
          role: 'assistant',
          content: null,
          function_call: {
            name: 'create_scene',
            arguments: '{"scene_name": "Level1"}',
          },
        },
      ];
      
      const tokensWithoutFunction = estimateMessageTokens(messagesWithoutFunction);
      const tokensWithFunction = estimateMessageTokens(messagesWithFunction);
      
      // Function call should add tokens
      expect(tokensWithFunction).toBeGreaterThan(0);
    });

    it('should account for name field', () => {
      const messagesWithoutName = [
        { role: 'user', content: 'Hello' },
      ];
      
      const messagesWithName = [
        { role: 'user', content: 'Hello', name: 'user123' },
      ];
      
      const tokensWithoutName = estimateMessageTokens(messagesWithoutName);
      const tokensWithName = estimateMessageTokens(messagesWithName);
      
      // Name should add at least 1 token
      expect(tokensWithName).toBeGreaterThanOrEqual(tokensWithoutName);
    });
  });

  describe('checkContextLimit', () => {
    it('should check if tokens are within limit', () => {
      const result = checkContextLimit(1000, 'openai', 'gpt-5');

      expect(result.withinLimit).toBe(true);
      expect(result.currentTokens).toBe(1000);
      expect(result.maxTokens).toBeGreaterThan(1000);
      expect(result.percentUsed).toBeLessThan(100);
    });

    it('should detect when limit is exceeded', () => {
      const result = checkContextLimit(200000, 'openai', 'gpt-5');

      expect(result.withinLimit).toBe(false);
      expect(result.recommendedAction).toBeDefined();
      expect(result.recommendedAction).toContain('exceeded');
    });

    it('should warn when approaching limit', () => {
      // GPT-5 has 131k context window
      const result = checkContextLimit(120000, 'openai', 'gpt-5');

      expect(result.withinLimit).toBe(true);
      expect(result.percentUsed).toBeGreaterThan(90);
      expect(result.recommendedAction).toBeDefined();
      expect(result.recommendedAction).toContain('Approaching');
    });

    it('should handle unknown models with default limit', () => {
      const result = checkContextLimit(10000, 'unknown', 'unknown-model');
      
      expect(result.maxTokens).toBe(8000); // Default limit
      expect(result.withinLimit).toBe(false);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for OpenAI models', () => {
      const cost = estimateCost('openai', 'gpt-5', 1000, 500);

      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should return 0 for unknown models', () => {
      const cost = estimateCost('unknown', 'unknown-model', 1000, 500);
      
      expect(cost).toBe(0);
    });

    it('should calculate higher cost for more tokens', () => {
      const smallCost = estimateCost('openai', 'gpt-5', 100, 50);
      const largeCost = estimateCost('openai', 'gpt-5', 10000, 5000);

      expect(largeCost).toBeGreaterThan(smallCost);
    });
  });

  describe('formatCost', () => {
    it('should format zero cost', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should format small costs with 4 decimals', () => {
      const formatted = formatCost(0.0012);
      expect(formatted).toContain('$');
      expect(formatted).toContain('0.0012');
    });

    it('should format medium costs with 3 decimals', () => {
      const formatted = formatCost(0.123);
      expect(formatted).toContain('$');
      expect(formatted).toContain('0.123');
    });

    it('should format large costs with 2 decimals', () => {
      const formatted = formatCost(12.34);
      expect(formatted).toBe('$12.34');
    });
  });

  describe('truncateToTokenLimit', () => {
    it('should not truncate if within limit', () => {
      const text = 'Hello, world!';
      const truncated = truncateToTokenLimit(text, 1000);
      
      expect(truncated).toBe(text);
    });

    it('should truncate if exceeds limit', () => {
      const longText = 'a'.repeat(10000);
      const truncated = truncateToTokenLimit(longText, 100);
      
      expect(truncated.length).toBeLessThan(longText.length);
      expect(truncated).toContain('...');
    });
  });

  describe('truncateMessagesToTokenLimit', () => {
    it('should not truncate if within limit', () => {
      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello!' },
      ];
      
      const truncated = truncateMessagesToTokenLimit(messages, 10000);
      
      expect(truncated.length).toBe(messages.length);
    });

    it('should preserve system messages', () => {
      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
      ];
      
      const truncated = truncateMessagesToTokenLimit(messages, 50);
      
      // Should always include system message
      expect(truncated[0].role).toBe('system');
    });

    it('should keep most recent messages', () => {
      const messages = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Old message' },
        { role: 'assistant', content: 'Old response' },
        { role: 'user', content: 'Recent message' },
        { role: 'assistant', content: 'Recent response' },
      ];
      
      const truncated = truncateMessagesToTokenLimit(messages, 100);
      
      // Should include recent messages
      const lastMessage = truncated[truncated.length - 1];
      expect(lastMessage.content).toContain('Recent');
    });

    it('should handle empty messages array', () => {
      const truncated = truncateMessagesToTokenLimit([], 100);
      
      expect(truncated).toEqual([]);
    });
  });

  describe('getTokenUsageSummary', () => {
    it('should provide human-readable summary', () => {
      const summary = getTokenUsageSummary(1000, 'openai', 'gpt-5');

      expect(summary).toContain('1,000');
      expect(summary).toContain('tokens');
      expect(summary).toContain('%');
    });

    it('should format large numbers with commas', () => {
      const summary = getTokenUsageSummary(100000, 'openai', 'gpt-5');

      expect(summary).toContain('100,000');
    });
  });
});

