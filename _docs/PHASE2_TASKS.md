# Phase 2: OpenAI Integration - Granular Task List

**Prerequisites:** Phase 1 must be complete and all checklist items validated.

**Goal:** Implement OpenAI provider with full feature parity to GDevelop backend.

**Estimated Total Time:** 11-13 hours over 4-5 days (part-time)

---

## Overview

Phase 2 adds the first custom AI provider (OpenAI), enabling users to use their own API keys for all AI features. This phase focuses on:
- Request/response transformation between GDevelop format and OpenAI format
- Function calling support (for scene creation, object manipulation, etc.)
- Streaming responses with proper token handling
- Error normalization and helpful user messages
- Token counting and context limit enforcement

---

## Task Group 1: Utilities & Infrastructure (4-5 hours)

### Task 1.1: Implement ErrorNormalizer (1.5 hours)
**Goal:** Create standardized error handling across all providers

**Steps:**
1. Create `CustomAI/ErrorNormalizer.js`
2. Define error code taxonomy (copy from Appendix C in strategy doc):
   - Authentication errors: `INVALID_API_KEY`, `EXPIRED_API_KEY`
   - Rate limiting: `RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`
   - Model/request errors: `MODEL_NOT_FOUND`, `CONTEXT_TOO_LARGE`, `INVALID_REQUEST`
   - Policy violations: `CONTENT_POLICY_VIOLATION`
   - Network/infrastructure: `NETWORK_ERROR`, `TIMEOUT`, `SERVICE_UNAVAILABLE`
   - Unknown: `UNKNOWN_ERROR`
3. Implement `NormalizedAIError` class with:
   - `isRetryable()` method
   - `getUserMessage()` method
   - Provider tracking
4. Implement `normalizeOpenAIError(error)` function:
   - Map HTTP 401 → `INVALID_API_KEY`
   - Map HTTP 429 → `RATE_LIMIT_EXCEEDED`
   - Map HTTP 404 → `MODEL_NOT_FOUND`
   - Map HTTP 400 with "context_length_exceeded" → `CONTEXT_TOO_LARGE`
   - Map network errors → `NETWORK_ERROR`
   - Map timeouts → `TIMEOUT`
5. Add Flow types for error classes

**Deliverable:** `ErrorNormalizer.js` with complete error taxonomy

**Estimated Time:** 1.5 hours

**Validation:**
- [ ] All error codes defined
- [ ] `NormalizedAIError` class works correctly
- [ ] `isRetryable()` returns correct values
- [ ] `getUserMessage()` returns helpful messages (no API keys exposed)
- [ ] OpenAI errors map correctly to normalized codes
- [ ] Flow types pass

**Test:**
```javascript
import { normalizeOpenAIError, AI_ERROR_CODES } from './ErrorNormalizer';
const error = { status: 401, message: 'Invalid API key' };
const normalized = normalizeOpenAIError(error);
console.log(normalized.code); // Should be 'invalid_api_key'
console.log(normalized.getUserMessage()); // Should be user-friendly
console.log(normalized.isRetryable()); // Should be false
```

---

### Task 1.2: Implement TokenCounter (1.5 hours)
**Goal:** Accurate token counting for OpenAI models

**Steps:**
1. Create `CustomAI/TokenCounter.js`
2. Install tiktoken library: `yarn add @dqbd/tiktoken`
   - **Note:** This package uses WASM and may require webpack configuration in Electron
   - **Fallback strategy if bundling issues occur:**
     - Use `gpt-3-encoder` package (simpler, no WASM)
     - Or implement conservative estimation (multiply character count by safety factor)
     - Document the chosen approach and accuracy tradeoffs
3. Implement `countTokens(text, model)` function:
   - Use tiktoken for OpenAI models
   - Handle different encodings (cl100k_base for GPT-4, GPT-3.5-turbo)
4. Implement `estimateMessageTokens(messages, model)` for chat format:
   - Account for message formatting overhead (~4 tokens per message)
   - Account for role tokens
5. Implement `checkContextLimit(tokens, providerId, modelId)`:
   - Use ProviderRegistry to get context window
   - Return `{ withinLimit: boolean, maxTokens: number, currentTokens: number }`
6. Add caching for encoder instances (don't recreate on every call)

**Deliverable:** `TokenCounter.js` with accurate token counting

**Estimated Time:** 1.5 hours

**Validation:**
- [ ] Can count tokens for text strings
- [ ] Can estimate tokens for message arrays
- [ ] Context limit checking works
- [ ] Encoder instances are cached
- [ ] Handles different OpenAI models correctly
- [ ] Flow types pass

**Test:**
```javascript
import { countTokens, checkContextLimit } from './TokenCounter';
const tokens = countTokens('Hello, world!', 'gpt-4-turbo');
console.log(tokens); // Should be ~4 tokens
const limit = checkContextLimit(100000, 'openai', 'gpt-4-turbo');
console.log(limit.withinLimit); // Should be true (128k limit)
```

---

### Task 1.3: Implement PromptBuilder (1 hour)
**Goal:** Convert GDevelop context to OpenAI-compatible prompts

**Steps:**
1. Create `CustomAI/PromptBuilder.js`
2. Implement `buildSystemPrompt(mode)` function:
   - For chat mode: "You are a helpful game development assistant..."
   - For event generation: "You are an expert in GDevelop event system..."
   - Include GDevelop-specific context (available objects, behaviors, etc.)
3. Implement `buildUserPrompt(userRequest, context)`:
   - Combine user request with project context
   - Format scene information, object lists, etc.
4. Implement `formatMessagesForOpenAI(messages)`:
   - Convert GDevelop message format to OpenAI format
   - Handle system/user/assistant roles
5. Add context truncation logic (if context too large, truncate intelligently):
   - **Use TokenCounter to measure context size**
   - **Respect ProviderRegistry's contextWindow limits for the selected model**
   - Prioritize keeping most recent/relevant context
   - Truncate older messages or less critical project details first

**Deliverable:** `PromptBuilder.js` with prompt formatting

**Estimated Time:** 1 hour

**Validation:**
- [ ] System prompts are appropriate for each mode
- [ ] User prompts include necessary context
- [ ] Message formatting matches OpenAI spec
- [ ] Context truncation works (keeps most relevant info)
- [ ] Flow types pass

---

### Task 1.4: Unit Tests for Utilities (1 hour)
**Goal:** Ensure core utilities work correctly before integration

**Steps:**
1. Create `CustomAI/__tests__/ErrorNormalizer.test.js`:
   - Test error code mapping for OpenAI errors (401 → INVALID_API_KEY, etc.)
   - Test `isRetryable()` returns correct values
   - Test `getUserMessage()` returns helpful messages
   - Test that API keys are not exposed in error messages
2. Create `CustomAI/__tests__/TokenCounter.test.js`:
   - Test token counting for sample text
   - Test message token estimation
   - Test context limit checking
   - Test encoder caching
3. Create `CustomAI/__tests__/PromptBuilder.test.js`:
   - Test system prompt generation for different modes
   - Test user prompt formatting
   - Test message format conversion
   - Test context truncation logic

**Deliverable:** Test suites for ErrorNormalizer, TokenCounter, PromptBuilder

**Estimated Time:** 1 hour

**Validation:**
- [ ] All utility tests pass
- [ ] Error normalization works correctly
- [ ] Token counting is accurate
- [ ] Prompt building handles edge cases
- [ ] No sensitive data in test outputs

---

## Task Group 2: Function Calling Support (2-3 hours)

### Task 2.1: Implement FunctionCallAdapter (2 hours)
**Goal:** Handle function calling for scene/object manipulation

**Steps:**
1. Create `CustomAI/FunctionCallAdapter.js`
2. Define function schemas for GDevelop operations:
   - `create_scene`: Create a new scene
   - `add_object`: Add object to scene
   - `add_behavior`: Add behavior to object
   - `create_event`: Create event in scene
   - `modify_object_properties`: Change object properties
3. Implement `getFunctionDefinitions(mode)`:
   - Return OpenAI-compatible function definitions
   - Only include relevant functions for current mode
4. Implement `formatFunctionCallForOpenAI(functionName, args)`:
   - Convert GDevelop function call to OpenAI format
5. Implement `parseFunctionCallFromOpenAI(functionCall)`:
   - Extract function name and arguments
   - Validate arguments
6. Implement `executeFunctionCall(functionName, args, project)`:
   - Execute the actual GDevelop operation
   - Return result or error
7. Add error handling for invalid function calls

**Deliverable:** `FunctionCallAdapter.js` with complete function calling support

**Estimated Time:** 2 hours

**Validation:**
- [ ] Function schemas are correct and complete
- [ ] Can format function calls for OpenAI
- [ ] Can parse function calls from OpenAI responses
- [ ] Can execute function calls on GDevelop project
- [ ] Error handling works for invalid calls
- [ ] Flow types pass

**Test:**
```javascript
import { getFunctionDefinitions, parseFunctionCallFromOpenAI } from './FunctionCallAdapter';
const functions = getFunctionDefinitions('event-generation');
console.log(functions); // Should include create_event, add_object, etc.
const parsed = parseFunctionCallFromOpenAI({
  name: 'add_object',
  arguments: '{"name": "Player", "type": "Sprite"}'
});
console.log(parsed); // Should be { name: 'add_object', args: { name: 'Player', type: 'Sprite' } }
```

---

### Task 2.2: Test Function Calling Integration (30 min)
**Goal:** Verify function calling works end-to-end

**Steps:**
1. Create test file: `CustomAI/__tests__/FunctionCallAdapter.test.js`
2. Test each function definition:
   - Validate schema format
   - Test argument parsing
3. Test function execution (mock GDevelop project):
   - Create scene
   - Add object
   - Add behavior
4. Test error cases:
   - Invalid function name
   - Missing required arguments
   - Invalid argument types

**Deliverable:** Test suite for function calling

**Estimated Time:** 30 minutes

**Validation:**
- [ ] All tests pass
- [ ] Function schemas are valid
- [ ] Function execution works
- [ ] Error cases handled correctly

---

## Task Group 3: OpenAI Provider Implementation (3-4 hours)

### Task 3.1: Implement OpenAIProvider Core (2 hours)
**Goal:** Create OpenAI provider that implements AIProviderInterface

**Steps:**
1. Create `CustomAI/providers/OpenAIProvider.js`
2. Install OpenAI SDK: `yarn add openai`
   - **Note:** Will use the **Chat Completions API** (`/v1/chat/completions`)
   - This API supports streaming, function calling, and AbortController
   - Verify streaming works in Electron renderer process with AbortController
3. Implement constructor:
   - Accept API key
   - Initialize OpenAI client
   - Set default model from ProviderRegistry
4. Implement `getProviderInfo()`:
   - Return provider metadata (id: 'openai', name: 'OpenAI', etc.)
5. Implement `createAiRequest(params, options)`:
   - Build system and user prompts using PromptBuilder
   - Include function definitions using FunctionCallAdapter
   - Make OpenAI API call with streaming support (using `stream: true`)
   - Handle streaming tokens via `options.onStreamToken`
   - Handle function calls in responses
   - Return normalized response
   - **Sanitize error payloads before normalizing** (strip sensitive data)
6. Implement `addMessage(aiRequestId, params, options)`:
   - Add message to conversation
   - Make follow-up API call
   - Handle streaming and function calls
7. Implement `generateEvents(params, options)`:
   - Use event generation mode
   - Include relevant function definitions
   - Parse function calls from response
   - Execute function calls on project
8. Add abort signal support for cancellation:
   - Pass `options.abortSignal` to OpenAI SDK
   - Test that AbortController.abort() properly cancels in-flight requests
9. Wrap all API calls with error normalization

**Deliverable:** `OpenAIProvider.js` with complete implementation

**Estimated Time:** 2 hours

**Files Modified:**
- None (new file only)

**Validation:**
- [ ] Provider implements all AIProviderInterface methods
- [ ] Can create AI requests with OpenAI
- [ ] Can add messages to conversations
- [ ] Can generate events
- [ ] Streaming works (tokens arrive incrementally)
- [ ] Function calling works
- [ ] Cancellation works (abort signal)
- [ ] Errors are normalized
- [ ] Flow types pass

---

### Task 3.2: Add OpenAI Provider to useAIService Hook (30 min)
**Goal:** Enable OpenAI provider selection in the app

**Prerequisites:**
- **Verify Phase 1 completion:** Confirm that call-site injections were completed in Phase 1
  - `AskAiEditorContainer.js` should use `const aiService = useAIService()`
  - `UseGenerateEvents.js` should use `const aiService = useAIService()`
  - If NOT completed in Phase 1, add these injections as part of this task

**Steps:**
1. Modify `CustomAI/useAIService.js`
2. Import OpenAIProvider
3. Add provider instantiation logic:
   ```javascript
   if (settings.enabled && settings.provider === 'openai') {
     const apiKey = await SecureStorage.getApiKey('openai');
     if (!apiKey) {
       // NO SILENT FALLBACK - Show error and require explicit user action
       throw new Error(
         'OpenAI API key not configured. Please add your API key in Settings > Custom AI, ' +
         'or switch to GDevelop backend provider.'
       );
     }
     return new AIService(new OpenAIProvider(apiKey, settings.model));
   }
   // Only use GDevelop backend if explicitly selected or custom AI disabled
   return new AIService(new GDevelopProvider());
   ```
4. Handle provider switching (re-instantiate when settings change)
5. Add error handling for missing API key (surface to UI, don't fallback silently)

**Deliverable:** Modified `useAIService.js` with OpenAI support (no silent fallback)

**Estimated Time:** 30 minutes

**Files Modified:**
- `newIDE/app/src/CustomAI/useAIService.js` (~20 lines)
- **If Phase 1 incomplete:** `AskAiEditorContainer.js` (~3 lines), `UseGenerateEvents.js` (~3 lines)

**Validation:**
- [ ] Can select OpenAI provider in settings
- [ ] OpenAI provider is instantiated correctly
- [ ] API key is loaded from SecureStorage
- [ ] **Error shown if API key missing (NO silent fallback to GDevelop)**
- [ ] Provider switches when settings change
- [ ] Call sites use `aiService` instead of direct `Generation.js` calls

---

### Task 3.3: Add Asset Search Support (1 hour)
**Goal:** Enable OpenAI for asset search (if applicable from Phase 1 audit)

**Steps:**
1. Review findings from Phase 1 Task 1.2 (Asset Search Investigation)
2. If asset search uses AI:
   - Implement `searchAssets(params, options)` in OpenAIProvider
   - Build appropriate prompts for asset search
   - Parse and format results
3. If asset search doesn't use AI:
   - Skip this task and document decision

**Deliverable:** Asset search support (or documented skip)

**Estimated Time:** 1 hour (or 0 if not applicable)

**Validation:**
- [ ] Asset search works with OpenAI (if applicable)
- [ ] Results are formatted correctly
- [ ] Decision documented if not applicable

---

## Task Group 4: Testing & Validation (2-3 hours)

### Task 4.1: End-to-End Testing with OpenAI (1.5 hours)
**Goal:** Verify all AI features work with OpenAI

**Prerequisites:** Valid OpenAI API key for testing

**Steps:**
1. Configure OpenAI in settings:
   - Enable custom AI
   - Select OpenAI provider
   - Enter API key
   - Select model (gpt-4-turbo)
2. **Verify subscription bypass:**
   - **Confirm AI features are accessible in UI without GDevelop authentication**
   - **Confirm no subscription checks block AI features when custom AI enabled**
   - Verify provider status indicator shows "OpenAI" (or similar badge)
3. Test AI chat:
   - Create new AI request
   - Send messages
   - Verify streaming works
   - Verify responses are coherent
4. Test event generation:
   - Request event creation
   - Verify function calls are made
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
   - Verify request aborts cleanly
8. **Verify provider indicator:**
   - Check that UI shows active provider (OpenAI)
   - Switch to GDevelop backend, verify indicator updates

**Deliverable:** Validated OpenAI integration

**Estimated Time:** 1.5 hours

**Validation:**
- [ ] **AI features accessible without GDevelop authentication/subscription**
- [ ] **Provider status indicator shows correct provider (OpenAI)**
- [ ] AI chat works with OpenAI
- [ ] Event generation works with OpenAI
- [ ] Asset search works with OpenAI (if applicable)
- [ ] Function calling works (objects/events created)
- [ ] Streaming responses work
- [ ] Cancellation works
- [ ] Error messages are helpful
- [ ] No API keys in logs or errors
- [ ] **No silent fallback to GDevelop (errors shown, user must take action)**

---

### Task 4.2: Performance & Cost Validation (1 hour)
**Goal:** Ensure OpenAI integration is performant and cost-effective

**Steps:**
1. Test token counting accuracy:
   - Send requests with known token counts
   - Verify TokenCounter estimates match OpenAI's actual usage
2. Test context limit enforcement:
   - Create large project context
   - Verify warning shown when approaching limit
   - Verify request blocked if over limit
3. Test cost estimation:
   - Make several requests
   - Compare estimated costs to actual OpenAI billing
   - Verify ProviderRegistry pricing is accurate
4. Test response times:
   - Measure time to first token (streaming)
   - Measure total request time
   - Compare to GDevelop backend (should be <2x)
5. Test rate limiting:
   - Make rapid requests
   - Verify rate limit errors are handled
   - Verify retry suggestions are shown

**Deliverable:** Performance and cost validation report

**Estimated Time:** 1 hour

**Validation:**
- [ ] Token counting is accurate (within 5% of actual)
- [ ] Context limits are enforced
- [ ] Cost estimation is accurate (within 10% of actual)
- [ ] Response times are acceptable (<2x GDevelop backend)
- [ ] Rate limiting is handled gracefully

---

## Phase 2 Completion Checklist

Before moving to Phase 3, verify:

**Core Implementation:**
- [ ] ErrorNormalizer handles all error types
- [ ] TokenCounter accurately counts tokens for OpenAI models
- [ ] PromptBuilder creates appropriate prompts for all modes
- [ ] FunctionCallAdapter handles all GDevelop operations
- [ ] OpenAIProvider implements all AIProviderInterface methods

**Integration:**
- [ ] OpenAI provider can be selected in settings
- [ ] API key is loaded from SecureStorage
- [ ] Provider switches without restart
- [ ] All AI features work with OpenAI (chat, events, asset search)

**Function Calling:**
- [ ] Can create scenes via function calls
- [ ] Can add objects via function calls
- [ ] Can add behaviors via function calls
- [ ] Can create events via function calls
- [ ] Function call errors are handled gracefully

**Streaming & Cancellation:**
- [ ] Streaming responses work (tokens arrive incrementally)
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

**Performance & Cost:**
- [ ] Token counting is accurate (within 5%)
- [ ] Context limits are enforced
- [ ] Cost estimation is accurate (within 10%)
- [ ] Response times are acceptable (<2x GDevelop)
- [ ] Rate limiting is handled gracefully

**Security:**
- [ ] API keys never in logs or error messages
- [ ] API keys never sent to GDevelop servers
- [ ] API keys are masked in UI
- [ ] Errors don't expose sensitive data

**Testing:**
- [ ] All existing AI features still work with GDevelop backend
- [ ] All AI features work with OpenAI
- [ ] Flow types pass (`yarn flow`)
- [ ] No console errors
- [ ] No regressions in existing functionality

**Documentation:**
- [ ] OpenAI setup documented
- [ ] Function calling behavior documented
- [ ] Error handling documented
- [ ] Any deviations from plan documented

---

## Recommended Work Sessions

**Session 1 (2 hours):** Tasks 1.1, 1.2 (ErrorNormalizer + TokenCounter)
**Session 2 (2 hours):** Tasks 1.3, 1.4 (PromptBuilder + Utility tests)
**Session 3 (2 hours):** Task 2.1 (FunctionCallAdapter)
**Session 4 (30 min):** Task 2.2 (Function calling tests)
**Session 5 (2.5 hours):** Task 3.1, 3.2 (OpenAIProvider + integration)
**Session 6 (1 hour):** Task 3.3 (Asset search)
**Session 7 (2.5 hours):** Tasks 4.1, 4.2 (Testing & validation)

**Total: 7 sessions, ~12.5 hours**

---

## Commit Strategy

Commit after each task group:
- `feat: add error normalization and token counting utilities`
- `feat: implement function calling adapter for OpenAI`
- `feat: implement OpenAI provider with streaming support`
- `feat: add comprehensive testing for OpenAI integration`

This way, you can sync with upstream after each commit without losing much work.

---

## Dependencies & Installation

**NPM Packages to Install:**
```bash
yarn add openai           # OpenAI SDK
yarn add @dqbd/tiktoken   # Token counting for OpenAI models (uses WASM)
```

**Fallback options if @dqbd/tiktoken has bundling issues in Electron:**
```bash
yarn add gpt-3-encoder    # Alternative token counter (simpler, no WASM)
# Or implement conservative estimation based on character count
```

**Note:** The `@dqbd/tiktoken` package uses WebAssembly and may require webpack configuration. If you encounter bundling issues, use the fallback options above.

---

## Next Steps After Phase 2

Once Phase 2 is complete:
1. **Sync with upstream** to catch any conflicts early
2. **Test thoroughly** with real projects
3. **Document any issues** or deviations
4. **Proceed to Phase 3** (Anthropic integration) or
5. **Polish Phase 1+2** if issues found

**Success Criteria:** All AI features work with OpenAI, no regressions, <10 files modified total.

