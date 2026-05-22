import { Worker } from "bullmq";
import fs from "fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const connection = { host: '127.0.0.1', port: 6379 };

// Direct Ollama API call for consistent embeddings
async function getOllamaEmbedding(text) {
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
};

// Solid Node-Compatible PDF Text Extractor
async function extractTextFromPdf(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  
  // Ekdum clean and direct load (Bina kisi worker configuration jhanjhat ke)
  const loadingTask = getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  let fullText = "";
  
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
}

function customSplitText(text, chunkSize = 400, chunkOverlap = 80) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    let chunk = text.substring(i, i + chunkSize);
    chunks.push(chunk);
    i += (chunkSize - chunkOverlap);
  }
  return chunks;
}

const worker = new Worker('file-upload-queue', async (job) => {
  if (job.name === 'file-ready') {
    try {
      const fileData = JSON.parse(job.data);
      console.log(`\n--- Worker Active: ${fileData.filename} ko process kar raha hu ---`);

      // 1. Solid parsing with legacy engine
      const fullText = await extractTextFromPdf(fileData.path);

      if (!fullText || fullText.trim() === "") {
        console.log("Bhai, is PDF mein koi text nahi mila.");
        return;
      }

      const chunks = customSplitText(fullText, 400, 80);
      console.log(`PDF successfully parse ho gayi. Total Chunks bane: ${chunks.length}`);

      console.log("Ollama standard API se embeddings generate ho rahi hain...");
      const finalVectorData = [];

      for (let i = 0; i < chunks.length; i++) {
        const vector = await getOllamaEmbedding(chunks[i]);
        finalVectorData.push({
          text: chunks[i],
          embedding: vector,
          source: fileData.filename
        });
      }

      fs.writeFileSync("vector_data.json", JSON.stringify(finalVectorData, null, 2));
      console.log("[Worker Success] vector_data.json successfully saved custom database!");

    } catch (error) {
      console.error("Worker Error:", error.message || error);
      throw error;
    }
  }
}, { connection });


console.log("BULLMQ WORKER IS RUNNING IN BACKGROUND... Waiting for jobs...");