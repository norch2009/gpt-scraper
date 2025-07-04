const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
app.use(cors());

const COOKIE = {
  name: "p-b",
  value: "9XW1lCrtQcjFMf4zyeWm8Q==", // decoded form
  domain: ".poe.com",
  path: "/",
  httpOnly: true,
  secure: true
};

app.get("/api/gpt", async (req, res) => {
  const question = req.query.ask;
  if (!question) return res.status(400).json({ error: "Missing ask query" });

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();

    // Set cookie for login
    await page.setCookie(COOKIE);

    // Go to GPT-4.1 bot directly
    await page.goto("https://poe.com/GPT-4.1", { waitUntil: "networkidle2" });

    // Wait for textarea and type the question
    await page.waitForSelector("textarea");
    await page.type("textarea", question);
    await page.keyboard.press("Enter");

    // Wait for response to appear
    await page.waitForSelector("[data-testid='message-text']", { timeout: 15000 });

    // Get the latest bot response
    const responseText = await page.$$eval(
      "[data-testid='message-text']",
      nodes => nodes[nodes.length - 1].innerText
    );

    await browser.close();
    res.json({ response: responseText });
  } catch (err) {
    console.error("❌", err);
    res.status(500).json({ error: "Failed to fetch from Poe", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Norch GPT Scraper live at http://localhost:${PORT}`));
