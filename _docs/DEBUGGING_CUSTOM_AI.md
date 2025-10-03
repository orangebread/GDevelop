# Debugging Custom AI Implementation

## How to Debug

### 1. Open Developer Tools

In the GDevelop Electron app:
- **macOS**: `View > Toggle Developer Tools` or `Cmd+Option+I`
- **Windows/Linux**: `View > Toggle Developer Tools` or `Ctrl+Shift+I`

### 2. Check Console for Errors

When you try to send an AI request and get the error "An error happened when sending your request, please try again", look for these console messages:

#### Expected Console Messages (Success):

```
[SecureStorage] Anthropic API key found in REACT_APP_GDEVELOP_ANTHROPIC_API_KEY
Successfully created a new AI request: {id: "...", ...}
```

#### Error Messages to Look For:

**1. Anthropic SDK Not Installed:**
```
Error starting a new AI request: Error: Anthropic SDK not installed. Please run: yarn add @anthropic-ai/sdk
```
**Fix**: Run `cd newIDE/app && npm install @anthropic-ai/sdk`

**2. API Key Not Found:**
```
Anthropic API key not configured. Please add your API key in Settings > Custom AI
```
**Fix**: Set environment variable `GDEVELOP_ANTHROPIC_API_KEY=your-key-here`

**3. Invalid API Key:**
```
Error starting a new AI request: Error: Invalid API key
```
**Fix**: Check that your API key is correct

**4. Network Error:**
```
Error starting a new AI request: Error: fetch failed
```
**Fix**: Check internet connection

**5. Context Limit Exceeded:**
```
Error starting a new AI request: Error: Context limit exceeded
```
**Fix**: Reduce project size or use a model with larger context window

**6. File Storage Error:**
```
Failed to save AI request to file storage: Error: ...
```
**Fix**: Check file permissions on userData directory

### 3. Check File Storage

After successfully creating a conversation, check if files are created:

**macOS**:
```bash
ls -la ~/Library/Application\ Support/GDevelop/gdevelop-ai/
```

**Expected structure**:
```
gdevelop-ai/
  index.json
  conversations/
    <conversation-id>/
      meta.json
      messages.ndjson
```

### 4. Test API Key Manually

To verify your API key works, test it directly:

**Anthropic**:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $GDEVELOP_ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

**OpenAI**:
```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $GDEVELOP_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 5. Common Issues

#### Issue: "Anthropic SDK not installed"

This means the `@anthropic-ai/sdk` package is not available in the build.

**Diagnosis**:
1. Check if package is in package.json: `grep anthropic newIDE/app/package.json`
2. Check if package is installed: `ls newIDE/app/node_modules/@anthropic-ai/`
3. Check if package is bundled: Look for webpack errors during build

**Fix**:
```bash
cd newIDE/app
npm install @anthropic-ai/sdk
npm run build
```

#### Issue: "API key loaded from environment variable" but still fails

This means the key is loaded but the API call fails.

**Diagnosis**:
1. Check console for the actual API error
2. Test the API key manually (see section 4 above)
3. Check if the model name is correct

**Common causes**:
- Invalid API key format
- API key doesn't have access to the specified model
- Network/firewall blocking API requests
- API rate limits exceeded

#### Issue: File storage not working

**Diagnosis**:
1. Check console for "File storage not available (not in Electron)"
2. Check if IPC handlers are registered: Look for errors about unknown IPC channels
3. Check file permissions on userData directory

**Fix**:
1. Ensure you're running in Electron (not web browser)
2. Check that `registerAiStorageHandlers()` is called in main.js
3. Check file permissions: `ls -la ~/Library/Application\ Support/GDevelop/`

### 6. Enable Verbose Logging

To get more detailed logs, you can modify the code temporarily:

**In `newIDE/app/src/CustomAI/useAIService.js`**, add logging:
```javascript
const aiService = React.useMemo(() => {
  console.log('[useAIService] Creating AIService with settings:', {
    enabled: customAISettings.enabled,
    provider: customAISettings.provider,
    model: customAISettings.model,
    hasApiKey: !!apiKey,
    isLoadingKey,
  });
  
  // ... rest of the code
}, [/* deps */]);
```

**In `newIDE/app/src/CustomAI/providers/AnthropicProvider.js`**, add logging:
```javascript
async createAiRequest(params, options) {
  console.log('[AnthropicProvider] Creating AI request with params:', {
    userId: params.userId,
    mode: params.mode,
    userRequestLength: params.userRequest.length,
  });
  
  try {
    // ... existing code
  } catch (error) {
    console.error('[AnthropicProvider] Error creating AI request:', error);
    throw error;
  }
}
```

### 7. Rebuild and Test

After making changes:

```bash
# Rebuild the app
cd newIDE/app
npm run build

# Copy build to Electron
cd ../electron-app
rm -rf app/www
mkdir -p app/www
cp -r ../app/build/* app/www/

# Start Electron
npm start
```

### 8. Report Issues

When reporting issues, include:

1. **Console output** (copy all errors from DevTools console)
2. **Environment**:
   - OS (macOS/Windows/Linux)
   - GDevelop version
   - Node.js version: `node --version`
   - npm version: `npm --version`
3. **Steps to reproduce**
4. **API provider** (OpenAI/Anthropic)
5. **Model name**
6. **Whether API key is from environment variable or secure storage**
7. **File storage contents** (if relevant): `ls -la ~/Library/Application\ Support/GDevelop/gdevelop-ai/`

## Quick Checklist

Before reporting an issue, verify:

- [ ] Developer Tools are open and Console tab is visible
- [ ] Custom AI is enabled in Preferences
- [ ] API provider is selected (OpenAI or Anthropic)
- [ ] API key is loaded (check "Current API Key (masked)" field)
- [ ] Model is selected
- [ ] Internet connection is working
- [ ] API key is valid (test manually with curl)
- [ ] Console shows the actual error message (not just the generic "An error happened")
- [ ] File storage directory exists and is writable

