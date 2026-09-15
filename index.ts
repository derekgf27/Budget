import { config } from "dotenv";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

config({ path: ".env.local" });

async function main() {
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Set GOOGLE_GENERATIVE_AI_API_KEY in .env.local (Google AI Studio).",
    );
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const { text } = await generateText({
    model: google("gemini-3.6-flash"),
    prompt: "Invent a new holiday and describe its traditions.",
  });

  console.log(text);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
