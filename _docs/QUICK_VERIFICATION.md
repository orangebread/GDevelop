# Quick Verification - Custom AI Environment Variables

**TL;DR:** How to verify env vars are loaded and AI works in 5 minutes

---

## 1. Setup (One-time)

```bash
# Create .env.local file
cd /Users/jlee/projects/GDevelop/newIDE/electron-app
cat > .env.local << 'EOF'
GDEVELOP_OPENAI_API_KEY=sk-proj-your-key-here
GDEVELOP_ANTHROPIC_API_KEY=sk-ant-your-key-here
EOF
```

Replace `your-key-here` with actual API keys from:
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys

---

## 2. Start the App

```bash
cd /Users/jlee/projects/GDevelop/newIDE/app
npm start
```

Wait for browser to open at `http://localhost:3000`

---

## 3. Quick Check in Browser Console

Press **F12** (or **Cmd+Option+I** on Mac), then paste this:

```javascript
console.log('OpenAI:', process.env.GDEVELOP_OPENAI_API_KEY ? '✅' : '❌');
console.log('Anthropic:', process.env.GDEVELOP_ANTHROPIC_API_KEY ? '✅' : '❌');
```

**Expected:** Both show ✅

---

## 4. Check in UI

1. Click **☰ menu** → **Preferences** → **Custom AI** tab
2. Toggle **"Use custom AI provider"** ON
3. Select **"OpenAI"** from dropdown

**Expected:** See **"(from environment)"** next to API key field

---

## 5. Test AI Chat

1. Click **"Ask AI"** button (top-right or toolbar)
2. Type: `"Hello, can you help me?"`
3. Press Enter

**Expected:** AI responds without subscription warnings

---

## Troubleshooting

### ❌ Env vars not detected

```bash
# Verify file exists
ls -la /Users/jlee/projects/GDevelop/newIDE/electron-app/.env.local

# Check contents
cat /Users/jlee/projects/GDevelop/newIDE/electron-app/.env.local

# Restart app
# Press Ctrl+C in terminal, then run npm start again
```

### ❌ "(from environment)" not showing

- Restart the development server completely
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
- Check for typos in variable names (must be exact)

### ❌ AI requests fail with 401

- Verify API key is valid (check provider dashboard)
- Ensure no extra spaces/quotes in .env.local
- Try regenerating the API key

---

## Full Verification Script

Paste this in browser console for complete check:

```javascript
(async () => {
  const SecureStorage = require('./CustomAI/SecureStorage').default;
  const prefs = JSON.parse(localStorage.getItem('preferences') || '{}');
  
  console.log('Env Vars:', {
    openai: process.env.GDEVELOP_OPENAI_API_KEY ? '✅' : '❌',
    anthropic: process.env.GDEVELOP_ANTHROPIC_API_KEY ? '✅' : '❌'
  });
  
  console.log('Settings:', {
    enabled: prefs.customAI?.enabled ? '✅' : '❌',
    provider: prefs.customAI?.provider || 'none',
    model: prefs.customAI?.model || 'none'
  });
  
  console.log('Keys Loaded:', {
    openai: await SecureStorage.getApiKey('openai') ? '✅' : '❌',
    anthropic: await SecureStorage.getApiKey('anthropic') ? '✅' : '❌'
  });
  
  console.log('Key Source:', {
    openai: SecureStorage.getApiKeySource('openai'),
    anthropic: SecureStorage.getApiKeySource('anthropic')
  });
})();
```

**Expected Output:**
```
Env Vars: { openai: '✅', anthropic: '✅' }
Settings: { enabled: '✅', provider: 'openai', model: 'gpt-4-turbo' }
Keys Loaded: { openai: '✅', anthropic: '✅' }
Key Source: { openai: 'env', anthropic: 'env' }
```

---

## Success = All ✅

If everything shows ✅, you're good to go!

For detailed testing, see: `_docs/VERIFICATION_GUIDE.md`

