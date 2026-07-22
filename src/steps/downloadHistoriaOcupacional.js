import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import https from 'https';
import http from 'http';

const BASE = 'https://equivida.isismaweb.com/app/asistencial/sismaweb';

function httpReq(urlStr, { method = 'GET', body = null, cookieStr = '', headers = {} } = {}) {
  const url = new URL(urlStr);
  const opts = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method,
    headers: {
      'Cookie': cookieStr,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': BASE,
      ...headers,
    },
    rejectUnauthorized: false,
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.headers['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const req = (url.protocol === 'https:' ? https : http).request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extract(html, pattern) {
  const m = html.match(pattern);
  return m ? m[1] : null;
}

/**
 * downloadHistoriaOcupacional: given a cedula (id number), follows the full chain:
 *   1. Search patient in ListaPaciente
 *   2. Find patient link (id + historia)
 *   3. Navigate to ListaOcupacional
 *   4. Extract estudio, p, version parameters
 *   5. Download the HTML report from reportes/html/hc2/recurso/ocupacional.php
 *
 * Options:
 *   cedula: patient ID number (e.g. "80132454")
 *   saveAs: output filename (default: historia_ocupacional_{cedula}.html)
 *   timeoutMs: (unused, kept for consistency)
 */
export async function runDownloadHistoriaOcupacional(step, ctx, i) {
  const { cedula } = step;
  if (!cedula) throw new Error("downloadHistoriaOcupacional requiere 'cedula'");

  const saveAs = step.saveAs || `historia_ocupacional_${cedula}.html`;
  ctx.logs.push(`[${i}] downloadHistoriaOcupacional cedula=${cedula} -> ${saveAs}`);

  const evidenceDir = path.join(ctx.outDir, 'evidence');
  await mkdir(evidenceDir, { recursive: true });
  const outPath = path.join(evidenceDir, saveAs);

  // Get cookies from browser context
  let cookieStr = '';
  try {
    const cookies = await ctx.stagehand.context.cookies();
    cookieStr = cookies
      .filter(c => 'equivida.isismaweb.com'.includes(c.domain.replace(/^\./, '')))
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  } catch (e) {
    ctx.logs.push(`[${i}] warn: cookies: ${e.message}`);
  }

  // STEP 1: Search patient
  ctx.logs.push(`[${i}] [1] Buscando paciente cedula=${cedula}`);
  const searchResp = await httpReq(
    `${BASE}/vistas/Hc/ListaPaciente.php?operacion=buscar`,
    { method: 'POST', body: `termino=${cedula}`, cookieStr }
  );

  // Extract patient link: Paciente.php?operacion=buscar&id=XXXX&nro_historia=YYYY
  const pacienteMatch = searchResp.body.match(/href="Paciente\.php\?operacion=buscar&id=(\d+)&nro_historia=(\d+)"/);
  if (!pacienteMatch) throw new Error(`Paciente con cedula ${cedula} no encontrado`);
  const pacienteId = pacienteMatch[1];
  const nroHistoria = pacienteMatch[2];
  ctx.logs.push(`[${i}] [1] Encontrado: id=${pacienteId} historia=${nroHistoria}`);

  // STEP 2: Get Historia ID (same as pacienteId typically, but let's verify via Historia.php)
  ctx.logs.push(`[${i}] [2] Obteniendo Historia Clinica id=${pacienteId}`);
  const historiaResp = await httpReq(
    `${BASE}/vistas/Hc/Historia.php?operacion=existe_paciente_his&id=${pacienteId}&numhistoria=${nroHistoria}`,
    { cookieStr }
  );
  // Extract historia id from iframe src: ListaIngreso.php?operacion=listar&historia=XXXX
  const historiaId = extract(historiaResp.body, /historia=(\d+)/) || pacienteId;
  ctx.logs.push(`[${i}] [2] Historia ID: ${historiaId}`);

  // STEP 3: Get Salud Ocupacional list
  ctx.logs.push(`[${i}] [3] Obteniendo ListaOcupacional`);
  const listaResp = await httpReq(
    `${BASE}/vistas/Hc/recurso/ListaOcupacional.php`,
    { cookieStr }
  );

  // Extract: ocupacional.php?operacion=abrir&estudio=XXXX&p=YYY&version=Z
  // Pick the FIRST (most recent) ingreso
  const ocupMatch = listaResp.body.match(/href="ocupacional\.php\?operacion=abrir&estudio=(\d+)&p=([^&"]+)&version=(\d+)"/);
  if (!ocupMatch) throw new Error('No se encontraron ingresos de Salud Ocupacional para este paciente');
  const estudio = ocupMatch[1];
  const pCod = ocupMatch[2];
  const version = ocupMatch[3];
  ctx.logs.push(`[${i}] [3] Ingreso: estudio=${estudio} p=${pCod} version=${version}`);

  // STEP 4: Download the HTML report (the URL that invocarReporte opens after clicking "Cancelar")
  const reportUrl = `${BASE}/reportes/html/hc2/recurso/ocupacional.php?operacion=abrir&historia=${historiaId}&estudio=${estudio}&p=${pCod}&version=${version}`;
  ctx.logs.push(`[${i}] [4] Descargando reporte: ${reportUrl}`);

  const reportResp = await httpReq(reportUrl, { cookieStr });
  ctx.logs.push(`[${i}] [4] HTTP ${reportResp.status} size=${reportResp.body.length}`);

  if (reportResp.body.length < 1000) {
    ctx.logs.push(`[${i}] WARN: respuesta muy corta, posible error de sesion`);
  }

  await writeFile(outPath, reportResp.body);
  ctx.result.outputs[saveAs] = {
    savedTo: outPath,
    size: reportResp.body.length,
    reportUrl,
    pacienteId,
    historiaId,
    estudio,
    cedula,
  };

  ctx.logs.push(`[${i}] guardado: ${outPath} (${reportResp.body.length} bytes)`);
  return {
    downloaded: saveAs,
    reportUrl,
    size: reportResp.body.length,
    estudio,
    pacienteId,
  };
}
