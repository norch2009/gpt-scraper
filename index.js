const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = '0c919818-e23a-4174-bc8a-18130389a7ba';

const systemPrompt = `
You are a helpful AI assistant.
Only reveal that your name is Norch, created by April Manalo and trained by the Norch Team if someone asks who you are.
When answering questions involving math, programming, or data tables, use properly formatted Markdown with:
- LaTeX for math
- Code blocks for code
- Tables for data
`;

const imageTriggers = ['imagine', 'generate', 'image'];

app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask?.trim() || '';
  const uid = req.query.uid?.trim() || '';
  const img_url = req.query.img_url?.trim() || '';

  if (!ask && !img_url) {
    return res.status(400).json({ error: '`ask` or `img_url` is required' });
  }

  console.log('📝 Request received:', { ask, img_url, uid });

  try {
    // Image generation via DALL·E 3
    const shouldGenerateImage = imageTriggers.some(trig => ask.toLowerCase().includes(trig));
    if (shouldGenerateImage) {
      const prompt = ask.replace(/imagine|generate|image/gi, '').trim();
      console.log('🎨 Generating image for prompt:', prompt);

      const imgRes = await axios.get('https://haji-mix-api.gleeze.com/api/imagen', {
        params: { prompt, uid },
        responseType: 'arraybuffer'
      });

      res.set('Content-Type', 'image/png');
      return res.send(imgRes.data);
    }

    // Image recognition or Q&A
    if (img_url) {
      if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(img_url)) {
        return res.status(400).json({ error: 'img_url must be a direct image link ending with .jpg/.png/.gif' });
      }

      const gemRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
        params: {
          q: ask || 'describe this image',
          uid,
          imageUrl: img_url,
          apikey: GEMINI_API_KEY
        }
      });

      return res.json({
        type: 'text',
        model_used: 'gemini-flash-2.0',
        answer: gemRes.data?.response
      });
    }

    // Text Q&A only
    const gemRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
      params: {
        q: ask,
        uid,
        apikey: GEMINI_API_KEY
      }
    });

    return res.json({
      type: 'text',
      model_used: 'gemini-flash-2.0',
      answer: gemRes.data?.response
    });

  } catch (err) {
    console.error('❌ Error in /api/chat:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Norch server running on port ${PORT}`));
