# AI Model Updates - October 2, 2025

## Summary

Updated the Custom AI provider registry with the latest models from Anthropic and OpenAI as of October 2, 2025.

---

## Changes Made

### 1. Updated ProviderRegistry.js

**File:** `newIDE/app/src/CustomAI/providers/ProviderRegistry.js`

#### OpenAI Models Added:
- **GPT-5** (`gpt-5`) - Latest flagship model
  - Context: 131,072 tokens
  - Max output: 16,384 tokens
  - Pricing: $1.25/$10 per million tokens
  - Released: August 7, 2025

- **GPT-5 Mini** (`gpt-5-mini`) - Faster, cheaper version
  - Context: 131,072 tokens
  - Max output: 16,384 tokens
  - Pricing: $0.25/$2 per million tokens

- **GPT-5 Nano** (`gpt-5-nano`) - Fastest, cheapest
  - Context: 131,072 tokens
  - Max output: 16,384 tokens
  - Pricing: $0.05/$0.40 per million tokens

- **GPT-4.1** (`gpt-4.1`) - Advanced coding and long context
  - Context: 1,000,000 tokens
  - Max output: 32,768 tokens
  - Pricing: $2/$8 per million tokens
  - Released: April 14, 2025

- **GPT-4.1 Mini** (`gpt-4.1-mini`)
  - Context: 1,000,000 tokens
  - Max output: 32,768 tokens
  - Pricing: $0.40/$1.60 per million tokens

- **GPT-4.1 Nano** (`gpt-4.1-nano`)
  - Context: 1,000,000 tokens
  - Max output: 32,768 tokens
  - Pricing: $0.10/$0.40 per million tokens

- **GPT-4o** (`gpt-4o`) - Multimodal model
  - Context: 128,000 tokens
  - Max output: 16,384 tokens
  - Pricing: $2.50/$10 per million tokens

- **GPT-4o Mini** (`gpt-4o-mini`)
  - Context: 128,000 tokens
  - Max output: 16,384 tokens
  - Pricing: $0.15/$0.60 per million tokens

#### Anthropic Models Added:
- **Claude Sonnet 4.5** (`claude-sonnet-4-5-20250929`) - Latest, best model
  - Context: 200,000 tokens (1M beta available)
  - Max output: 64,000 tokens
  - Pricing: $3/$15 per million tokens
  - Released: September 29, 2025

- **Claude Sonnet 4** (`claude-sonnet-4-20250514`)
  - Context: 200,000 tokens (1M beta available)
  - Max output: 64,000 tokens
  - Pricing: $3/$15 per million tokens
  - Released: May 14, 2025

- **Claude Sonnet 3.7** (`claude-3-7-sonnet-20250219`)
  - Context: 200,000 tokens
  - Max output: 64,000 tokens (128K with beta header)
  - Pricing: $3/$15 per million tokens
  - Released: February 19, 2025

- **Claude Opus 4.1** (`claude-opus-4-1-20250805`)
  - Context: 200,000 tokens
  - Max output: 32,000 tokens
  - Pricing: $15/$75 per million tokens
  - Released: August 5, 2025

- **Claude Opus 4** (`claude-opus-4-20250514`)
  - Context: 200,000 tokens
  - Max output: 32,000 tokens
  - Pricing: $15/$75 per million tokens
  - Released: May 14, 2025

- **Claude Haiku 3.5** (`claude-3-5-haiku-20241022`)
  - Context: 200,000 tokens
  - Max output: 8,192 tokens
  - Pricing: $1/$5 per million tokens
  - Released: October 22, 2024

#### Models Removed:
- `gpt-4-turbo` (replaced by GPT-5 and GPT-4.1)
- `gpt-4` (replaced by GPT-5 and GPT-4.1)
- `gpt-3.5-turbo` (replaced by GPT-5 Nano and GPT-4.1 Nano)
- `claude-3-5-sonnet-20241022` (replaced by Claude Sonnet 4.5)
- `claude-3-opus-20240229` (replaced by Claude Opus 4.1)

### 2. Updated Default Models

**File:** `newIDE/app/src/CustomAI/providers/AnthropicProvider.js`
- Changed default from `'claude-3-5-sonnet-20241022'` to `'claude-sonnet-4-5-20250929'`

**File:** `newIDE/app/src/CustomAI/providers/OpenAIProvider.js`
- Changed default from `'gpt-4-turbo'` to `'gpt-5'`

---

## Model Selection Guidance

### For General Use:
- **OpenAI:** GPT-5 (best balance of performance and cost)
- **Anthropic:** Claude Sonnet 4.5 (highest intelligence across most tasks)

### For Cost-Sensitive Applications:
- **OpenAI:** GPT-5 Nano or GPT-4.1 Nano
- **Anthropic:** Claude Haiku 3.5

### For Long Context (>128K tokens):
- **OpenAI:** GPT-4.1 series (1M context)
- **Anthropic:** Claude Sonnet 4.5 or 4 (200K standard, 1M beta)

### For Coding:
- **OpenAI:** GPT-4.1 (54.6% on SWE-bench Verified)
- **Anthropic:** Claude Sonnet 4.5 (exceptional agent and coding capabilities)

### For Multimodal (Vision):
- **OpenAI:** GPT-4o or GPT-5
- **Anthropic:** Claude Sonnet 4.5 or Opus 4.1

---

## Testing Recommendations

1. **Verify Model Dropdown:**
   - Open Preferences → Custom AI
   - Select OpenAI → Should show GPT-5 as default
   - Select Anthropic → Should show Claude Sonnet 4.5 as default

2. **Test API Calls:**
   - Ensure new model IDs work with respective APIs
   - Verify pricing calculations are accurate
   - Test context window limits

3. **Check Documentation:**
   - Update any user-facing docs that reference specific models
   - Update internal testing guides with new model names

---

## References

- **Anthropic Models:** https://docs.anthropic.com/en/docs/about-claude/models/overview
- **OpenAI Models:** https://openai.com/index/gpt-4-1/
- **Anthropic Pricing:** https://www.anthropic.com/pricing
- **OpenAI Pricing:** https://openai.com/api/pricing/

---

## Notes

- All models support streaming and function calling
- Context windows are standard limits; some models offer beta access to larger contexts
- Pricing is per million tokens (input/output)
- Model IDs include version dates for Anthropic (e.g., `20250929`) to ensure consistency
- OpenAI uses simpler IDs (e.g., `gpt-5`) with versioning handled server-side

