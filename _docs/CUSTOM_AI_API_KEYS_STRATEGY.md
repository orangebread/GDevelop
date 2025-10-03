# Strategic Plan: Custom AI API Key Support for GDevelop Fork

**Document Version:** 1.0  
**Created:** 2025-10-02  
**Target:** Personal GDevelop fork with upstream sync compatibility  
**Author:** Fork Maintainer

---

## END STATE

### Functional Requirements (What Must Work)

**Core Functionality:**
- ✅ AI chat/agent features work with user-provided API keys (OpenAI, Anthropic)
- ✅ Event generation works with custom AI providers
- ✅ Asset search/recommendations work with custom AI providers
- ✅ No GDevelop authentication required when using custom keys
- ✅ No subscription checks or quota enforcement when using custom keys
- ✅ **Explicit user control:** No silent fallback to GDevelop backend (user must opt-in)
- ✅ AI features remain accessible in UI when custom AI is enabled (bypass subscription gates)

**User Experience:**
- ✅ Simple settings UI to configure AI provider and API key
- ✅ Clear indication of which AI provider is active (status badge in UI)
- ✅ Helpful error messages for API key issues (invalid, rate limited, etc.)
- ✅ Ability to switch between GDevelop backend and custom keys without restart
- ✅ **No silent fallbacks:** If custom AI fails, show error - don't silently use GDevelop backend
- ✅ Explicit opt-in required for any fallback behavior (user must enable in settings)

### Technical Requirements (How It Should Be Architected)

**Architecture Principles:**
- ✅ **Isolation:** All custom AI code in separate, new files (not modifications to existing files)
- ✅ **Injection:** Use dependency injection to swap AI providers at runtime
- ✅ **Minimal Surface Area:** Touch as few existing files as possible (target: <10 files modified)
- ✅ **Feature Flags:** Use runtime flags to enable/disable custom AI features
- ✅ **No Backend Changes:** All logic client-side (no server component needed)

**Code Organization:**
```
newIDE/app/src/CustomAI/           # New directory - all custom code here
├── providers/
│   ├── AIProviderInterface.js     # Abstract interface
│   ├── GDevelopAIProvider.js      # Wrapper for existing backend
│   ├── OpenAIProvider.js          # OpenAI implementation
│   └── AnthropicProvider.js       # Anthropic implementation
├── AIProviderFactory.js           # Provider selection logic
├── CustomAISettings.js            # Settings storage/retrieval
└── CustomAISettingsDialog.js      # UI for configuration
```

**Modified Files (Injection Points):**
- `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` - Use AIService
- `newIDE/app/src/AiGeneration/UseGenerateEvents.js` - Use AIService
- `newIDE/app/src/AssetStore/AssetStoreSearchFilter.js` - Use AIService for asset search (if applicable)
- `newIDE/app/src/MainFrame/Preferences/PreferencesContext.js` - Add custom AI settings
- `newIDE/app/src/MainFrame/Preferences/PreferencesDialog.js` - Add settings UI link
- **Note:** `Generation.js` is NOT modified under Option D - it's wrapped by GDevelopProvider

### Supported AI Providers (Initial Release)

**Phase 1 (MVP):**
- OpenAI (GPT-4, GPT-4-turbo, GPT-3.5-turbo)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)

**Phase 2 (Future):**
- Azure OpenAI
- Local models (Ollama, LM Studio)
- Google Gemini

### Success Metrics

- **Merge Conflict Rate:** <5 files per upstream sync
- **Code Isolation:** >90% of custom code in new files
- **Functional Parity:** 100% of AI features work with custom providers
- **Setup Time:** <5 minutes to configure custom API key
- **Maintenance Burden:** <2 hours per month to keep fork synced

---

## CONTEXT

### Constraints

**Technical Constraints:**
- Must remain compatible with upstream GDevelop for easy syncing
- Desktop-first implementation (Electron app) - web app support optional
- Solo developer - limited time and resources
- No access to GDevelop's backend code or infrastructure
- Must work offline (after initial setup) for local AI providers
- **Type System:** GDevelop uses Flow, not TypeScript - use Flow types or JSDoc for type safety

**Resource Constraints:**
- Development time: ~20-40 hours total (part-time over 2-4 weeks)
- Testing time: ~10 hours
- No budget for infrastructure or services
- No team for code review (self-review only)

**Compatibility Constraints:**
- Must work with current GDevelop version (as of fork date)
- Should gracefully handle upstream API changes
- Existing GDevelop backend must continue to work (for other users of fork)

### Stakeholders

**Primary:** Fork maintainer (you)
- Needs: Working AI features without GDevelop subscription
- Priorities: Maintainability > Features > Performance
- Technical level: Experienced developer

**Secondary:** None (personal fork, not public distribution)

### Risks

**High-Priority Risks:**
1. **Upstream Breaking Changes:** GDevelop refactors AI code, causing massive merge conflicts
2. **API Key Security:** Accidental exposure of API keys in logs, error messages, or commits
3. **Maintenance Burden:** Fork diverges too much, becomes unmaintainable
4. **Provider API Changes:** OpenAI/Anthropic change their APIs, breaking integration
5. **Cost Overruns:** Accidentally expensive API calls due to bugs

**Medium-Priority Risks:**
6. **Feature Parity:** Custom providers can't replicate all GDevelop backend features
7. **Performance:** Client-side AI calls slower than GDevelop's optimized backend
8. **Context Limits:** Large projects exceed AI provider context windows

---

## OPTIONS

### Option A: Wrapper Pattern with Minimal Injection Points

**Description:**
Create a thin wrapper layer that intercepts AI calls at the highest level (AskAiEditorContainer, UseGenerateEvents) and routes them to either GDevelop backend or custom provider based on settings. Existing `Generation.js` functions remain unchanged; wrapper calls them or custom provider.

**Architecture:**
```javascript
// New file: CustomAI/AIProviderRouter.js
export const routeAIRequest = async (requestType, params) => {
  const settings = getCustomAISettings();
  if (settings.useCustomProvider) {
    return customProviders[settings.provider].handleRequest(requestType, params);
  }
  // Fall back to existing GDevelop functions
  return originalGDevelopFunctions[requestType](params);
};

// Modified: AskAiEditorContainer.js (1 line change)
- const aiRequest = await createAiRequest(getAuthorizationHeader, {...});
+ const aiRequest = await routeAIRequest('createAiRequest', {...});
```

**Pros:**
- ✅ **Minimal modifications:** Only 3-5 files need changes (just the call sites)
- ✅ **Easy to merge:** Changes are single-line replacements, unlikely to conflict
- ✅ **Reversible:** Can easily remove wrapper and restore original behavior
- ✅ **Testable:** Can test custom providers independently
- ✅ **Clear separation:** All custom code in new directory

**Cons:**
- ❌ **Duplication:** Need to reimplement request/response transformation logic
- ❌ **Maintenance:** Must keep wrapper in sync with GDevelop's request format changes
- ❌ **Limited reuse:** Can't leverage existing GDevelop helper functions easily

**Estimated Effort:** Medium (15-25 hours)
- 5 hours: Router and provider interface
- 10 hours: OpenAI and Anthropic providers
- 5 hours: Settings UI and storage
- 5 hours: Testing and debugging

---

### Option B: Monkey-Patching with Runtime Override

**Description:**
At app startup, detect if custom AI is enabled and monkey-patch the `Generation.js` functions to use custom providers. No modifications to existing files except adding the patch loader.

**Architecture:**
```javascript
// New file: CustomAI/GenerationPatcher.js
export const patchGenerationFunctions = () => {
  const Generation = require('../Utils/GDevelopServices/Generation');
  const originalCreateAiRequest = Generation.createAiRequest;
  
  Generation.createAiRequest = async (getAuthHeader, params) => {
    if (shouldUseCustomProvider()) {
      return customProvider.createAiRequest(params);
    }
    return originalCreateAiRequest(getAuthHeader, params);
  };
  // Repeat for other functions...
};

// Modified: index.js (1 line at startup)
+ if (isCustomAIEnabled()) patchGenerationFunctions();
```

**Pros:**
- ✅ **Zero modifications:** Existing AI code completely untouched
- ✅ **No merge conflicts:** Patch code is separate, won't conflict with upstream
- ✅ **Dynamic:** Can enable/disable at runtime without rebuild
- ✅ **Fastest implementation:** Just wrap existing functions

**Cons:**
- ❌ **Fragile:** Breaks if GDevelop changes function signatures or module structure
- ❌ **Hard to debug:** Stack traces confusing, monkey-patching is "magic"
- ❌ **Testing difficulty:** Hard to test patched vs unpatched behavior
- ❌ **Code smell:** Generally considered bad practice

**Estimated Effort:** Low (10-15 hours)
- 3 hours: Patcher infrastructure
- 8 hours: Provider implementations
- 2 hours: Settings UI
- 2 hours: Testing

---

### Option C: Fork-Specific Build Flag with Conditional Compilation

**Description:**
Add a build-time flag (`CUSTOM_AI_ENABLED`) that conditionally compiles custom AI code. Use preprocessor-style comments or webpack defines to include/exclude code paths.

**Architecture:**
```javascript
// Modified: Generation.js
export const createAiRequest = async (getAuthorizationHeader, params) => {
  // @if CUSTOM_AI_ENABLED
  if (window.__CUSTOM_AI_SETTINGS__?.enabled) {
    return window.__customAIProvider__.createAiRequest(params);
  }
  // @endif
  
  // Original GDevelop code continues...
  const authorizationHeader = await getAuthorizationHeader();
  // ...
};
```

**Pros:**
- ✅ **Clean integration:** Custom code lives alongside original code
- ✅ **No runtime overhead:** Disabled code not included in build
- ✅ **Easy to maintain:** Clear markers for custom code
- ✅ **Upstream compatible:** Can merge upstream changes, just preserve @if blocks

**Cons:**
- ❌ **Build complexity:** Need custom webpack config or preprocessor
- ❌ **Merge conflicts:** Every modified file is a potential conflict point
- ❌ **Code pollution:** Original files cluttered with conditional blocks
- ❌ **Testing matrix:** Need to test both builds (with/without flag)

**Estimated Effort:** Medium-High (20-30 hours)
- 5 hours: Build system setup
- 10 hours: Conditional code in existing files
- 8 hours: Provider implementations
- 7 hours: Testing both build configurations

---

### Option D: Proxy Service Layer (Recommended)

**Description:**
Create a new `AIService` abstraction layer that sits between UI components and the actual AI implementation. All AI calls go through this service, which delegates to either GDevelop backend or custom providers. Modify only the service instantiation points.

**Architecture:**
```javascript
// New file: CustomAI/AIService.js
class AIService {
  constructor(provider) {
    this.provider = provider; // GDevelopProvider or CustomProvider
  }

  async createAiRequest(params, options = {}) {
    // Normalize params for provider
    const normalizedParams = this.normalizeParams(params);

    // Support streaming and cancellation
    const { abortSignal, onStreamToken, onStreamMessage } = options;

    const response = await this.provider.createAiRequest(
      normalizedParams,
      { abortSignal, onStreamToken, onStreamMessage }
    );

    return this.normalizeResponse(response);
  }

  // Other AI methods...
}

// Modified: AskAiEditorContainer.js (inject service)
const aiService = useAIService(); // Hook that returns configured service
const abortController = new AbortController();
const aiRequest = await aiService.createAiRequest(
  {...},
  {
    abortSignal: abortController.signal,
    onStreamToken: (token) => updateUI(token)
  }
);
```

**Pros:**
- ✅ **Clean architecture:** Proper abstraction layer, follows SOLID principles
- ✅ **Testable:** Easy to mock service for testing
- ✅ **Extensible:** Easy to add new providers
- ✅ **Moderate modifications:** Only inject service at component level
- ✅ **Type safety:** Can add TypeScript interfaces for providers
- ✅ **Reusable:** Service can normalize differences between providers

**Cons:**
- ❌ **More code:** Need service layer + provider implementations
- ❌ **Refactoring needed:** Must update all AI call sites to use service
- ❌ **Merge conflicts:** Touching call sites means potential conflicts
- ❌ **Learning curve:** Need to understand service pattern

**Estimated Effort:** Medium-High (25-35 hours)
- 8 hours: Service layer and interfaces
- 10 hours: Provider implementations (GDevelop wrapper + custom)
- 5 hours: Update call sites to use service
- 5 hours: Settings UI and configuration
- 7 hours: Testing and documentation

---

### Option E: Plugin Architecture with Event Bus

**Description:**
Implement a plugin system where custom AI providers register themselves via an event bus. Core GDevelop code emits events for AI requests, and plugins can intercept and handle them.

**Architecture:**
```javascript
// New file: CustomAI/AIPluginSystem.js
const aiEventBus = new EventEmitter();

aiEventBus.on('ai:request', async (event) => {
  if (shouldUseCustomProvider()) {
    event.preventDefault();
    event.result = await customProvider.handle(event.data);
  }
});

// Modified: Generation.js (emit events)
export const createAiRequest = async (getAuthHeader, params) => {
  const event = { data: params, result: null, defaultPrevented: false };
  await aiEventBus.emit('ai:request', event);
  
  if (event.defaultPrevented) return event.result;
  
  // Original GDevelop code...
};
```

**Pros:**
- ✅ **Decoupled:** Plugins completely independent of core code
- ✅ **Extensible:** Easy to add multiple plugins
- ✅ **Minimal changes:** Just add event emissions
- ✅ **Dynamic:** Plugins can be loaded/unloaded at runtime

**Cons:**
- ❌ **Complexity:** Event bus adds indirection and complexity
- ❌ **Debugging:** Hard to trace event flow
- ❌ **Performance:** Event emission overhead
- ❌ **Overkill:** Too complex for single-user fork

**Estimated Effort:** High (30-40 hours)
- 10 hours: Event bus infrastructure
- 10 hours: Plugin system
- 10 hours: Provider plugins
- 10 hours: Testing and debugging

---

## PLAN

### Recommended Approach: **Option D (Proxy Service Layer)**

**Rationale:**
- Best balance of clean architecture and maintainability
- Moderate merge conflict risk (only call sites modified)
- Proper abstraction makes future changes easier
- Testable and debuggable
- Can coexist with upstream changes

### Phase 1: Foundation (Week 1, ~15 hours)

**Deliverables:**
- ✅ **AI Feature Gating Audit** - Identify all subscription/auth checks
- ✅ AIService interface and base implementation (with streaming/cancellation support)
- ✅ GDevelopProvider (wrapper around existing backend)
- ✅ ProviderRegistry (model metadata, limits, pricing)
- ✅ Settings storage in preferences
- ✅ SecureStorage implementation (safeStorage + fallback)
- ✅ Basic settings UI

**Key Files Created:**
```
newIDE/app/src/CustomAI/
├── AIService.js
├── providers/
│   ├── AIProviderInterface.js
│   ├── GDevelopProvider.js
│   ├── ProviderRegistry.js (model metadata, limits, pricing)
│   └── index.js
├── CustomAISettings.js
├── SecureStorage.js (with safeStorage + fallback)
└── useAIService.js (React hook)
```

**Key Files Modified:**
- `newIDE/app/src/MainFrame/Preferences/PreferencesContext.js` (+20 lines)
- `newIDE/app/src/MainFrame/Preferences/PreferencesDialog.js` (+10 lines)
- **AI Feature Gating Audit:** Identify and update subscription/auth checks that gate AI UI
  - `newIDE/app/src/Profile/Subscription/SubscriptionChecker.js` (may need bypass logic)
  - Any components that check `hasValidSubscriptionPlan()` for AI features

**Testing Criteria:**
- [ ] Settings can be saved and loaded
- [ ] GDevelopProvider successfully wraps existing backend
- [ ] AIService correctly delegates to GDevelopProvider
- [ ] No regressions in existing AI features
- [ ] AI features remain visible/accessible when custom AI enabled (subscription gates bypassed)
- [ ] SecureStorage handles safeStorage unavailable gracefully (fallback to keytar or encrypted file)
- [ ] API keys never appear in Redux state, localStorage, or console logs

**AI Feature Gating Audit Checklist:**
- [ ] Locate all `hasValidSubscriptionPlan()` checks related to AI
- [ ] Locate all `SubscriptionChecker` usage for AI features
- [ ] Locate all quota checks (`limits.quotas['ai-request']`)
- [ ] Locate all credit checks for AI features
- [ ] Identify UI components that hide/disable AI based on subscription
- [ ] **Identify asset search AI injection points** (search for `searchAssetsByAI` or similar)
- [ ] Create helper function: `shouldEnableAIFeature()` that checks custom AI OR subscription
- [ ] Update all identified locations to use new helper

**Asset Search Investigation:**
- [ ] Search codebase for asset-related AI calls (likely in `AssetStore/` directory)
- [ ] Check if asset search uses same `Generation.js` functions or separate endpoints
- [ ] Document asset search flow and injection points
- [ ] Add asset search to AIService interface if needed

**Timeline:** 4-5 days (part-time)

---

### Phase 2: OpenAI Integration (Week 2, ~10 hours)

**Deliverables:**
- ✅ OpenAIProvider implementation
- ✅ API key secure storage (Electron safeStorage)
- ✅ Request/response transformation logic
- ✅ Error handling for OpenAI-specific errors

**Key Files Created:**
```
newIDE/app/src/CustomAI/
├── providers/
│   └── OpenAIProvider.js
├── PromptBuilder.js (converts GDevelop context to prompts)
├── FunctionCallAdapter.js (handles function calling, provider-specific formats)
├── ErrorNormalizer.js (maps provider errors to standard taxonomy)
└── TokenCounter.js (provider-specific tokenization, e.g., tiktoken for OpenAI)
```

**Key Files Modified:**
- `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` (~5 lines)
- `newIDE/app/src/AiGeneration/UseGenerateEvents.js` (~3 lines)
- Asset search injection points (to be identified in Phase 1 audit)

**Dependencies:**
- Phase 1 must be complete
- OpenAI API key for testing

**Testing Criteria:**
- [ ] Can create AI chat with OpenAI
- [ ] Event generation works with OpenAI
- [ ] Asset search works with OpenAI (if applicable)
- [ ] Function calling works (create scene, add object, etc.)
- [ ] Streaming responses work (partial tokens displayed)
- [ ] Cancellation works (abort in-flight requests)
- [ ] API key stored securely (not in plaintext, not in Redux/localStorage)
- [ ] Error messages helpful and normalized (invalid key, rate limit, model not found, etc.)
- [ ] Token counting accurate (uses tiktoken or equivalent)
- [ ] Context limits enforced (provider-specific, e.g., 128k for GPT-4)
- [ ] No silent fallback to GDevelop backend on error

**Timeline:** 4-5 days (part-time)

---

### Phase 3: Anthropic Integration (Week 3, ~8 hours)

**Deliverables:**
- ✅ AnthropicProvider implementation
- ✅ Claude-specific prompt formatting
- ✅ Provider selection UI
- ✅ Provider switching without restart

**Key Files Created:**
```
newIDE/app/src/CustomAI/
├── providers/
│   └── AnthropicProvider.js
└── CustomAISettingsDialog.js (full UI)
```

**Key Files Modified:**
- `newIDE/app/src/MainFrame/Preferences/PreferencesDialog.js` (link to settings)

**Dependencies:**
- Phase 2 complete
- Anthropic API key for testing

**Testing Criteria:**
- [ ] Can switch between OpenAI and Anthropic
- [ ] All AI features work with Claude
- [ ] Function calling works with Anthropic's format (different from OpenAI)
- [ ] Can switch providers without restart
- [ ] Provider-specific token limits enforced (e.g., 200k for Claude 3.5 Sonnet)
- [ ] Error normalization works across both providers

**Timeline:** 3-4 days (part-time)

---

### Phase 4: Polish & Documentation (Week 4, ~8 hours)

**Deliverables:**
- ✅ Comprehensive error handling
- ✅ Usage documentation (README)
- ✅ Migration guide from GDevelop backend
- ✅ Troubleshooting guide
- ✅ Security best practices doc

**Key Files Created:**
```
_docs/
├── CUSTOM_AI_SETUP.md
├── CUSTOM_AI_TROUBLESHOOTING.md
└── CUSTOM_AI_SECURITY.md
```

**Testing Criteria:**
- [ ] All error scenarios handled gracefully
- [ ] Documentation complete and accurate
- [ ] Can set up custom AI from scratch in <5 minutes
- [ ] No API keys in logs or error messages

**Timeline:** 3-4 days (part-time)

---

### Modified Files Summary

**Total Modified Files:** 6-8 (target: <10 ✅)

**High Conflict Risk (touch frequently in upstream):**
- `AskAiEditorContainer.js` - Inject AIService
- `UseGenerateEvents.js` - Inject AIService

**Medium Conflict Risk:**
- `PreferencesContext.js` - Add custom AI settings
- `PreferencesDialog.js` - Add settings link

**Low Conflict Risk:**
- `index.js` - Initialize custom AI (if needed)

**New Files (No Conflict Risk):** ~15 files in `CustomAI/` directory

---

## DECISION RULES

### Choosing Between Options

**Use Option A (Wrapper Pattern) if:**
- You want absolute minimal modifications (<5 files)
- You're okay with some code duplication
- You prioritize easy upstream merging above all else

**Use Option B (Monkey-Patching) if:**
- You want zero modifications to existing files
- You're comfortable with runtime patching
- You need fastest implementation time

**Use Option D (Service Layer) if:** ⭐ **RECOMMENDED**
- You want clean, maintainable architecture
- You're okay with moderate modifications (6-8 files)
- You plan to maintain this fork long-term
- You value testability and extensibility

**Use Option E (Plugin System) if:**
- You plan to support many providers
- You want maximum extensibility
- You have time for complex implementation

### Success Metrics

**Must Achieve (Go/No-Go):**
- ✅ All AI features work with custom providers
- ✅ No API keys exposed in logs or errors
- ✅ Can sync with upstream with <10 merge conflicts per month

**Should Achieve (Quality Targets):**
- ✅ Setup time <5 minutes
- ✅ Response time <2x GDevelop backend
- ✅ Code coverage >70% for custom AI code

**Nice to Have:**
- ✅ Support for local AI models
- ✅ Cost tracking per API call
- ✅ Automatic provider fallback

### Fallback Strategies

**If merge conflicts become unmanageable:**
1. Switch to Option A (Wrapper Pattern) - fewer touch points
2. Maintain a separate branch for custom AI, cherry-pick upstream changes
3. Use git rerere to remember conflict resolutions

**If provider APIs change frequently:**
1. Add version detection and multi-version support
2. Pin to specific API versions
3. Add adapter layer to isolate API changes

**If performance is too slow:**
1. Add caching layer for repeated requests
2. Implement request batching
3. Use streaming responses for better perceived performance

---

## RISKS + MITIGATIONS

### Risk 1: Upstream Breaking Changes in AI Code

**Likelihood:** High  
**Impact:** High  
**Description:** GDevelop refactors AI implementation, causing massive merge conflicts or breaking custom AI integration.

**Mitigation Strategy:**
- Monitor GDevelop's GitHub for AI-related PRs/issues
- Subscribe to notifications for files in `AiGeneration/` directory
- Keep custom code isolated in separate directory
- Use service layer to abstract upstream changes
- Maintain compatibility shims for API changes

**Early Warning Signs:**
- Large PRs touching `Generation.js` or `AskAiEditorContainer.js`
- New AI features announced in GDevelop changelog
- Changes to `AiRequest` or `AiConfiguration` types

**Contingency Plan:**
- If breaking change detected, pause upstream sync
- Analyze changes and update service layer
- Test thoroughly before merging
- If too complex, temporarily disable custom AI and use GDevelop backend

---

### Risk 2: API Key Exposure

**Likelihood:** Medium  
**Impact:** Critical  
**Description:** API keys accidentally logged, committed to git, or exposed in error messages, leading to unauthorized usage and costs.

**Mitigation Strategy:**
- Use Electron's safeStorage for encryption at rest (with fallback to keytar if unavailable)
- Never log full API keys (only last 4 characters: `sk-...xyz123`)
- Never store keys in Redux state, localStorage, or any unencrypted storage
- Add `.gitignore` rules for config files containing keys
- Implement key rotation mechanism in UI
- Add pre-commit hooks to scan for keys (e.g., `gitleaks`)
- Sanitize all error messages before display (strip keys from stack traces)
- Mask keys in all UI displays (show only `sk-...xyz123`)
- Zero out key strings in memory after use where practical
- Never send keys to GDevelop servers (even in error reports or analytics)
- Add explicit warnings in UI about key security

**Early Warning Signs:**
- API key appears in console logs
- Unexpected API usage/costs
- Error messages contain sensitive data

**Contingency Plan:**
- Immediately rotate compromised keys
- Review all code for logging statements
- Add automated key scanning to CI/CD
- Implement key masking in all UI displays

---

### Risk 3: Maintenance Burden Becomes Unsustainable

**Likelihood:** Medium  
**Impact:** High  
**Description:** Fork diverges too much from upstream, making syncs take hours and introducing bugs.

**Mitigation Strategy:**
- Limit modifications to <10 files
- Keep all custom code in separate directory
- Document all modifications clearly
- Automate testing with CI/CD
- Sync with upstream at least monthly
- Use feature flags to disable custom AI if needed

**Early Warning Signs:**
- Sync taking >2 hours
- >10 merge conflicts per sync
- Bugs appearing after upstream merges
- Falling >3 months behind upstream

**Contingency Plan:**
- Reduce scope (drop Anthropic, keep only OpenAI)
- Switch to simpler architecture (Option A or B)
- Accept longer sync intervals (quarterly instead of monthly)
- Consider contributing changes upstream (if GDevelop interested)

---

### Risk 4: Provider API Changes Break Integration

**Likelihood:** Medium  
**Impact:** Medium  
**Description:** OpenAI or Anthropic change their APIs (deprecate models, change function calling format, etc.), breaking custom AI features.

**Mitigation Strategy:**
- Pin to specific API versions in requests
- Monitor provider changelogs and deprecation notices
- Implement version detection and multi-version support
- Add automated tests against provider APIs
- Maintain fallback to older API versions

**Early Warning Signs:**
- Provider deprecation notices
- API errors with new error codes
- Features suddenly stop working
- Provider SDK updates with breaking changes

**Contingency Plan:**
- Quickly update to new API version
- Temporarily disable affected features
- Fall back to GDevelop backend
- Add adapter layer for API version differences

---

### Risk 5: Cost Overruns from Bugs

**Likelihood:** Low  
**Impact:** Medium  
**Description:** Bugs cause infinite loops, repeated requests, or sending huge contexts, leading to unexpected API costs.

**Mitigation Strategy:**
- Implement request rate limiting (max 10/minute per provider)
- Add provider-specific context size limits (use ProviderRegistry for limits)
  - OpenAI GPT-4: 128k tokens max
  - Anthropic Claude 3.5: 200k tokens max
  - Use provider-specific tokenizers (tiktoken for OpenAI, Anthropic's tokenizer)
- Implement cost estimation before requests (model-aware pricing from ProviderRegistry)
- Add usage tracking and alerts (track tokens and estimated cost per session)
- Set up provider billing alerts (in OpenAI/Anthropic dashboards)
- Test thoroughly with small contexts first
- Warn user before sending large contexts (>50k tokens)

**Early Warning Signs:**
- Unusually high API usage
- Provider billing alerts
- Slow response times
- Repeated identical requests in logs

**Contingency Plan:**
- Immediately disable custom AI
- Review logs for problematic requests
- Add circuit breaker pattern
- Implement request deduplication
- Add manual approval for large requests

---

## APPENDIX: File Modification Checklist

### Files to Modify (Service Layer Approach)

**Injection Points (High Priority):**
- [ ] `newIDE/app/src/AiGeneration/AskAiEditorContainer.js`
  - Add: `const aiService = useAIService();`
  - Replace: `createAiRequest()` calls with `aiService.createAiRequest()`
  - Replace: `addMessageToAiRequest()` calls with `aiService.addMessage()`

- [ ] `newIDE/app/src/AiGeneration/UseGenerateEvents.js`
  - Add: `const aiService = useAIService();`
  - Replace: `createAiGeneratedEvent()` with `aiService.generateEvents()`

**Settings Integration:**
- [ ] `newIDE/app/src/MainFrame/Preferences/PreferencesContext.js`
  - Add: `customAI` settings object to `PreferencesValues` type
  - Add: Getter/setter methods for custom AI settings

- [ ] `newIDE/app/src/MainFrame/Preferences/PreferencesDialog.js`
  - Add: Link to Custom AI settings dialog

**Optional (Low Priority):**
- [ ] `newIDE/app/src/MainFrame/index.js`
  - Add: Initialize custom AI service on app startup (if needed)

### Files to Create (No Conflicts)

**Core Service Layer:**
- [ ] `newIDE/app/src/CustomAI/AIService.js`
- [ ] `newIDE/app/src/CustomAI/useAIService.js`
- [ ] `newIDE/app/src/CustomAI/CustomAISettings.js`

**Provider Implementations:**
- [ ] `newIDE/app/src/CustomAI/providers/AIProviderInterface.js`
- [ ] `newIDE/app/src/CustomAI/providers/GDevelopProvider.js`
- [ ] `newIDE/app/src/CustomAI/providers/OpenAIProvider.js`
- [ ] `newIDE/app/src/CustomAI/providers/AnthropicProvider.js`

**Utilities:**
- [ ] `newIDE/app/src/CustomAI/PromptBuilder.js`
- [ ] `newIDE/app/src/CustomAI/FunctionCallAdapter.js`
- [ ] `newIDE/app/src/CustomAI/SecureStorage.js`
- [ ] `newIDE/app/src/CustomAI/ErrorNormalizer.js`
- [ ] `newIDE/app/src/CustomAI/TokenCounter.js`
- [ ] `newIDE/app/src/CustomAI/providers/ProviderRegistry.js`

**UI Components:**
- [ ] `newIDE/app/src/CustomAI/CustomAISettingsDialog.js`
- [ ] `newIDE/app/src/CustomAI/ProviderSelector.js`
- [ ] `newIDE/app/src/CustomAI/APIKeyInput.js`

**Documentation:**
- [ ] `_docs/CUSTOM_AI_SETUP.md`
- [ ] `_docs/CUSTOM_AI_TROUBLESHOOTING.md`
- [ ] `_docs/CUSTOM_AI_SECURITY.md`

---

## Next Steps

1. **Review this plan** and adjust based on your priorities
2. **Set up development environment** (fork GDevelop, install dependencies)
3. **Create feature branch** (`feature/custom-ai-providers`)
4. **Start Phase 1** (Foundation) - aim for 1 week completion
5. **Test thoroughly** after each phase before proceeding
6. **Document as you go** - don't leave docs for the end
7. **Sync with upstream** after each phase to catch conflicts early

**Estimated Total Time:** 38-48 hours over 3-4 weeks (part-time)

**Success Criteria:** All AI features work with OpenAI/Anthropic, <10 files modified, <5 merge conflicts per upstream sync.

---

## APPENDIX B: Provider Registry Structure

### Purpose
Centralize provider-specific metadata to avoid hardcoding model names, limits, and pricing throughout the codebase. Makes it easy to update when providers change their offerings.

### Structure

```javascript
// CustomAI/providers/ProviderRegistry.js
export const PROVIDER_REGISTRY = {
  openai: {
    name: 'OpenAI',
    models: {
      'gpt-4-turbo': {
        displayName: 'GPT-4 Turbo',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        pricing: {
          input: 0.01,  // per 1k tokens
          output: 0.03,
        },
        supportsStreaming: true,
        supportsFunctionCalling: true,
        functionCallingFormat: 'openai',
        deprecated: false,
      },
      'gpt-4': {
        displayName: 'GPT-4',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        pricing: { input: 0.03, output: 0.06 },
        supportsStreaming: true,
        supportsFunctionCalling: true,
        functionCallingFormat: 'openai',
        deprecated: false,
      },
      'gpt-3.5-turbo': {
        displayName: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        maxOutputTokens: 4096,
        pricing: { input: 0.0005, output: 0.0015 },
        supportsStreaming: true,
        supportsFunctionCalling: true,
        functionCallingFormat: 'openai',
        deprecated: false,
      },
    },
    defaultModel: 'gpt-4-turbo',
    tokenizerType: 'tiktoken',
    apiEndpoint: 'https://api.openai.com/v1',
  },
  anthropic: {
    name: 'Anthropic',
    models: {
      'claude-3-5-sonnet-20241022': {
        displayName: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutputTokens: 8192,
        pricing: { input: 0.003, output: 0.015 },
        supportsStreaming: true,
        supportsFunctionCalling: true,
        functionCallingFormat: 'anthropic',
        deprecated: false,
      },
      'claude-3-opus-20240229': {
        displayName: 'Claude 3 Opus',
        contextWindow: 200000,
        maxOutputTokens: 4096,
        pricing: { input: 0.015, output: 0.075 },
        supportsStreaming: true,
        supportsFunctionCalling: true,
        functionCallingFormat: 'anthropic',
        deprecated: false,
      },
    },
    defaultModel: 'claude-3-5-sonnet-20241022',
    tokenizerType: 'anthropic',
    apiEndpoint: 'https://api.anthropic.com/v1',
  },
};

// Helper functions
export const getProviderModels = (providerId) => PROVIDER_REGISTRY[providerId]?.models || {};
export const getModelMetadata = (providerId, modelId) => PROVIDER_REGISTRY[providerId]?.models[modelId];
export const estimateCost = (providerId, modelId, inputTokens, outputTokens) => {
  const model = getModelMetadata(providerId, modelId);
  if (!model) return null;
  return (inputTokens / 1000) * model.pricing.input + (outputTokens / 1000) * model.pricing.output;
};
```

### Benefits
- ✅ Single source of truth for model metadata
- ✅ Easy to update when providers add/remove models
- ✅ Enables accurate cost estimation
- ✅ Supports model deprecation warnings
- ✅ Facilitates model selection UI

---

## APPENDIX C: Error Taxonomy

### Purpose
Normalize errors across providers so UI can handle them consistently.

### Standard Error Codes

```javascript
// CustomAI/ErrorNormalizer.js
export const AI_ERROR_CODES = {
  // Authentication errors
  INVALID_API_KEY: 'invalid_api_key',
  EXPIRED_API_KEY: 'expired_api_key',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  QUOTA_EXCEEDED: 'quota_exceeded',

  // Model/request errors
  MODEL_NOT_FOUND: 'model_not_found',
  CONTEXT_TOO_LARGE: 'context_too_large',
  INVALID_REQUEST: 'invalid_request',

  // Policy violations
  CONTENT_POLICY_VIOLATION: 'content_policy_violation',

  // Network/infrastructure
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  SERVICE_UNAVAILABLE: 'service_unavailable',

  // Unknown
  UNKNOWN_ERROR: 'unknown_error',
};

export class NormalizedAIError extends Error {
  constructor(code, message, originalError, provider) {
    super(message);
    this.code = code;
    this.originalError = originalError;
    this.provider = provider;
    this.name = 'NormalizedAIError';
  }

  isRetryable() {
    return [
      AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      AI_ERROR_CODES.NETWORK_ERROR,
      AI_ERROR_CODES.TIMEOUT,
      AI_ERROR_CODES.SERVICE_UNAVAILABLE,
    ].includes(this.code);
  }

  getUserMessage() {
    const messages = {
      [AI_ERROR_CODES.INVALID_API_KEY]: 'Invalid API key. Please check your settings.',
      [AI_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please wait a moment and try again.',
      [AI_ERROR_CODES.CONTEXT_TOO_LARGE]: 'Project context is too large for this model. Try a model with a larger context window.',
      // ... etc
    };
    return messages[this.code] || this.message;
  }
}

// Provider-specific error mapping
export const normalizeOpenAIError = (error) => {
  if (error.status === 401) {
    return new NormalizedAIError(AI_ERROR_CODES.INVALID_API_KEY, 'Invalid OpenAI API key', error, 'openai');
  }
  if (error.status === 429) {
    return new NormalizedAIError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'OpenAI rate limit exceeded', error, 'openai');
  }
  // ... etc
};

export const normalizeAnthropicError = (error) => {
  // Similar mapping for Anthropic errors
};
```

### Benefits
- ✅ Consistent error handling across providers
- ✅ User-friendly error messages
- ✅ Retry logic based on error type
- ✅ Easier testing and debugging

---

## APPENDIX D: Streaming and Cancellation Interface

### AIProvider Interface (Complete)

```javascript
// CustomAI/providers/AIProviderInterface.js
export class AIProviderInterface {
  /**
   * Create a new AI request (chat/agent)
   * @param {Object} params - Request parameters
   * @param {Object} options - Additional options
   * @param {AbortSignal} options.abortSignal - Signal to cancel request
   * @param {Function} options.onStreamToken - Callback for streaming tokens
   * @param {Function} options.onStreamMessage - Callback for streaming messages
   * @returns {Promise<AiRequest>}
   */
  async createAiRequest(params, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Add a message to an existing AI request
   */
  async addMessage(aiRequestId, params, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Generate events for a scene
   */
  async generateEvents(params, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Search for assets
   */
  async searchAssets(params, options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Get provider metadata
   */
  getProviderInfo() {
    return {
      id: 'unknown',
      name: 'Unknown Provider',
      requiresAuth: true,
      supportsStreaming: false,
    };
  }
}
```

### Usage Example

```javascript
// In AskAiEditorContainer.js
const abortController = new AbortController();
const [streamedContent, setStreamedContent] = useState('');

const handleCreateRequest = async () => {
  try {
    const aiRequest = await aiService.createAiRequest(
      { userRequest, mode, ... },
      {
        abortSignal: abortController.signal,
        onStreamToken: (token) => {
          setStreamedContent(prev => prev + token);
        },
        onStreamMessage: (message) => {
          console.log('Complete message received:', message);
        },
      }
    );
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request cancelled by user');
    } else {
      handleError(error);
    }
  }
};

const handleCancel = () => {
  abortController.abort();
};
```

---

*This is a living document. Update as implementation progresses and new information emerges.*

