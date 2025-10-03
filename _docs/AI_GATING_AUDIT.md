# AI Feature Gating Audit

**Date:** 2025-10-02  
**Purpose:** Identify all locations where AI features are gated by subscription/authentication checks to enable bypass when custom AI is enabled.

---

## Summary

This audit identifies all places in the GDevelop codebase where AI features are restricted based on:
1. Subscription status (`hasValidSubscriptionPlan`)
2. Quota limits (`limits.quotas['ai-request']`)
3. Credit checks (`availableCredits`, `payWithCredits`)
4. UI components that hide/disable AI features

---

## Key Findings

### 1. Subscription Checks

#### `hasValidSubscriptionPlan` Usage in AI Features

**File:** `newIDE/app/src/AiGeneration/AskAiEditorContainer.js`
- **Lines:** 27-29, 1010-1014
- **Context:** Determines whether to show "subscribe" vs "upgrade" vs "none" for quota increase offering
- **Code:**
  ```javascript
  increaseQuotaOffering={
    !hasValidSubscriptionPlan(subscription)
      ? 'subscribe'
      : canUpgradeSubscription(subscription)
      ? 'upgrade'
      : 'none'
  }
  ```
- **Impact:** Controls UI messaging but doesn't directly gate functionality
- **Action Required:** ✅ Modify to check custom AI settings first

**File:** `newIDE/app/src/Profile/Subscription/SubscriptionChecker.js`
- **Lines:** 14, 66-73, 85-87
- **Context:** Generic subscription checker component used for premium features
- **Usage:** Currently used for Debugger, Hot Reloading, Preview over WiFi, Disable Splash
- **AI Usage:** ❌ NOT currently used for AI features (confirmed by checking all usages)
- **Action Required:** ⚠️ Monitor for future use with AI features

---

### 2. Quota Checks

#### AI Request Quota (`limits.quotas['ai-request']`)

**File:** `newIDE/app/src/AiGeneration/AskAiEditorContainer.js`
- **Lines:** 602-603, 648, 814-815
- **Context:** Checks if user has exhausted their free AI request quota
- **Code:**
  ```javascript
  const quota = (limits && limits.quotas && limits.quotas['ai-request']) || null;
  
  // Later used to determine if payment with credits is needed
  if (quota && quota.limitReached && aiRequestPriceInCredits) {
    payWithCredits = true;
    if (availableCredits < aiRequestPriceInCredits) {
      openCreditsPackageDialog({ missingCredits: ... });
      return; // BLOCKS REQUEST
    }
  }
  ```
- **Impact:** 🔴 **CRITICAL** - Directly blocks AI requests when quota exhausted and insufficient credits
- **Action Required:** ✅ Bypass quota check when custom AI enabled

**File:** `newIDE/app/src/AiGeneration/AiRequestChat/index.js`
- **Lines:** 106, 410-444
- **Context:** Displays subscription banner when quota limit reached
- **Code:**
  ```javascript
  const subscriptionBanner =
    quota && quota.limitReached && increaseQuotaOffering !== 'none' ? (
      <GetSubscriptionCard
        placementId="ai-requests"
        subscriptionDialogOpeningReason={...}
      >
        <Trans>Unlock AI requests included with a GDevelop premium plan.</Trans>
      </GetSubscriptionCard>
    ) : null;
  ```
- **Impact:** Shows UI prompt to upgrade but doesn't block functionality
- **Action Required:** ✅ Hide banner when custom AI enabled

---

### 3. Credit Checks

#### `availableCredits` and `payWithCredits`

**File:** `newIDE/app/src/AiGeneration/AskAiEditorContainer.js`
- **Lines:** 601, 647-656, 810-822
- **Context:** Checks if user has enough credits to pay for AI requests when quota exhausted
- **Code:**
  ```javascript
  const availableCredits = limits ? limits.credits.userBalance.amount : 0;
  
  let payWithCredits = false;
  if (quota && quota.limitReached && aiRequestPriceInCredits) {
    payWithCredits = true;
    if (availableCredits < aiRequestPriceInCredits) {
      openCreditsPackageDialog({
        missingCredits: aiRequestPriceInCredits - availableCredits,
      });
      return; // BLOCKS REQUEST
    }
  }
  ```
- **Impact:** 🔴 **CRITICAL** - Blocks AI requests when quota exhausted and insufficient credits
- **Action Required:** ✅ Bypass credit check when custom AI enabled

**Files Modified:**
- `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` (lines 647-656, 810-822)

---

### 4. UI Components That Gate AI Features

#### GetSubscriptionCard in AI Request Chat

**File:** `newIDE/app/src/AiGeneration/AiRequestChat/index.js`
- **Lines:** 410-444
- **Context:** Shows subscription upgrade card when quota exhausted
- **Action Required:** ✅ Conditionally hide when custom AI enabled

#### Quota/Credits Display

**File:** `newIDE/app/src/AiGeneration/AiRequestChat/index.js`
- **Lines:** 116-184, 456-465
- **Function:** `getQuotaOrCreditsText()`
- **Context:** Displays remaining quota or available credits
- **Action Required:** ✅ Show custom AI status when enabled (e.g., "Using Custom AI (OpenAI GPT-4)")

---

### 5. Asset Search AI Feature

#### Asset Search Uses AI

**File:** `newIDE/app/src/Utils/GDevelopServices/Generation.js`
- **Lines:** 166-181, 586-620
- **Function:** `createAssetSearch()`
- **Context:** AI-powered asset search functionality
- **Code:**
  ```javascript
  export const createAssetSearch = async (
    getAuthorizationHeader: () => Promise<string>,
    { userId, searchTerms, description, objectType, twoDimensionalViewKind }
  ): Promise<AssetSearch> => {
    const authorizationHeader = await getAuthorizationHeader();
    const response = await axios.post(
      `${GDevelopGenerationApi.baseUrl}/asset-search`,
      { searchTerms, description, objectType, twoDimensionalViewKind },
      { params: { userId }, headers: { Authorization: authorizationHeader } }
    );
    return response.data;
  };
  ```

**File:** `newIDE/app/src/AiGeneration/UseSearchAndInstallAsset.js`
- **Lines:** 9, 43-48
- **Context:** Hook that uses `createAssetSearch` for AI agent function calls
- **Impact:** Asset search is part of AI agent capabilities
- **Action Required:** ⚠️ **DECISION NEEDED** - Should custom AI providers support asset search?
  - **Option A:** Keep asset search using GDevelop backend (requires auth)
  - **Option B:** Implement asset search in custom AI providers (complex, requires asset database access)
  - **Recommendation:** Option A - Asset search requires GDevelop's asset database, keep using GDevelop backend

---

## Implementation Strategy

### Phase 1: Create Helper Function

**File:** `newIDE/app/src/CustomAI/shouldEnableAIFeature.js`

```javascript
// @flow
import { type Subscription, type Limits } from '../Utils/GDevelopServices/Usage';
import { hasValidSubscriptionPlan } from '../Utils/GDevelopServices/Usage';

export type CustomAISettings = {|
  enabled: boolean,
  provider: 'openai' | 'anthropic' | 'gdevelop',
  model: string,
  fallbackToGDevelop: boolean,
|};

/**
 * Determines if AI features should be enabled in the UI.
 * This is ONLY for UI gating (showing/hiding AI features).
 * It does NOT control fallback behavior.
 * 
 * @param customAISettings - Custom AI configuration
 * @param subscription - User's subscription status
 * @param limits - User's usage limits
 * @returns true if AI features should be enabled
 */
export const shouldEnableAIFeature = (
  customAISettings: ?CustomAISettings,
  subscription: ?Subscription,
  limits: ?Limits
): boolean => {
  // If custom AI enabled, always allow (bypass subscription checks)
  if (customAISettings?.enabled) return true;

  // Otherwise, check GDevelop subscription and quota
  return (
    hasValidSubscriptionPlan(subscription) &&
    (!limits?.quotas?.['ai-request']?.limitReached || false)
  );
};
```

### Phase 2: Modify AI Request Flow

**Files to Modify:**

1. **`newIDE/app/src/AiGeneration/AskAiEditorContainer.js`**
   - Import `shouldEnableAIFeature` and custom AI settings
   - Bypass quota/credit checks when custom AI enabled (lines 647-656, 810-822)
   - Modify `increaseQuotaOffering` logic (lines 1010-1014)

2. **`newIDE/app/src/AiGeneration/AiRequestChat/index.js`**
   - Hide subscription banner when custom AI enabled (lines 410-444)
   - Update quota/credits display to show custom AI status (lines 456-465)

### Phase 3: Asset Search Decision

**Recommendation:** Keep asset search using GDevelop backend
- Asset search requires access to GDevelop's asset database
- Implementing this in custom AI providers would be complex and require significant infrastructure
- Users can still use custom AI for chat/agent features while asset search uses GDevelop backend
- Document this limitation clearly in settings UI

---

## Files Requiring Modification

### Critical (Blocks Functionality)
1. ✅ `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` - Quota/credit checks (lines 647-656, 810-822)

### Important (UI/UX)
2. ✅ `newIDE/app/src/AiGeneration/AskAiEditorContainer.js` - Subscription offering logic (lines 1010-1014)
3. ✅ `newIDE/app/src/AiGeneration/AiRequestChat/index.js` - Subscription banner (lines 410-444)
4. ✅ `newIDE/app/src/AiGeneration/AiRequestChat/index.js` - Quota display (lines 456-465)

### New Files
5. ✅ `newIDE/app/src/CustomAI/shouldEnableAIFeature.js` - Helper function

---

## Testing Checklist

- [ ] AI features visible when custom AI enabled (no subscription)
- [ ] AI features still gated when custom AI disabled (existing behavior)
- [ ] No regressions in subscription flow
- [ ] Quota/credit checks bypassed when custom AI enabled
- [ ] Subscription banner hidden when custom AI enabled
- [ ] Custom AI status displayed in UI
- [ ] Asset search still works (uses GDevelop backend)

---

## Notes

- **Asset Search:** Decided to keep using GDevelop backend for asset search due to infrastructure requirements
- **Fallback Behavior:** The `shouldEnableAIFeature` helper is ONLY for UI gating, not for controlling fallback to GDevelop backend
- **Security:** All custom AI settings (except API keys) stored in localStorage via PreferencesContext
- **API Keys:** Stored separately in SecureStorage (encrypted), never in localStorage or Redux

