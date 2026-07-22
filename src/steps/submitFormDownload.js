import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import https from 'https';
import http from 'http';

/**
 * submitFormDownload: reads a form's action + fields from a frame,
 * submits it via Node.js HTTP request using browser cookies, and saves the response file.
 *
 * Options:
 *   frameIndex: which frame contains the form
 *   formSelector: CSS selector for the form (default: 'form')
 *   extraFields: { name: value } pairs to override form fields
 *   saveAs: output filename in evidence folder
 */
export async function runSubmitFormDownload(step, ctx, i) {
  const { frameIndex, extraFields = {} } = step;
  const formSelector = step.formSelector || 'form';
  const saveAs = step.saveAs || 'download.xlsx';
  const timeoutMs = step.timeoutMs ?? 60000;

  if (frameIndex === undefined) throw new Error("submitFormDownload requiere 'frameIndex'");

  ctx.logs.push(`[${i}] submitFormDownload frameIndex=${frameIndex} -> ${saveAs}`);

  const evidenceDir = path.join(ctx.outDir, 'evidence');
  await mkdir(evidenceDir, { recursive: true });
  const outPath = path.join(evidenceDir, saveAs);

  // 1. Extract form data from the frame
  const frames = ctx.page.frames();
  const frame = frames[frameIndex];
  if (!frame) throw new Error('No hay frame en indice ' + frameIndex);

  const formData = await frame.evaluate((formSelector) => {
    const form = document.querySelector(formSelector);
    if (!form) throw new Error('Formulario no encontrado: ' + formSelector);

    const action = form.action || window.location.href;
    const method = (form.method || 'GET').toUpperCase();
    const fields = {};

    Array.from(form.elements).forEach(el => {
      if (el.name && el.value !== undefined) {
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) fields[el.name] = el.value;
        } else {
          fields[el.name] = el.value;
        }
      }
    });

    return { action, method, fields };
  }, formSelector);

  // Apply overrides
  Object.assign(formData.fields, extraFields);

  ctx.logs.push(`[${i}] form action: ${formData.action} method: ${formData.method}`);
  ctx.logs.push(`[${i}] fields: ${JSON.stringify(formData.fields)}`);

  // 2. Get cookies from browser context
  let cookies = [];
  try {
    cookies = await ctx.stagehand.context.cookies();
  } catch (e) {
    ctx.logs.push(`[${i}] warn: no se pudieron obtener cookies: ${e.message}`);
  }

  const cookieStr = cookies
    .filter(c => formData.action.includes(c.domain.replace(/^\./, '')))
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  // 3. Build request
  const body = new URLSearchParams(formData.fields).toString();
  const url = new URL(formData.action);

  const requestOptions = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: formData.method === 'GET' ? url.pathname + '?' + body : url.pathname + url.search,
    method: formData.method,
    headers: {
      'Cookie': cookieStr,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      'Referer': formData.action,
      'User-Agent': 'Mozilla/5.0'
    },
    rejectUnauthorized: false
  };

  // 4. Make request
  const fileBuffer = await new Promise((resolve, reject) => {
    const requester = url.protocol === 'https:' ? https : http;
    const req = requester.request(requestOptions, (res) => {
      ctx.logs.push(`[${i}] HTTP ${res.statusCode} content-type: ${res.headers['content-type']}`);
      ctx.logs.push(`[${i}] content-disposition: ${res.headers['content-disposition'] || 'none'}`);

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    if (formData.method === 'POST') req.write(body);
    req.end();
  });

  await writeFile(outPath, fileBuffer);

  const key = step.saveAs || `download_${i}`;
  ctx.result.outputs[key] = { savedTo: outPath, size: fileBuffer.length };

  ctx.logs.push(`[${i}] guardado: ${outPath} (${fileBuffer.length} bytes)`);
  return { downloaded: saveAs, size: fileBuffer.length, path: outPath };
}
