// LLM Client — supports multiple AI providers (Gemini, Groq)
// Set LLM_PROVIDER in .env to choose: 'gemini' (default) or 'groq'

const SYSTEM_PROMPT = `You are a professional business writing expert specializing in formal correspondence. Your task is to revise the letter provided below to enhance its clarity, tone, and overall impact.

Guidelines:
- Use a formal, professional business tone throughout
- Improve sentence structure, grammar, and flow for maximum clarity and readability
- Preserve all original facts, names, dates, and details exactly as given — do not add, remove, or alter any information
- Organize the content into well-structured paragraphs with proper business letter formatting
- Ensure the writing is concise, polished, and persuasive
- Eliminate redundancy and awkward phrasing while maintaining the original intent

Output Requirements:
- Return only the revised letter
- Do not include explanations, comments, or any additional text outside the letter`;

/**
 * Enhance letter text via Gemini API.
 * @param {string} text
 * @returns {Promise<string|null>}
 */
async function enhanceWithGemini(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set');
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\nLetter to enhance:\n\n${text}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, err);
      return null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.error('Gemini fetch error:', err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Enhance letter text via Groq API.
 * @param {string} text
 * @returns {Promise<string|null>}
 */
async function enhanceWithGroq(text) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY not set');
    return null;
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Fast and high quality
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: `Letter to enhance:\n\n${text}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Groq API error:', response.status, err);
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('Groq fetch error:', err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Enhance letter text using the configured LLM provider.
 * Falls back to alternative provider if primary fails.
 * @param {string} text
 * @returns {Promise<string|null>}
 */
async function enhance(text) {
  const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

  // No AI mode - return null to use original text
  if (provider === 'none' || provider === 'off' || provider === 'disabled') {
    console.log('AI enhancement disabled - using original text');
    return null;
  }

  // Try primary provider
  if (provider === 'groq') {
    console.log('Using Groq for enhancement');
    const result = await enhanceWithGroq(text);
    if (result) return result;
    
    // Fallback to Gemini
    console.log('Groq failed, falling back to Gemini');
    return await enhanceWithGemini(text);
  } else {
    console.log('Using Gemini for enhancement');
    const result = await enhanceWithGemini(text);
    if (result) return result;
    
    // Fallback to Groq
    console.log('Gemini failed, falling back to Groq');
    return await enhanceWithGroq(text);
  }
}

module.exports = { enhance, enhanceWithGemini, enhanceWithGroq };
