import "dotenv/config";
import fs from "node:fs/promises";
import { generateLlmText } from "../src/ai/llm.js";
import { extractJson } from "../src/ai/utils.js";
import { STEP_CATALOG } from "../src/ai/catalog.js";
import { getKnowledge } from "../src/ai/knowledge.js";
import { validateCaseOrThrow } from "../src/ai/validate-case.js";
import { normalizeCase } from "../src/ai/normalize-case.js";
import { EXAMPLES } from "../src/ai/examples.js";
import { buildGeneratePrompt } from "../src/ai/prompts/generate.js";

async function main() {
  const prompt = process.argv[2];
  const domPath = process.argv[3];

  if (!prompt || !domPath) {
    throw new Error('Uso: node src/ai/generate-from-dom.js "prompt" ruta-dom.json');
  }

  const domText = await fs.readFile(domPath, "utf8");

  const domAwareRequest = `
${prompt}

Contexto DOM estructurado disponible:
${domText}

Instrucciones adicionales:
- Usa el contexto DOM como fuente de verdad.
- Para formularios, usa únicamente campos reales del contexto si existen.
- Para select HTML nativo, usa text o value presentes en options.
- Nunca generes value vacío.
- Para combobox/autocomplete, usa selectAutocompleteOption solo si el contexto muestra comboboxes reales.
- Prefiere los selectors exactos que ya aparezcan en el contexto.
`.trim();

  const { system, user } = buildGeneratePrompt({
    userRequest: domAwareRequest,
    catalog: STEP_CATALOG,
    knowledge: getKnowledge(),
    examples: EXAMPLES
  });

  const rawText = await generateLlmText({ system, user });

  console.log("\n===== RAW LLM TEXT =====\n");
  console.log(rawText);

  const jsonText = extractJson(rawText);
  const parsed = JSON.parse(jsonText);

  console.log("\n===== JSON PARSEADO =====\n");
  console.log(JSON.stringify(parsed, null, 2));

  const validated = validateCaseOrThrow(parsed);
  const normalized = normalizeCase(validated);

  console.log("\n===== JSON NORMALIZADO =====\n");
  console.log(JSON.stringify(normalized, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});