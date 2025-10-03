# Phase 1 Testing Guide

**Purpose:** Validate the Custom AI Provider Infrastructure implementation  
**Date:** 2025-10-02  
**Status:** Ready for Testing

---

## Prerequisites

1. Ensure all dependencies are installed:
   ```bash
   cd /Users/jlee/projects/GDevelop/newIDE/app
   yarn install
   ```

2. Ensure Flow type checks pass:
   ```bash
   yarn flow check
   ```

---

## Launch GDevelop in Development Mode

### Option 1: Web Version (Recommended for Testing)
```bash
cd /Users/jlee/projects/GDevelop/newIDE/app
yarn start
```

This will:
- Start the development server on `http://localhost:3000`
- Open Chrome automatically
- Enable hot-reloading for code changes
- Show detailed console logs

### Option 2: Electron Version
```bash
cd /Users/jlee/projects/GDevelop/newIDE/app
yarn electron-dev
```

---

## Test Plan

### ✅ Test 1: Preferences Dialog Access

**Steps:**
1. Launch GDevelop (web or electron)
2. Click on the menu (hamburger icon) or File menu
3. Select "Preferences" or press the keyboard shortcut
4. Verify the Preferences dialog opens

**Expected Results:**
- ✅ Preferences dialog opens without errors
- ✅ Tabs are visible: "Preferences", "Keyboard Shortcuts", "Custom AI", "Folders" (if Electron)
- ✅ "Custom AI" tab is visible and clickable

**Console Check:**
- No errors related to PreferencesDialog
- No errors related to CustomAISettingsTab

---

### ✅ Test 2: Custom AI Tab Rendering

**Steps:**
1. Open Preferences dialog
2. Click on the "Custom AI" tab
3. Observe the UI elements

**Expected Results:**
- ✅ Info message about Custom AI appears at the top
- ✅ "Enable Custom AI" section with toggle is visible
- ✅ Toggle is OFF by default
- ✅ No provider/model settings visible when toggle is OFF

**Console Check:**
- No errors related to CustomAISettingsTab
- No errors related to ProviderRegistry
- No errors related to SecureStorage

---

### ✅ Test 3: Enable Custom AI Toggle

**Steps:**
1. In Custom AI tab, click the "Use custom AI provider" toggle
2. Observe the UI changes

**Expected Results:**
- ✅ Toggle switches to ON
- ✅ Provider section appears
- ✅ "AI Provider" dropdown is visible with "GDevelop" selected by default
- ✅ Model section appears
- ✅ Advanced section with fallback toggle appears

**Console Check:**
- No errors when toggling
- Settings update logged (if debug logging enabled)

---

### ✅ Test 4: Provider Selection

**Steps:**
1. Enable custom AI (toggle ON)
2. Click the "AI Provider" dropdown
3. Select "OpenAI"
4. Observe the UI changes
5. Repeat for "Anthropic"
6. Return to "GDevelop"

**Expected Results for OpenAI:**
- ✅ Dropdown changes to "OpenAI"
- ✅ "API Key" section appears
- ✅ Warning message about secure storage appears
- ✅ API key input field appears (type: password)
- ✅ Show/Hide button appears
- ✅ Save/Delete API Key buttons appear
- ✅ Model dropdown shows OpenAI models:
  - GPT-4 Turbo
  - GPT-4
  - GPT-3.5 Turbo

**Expected Results for Anthropic:**
- ✅ Dropdown changes to "Anthropic"
- ✅ API key section appears (same as OpenAI)
- ✅ Model dropdown shows Anthropic models:
  - Claude 3.5 Sonnet
  - Claude 3 Opus

**Expected Results for GDevelop:**
- ✅ Dropdown changes to "GDevelop"
- ✅ API key section disappears
- ✅ Model dropdown shows "No models available" or is empty

**Console Check:**
- No errors when changing providers
- Settings update correctly in PreferencesContext

---

### ✅ Test 5: Model Selection

**Steps:**
1. Enable custom AI
2. Select "OpenAI" as provider
3. Click the "AI Model" dropdown
4. Select "GPT-4 Turbo"
5. Observe the model metadata display

**Expected Results:**
- ✅ Dropdown changes to "GPT-4 Turbo"
- ✅ Info message appears showing:
  - Model name: "GPT-4 Turbo"
  - Context: "128,000 tokens"
  - Input price: "$10/M tokens"
  - Output price: "$30/M tokens"

**Repeat for other models:**
- ✅ GPT-4: 8,192 tokens, $30/$60
- ✅ GPT-3.5 Turbo: 16,385 tokens, $0.50/$1.50
- ✅ Claude 3.5 Sonnet: 200,000 tokens, $3/$15
- ✅ Claude 3 Opus: 200,000 tokens, $15/$75

**Console Check:**
- No errors when selecting models
- Model metadata loads correctly from ProviderRegistry

---

### ✅ Test 6: API Key Input

**Steps:**
1. Enable custom AI
2. Select "OpenAI" as provider
3. Type a test API key in the input field: `sk-test1234567890abcdefghijklmnopqrstuvwxyz`
4. Click "Show" button
5. Click "Hide" button
6. Click "Save API Key" button

**Expected Results:**
- ✅ Input field accepts text
- ✅ Text is masked (shows dots) by default
- ✅ "Show" button reveals the text
- ✅ "Hide" button masks the text again
- ✅ "Save API Key" button is enabled when text is entered
- ✅ "Delete API Key" button is disabled when no key is saved

**Console Check:**
- No errors when typing
- No errors when showing/hiding
- Check for SecureStorage operations (may show warnings if safeStorage not available in web mode)

**Note:** In web mode, SecureStorage may not work fully. This is expected and will work in Electron.

---

### ✅ Test 7: Fallback Toggle

**Steps:**
1. Enable custom AI
2. Scroll to "Advanced" section
3. Click the "Fallback to GDevelop AI if custom provider fails" toggle
4. Observe the warning message

**Expected Results:**
- ✅ Toggle switches ON
- ✅ Warning message appears explaining fallback behavior
- ✅ Toggle switches OFF when clicked again
- ✅ Warning message disappears

**Console Check:**
- No errors when toggling
- Settings update correctly

---

### ✅ Test 8: Settings Persistence

**Steps:**
1. Enable custom AI
2. Select "OpenAI" as provider
3. Select "GPT-4 Turbo" as model
4. Enable fallback toggle
5. Close the Preferences dialog
6. Reopen the Preferences dialog
7. Navigate to "Custom AI" tab

**Expected Results:**
- ✅ "Use custom AI provider" toggle is ON
- ✅ Provider is "OpenAI"
- ✅ Model is "GPT-4 Turbo"
- ✅ Fallback toggle is ON
- ✅ All settings are preserved

**Console Check:**
- Check localStorage for preferences data
- Settings should be in `preferences` key

**Debug Command (in browser console):**
```javascript
JSON.parse(localStorage.getItem('preferences')).customAI
```

Expected output:
```javascript
{
  enabled: true,
  provider: "openai",
  model: "gpt-4-turbo",
  fallbackToGDevelop: true
}
```

---

### ✅ Test 9: AI Feature Gating (Subscription Banner)

**Steps:**
1. Close Preferences dialog
2. Open the AI chat/agent interface (click "Ask AI" button or similar)
3. Observe if subscription banner appears
4. Open Preferences → Custom AI
5. Enable custom AI
6. Close Preferences
7. Return to AI chat/agent interface

**Expected Results (without custom AI):**
- ✅ If quota is reached, subscription banner appears
- ✅ Banner shows "Get GDevelop premium" or "Upgrade" message

**Expected Results (with custom AI enabled):**
- ✅ Subscription banner is hidden
- ✅ AI interface is accessible
- ✅ No quota/credit warnings appear

**Console Check:**
- No errors in AskAiEditorContainer
- No errors in AiRequestChat
- `customAIEnabled` prop is passed correctly

---

### ✅ Test 10: Console Error Check

**Steps:**
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Clear console
4. Perform all the above tests
5. Review console for errors

**Expected Results:**
- ✅ No errors related to CustomAI module
- ✅ No errors related to PreferencesContext
- ✅ No errors related to SecureStorage (except expected warnings in web mode)
- ✅ No Flow type errors
- ✅ No React warnings about missing props

**Acceptable Warnings:**
- SecureStorage warnings in web mode (safeStorage not available)
- "Custom AI provider not yet implemented" when selecting OpenAI/Anthropic (expected in Phase 1)

---

### ✅ Test 11: React DevTools Inspection

**Steps:**
1. Install React DevTools extension (if not already installed)
2. Open React DevTools
3. Navigate to Preferences → Custom AI tab
4. Inspect the component tree

**Expected Results:**
- ✅ `CustomAISettingsTab` component is rendered
- ✅ `PreferencesContext.Provider` is in the tree
- ✅ Props are passed correctly:
  - `i18n` prop exists
  - `getCustomAISettings` function exists
  - `setCustomAISettings` function exists
- ✅ State updates when settings change

**For AiRequestChat:**
- ✅ `customAIEnabled` prop is present
- ✅ Value matches custom AI settings

---

## Known Limitations (Phase 1)

These are **expected** and will be addressed in Phase 2:

1. **API Key Storage in Web Mode**
   - SecureStorage requires Electron's safeStorage
   - In web mode, API keys won't be encrypted
   - This is expected and documented

2. **OpenAI/Anthropic Providers Not Implemented**
   - Selecting OpenAI or Anthropic will show a console warning
   - Actual API calls will fall back to GDevelop provider
   - This is expected in Phase 1

3. **No Test Connection Button**
   - Not implemented in Phase 1
   - Will be added in Phase 2

---

## Debugging Tips

### If Preferences Dialog Doesn't Open:
```javascript
// Check in browser console:
console.log(window.location.href);
// Should be on GDevelop app page

// Check for errors:
// Look for errors related to PreferencesDialog
```

### If Custom AI Tab Doesn't Appear:
```javascript
// Check in browser console:
import PreferencesDialog from './MainFrame/Preferences/PreferencesDialog';
// Should not throw error
```

### If Settings Don't Persist:
```javascript
// Check localStorage:
localStorage.getItem('preferences');
// Should contain JSON with customAI key

// Check PreferencesContext:
// In React DevTools, find PreferencesContext.Provider
// Verify values.customAI exists
```

### If SecureStorage Errors Appear:
```javascript
// This is expected in web mode
// Test in Electron mode instead:
cd /Users/jlee/projects/GDevelop/newIDE/app
yarn electron-dev
```

---

## Success Criteria

Phase 1 is validated if:

- ✅ All 11 tests pass without critical errors
- ✅ Settings UI renders correctly
- ✅ Settings persist across dialog open/close
- ✅ Provider and model selection works
- ✅ Subscription banner is hidden when custom AI enabled
- ✅ No Flow type errors in console
- ✅ No React warnings about missing props
- ✅ Known limitations are acceptable (documented above)

---

## Reporting Issues

If you find issues, please report:

1. **Test number** that failed
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Console errors** (copy full error message)
5. **Screenshots** (if UI issue)
6. **Browser/Electron version**

---

## Next Steps After Validation

Once Phase 1 is validated:

1. Create a git commit with all Phase 1 changes
2. Document any issues found
3. Proceed to Phase 2: OpenAI and Anthropic provider implementation

