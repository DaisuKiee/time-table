require("dotenv").config({ path: "./backend/.env" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2);

async function main() {
  // Get the model
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  // Call generateContentStream
  const result = await model.generateContentStream(
    "Hello! Explain what a Discord bot is in detail."
  );

  // Iterate over the stream as chunks arrive
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    process.stdout.write(chunkText);
  }
}

main().catch(console.error);