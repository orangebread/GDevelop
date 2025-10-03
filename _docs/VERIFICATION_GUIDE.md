# GDevelop Custom AI - Verification Guide

**Purpose:** Step-by-step guide to verify environment variables are loaded and AI features work correctly  
**Date:** 2025-10-02  
**Status:** Ready to Use

---

## Quick Start Verification

### Step 1: Set Environment Variables

For development, create a `.env.local` file in `newIDE/electron-app/`:

```bash
cd /Users/jlee/projects/GDevelop/newIDE/electron-app
cat > .env.local << 'EOF'
# GDevelop Custom AI - Environment Variables
GDEVELOP_OPENAI_API_KEY=sk-proj-your-actual-openai-key-here
GDEVELOP_ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-key-here
EOF
```

**Important:** Replace the placeholder values with your actual API keys!

### Step 2: Start the App with Environment Variables

```bash
# From the project root
cd /Users/jlee/projects/GDevelop/newIDE/app
npm start
```

The app will automatically load environment variables from `newIDE/electron-app/.env.local`.

---

## Verification Checklist

### ✅ 1. Verify Environment Variables Are Set

**In Terminal (before starting the app):**

```bash
# Check if variables are set
echo $GDEVELOP_OPENAI_API_KEY
echo $GDEVELOP_ANTHROPIC_API_KEY
```

**Expected:** Should show your API keys (or nothing if not set in shell)

**In Browser Console (after app starts):**

```javascript
// Open DevTools (F12 or Cmd+Option+I)
// In Console tab, run:
console.log('OpenAI Key:', process.env.GDEVELOP_OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('Anthropic Key:', process.env.GDEVELOP_ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set');
```

**Expected:** Should show "✅ Set" for both if configured correctly

---

### ✅ 2. Verify Keys Are Loaded in the UI

**Steps:**
1. Open GDevelop (should be running at `http://localhost:3000`)
2. Click the **hamburger menu** (☰) in top-left
3. Select **Preferences**
4. Click the **Custom AI** tab
5. Enable **"Use custom AI provider"** toggle
6. Select **"OpenAI"** from the provider dropdown

**Expected Results:**
- ✅ You should see: **"API Key: ●●●●●●xyz123 (from environment)"**
- ✅ The API key input field should be disabled or show a note
- ✅ The "Save API Key" button should be disabled (key already loaded from env)

**Repeat for Anthropic:**
1. Select **"Anthropic"** from the provider dropdown
2. Verify the same "(from environment)" indicator appears

---

### ✅ 3. Test AI Functionality with OpenAI

**Steps:**
1. In Preferences → Custom AI:
   - Enable custom AI
   - Select **"OpenAI"** as provider
   - Select **"GPT-4 Turbo"** as model
   - Click **Close**

2. Create or open a project

3. Click the **"Ask AI"** button (usually in the toolbar or top-right)

4. Type a test message: `"Hello, can you help me create a simple game?"`

5. Press Enter or click Send

**Expected Results:**
- ✅ No subscription/quota warnings appear
- ✅ AI responds with a message (streaming should work)
- ✅ Response comes from OpenAI (check console for API calls to `api.openai.com`)
- ✅ No errors in console

**Console Verification:**
```javascript
// In DevTools Console, you should see:
// Network tab → Filter by "openai" → Should see requests to api.openai.com
```

---

### ✅ 4. Test AI Functionality with Anthropic

**Steps:**
1. In Preferences → Custom AI:
   - Select **"Anthropic"** as provider
   - Select **"Claude 3.5 Sonnet"** as model
   - Click **Close**

2. In the AI chat, type: `"What's the capital of France?"`

3. Press Enter

**Expected Results:**
- ✅ AI responds with "Paris" (or similar)
- ✅ Response comes from Anthropic (check console for API calls to `api.anthropic.com`)
- ✅ Streaming works (you see tokens appear gradually)
- ✅ No errors in console

---

### ✅ 5. Test Event Generation (Advanced AI Feature)

**Steps:**
1. Open a scene in your project
2. Click on **Events** tab
3. Look for **"Generate with AI"** or **"Ask AI to create events"** button
4. Type a request: `"Make the player jump when spacebar is pressed"`
5. Click Generate

**Expected Results:**
- ✅ AI generates event code
- ✅ Events are inserted into the scene
- ✅ No subscription warnings
- ✅ No errors in console

---

### ✅ 6. Verify Fallback Behavior (Optional)

**Steps:**
1. In Preferences → Custom AI:
   - Enable **"Fallback to GDevelop AI if custom provider fails"**
   - Click **Close**

2. Temporarily break your API key:
   - Edit `.env.local` and change the key to an invalid value
   - Restart the app

3. Try to use AI chat

**Expected Results:**
- ✅ Request fails with custom provider
- ✅ App automatically falls back to GDevelop AI
- ✅ You see a warning message about fallback
- ✅ AI still works (using GDevelop backend)

**Restore your key after testing!**

---

## Debugging Common Issues

### Issue 1: "API Key not found" error

**Symptoms:** AI doesn't work, console shows "No API key found"

**Solutions:**
1. Verify `.env.local` file exists in `newIDE/electron-app/`
2. Check the file has correct variable names:
   - `GDEVELOP_OPENAI_API_KEY` (not `OPENAI_API_KEY`)
   - `GDEVELOP_ANTHROPIC_API_KEY` (not `ANTHROPIC_API_KEY`)
3. Restart the app completely (Ctrl+C and `npm start` again)
4. Check for typos in the `.env.local` file

### Issue 2: Environment variables not showing in UI

**Symptoms:** UI doesn't show "(from environment)" indicator

**Solutions:**
1. Check browser console for errors:
   ```javascript
   console.log(process.env.GDEVELOP_OPENAI_API_KEY);
   ```
2. Verify you're running the web app (`npm start` in `newIDE/app`)
3. Check that `.env.local` is in the correct location (`newIDE/electron-app/`)
4. Restart the development server

### Issue 3: AI requests fail with 401 Unauthorized

**Symptoms:** Console shows "401 Unauthorized" or "Invalid API key"

**Solutions:**
1. Verify your API key is valid:
   - OpenAI: Visit https://platform.openai.com/api-keys
   - Anthropic: Visit https://console.anthropic.com/settings/keys
2. Check the key format:
   - OpenAI: Should start with `sk-proj-` or `sk-`
   - Anthropic: Should start with `sk-ant-`
3. Ensure no extra spaces or quotes in `.env.local`
4. Try regenerating the API key from the provider's dashboard

### Issue 4: Subscription warnings still appear

**Symptoms:** "Upgrade to premium" banner shows even with custom AI enabled

**Solutions:**
1. Verify custom AI is enabled in Preferences
2. Check console for errors in `shouldEnableAIFeature` function
3. Verify the provider is not set to "GDevelop"
4. Clear browser cache and reload

---

## Manual Testing Script

Run this in the browser console to verify everything is working:

```javascript
// Verification Script
(async () => {
  console.log('=== GDevelop Custom AI Verification ===\n');
  
  // 1. Check environment variables
  console.log('1. Environment Variables:');
  console.log('   OpenAI:', process.env.GDEVELOP_OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('   Anthropic:', process.env.GDEVELOP_ANTHROPIC_API_KEY ? '✅ Set' : '❌ Not set');
  
  // 2. Check preferences
  const prefs = JSON.parse(localStorage.getItem('preferences') || '{}');
  console.log('\n2. Custom AI Settings:');
  console.log('   Enabled:', prefs.customAI?.enabled ? '✅ Yes' : '❌ No');
  console.log('   Provider:', prefs.customAI?.provider || 'Not set');
  console.log('   Model:', prefs.customAI?.model || 'Not set');
  console.log('   Fallback:', prefs.customAI?.fallbackToGDevelop ? '✅ Yes' : '❌ No');
  
  // 3. Check SecureStorage
  console.log('\n3. SecureStorage:');
  try {
    const SecureStorage = require('./CustomAI/SecureStorage').default;
    const openaiKey = await SecureStorage.getApiKey('openai');
    const anthropicKey = await SecureStorage.getApiKey('anthropic');
    console.log('   OpenAI key loaded:', openaiKey ? '✅ Yes' : '❌ No');
    console.log('   Anthropic key loaded:', anthropicKey ? '✅ Yes' : '❌ No');
    
    const openaiSource = SecureStorage.getApiKeySource('openai');
    const anthropicSource = SecureStorage.getApiKeySource('anthropic');
    console.log('   OpenAI source:', openaiSource);
    console.log('   Anthropic source:', anthropicSource);
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  console.log('\n=== Verification Complete ===');
})();
```

**Expected Output:**
```
=== GDevelop Custom AI Verification ===

1. Environment Variables:
   OpenAI: ✅ Set
   Anthropic: ✅ Set

2. Custom AI Settings:
   Enabled: ✅ Yes
   Provider: openai
   Model: gpt-4-turbo
   Fallback: ❌ No

3. SecureStorage:
   OpenAI key loaded: ✅ Yes
   Anthropic key loaded: ✅ Yes
   OpenAI source: env
   Anthropic source: env

=== Verification Complete ===
```

---

## Success Criteria

Your setup is working correctly if:

- ✅ Environment variables are set and detected
- ✅ UI shows "(from environment)" for API keys
- ✅ AI chat works with OpenAI
- ✅ AI chat works with Anthropic
- ✅ Event generation works
- ✅ No subscription warnings appear
- ✅ No console errors related to Custom AI
- ✅ Verification script shows all green checkmarks

---

## Next Steps

Once verification is complete:

1. **Test with real projects** - Try generating events, asking questions about your game
2. **Monitor API usage** - Check your OpenAI/Anthropic dashboard for usage
3. **Report issues** - If you find bugs, document them with console logs and steps to reproduce
4. **Explore features** - Try different models, test fallback behavior, experiment with prompts

---

## Additional Resources

- **Environment Variables Guide:** `_docs/CUSTOM_AI_ENV_VARS.md`
- **Phase 1 Testing Guide:** `_docs/PHASE1_TESTING_GUIDE.md`
- **Implementation Summary:** `_docs/ENV_VAR_IMPLEMENTATION_SUMMARY.md`
- **Feature Catalog:** `_docs/FEATURE_CATALOG.md`

