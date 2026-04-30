import fs from "node:fs/promises";
import path from "node:path";

export async function saveDomSnapshot(page, outPath) {
  const html = await page.content();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, html, "utf8");
}