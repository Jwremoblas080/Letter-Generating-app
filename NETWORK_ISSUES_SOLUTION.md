# 🔧 Network Issues - "fetch failed" Error

## The Problem

You're seeing these errors:
```
Groq error: fetch failed
Gemini error: fetch failed
```

This means your network/firewall is blocking access to external AI APIs.

---

## ✅ Solution 1: Disable AI Enhancement (Works Immediately)

I've added a "no-AI" mode that works completely offline!

### Step 1: Edit `.env`
```env
# Set to 'none' to disable AI (works offline)
LLM_PROVIDER=none
```

### Step 2: Restart Server
```bash
cd backend
npm start
```

### Step 3: Test
- Generate a letter
- Console shows: "AI enhancement disabled - using original text"
- Letter will use the template without AI polishing
- Everything else works (preview, copy, PDF download)

### What You Get
- ✅ Works offline
- ✅ No network errors
- ✅ Instant generation (no API delay)
- ✅ All features work (except AI enhancement)
- ✅ Letters use clean templates

### What You Lose
- ❌ No AI polishing/enhancement
- ❌ Letters won't be as "professional" (but still good!)
- ❌ DOCX field detection won't work (manual templates only)

---

## ✅ Solution 2: Use Mobile Hotspot (Recommended)

### Why This Works
Mobile networks often have different firewall rules than your main internet.

### Steps
1. **Enable hotspot on your phone**
   - Android: Settings → Network → Hotspot
   - iPhone: Settings → Personal Hotspot

2. **Connect computer to hotspot**
   - Use WiFi to connect to your phone

3. **Restart server**
   ```bash
   cd backend
   npm start
   ```

4. **Change back to AI mode**
   ```env
   LLM_PROVIDER=groq  # or gemini
   ```

5. **Test generation**
   - Should work now!

---

## ✅ Solution 3: Use VPN

### Free VPN Options
- **ProtonVPN** (free tier, no logs)
- **Windscribe** (10GB/month free)
- **TunnelBear** (500MB/month free)

### Steps
1. Install VPN software
2. Connect to any server
3. Restart your server
4. Try generating a letter

---

## ✅ Solution 4: Check Firewall Settings

### Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Find "Node.js" and check both Private and Public
4. Restart server

### Antivirus Software
- Temporarily disable antivirus
- Try generating a letter
- If it works, add Node.js to antivirus whitelist

---

## 🔍 Diagnostic Steps

### Check if it's a network issue:

```bash
# Test Groq connectivity
curl https://api.groq.com/openai/v1/models

# Test Gemini connectivity
curl https://generativelanguage.googleapis.com
```

**If these fail**, it's definitely a network block.

---

## 📊 Comparison: AI vs No-AI Mode

| Feature | With AI | Without AI (LLM_PROVIDER=none) |
|---------|---------|--------------------------------|
| Letter Generation | ✅ Enhanced | ✅ Template only |
| Preview | ✅ | ✅ |
| Copy to Clipboard | ✅ | ✅ |
| PDF Download | ✅ | ✅ |
| DOCX Upload | ✅ With field detection | ❌ Not available |
| Speed | ~2-3 seconds | Instant |
| Network Required | ✅ Yes | ❌ No |
| Quality | Professional | Good |

---

## 🎯 Recommended Approach

### For Development/Testing
```env
LLM_PROVIDER=none
```
- Fast iteration
- No network issues
- Test all features except AI

### For Production/Demo
```env
LLM_PROVIDER=groq  # or gemini
```
- Use mobile hotspot or VPN
- Get AI-enhanced letters
- Professional quality

---

## 🔧 Quick Reference

### Enable AI (requires network)
```env
LLM_PROVIDER=groq    # Fast, 30 RPM
# or
LLM_PROVIDER=gemini  # Higher daily limit
```

### Disable AI (works offline)
```env
LLM_PROVIDER=none
```

### Check Current Mode
Look at server console when generating:
```
AI enhancement disabled - using original text  ← No AI mode
Using Groq for enhancement                     ← Groq mode
Using Gemini for enhancement                   ← Gemini mode
```

---

## 💡 Pro Tips

### Hybrid Approach
1. Develop with `LLM_PROVIDER=none` (fast, no network issues)
2. Test with AI using mobile hotspot before demo
3. Switch back to `none` for continued development

### Template Quality
Without AI, your templates are used directly, so make them good:

```javascript
// Good template (works well without AI)
template: `Dear ${institution_name},

I am writing to formally request permission to host ${event_name} 
at ${facility_name} on ${event_date}.

This event will bring together ${expected_participants} participants 
for ${event_description}.

We believe this aligns with your institution's mission and would be 
honored to host this event at your facility.

Sincerely,
${organizer_name}
${organization_name}`
```

---

## 🆘 Still Having Issues?

### Error: "AI enhancement was unavailable"
- ✅ This is normal! The app works without AI
- ✅ Letter is generated from template
- ✅ All features work except AI polishing

### Error: "fetch failed"
- ❌ Network is blocking API access
- ✅ Use mobile hotspot or VPN
- ✅ Or set `LLM_PROVIDER=none`

### DOCX upload not working
- ❌ DOCX feature requires AI for field detection
- ✅ Use template-based letters instead
- ✅ Or fix network to enable AI

---

## 📝 Summary

**Problem**: Network blocks AI API access
**Quick Fix**: Set `LLM_PROVIDER=none` in `.env`
**Best Fix**: Use mobile hotspot or VPN
**Result**: App works perfectly either way!

---

**Your app is now network-resilient!** 🎉

You can:
- ✅ Work offline with `LLM_PROVIDER=none`
- ✅ Use AI when network allows
- ✅ Switch between modes anytime
- ✅ Never blocked by network issues

---

**Last Updated**: March 23, 2026
