import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import https from 'https';
import http from 'http';

/**
 * httpDownload: makes a direct HTTP GET/POST request using browser session cookies
 * and saves the response as a file.
 *
 * Options:
 *   url: full URL to request
 *   method: 'GET' (default) | 'POST'
 *   params: { key: value } — appended as query string for GET, body for POST
 *   saveAs: output filename in evidence folder
 *   timeoutMs: request timeout (default 60000)
 */
export async function runHttpDownload(step, ctx, i) {
  const { params = {} } = step;
  const method = (step.method || 'GET').toUpperCase();
  const saveAs = step.saveAs || 'download.bin';
  const timeoutMs = step.timeoutMs ?? 60000;

  if (!step.url) throw new Error("httpDownload requiere 'url'");

  ctx.logs.push(`[${i}] httpDownload ${method} ${step.url} -> ${saveAs}`);

  const evidenceDir = path.join(ctx.outDir, 'evidence');
  await mkdir(evidenceDir, { recursive: true });
  const outPath = path.join(evidenceDir, saveAs);

  // Get cookies from browser context
  let cookies = [];
  try {
    cookies = await ctx.stagehand.context.cookies();
  } catch (e) {
    ctx.logs.push(`[${i}] warn: no se pudieron obtener cookies: ${e.message}`);
  }

  const queryStr = new URLSearchParams(params).toString();
  const urlObj = new URL(step.url);

  const requestPath = method === 'GET'
    ? urlObj.pathname + urlObj.search + (queryStr ? (urlObj.search ? '&' : '?') + queryStr : '')
    : urlObj.pathname + urlObj.search;

  const cookieStr = cookies
    .filter(c => step.url.includes(c.domain.replace(/^\./, '')))
    .map(c => `${c.name}=${c.value}`)
    .join('; ');

  const headers = {
    'Cookie': cookieStr,
    'Referer': step.url,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    headers['Content-Length'] = Buffer.byteLength(queryStr);
  }

  const requestOptions = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: requestPath,
    method,
    headers,
    rejectUnauthorized: false,
    timeout: timeoutMs,
  };

  const fileBuffer = await new Promise((resolve, reject) => {
    const requester = urlObj.protocol === 'https:' ? https : http;
    const req = requester.request(requestOptions, (res) => {
      ctx.logs.push(`[${i}] HTTP ${res.statusCode} content-type: ${res.headers['content-type']}`);
      ctx.logs.push(`[${i}] content-disposition: ${res.headers['content-disposition'] || 'none'}`);
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (method === 'POST') req.write(queryStr);
    req.end();
  });

  await writeFile(outPath, fileBuffer);
  ctx.result.outputs[saveAs] = { savedTo: outPath, size: fileBuffer.length };
  ctx.logs.push(`[${i}] guardado: ${outPath} (${fileBuffer.length} bytes)`);
  return { downloaded: saveAs, size: fileBuffer.length, path: outPath };
}
