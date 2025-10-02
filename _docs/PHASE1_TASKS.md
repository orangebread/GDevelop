**Recommendation: Option B (Break Phase 1 into smaller tasks)** - Absolutely the right approach for a solo developer working part-time on a fork.

Here's why:
- ✅ **Frequent validation points** - catch issues early before investing 15 hours
- ✅ **Easy to sync with upstream** - commit after each task, less to lose if conflicts arise
- ✅ **Maintain momentum** - complete tasks in 1-2 hour sessions, feel progress
- ✅ **Course correction** - discover issues (like subscription checks) early and adjust
- ✅ **Testable increments** - each task produces something you can test immediately

---

## Phase 1 Breakdown: Granular Task List

### **Task Group 1: Investigation & Planning (4-5 hours)**
*Do this first - it informs everything else*

#### Task 1.1: AI Feature Gating Audit (2-3 hours)
**Goal:** Identify all places where AI features are gated by subscription/auth

**Steps:**
1. Search codebase for `hasValidSubscriptionPlan` and note all AI-related usages
2. Search for `SubscriptionChecker` and identify AI feature checks
3. Search for `limits.quotas['ai-request']` and related quota checks
4. Search for credit checks in AI flows (`payWithCredits`, `availableCredits`)
5. Identify UI components that hide/disable AI features (check `AiGeneration/` directory)
6. Document findings in a markdown file: `_docs/AI_GATING_AUDIT.md`

**Deliverable:** List of files/functions that need modification to bypass gates when custom AI enabled

**Estimated Time:** 2-3 hours

**Validation:**
- [ ] Found all subscription checks in AI flows
- [ ] Documented file paths and line numbers
- [ ] Identified pattern for bypassing (e.g., check custom AI setting first)

---

#### Task 1.2: Asset Search Investigation (1 hour)
**Goal:** Determine if/how asset search uses AI

**Steps:**
1. Search `AssetStore/` directory for AI-related code
2. Check `Generation.js` for asset search functions (look for `searchAsset`, `asset-search`)
3. Trace asset search flow from UI to API call
4. Document whether asset search needs custom AI support

**Deliverable:** Decision: Does asset search need custom AI? If yes, document injection points.

**Estimated Time:** 1 hour

**Validation:**
- [ ] Confirmed whether asset search uses AI
- [ ] If yes: documented the call path and injection point
- [ ] If no: removed from scope

---

#### Task 1.3: Create Directory Structure & Boilerplate (30 min)
**Goal:** Set up the foundation for custom AI code

**Steps:**
```bash
mkdir -p newIDE/app/src/CustomAI/providers
touch newIDE/app/src/CustomAI/providers/AIProviderInterface.js
touch newIDE/app/src/CustomAI/providers/GDevelopProvider.js
touch newIDE/app/src/CustomAI/providers/ProviderRegistry.js
touch newIDE/app/src/CustomAI/AIService.js
touch newIDE/app/src/CustomAI/useAIService.js
touch newIDE/app/src/CustomAI/SecureStorage.js
touch newIDE/app/src/CustomAI/CustomAISettings.js
touch newIDE/app/src/CustomAI/shouldEnableAIFeature.js
```

**Note:** Phase 2 components (PromptBuilder, FunctionCallAdapter, ErrorNormalizer, TokenCounter) will be added later when implementing OpenAI/Anthropic providers.

**Deliverable:** Empty files with Flow type headers and basic structure

**Estimated Time:** 30 minutes

**Validation:**
- [ ] Directory structure created
- [ ] All files have `// @flow` header
- [ ] Basic class/function stubs in place

---

### **Task Group 2: Core Infrastructure (5-6 hours)**
*Build the foundation - no UI yet*

#### Task 2.1: Implement ProviderRegistry (1.5 hours)
**Goal:** Create centralized model metadata registry

**Steps:**
1. Copy structure from Appendix B in strategy doc
2. Add OpenAI models: `gpt-4-turbo`, `gpt-4`, `gpt-3.5-turbo`
3. Add Anthropic models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`
4. Implement helper functions: `getProviderModels`, `getModelMetadata`, `estimateCost`
5. Add Flow types for registry structure

**Deliverable:** `ProviderRegistry.js` with complete model metadata

**Estimated Time:** 1.5 hours

**Validation:**
- [ ] Registry has all models with correct metadata
- [ ] Helper functions work correctly
- [ ] Flow types pass (run `yarn flow`)
- [ ] Can get model metadata by provider/model ID

**Test:**
```javascript
import { getModelMetadata, estimateCost } from './ProviderRegistry';
const model = getModelMetadata('openai', 'gpt-4-turbo');
console.log(model.contextWindow); // Should be 128000
const cost = estimateCost('openai', 'gpt-4-turbo', 1000, 500);
console.log(cost); // Should be ~0.025
```

---

#### Task 2.2: Implement SecureStorage (2 hours)
**Goal:** Secure API key storage with fallback

**Steps:**
1. Check if Electron's `safeStorage` is available
2. Implement primary storage using `safeStorage.encryptString()`
3. Implement fallback using `keytar` library (install if needed: `yarn add keytar`)
4. Add methods: `setApiKey(provider, key)`, `getApiKey(provider)`, `deleteApiKey(provider)`
5. Add key masking utility: `maskApiKey(key)` returns `sk-...xyz123`
6. Ensure keys never touch localStorage or Redux

**Deliverable:** `SecureStorage.js` with encrypted key storage

**Estimated Time:** 2 hours

**Validation:**
- [ ] Can store and retrieve API keys
- [ ] Keys are encrypted at rest
- [ ] Fallback works if safeStorage unavailable
- [ ] Keys never appear in plaintext in storage
- [ ] `maskApiKey()` works correctly
- [ ] Keys are masked in all UI displays (show only `sk-...xyz123`)
- [ ] Keys never sent to GDevelop servers (even in error reports)

**Test:**
```javascript
import SecureStorage from './SecureStorage';
await SecureStorage.setApiKey('openai', 'sk-test123456789');
const key = await SecureStorage.getApiKey('openai');
console.log(key); // Should be 'sk-test123456789'
console.log(SecureStorage.maskApiKey(key)); // Should be 'sk-...6789'
```

---

#### Task 2.3: Implement AIProviderInterface (1 hour)
**Goal:** Define the contract all providers must implement

**Steps:**
1. Copy interface from Appendix D in strategy doc
2. Add Flow types for all methods
3. Add JSDoc comments explaining each method
4. Define parameter types: `AiRequestParams`, `GenerateEventsParams`, etc.
5. Add streaming/cancellation support in method signatures

**Deliverable:** `AIProviderInterface.js` with complete interface definition

**Estimated Time:** 1 hour

**Validation:**
- [ ] Interface has all required methods
- [ ] Flow types are correct
- [ ] Streaming and cancellation support included
- [ ] JSDoc comments are clear

---

#### Task 2.4: Implement GDevelopProvider (Wrapper) (1.5 hours)
**Goal:** Wrap existing GDevelop backend to match AIProviderInterface

**Steps:**
1. Import existing functions from `Utils/GDevelopServices/Generation.js`
2. Implement `createAiRequest()` by calling existing `createAiRequest()`
3. Implement `addMessage()` by calling existing `addMessageToAiRequest()`
4. Implement `generateEvents()` by calling existing `createAiGeneratedEvent()`
5. Handle streaming (if GDevelop backend supports it) or return full response
6. Pass through `abortSignal` if supported

**Deliverable:** `GDevelopProvider.js` that wraps existing backend

**Estimated Time:** 1.5 hours

**Validation:**
- [ ] All interface methods implemented
- [ ] Calls existing GDevelop functions correctly
- [ ] Maintains existing behavior (no regressions)
- [ ] Flow types match interface

**Test:**
```javascript
import GDevelopProvider from './providers/GDevelopProvider';
const provider = new GDevelopProvider();
// Test with existing auth (should work like before)
const result = await provider.createAiRequest({...});
```

---

### **Task Group 3: Service Layer & Settings (3-4 hours)**
*Connect the pieces*

#### Task 3.1: Implement CustomAISettings (1 hour)
**Goal:** Store and retrieve custom AI configuration in preferences

**Steps:**
1. Define settings structure:
   ```javascript
   {
     enabled: false,
     provider: 'openai', // or 'anthropic' or 'gdevelop'
     model: 'gpt-4-turbo',
     fallbackToGDevelop: false, // explicit opt-in
   }
   ```
2. Add methods: `getSettings()`, `setSettings(settings)`, `isCustomAIEnabled()`
3. Integrate with `PreferencesContext.js` (add to `PreferencesValues` type)
4. Add getter/setter in `PreferencesProvider.js`

**Deliverable:** `CustomAISettings.js` + modifications to preferences

**Estimated Time:** 1 hour

**Files Modified:**
- `newIDE/app/src/MainFrame/Preferences/PreferencesContext.js` (+15 lines)
- `newIDE/app/src/MainFrame/Preferences/PreferencesProvider.js` (+30 lines)

**Validation:**
- [ ] Settings persist across app restarts
- [ ] Can enable/disable custom AI
- [ ] Can select provider and model
- [ ] Settings include explicit `fallbackToGDevelop` flag (default: false)
- [ ] Settings stored in localStorage (not API keys!)

---

#### Task 3.2: Implement AIService (2 hours)
**Goal:** Main service layer that routes to correct provider

**Steps:**
1. Implement constructor that accepts a provider
2. Implement `createAiRequest()` that delegates to provider
3. Implement `addMessage()` that delegates to provider
4. Implement `generateEvents()` that delegates to provider
5. Add request/response normalization (if needed)
6. Add error handling and normalization (basic for now)
7. Support streaming and cancellation

**Deliverable:** `AIService.js` with complete service implementation

**Estimated Time:** 2 hours

**Validation:**
- [ ] Service delegates to provider correctly
- [ ] Streaming callbacks work
- [ ] Cancellation works (abort signal)
- [ ] Errors are caught and handled
- [ ] Errors are thrown to caller (no silent fallback to GDevelop)
- [ ] Fallback only happens if explicitly enabled in settings

**Test:**
```javascript
import AIService from './AIService';
import GDevelopProvider from './providers/GDevelopProvider';

const service = new AIService(new GDevelopProvider());
const abortController = new AbortController();
const result = await service.createAiRequest(
  {...},
  { abortSignal: abortController.signal }
);
```

---

#### Task 3.3: Implement useAIService Hook (1 hour)
**Goal:** React hook that returns configured AIService

**Steps:**
1. Read custom AI settings from preferences
2. Load API key from SecureStorage (if custom provider)
3. Instantiate correct provider based on settings:
   - If `enabled: false` → GDevelopProvider
   - If `enabled: true, provider: 'openai'` → OpenAIProvider (stub for now)
   - If `enabled: true, provider: 'anthropic'` → AnthropicProvider (stub for now)
4. Return AIService instance
5. Handle provider switching (re-instantiate when settings change)

**Deliverable:** `useAIService.js` React hook

**Estimated Time:** 1 hour

**Validation:**
- [ ] Hook returns AIService instance
- [ ] Correct provider selected based on settings
- [ ] Provider switches when settings change
- [ ] Works in React components

**Test:**
```javascript
function TestComponent() {
  const aiService = useAIService();
  console.log(aiService.provider.getProviderInfo());
  return null;
}
```

---

### **Task Group 4: Integration & Gating Bypass (2-3 hours)**
*Make it work in the app*

#### Task 4.1: Create shouldEnableAIFeature Helper (30 min)
**Goal:** Centralized function to check if AI features should be enabled

**Steps:**
1. Create `CustomAI/shouldEnableAIFeature.js`
2. Implement logic:
   ```javascript
   export const shouldEnableAIFeature = (customAISettings, subscription, limits) => {
     // If custom AI enabled, always allow (bypass subscription checks)
     if (customAISettings?.enabled) return true;

     // Otherwise, check GDevelop subscription
     return hasValidSubscriptionPlan(subscription) && !limits?.quotas['ai-request']?.limitReached;
   };
   ```
3. Export from `CustomAI/index.js`

**Important:** This helper is ONLY for UI gating (showing/hiding AI features). It does NOT control fallback behavior. Fallback to GDevelop backend is controlled separately by the `fallbackToGDevelop` setting and must be explicit.

**Deliverable:** Helper function for AI feature gating

**Estimated Time:** 30 minutes

**Validation:**
- [ ] Returns true when custom AI enabled (regardless of subscription)
- [ ] Returns true when subscription valid (if custom AI disabled)
- [ ] Returns false when both disabled
- [ ] Does NOT control fallback behavior (that's in AIService)

---

#### Task 4.2: Update AI Feature Gates (1.5 hours)
**Goal:** Bypass subscription checks when custom AI enabled

**Steps:**
1. Use findings from Task 1.1 (AI Gating Audit)
2. For each identified gate, replace:
   ```javascript
   // Before
   if (!hasValidSubscriptionPlan(subscription)) {
     showSubscriptionDialog();
     return;
   }
   
   // After
   if (!shouldEnableAIFeature(customAISettings, subscription, limits)) {
     showSubscriptionDialog();
     return;
   }
   ```
3. Update all identified locations
4. Test that AI features remain visible when custom AI enabled

**Deliverable:** Modified files with bypassed gates

**Estimated Time:** 1.5 hours

**Files Modified:** (Based on audit findings, likely 3-5 files)
- Potentially `AskAiEditorContainer.js`
- Potentially `SubscriptionChecker.js`
- Others identified in audit

**Validation:**
- [ ] AI features visible when custom AI enabled (no subscription)
- [ ] AI features still gated when custom AI disabled (existing behavior)
- [ ] No regressions in subscription flow

---

#### Task 4.3: Inject AIService into AskAiEditorContainer (1 hour)
**Goal:** Replace direct Generation.js calls with AIService

**Steps:**
1. Import `useAIService` hook
2. Replace `createAiRequest()` calls:
   ```javascript
   // Before
   const aiRequest = await createAiRequest(getAuthorizationHeader, {...});
   
   // After
   const aiService = useAIService();
   const aiRequest = await aiService.createAiRequest({...});
   ```
3. Replace `addMessageToAiRequest()` calls similarly
4. Pass streaming callbacks and abort signal
5. Test that existing behavior still works (with GDevelopProvider)

**Deliverable:** Modified `AskAiEditorContainer.js`

**Estimated Time:** 1 hour

**Files Modified:**
- `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` (~10 lines changed)

**Validation:**
- [ ] AI chat still works with GDevelop backend
- [ ] No regressions in existing functionality
- [ ] Streaming works (if it worked before)
- [ ] Cancellation works

---

### **Task Group 5: Basic Settings UI (1-2 hours)**
*Minimal UI to enable/disable custom AI*

#### Task 5.1: Create Basic Settings Dialog (1.5 hours)
**Goal:** Simple UI to enable custom AI and select provider

**Steps:**
1. Create `CustomAI/CustomAISettingsDialog.js`
2. Add checkbox: "Enable Custom AI Provider"
3. Add dropdown: Provider selection (OpenAI, Anthropic, GDevelop)
4. Add text input: API Key (masked, with show/hide toggle)
5. Add dropdown: Model selection (populated from ProviderRegistry)
6. Add checkbox: "Fallback to GDevelop if custom AI fails" (default: unchecked)
7. Add warning text: "If fallback is disabled, errors will be shown instead of silently using GDevelop backend"
8. Add "Test Connection" button (stub for now)
9. Wire up to CustomAISettings

**Deliverable:** Basic settings dialog

**Estimated Time:** 1.5 hours

**Validation:**
- [ ] Can enable/disable custom AI
- [ ] Can select provider
- [ ] Can enter API key (masked)
- [ ] Can select model
- [ ] Can enable/disable fallback to GDevelop (default: disabled)
- [ ] Warning about fallback behavior is clear
- [ ] Settings persist

---

#### Task 5.2: Add Settings Link to Preferences (30 min)
**Goal:** Make settings accessible from main preferences

**Steps:**
1. Modify `PreferencesDialog.js`
2. Add "Custom AI" tab or section
3. Link to `CustomAISettingsDialog`
4. Add icon/badge showing active provider

**Deliverable:** Settings accessible from preferences

**Estimated Time:** 30 minutes

**Files Modified:**
- `newIDE/app/src/MainFrame/Preferences/PreferencesDialog.js` (+10 lines)

**Validation:**
- [ ] Can open custom AI settings from preferences
- [ ] Settings dialog opens correctly
- [ ] Can see which provider is active

---

### **Phase 1 Completion Checklist**

Before moving to Phase 2, verify:

**Core Infrastructure:**
- [ ] ProviderRegistry has all models with correct metadata
- [ ] SecureStorage encrypts API keys correctly
- [ ] SecureStorage falls back gracefully if safeStorage unavailable
- [ ] AIProviderInterface is complete
- [ ] GDevelopProvider wraps existing backend without regressions

**Service Layer:**
- [ ] AIService delegates to providers correctly
- [ ] useAIService hook returns correct provider based on settings
- [ ] Settings persist across app restarts
- [ ] Settings include explicit `fallbackToGDevelop` flag (default: false)

**Integration:**
- [ ] AI features visible when custom AI enabled (subscription bypassed)
- [ ] AI features still gated when custom AI disabled
- [ ] AskAiEditorContainer uses AIService (no regressions)
- [ ] shouldEnableAIFeature helper checks custom AI OR subscription (not both)

**UI:**
- [ ] Can enable/disable custom AI from settings
- [ ] Can select provider and model
- [ ] Can enter API key (securely stored)
- [ ] API keys masked in all UI displays (show only `sk-...xyz123`)

**Security:**
- [ ] No API keys in logs, Redux, or localStorage
- [ ] API keys masked in all UI (show only `sk-...xyz123`)
- [ ] Keys never appear in error messages or stack traces
- [ ] Keys never sent to GDevelop servers (even in error reports)
- [ ] SecureStorage uses encryption at rest (safeStorage or keytar)

**Error Handling & Fallback Behavior:**
- [ ] Custom AI failures show errors to user (no silent fallback to GDevelop)
- [ ] Fallback to GDevelop requires explicit user opt-in via `fallbackToGDevelop` setting
- [ ] Error messages are helpful and don't expose sensitive data
- [ ] Streaming and cancellation work correctly (abort signal respected)

**Testing:**
- [ ] All existing AI features still work with GDevelop backend
- [ ] Flow types pass (`yarn flow`)
- [ ] No console errors
- [ ] Can switch between custom AI and GDevelop backend without restart
- [ ] Cancellation works (abort in-flight requests)

**Documentation:**
- [ ] AI gating audit documented (`_docs/AI_GATING_AUDIT.md`)
- [ ] Asset search decision documented
- [ ] Any deviations from plan documented
- [ ] Security considerations documented (key storage, masking, etc.)

---

## Recommended Work Sessions

**Session 1 (2-3 hours):** Tasks 1.1, 1.2, 1.3 (Investigation)
**Session 2 (2 hours):** Tasks 2.1, 2.2 (Registry + Storage)
**Session 3 (2 hours):** Tasks 2.3, 2.4 (Interface + GDevelop wrapper)
**Session 4 (2 hours):** Tasks 3.1, 3.2 (Settings + Service)
**Session 5 (1.5 hours):** Task 3.3, 4.1 (Hook + Helper)
**Session 6 (2 hours):** Tasks 4.2, 4.3 (Gating + Injection)
**Session 7 (2 hours):** Tasks 5.1, 5.2 (Settings UI)

**Total: 7 sessions, ~15 hours**

---

## Commit Strategy

Commit after each task group:
- `feat: add AI feature gating audit and directory structure`
- `feat: implement ProviderRegistry and SecureStorage`
- `feat: implement AIService and provider interface`
- `feat: integrate AIService into AskAiEditorContainer`
- `feat: add custom AI settings UI`

This way, you can sync with upstream after each commit without losing much work.

**Ready to start with Task 1.1 (AI Feature Gating Audit)?**
