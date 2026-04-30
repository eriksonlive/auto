import fs from "node:fs/promises";
import path from "node:path";
import { STEP_CATALOG } from "./catalog.js";
import { APP_KNOWLEDGE } from "./knowledge.js";
import { buildDebugPrompt } from "./prompts/debug.js";
import { callLlm } from "./llm.js";
import { DebugResponseSchema } from "./schema.js";

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("La respuesta del modelo no contiene JSON.");
  }
  return text.slice(start, end + 1);
}

export async function debugFailedRun(runContext) {
  const { system, user } = buildDebugPrompt({
    catalog: STEP_CATALOG,
    knowledge: APP_KNOWLEDGE,
    runContext
  });

  const raw = await callLlm({ system, user });
  const jsonText = extractJson(raw);
  const parsed = JSON.parse(jsonText);

  return DebugResponseSchema.parse(parsed);
}

async function main() {
  const runDir = process.argv[2];
  if (!runDir) {
    throw new Error("Debes pasar la carpeta del run fallido.");
  }

  const casePath = path.join(runDir, "case.json");
  const logPath = path.join(runDir, "logs.txt");
  const domPath = path.join(runDir, "dom-error.html");

  const [caseText, logText] = await Promise.all([
    fs.readFile(casePath, "utf8"),
    fs.readFile(logPath, "utf8")
  ]);

  let domText = "";
  try {
    domText = await fs.readFile(domPath, "utf8");
  } catch {}

  const runContext = {
    case: JSON.parse(caseText),
    log: logText.split("\n").filter(Boolean).slice(-200),
    domSnippet: domText.slice(0, 15000)
  };

  const debug = await debugFailedRun(runContext);
  console.log(JSON.stringify(debug, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}