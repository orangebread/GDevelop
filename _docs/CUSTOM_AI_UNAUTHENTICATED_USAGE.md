# Custom AI Unauthenticated Usage - Technical Design Document

**Document Version:** 1.0
**Date:** 2025-10-02
**Status:** Proposal - Awaiting Review

---

## EXECUTIVE SUMMARY

This document analyzes the feasibility of enabling unauthenticated usage of the Ask AI feature when users provide their own OpenAI or Anthropic API keys. The analysis reveals that **the custom AI infrastructure is fully built but not yet integrated** into the Ask AI feature. Integration is technically feasible with moderate effort, requiring primarily refactoring of `AskAiEditorContainer.js` and implementing local conversation storage.

**Key Finding:** The current implementation always requires authentication because it directly calls GDevelop backend APIs. Custom AI providers (OpenAI/Anthropic) are implemented but unused, making authentication unnecessary for those providers.

---

## PERSONAL FORK IMPLEMENTATION PLAN (Unauthenticated Custom AI)

This section supersedes product-level considerations and focuses on the simplest, practical path for a personal fork. Assumptions:
- You accept local-only persistence and its limitations.
- No support burden; no cross-device sync required.
- Backend changes are optional; choose the simplest approach.

### Chosen Approach: Pure Frontend + File-based Persistence (Simplest)
- Bypass authentication when Custom AI is enabled.
- Route Ask AI through the existing custom providers via `useAIService`.
- Persist conversations using `FileAiRequestStorage` (file-based store; see Appendix F).
- Skip all GDevelop backend calls when Custom AI is enabled (including `prepareAiUserContent`, polling, feedback).
- Disable/grey out features that require the backend (event generation) when in custom AI mode.

Why this is simplest:
- No backend work required; all changes are localized to Ask AI UI and state.
- Minimal surface area: one storage helper + a few conditionals and call-site swaps.

### Minimal Edit Plan (Files and Key Changes)

1) newIDE/app/src/AiGeneration/AskAiEditorContainer.js
- Import and instantiate AI service and local storage
```
import { useAIService } from '../CustomAI';
import FileAiRequestStorage from './FileAiRequestStorage';
// ... inside component
const aiService = useAIService();
const { customAISettings } = React.useContext(PreferencesContext);
```

- Bypass auth when Custom AI enabled (override the global login requirement only for custom AI path):
```
// Replace the strict auth gate with:
if (!profile && !customAISettings.enabled) {
  onOpenCreateAccountDialog();
  startNewAiRequest(null);
  return;
}
```

- Use custom provider for create request when `customAISettings.enabled`:
```
if (customAISettings.enabled) {
  const aiRequest = await aiService.createAiRequest({
    userId: profile ? profile.id : 'anonymous',
    userRequest,
    gameProjectJson: simplifiedProjectJson,
    projectSpecificExtensionsSummaryJson,
    mode,
    aiConfiguration: { presetId: aiConfigurationPresetId },
    gameId: project ? project.getProjectUuid() : null,
    toolsVersion: 'v3',
  });
  FileAiRequestStorage.save(aiRequest);
  updateAiRequest(aiRequest.id, aiRequest);
} else {
  // Existing backend path (unchanged)
}
```

- For subsequent messages, route to `aiService.addMessage` and persist:
```
if (customAISettings.enabled) {
  const updated = await aiService.addMessage({ aiRequestId, userMessage });
  FileAiRequestStorage.save(updated);
  updateAiRequest(aiRequestId, updated);
} else {
  // Existing addMessageToAiRequest path
}
```

- Skip `prepareAiUserContent` and any polling when `customAISettings.enabled`.
- Skip analytics/credits/feedback calls for custom AI.

2) newIDE/app/src/AiGeneration/AiRequestContext.js
- Persist updates when custom AI is enabled; load on boot:
```
// On mount, prime state from FileAiRequestStorage
const initial = React.useMemo(() => {
  const all = FileAiRequestStorage.loadAll();
  const byId = {};
  all.forEach(r => (byId[r.id] = r));
  return byId;
}, []);
const [aiRequests, setAiRequests] = React.useState(initial);

// When updating, also persist if in custom AI mode
const updateAiRequest = React.useCallback((id, req) => {
  setAiRequests(prev => ({ ...prev, [id]: req }));
  if (customAISettings.enabled) FileAiRequestStorage.save(req);
}, [customAISettings.enabled]);
```

3) newIDE/app/src/AiGeneration/AskAiHistory.js
- Merge local with backend (or only local if unauthenticated):
```
const localRequests = FileAiRequestStorage.loadAll();
let requests = profile ? await getAiRequests(getAuthorizationHeader, { userId: profile.id }) : [];
const map = new Map();
localRequests.forEach(r => map.set(r.id, { ...r, isLocal: true }));
requests.forEach(r => map.set(r.id, { ...r, isLocal: false }));
setAiRequests([...map.values()].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)));
```

4) newIDE/app/src/AiGeneration/PrepareAiUserContent.js
- Guard usage: return early/do nothing when `customAISettings.enabled`.

5) UI: Disable backend-only features in custom AI mode
- Event generation buttons: hide/disable with tooltip "Not available with Custom AI".
- Feedback actions: hide for custom AI.

### Optional Backend Variant (If You Prefer Backend Persistence)
If you control and can modify the backend easily, you can instead implement anonymous session storage (no auth header required) and skip local persistence entirely:
- Accept `isAnonymous: true` and `userId` as a randomly generated session ID.
- TTL anonymous conversations (e.g., 90 days) or no TTL for personal use.
- Frontend changes simplify to just routing to backend even when unauthenticated.

### Execution Checklist
- Build passes, launch app.
- Enable Custom AI in Preferences; enter API key.
- Start a chat unauthenticated; verify responses and persistence across reload.
- Send follow-up messages; verify entire history is retained locally.
- Verify that event generation and feedback are disabled in custom mode.

### Notes
- This plan intentionally ignores product UX concerns (support burden, user confusion) as requested.
- Local persistence is sufficient for a personal fork and avoids any backend work.

## END STATE

### Success Criteria

1. **Primary Goal:** User can send AI requests using custom OpenAI/Anthropic API key without logging into GDevelop account
2. **Conversation Persistence:** Conversations are stored locally (browser storage) for unauthenticated users
3. **Feature Parity:** All core AI features work in unauthenticated mode (chat, agent mode, function calling)
4. **Backward Compatibility:** Authenticated users continue to use GDevelop backend with no regression
5. **Security:** API keys are stored securely using existing `SecureStorage` implementation

### Features That Must Work (Unauthenticated Mode)

✅ **Supported:**
- Chat mode conversations
- Agent mode with function calling (create_scene, add_object, add_behavior)
- Streaming responses
- Conversation history (local storage only)
- API key management (SecureStorage)
- Error handling and retry logic

❌ **Not Supported (Acceptable Limitations):**
- Event generation (`generateEvents` - requires GDevelop backend)
- Cross-device conversation sync
- Backend-stored conversation history
- Usage quota tracking
- Credits/billing integration
- Feedback submission to GDevelop

### Features That Can Degrade

⚠️ **Degraded for Unauthenticated Users:**
- **Conversation History:** Local-only (no cloud backup, lost on browser clear)
- **AI Request Watching:** No polling for "working" status (custom providers respond immediately)
- **Analytics:** Limited telemetry (no user ID tracking)
- **History Panel:** Shows only local conversations (no server-side history)

---

## CONTEXT

### Technical Constraints

1. **Browser Environment:** Electron app with access to localStorage, no IndexedDB currently used
2. **Existing Architecture:** Custom AI infrastructure exists but is disconnected from Ask AI feature
3. **Backward Compatibility:** Must not break existing authenticated users
4. **Storage Limits:** localStorage typically 5-10MB per origin (sufficient for ~100-200 conversations)
5. **Security:** API keys already handled securely via `SecureStorage` (safeStorage/keytar)

### Stakeholders

1. **End Users with Custom API Keys:** Want to use AI without GDevelop account
2. **GDevelop Team:** Concerned about support burden, data loss, user confusion
3. **Security/Privacy:** Need to ensure API keys and conversations are stored securely
4. **Authenticated Users:** Must not experience any regression

### Current State vs. Desired State

**Current State:**
```
User Request → AskAiEditorContainer → createAiRequest (GDevelop Backend) → Response
                                    ↓
                              Requires Authentication
                              Stores in Backend DB
```

**Desired State:**
```
User Request → AskAiEditorContainer → AIService (Router)
                                           ↓
                        ┌──────────────────┴──────────────────┐
                        ↓                                      ↓
              Custom AI Enabled?                    GDevelop Backend
                        ↓                                      ↓
            OpenAI/Anthropic Provider              (Authenticated)
                        ↓                                      ↓
              Store Locally (Optional Auth)         Store in Backend
```

### Risks

1. **Data Loss:** Users lose conversations when clearing browser data
2. **User Confusion:** Unclear which conversations are local vs. cloud-synced
3. **Incomplete Implementation:** Custom providers missing event generation
4. **Migration Complexity:** Existing authenticated users switching to custom AI
5. **Support Burden:** Increased support requests about lost conversations
6. **Security Vulnerabilities:** Improper local storage implementation
7. **Breaking Changes:** Refactoring may introduce regressions

---

## CURRENT IMPLEMENTATION ANALYSIS

### Backend API Call Points in AskAiEditorContainer.js

**File:** `newIDE/app/src/AiGeneration/AskAiEditorContainer.js`

| Line | Function | Purpose | Required for Custom AI? |
|------|----------|---------|------------------------|
| 273-276 | `getAiRequest` | Poll for "working" status | ❌ No (custom providers respond immediately) |
| 687-692 | `prepareAiUserContent` | Upload project JSON to S3 | ❌ No (can pass JSON directly) |
| 694-707 | `createAiRequest` | Create new AI request | ✅ **YES** (needs replacement with AIService) |
| 863-872 | `addMessageToAiRequest` | Continue conversation | ✅ **YES** (needs replacement with AIService) |
| 971-980 | `sendAiRequestFeedback` | Submit feedback | ❌ No (optional feature) |

**File:** `newIDE/app/src/AiGeneration/AskAiHistory.js`

| Line | Function | Purpose | Required for Custom AI? |
|------|----------|---------|------------------------|
| 217-220 | `getAiRequests` | Fetch conversation history | ❌ No (use local storage instead) |

**File:** `newIDE/app/src/AiGeneration/AiRequestContext.js`

| Line | Function | Purpose | Required for Custom AI? |
|------|----------|---------|------------------------|
| 123-126 | `getAiRequest` (refreshAiRequest) | Background refresh | ❌ No (not needed for custom AI) |

### State Management

**Current:** `AiRequestContext` stores AI requests in React state (`useState`)
- `aiRequests: { [string]: AiRequest }` - In-memory only, lost on page refresh
- `updateAiRequest` - Updates in-memory state
- `refreshAiRequest` - Calls backend API to refresh

**Needed:** Persist to localStorage for unauthenticated users
- Add `persistAiRequest` function to save to localStorage
- Add `loadAiRequestsFromStorage` function to restore on mount
- Conditionally use backend vs. localStorage based on authentication status

### Custom AI Provider Completeness

**OpenAI Provider** (`newIDE/app/src/CustomAI/providers/OpenAIProvider.js`):
- ✅ `createAiRequest` - Fully implemented with streaming
- ✅ `addMessage` - Implemented (simplified, needs conversation history)
- ✅ Function calling - Supported via `getFunctionDefinitions`
- ❌ `generateEvents` - Throws error (requires GDevelop backend)
- ⚠️ Conversation history - Needs full message history for `addMessage`

**Anthropic Provider** (`newIDE/app/src/CustomAI/providers/AnthropicProvider.js`):
- ✅ `createAiRequest` - Fully implemented with streaming
- ✅ `addMessage` - Implemented (simplified, needs conversation history)
- ✅ Tool calling - Supported via `getAnthropicTools`
- ❌ `generateEvents` - Throws error (requires GDevelop backend)
- ⚠️ Conversation history - Needs full message history for `addMessage`

**GDevelop Provider** (`newIDE/app/src/CustomAI/providers/GDevelopProvider.js`):
- ✅ Wraps existing backend APIs
- ✅ All features supported (event generation, feedback, etc.)
- ✅ Requires authentication

### Missing Functionality

1. **Conversation History Reconstruction:**
   - `addMessage` in OpenAI/Anthropic providers needs full conversation history
   - Current implementation only passes new message
   - **Solution:** Store full `AiRequest.output` array and reconstruct messages

2. **Event Generation:**
   - Custom providers throw error for `generateEvents`
   - **Solution:** Fall back to GDevelop backend (requires authentication) or disable feature

3. **Local Storage Integration:**
   - No existing code to persist/restore conversations from localStorage
   - **Solution:** Add new `LocalAiRequestStorage` module

4. **Provider Switching:**
   - No UI/logic to handle switching between authenticated/unauthenticated modes
   - **Solution:** Detect authentication status and route accordingly

---

## OPTIONS

### Option C.1: Full Integration with Local Storage (Recommended)

**Description:** Integrate `useAIService` hook into `AskAiEditorContainer`, add local storage for conversation persistence, maintain full feature parity except event generation.

**Implementation:**
```javascript
// In AskAiEditorContainer.js
import { useAIService } from '../CustomAI';

const aiService = useAIService(); // Auto-routes based on settings
const { customAISettings } = React.useContext(PreferencesContext);

// Replace createAiRequest calls
const aiRequest = customAISettings.enabled
  ? await aiService.createAiRequest({
      userId: profile?.id || 'anonymous',
      userRequest,
      gameProjectJson: simplifiedProjectJson, // Pass directly, no upload
      // ...
    })
  : await createAiRequest(getAuthorizationHeader, {
      userId: profile.id,
      ...preparedAiUserContent, // Upload to S3
      // ...
    });

// Persist to localStorage for custom AI
if (customAISettings.enabled) {
  LocalAiRequestStorage.save(aiRequest);
}
```

**Pros:**
- Clean architecture using existing infrastructure
- Full feature parity (except event generation)
- Minimal code duplication
- Easy to test and maintain

**Cons:**
- Requires refactoring `AskAiEditorContainer.js` (~200 lines changed)
- Need to implement `LocalAiRequestStorage` module (~150 lines)
- Conversation history limited by localStorage size
- No cross-device sync for unauthenticated users

**Estimated Effort:** 16-24 hours
- Phase 1: Refactor AskAiEditorContainer (8h)
- Phase 2: Implement LocalAiRequestStorage (4h)
- Phase 3: Testing and bug fixes (4-8h)
- Phase 4: Documentation and migration guide (2-4h)

---

### Option C.2: Hybrid Approach (Authenticated Backend + Unauthenticated Local)

**Description:** Authenticated users continue using GDevelop backend exclusively. Unauthenticated users with custom AI use local storage only. Clear separation of code paths.

**Implementation:**
```javascript
// Separate code paths based on authentication
if (!profile && customAISettings.enabled) {
  // Unauthenticated custom AI path
  const aiRequest = await aiService.createAiRequest({...});
  LocalAiRequestStorage.save(aiRequest);
} else if (profile) {
  // Authenticated path (existing code)
  const aiRequest = await createAiRequest(getAuthorizationHeader, {...});
  // Backend handles storage
} else {
  // Not authenticated and no custom AI - show login dialog
  onOpenCreateAccountDialog();
}
```

**Pros:**
- Clear separation reduces risk of breaking authenticated users
- Easier to reason about code paths
- Can optimize each path independently
- Simpler rollback if issues arise

**Cons:**
- Code duplication between paths
- Harder to maintain (two separate implementations)
- Authenticated users can't use custom AI with backend storage
- More complex testing matrix

**Estimated Effort:** 20-28 hours
- Phase 1: Implement unauthenticated path (10h)
- Phase 2: Maintain authenticated path (4h)
- Phase 3: Testing both paths (6-10h)
- Phase 4: Documentation (2-4h)

---

### Option C.3: Minimal Integration (Custom AI Only, No Local Storage)

**Description:** Integrate `useAIService` but don't persist conversations. Conversations lost on page refresh. Simplest implementation.

**Implementation:**
```javascript
// Just replace API calls, no persistence
const aiRequest = await aiService.createAiRequest({...});
updateAiRequest(aiRequest.id, aiRequest); // In-memory only
```

**Pros:**
- Minimal code changes (~50 lines)
- Fast implementation (4-8 hours)
- Low risk of bugs
- Easy to extend later with persistence

**Cons:**
- Poor user experience (conversations lost on refresh)
- No conversation history
- Users will complain about data loss
- Not a complete solution

**Estimated Effort:** 4-8 hours
- Phase 1: Replace API calls (3h)
- Phase 2: Testing (1-3h)
- Phase 3: Documentation (1-2h)

**Recommendation:** ❌ Not recommended - UX too poor

---

### Option C.4: Server-Side Storage for Custom AI Users (Requires Backend Changes)

**Description:** Allow unauthenticated users to store conversations on GDevelop backend using anonymous session IDs. Requires backend API changes.

**Implementation:**
```javascript
// Generate anonymous session ID
const sessionId = profile?.id || generateAnonymousSessionId();

// Backend accepts anonymous sessions
const aiRequest = await createAiRequest(getAuthorizationHeader, {
  userId: sessionId,
  isAnonymous: !profile,
  // ...
});
```

**Pros:**
- Cross-device sync for unauthenticated users
- No localStorage size limits
- Consistent storage mechanism
- Better UX than local-only

**Cons:**
- Requires backend API changes (out of scope)
- Backend team involvement needed
- Privacy concerns (storing anonymous user data)
- Longer implementation timeline (4-6 weeks)
- Increased backend storage costs

**Estimated Effort:** 40-60 hours (frontend only)
- Backend changes: Additional 40-60 hours
- Total: 80-120 hours

**Recommendation:** ❌ Not recommended - too complex, requires backend changes

---

## PLAN (Option C.1 - Recommended)

### Phase 1: Preparation & Infrastructure (8 hours)

**Tasks:**
1. Create `LocalAiRequestStorage` module
   - `save(aiRequest: AiRequest): void`
   - `load(aiRequestId: string): AiRequest | null`
   - `loadAll(): AiRequest[]`
   - `delete(aiRequestId: string): void`
   - `clear(): void`

2. Add tests for `LocalAiRequestStorage`
   - Test save/load/delete operations
   - Test localStorage quota exceeded handling
   - Test data migration/versioning

3. Update `AiRequestContext` to support local storage
   - Add `persistToLocalStorage` flag
   - Modify `updateAiRequest` to conditionally persist
   - Add `loadFromLocalStorage` on mount

**Deliverables:**
- `newIDE/app/src/AiGeneration/LocalAiRequestStorage.js` (~150 lines)
- `newIDE/app/src/AiGeneration/__tests__/LocalAiRequestStorage.spec.js` (~200 lines)
- Modified `AiRequestContext.js` (+30 lines)

**Dependencies:** None

**Rollback Strategy:** Delete new files, revert AiRequestContext changes

---

### Phase 2: Core Integration (10 hours)

**Tasks:**
1. Refactor `AskAiEditorContainer.js` to use `useAIService`
   - Import `useAIService` hook
   - Replace `createAiRequest` with `aiService.createAiRequest`
   - Replace `addMessageToAiRequest` with `aiService.addMessage`
   - Skip `prepareAiUserContent` for custom AI (pass JSON directly)
   - Remove "working" status polling for custom AI

2. Update conversation history reconstruction
   - Store full `AiRequest.output` array
   - Reconstruct message history for `addMessage` calls
   - Handle function call outputs properly

3. Conditional logic for authenticated vs. unauthenticated
   - Check `profile` and `customAISettings.enabled`
   - Route to appropriate code path
   - Handle edge cases (switching between modes)

**Deliverables:**
- Modified `AskAiEditorContainer.js` (~200 lines changed)
- Modified `PrepareAiUserContent.js` (+20 lines for conditional logic)

**Dependencies:** Phase 1 complete

**Rollback Strategy:** Revert AskAiEditorContainer changes, feature flag to disable

---

### Phase 3: History Panel & UI Updates (6 hours)

**Tasks:**
1. Update `AskAiHistory.js` to show local conversations
   - Load from `LocalAiRequestStorage` when unauthenticated
   - Merge local + backend conversations for authenticated users
   - Add visual indicator for local-only conversations

2. Add UI warnings for unauthenticated users
   - "Conversations stored locally only" banner
   - "Clear browser data will delete conversations" warning
   - Export/import functionality (future enhancement)

3. Handle event generation gracefully
   - Disable event generation UI for custom AI
   - Show tooltip explaining limitation
   - Offer to switch to GDevelop backend

**Deliverables:**
- Modified `AskAiHistory.js` (~50 lines changed)
- Modified `AiRequestChat/index.js` (+30 lines for warnings)

**Dependencies:** Phase 2 complete

**Rollback Strategy:** Revert UI changes, hide warnings

---

### Phase 4: Testing & Polish (8 hours)

**Tasks:**
1. Integration testing
   - Test unauthenticated flow end-to-end
   - Test authenticated flow (regression testing)
   - Test switching between modes
   - Test localStorage quota exceeded
   - Test conversation persistence across page refreshes

2. Error handling
   - Handle API key errors gracefully
   - Handle network errors
   - Handle localStorage errors
   - Add retry logic

3. Documentation
   - Update user documentation
   - Add developer documentation
   - Create migration guide for existing users

**Deliverables:**
- Test suite for unauthenticated flow
- Updated documentation
- Migration guide

**Dependencies:** Phase 3 complete

**Rollback Strategy:** Feature flag to disable unauthenticated mode

---

## DECISION RULES

### Criteria for Choosing Between Options

1. **Development Time:** Option C.1 (16-24h) vs. C.2 (20-28h) vs. C.3 (4-8h) vs. C.4 (80-120h)
   - **Winner:** Option C.1 (best balance of time and features)

2. **User Experience:** C.1 (good) vs. C.2 (good) vs. C.3 (poor) vs. C.4 (excellent)
   - **Winner:** Option C.4, but requires backend changes (out of scope)
   - **Practical Winner:** Option C.1

3. **Technical Debt:** C.1 (low) vs. C.2 (medium) vs. C.3 (low) vs. C.4 (low)
   - **Winner:** Option C.1 (clean architecture, reuses existing infrastructure)

4. **Maintenance Burden:** C.1 (low) vs. C.2 (high) vs. C.3 (low) vs. C.4 (medium)
   - **Winner:** Option C.1

### Metrics to Measure Success

1. **Adoption Rate:** % of users enabling custom AI
   - Target: 10% of active users within 3 months
   - Measurement: Analytics event when custom AI is enabled

2. **Error Rate:** % of AI requests that fail
   - Target: <5% error rate for custom AI
   - Measurement: Error tracking in analytics

3. **User Satisfaction:** Support tickets and feedback
   - Target: <10 support tickets per month related to custom AI
   - Measurement: Support ticket categorization

4. **Performance:** Response time for AI requests
   - Target: <10s for 95th percentile
   - Measurement: Performance monitoring

### Go/No-Go Criteria for Each Phase

**Phase 1:**
- ✅ Go: LocalAiRequestStorage tests pass, no localStorage errors
- ❌ No-Go: localStorage quota issues, data corruption

**Phase 2:**
- ✅ Go: Integration tests pass, no regressions for authenticated users
- ❌ No-Go: Breaking changes, >10% error rate in testing

**Phase 3:**
- ✅ Go: UI updates complete, user warnings clear
- ❌ No-Go: Confusing UX, accessibility issues

**Phase 4:**
- ✅ Go: All tests pass, documentation complete, <5% error rate
- ❌ No-Go: Critical bugs, poor performance, high error rate

---

## RISKS + MITIGATIONS

### Risk 1: Conversation History Loss When Switching Browsers

**Severity:** High
**Likelihood:** High
**Impact:** Users lose all conversations when switching devices or browsers

**Mitigation:**
1. **Warning Banner:** Display prominent warning that conversations are local-only
2. **Export Functionality:** Add "Export Conversations" button to download JSON
3. **Import Functionality:** Add "Import Conversations" to restore from JSON
4. **Documentation:** Clear documentation about local storage limitations
5. **Future Enhancement:** Implement optional cloud sync for authenticated users using custom AI

**Residual Risk:** Medium (users may still lose data if they don't export)

---

### Risk 2: Incomplete Custom Provider Implementations

**Severity:** Medium
**Likelihood:** Medium
**Impact:** Event generation doesn't work, users confused about limitations

**Mitigation:**
1. **Disable Event Generation UI:** Hide/disable event generation for custom AI
2. **Clear Error Messages:** Show helpful error explaining limitation
3. **Fallback Option:** Offer to switch to GDevelop backend for event generation
4. **Documentation:** Document feature limitations clearly
5. **Future Enhancement:** Implement event generation for custom providers (requires significant work)

**Residual Risk:** Low (clear communication reduces confusion)

---

### Risk 3: Breaking Existing Authenticated Users

**Severity:** Critical
**Likelihood:** Low
**Impact:** Regression for existing users, loss of trust

**Mitigation:**
1. **Feature Flag:** Implement feature flag to enable/disable custom AI integration
2. **Comprehensive Testing:** Test all authenticated user flows before release
3. **Gradual Rollout:** Release to beta users first, then gradual rollout
4. **Monitoring:** Monitor error rates and user feedback closely
5. **Rollback Plan:** Immediate rollback capability if issues detected

**Residual Risk:** Very Low (with proper testing and rollout)

---

### Risk 4: Security Vulnerabilities in Local Storage

**Severity:** High
**Likelihood:** Low
**Impact:** API keys or conversation data exposed

**Mitigation:**
1. **Reuse SecureStorage:** API keys already handled securely via SecureStorage
2. **No Sensitive Data:** Don't store sensitive user data in conversations
3. **Encryption:** Consider encrypting localStorage data (future enhancement)
4. **Security Audit:** Conduct security review before release
5. **Documentation:** Document security best practices for users

**Residual Risk:** Low (existing SecureStorage is well-tested)

---

### Risk 5: localStorage Quota Exceeded

**Severity:** Medium
**Likelihood:** Medium
**Impact:** Can't save new conversations, errors

**Mitigation:**
1. **Quota Monitoring:** Check available space before saving
2. **Automatic Cleanup:** Delete oldest conversations when quota exceeded
3. **User Warning:** Warn user when approaching quota limit
4. **Export Prompt:** Prompt user to export old conversations
5. **Graceful Degradation:** Continue working without persistence if quota exceeded

**Residual Risk:** Low (automatic cleanup handles most cases)

---

### Risk 6: User Confusion About Local vs. Cloud Storage

**Severity:** Medium
**Likelihood:** High
**Impact:** Users expect cloud sync, frustrated when it doesn't work

**Mitigation:**
1. **Clear UI Indicators:** Visual badges showing "Local Only" vs. "Cloud Synced"
2. **Onboarding:** Show explanation when first enabling custom AI
3. **Persistent Warnings:** Banner in history panel explaining storage mode
4. **Documentation:** Clear documentation about storage differences
5. **Future Enhancement:** Offer cloud sync for authenticated users with custom AI

**Residual Risk:** Medium (some users will still be confused)

---

### Risk 7: Performance Degradation with Large Conversation History

**Severity:** Low
**Likelihood:** Medium
**Impact:** Slow loading, UI lag

**Mitigation:**
1. **Lazy Loading:** Load conversations on-demand, not all at once
2. **Pagination:** Paginate history panel
3. **Indexing:** Use efficient data structures for lookups
4. **Cleanup:** Automatically archive old conversations
5. **Performance Testing:** Test with large datasets (100+ conversations)

**Residual Risk:** Very Low (localStorage is fast for reasonable data sizes)

---

## IMPLEMENTATION DETAILS

### Code Changes Summary

**Files to Create:**
- `newIDE/app/src/AiGeneration/LocalAiRequestStorage.js` (~150 lines)
- `newIDE/app/src/AiGeneration/__tests__/LocalAiRequestStorage.spec.js` (~200 lines)

**Files to Modify:**
- `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` (~200 lines changed)
- `newIDE/app/src/AiGeneration/AiRequestContext.js` (~30 lines added)
- `newIDE/app/src/AiGeneration/AskAiHistory.js` (~50 lines changed)
- `newIDE/app/src/AiGeneration/PrepareAiUserContent.js` (~20 lines added)
- `newIDE/app/src/AiGeneration/AiRequestChat/index.js` (~30 lines added)

**Total Lines of Code:**
- Added: ~680 lines
- Modified: ~330 lines
- Deleted: ~50 lines (removing unnecessary code)
- **Net Change:** ~960 lines

### Breaking Changes

**None** - All changes are backward compatible. Authenticated users continue using existing flow.

### Migration Requirements

**For Users:**
- No migration needed
- Existing conversations remain in backend
- New custom AI conversations stored locally

**For Developers:**
- No database migrations
- No API changes
- Feature flag controls rollout

---

## TESTING STRATEGY

### Unit Tests

1. **LocalAiRequestStorage:**
   - Test save/load/delete operations
   - Test quota exceeded handling
   - Test data corruption recovery
   - Test concurrent access

2. **AiRequestContext:**
   - Test conditional persistence
   - Test loading from localStorage
   - Test fallback to backend

### Integration Tests

1. **Unauthenticated Flow:**
   - Create conversation without login
   - Send multiple messages
   - Refresh page, verify persistence
   - Clear localStorage, verify graceful handling

2. **Authenticated Flow:**
   - Verify no regression
   - Test switching to custom AI
   - Test switching back to GDevelop backend

3. **Edge Cases:**
   - localStorage quota exceeded
   - Network errors
   - API key errors
   - Concurrent tabs

### Manual Testing Scenarios

1. **Happy Path:**
   - Enable custom AI
   - Add API key
   - Start conversation
   - Verify responses
   - Refresh page
   - Verify conversation persists

2. **Error Handling:**
   - Invalid API key
   - Network timeout
   - localStorage full
   - Browser data cleared

3. **Migration:**
   - Authenticated user switches to custom AI
   - Verify backend conversations still accessible
   - Verify new conversations stored locally

---

## RECOMMENDATION

**Implement Option C.1: Full Integration with Local Storage**

**Rationale:**
1. Best balance of development time (16-24h) and user experience
2. Reuses existing custom AI infrastructure (no wasted code)
3. Clean architecture with low technical debt
4. Backward compatible (no breaking changes)
5. Provides complete solution (except event generation)
6. Extensible for future enhancements (cloud sync, export/import)

**Next Steps:**
1. Get stakeholder approval for Option C.1
2. Create feature flag for gradual rollout
3. Begin Phase 1 implementation
4. Set up monitoring and analytics
5. Plan beta testing with select users

**Timeline:**
- Week 1: Phase 1 (Infrastructure)
- Week 2: Phase 2 (Core Integration)
- Week 3: Phase 3 (UI Updates) + Phase 4 (Testing)
- Week 4: Beta testing and bug fixes
- Week 5: Gradual rollout to all users

**Total Estimated Time:** 3-4 weeks (16-24 hours of development + testing + rollout)

---

## APPENDIX A: CODE EXAMPLES

### Example 1: LocalAiRequestStorage Implementation

```javascript
// newIDE/app/src/AiGeneration/LocalAiRequestStorage.js
// @flow
import type { AiRequest } from '../Utils/GDevelopServices/Generation';

const STORAGE_KEY = 'gdevelop-ai-requests';
const STORAGE_VERSION = 1;
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

type StorageData = {|
  version: number,
  requests: { [string]: AiRequest },
  lastUpdated: number,
|};

class LocalAiRequestStorageClass {
  _cache: ?{ [string]: AiRequest } = null;

  /**
   * Save an AI request to localStorage.
   */
  save(aiRequest: AiRequest): void {
    try {
      const data = this._loadData();
      data.requests[aiRequest.id] = aiRequest;
      data.lastUpdated = Date.now();

      // Check size before saving
      const serialized = JSON.stringify(data);
      if (serialized.length > MAX_STORAGE_SIZE) {
        this._cleanup(data);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this._cache = data.requests;
    } catch (error) {
      console.error('Failed to save AI request to localStorage:', error);
      // Graceful degradation - continue without persistence
    }
  }

  /**
   * Load a specific AI request from localStorage.
   */
  load(aiRequestId: string): AiRequest | null {
    try {
      const data = this._loadData();
      return data.requests[aiRequestId] || null;
    } catch (error) {
      console.error('Failed to load AI request from localStorage:', error);
      return null;
    }
  }

  /**
   * Load all AI requests from localStorage.
   */
  loadAll(): AiRequest[] {
    try {
      const data = this._loadData();
      return Object.values(data.requests);
    } catch (error) {
      console.error('Failed to load AI requests from localStorage:', error);
      return [];
    }
  }

  /**
   * Delete a specific AI request from localStorage.
   */
  delete(aiRequestId: string): void {
    try {
      const data = this._loadData();
      delete data.requests[aiRequestId];
      data.lastUpdated = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this._cache = data.requests;
    } catch (error) {
      console.error('Failed to delete AI request from localStorage:', error);
    }
  }

  /**
   * Clear all AI requests from localStorage.
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this._cache = null;
    } catch (error) {
      console.error('Failed to clear AI requests from localStorage:', error);
    }
  }

  /**
   * Export all conversations as JSON for backup.
   */
  export(): string {
    const data = this._loadData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import conversations from JSON backup.
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      if (data.version !== STORAGE_VERSION) {
        throw new Error('Incompatible storage version');
      }
      localStorage.setItem(STORAGE_KEY, jsonData);
      this._cache = data.requests;
    } catch (error) {
      console.error('Failed to import AI requests:', error);
      throw error;
    }
  }

  /**
   * Load data from localStorage with migration support.
   */
  _loadData(): StorageData {
    if (this._cache) {
      return { version: STORAGE_VERSION, requests: this._cache, lastUpdated: Date.now() };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return { version: STORAGE_VERSION, requests: {}, lastUpdated: Date.now() };
      }

      const data = JSON.parse(stored);

      // Migration logic for future versions
      if (data.version < STORAGE_VERSION) {
        return this._migrate(data);
      }

      this._cache = data.requests;
      return data;
    } catch (error) {
      console.error('Failed to parse localStorage data:', error);
      return { version: STORAGE_VERSION, requests: {}, lastUpdated: Date.now() };
    }
  }

  /**
   * Cleanup old conversations when storage is full.
   */
  _cleanup(data: StorageData): void {
    const requests = Object.values(data.requests);

    // Sort by last updated (oldest first)
    requests.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return aTime - bTime;
    });

    // Remove oldest 20% of conversations
    const toRemove = Math.ceil(requests.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      delete data.requests[requests[i].id];
    }

    console.info(`Cleaned up ${toRemove} old conversations to free space`);
  }

  /**
   * Migrate data from old versions.
   */
  _migrate(oldData: any): StorageData {
    // Future migration logic here
    return {
      version: STORAGE_VERSION,
      requests: oldData.requests || {},
      lastUpdated: Date.now(),
    };
  }
}

const LocalAiRequestStorage = new LocalAiRequestStorageClass();
export default LocalAiRequestStorage;
```

### Example 2: AskAiEditorContainer Integration

```javascript
// newIDE/app/src/AiGeneration/AskAiEditorContainer.js (modified sections)
import { useAIService } from '../CustomAI';
import LocalAiRequestStorage from './LocalAiRequestStorage';

// Inside the component:
const aiService = useAIService();
const { customAISettings } = React.useContext(PreferencesContext);

// Modified onStartNewAiRequest effect:
React.useEffect(
  () => {
    (async () => {
      if (!newAiRequestOptions) return;
      console.info('Starting a new AI request...');

      // Check if user is authenticated (required even for custom AI)
      if (!profile) {
        onOpenCreateAccountDialog();
        startNewAiRequest(null);
        return;
      }

      const {
        mode,
        userRequest,
        aiConfigurationPresetId,
      } = newAiRequestOptions;
      startNewAiRequest(null);

      // Ensure the user has enough credits (skip for custom AI)
      let payWithCredits = false;
      if (!customAISettings.enabled) {
        if (quota && quota.limitReached && aiRequestPriceInCredits) {
          payWithCredits = true;
          if (availableCredits < aiRequestPriceInCredits) {
            openCreditsPackageDialog({
              missingCredits: aiRequestPriceInCredits - availableCredits,
            });
            return;
          }
        }
      }

      try {
        const simplifiedProjectBuilder = makeSimplifiedProjectBuilder(gd);
        const simplifiedProjectJson = project
          ? JSON.stringify(
              simplifiedProjectBuilder.getSimplifiedProject(project, {})
            )
          : null;
        const projectSpecificExtensionsSummaryJson = project
          ? JSON.stringify(
              simplifiedProjectBuilder.getProjectSpecificExtensionsSummary(
                project
              )
            )
          : null;

        setSendingAiRequest(null, true);

        let aiRequest;

        if (customAISettings.enabled) {
          // Custom AI path - use AIService
          aiRequest = await aiService.createAiRequest({
            userId: profile.id,
            userRequest: userRequest,
            gameProjectJson: simplifiedProjectJson, // Pass directly
            gameProjectJsonUserRelativeKey: null,
            projectSpecificExtensionsSummaryJson,
            projectSpecificExtensionsSummaryJsonUserRelativeKey: null,
            payWithCredits: false, // Not applicable for custom AI
            mode,
            aiConfiguration: {
              presetId: aiConfigurationPresetId,
            },
            gameId: project ? project.getProjectUuid() : null,
            fileMetadata: null,
            storageProviderName: null,
            toolsVersion: 'v3',
          });

          // Persist to local storage
          LocalAiRequestStorage.save(aiRequest);
        } else {
          // GDevelop backend path - existing code
          const storageProviderName = storageProvider
            ? storageProvider.internalName
            : null;

          const preparedAiUserContent = await prepareAiUserContent({
            getAuthorizationHeader,
            userId: profile.id,
            simplifiedProjectJson,
            projectSpecificExtensionsSummaryJson,
          });

          aiRequest = await createAiRequest(getAuthorizationHeader, {
            userRequest: userRequest,
            userId: profile.id,
            ...preparedAiUserContent,
            payWithCredits,
            gameId: project ? project.getProjectUuid() : null,
            fileMetadata,
            storageProviderName,
            mode,
            toolsVersion: 'v3',
            aiConfiguration: {
              presetId: aiConfigurationPresetId,
            },
          });
        }

        console.info('Successfully created a new AI request:', aiRequest);
        setSendingAiRequest(null, false);
        updateAiRequest(aiRequest.id, aiRequest);

        if (!upToDateSelectedAiRequestId.current) {
          setSelectedAiRequestId(aiRequest.id);
        }

        if (aiRequestChatRef.current)
          aiRequestChatRef.current.resetUserInput(selectedAiRequestId);

        // Analytics (skip for custom AI to avoid tracking)
        if (!customAISettings.enabled) {
          sendAiRequestStarted({
            simplifiedProjectJsonLength: simplifiedProjectJson
              ? simplifiedProjectJson.length
              : 0,
            projectSpecificExtensionsSummaryJsonLength: projectSpecificExtensionsSummaryJson
              ? projectSpecificExtensionsSummaryJson.length
              : 0,
            payWithCredits,
            storageProviderName,
            mode,
            aiRequestId: aiRequest.id,
          });
        }
      } catch (error) {
        console.error('Error starting a new AI request:', error);
        setLastSendError(null, error);
      }

      // Refresh limits (skip for custom AI)
      if (!customAISettings.enabled) {
        await delay(500);
        try {
          await retryIfFailed({ times: 2 }, onRefreshLimits);
        } catch (error) {
          // Ignore limits refresh error.
        }
      }
    })();
  },
  [
    aiRequestPriceInCredits,
    availableCredits,
    customAISettings.enabled,
    getAuthorizationHeader,
    onOpenCreateAccountDialog,
    onRefreshLimits,
    openCreditsPackageDialog,
    profile,
    project,
    quota,
    newAiRequestOptions,
    startNewAiRequest,
    setSendingAiRequest,
    updateAiRequest,
    setLastSendError,
    fileMetadata,
    storageProvider,
    aiService,
  ]
);
```

### Example 3: AskAiHistory with Local Storage

```javascript
// newIDE/app/src/AiGeneration/AskAiHistory.js (modified)
import LocalAiRequestStorage from './LocalAiRequestStorage';

const fetchAiRequests = React.useCallback(
  async () => {
    setIsLoading(true);
    setError(null);

    try {
      let requests = [];

      if (profile) {
        // Authenticated - fetch from backend
        requests = await getAiRequests(getAuthorizationHeader, {
          userId: profile.id,
        });
      }

      // Always include local requests (for custom AI)
      const localRequests = LocalAiRequestStorage.loadAll();

      // Merge and deduplicate (backend takes precedence)
      const requestMap = new Map();
      localRequests.forEach(req => requestMap.set(req.id, { ...req, isLocal: true }));
      requests.forEach(req => requestMap.set(req.id, { ...req, isLocal: false }));

      const mergedRequests = Array.from(requestMap.values());

      // Sort by updated date (newest first)
      mergedRequests.sort((a, b) => {
        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();
        return bTime - aTime;
      });

      setAiRequests(mergedRequests);
    } catch (err) {
      setError(err);
      console.error('Error fetching AI requests:', err);
    } finally {
      setIsLoading(false);
    }
  },
  [profile, getAuthorizationHeader]
);
```

---

## APPENDIX B: INTEGRATION POINTS REFERENCE

### Complete List of Backend API Calls to Replace

| File | Line | Function | Replacement |
|------|------|----------|-------------|
| `AskAiEditorContainer.js` | 273-276 | `getAiRequest` (polling) | Remove for custom AI (not needed) |
| `AskAiEditorContainer.js` | 687-692 | `prepareAiUserContent` | Skip for custom AI, pass JSON directly |
| `AskAiEditorContainer.js` | 694-707 | `createAiRequest` | `aiService.createAiRequest` |
| `AskAiEditorContainer.js` | 863-872 | `addMessageToAiRequest` | `aiService.addMessage` |
| `AskAiEditorContainer.js` | 971-980 | `sendAiRequestFeedback` | Skip for custom AI (optional) |
| `AskAiHistory.js` | 217-220 | `getAiRequests` | `LocalAiRequestStorage.loadAll()` |
| `AiRequestContext.js` | 123-126 | `getAiRequest` (refresh) | Skip for custom AI (not needed) |
| `UseGenerateEvents.js` | 51-56 | `prepareAiUserContent` | Skip for custom AI |
| `UseGenerateEvents.js` | 58-73 | `createAiGeneratedEvent` | Keep (requires backend) |

### State Management Changes

**Current (In-Memory Only):**
```javascript
const [aiRequests, setAiRequests] = React.useState<{ [string]: AiRequest }>({});
```

**New (With Persistence):**
```javascript
const [aiRequests, setAiRequests] = React.useState<{ [string]: AiRequest }>(() => {
  // Load from localStorage on mount
  const localRequests = LocalAiRequestStorage.loadAll();
  const requestMap = {};
  localRequests.forEach(req => {
    requestMap[req.id] = req;
  });
  return requestMap;
});

const updateAiRequest = React.useCallback(
  (aiRequestId: string, aiRequest: AiRequest) => {
    setAiRequests(aiRequests => ({
      ...aiRequests,
      [aiRequestId]: aiRequest,
    }));

    // Persist to localStorage if using custom AI
    if (customAISettings.enabled) {
      LocalAiRequestStorage.save(aiRequest);
    }
  },
  [customAISettings.enabled]
);
```

---

## APPENDIX C: TESTING CHECKLIST

### Unit Tests

- [ ] LocalAiRequestStorage.save() - saves to localStorage
- [ ] LocalAiRequestStorage.load() - loads from localStorage
- [ ] LocalAiRequestStorage.loadAll() - loads all requests
- [ ] LocalAiRequestStorage.delete() - deletes request
- [ ] LocalAiRequestStorage.clear() - clears all requests
- [ ] LocalAiRequestStorage.export() - exports JSON
- [ ] LocalAiRequestStorage.import() - imports JSON
- [ ] LocalAiRequestStorage._cleanup() - removes old requests when full
- [ ] LocalAiRequestStorage._migrate() - migrates old data format

### Integration Tests

- [ ] Unauthenticated user can start conversation with custom AI
- [ ] Conversation persists after page refresh
- [ ] Multiple messages in conversation work correctly
- [ ] Function calling works (create_scene, add_object, etc.)
- [ ] Switching between custom AI and GDevelop backend works
- [ ] Authenticated user can use custom AI
- [ ] Authenticated user's backend conversations still work
- [ ] localStorage quota exceeded handled gracefully
- [ ] Invalid API key shows clear error message
- [ ] Network errors handled gracefully

### Manual Testing Scenarios

**Scenario 1: First-Time Custom AI User**
1. Open GDevelop (not logged in)
2. Go to Settings > Custom AI
3. Enable custom AI, select OpenAI
4. Enter API key
5. Open Ask AI panel
6. Start conversation
7. Verify response appears
8. Send follow-up message
9. Verify conversation continues
10. Refresh page
11. Verify conversation persists

**Scenario 2: Authenticated User Switching to Custom AI**
1. Log in to GDevelop
2. Create conversation using GDevelop backend
3. Go to Settings > Custom AI
4. Enable custom AI
5. Start new conversation
6. Verify new conversation uses custom AI
7. Open history panel
8. Verify both backend and local conversations appear
9. Switch back to GDevelop backend
10. Verify backend conversations still work

**Scenario 3: localStorage Full**
1. Fill localStorage with ~100 conversations
2. Start new conversation
3. Verify automatic cleanup occurs
4. Verify oldest conversations removed
5. Verify new conversation saved successfully

**Scenario 4: Export/Import**
1. Create several conversations
2. Click "Export Conversations"
3. Verify JSON file downloads
4. Clear browser data
5. Click "Import Conversations"
6. Select exported JSON file
7. Verify conversations restored

---

## APPENDIX D: MIGRATION GUIDE FOR USERS

### For Existing Authenticated Users

**No action required.** Your existing conversations remain in the cloud and will continue to work exactly as before.

**If you want to use custom AI:**
1. Go to Settings > Custom AI
2. Enable custom AI
3. Select provider (OpenAI or Anthropic)
4. Enter your API key
5. New conversations will use your custom AI
6. Old conversations remain accessible in the cloud

### For New Users (Unauthenticated)

**To use Ask AI without logging in:**
1. Go to Settings > Custom AI
2. Enable custom AI
3. Select provider (OpenAI or Anthropic)
4. Enter your API key
5. Start using Ask AI

**Important limitations:**
- Conversations stored locally only (not synced across devices)
- Clearing browser data will delete conversations
- Event generation not available (requires GDevelop account)
- Export conversations regularly to avoid data loss

### Exporting Conversations

1. Open Ask AI history panel
2. Click "Export Conversations" button
3. Save JSON file to safe location
4. Import later using "Import Conversations" button

---

## APPENDIX E: FUTURE ENHANCEMENTS

### Short-Term (3-6 months)

1. **Export/Import UI:**
   - Add export/import buttons to history panel
   - Support multiple export formats (JSON, Markdown, PDF)
   - Automatic backup reminders

2. **Storage Optimization:**
   - Compress old conversations
   - Implement pagination for large histories
   - Add search functionality

3. **Event Generation for Custom AI:**
   - Implement client-side event generation
   - Or allow fallback to GDevelop backend for this feature only

### Medium-Term (6-12 months)

1. **Cloud Sync for Custom AI Users:**
   - Allow authenticated users to sync custom AI conversations
   - End-to-end encryption for privacy
   - Cross-device sync

2. **Advanced Features:**
   - Conversation folders/tags
   - Conversation search
   - Conversation sharing (export as link)
   - Conversation templates

3. **Analytics:**
   - Token usage tracking
   - Cost estimation
   - Performance metrics

### Long-Term (12+ months)

1. **Multi-Provider Support:**
   - Use multiple providers in same conversation
   - Automatic provider selection based on task
   - Cost optimization

2. **Advanced AI Features:**
   - Voice input/output
   - Image generation integration
   - Code execution sandbox
   - Multi-modal conversations

---

## CONCLUSION

Option C.1 (Full Integration with Local Storage) provides the best balance of development effort, user experience, and technical quality. The implementation is straightforward, leveraging existing custom AI infrastructure that is already built but not yet integrated. With proper testing and gradual rollout, this feature can be delivered safely within 3-4 weeks.

The main risks (data loss, user confusion) are well-mitigated through clear UI warnings, export/import functionality, and comprehensive documentation. The architecture is clean and extensible, allowing for future enhancements like cloud sync and advanced features.

**Recommendation: Proceed with Option C.1 implementation.**



---

## APPENDIX F: File-Based Persistence (Durable, Personal Fork)

This appendix specifies a durable, file-based storage strategy for AI conversations using Electron. It replaces LocalAiRequestStorage for your personal fork.

### Storage Location and Layout
- Default base directory: Electron `app.getPath('userData')/gdevelop-ai/`
- Allow override via Preferences (optional): `Preferences.aiDataDir`
- Layout:
```
<base>/
  index.json                        # list of conversations (id, title, updatedAt, projectId)
  conversations/
    <conversationId>/
      meta.json                     # metadata: title, createdAt, updatedAt, flags
      messages.ndjson               # append-only line-delimited JSON (one message per line)
  backups/
    <YYYY-MM-DD>/
      <conversationId>.ndjson       # periodic snapshot (optional)
```

### Main-Process Module (IPC Handler)
- File: `newIDE/electron-app/app/main/aiFileStorage.ts`
- Responsibilities:
  - Resolve base dir; ensure folder structure
  - Atomic writes (write tmp -> rename)
  - Append to NDJSON file
  - List conversations, read meta/messages, write meta, delete conversation
  - Optional: daily snapshot in `backups/`
- IPC channels (examples):
  - `aiStorage:list`
  - `aiStorage:read` (conversationId)
  - `aiStorage:appendMessage` (conversationId, message)
  - `aiStorage:writeMeta` (conversationId, meta)
  - `aiStorage:delete` (conversationId)

Example (main):
```ts
import { ipcMain } from 'electron';
ipcMain.handle('aiStorage:appendMessage', async (_e, id, msg) => {
  await appendNdjson(messagesPath(id), msg);
  await updateIndex(id, /* updatedAt */ Date.now());
});
```

### Preload Bridge (Expose Safe API)
- File: `newIDE/electron-app/app/preload/aiStorageBridge.ts`
- Expose `window.aiStorage` with minimal methods using `ipcRenderer.invoke`

Example (preload):
```ts
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('aiStorage', {
  list: () => ipcRenderer.invoke('aiStorage:list'),
  read: (id) => ipcRenderer.invoke('aiStorage:read', id),
  appendMessage: (id, msg) => ipcRenderer.invoke('aiStorage:appendMessage', id, msg),
  writeMeta: (id, meta) => ipcRenderer.invoke('aiStorage:writeMeta', id, meta),
  remove: (id) => ipcRenderer.invoke('aiStorage:delete', id),
});
```

### Renderer Wrapper (Drop-in Replacement)
- File: `newIDE/app/src/AiGeneration/FileAiRequestStorage.js`
- Provides same surface as LocalAiRequestStorage: `save`, `load`, `loadAll`, `delete`, `clear` (where applicable)
- Internals: maps AiRequest <-> files via `window.aiStorage`

Example (renderer wrapper):
```js
const FileAiRequestStorage = {
  async save(aiRequest) {
    await window.aiStorage.writeMeta(aiRequest.id, {
      title: aiRequest.title || aiRequest.mode,
      createdAt: aiRequest.createdAt,
      updatedAt: aiRequest.updatedAt,
    });
    // Persist latest message(s)
    const last = aiRequest.output && aiRequest.output.length
      ? aiRequest.output[aiRequest.output.length - 1]
      : null;
    if (last) await window.aiStorage.appendMessage(aiRequest.id, last);
  },
  async load(id) {
    const { meta, messages } = await window.aiStorage.read(id);
    return meta && messages ? toAiRequest(meta, messages) : null;
  },
  async loadAll() {
    const list = await window.aiStorage.list();
    return Promise.all(list.map(item => this.load(item.id)));
  },
};
export default FileAiRequestStorage;
```

### Atomic Write Helpers (Main)
- Write as tmp then rename to ensure atomicity on same volume.

Example:
```ts
import { promises as fs } from 'fs';
async function atomicWrite(file, content) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, file);
}
```

### Integration Notes
- Replace imports of `LocalAiRequestStorage` with `FileAiRequestStorage` (see Personal Fork plan)
- Ensure preload is loaded and `contextIsolation` is true
- If your fork has nodeIntegration enabled in renderer, you can call fs directly, but IPC is safer
- Consider a Preference to set base folder to a backed-up location (e.g., Documents/GDevelopAI)
- Optional: daily backup snapshots to `backups/YYYY-MM-DD/`
