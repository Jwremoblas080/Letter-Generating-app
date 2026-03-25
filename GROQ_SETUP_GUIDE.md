# 🚀 Groq Setup Guide - Bypass Rate Limits!

## Why Groq?

You've hit Gemini's rate limit. **Groq offers MUCH higher free tier limits:**

| Provider | Requests/Minute | Requests/Day | Speed |
|----------|----------------|--------------|-------|
| **Gemini** | 15 RPM | 1,500/day | Fast |
| **Groq** | 30 RPM | 14,400/day | **Ultra Fast** |

Groq is **2x faster** and has **10x more daily requests**!

---

## 🔑 Get Your Groq API Key (2 minutes)

### Step 1: Sign Up
1. Go to: **https://console.groq.com**
2. Click "Sign Up" (top right)
3. Sign up with Google, GitHub, or email
4. Verify your email if needed

### Step 2: Create API Key
1. After login, you'll see the dashboard
2. Click "API Keys" in the left sidebar
3. Click "Create API Key"
4. Give it a name (e.g., "Letter Generator")
5. Click "Create"
6. **Copy the API key** (you won't see it again!)

### Step 3: Add to Your Project
1. Open `backend/.env`
2. Find the line: `GROQ_API_KEY=your_groq_api_key_here`
3. Replace `your_groq_api_key_here` with your actual key
4. Save the file

Example:
```env
GROQ_API_KEY=gsk_abc123xyz456...
```

---

## ✅ Verify Setup

### Option 1: Restart Server
```bash
cd backend
npm start
```

The console will show:
```
Using Groq for enhancement
```

### Option 2: Test Generation
1. Open http://localhost:3000
2. Select a letter type
3. Fill the form
4. Click "Generate Letter"
5. Check the backend console - you should see "Using Groq"

---

## 🎯 How It Works

Your project now supports **BOTH** Gemini and Groq with automatic fallback:

### Configuration (backend/.env)
```env
# Set to 'groq' to use Groq as primary
LLM_PROVIDER=groq

# Or set to 'gemini' to use Gemini as primary
LLM_PROVIDER=gemini
```

### Automatic Fallback
- If Groq fails → automatically tries Gemini
- If Gemini fails → automatically tries Groq
- If both fail → returns unenhanced letter

### Smart Routing
```
User Request
    ↓
Primary Provider (Groq)
    ↓
Success? → Return enhanced letter
    ↓
Failed? → Try Fallback (Gemini)
    ↓
Success? → Return enhanced letter
    ↓
Failed? → Return original letter
```

---

## 🔧 Troubleshooting

### "GROQ_API_KEY not set" in console
- Check that you added the key to `backend/.env`
- Make sure there are no spaces around the `=`
- Restart the server after editing `.env`

### "Groq API error: 401"
- Your API key is invalid
- Generate a new key from https://console.groq.com/keys
- Make sure you copied the entire key

### "Groq API error: 429"
- You've hit Groq's rate limit (rare with 30 RPM)
- The system will automatically fallback to Gemini
- Wait 1 minute and try again

### Still getting rate limit errors
- Check which provider is being used (console logs)
- Make sure both API keys are valid
- Consider adding a delay between requests

---

## 📊 Model Information

### Groq Model: llama-3.3-70b-versatile
- **Size**: 70 billion parameters
- **Speed**: Ultra-fast (Groq's LPU technology)
- **Quality**: Excellent for business writing
- **Context**: 8,192 tokens
- **Best for**: Professional letter generation

### Alternative Groq Models
You can change the model in `backend/llmClient.js` and `backend/server.js`:

```javascript
model: 'llama-3.3-70b-versatile',  // Current (recommended)
// model: 'llama-3.1-70b-versatile',  // Alternative
// model: 'mixtral-8x7b-32768',       // Longer context
```

---

## 🎉 Benefits of This Setup

✅ **No More Rate Limits**: 14,400 requests/day vs 1,500
✅ **Faster Generation**: Groq is 2-3x faster than Gemini
✅ **Automatic Fallback**: Never fails completely
✅ **Zero Code Changes**: Just add API key and restart
✅ **Free Forever**: Groq's free tier is permanent

---

## 🔄 Switching Between Providers

### Use Groq (Recommended)
```env
LLM_PROVIDER=groq
```

### Use Gemini
```env
LLM_PROVIDER=gemini
```

### Use Both (Automatic Fallback)
Leave both API keys in `.env` - the system will use the primary and fallback to the other if needed.

---

## 📝 Quick Reference

| Task | Command/URL |
|------|-------------|
| Get Groq API Key | https://console.groq.com/keys |
| Get Gemini API Key | https://makersuite.google.com/app/apikey |
| Edit Config | `backend/.env` |
| Restart Server | `npm start` (in backend folder) |
| Check Logs | Look at terminal where server is running |

---

## 🆘 Need Help?

1. Check the console logs when generating a letter
2. Verify both API keys are valid
3. Make sure you restarted the server after editing `.env`
4. Test with a simple letter first

---

**You're all set!** 🎊

Your letter generator now has:
- 10x more daily requests
- 2x faster generation
- Automatic fallback protection
- Zero downtime

Enjoy unlimited letter generation! 🚀
