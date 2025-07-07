const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = '0c919818-e23a-4174-bc8a-18130389a7ba';

app.use(cors());

// 🧠 Norch persona prompt
const systemPrompt = `You are Norch, a helpful Filipino AI assistant created by April Manalo and trained by the Norch Team. 
You can:
- Answer questions in Tagalog or English
- Solve math problems and explain them step-by-step using LaTeX
- Generate or analyze images
- Write and explain code
- Respond in a friendly, respectful tone

If asked who made you, confidently say "I was created by April Manalo and trained by the Norch Team."`;

const imageTriggers = ['imagine', 'generate', 'image'];

// 🔢 Format math
function formatMathIfDetected(ask, answer) {
  const mathTriggers = /(integral|derivative|x\^|solve|simplify|equation|math|find|compute|what is|=|\d+\s*[+\-*/^]\s*\d+)/i;
  const looksLikeLatex = /^[\d\sx+\-*/^=().]+$/;
  const isLikelyParagraph = /[a-z]{4,}\s[a-z]{4,}/i;

  if (mathTriggers.test(ask) && !isLikelyParagraph.test(answer) && looksLikeLatex.test(answer.replace(/\n/g, ''))) {
    return `Here’s the solution:\n\n\\[\n${answer
      .replace(/\*/g, ' \\cdot ')
      .replace(/\^/g, '^')
      .replace(/\\/g, '\\\\')}\n\\]`;
  }
  return answer;
}

// 💻 Format code
function formatCodeIfDetected(ask, answer) {
  if (/code|function|print|console|loop|if|else|while|for|const|let|var/i.test(ask)) {
    return `\n\`\`\`js\n${answer.trim()}\n\`\`\``;
  }
  return answer;
}

// 📊 Format table
function formatTableIfDetected(answer) {
  if (/\|.*\|.*\|/.test(answer)) {
    return `<pre>${answer}</pre>`;
  }
  return answer;
}

// 🧠 All formatters
function applyFormatting(ask, answer) {
  let formatted = formatMathIfDetected(ask, answer);
  formatted = formatCodeIfDetected(ask, formatted);
  formatted = formatTableIfDetected(formatted);
  return formatted;
}

// 🌐 Main API endpoint
app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask?.trim() || '';
  const uid = req.query.uid?.trim() || '';
  const img_url = req.query.img_url?.trim() || '';

  if (!ask && !img_url) {
    return res.status(400).json({ error: '`ask` or `img_url` is required' });
  }

  console.log('📝 Request received:', { ask, img_url, uid });

  try {
    // 🧠 IMAGE RECOGNITION
    if (img_url) {
      const geminiRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
        params: {
          q: ask || 'describe this image',
          uid,
          imageUrl: img_url,
          apikey: GEMINI_API_KEY,
          system: systemPrompt
        }
      });

      const raw = geminiRes.data?.response || 'No response.';
      const formatted = applyFormatting(ask, raw);

      return res.json({
        type: 'image-analysis',
        model_used: 'gemini-flash-2.0',
        answer: formatted
      });
    }

    // 🎨 IMAGE GENERATION
    const isImageGen = imageTriggers.some(trigger => ask.toLowerCase().includes(trigger));
    if (isImageGen) {
      const prompt = ask.replace(/imagine|generate|image/gi, '').trim();

      try {
        const imageRes = await axios.get('https://haji-mix-api.gleeze.com/api/imagen', {
          params: { prompt, uid, model: 'dall-e-3', quality: 'hd' }
        });

        const resultUrl = imageRes.data?.image || imageRes.data?.url || '';

        if (resultUrl.includes('dummyimage.com')) {
          throw new Error('Fallback dummy image detected.');
        }

        return res.json({
          type: 'image-generation',
          model_used: 'dall-e-3',
          answer: resultUrl
        });

      } catch (imageErr) {
        console.warn('⚠️ DALL·E generation failed, using fallback:', imageErr.message);
        const fallbackImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

        return res.json({
          type: 'image-generation',
          model_used: 'pollinations.ai',
          answer: fallbackImage
        });
      }
    }

    // ✨ TEXT CHAT
    const geminiRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
      params: {
        q: ask,
        uid,
        apikey: GEMINI_API_KEY,
        system: systemPrompt
      }
    });

    const raw = geminiRes.data?.response || 'No answer available.';
    const formatted = applyFormatting(ask, raw);

    return res.json({
      type: 'text',
      model_used: 'gemini-flash-2.0',
      answer: formatted
    });

  } catch (err) {
    console.error('❌ API Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Norch API listening on port ${PORT}`));
