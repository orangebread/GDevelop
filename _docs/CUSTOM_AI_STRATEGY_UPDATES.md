# Custom AI Strategy Updates - Feedback Integration

**Date:** 2025-10-02  
**Document:** Response to validation feedback on CUSTOM_AI_API_KEYS_STRATEGY.md

---

## Summary of Changes

Based on the comprehensive validation feedback, the following critical gaps and issues have been addressed in the strategy document:

---

## 1. AI Feature Gating & Authentication Checks ✅

### Issue Identified
The original plan stated "No GDevelop authentication required" but didn't specify how to bypass existing subscription/auth gates in the UI.

### Resolution
- **Added "AI Feature Gating Audit"** as a critical Phase 1 deliverable
- Created detailed checklist to identify all gating points:
  - `hasValidSubscriptionPlan()` checks
  - `SubscriptionChecker` usage
  - Quota checks (`limits.quotas['ai-request']`)
  - Credit checks
  - UI components that hide/disable AI features
- **New helper function:** `shouldEnableAIFeature()` that returns true if custom AI enabled OR subscription valid
- Updated Phase 1 timeline from 12 hours to 15 hours to account for this audit

### Files to Investigate
- `newIDE/app/src/Profile/Subscription/SubscriptionChecker.js`
- Any components checking `hasValidSubscriptionPlan()` for AI features
- UI components in `AiGeneration/` directory

---

## 2. Asset Search/Recommendations Injection Points ✅

### Issue Identified
Functional requirements include asset search, but injection points only covered chat and event generation.

### Resolution
- **Added asset search investigation** to Phase 1 audit checklist
- Updated modified files list to include asset search injection points
- Added tasks to:
  - Search for `searchAssetsByAI` or similar functions
  - Check if asset search uses `Generation.js` or separate endpoints
  - Document asset search flow
  - Add asset search methods to AIService interface if needed

### Investigation Required
- Search `AssetStore/` directory for AI-related calls
- Check `Utils/GDevelopServices/Generation.js` for asset search functions
- Verify if asset search uses same AI backend as chat/events

---

## 3. Generation.js Modification Clarification ✅

### Issue Identified
Inconsistency: Early sections listed `Generation.js` as modified, but Option D plan said it wouldn't be touched.

### Resolution
- **Clarified:** `Generation.js` is NOT modified under Option D (Service Layer approach)
- Added explicit note: "Generation.js is NOT modified - it's wrapped by GDevelopProvider"
- GDevelopProvider acts as adapter, calling existing `Generation.js` functions
- Only injection points (call sites) are modified, not the underlying API layer

---

## 4. Streaming and Cancellation Support ✅

### Issue Identified
No mention of streaming responses or request cancellation, which existing AI features likely use.

### Resolution
- **Updated AIService interface** to support:
  - `abortSignal` parameter for cancellation
  - `onStreamToken` callback for partial token streaming
  - `onStreamMessage` callback for complete message streaming
- Added streaming/cancellation to testing criteria for Phase 2
- Created **Appendix D** with complete interface specification and usage examples
- Updated architecture diagrams to show streaming support

### Implementation Notes
```javascript
const aiRequest = await aiService.createAiRequest(
  params,
  {
    abortSignal: abortController.signal,
    onStreamToken: (token) => updateUI(token),
    onStreamMessage: (message) => handleComplete(message)
  }
);
```

---

## 5. Error Normalization Across Providers ✅

### Issue Identified
Need consistent error taxonomy across providers for uniform UI behavior.

### Resolution
- **Created ErrorNormalizer.js** utility (added to file creation list)
- Defined **standard error taxonomy** in Appendix C:
  - `INVALID_API_KEY`, `EXPIRED_API_KEY`
  - `RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`
  - `MODEL_NOT_FOUND`, `CONTEXT_TOO_LARGE`
  - `CONTENT_POLICY_VIOLATION`
  - `NETWORK_ERROR`, `TIMEOUT`, `SERVICE_UNAVAILABLE`
- Created `NormalizedAIError` class with:
  - `isRetryable()` method
  - `getUserMessage()` for user-friendly messages
- Provider-specific error mapping functions
- Added error normalization to Phase 2 testing criteria

---

## 6. Provider-Specific Token Limits and Cost Handling ✅

### Issue Identified
"Max 100k tokens" is too generic - limits are provider and model-specific.

### Resolution
- **Created ProviderRegistry.js** (added to Phase 1 deliverables)
- Registry includes per-model metadata:
  - `contextWindow` (e.g., 128k for GPT-4, 200k for Claude 3.5)
  - `maxOutputTokens`
  - `pricing` (input/output per 1k tokens)
  - `supportsStreaming`, `supportsFunctionCalling`
  - `deprecated` flag
- **Created TokenCounter.js** for provider-specific tokenization:
  - Uses `tiktoken` for OpenAI
  - Uses Anthropic's tokenizer for Claude
- Updated cost estimation to be model-aware
- Added **Appendix B** with complete registry structure

### Benefits
- No hardcoded model names (easy to update when providers change)
- Accurate cost estimation per model
- Proper context limit enforcement
- Model deprecation warnings

---

## 7. Secure API Key Storage Enhancements ✅

### Issue Identified
Need more robust key storage with fallbacks and comprehensive security measures.

### Resolution
- **Enhanced SecureStorage.js** requirements:
  - Primary: Electron's `safeStorage` (OS-level encryption)
  - Fallback: `keytar` library if safeStorage unavailable
  - Never use Redux, localStorage, or any unencrypted storage
- **Comprehensive security checklist:**
  - Mask keys in all UI (show only `sk-...xyz123`)
  - Never log full keys (only last 4 chars)
  - Strip keys from error messages and stack traces
  - Zero out key strings in memory after use
  - Never send keys to GDevelop servers (even in analytics)
  - Add pre-commit hooks to scan for keys (e.g., `gitleaks`)
- Added explicit testing criteria for key security
- Updated Risk #2 mitigation strategy with detailed measures

---

## 8. Type System Alignment (Flow vs TypeScript) ✅

### Issue Identified
Document mentioned TypeScript interfaces, but GDevelop uses Flow.

### Resolution
- **Added constraint:** "GDevelop uses Flow, not TypeScript - use Flow types or JSDoc"
- All code examples should use Flow type annotations
- Avoid introducing TypeScript to prevent build complexity
- Use JSDoc comments for documentation where Flow types insufficient

### Example
```javascript
// @flow
export class AIService {
  provider: AIProviderInterface;
  
  constructor(provider: AIProviderInterface) {
    this.provider = provider;
  }
  
  async createAiRequest(
    params: AiRequestParams,
    options?: {|
      abortSignal?: AbortSignal,
      onStreamToken?: (token: string) => void,
    |}
  ): Promise<AiRequest> {
    // ...
  }
}
```

---

## 9. Provider/Model Naming Robustness ✅

### Issue Identified
Avoid hardcoded, potentially EOL model names like "GPT-3.5".

### Resolution
- **ProviderRegistry** centralizes all model names and metadata
- Models include `deprecated` flag for EOL warnings
- Registry can be updated without code changes
- UI can show deprecation warnings to users
- Easy to add new models or remove old ones

### Example
```javascript
'gpt-3.5-turbo': {
  displayName: 'GPT-3.5 Turbo',
  deprecated: false,  // Set to true when OpenAI deprecates
  // ... other metadata
}
```

---

## 10. Explicit Fallback Behavior (No Silent Fallbacks) ✅

### Issue Identified
"Seamless fallback to GDevelop backend" could silently send data to GDevelop servers without user knowledge.

### Resolution
- **Removed "seamless fallback"** from functional requirements
- **New requirement:** "No silent fallback to GDevelop backend"
- **Explicit user control:** User must opt-in to any fallback behavior in settings
- If custom AI fails, show error - don't silently switch to GDevelop
- Added to user experience requirements:
  - Clear indication of which provider is active (status badge)
  - Explicit opt-in required for fallback
- Updated testing criteria to verify no silent fallbacks

### Rationale
Prevents accidental data leakage to GDevelop servers when user expects to use only their own API keys.

---

## 11. Updated Timeline and Effort Estimates

### Phase 1 (Foundation)
- **Old:** 12 hours
- **New:** 15 hours
- **Reason:** Added AI feature gating audit, ProviderRegistry, SecureStorage enhancements

### Total Estimated Effort
- **Old:** 38-48 hours
- **New:** 41-51 hours
- **Reason:** Additional security measures, error normalization, streaming support

---

## 12. New Appendices Added

### Appendix B: Provider Registry Structure
- Complete registry schema
- Helper functions for model metadata and cost estimation
- Benefits and usage examples

### Appendix C: Error Taxonomy
- Standard error codes across providers
- `NormalizedAIError` class specification
- Provider-specific error mapping
- User-friendly error messages

### Appendix D: Streaming and Cancellation Interface
- Complete `AIProviderInterface` specification
- Streaming callbacks and abort signal support
- Usage examples with React hooks

---

## 13. Enhanced Testing Criteria

### Phase 1 (Foundation)
- AI features remain visible when custom AI enabled
- SecureStorage handles safeStorage unavailable
- API keys never in Redux/localStorage/logs

### Phase 2 (OpenAI)
- Streaming responses work
- Cancellation works (abort in-flight)
- Token counting accurate (tiktoken)
- Context limits enforced (provider-specific)
- No silent fallback on error
- Asset search works (if applicable)

### Phase 3 (Anthropic)
- Provider-specific token limits enforced
- Error normalization works across providers

---

## Key Takeaways

### What Changed
1. ✅ Added comprehensive AI feature gating audit
2. ✅ Identified asset search injection points
3. ✅ Clarified Generation.js is NOT modified
4. ✅ Added streaming and cancellation support
5. ✅ Created error normalization system
6. ✅ Implemented provider registry for metadata
7. ✅ Enhanced API key security measures
8. ✅ Aligned with Flow type system
9. ✅ Removed silent fallback behavior
10. ✅ Added three detailed appendices

### What Stayed the Same
- ✅ Recommended approach: Option D (Service Layer)
- ✅ Target: <10 files modified
- ✅ All custom code in `CustomAI/` directory
- ✅ 4-phase implementation plan
- ✅ Desktop-first (Electron) focus

### Impact on Maintainability
- **Improved:** Better error handling, security, and provider abstraction
- **Minimal increase in complexity:** ~3 hours added to timeline
- **Better upstream compatibility:** Clearer separation of concerns

---

## Next Steps

1. **Review updated strategy document** (`CUSTOM_AI_API_KEYS_STRATEGY.md`)
2. **Validate assumptions** about asset search (search codebase)
3. **Begin Phase 1** with AI feature gating audit
4. **Set up development environment** and create feature branch
5. **Implement ProviderRegistry** and SecureStorage first (foundational)

---

*All feedback has been incorporated. Strategy is now more robust, secure, and maintainable.*

