import path from "path";
import { promises as fs } from "fs";
import { ensureDir } from "./fs.js";

export async function doScreenshot({ page, outDir, step }) {
  const name = step.name || "screenshot";
  const file = path.join(outDir, "evidence", "screenshots", `${name}.png`);
  await ensureDir(path.dirname(file));
  await page.screenshot({ path: file, fullPage: true });
  return { screenshot: path.relative(outDir, file) };
}

export async function doHtml({ page, outDir, step }) {
  const name = step.name || "page";
  const file = path.join(outDir, "evidence", "html", `${name}.html`);
  await ensureDir(path.dirname(file));
  const html = await page.content();
  await fs.writeFile(file, html, "utf-8");
  return { html: path.relative(outDir, file) };
}

export async function doWait({ step }) {
  const ms = Number(step.ms || 0);
  if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  return { waitedMs: ms };
}