const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = '0c919818-e23a-4174-bc8a-18130389a7ba';

// 🧠 Norch Role / System Prompt
const systemPrompt = `You are a helpful Filipino AI assistant named Norch, created by April Manalo and trained by the Norch Team.

You can:
- Answer questions in Tagalog or English
- Solve math problems and format solutions using LaTeX
- Write and explain JavaScript code
- Generate or analyze images when asked
- Speak in a friendly and respectful tone

If asked, confidently introduce yourself as Norch.`;

// 🔍 Keywords that trigger image generation
const imageTriggers = ['imagine', 'generate', 'image'];

// 🧮 Format math-looking answers with LaTeX only if valid
function formatMathIfDetected(ask, answer) {
  const mathTriggers = /(integral|derivative|x\^|sin|cos|tan|math|solve|simplify|equation|^[-+*/^0-9\sx=().]+$)/i;
  const looksLikeMath = /[\d\s]*[+\-*/^=][\d\sx^]+/i;

  if (mathTriggers.test(ask) || looksLikeMath.test(answer)) {
    return `Here’s the solution:\n\n\\[\n${answer
      .replace(/\*/g, ' \\cdot ')
      .replace(/\^/g, '^')
      .replace(/\\/g, '\\\\')}\n\\]`;
  }

  return answer;
}

// 🧑‍💻 Format code-like answers in JS block
function formatCodeIfDetected(ask, answer) {
  if (/code|function|print|console|loop|if|else|while|for|const|let|var/i.test(ask)) {
    return `\n\`\`\`js\n${answer.trim()}\n\`\`\``;
  }
  return answer;
}

// 📊 Format tables using <pre> tag for neat spacing
function formatTableIfDetected(answer) {
  if (/\|.*\|.*\|/.test(answer)) {
    return `<pre>${answer}</pre>`;
  }
  return answer;
}

// 🎨 Apply formatting based on content type
function applyFormatting(ask, answer) {
  let formatted = formatMathIfDetected(ask, answer);
  formatted = formatCodeIfDetected(ask, formatted);
  formatted = formatTableIfDetected(formatted);
  return formatted;
}

// 📡 API endpoint
app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask?.trim() || '';
  const uid = req.query.uid?.trim() || '';
  const img_url = req.query.img_url?.trim() || '';

  if (!ask && !img_url) {
    return res.status(400).json({ error: '`ask` or `img_url` is required' });
  }

  console.log('📝 Request received:', { ask, img_url, uid });

  try {
    // 🖼️ Handle image recognition
    if (img_url) {
      const geminiRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
        params: { q: ask || 'describe this image', uid, imageUrl: img_url, apikey: GEMINI_API_KEY }
      });

      const raw = geminiRes.data?.response || 'No response.';
      const formatted = applyFormatting(ask, raw);

      return res.json({
        type: 'image-analysis',
        model_used: 'gemini-flash-2.0',
        answer: formatted
      });
    }

    // 🎨 Handle image generation if keywords are detected
    const isImageGen = imageTriggers.some(trigger => ask.toLowerCase().includes(trigger));
    if (isImageGen) {
      const prompt = ask.replace(/imagine|generate|image/gi, '').trim();
      const imageRes = await axios.get('https://haji-mix-api.gleeze.com/api/imagen', {
        params: { prompt, uid, model: 'dall-e-3', quality: 'hd' },
        responseType: 'arraybuffer'
      });
      res.set('Content-Type', 'image/png');
      return res.send(imageRes.data);
    }

    // 🧠 Handle text-based AI chat
    const geminiRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
      params: { q: ask, uid, apikey: GEMINI_API_KEY }
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
