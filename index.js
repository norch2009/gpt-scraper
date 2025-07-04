const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Gemini Flash API Key (keep private)
const GEMINI_API_KEY = '0c919818-e23a-4174-bc8a-18130389a7ba';

// 🎭 Default roleplay system prompt for Claude
const systemPrompt = `You are Norch, a Filipino GPT AI assistant created by April Manalo and trained by the Norch Team. You are helpful, intelligent, and always answer kindly and informatively.`;

// 🖼️ Keywords that trigger image generation
const imageTriggers = ['imagine', 'generate', 'image'];

app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask || '';
  const uid = req.query.uid || '';
  const roleplay = req.query.roleplay || systemPrompt;
  const model = req.query.model || 'claude-opus-4-20250514';
  const img_url = req.query.img_url || '';

  // ❗ Basic validation
  if (!ask && !img_url) {
    return res.status(400).json({ error: '`ask` or `img_url` query is required.' });
  }

  // 🔍 Debugging logs
  console.log('🔎 ask:', ask);
  console.log('🔗 img_url:', img_url);
  console.log('👤 uid:', uid);
  console.log('🎭 roleplay:', roleplay);

  try {
    // 🖼️ IMAGE GENERATION via DALL·E
    const shouldGenerateImage = imageTriggers.some(trigger =>
      ask.toLowerCase().includes(trigger)
    );

    if (shouldGenerateImage) {
      try {
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
      } catch (imgErr) {
        console.error('❌ Image Generation Error:', imgErr.response?.data || imgErr.message);
        return res.status(500).json({ error: 'Image generation failed.' });
      }
    }

    // 👁️ IMAGE RECOGNITION via GEMINI FLASH
    if (img_url) {
      try {
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
      } catch (gemErr) {
        console.error('❌ Gemini Recognition Error:', gemErr.response?.data || gemErr.message);
        return res.status(500).json({ error: 'Gemini image recognition failed.' });
      }
    }

    // 💬 DEFAULT: CLAUDE CHAT
    try {
      const chatRes = await axios.get('https://haji-mix-api.gleeze.com/api/anthropic', {
        params: {
          ask,
          uid,
          model,
          roleplay,
          stream: false
        }
      });

      return res.json({
        type: 'text',
        model_used: chatRes.data.model_used,
        answer: chatRes.data.answer
      });
    } catch (claudeErr) {
      console.error('❌ Claude Chat Error:', claudeErr.response?.data || claudeErr.message);
      return res.status(500).json({ error: 'Claude chat failed.' });
    }

  } catch (err) {
    const errorDetails = err.response?.data || err.message || err;
    console.error('❌ General Error:', errorDetails);
    res.status(500).json({ error: 'Failed to get GPT/image response.', details: errorDetails });
  }
});

app.listen(PORT, () => console.log(`✅ Norch server running on port ${PORT}`));
