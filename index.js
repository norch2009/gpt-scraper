const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PROXY_URL = "https://chatgpt.pawan.krd/api/completions";

// ✅ Root route
app.get("/", (req, res) => {
  res.send("🤖 Norch GPT Proxy is running!");
});

// ✅ Custom GET route (e.g. /api/gpt?ask=hello)
app.get("/api/gpt", async (req, res) => {
  const question = req.query.ask;
  if (!question) {
    return res.status(400).json({ error: "Missing `ask` query." });
  }

  try {
    const response = await axios.post(PROXY_URL, {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: question }]
    });

    const reply = response.data.choices?.[0]?.message?.content || "❌ No response.";
    res.json({ response: reply });
  } catch (err) {
    console.error("❌ GET API error:", err.message);
    res.status(500).json({ error: "Failed to get GPT response." });
  }
});

// ✅ POST route (OpenAI-style)
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const response = await axios.post(PROXY_URL, req.body, {
      headers: { "Content-Type": "application/json" }
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ POST API error:", error.message);
    res.status(500).json({ error: "Proxy failed", details: error.message });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Norch GPT Proxy running at http://localhost:${PORT}`);
});
