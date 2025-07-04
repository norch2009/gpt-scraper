// index.js
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Role prompt
const systemPrompt = `You are Norch, a Filipino GPT AI assistant created by April Manalo and trained by the Norch Team. You are helpful, intelligent, and always answer kindly and informatively.`;

// Trigger words for image
const imageTriggers = ['imagine', 'generate', 'image'];

app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask || '';
  const uid = req.query.uid || '';
  const roleplay = req.query.roleplay || systemPrompt;
  const model = req.query.model || 'claude-opus-4-20250514';

  try {
    const shouldGenerateImage = imageTriggers.some(trigger => ask.toLowerCase().includes(trigger));

    if (shouldGenerateImage) {
      // Use image endpoint
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

      // Return image as PNG buffer
      res.set('Content-Type', 'image/png');
      return res.send(imageRes.data);
    } else {
      // Use Claude for chat
      const response = await axios.get('https://haji-mix-api.gleeze.com/api/anthropic', {
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
        answer: response.data.answer,
        model_used: response.data.model_used
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get GPT/image response.' });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
