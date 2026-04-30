import path from 'path';
import { ensureDir } from '../lib/fs.js';

function safeName(value) {
  return String(value || 'selector')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function runScreenshotSelector(step, ctx, i) {
  const selector = step.selector;
  if (!selector) throw new Error("screenshotSelector requiere 'selector'");

  const name = step.name || `${i}-${safeName(selector)}`;
  const dir = path.join(ctx.outDir, 'evidence', 'selectors');
  await ensureDir(dir);

  const file = path.join(dir, `${name}.png`);

  // Esperar el selector
  await ctx.page.waitForSelector(selector, {
    state: 'attached',
    timeout: step.timeoutMs ?? 30000,
  });

  // Obtener bounding box desde el navegador
  const box = await ctx.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;

    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, r.x),
      y: Math.max(0, r.y),
      width: Math.max(1, r.width),
      height: Math.max(1, r.height),
    };
  }, selector);

  if (!box) {
    throw new Error(`No se pudo obtener bounding box para: ${selector}`);
  }

  await ctx.page.screenshot({
    path: file,
    fullPage: false,
    scale: 'css',
    clip: box,
  });

  return {
    selector,
    screenshot: path.relative(ctx.outDir, file),
    clip: box,
  };
}