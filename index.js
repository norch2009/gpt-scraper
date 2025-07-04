const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = '0c919818-e23a-4174-bc8a-18130389a7ba';

// System prompt for Claude
const systemPrompt = `You are Norch, a Filipino GPT AI assistant created by April Manalo and trained by the Norch Team. Always reply kindly and with helpful information.`;

const imageTriggers = ['imagine', 'generate', 'image'];

app.get('/api/chat', async (req, res) => {
  const ask = req.query.ask?.trim() || '';
  const uid = req.query.uid?.trim() || '';
  const img_url = req.query.img_url?.trim() || '';

  // Basic validation
  if (!ask && !img_url) {
    return res.status(400).json({ error: '`ask` or `img_url` is required' });
  }

  console.log('📝 Request received:', { ask, img_url, uid });

  try {
    // 1. Image generation
    const shouldGenerateImage = imageTriggers.some(trig => ask.toLowerCase().includes(trig));
    if (shouldGenerateImage) {
      const prompt = ask.replace(/imagine|generate|image/gi, '').trim();
      console.log('🎨 Generating image for prompt:', prompt);

      const imgRes = await axios.get('https://haji-mix-api.gleeze.com/api/imagen', {
        params: { prompt, model: 'dall-e-3', quality: 'hd', style: '', size: '' },
        responseType: 'arraybuffer'
      });

      res.set('Content-Type', 'image/png');
      return res.send(imgRes.data);
    }

    // 2. Image recognition
    if (img_url) {
      // Validate URL format quickly
      if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(img_url)) {
        return res.status(400).json({ error: 'img_url must be a direct image link ending with .jpg/.png/.gif' });
      }

      console.log('🔍 Recognizing image via Gemini...');

      const gemRes = await axios.get('https://kaiz-apis.gleeze.com/api/gemini-flash-2.0', {
        params: {
          q: ask || 'describe this image',
          uid,
          imageUrl: img_url,
          apikey: GEMINI_API_KEY
        }
      });

      const gemAnswer = gemRes.data?.response;
      console.log('📥 Gemini returned:', gemAnswer);

      if (gemAnswer) {
        return res.json({
          type: 'text',
          model_used: 'gemini-flash-2.0',
          answer: gemAnswer
        });
      } else {
        console.warn('⚠️ No response from Gemini, falling back to Claude OCR.');
      }

      // Fallback to OCR + Claude if Gemini fails/returns empty
      console.log('🧾 Performing OCR on image...');
      const ocrRes = await axios.get('https://api.ocr.space/parse/imageurl', {
        params: {
          apikey: 'helloworld',
          url: img_url,
          isOverlayRequired: false,
          language: 'eng'
        }
      });

      const extracted = ocrRes.data?.ParsedResults?.[0]?.ParsedText?.trim();
      console.log('📋 OCR extracted:', extracted);

      if (!extracted) {
        return res.json({ type: 'text', model_used: 'ocr-fallback', answer: '❌ OCR failed to extract any text.' });
      }

      // Send extracted text + original prompt to Claude
      console.log('🧠 Asking Claude with extracted text.');
      const chatRes = await axios.get('https://haji-mix-api.gleeze.com/api/anthropic', {
        params: {
          ask: `Here is the extracted text from the image:\n\n"${extracted}"\n\nNow answer the question: ${ask}`,
          uid,
          model: 'claude-opus-4-20250514',
          roleplay: systemPrompt,
          stream: false
        }
      });

      return res.json({
        type: 'text',
        model_used: chatRes.data.model_used,
        answer: chatRes.data.answer
      });
    }

    // 3. Default chat (no image involved)
    console.log('💬 Sending normal chat message');
    const chatRes = await axios.get('https://haji-mix-api.gleeze.com/api/anthropic', {
      params: { ask, uid, model: 'claude-opus-4-20250514', roleplay: systemPrompt, stream: false }
    });

    return res.json({
      type: 'text',
      model_used: chatRes.data.model_used,
      answer: chatRes.data.answer
    });

  } catch (err) {
    console.error('❌ Error in /api/chat:', err.response?.data || err.message || err);
    return res.status(500).json({ error: 'Internal server error', details: err.response?.data || err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Norch server listening on port ${PORT}`));
