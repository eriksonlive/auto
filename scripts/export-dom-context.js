import fs from "node:fs/promises";
import path from "node:path";
import { buildDomContext } from "./build-dom-context.js";

export async function exportDomContext({ page, outPath, extra = {} }) {
  if (!page) {
    throw new Error("exportDomContext: falta page");
  }

  if (!outPath) {
    throw new Error("exportDomContext: falta outPath");
  }

  const domContext = await buildDomContext(page, extra);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(domContext, null, 2), "utf8");

  return {
    ok: true,
    outPath,
    domContext
  };
}