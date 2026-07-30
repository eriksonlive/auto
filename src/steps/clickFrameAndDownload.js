import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

/**
 * clickFrameAndDownload: intercepts a file download triggered by clicking in a frame.
 * Uses page.route() to capture the response body before it becomes a file download.
 */
export async function runClickFrameAndDownload(step, ctx, i) {
  const { frameIndex, selector, linkText } = step;
  const saveAs = step.saveAs || 'download.xlsx';
  const timeoutMs = step.timeoutMs ?? 60000;

  if (frameIndex === undefined) throw new Error("clickFrameAndDownload requiere 'frameIndex'");

  const evidenceDir = path.join(ctx.outDir, 'evidence');
  await mkdir(evidenceDir, { recursive: true });
  const outPath = path.join(evidenceDir, saveAs);

  ctx.logs.push(`[${i}] clickFrameAndDownload frameIndex=${frameIndex} -> ${saveAs}`);

  // Intercept any response with downloadable content-disposition or xlsx/xls content-type
  let captured = null;
  let routeSet = false;

  const routeHandler = async (route) => {
    const response = await route.fetch();
    const headers = response.headers();
    const contentType = headers['content-type'] || '';
    const disposition = headers['content-disposition'] || '';

    if (disposition.includes('attachment') || contentType.includes('spreadsheet') ||
        contentType.includes('excel') || contentType.includes('octet-stream') ||
        contentType.includes('vnd.ms')) {
      const buffer = await response.body();
      captured = { buffer, contentType, disposition, size: buffer.length };
      ctx.logs.push(`[${i}] intercepted: ${contentType} ${disposition} (${buffer.length} bytes)`);
      await route.fulfill({ response });
    } else {
      await route.continue();
    }
  };

  await ctx.page.route('**', routeHandler);
  routeSet = true;

  // Click the button
  const frames = ctx.page.frames();
  const frame = frames[frameIndex];
  if (!frame) throw new Error(`No hay frame en indice ${frameIndex}`);

  try {
    await frame.evaluate(({ selector, linkText }) => {
      let el;
      if (linkText) {
        el = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"], input[value]'))
          .find(e => (e.textContent || e.value || '').trim().includes(linkText));
      } else {
        el = document.querySelector(selector);
      }
      if (!el) throw new Error('Elemento no encontrado: ' + (linkText || selector));
      el.click();
    }, { selector, linkText });
  } catch (e) {
    if (!e.message.includes('StagehandEvalError') && !e.message.includes('context') && !e.message.includes('Target')) {
      await ctx.page.unroute('**', routeHandler);
      throw e;
    }
    ctx.logs.push(`[${i}] click OK (navegacion detectada)`);
  }

  // Wait for capture
  const deadline = Date.now() + timeoutMs;
  while (!captured && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
  }

  await ctx.page.unroute('**', routeHandler);

  if (!captured) {
    throw new Error(`clickFrameAndDownload: no se interceptó ningún archivo en ${timeoutMs}ms`);
  }

  await writeFile(outPath, captured.buffer);

  const key = step.saveAs || `download_${i}`;
  ctx.result.outputs[key] = { savedTo: outPath, size: captured.size, contentType: captured.contentType };

  return { downloaded: saveAs, size: captured.size };
}
