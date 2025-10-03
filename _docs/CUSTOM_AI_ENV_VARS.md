# Custom AI Environment Variable Configuration

**Status:** ✅ Implemented  
**Version:** Phase 3+  
**Preferred Method:** Environment variables are the **recommended** way to configure API keys

---

## Overview

GDevelop's Custom AI integration supports API key configuration via environment variables. This is the **preferred method** for:

- ✅ **Development and testing workflows**
- ✅ **CI/CD environments**
- ✅ **Users who prefer environment-based configuration**
- ✅ **Avoiding the need to enter keys through the UI**
- ✅ **Better security practices (keys not stored in app data)**

---

## Supported Environment Variables

### OpenAI

```bash
GDEVELOP_OPENAI_API_KEY=sk-proj-your-openai-api-key-here
```

**Where to get your key:**
- Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Create a new API key
- Copy the key (starts with `sk-proj-` or `sk-`)

### Anthropic

```bash
GDEVELOP_ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

**Where to get your key:**
- Visit [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- Create a new API key
- Copy the key (starts with `sk-ant-`)

---

## How to Set Environment Variables

### macOS / Linux

#### Option 1: Terminal Session (Temporary)

```bash
# Set the environment variable
export GDEVELOP_OPENAI_API_KEY="sk-proj-your-key-here"

# Launch GDevelop from the same terminal
/Applications/GDevelop.app/Contents/MacOS/GDevelop
```

#### Option 2: Shell Profile (Persistent)

Add to `~/.zshrc` (macOS) or `~/.bashrc` (Linux):

```bash
# GDevelop Custom AI Configuration
export GDEVELOP_OPENAI_API_KEY="sk-proj-your-key-here"
export GDEVELOP_ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

Then reload your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

#### Option 3: Launch Agent (macOS, Persistent for GUI)

Create `~/Library/LaunchAgents/com.gdevelop.env.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gdevelop.env</string>
    <key>ProgramArguments</key>
    <array>
        <string>sh</string>
        <string>-c</string>
        <string>
        launchctl setenv GDEVELOP_OPENAI_API_KEY "sk-proj-your-key-here"
        launchctl setenv GDEVELOP_ANTHROPIC_API_KEY "sk-ant-your-key-here"
        </string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Load the agent:

```bash
launchctl load ~/Library/LaunchAgents/com.gdevelop.env.plist
```

### Windows

#### Option 1: Command Prompt (Temporary)

```cmd
set GDEVELOP_OPENAI_API_KEY=sk-proj-your-key-here
"C:\Program Files\GDevelop\GDevelop.exe"
```

#### Option 2: PowerShell (Temporary)

```powershell
$env:GDEVELOP_OPENAI_API_KEY="sk-proj-your-key-here"
& "C:\Program Files\GDevelop\GDevelop.exe"
```

#### Option 3: System Environment Variables (Persistent)

1. Open **System Properties** → **Advanced** → **Environment Variables**
2. Under **User variables**, click **New**
3. Variable name: `GDEVELOP_OPENAI_API_KEY`
4. Variable value: `sk-proj-your-key-here`
5. Click **OK**
6. Restart GDevelop

### Development (yarn dev)

Create `.env.local` in `newIDE/electron-app/`:

```bash
GDEVELOP_OPENAI_API_KEY=sk-proj-your-key-here
GDEVELOP_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Then run:

```bash
yarn dev
```

---

## Precedence Order

When GDevelop looks for an API key, it checks in this order:

1. **Environment Variable** (PREFERRED) ← Checked first
2. **Secure Storage** (safeStorage or keytar) ← Fallback

**Important:** If an environment variable is set, it will **always** be used, even if you have a key stored in the app. This is by design to allow easy overrides.

---

## Verification

### Check if Environment Variable is Set

**macOS/Linux:**
```bash
echo $GDEVELOP_OPENAI_API_KEY
# Should output: sk-proj-... (masked for security)
```

**Windows (Command Prompt):**
```cmd
echo %GDEVELOP_OPENAI_API_KEY%
```

**Windows (PowerShell):**
```powershell
$env:GDEVELOP_OPENAI_API_KEY
```

### Check in GDevelop

1. Open GDevelop
2. Go to **File** → **Preferences** → **Custom AI**
3. If an environment variable is detected, you'll see:
   - "API Key: ●●●●●●xyz123 **(from environment)**"
   - The input field may be disabled or show a note

---

## Security Best Practices

### ✅ DO

- Use environment variables for development and CI/CD
- Keep your `.env` files in `.gitignore`
- Rotate your API keys regularly
- Use separate keys for development and production
- Set restrictive permissions on files containing keys

### ❌ DON'T

- Commit API keys to version control
- Share your API keys in screenshots or logs
- Use production keys in development
- Store keys in plaintext files in shared locations

---

## Troubleshooting

### Environment Variable Not Working

**Problem:** GDevelop doesn't detect the environment variable.

**Solutions:**

1. **Verify the variable is set:**
   ```bash
   echo $GDEVELOP_OPENAI_API_KEY
   ```

2. **Check for typos:**
   - Variable name must be EXACTLY: `GDEVELOP_OPENAI_API_KEY` or `GDEVELOP_ANTHROPIC_API_KEY`
   - Case-sensitive on macOS/Linux

3. **Restart GDevelop:**
   - Environment variables are read at startup
   - Close and reopen GDevelop after setting the variable

4. **macOS GUI Launch Issue:**
   - Apps launched from Finder may not inherit shell environment
   - Use Launch Agent method (see above) or launch from terminal

5. **Check for whitespace:**
   ```bash
   # Bad (has quotes in the value)
   export GDEVELOP_OPENAI_API_KEY="\"sk-proj-key\""
   
   # Good
   export GDEVELOP_OPENAI_API_KEY="sk-proj-key"
   ```

### Key Still Prompts in UI

**Problem:** GDevelop asks for API key even though environment variable is set.

**Cause:** The environment variable might be empty or contain only whitespace.

**Solution:**
```bash
# Check the actual value
echo "[$GDEVELOP_OPENAI_API_KEY]"
# Should show: [sk-proj-...]
# If it shows: [] or [   ], the variable is empty/whitespace
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Test with Custom AI

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run tests with OpenAI
        env:
          GDEVELOP_OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          yarn test
```

### GitLab CI

```yaml
test:
  script:
    - yarn test
  variables:
    GDEVELOP_OPENAI_API_KEY: $OPENAI_API_KEY
```

### Jenkins

```groovy
pipeline {
    agent any
    environment {
        GDEVELOP_OPENAI_API_KEY = credentials('openai-api-key')
    }
    stages {
        stage('Test') {
            steps {
                sh 'yarn test'
            }
        }
    }
}
```

---

## Migration from UI-Stored Keys

If you currently have API keys stored in GDevelop's secure storage and want to switch to environment variables:

1. **Export your current key** (optional, for backup):
   - Go to Settings → Custom AI
   - Copy the masked key if you need to reference it

2. **Set the environment variable** (see methods above)

3. **Verify it works:**
   - Restart GDevelop
   - Check that the UI shows "(from environment)"

4. **Optional: Remove stored key:**
   - The stored key won't be used while the env var is set
   - You can leave it as a fallback or delete it from Settings

---

## FAQ

**Q: Can I use both environment variables and stored keys?**  
A: Yes, but the environment variable will always take precedence.

**Q: Are environment variables more secure than stored keys?**  
A: It depends on your setup. Environment variables are good for development and CI/CD. For end-user machines, secure storage (safeStorage/keytar) may be more appropriate.

**Q: Can I use different keys for different projects?**  
A: Not directly with environment variables (they're global). For project-specific keys, use the UI storage method.

**Q: Will my environment variable be sent to GDevelop servers?**  
A: No. API keys (from any source) are never sent to GDevelop servers. They're only used to communicate with OpenAI/Anthropic directly.

**Q: What if I want to temporarily disable the environment variable?**  
A: Unset it:
```bash
unset GDEVELOP_OPENAI_API_KEY
```

---

## Support

If you encounter issues with environment variable configuration:

1. Check this documentation
2. Verify your environment variable is set correctly
3. Check GDevelop logs for any error messages
4. Report issues on GitHub with:
   - Your OS and version
   - How you set the environment variable
   - Whether GDevelop was launched from terminal or GUI
   - Any error messages (with API keys redacted)

---

**Last Updated:** 2025-10-02  
**Related Documentation:**
- [Custom AI API Keys Strategy](_docs/CUSTOM_AI_API_KEYS_STRATEGY.md)
- [Phase 1 Progress](_docs/PHASE1_PROGRESS.md)
- [Phase 3 Progress](_docs/PHASE3_PROGRESS.md)

