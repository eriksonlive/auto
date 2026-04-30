import { callLlm } from "./providers/index.js";

export async function generateLlmText({ system, user }) {
  const provider = process.env.LLM_PROVIDER || "gemini";
  const model = process.env.LLM_MODEL;

  if (!model) {
    throw new Error("Falta LLM_MODEL en .env");
  }

  const result = await callLlm({
    provider,
    model,
    system,
    user
  });

  return result.text;
}