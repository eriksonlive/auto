import fs from "node:fs/promises";
import { chromium } from "playwright";
import { buildDomContext } from "./build-dom-context.js";

async function main() {
  const url = process.argv[2];
  const outPath = process.argv[3] || "tmp/dom-context.json";

  if (!url) {
    throw new Error('Uso: node src/ai/export-dom-context.js "url" "salida-opcional"');
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "load", timeout: 60000 });

  const domContext = await buildDomContext(page);

  await fs.mkdir("tmp", { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(domContext, null, 2), "utf8");

  await browser.close();

  console.log(`DOM context guardado en: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});