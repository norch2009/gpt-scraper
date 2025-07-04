const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const POE_TOKEN = "9XW1lCrtQcjFMf4zyeWm8Q%3D%3D"; // Your p-b cookie token

app.get("/api/gpt", async (req, res) => {
  const question = req.query.ask;
  if (!question) return res.status(400).json({ error: "Missing `ask` query" });

  try {
    const response = await axios.post(
      "https://poe.com/api/gql_POST",
      {
        query: `mutation { 
          messageCreate(
            input: {
              bot: "gpt-4-1",
              query: ${JSON.stringify(question)},
              source: "chat_page"
            }
          ) { message { text } }
        }`,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cookie": `p-b=${POE_TOKEN}`,
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    const data = response.data;
    const text = data?.data?.messageCreate?.message?.text || "❌ Failed to fetch response";

    res.json({ response: text });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
