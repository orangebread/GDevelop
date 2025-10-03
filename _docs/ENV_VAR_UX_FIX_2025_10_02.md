# Environment Variable UX Fix - October 2, 2025

## Problem

When users configured their API keys via environment variables (e.g., `GDEVELOP_ANTHROPIC_API_KEY` in `.env.local`), the Custom AI settings tab showed confusing UI:

1. **Empty API key field** - Made it appear that no API key was configured
2. **Error message** - "You must provide an API key to use this provider" even though the key was loaded from environment
3. **No visual indication** - Users couldn't tell that their environment variable was being used
4. **Confusing UX** - Users didn't know if they needed to enter a key manually

### Screenshot of Problem:
The UI showed an empty password field with a red error message, even though the API key was successfully loaded from the environment variable.

---

## Solution

Updated the Custom AI settings tab to clearly indicate when an API key is loaded from environment variables:

### 1. **Track API Key Source**
Added state to track where the API key comes from:
- `'env'` - Environment variable (PREFERRED method)
- `'keytar'` - System keychain
- `'safeStorage'` - Electron's secure storage
- `'none'` - No key configured

### 2. **Different UI for Environment Variables**
When an API key is loaded from environment:
- ✅ Shows a **green success message** instead of error
- ✅ Displays **masked API key** (e.g., `sk-ant-***...***xyz`) to confirm it's loaded
- ✅ Disables the input field (can't edit environment variables from UI)
- ✅ Shows helpful text explaining the key is from environment
- ✅ No error message or confusing empty field

### 3. **Enhanced UI for Manual Keys**
When using manually-entered keys:
- Shows the source in helper text (e.g., "Current key from system keychain")
- Allows editing, saving, and deleting the key
- Shows error only when truly no key is configured

---

## Changes Made

### File: `newIDE/app/src/MainFrame/Preferences/CustomAISettingsTab.js`

#### 1. Added API Key Source Tracking
```javascript
const [apiKeySource, setApiKeySource] = React.useState<'env' | 'keytar' | 'safeStorage' | 'none'>('none');

// Load API key and its source
const key = await SecureStorage.getApiKey(settings.provider);
const source = SecureStorage.getApiKeySource(settings.provider);
setApiKey(key || '');
setApiKeySource(source);
```

#### 2. Added Source Labels
```javascript
const isApiKeyFromEnv = apiKeySource === 'env';
const apiKeySourceLabel = isApiKeyFromEnv
  ? i18n._(t`from environment variable`)
  : apiKeySource === 'keytar'
  ? i18n._(t`from system keychain`)
  : apiKeySource === 'safeStorage'
  ? i18n._(t`from secure storage`)
  : '';
```

#### 3. Conditional UI Based on Source
```javascript
{isApiKeyFromEnv ? (
  // Environment variable UI - green success message + masked key
  <>
    <AlertMessage kind="success">
      <Trans>
        API key loaded from environment variable ({apiKeySourceLabel}).
        The key is ready to use and you don't need to enter it manually.
      </Trans>
    </AlertMessage>

    {hasApiKey && (
      <TextField
        type="text"
        value={SecureStorage.maskApiKey(apiKey)}
        floatingLabelText={i18n._(t`Current API Key (masked)`)}
        fullWidth
        disabled
        helperMarkdownText={i18n._(
          t`This API key is loaded from the environment variable and cannot be edited here.`
        )}
      />
    )}
  </>
) : (
  // Manual key UI - editable field with save/delete buttons
  // ... existing UI ...
)}
```

---

## User Experience

### Before Fix:
```
┌─────────────────────────────────────────┐
│ API Key                                 │
├─────────────────────────────────────────┤
│ ℹ️ Your API key is stored securely...   │
│                                         │
│ [                              ] 👁️     │
│ Anthropic API Key (sk-ant-...)          │
│                                         │
│ [Show] [Save API Key] [Delete API Key]  │
│                                         │
│ ❌ You must provide an API key to use   │
│    this provider.                       │
└─────────────────────────────────────────┘
```

### After Fix (Environment Variable):
```
┌─────────────────────────────────────────┐
│ API Key                                 │
├─────────────────────────────────────────┤
│ ✅ API key loaded from environment      │
│    variable (from environment variable).│
│    The key is ready to use and you      │
│    don't need to enter it manually.     │
│                                         │
│ [sk-ant-***...***xyz              ] 🔒  │
│ Current API Key (masked)                │
│ This API key is loaded from the         │
│ environment variable and cannot be      │
│ edited here.                            │
└─────────────────────────────────────────┘
```

### After Fix (Manual Key):
```
┌─────────────────────────────────────────┐
│ API Key                                 │
├─────────────────────────────────────────┤
│ ℹ️ Your API key is stored securely...   │
│                                         │
│ [sk-ant-api-key-here...        ] 👁️     │
│ Anthropic API Key (sk-ant-...)          │
│ Current key from system keychain        │
│                                         │
│ [Show] [Save API Key] [Delete API Key]  │
└─────────────────────────────────────────┘
```

---

## Benefits

1. **Clear Communication** - Users immediately see that their environment variable is working
2. **No Confusion** - No more empty fields or error messages when key is configured
3. **Security Transparency** - Shows where the key is coming from (environment, keychain, etc.)
4. **Better UX** - Different UI for different scenarios (env vs manual)
5. **Prevents Mistakes** - Can't accidentally overwrite environment variables from UI

---

## Testing

### Test Case 1: Environment Variable Configured
1. Set `GDEVELOP_ANTHROPIC_API_KEY` in `.env.local`
2. Start the app: `npm start`
3. Open Preferences → Custom AI
4. Select Anthropic provider
5. **Expected:**
   - ✅ Green success message
   - ✅ Masked API key displayed
   - ✅ Field is disabled
   - ✅ No error message

### Test Case 2: Manual API Key
1. Remove environment variable
2. Open Preferences → Custom AI
3. Select Anthropic provider
4. Enter API key manually
5. Click "Save API Key"
6. **Expected:**
   - ✅ Blue info message
   - ✅ Editable field
   - ✅ Helper text shows "from system keychain" or "from secure storage"
   - ✅ Save/Delete buttons work

### Test Case 3: No API Key
1. Remove environment variable
2. Delete any saved keys
3. Open Preferences → Custom AI
4. Select Anthropic provider
5. **Expected:**
   - ✅ Blue info message
   - ✅ Empty editable field
   - ✅ Red error message "You must provide an API key"

---

## Related Files

- **`newIDE/app/src/MainFrame/Preferences/CustomAISettingsTab.js`** - UI component (modified)
- **`newIDE/app/src/CustomAI/SecureStorage.js`** - API key storage with `getApiKeySource()` method (already existed)

---

## Future Enhancements

Potential improvements for the future:

1. **Environment Variable Setup Guide** - Add a link to documentation on how to set up environment variables
2. **Copy Masked Key** - Allow users to copy the masked key for verification
3. **Refresh Button** - Add a button to reload environment variables without restarting
4. **Multiple Sources** - Handle cases where both environment and manual keys exist
5. **Validation** - Add API key format validation before saving

---

## References

- **SecureStorage Documentation:** `newIDE/app/src/CustomAI/SecureStorage.js`
- **Environment Variable Guide:** `_docs/CUSTOM_AI_ENV_VARS.md`
- **Verification Guide:** `_docs/VERIFICATION_GUIDE.md`

