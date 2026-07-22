/**
 * download-certificados-test.js
 * Prueba de descarga de certificados de Examen Médico Ocupacional para 5 pacientes.
 * Lee cédulas de los Excel, descarga TODOS los certificados de cada paciente,
 * y los guarda en informes/certificados/<cedula>_<nombre>/
 *
 * Uso:
 *   node scripts/download-certificados-test.js
 *   node scripts/download-certificados-test.js --limite 5   (default)
 *   node scripts/download-certificados-test.js --cedulas 80132454,40215191
 */

import "dotenv/config";
import path from "node:path";
import { writeFile, mkdir, readdir } from "node:fs/promises";
import https from "node:https";
import http from "node:http";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { read, utils } from "xlsx";

const BASE = "https://equivida.isismaweb.com/app/asistencial/sismaweb";
const SESSION_FILE = path.resolve("sessions/equivida.json");
const XLS_ROOT = path.resolve("informes/por_contrato");
const OUT_DIR = path.resolve("informes/certificados");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── HTTP helper ───────────────────────────────────────────────────────────────

function httpReq(urlStr, { method = "GET", body = null, cookieStr = "", headers = {} } = {}) {
  const url = new URL(urlStr);
  const opts = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method,
    headers: {
      Cookie: cookieStr,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Referer: BASE,
      ...headers,
    },
    rejectUnauthorized: false,
    timeout: 60000,
  };
  if (body) {
    opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    opts.headers["Content-Length"] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? https : http).request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") })
      );
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

// ── Sesión browser ────────────────────────────────────────────────────────────

async function setupSession() {
  process.stdout.write("Estableciendo sesión... ");
  const session = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--ignore-certificate-errors", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  if (session.cookies?.length) await context.addCookies(session.cookies);

  const page = await context.newPage();
  await page.goto(`${BASE}/sisma.php`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Sesión en modo NAVEGACION — no requiere selección de sede/consultorio
  const cookies = await context.cookies();
  const cookieStr = cookies
    .filter((c) => BASE.includes(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  await browser.close();
  console.log(`OK (${cookies.length} cookies)`);
  return cookieStr;
}

// ── Extraer cédulas de los XLS ────────────────────────────────────────────────

async function extraerCedulas(limite) {
  console.log(`\nExtrayendo cédulas únicas de los Excel (límite: ${limite})...`);
  const seen = new Set();
  const pacientes = [];

  const contratos = await readdir(XLS_ROOT);
  outer: for (const contrato of contratos.sort()) {
    const contratoDir = path.join(XLS_ROOT, contrato);
    let archivos;
    try {
      archivos = await readdir(contratoDir);
    } catch (_) { continue; }

    for (const archivo of archivos.sort()) {
      if (!archivo.endsWith(".xls")) continue;
      try {
        const buf = readFileSync(path.join(contratoDir, archivo));
        const wb = read(buf, { type: "buffer" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(sheet, { header: 1 });

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cedula = String(row[11] || "").trim();
          const nombre = String(row[9] || "").trim();
          if (!cedula || cedula === "0" || seen.has(cedula)) continue;
          seen.add(cedula);
          pacientes.push({ cedula, nombre, contrato });
          if (pacientes.length >= limite) break outer;
        }
      } catch (_) {}
    }
  }

  console.log(`  → ${pacientes.length} pacientes únicos encontrados`);
  return pacientes;
}

// ── Descargar todos los certificados de un paciente ──────────────────────────

function slugNombre(nombre) {
  return nombre
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

async function downloadCertificados(paciente, cookieStr) {
  const { cedula, nombre } = paciente;
  const folderName = `${cedula}_${slugNombre(nombre)}`;
  const pacienteDir = path.join(OUT_DIR, folderName);
  await mkdir(pacienteDir, { recursive: true });

  // 1. Buscar paciente
  const searchResp = await httpReq(`${BASE}/vistas/Hc/ListaPaciente.php?operacion=buscar`, {
    method: "POST",
    body: `termino=${cedula}`,
    cookieStr,
  });

  const pacienteMatch = searchResp.body.match(
    /href="Paciente\.php\?operacion=buscar&(?:amp;)?id=(\d+)&(?:amp;)?nro_historia=(\d+)"/
  );
  if (!pacienteMatch) {
    return { ok: false, cedula, nombre, reason: "Paciente no encontrado en el sistema" };
  }

  const pacienteId = pacienteMatch[1];
  const nroHistoria = pacienteMatch[2];

  // 2. Navegar a Historia para establecer estado de sesión
  const historiaResp = await httpReq(
    `${BASE}/vistas/Hc/Historia.php?operacion=existe_paciente_his&id=${pacienteId}&numhistoria=${nroHistoria}`,
    { cookieStr }
  );
  const historiaId = (historiaResp.body.match(/historia=(\d+)/) || [])[1] || pacienteId;

  // 3. Obtener TODOS los exámenes ocupacionales
  await sleep(500);
  const listaResp = await httpReq(`${BASE}/vistas/Hc/recurso/ListaOcupacional.php`, { cookieStr });

  const regex = /href="ocupacional\.php\?operacion=abrir&(?:amp;)?estudio=(\d+)&(?:amp;)?p=([^&"]+)&(?:amp;)?version=(\d+)"/g;
  const examenes = [...listaResp.body.matchAll(regex)];

  if (examenes.length === 0) {
    return { ok: false, cedula, nombre, reason: "Sin exámenes ocupacionales en el sistema" };
  }

  // 4. Descargar historia ocupacional + certificado por cada examen
  const descargados = [];
  for (const [, estudio, p, version] of examenes) {
    // 4a. Historia ocupacional (detalle clínico completo)
    const historiaUrl = `${BASE}/reportes/html/hc2/recurso/ocupacional.php?operacion=abrir&historia=${historiaId}&estudio=${estudio}&p=${decodeURIComponent(p)}&version=${version}`;
    const historiaDoc = await httpReq(historiaUrl, { cookieStr });
    if (historiaDoc.body.length >= 500) {
      const fnHistoria = `historia_estudio${estudio}_v${version}.html`;
      await writeFile(path.join(pacienteDir, fnHistoria), historiaDoc.body, "utf8");
      descargados.push({ tipo: "historia", filename: fnHistoria, estudio, version, size: historiaDoc.body.length });
    }
    await sleep(300);

    // 4b. Certificado (documento oficial para el paciente)
    const certUrl = `${BASE}/reportes/html/hc2/recurso/certificado.php?historia=${historiaId}&estudio=${estudio}&version=${version}`;
    const certDoc = await httpReq(certUrl, { cookieStr });
    if (certDoc.body.length >= 500) {
      const fnCert = `certificado_estudio${estudio}_v${version}.html`;
      await writeFile(path.join(pacienteDir, fnCert), certDoc.body, "utf8");
      descargados.push({ tipo: "certificado", filename: fnCert, estudio, version, size: certDoc.body.length });
    }
    await sleep(400);
  }

  return {
    ok: true,
    cedula,
    nombre,
    carpeta: folderName,
    total: examenes.length,
    descargados: descargados.length,
    archivos: descargados,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let limite = 5;
  let cedulasFijas = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limite") limite = parseInt(args[++i]);
    if (args[i] === "--cedulas") {
      cedulasFijas = args[++i].split(",").map((c) => ({
        cedula: c.trim(),
        nombre: `CEDULA_${c.trim()}`,
        contrato: "manual",
      }));
    }
  }

  console.log("=".repeat(60));
  console.log("  Equivida — Certificados Examen Ocupacional (TEST)");
  console.log("=".repeat(60));

  await mkdir(OUT_DIR, { recursive: true });

  const cookieStr = await setupSession();

  const pacientes = cedulasFijas || (await extraerCedulas(limite));

  console.log(`\nDescargando certificados para ${pacientes.length} pacientes...\n`);

  const resultados = [];
  for (let i = 0; i < pacientes.length; i++) {
    const p = pacientes[i];
    process.stdout.write(`[${i + 1}/${pacientes.length}] ${p.cedula} — ${p.nombre}\n`);

    try {
      const res = await downloadCertificados(p, cookieStr);
      resultados.push(res);

      if (res.ok) {
        const nExamenes = res.total;
        const nDocs = res.descargados;
        console.log(`    ✓ ${nExamenes} examen(es) → ${nDocs} documentos → ${res.carpeta}/`);
        for (const a of res.archivos) {
          const tag = a.tipo === "certificado" ? "📄 cert  " : "📋 hist  ";
          console.log(`      ${tag} ${a.filename} (${(a.size / 1024).toFixed(1)} KB)`);
        }
      } else {
        console.log(`    ✗ ${res.reason}`);
      }
    } catch (e) {
      console.log(`    ✗ Error: ${e.message}`);
      resultados.push({ ok: false, cedula: p.cedula, nombre: p.nombre, reason: e.message });
    }

    if (i < pacientes.length - 1) await sleep(1500);
    console.log();
  }

  // Resumen
  const ok = resultados.filter((r) => r.ok);
  const fail = resultados.filter((r) => !r.ok);
  const totalCerts = ok.reduce((s, r) => s + (r.descargados || 0), 0);

  console.log("=".repeat(60));
  console.log(`  ✅ Pacientes OK:       ${ok.length}/${pacientes.length}`);
  console.log(`  📄 Certificados total: ${totalCerts}`);
  if (fail.length > 0) {
    console.log(`  ❌ Fallidos:`);
    for (const f of fail) console.log(`     - ${f.cedula} (${f.nombre}): ${f.reason}`);
  }
  console.log(`  📁 Carpeta: ${OUT_DIR}`);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message || err);
  process.exit(1);
});
