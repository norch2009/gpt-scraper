// ✅ Full Poe GPT Scraper for Render using Puppeteer
// ✅ Make sure to add your Poe "p-b" cookie in the placeholder below

const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("🚀 Norch Poe GPT API is live.");
});

app.get("/api/gpt", async (req, res) => {
  const ask = req.query.ask;
  if (!ask) return res.status(400).json({ error: "Missing 'ask' parameter" });

  const cookiePB = "9XW1lCrtQcjFMf4zyeWm8Q%3D%3D"; // ← replace this with your actual `p-b` token

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Set Poe cookie to simulate logged-in session
    await page.setCookie({
      name: "p-b",
      value: cookiePB,
      domain: ".poe.com",
      path: "/",
      httpOnly: true,
      secure: true,
    });

    // Visit Poe GPT-4.1 bot page directly
    await page.goto("https://poe.com/ChatGPT", { waitUntil: "networkidle2" });

    // Type the prompt
    await page.waitForSelector('textarea[placeholder="Talk to ChatGPT on Poe"]', { timeout: 10000 });
    await page.type('textarea[placeholder="Talk to ChatGPT on Poe"]', ask);
    await page.keyboard.press("Enter");

    // Wait for the reply to appear
    await page.waitForFunction(() => {
      const reply = document.querySelector("[data-testid='message-text']");
      return reply && reply.textContent.length > 0;
    }, { timeout: 20000 });

    // Extract the response
    const response = await page.evaluate(() => {
      const replies = document.querySelectorAll("[data-testid='message-text']");
      return replies[replies.length - 1].textContent.trim();
    });

    await browser.close();
    res.json({ success: true, response });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({
      error: "Failed to fetch from Poe",
      details: err.message || err,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
