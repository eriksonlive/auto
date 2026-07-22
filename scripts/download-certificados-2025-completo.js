/**
 * download-certificados-2025-completo.js
 * Descarga historia ocupacional + certificado de TODOS los pacientes del año 2025,
 * leyendo los Excel de todos los contratos y todos los meses.
 *
 * - 685 pacientes únicos estimados
 * - Reanudable: salta carpetas que ya tienen archivos descargados
 * - Guarda en informes/certificados/<cedula>_<nombre>/
 *
 * Uso:
 *   node scripts/download-certificados-2025-completo.js
 */

import "dotenv/config";
import path from "node:path";
import { writeFile, mkdir, readdir, access } from "node:fs/promises";
import https from "node:https";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { read, utils } from "xlsx";

const BASE        = "https://equivida.isismaweb.com/app/asistencial/sismaweb";
const SESSION_FILE = path.resolve("sessions/equivida.json");
const XLS_ROOT    = path.resolve("informes/por_contrato");
const OUT_DIR     = path.resolve("informes/certificados");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── HTTP helper ───────────────────────────────────────────────────────────────

function httpReq(urlStr, { method = "GET", body = null, cookieStr = "" } = {}) {
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
      ...(body ? {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      } : {}),
    },
    rejectUnauthorized: false,
    timeout: 60000,
  };
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

// ── Sesión ────────────────────────────────────────────────────────────────────

async function setupSession() {
  process.stdout.write("Estableciendo sesión (modo NAVEGACION)... ");
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
  const cookies = await context.cookies();
  const cookieStr = cookies
    .filter((c) => BASE.includes(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  await browser.close();
  console.log(`OK (${cookies.length} cookies)`);
  return cookieStr;
}

// ── Extraer pacientes de todos los XLS ───────────────────────────────────────

async function extraerTodosPacientes() {
  console.log("\nLeyendo Excel de todos los contratos y meses...");
  const seen = new Set();
  const pacientes = []; // { cedula, nombre, contrato, mes }

  const contratos = (await readdir(XLS_ROOT)).sort();
  let archivos = 0;

  for (const contrato of contratos) {
    const dir = path.join(XLS_ROOT, contrato);
    let files;
    try { files = await readdir(dir); } catch (_) { continue; }

    for (const archivo of files.filter((f) => f.endsWith(".xls")).sort()) {
      try {
        const buf = readFileSync(path.join(dir, archivo));
        if (buf.length < 15000) continue; // plantilla vacía sin datos

        const wb = read(buf, { type: "buffer" });
        const rows = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        archivos++;

        for (let i = 1; i < rows.length; i++) {
          const cedula = String(rows[i][11] || "").trim();
          const nombre = String(rows[i][9] || "").trim();
          if (!cedula || cedula === "0" || seen.has(cedula)) continue;
          seen.add(cedula);
          pacientes.push({ cedula, nombre, contrato, mes: archivo.replace(".xls", "") });
        }
      } catch (_) {}
    }
  }

  console.log(`  → ${archivos} archivos con datos`);
  console.log(`  → ${pacientes.length} pacientes únicos encontrados`);
  return pacientes;
}

// ── Slug para nombre de carpeta ───────────────────────────────────────────────

function slugNombre(nombre) {
  return nombre
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40)
    .replace(/_+$/, "");
}

// ── Descargar documentos de un paciente ──────────────────────────────────────

async function downloadPaciente(paciente, cookieStr) {
  const { cedula, nombre } = paciente;
  const folderName = `${cedula}_${slugNombre(nombre)}`;
  const pacienteDir = path.join(OUT_DIR, folderName);

  // Reanudación: si ya tiene archivos, saltar
  try {
    const existentes = await readdir(pacienteDir);
    const htmlFiles = existentes.filter((f) => f.endsWith(".html"));
    if (htmlFiles.length > 0) {
      return { ok: true, cedula, nombre, saltado: true, docs: htmlFiles.length };
    }
  } catch (_) {}

  await mkdir(pacienteDir, { recursive: true });

  // 1. Buscar paciente
  const s1 = await httpReq(`${BASE}/vistas/Hc/ListaPaciente.php?operacion=buscar`, {
    method: "POST", body: `termino=${cedula}`, cookieStr,
  });
  const m = s1.body.match(/href="Paciente\.php\?operacion=buscar&(?:amp;)?id=(\d+)&(?:amp;)?nro_historia=(\d+)"/);
  if (!m) return { ok: false, cedula, nombre, reason: "No encontrado en sistema" };

  // 2. Navegar a Historia (establece estado de sesión PHP)
  const s2 = await httpReq(
    `${BASE}/vistas/Hc/Historia.php?operacion=existe_paciente_his&id=${m[1]}&numhistoria=${m[2]}`,
    { cookieStr }
  );
  const historiaId = (s2.body.match(/historia=(\d+)/) || [])[1] || m[1];

  // Verificar acceso (detecta "no autorizado")
  if (s2.body.includes("no es un usuario autorizado")) {
    return { ok: false, cedula, nombre, reason: "Sesión sin acceso a Historia — renovar sesión" };
  }

  // 3. Obtener lista de exámenes ocupacionales
  await sleep(400);
  const s3 = await httpReq(`${BASE}/vistas/Hc/recurso/ListaOcupacional.php`, { cookieStr });
  const examenes = [
    ...s3.body.matchAll(/href="ocupacional\.php\?operacion=abrir&(?:amp;)?estudio=(\d+)&(?:amp;)?p=([^&"]+)&(?:amp;)?version=(\d+)"/g),
  ];
  if (examenes.length === 0) {
    return { ok: false, cedula, nombre, reason: "Sin exámenes ocupacionales" };
  }

  // 4. Descargar historia + certificado por cada examen
  const docs = [];
  for (const [, estudio, p, version] of examenes) {
    // Historia ocupacional (detalle clínico)
    const urlH = `${BASE}/reportes/html/hc2/recurso/ocupacional.php?operacion=abrir&historia=${historiaId}&estudio=${estudio}&p=${decodeURIComponent(p)}&version=${version}`;
    const rH = await httpReq(urlH, { cookieStr });
    if (rH.body.length >= 500) {
      const fn = `historia_estudio${estudio}_v${version}.html`;
      await writeFile(path.join(pacienteDir, fn), rH.body, "utf8");
      docs.push({ tipo: "historia", fn, size: rH.body.length });
    }
    await sleep(300);

    // Certificado (documento oficial)
    const urlC = `${BASE}/reportes/html/hc2/recurso/certificado.php?historia=${historiaId}&estudio=${estudio}&version=${version}`;
    const rC = await httpReq(urlC, { cookieStr });
    if (rC.body.length >= 500) {
      const fn = `certificado_estudio${estudio}_v${version}.html`;
      await writeFile(path.join(pacienteDir, fn), rC.body, "utf8");
      docs.push({ tipo: "certificado", fn, size: rC.body.length });
    }
    await sleep(400);
  }

  return { ok: true, cedula, nombre, saltado: false, examenes: examenes.length, docs: docs.length, archivos: docs };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(65));
  console.log("  Equivida — Descarga completa certificados 2025");
  console.log("=".repeat(65));

  await mkdir(OUT_DIR, { recursive: true });

  const cookieStr = await setupSession();
  const pacientes = await extraerTodosPacientes();

  const total = pacientes.length;
  console.log(`\nIniciando descarga de ${total} pacientes...\n`);

  let ok = 0, saltados = 0, errores = 0, totalDocs = 0;
  const errorLog = [];
  const inicio = Date.now();

  for (let i = 0; i < pacientes.length; i++) {
    const p = pacientes[i];
    const pct = (((i + 1) / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - inicio) / 1000).toFixed(0);
    const eta = i > 0
      ? Math.round(((Date.now() - inicio) / i) * (total - i) / 1000)
      : "...";

    process.stdout.write(`[${i + 1}/${total}] ${p.cedula} — ${p.nombre.slice(0, 35)}\n`);

    try {
      const res = await downloadPaciente(p, cookieStr);

      if (res.saltado) {
        saltados++;
        process.stdout.write(`    ↩ Ya descargado (${res.docs} docs)\n`);
      } else if (res.ok) {
        ok++;
        totalDocs += res.docs;
        process.stdout.write(`    ✓ ${res.examenes} examen(es), ${res.docs} docs`);
        process.stdout.write(`   [${pct}% | ${elapsed}s | ETA ~${eta}s]\n`);
      } else {
        errores++;
        errorLog.push({ cedula: p.cedula, nombre: p.nombre, reason: res.reason });
        process.stdout.write(`    ✗ ${res.reason}\n`);

        // Si es error de sesión, parar todo
        if (res.reason?.includes("renovar sesión")) {
          console.error("\n⛔ Sesión expirada. Guarda una nueva sesión y vuelve a correr el script.");
          break;
        }
      }
    } catch (e) {
      errores++;
      errorLog.push({ cedula: p.cedula, nombre: p.nombre, reason: e.message });
      process.stdout.write(`    ✗ Error: ${e.message.slice(0, 60)}\n`);
    }

    // Pausa entre pacientes
    if (i < pacientes.length - 1) await sleep(1200);
  }

  // ── Resumen final ──────────────────────────────────────────────────────────
  const duracion = Math.round((Date.now() - inicio) / 1000);
  const min = Math.floor(duracion / 60);
  const seg = duracion % 60;

  console.log("\n" + "=".repeat(65));
  console.log(`  ✅ Descargados:  ${ok}  |  ↩ Ya tenían: ${saltados}  |  ❌ Errores: ${errores}`);
  console.log(`  📄 Documentos:   ${totalDocs} archivos nuevos`);
  console.log(`  ⏱  Tiempo:       ${min}m ${seg}s`);
  console.log(`  📁 Carpeta:      ${OUT_DIR}`);
  if (errorLog.length > 0) {
    console.log(`\n  Errores detalle:`);
    errorLog.forEach((e) => console.log(`    - ${e.cedula} | ${e.nombre}: ${e.reason}`));
  }
  console.log("=".repeat(65));
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message || err);
  process.exit(1);
});
