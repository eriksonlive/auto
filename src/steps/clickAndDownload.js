import path from 'path';
import { mkdir } from 'fs/promises';

/**
 * clickAndDownload: clicks an element and intercepts the browser's native download event.
 * Handles PDFs, certificates, Excel, and any file triggered with Content-Disposition: attachment.
 *
 * Options:
 *   selector: CSS selector of the element to click (required)
 *   frame: CSS selector of the iframe containing the element (optional)
 *   saveAs: output filename saved under evidence/ (default: download.bin)
 *   timeoutMs: timeout for the download event (default: 30000)
 */
export async function runClickAndDownload(step, ctx, i) {
  const { selector, frame } = step;
  const saveAs = step.saveAs || 'download.bin';
  const timeoutMs = step.timeoutMs ?? 30000;

  if (!selector) throw new Error("clickAndDownload requiere 'selector'");

  ctx.logs.push(`[${i}] clickAndDownload selector="${selector}" frame=${frame || 'none'} -> ${saveAs}`);

  const evidenceDir = path.join(ctx.outDir, 'evidence');
  await mkdir(evidenceDir, { recursive: true });
  const outPath = path.join(evidenceDir, saveAs);

  const downloadPromise = ctx.page.waitForEvent('download', { timeout: timeoutMs });

  if (frame) {
    const frameLocator = ctx.page.frameLocator(frame);
    await frameLocator.locator(selector).click();
  } else {
    await ctx.page.locator(selector).click();
  }

  const download = await downloadPromise;

  ctx.logs.push(`[${i}] descarga recibida: ${download.suggestedFilename()}`);

  const failure = await download.failure();
  if (failure) throw new Error(`clickAndDownload: descarga fallida — ${failure}`);

  await download.saveAs(outPath);

  const key = step.saveAs || `download_${i}`;
  ctx.result.outputs[key] = {
    savedTo: outPath,
    suggestedFilename: download.suggestedFilename(),
  };

  ctx.logs.push(`[${i}] guardado: ${outPath}`);
  return { downloaded: saveAs, suggestedFilename: download.suggestedFilename(), path: outPath };
}
