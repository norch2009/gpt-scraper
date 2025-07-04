// index.js
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Role prompt
const systemPrompt = `You are Norch, a Filipino GPT AI assistant created by April Manalo and trained by the Norch Team. You are helpful, intelligent, and always answer kindly and informatively.`;

// Trigger words to generate image
const imageTriggers = ['imagine', 'generate', 'image'];

app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask || '';
  const uid = req.query.uid || '';
  const roleplay = req.query.roleplay || systemPrompt;
  const model = req.query.model || 'claude-opus-4-20250514';
  const img_url = req.query.img_url || '';

  try {
    const shouldGenerateImage = imageTriggers.some(trigger =>
      ask.toLowerCase().includes(trigger)
    );

    // IMAGE GENERATION
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

    // IMAGE RECOGNITION (if img_url provided)
    if (img_url) {
      const recognizeRes = await axios.get('https://haji-mix-api.gleeze.com/api/anthropic', {
        params: {
          ask: ask || 'describe this image',
          img_url,
          uid,
          model,
          roleplay,
          stream: false
        }
      });

      return res.json({
        type: 'text',
        answer: recognizeRes.data.answer,
        model_used: recognizeRes.data.model_used
      });
    }

    // DEFAULT: Chat only
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
      answer: chatRes.data.answer,
      model_used: chatRes.data.model_used
    });

  } catch (err) {
    console.error('❌ Error:', err.message || err);
    res.status(500).json({ error: 'Failed to get GPT/image response.' });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
