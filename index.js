const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 Norch Poe GPT API is live.");
});

app.get("/api/gpt", async (req, res) => {
  const question = req.query.ask;
  if (!question) {
    return res.status(400).json({ error: "Missing `ask` query" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    // Replace this with your real `p-b` Poe cookie
    const POE_TOKEN = "9XW1lCrtQcjFMf4zyeWm8Q%3D%3D";

    await page.setExtraHTTPHeaders({
      'Cookie': `p-b=${POE_TOKEN}`,
      'User-Agent': 'Mozilla/5.0'
    });

    await page.goto("https://poe.com/capybara", { waitUntil: "networkidle2" });

    // Wait for textarea and type message
    await page.waitForSelector("textarea");
    await page.type("textarea", question);
    await page.keyboard.press("Enter");

    // Wait for response bubble
    await page.waitForSelector(".Message_botMessageBubble__SWIEk", { timeout: 15000 });

    const responseText = await page.evaluate(() => {
      const messages = [...document.querySelectorAll(".Message_botMessageBubble__SWIEk")];
      return messages.at(-1)?.innerText || "❌ No response";
    });

    await browser.close();
    res.json({ response: responseText });
  } catch (err) {
    console.error("❌ Scraper Error:", err.message);
    res.status(500).json({
      error: "Failed to fetch from Poe",
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
