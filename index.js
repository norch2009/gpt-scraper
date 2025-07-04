const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();
app.use(cors());
app.use(express.json());

const MEMORY_FILE = "./chatMemory.json";
const BASE_API = "https://haji-mix-api.gleeze.com/api/anthropic";

// 🔁 Load chat memory from file
async function getMemory(uid) {
  try {
    const memory = await fs.readJson(MEMORY_FILE);
    return memory[uid] || [];
  } catch {
    return [];
  }
}

// 💾 Save user chat memory
async function saveMemory(uid, userMsg, botMsg) {
  const memory = await fs.readJson(MEMORY_FILE).catch(() => ({}));
  memory[uid] = memory[uid] || [];
  memory[uid].push({ user: userMsg, bot: botMsg });
  if (memory[uid].length > 10) memory[uid].shift(); // Limit to 10 messages
  await fs.writeJson(MEMORY_FILE, memory, { spaces: 2 });
}

// 🔁 Clear memory endpoint (optional)
app.get("/api/reset", async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "Missing uid" });

  const memory = await fs.readJson(MEMORY_FILE).catch(() => ({}));
  delete memory[uid];
  await fs.writeJson(MEMORY_FILE, memory, { spaces: 2 });
  res.json({ success: true, message: `Memory for ${uid} cleared.` });
});

// 🧠 Wrapper API endpoint with memory
app.get("/api/chat", async (req, res) => {
  const { ask, uid = "guest", model = "claude-opus-4-20250514" } = req.query;
  if (!ask) return res.status(400).json({ error: "Missing ask query" });

  const memory = await getMemory(uid);
  const promptWithContext = memory
    .map(msg => `User: ${msg.user}\nAssistant: ${msg.bot}`)
    .join("\n") + `\nUser: ${ask}`;

  try {
    const response = await axios.get(BASE_API, {
      params: {
        ask: promptWithContext,
        model,
        uid,
        stream: false
      }
    });

    const botReply = response.data?.answer || "❌ No response.";
    await saveMemory(uid, ask, botReply);

    res.json({ reply: botReply, memoryLength: memory.length });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: "Failed to get GPT response." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
