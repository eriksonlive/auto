import path from 'path';
import { ensureDir } from './fs.js';

function safeName(value) {
  return String(value || 'step')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function captureStepScreenshot({
  page,
  outDir,
  index,
  type,
  phase,
}) {
  const dir = path.join(outDir, 'evidence', 'steps');
  await ensureDir(dir);

  const fileName = `${String(index).padStart(2, '0')}-${safeName(type)}-${phase}.png`;
  const fullPath = path.join(dir, fileName);

  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
  } catch {}

  await new Promise((r) => setTimeout(r, 250));

  await page.screenshot({
    path: fullPath,
    fullPage: false,
    scale: 'css',
  });

  return path.relative(outDir, fullPath);
}