const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Your Gemini Flash API key (private, not exposed to frontend)
const GEMINI_API_KEY = '0c919818-e23a-4174-bc8a-18130389a7ba';

// Role prompt for Claude
const systemPrompt = `You are Norch, a Filipino GPT AI assistant created by April Manalo and trained by the Norch Team. You are helpful, intelligent, and always answer kindly and informatively.`;

// Keywords to trigger image generation
const imageTriggers = ['imagine', 'generate', 'image'];

app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask || '';
  const uid = req.query.uid || '';
  const roleplay = req.query.roleplay || systemPrompt;
  const model = req.query.model || 'claude-opus-4-20250514';
  const img_url = req.query.img_url || '';

  try {
    // 🖼️ Image generation (DALL·E)
    const shouldGenerateImage = imageTriggers.some(trigger =>
      ask.toLowerCase().includes(trigger)
    );
    if (shouldGenerateImage) {
      const prompt = ask.replace(/imagine|generate|image/gi, '').trim();
      const imageRes = await axios.get('https://haji-mix-api.gleeze.com/api/imagen', {
        params: {
          prompt,
          model: 'dall-e-3',
          quality: 'hd',
          style: '',
          size: ''
        },
        responseType: 'arraybuffer'
      });
      res.set('Content-Type', 'image/png');
      return res.send(imageRes.data);
    }

    // 👁️ Image recognition via Gemini Flash
    if (img_url) {
      const geminiRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
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
        answer: geminiRes.data.response || '❌ No response from Gemini.'
      });
    }

    // 💬 Default: Claude chat
    const chatRes = await axios.get('https://haji-mix-api.gleeze.com/api/anthropic', {
      params: {
        ask,
        uid,
        model,
        roleplay,
        stream: false
      }
    });

    res.json({
      type: 'text',
      model_used: chatRes.data.model_used,
      answer: chatRes.data.answer
    });

  } catch (err) {
    console.error('❌ Error:', err.message || err);
    res.status(500).json({ error: 'Failed to get GPT/image response.' });
  }
});

app.listen(PORT, () => console.log(`✅ Norch server running on port ${PORT}`));
