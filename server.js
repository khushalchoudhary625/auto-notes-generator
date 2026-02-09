const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

app.post("/generate", upload.single("file"), async (req, res) => {
  try {
    const topic = req.body.topic;
    const file = req.file;

    let content = "";

    if (topic && topic.trim() !== "") {
      content = topic;
    } else if (file) {
      content = file.originalname; // later: extract real text
    } else {
      return res.status(400).json({ error: "No file or topic provided" });
    }

    const prompt = `
You are a study assistant.

For the following topic/content:
${content}

Return the response strictly in JSON format like this:

{
  "shortNotes": "....",
  "keyFormulas": "....",
  "examPoints": "...."
}

Rules:
- shortNotes: concise bullet points
- keyFormulas: only formulas (or say 'No major formulas')
- examPoints: important exam-focused points
- Do NOT add anything outside JSON.
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
    });

    const aiText = completion.choices[0].message.content;

    // Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (e) {
      console.error("JSON parse failed:", aiText);
      return res.status(500).json({ error: "AI returned invalid format" });
    }

    res.json({
      shortNotes: parsed.shortNotes || "No data",
      keyFormulas: parsed.keyFormulas || "No data",
      examPoints: parsed.examPoints || "No data",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
