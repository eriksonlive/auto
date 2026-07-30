import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { generateLlmText } from "../src/ai/llm.js";
import { extractJson } from "../src/ai/utils.js";
import { validateCaseOrThrow } from "../src/ai/validate-case.js";
import { normalizeCase } from "../src/ai/normalize-case.js";
import { buildGeneratePrompt } from "../src/ai/prompts/generate.js";
import { STEP_CATALOG } from "../src/ai/catalog.js";
import { getKnowledge } from "../src/ai/knowledge.js";
import { EXAMPLES } from "../src/ai/examples.js";

async function main() {
  const prompt = process.argv.slice(2).join(" ").trim();

  if (!prompt) {
    throw new Error("Debes enviar un prompt");
  }

  const { system, user } = buildGeneratePrompt({
    userRequest: prompt,
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

  const outDir = path.resolve("tests/generated");
  await fs.mkdir(outDir, { recursive: true });

  const filePath = path.join(outDir, "case.generated.json");
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf8");

  console.log(`\nCaso generado en: ${filePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});