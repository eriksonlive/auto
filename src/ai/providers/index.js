import { callOpenAI } from "./openai.js";
import { callAnthropic } from "./anthropic.js";
import { callGemini } from "./gemini.js";
import { callOpenRouter } from "./openrouter.js";
import { callOllama } from "./ollama.js";

export async function callLlm({ provider, model, system, user }) {
  switch (provider) {
    case "openai":
      return callOpenAI({ model, system, user });

    case "anthropic":
      return callAnthropic({ model, system, user });

    case "gemini":
      return callGemini({ model, system, user });

    case "openrouter":
      return callOpenRouter({ model, system, user });

    case "ollama":
      return callOllama({ model, system, user });

    default:
      throw new Error(`Proveedor no soportado: ${provider}`);
  }
}