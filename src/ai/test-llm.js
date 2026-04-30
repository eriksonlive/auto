import "dotenv/config";
import { generateLlmText } from "./llm.js";
import { extractJson } from "./utils.js";

async function main() {
  const system = "Responde solo JSON válido.";
  const user = 'Devuélveme un JSON con {"ok": true}';

  const text = await generateLlmText({ system, user });
  const jsonText = extractJson(text);
  const data = JSON.parse(jsonText);

  console.log(data);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});