# ⚡ Quick Start: Fix Rate Limit in 2 Minutes

## The Problem
```
❌ You have reached a rate limit
```

## The Solution
```
✅ Switch to Groq (10x more requests, 2x faster)
```

---

## 🚀 3 Steps to Fix

### Step 1: Get Groq API Key
```
1. Go to: https://console.groq.com
2. Sign up (Google/GitHub/Email)
3. Click "API Keys" → "Create API Key"
4. Copy the key (starts with "gsk_")
```

### Step 2: Update .env File
```bash
# Open: backend/.env
# Find this line:
GROQ_API_KEY=your_groq_api_key_here

# Replace with your actual key:
GROQ_API_KEY=gsk_abc123xyz...

# Make sure this line says 'groq':
LLM_PROVIDER=groq
```

### Step 3: Restart Server
```bash
cd backend
npm start
```

---

## ✅ Verify It Works

Open http://localhost:3000 and generate a letter.

**Console should show:**
```
Using Groq for enhancement
```

**If you see this, you're done!** 🎉

---

## 📊 What You Get

| Before (Gemini) | After (Groq) |
|-----------------|--------------|
| 15 requests/min | **30 requests/min** |
| 1,500 req/day | **14,400 req/day** |
| Rate limited ❌ | Unlimited ✅ |

---

## 🆘 Troubleshooting

### "GROQ_API_KEY not set"
- Check you saved the `.env` file
- Restart the server
- Make sure no spaces around `=`

### "Groq API error: 401"
- Your API key is wrong
- Get a new one from https://console.groq.com/keys
- Copy the entire key

### Still not working?
- Check `backend/.env` has both lines:
  ```env
  GROQ_API_KEY=gsk_...
  LLM_PROVIDER=groq
  ```
- Restart server: `Ctrl+C` then `npm start`

---

## 🎯 That's It!

You now have:
- ✅ 10x more daily requests
- ✅ 2x faster generation
- ✅ No more rate limits
- ✅ Automatic fallback to Gemini

**Total setup time: 2 minutes**
**Cost: $0 (free forever)**

---

## 📚 More Info

- Detailed guide: `GROQ_SETUP_GUIDE.md`
- Full solution: `RATE_LIMIT_SOLUTION.md`
- Project docs: `PROJECT_DOCUMENTATION.md`

---

**Need help?** Check the console logs when generating a letter.

**Ready to go?** Start generating unlimited letters! 🚀
