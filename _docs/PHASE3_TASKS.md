# Phase 3: Anthropic Integration - Granular Task List

**Prerequisites:** Phase 2 must be complete and all checklist items validated.

**Goal:** Add Anthropic (Claude) as a second custom AI provider with full feature parity.

**Estimated Total Time:** 9-11 hours over 3-4 days (part-time)

---

## Overview

Phase 3 adds Anthropic's Claude models as an alternative to OpenAI, giving users choice between providers. This phase focuses on:
- Anthropic-specific API integration (different from OpenAI)
- Claude-specific prompt formatting (system messages handled differently)
- Anthropic's function calling format (tools API, different from OpenAI)
- Provider selection UI improvements
- Cross-provider validation and testing

**Key Differences from OpenAI:**
- Anthropic uses a separate `system` parameter (not in messages array)
- Function calling uses "tools" terminology instead of "functions"
- Different token counting (Anthropic's tokenizer, not tiktoken)
- Different streaming format (SSE with different event types)
- Higher context limits (200k for Claude 3.5 Sonnet vs 128k for GPT-4 Turbo)

---

## Task Group 1: Anthropic-Specific Utilities (3-4 hours)

### Task 1.1: Add Anthropic Error Normalization (1 hour)
**Goal:** Extend ErrorNormalizer to handle Anthropic-specific errors

**Steps:**
1. Modify `CustomAI/ErrorNormalizer.js`
2. Implement `normalizeAnthropicError(error)` function:
   - Map HTTP 401 → `INVALID_API_KEY`
   - Map HTTP 429 → `RATE_LIMIT_EXCEEDED`
   - Map HTTP 404 → `MODEL_NOT_FOUND`
   - Map HTTP 400 with "prompt is too long" → `CONTEXT_TOO_LARGE`
   - Map "overloaded_error" → `SERVICE_UNAVAILABLE`
   - Map network errors → `NETWORK_ERROR`
   - Map timeouts → `TIMEOUT`
3. Add Anthropic-specific error messages to `getUserMessage()`
4. Test error normalization with mock Anthropic errors

**Deliverable:** Updated `ErrorNormalizer.js` with Anthropic support

**Estimated Time:** 1 hour

**Files Modified:**
- `newIDE/app/src/CustomAI/ErrorNormalizer.js` (~30 lines added)

**Validation:**
- [ ] Anthropic errors map correctly to normalized codes
- [ ] Error messages are helpful and Anthropic-specific
- [ ] `isRetryable()` works for Anthropic errors
- [ ] Flow types pass

**Test:**
```javascript
import { normalizeAnthropicError, AI_ERROR_CODES } from './ErrorNormalizer';
const error = { status: 401, error: { type: 'authentication_error' } };
const normalized = normalizeAnthropicError(error);
console.log(normalized.code); // Should be 'invalid_api_key'
console.log(normalized.provider); // Should be 'anthropic'
```

---

### Task 1.2: Add Anthropic Token Counting (1.5 hours)
**Goal:** Implement token counting for Claude models

**Steps:**
1. Modify `CustomAI/TokenCounter.js`
2. Research Anthropic's tokenization:
   - Anthropic uses a different tokenizer than OpenAI
   - **Preferred approach:** Use Anthropic SDK's `messages.count_tokens()` endpoint
   - **Note:** This requires a network call; consider caching results
   - **Fallback:** Use approximation (~4 characters per token) with documented accuracy tradeoffs
3. Implement `countTokensAnthropic(text, model)`:
   - **Primary:** Use Anthropic SDK's count_tokens endpoint if available
   - **Fallback:** Use approximation: ~4 characters per token (less accurate, ~10-15% error)
   - Cache encoder/counting results to minimize network overhead
   - Document which approach is used and expected accuracy
4. Update `countTokens(text, model)` to detect provider:
   ```javascript
   if (model.startsWith('claude-')) {
     return countTokensAnthropic(text, model);
   }
   ```
5. Update `estimateMessageTokens()` for Anthropic format:
   - Anthropic has different message overhead
   - System message is separate (not in messages array)
   - Account for Anthropic-specific formatting tokens
6. Update `checkContextLimit()` to use ProviderRegistry for Claude models

**Deliverable:** Updated `TokenCounter.js` with Anthropic support

**Estimated Time:** 1.5 hours

**Files Modified:**
- `newIDE/app/src/CustomAI/TokenCounter.js` (~50 lines added)

**Validation:**
- [ ] Can count tokens for Claude models
- [ ] Token counts are reasonably accurate (within 10-15% for estimation, 5% for SDK)
- [ ] Context limits use correct values from ProviderRegistry (200k for Claude 3.5)
- [ ] Message overhead is calculated correctly
- [ ] Caching reduces network overhead for repeated counts
- [ ] Fallback strategy is documented
- [ ] Flow types pass

**Test:**
```javascript
import { countTokens, checkContextLimit } from './TokenCounter';
const tokens = countTokens('Hello, world!', 'claude-3-5-sonnet-20241022');
console.log(tokens); // Should be ~4 tokens
const limit = checkContextLimit(150000, 'anthropic', 'claude-3-5-sonnet-20241022');
console.log(limit.withinLimit); // Should be true (200k limit)
```

---

### Task 1.3: Add Claude-Specific Prompt Formatting (30 min)
**Goal:** Extend PromptBuilder for Anthropic's format

**Steps:**
1. Modify `CustomAI/PromptBuilder.js`
2. Add `formatMessagesForAnthropic(messages, systemPrompt)`:
   - Extract system message (Anthropic uses separate `system` parameter)
   - Format user/assistant messages
   - Handle multi-turn conversations
3. Add `buildAnthropicRequest(messages, mode, context)`:
   - Combine system prompt and messages
   - Return format: `{ system: string, messages: array }`
4. Update existing functions to accept provider parameter
5. Add context truncation logic for Anthropic:
   - **Use TokenCounter to measure context size (Anthropic-specific counting)**
   - **Respect ProviderRegistry's contextWindow limits for Claude models (200k for Claude 3.5 Sonnet)**
   - Prioritize keeping most recent/relevant context
   - Truncate older messages or less critical project details first

**Deliverable:** Updated `PromptBuilder.js` with Anthropic support

**Estimated Time:** 30 minutes

**Files Modified:**
- `newIDE/app/src/CustomAI/PromptBuilder.js` (~30 lines added)

**Validation:**
- [ ] System prompt is extracted correctly
- [ ] Messages are formatted for Anthropic API
- [ ] Multi-turn conversations work
- [ ] Context truncation uses TokenCounter and respects ProviderRegistry limits
- [ ] Flow types pass

---

### Task 1.4: Unit Tests for Anthropic Utilities (1 hour)
**Goal:** Ensure Anthropic-specific utility code works correctly before integration

**Steps:**
1. Create/update `CustomAI/__tests__/ErrorNormalizer.test.js`:
   - Test Anthropic error code mapping (401 → INVALID_API_KEY, etc.)
   - Test `isRetryable()` for Anthropic errors
   - Test `getUserMessage()` returns Anthropic-specific helpful messages
   - Test that API keys are not exposed in Anthropic error messages
2. Create/update `CustomAI/__tests__/TokenCounter.test.js`:
   - Test token counting for Claude models
   - Test message token estimation for Anthropic format (separate system prompt)
   - Test context limit checking for Claude (200k limit)
   - Test caching behavior for Anthropic token counting
3. Create/update `CustomAI/__tests__/PromptBuilder.test.js`:
   - Test system prompt extraction for Anthropic
   - Test message formatting for Anthropic API
   - Test Anthropic request building (system + messages format)
   - Test context truncation logic for Anthropic (uses TokenCounter + ProviderRegistry)

**Deliverable:** Test suites for Anthropic-specific utility code

**Estimated Time:** 1 hour

**Validation:**
- [ ] All Anthropic utility tests pass
- [ ] Error normalization works correctly for Anthropic
- [ ] Token counting is accurate for Claude models
- [ ] Prompt building handles Anthropic format correctly
- [ ] No sensitive data in test outputs

---

## Task Group 2: Anthropic Function Calling (1.5-2 hours)

### Task 2.1: Add Anthropic Tools Support (1.5 hours)
**Goal:** Extend FunctionCallAdapter for Anthropic's tools API

**Steps:**
1. Modify `CustomAI/FunctionCallAdapter.js`
2. Implement `formatToolsForAnthropic(functions)`:
   - Convert OpenAI function definitions to Anthropic tools format
   - Anthropic uses `tools` array with `input_schema` instead of `parameters`
   - Example:
     ```javascript
     {
       name: "add_object",
       description: "Add an object to the scene",
       input_schema: {
         type: "object",
         properties: { ... },
         required: [ ... ]
       }
     }
     ```
3. Implement `parseToolCallFromAnthropic(toolUse)`:
   - Extract tool name and input from Anthropic's response
   - Anthropic returns `tool_use` blocks with `name` and `input`
4. Implement `formatToolResultForAnthropic(toolUseId, result)`:
   - Format tool execution result for Anthropic
   - Anthropic requires `tool_use_id` in response
5. Add provider detection to existing functions:
   - `getFunctionDefinitions(mode, provider)` - return appropriate format
   - `parseFunctionCall(response, provider)` - parse based on provider

**Deliverable:** Updated `FunctionCallAdapter.js` with Anthropic support

**Estimated Time:** 1.5 hours

**Files Modified:**
- `newIDE/app/src/CustomAI/FunctionCallAdapter.js` (~50 lines added)

**Validation:**
- [ ] Can convert function definitions to Anthropic tools format
- [ ] Can parse tool calls from Anthropic responses
- [ ] Can format tool results for Anthropic
- [ ] Tool execution works with Anthropic
- [ ] Flow types pass

**Test:**
```javascript
import { formatToolsForAnthropic, parseToolCallFromAnthropic } from './FunctionCallAdapter';
const functions = getFunctionDefinitions('event-generation');
const tools = formatToolsForAnthropic(functions);
console.log(tools[0].input_schema); // Should have Anthropic format

const toolUse = {
  type: 'tool_use',
  id: 'toolu_123',
  name: 'add_object',
  input: { name: 'Player', type: 'Sprite' }
};
const parsed = parseToolCallFromAnthropic(toolUse);
console.log(parsed); // Should extract name and input
```

---

### Task 2.2: Test Anthropic Function Calling (30 min)
**Goal:** Verify function calling works with Anthropic format

**Steps:**
1. Create test file: `CustomAI/__tests__/FunctionCallAdapter.anthropic.test.js`
2. Test tool formatting:
   - Verify all functions convert to Anthropic tools format
   - Validate `input_schema` structure
3. Test tool call parsing:
   - Mock Anthropic tool_use responses
   - Verify parsing extracts correct data
4. Test tool result formatting:
   - Verify tool results are formatted correctly
   - Check `tool_use_id` is included

**Deliverable:** Test suite for Anthropic function calling

**Estimated Time:** 30 minutes

**Validation:**
- [ ] All tests pass
- [ ] Tool schemas are valid for Anthropic
- [ ] Tool call parsing works
- [ ] Tool result formatting works

---

## Task Group 3: AnthropicProvider Implementation (2-3 hours)

### Task 3.1: Implement AnthropicProvider Core (2 hours)
**Goal:** Create Anthropic provider that implements AIProviderInterface

**Steps:**
1. Create `CustomAI/providers/AnthropicProvider.js`
2. Install Anthropic SDK: `yarn add @anthropic-ai/sdk`
   - **Note:** Will use the **Messages API** (`/v1/messages`)
   - This API supports streaming, tool calling, and AbortController
   - **Streaming format:** Server-Sent Events (SSE) with event types:
     - `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`
   - Verify streaming works in Electron renderer process with AbortController
3. Implement constructor:
   - Accept API key
   - Initialize Anthropic client
   - Set default model from ProviderRegistry
4. Implement `getProviderInfo()`:
   - Return provider metadata (id: 'anthropic', name: 'Anthropic', etc.)
5. Implement `createAiRequest(params, options)`:
   - Build system prompt and messages using PromptBuilder
   - Include tools using FunctionCallAdapter
   - Make Anthropic API call with streaming support (using `stream: true`)
   - **Handle Anthropic SSE event types:**
     - `content_block_delta` → extract text and call `options.onStreamToken`
     - `message_stop` → finalize response
     - `tool_use` blocks → parse and execute tools
   - Handle tool calls in responses (different format than OpenAI)
   - Return normalized response
   - **Sanitize error payloads before normalizing** (strip sensitive data)
6. Implement `addMessage(aiRequestId, params, options)`:
   - Add message to conversation
   - Handle tool results if previous message had tool calls (include `tool_use_id`)
   - Make follow-up API call
   - Handle streaming and tool calls
7. Implement `generateEvents(params, options)`:
   - Use event generation mode
   - Include relevant tools
   - Parse tool calls from response
   - Execute tool calls on project
8. Add abort signal support for cancellation:
   - Pass `options.abortSignal` to Anthropic SDK
   - **Test that AbortController.abort() properly cancels in-flight requests**
   - Verify no further SSE events arrive after cancellation
9. Wrap all API calls with error normalization (use `normalizeAnthropicError`)

**Deliverable:** `AnthropicProvider.js` with complete implementation

**Estimated Time:** 2 hours

**Files Created:**
- `newIDE/app/src/CustomAI/providers/AnthropicProvider.js` (new file, ~220 lines)

**Validation:**
- [ ] Provider implements all AIProviderInterface methods
- [ ] Can create AI requests with Anthropic
- [ ] Can add messages to conversations
- [ ] Can generate events
- [ ] Streaming works (tokens arrive incrementally via SSE events)
- [ ] **All Anthropic SSE event types are handled correctly**
- [ ] Tool calling works (Anthropic format with tool_use_id)
- [ ] Cancellation works (abort signal, no events after abort)
- [ ] Errors are normalized and sanitized
- [ ] Flow types pass

**Test:**
```javascript
import AnthropicProvider from './providers/AnthropicProvider';
const provider = new AnthropicProvider('sk-ant-...', 'claude-3-5-sonnet-20241022');
const info = provider.getProviderInfo();
console.log(info.id); // Should be 'anthropic'
```

---

### Task 3.2: Add Anthropic to useAIService Hook (30 min)
**Goal:** Enable Anthropic provider selection in the app

**Prerequisites:**
- **Verify Phase 1 completion:** Confirm that call-site injections were completed in Phase 1
  - `AskAiEditorContainer.js` should use `const aiService = useAIService()`
  - `UseGenerateEvents.js` should use `const aiService = useAIService()`
  - If NOT completed in Phase 1, add these injections as part of this task

**Steps:**
1. Modify `CustomAI/useAIService.js`
2. Import AnthropicProvider
3. Add provider instantiation logic:
   ```javascript
   if (settings.enabled && settings.provider === 'anthropic') {
     const apiKey = await SecureStorage.getApiKey('anthropic');
     if (!apiKey) {
       // NO SILENT FALLBACK - Show error and require explicit user action
       throw new Error(
         'Anthropic API key not configured. Please add your API key in Settings > Custom AI, ' +
         'or switch to another provider.'
       );
     }
     return new AIService(new AnthropicProvider(apiKey, settings.model));
   }
   // Only use GDevelop backend if explicitly selected or custom AI disabled
   return new AIService(new GDevelopProvider());
   ```
4. Ensure provider switching works (re-instantiate when settings change)
5. Add error handling for missing API key (surface to UI, don't fallback silently)

**Deliverable:** Modified `useAIService.js` with Anthropic support (no silent fallback)

**Estimated Time:** 30 minutes

**Files Modified:**
- `newIDE/app/src/CustomAI/useAIService.js` (~15 lines added)
- **If Phase 1 incomplete:** `AskAiEditorContainer.js` (~3 lines), `UseGenerateEvents.js` (~3 lines)

**Validation:**
- [ ] Can select Anthropic provider in settings
- [ ] Anthropic provider is instantiated correctly
- [ ] API key is loaded from SecureStorage
- [ ] **Error shown if API key missing (NO silent fallback to GDevelop)**
- [ ] Can switch between OpenAI and Anthropic without restart
- [ ] Call sites use `aiService` instead of direct `Generation.js` calls

---

## Task Group 4: UI Enhancements (1.5-2 hours)

### Task 4.1: Enhance Settings Dialog (1 hour)
**Goal:** Improve provider selection UI

**Steps:**
1. Modify `CustomAI/CustomAISettingsDialog.js`
2. Update provider dropdown to include Anthropic:
   - OpenAI
   - Anthropic
   - GDevelop (default)
3. Update model dropdown to show provider-specific models:
   - When OpenAI selected: Show GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
   - When Anthropic selected: Show Claude 3.5 Sonnet, Claude 3 Opus
   - Use ProviderRegistry to populate models
4. Add provider-specific help text:
   - OpenAI: "Get your API key from platform.openai.com"
   - Anthropic: "Get your API key from console.anthropic.com"
5. Show model metadata (context window, pricing) when model selected
6. Add visual indicator of active provider (badge or icon)

**Deliverable:** Enhanced settings dialog with better UX

**Estimated Time:** 1 hour

**Files Modified:**
- `newIDE/app/src/CustomAI/CustomAISettingsDialog.js` (~40 lines modified)

**Validation:**
- [ ] Can select Anthropic from dropdown
- [ ] Model dropdown updates when provider changes
- [ ] Help text is provider-specific
- [ ] Model metadata is displayed
- [ ] Active provider is clearly indicated
- [ ] UI is intuitive and clear

---

### Task 4.2: Add Provider Status Indicator (30 min)
**Goal:** Show which provider is active in the main UI

**Steps:**
1. Create `CustomAI/ProviderStatusBadge.js` component
2. Display current provider name and model
3. Add to AI chat interface (AskAiEditorContainer)
4. Style badge to be subtle but visible
5. Add tooltip with provider details (model, context limit, etc.)

**Deliverable:** Provider status badge component

**Estimated Time:** 30 minutes

**Files Created:**
- `newIDE/app/src/CustomAI/ProviderStatusBadge.js` (new file, ~50 lines)

**Files Modified:**
- `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` (~5 lines)

**Validation:**
- [ ] Badge shows current provider
- [ ] Badge shows current model
- [ ] Tooltip shows additional details
- [ ] Badge updates when provider changes
- [ ] Styling is appropriate

---

## Task Group 5: Testing & Validation (2-3 hours)

### Task 5.1: End-to-End Testing with Anthropic (1.5 hours)
**Goal:** Verify all AI features work with Anthropic

**Prerequisites:** Valid Anthropic API key for testing

**Steps:**
1. Configure Anthropic in settings:
   - Enable custom AI
   - Select Anthropic provider
   - Enter API key
   - Select model (claude-3-5-sonnet-20241022)
2. **Verify subscription bypass:**
   - **Confirm AI features are accessible in UI without GDevelop authentication**
   - **Confirm no subscription checks block AI features when custom AI enabled**
   - Verify provider status indicator shows "Anthropic" (or similar badge)
3. Test AI chat:
   - Create new AI request
   - Send messages
   - Verify streaming works (SSE events handled correctly)
   - Verify responses are coherent
4. Test event generation:
   - Request event creation
   - Verify tool calls are made (Anthropic format with tool_use_id)
   - Verify events are created in project
5. Test asset search (if applicable):
   - Search for assets
   - Verify results are relevant
6. Test error scenarios:
   - Invalid API key → helpful error message (no silent fallback)
   - Rate limit → retry suggestion
   - Context too large → model suggestion
   - Missing API key → error shown, no silent fallback to GDevelop
7. Test cancellation:
   - Start request
   - Cancel mid-stream
   - Verify request aborts cleanly (no further SSE events)
8. **Verify provider indicator:**
   - Check that UI shows active provider (Anthropic)
   - Switch to OpenAI, verify indicator updates
   - Switch back to Anthropic, verify indicator updates

**Deliverable:** Validated Anthropic integration

**Estimated Time:** 1.5 hours

**Validation:**
- [ ] **AI features accessible without GDevelop authentication/subscription**
- [ ] **Provider status indicator shows correct provider (Anthropic)**
- [ ] AI chat works with Anthropic
- [ ] Event generation works with Anthropic
- [ ] Asset search works with Anthropic (if applicable)
- [ ] Tool calling works (objects/events created with tool_use_id)
- [ ] Streaming responses work (SSE events handled correctly)
- [ ] Cancellation works (no events after abort)
- [ ] Error messages are helpful
- [ ] No API keys in logs or errors
- [ ] **No silent fallback to GDevelop (errors shown, user must take action)**

---

### Task 5.2: Cross-Provider Testing (1 hour)
**Goal:** Verify switching between providers works seamlessly

**Steps:**
1. Test provider switching:
   - Start with OpenAI, create AI chat
   - Switch to Anthropic in settings
   - Create new AI chat (should use Anthropic)
   - Switch back to OpenAI
   - Verify no errors or state issues
2. Test with both API keys configured:
   - Configure both OpenAI and Anthropic keys
   - Switch between providers multiple times
   - Verify correct provider is used each time
3. Test with only one API key:
   - Configure only OpenAI key
   - Try to switch to Anthropic
   - Verify helpful error message (no silent fallback)
4. Test fallback behavior (if implemented):
   - **Note:** Fallback to GDevelop must be explicit user opt-in (per strategy)
   - **If fallback toggle exists in settings:**
     - Enable fallback to GDevelop
     - Cause Anthropic error (invalid key)
     - Verify fallback works (if enabled)
     - Disable fallback
     - Verify error shown (if disabled)
   - **If no fallback toggle:** Skip this step and verify errors always shown
5. Compare responses:
   - Send same prompt to OpenAI and Anthropic
   - Compare response quality
   - Compare response times
   - Compare token usage

**Deliverable:** Cross-provider validation report

**Estimated Time:** 1 hour

**Validation:**
- [ ] Can switch between OpenAI and Anthropic without restart
- [ ] Correct provider is used after switching
- [ ] No state issues when switching
- [ ] Error handling works when API key missing (no silent fallback)
- [ ] Fallback behavior works as configured (if toggle exists)
- [ ] Both providers produce quality responses
- [ ] Response times are comparable

---

### Task 5.3: Performance & Cost Comparison (30 min)
**Goal:** Compare Anthropic vs OpenAI performance and cost

**Steps:**
1. Test token counting accuracy:
   - Send same requests to both providers
   - Compare estimated vs actual token usage
   - Verify both are within acceptable range (5-10%)
2. Test context limits:
   - Create large context (100k tokens)
   - Verify OpenAI enforces 128k limit
   - Verify Anthropic enforces 200k limit
3. Compare costs:
   - Make identical requests to both providers
   - Compare actual costs
   - Verify ProviderRegistry pricing is accurate
4. Compare response times:
   - Measure time to first token for both
   - Measure total request time for both
   - Document differences

**Deliverable:** Performance and cost comparison report

**Estimated Time:** 30 minutes

**Validation:**
- [ ] Token counting is accurate for both providers (within 5-10%)
- [ ] Context limits are enforced correctly
- [ ] Cost estimates are accurate (within 10%)
- [ ] Response times are documented
- [ ] Anthropic's higher context limit is usable

---

## Phase 3 Completion Checklist

Before moving to Phase 4, verify:

**Core Implementation:**
- [ ] ErrorNormalizer handles Anthropic errors
- [ ] TokenCounter counts tokens for Claude models
- [ ] PromptBuilder formats prompts for Anthropic
- [ ] FunctionCallAdapter handles Anthropic tools format
- [ ] AnthropicProvider implements all AIProviderInterface methods

**Integration:**
- [ ] Anthropic provider can be selected in settings
- [ ] API key is loaded from SecureStorage
- [ ] Provider switches without restart
- [ ] All AI features work with Anthropic (chat, events, asset search)

**Tool Calling:**
- [ ] Can create scenes via Anthropic tool calls
- [ ] Can add objects via Anthropic tool calls
- [ ] Can add behaviors via Anthropic tool calls
- [ ] Can create events via Anthropic tool calls
- [ ] Tool call errors are handled gracefully

**Streaming & Cancellation:**
- [ ] Streaming responses work with Anthropic
- [ ] UI updates as tokens arrive
- [ ] Cancellation works (abort signal respected)
- [ ] Cancelled requests don't continue in background

**Error Handling:**
- [ ] Invalid API key shows helpful error
- [ ] Rate limit errors show retry suggestion
- [ ] Context too large shows model suggestion
- [ ] Network errors are handled gracefully
- [ ] No API keys in error messages or logs
- [ ] No silent fallback to GDevelop (errors shown to user)

**UI/UX:**
- [ ] Can select Anthropic from provider dropdown
- [ ] Model dropdown shows Claude models when Anthropic selected
- [ ] Provider-specific help text is shown
- [ ] Active provider is clearly indicated
- [ ] Provider status badge shows current provider/model

**Cross-Provider:**
- [ ] Can switch between OpenAI and Anthropic without restart
- [ ] Correct provider is used after switching
- [ ] No state issues when switching providers
- [ ] Both providers work correctly
- [ ] Error handling works for both providers

**Performance & Cost:**
- [ ] Token counting is accurate for Claude models (within 5-10%)
- [ ] Context limits are enforced (200k for Claude 3.5)
- [ ] Cost estimation is accurate (within 10%)
- [ ] Response times are acceptable
- [ ] Anthropic's higher context limit is usable

**Security:**
- [ ] API keys never in logs or error messages
- [ ] API keys never sent to GDevelop servers
- [ ] API keys are masked in UI
- [ ] Errors don't expose sensitive data
- [ ] Both provider keys are stored securely

**Testing:**
- [ ] All existing AI features still work with GDevelop backend
- [ ] All AI features work with OpenAI
- [ ] All AI features work with Anthropic
- [ ] Flow types pass (`yarn flow`)
- [ ] No console errors
- [ ] No regressions in existing functionality

**Documentation:**
- [ ] Anthropic setup documented
- [ ] Tool calling differences documented
- [ ] Provider comparison documented
- [ ] Any deviations from plan documented

---

## Recommended Work Sessions

**Session 1 (2 hours):** Tasks 1.1, 1.2 (Error normalization + Token counting)
**Session 2 (1.5 hours):** Tasks 1.3, 1.4 (Prompt formatting + Utility tests)
**Session 3 (1.5 hours):** Task 2.1 (Tools support)
**Session 4 (30 min):** Task 2.2 (Function calling tests)
**Session 5 (2.5 hours):** Tasks 3.1, 3.2 (AnthropicProvider + integration)
**Session 6 (1.5 hours):** Tasks 4.1, 4.2 (UI enhancements)
**Session 7 (3 hours):** Tasks 5.1, 5.2, 5.3 (Testing & validation)

**Total: 7 sessions, ~11 hours**

---

## Commit Strategy

Commit after each task group:
- `feat: add Anthropic error normalization and token counting`
- `feat: implement Anthropic tools support for function calling`
- `feat: implement Anthropic provider with streaming support`
- `feat: enhance provider selection UI`
- `feat: add comprehensive cross-provider testing`

This way, you can sync with upstream after each commit without losing much work.

---

## Dependencies & Installation

**NPM Packages to Install:**
```bash
yarn add @anthropic-ai/sdk  # Anthropic SDK
```

**No additional packages needed** - ErrorNormalizer, TokenCounter, PromptBuilder, and FunctionCallAdapter are already in place from Phase 2.

---

## Next Steps After Phase 3

Once Phase 3 is complete:
1. **Sync with upstream** to catch any conflicts early
2. **Test thoroughly** with real projects using both providers
3. **Document provider differences** and recommendations
4. **Proceed to Phase 4** (Polish & Documentation) or
5. **Address any issues** found during testing

**Success Criteria:** All AI features work with both OpenAI and Anthropic, seamless provider switching, <10 files modified total.

