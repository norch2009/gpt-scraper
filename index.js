const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PROXY_URL = "https://chatgpt.pawan.krd/api/completions";

app.get("/", (req, res) => {
  res.send("✅ Norch GPT Proxy is running.");
});

app.post("/v1/chat/completions", async (req, res) => {
  try {
    const response = await axios.post(PROXY_URL, req.body, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Proxy error:", error.message);
    res.status(500).json({ error: "Proxy failed", details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
