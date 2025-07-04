const express = require("express");
const axios = require("axios");
const cors = require("cors");
const puppeteer = require("puppeteer-core");

const app = express();
app.use(cors());
app.use(express.json());

const POE_TOKEN = "9XW1lCrtQcjFMf4zyeWm8Q%3D%3D"; // ← ILAGAY DITO ANG TUNAY NA `p-b` TOKEN
const CHROME_PATH = "/usr/bin/chromium"; // Common path sa Render

app.get("/", (req, res) => {
  res.send("🚀 Norch Poe GPT API is live on Render.");
});

app.get("/api/gpt", async (req, res) => {
  const question = req.query.ask;
  if (!question) return res.status(400).json({ error: "Missing `ask` query" });

  try {
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0",
      "Cookie": `p-b=${POE_TOKEN}`,
    });

    await page.goto("https://poe.com/gpt-4", { waitUntil: "networkidle2" });

    await page.waitForSelector('textarea', { timeout: 10000 });
    await page.type('textarea', question);
    await page.keyboard.press("Enter");

    await page.waitForTimeout(3000);

    const response = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="message-text"]');
      return el?.innerText || "❌ Walang sagot na nakuha.";
    });

    await browser.close();

    res.json({ response });
  } catch (err) {
    console.error("🛑 Scraper Error:", err);
    res.status(500).json({
      error: "Failed to fetch from Poe",
      details: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on http://localhost:${PORT}`));
