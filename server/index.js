import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Queue } from 'bullmq';
import { Ollama } from "@langchain/ollama";
import fs from 'fs';

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

const queue = new Queue("file-upload-queue");

const llm = new Ollama({
  model: "llama3",
  baseUrl: "http://localhost:11434",
  temperature: 0.1, 
});

// Ollama se direct Vector nikalne ka solid function
async function getOllamaEmbedding(text) {
  try {
    const response = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: text
      })
    });
    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error("Embedding generation fail:", error);
    throw error;
  }
}

// Cosine Similarity Math Engine
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

app.get('/', (req, res) => {
  return res.json({ status: "All Good!!" });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

app.post('/upload/pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "File nahi mili!" });
  queue.add('file-ready', JSON.stringify({
    filename: req.file.originalname,
    path: req.file.path
  }));
  return res.json({ message: 'Uploaded' });
});

app.post('/api/chat', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Sawaal toh poocho bhai!" });

  try {
    if (!fs.existsSync("vector_data.json")) {
      return res.status(400).json({ error: "Pehle koi PDF upload karo!" });
    }

    const savedData = JSON.parse(fs.readFileSync("vector_data.json", "utf-8"));
    console.log(`\n--- Chat Triggered! Total DB Chunks: ${savedData.length} ---`);

    // 1. Sawaal ke words ko lowercase mein todlein (Keywords Extraction)
    const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // 2. Direct Ollama standard embedding query
    const queryVector = await getOllamaEmbedding(question);

    // 3. Similarity score + Keyword Boost calculate karke filter karein
    const scoredChunks = savedData.map(item => {
      let similarity = cosineSimilarity(queryVector, item.embedding);
      
      // Smart Boost: Agar sawaal ka exact word (jaise 'status') chunk mein hai, toh score badhao
      const itemTextLower = item.text.toLowerCase();
      keywords.forEach(word => {
        if (itemTextLower.includes(word)) {
          similarity += 0.25; // ⚡ Boosting score for perfect match
        }
      });

      return { ...item, similarity };
    });

    // Score ke basis par sort karein aur top 3 nikaalein
    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    const topChunks = scoredChunks.slice(0, 3);

    console.log("Top Matched Chunk Preview (With Hybrid Boosting):");
    topChunks.forEach((c, idx) => {
      console.log(`[Match ${idx + 1}] Score: ${c.similarity.toFixed(4)} | Text: ${c.text.substring(0, 80)}...`);
    });

    const contextText = topChunks.map(item => item.text).join("\n\n");

    const prompt = `
      You are a helpful assistant. Answer the user's question based strictly on the provided context below. 
      If the context does not contain the answer, say "I don't know based on the document". Do not make up facts.

      Context:
      ${contextText}

      Question: ${question}
      Answer:
    `;

    const aiResponse = await llm.invoke(prompt);

    return res.json({
      success: true,
      answer: aiResponse,
      sources: topChunks.map(item => item.source)
    });

  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Jawab dhoodhne mein dikat aayi." });
  }
});

app.listen(port, () => console.log(`SERVER IS RUNNING ON PORT ${port}`));