# 📊 Groq API Rate Limits - Complete Breakdown

## Official Groq Free Tier Limits (2026)

Based on official Groq documentation, here are the **exact rate limits** for the free tier:

### Llama 3.3 70B Versatile (Your Current Model)

| Limit Type | Free Tier | What It Means |
|------------|-----------|---------------|
| **RPM** (Requests/Minute) | 30 | Max 30 API calls per minute |
| **RPD** (Requests/Day) | 1,000 | Max 1,000 API calls per day |
| **TPM** (Tokens/Minute) | 12,000 | Max 12K tokens processed per minute |
| **TPD** (Tokens/Day) | 100,000 | Max 100K tokens processed per day |

### What This Means for Your Letter Generator

#### Realistic Usage Scenarios

**Scenario 1: Average Letter (500 tokens)**
- Input: ~300 tokens (letter template)
- Output: ~200 tokens (enhanced letter)
- Total: ~500 tokens per request

**Calculations:**
- **Per Minute**: 30 requests = 15,000 tokens ✅ (under 12K limit)
  - **Actual**: ~24 letters/minute (12,000 ÷ 500)
- **Per Day**: 1,000 requests = 500,000 tokens ❌ (over 100K limit)
  - **Actual**: ~200 letters/day (100,000 ÷ 500)

**Scenario 2: Long Letter (1,500 tokens)**
- Input: ~1,000 tokens (long template)
- Output: ~500 tokens (enhanced letter)
- Total: ~1,500 tokens per request

**Calculations:**
- **Per Minute**: 30 requests = 45,000 tokens ❌ (over 12K limit)
  - **Actual**: ~8 letters/minute (12,000 ÷ 1,500)
- **Per Day**: 1,000 requests = 1,500,000 tokens ❌ (over 100K limit)
  - **Actual**: ~66 letters/day (100,000 ÷ 1,500)

---

## 🎯 Practical Limits for Your App

### What You'll Actually Hit First

For typical letter generation:

| Letter Length | Limiting Factor | Daily Capacity |
|---------------|----------------|----------------|
| **Short** (300 tokens) | Token limit (TPD) | ~333 letters/day |
| **Average** (500 tokens) | Token limit (TPD) | **~200 letters/day** |
| **Long** (1,000 tokens) | Token limit (TPD) | ~100 letters/day |
| **Very Long** (1,500 tokens) | Token limit (TPD) | ~66 letters/day |

**Bottom Line**: You'll hit the **100,000 tokens/day limit** before the 1,000 requests/day limit.

---

## 📈 Comparison: Gemini vs Groq

### Free Tier Comparison

| Metric | Gemini 2.5 Flash | Groq (Llama 3.3 70B) | Winner |
|--------|------------------|----------------------|--------|
| **Requests/Minute** | 15 | 30 | 🏆 Groq (2x) |
| **Requests/Day** | 1,500 | 1,000 | 🏆 Gemini (1.5x) |
| **Tokens/Minute** | ~1M | 12,000 | 🏆 Gemini (83x) |
| **Tokens/Day** | ~1M | 100,000 | 🏆 Gemini (10x) |
| **Speed** | Fast | Ultra Fast | 🏆 Groq |
| **Context Window** | 1M tokens | 8K tokens | 🏆 Gemini |

### Real-World Letter Generation

| Use Case | Gemini | Groq | Best Choice |
|----------|--------|------|-------------|
| **Burst Usage** (many letters quickly) | 15/min | 30/min | 🏆 Groq |
| **Daily Volume** (total letters) | ~1,500 | ~200 | 🏆 Gemini |
| **Long Documents** (>8K tokens) | ✅ Yes | ❌ No | 🏆 Gemini |
| **Speed** (latency) | ~2-3s | ~0.5-1s | 🏆 Groq |

---

## 🚀 Optimization Strategies

### 1. Use Both Providers (Recommended)

Your app already supports this! Configure both API keys:

```env
LLM_PROVIDER=groq
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
```

**Strategy:**
- Use Groq for quick bursts (30 RPM)
- Fallback to Gemini when Groq hits daily limit
- Get best of both worlds

### 2. Token Optimization

Reduce token usage to increase daily capacity:

**Current Prompt** (~150 tokens):
```
You are a professional business writing expert. Rewrite the following letter...
[Full system prompt]
```

**Optimized Prompt** (~50 tokens):
```
Rewrite this letter professionally. Keep facts intact. Use formal tone.
```

**Savings**: 100 tokens per request = 100 more letters/day

### 3. Caching Strategy

Cache similar letters to avoid redundant API calls:

```javascript
const cache = new Map();
const cacheKey = `${letterTypeId}-${JSON.stringify(fields)}`;

if (cache.has(cacheKey)) {
  return cache.get(cacheKey); // No API call!
}
```

### 4. Batch Processing

Group similar requests to optimize token usage:

```javascript
// Instead of 10 separate calls (10 x 500 = 5,000 tokens)
// Batch into 1 call (1 x 1,500 = 1,500 tokens)
```

### 5. Smart Fallback Logic

```javascript
async function enhance(text) {
  // Try Groq first (faster)
  const groqResult = await enhanceWithGroq(text);
  if (groqResult) return groqResult;
  
  // Fallback to Gemini (higher limits)
  const geminiResult = await enhanceWithGemini(text);
  if (geminiResult) return geminiResult;
  
  // Return original if both fail
  return text;
}
```

---

## 📊 Rate Limit Headers

Groq returns these headers with every response:

```http
x-ratelimit-limit-requests: 1000        # Daily request limit
x-ratelimit-limit-tokens: 12000         # Per-minute token limit
x-ratelimit-remaining-requests: 950     # Requests left today
x-ratelimit-remaining-tokens: 11500     # Tokens left this minute
x-ratelimit-reset-requests: 23h 45m     # When daily limit resets
x-ratelimit-reset-tokens: 45s           # When minute limit resets
retry-after: 45                         # Seconds to wait (only on 429)
```

### Monitoring Rate Limits

Add this to your code to track usage:

```javascript
async function enhanceWithGroq(text) {
  const response = await fetch(url, { /* ... */ });
  
  // Log rate limit info
  console.log('Requests remaining:', response.headers.get('x-ratelimit-remaining-requests'));
  console.log('Tokens remaining:', response.headers.get('x-ratelimit-remaining-tokens'));
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    console.log(`Rate limited! Retry after ${retryAfter} seconds`);
  }
  
  // ... rest of code
}
```

---

## 🎯 Recommendations

### For Your Letter Generator

**Best Configuration:**

1. **Set Groq as Primary** (faster, good for bursts)
   ```env
   LLM_PROVIDER=groq
   ```

2. **Keep Gemini as Fallback** (higher daily limits)
   ```env
   GEMINI_API_KEY=your_key
   ```

3. **Expected Capacity:**
   - **Burst**: 30 letters/minute (Groq)
   - **Daily**: ~200 letters/day (Groq) + ~1,500 letters/day (Gemini fallback)
   - **Total**: ~1,700 letters/day combined

### When to Upgrade

Consider upgrading to Groq's paid tier if you need:
- More than 200 letters/day consistently
- More than 100K tokens/day
- Batch processing capabilities
- Higher priority in queue

**Groq Developer Tier** (Paid):
- Higher rate limits (varies by model)
- Batch processing
- Flex processing
- Priority support

---

## 🔍 Alternative Models on Groq

If you need higher limits, consider these Groq models:

| Model | RPM | RPD | TPM | TPD | Best For |
|-------|-----|-----|-----|-----|----------|
| **Llama 3.3 70B** | 30 | 1K | 12K | 100K | Quality (current) |
| **Llama 3.1 8B** | 30 | 14.4K | 6K | 500K | Volume |
| **Qwen 3 32B** | 60 | 1K | 6K | 500K | Speed + Volume |

**To switch models**, edit `backend/llmClient.js`:

```javascript
model: 'llama-3.1-8b-instant',  // 14,400 RPD, 500K TPD!
```

---

## 📝 Summary

### Groq Free Tier Limits
- ✅ 30 requests/minute
- ✅ 1,000 requests/day
- ✅ 12,000 tokens/minute
- ✅ 100,000 tokens/day

### Practical Capacity
- **~200 letters/day** (average 500 tokens each)
- **~24 letters/minute** (burst capacity)
- **~66-333 letters/day** (depending on length)

### Best Strategy
- Use Groq for speed and bursts
- Fallback to Gemini for volume
- Combined capacity: ~1,700 letters/day
- Monitor rate limit headers
- Optimize prompts to reduce tokens

---

**Your current setup is optimal for most use cases!** 🎉

With both Groq and Gemini configured, you have:
- Fast generation (Groq)
- High volume capacity (Gemini fallback)
- Automatic failover
- ~1,700 letters/day total capacity

---

**Last Updated**: March 23, 2026
**Source**: https://console.groq.com/docs/rate-limits
