import "dotenv/config";
import fs from "node:fs/promises";
import { generateLlmText } from "./llm.js";
import { extractJson } from "./utils.js";
import { STEP_CATALOG } from "./catalog.js";
import { APP_KNOWLEDGE } from "./knowledge.js";
import { validateCaseOrThrow } from "./validate-case.js";
import { normalizeCase } from "./normalize-case.js";

async function main() {
  const prompt = process.argv[2];
  const domPath = process.argv[3];

  if (!prompt || !domPath) {
    throw new Error('Uso: node src/ai/generate-from-dom.js "prompt" ruta-dom.json');
  }

  const domText = await fs.readFile(domPath, "utf8");

  const system = `
Eres un generador de casos JSON ejecutables para Playwright.
Debes responder SOLO JSON válido con:
{
  "name": "string",
  "steps": [...]
}

Solo usa el catálogo.
No generes casos manuales.
No uses markdown.

Conocimiento:
${APP_KNOWLEDGE}

Catálogo:
${JSON.stringify(STEP_CATALOG, null, 2)}
  `.trim();

  const user = `
    Objetivo del usuario:
    ${prompt}

    Contexto estructurado del DOM actual:
    ${domText}

    Reglas adicionales:
    - Si un step es de tipo select, debes usar un text o value real que exista en las options del contexto.
    - No dejes value vacío.
    - Si el objetivo dice "primera opción", usa la primera opción válida no vacía.
    - Si el selector real viene en el contexto, úsalo literalmente.
    `.trim();

  const text = await generateLlmText({ system, user });
  const jsonText = extractJson(text);
  const parsed = JSON.parse(jsonText);

  const validated = validateCaseOrThrow(parsed);
  const normalized = normalizeCase(validated);

  console.log(JSON.stringify(normalized, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});