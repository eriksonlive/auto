/**
 * download-documentos-2025.js
 * Descarga los documentos clínicos con formato EQUIVIDA (Imprimir Historia → Cancelar PDF → HTML)
 * para los 685 pacientes ya procesados.
 *
 * Especialidades con reporte: visiometria, optometria, audiometria, espirometria,
 *   electrocardiograma, general (y cualquier otra que tenga invocarReporte en el JS).
 *
 * Guardado: informes/certificados/<cedula>_<nombre>/<docTipo>_estudio<X>.html
 * Reanudable: salta archivos que ya existen.
 *
 * Uso:
 *   node scripts/download-documentos-2025.js
 *   node scripts/download-documentos-2025.js --limite 5
 *   node scripts/download-documentos-2025.js --cedulas 1019049987,40215191
 */

import "dotenv/config";
import path from "node:path";
import { writeFile, mkdir, readdir, access } from "node:fs/promises";
import https from "node:https";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE         = "https://equivida.isismaweb.com/app/asistencial/sismaweb";
const SESSION_FILE = path.resolve("sessions/equivida.json");
const CERT_DIR     = path.resolve("informes/certificados");

// Listas que producen documentos con formato reportes EQUIVIDA
const LISTAS = [
  "ListaOptometria",
  "ListaFonoaudiologia",
  "ListaNeumologia",
  "ListaFisioterapia",
  "ListaPsicologia",
  "ListaVacunacion",
  "ListaComplementarios",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── HTTP helper ───────────────────────────────────────────────────────────────

function httpReq(urlStr, { method = "GET", body = null, cookieStr = "" } = {}) {
  const url = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname, port: 443,
      path: url.pathname + url.search, method,
      headers: {
        Cookie: cookieStr,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Referer: BASE,
        ...(body ? {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        } : {}),
      },
      rejectUnauthorized: false, timeout: 60000,
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
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
  await context.addCookies(session.cookies);
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

// ── Extraer links de documentos de una Lista ──────────────────────────────────

function extraerLinksDocumentos(html) {
  return [...html.matchAll(/href="([^"#]*)"/g)]
    .map((m) => m[1])
    .filter((l) =>
      l.includes(".php") &&
      !l.startsWith("http") &&
      !l.startsWith("Lista") &&
      !l.includes("css") &&
      !l.includes(".js") &&
      !l.includes("ico")
    );
}

// ── Extraer URL de reporte desde JS de la página vistas ──────────────────────
// El botón "Imprimir Historia" → confirm → Cancelar → invocarReporte('hc2/recurso/XXX.php?...')
// XXX puede ser diferente al nombre del archivo vistas (complementario → electrocardiograma)

function extraerReporteUrl(html, fallbackHistoria) {
  // Busca invocarReporte('hc2/recurso/XXX.php?...')
  const inv = html.match(/invocarReporte\(['"]((hc2\/recurso\/[^'"]+))['"]\)/);
  if (inv) {
    let relUrl = inv[1]; // "hc2/recurso/electrocardiograma.php?..."
    // Rellenar historia vacío si lo tiene
    if (/historia=(&|$)/.test(relUrl)) {
      relUrl = relUrl.replace(/historia=(&|$)/, `historia=${fallbackHistoria}$1`);
    }
    return `${BASE}/reportes/html/${relUrl}`;
  }
  return null;
}

// ── Nombre de archivo a partir del link de reporte ───────────────────────────

function reporteUrlToFilename(reporteUrl, vistaLink) {
  // De la URL de reporte extraer: docTipo y estudio
  const url = new URL(reporteUrl);
  const docTipo = url.pathname.split("/").pop().replace(".php", ""); // "electrocardiograma"
  const estudio = url.searchParams.get("estudio") || "X";
  const version = url.searchParams.get("version") || "";
  return `${docTipo}_estudio${estudio}${version ? "_v" + version : ""}.html`;
}

// ── Descargar todos los documentos adicionales de un paciente ─────────────────

async function downloadDocumentos(pacienteDir, cedula, cookieStr) {
  // 1. Buscar paciente
  const s1 = await httpReq(`${BASE}/vistas/Hc/ListaPaciente.php?operacion=buscar`, {
    method: "POST", body: `termino=${cedula}`, cookieStr,
  });
  const m = s1.body.match(/href="Paciente\.php\?operacion=buscar&(?:amp;)?id=(\d+)&(?:amp;)?nro_historia=(\d+)"/);
  if (!m) return { ok: false, reason: "No encontrado en sistema" };

  // 2. Navegar a Historia (establece estado de sesión PHP)
  const s2 = await httpReq(
    `${BASE}/vistas/Hc/Historia.php?operacion=existe_paciente_his&id=${m[1]}&numhistoria=${m[2]}`,
    { cookieStr }
  );
  if (s2.body.includes("no es un usuario autorizado")) {
    return { ok: false, reason: "Sesión sin acceso — renovar" };
  }
  const pacienteId = m[1]; // ID numérico del paciente, fallback para historia

  let totalDocs = 0, saltados = 0;
  const errores = [];

  // 3. Para cada lista, extraer links y descargar documento de reportes
  for (const lista of LISTAS) {
    await sleep(350);
    const rLista = await httpReq(`${BASE}/vistas/Hc/recurso/${lista}.php`, { cookieStr });
    const links = extraerLinksDocumentos(rLista.body);
    if (links.length === 0) continue;

    for (const link of links) {
      // 4. Acceder a la página vistas para obtener la URL de reporte del JS
      await sleep(250);
      let rVista;
      try {
        rVista = await httpReq(`${BASE}/vistas/Hc/recurso/${link}`, { cookieStr });
      } catch (e) {
        errores.push(`${link}: error acceso vistas - ${e.message}`);
        continue;
      }

      // Historia del hidden input (específica de esta sesión/paciente)
      const historiaHidden = rVista.body.match(/name="historia"[^>]*value="(\d+)"/)?.[1]
                          || rVista.body.match(/id="historia"[^>]*value="(\d+)"/)?.[1]
                          || pacienteId;

      // URL correcta de reporte (desde el JS de la vista)
      const reporteUrl = extraerReporteUrl(rVista.body, historiaHidden);
      if (!reporteUrl) continue; // sin versión reportes (antecedentes, procedimientos)

      const filename = reporteUrlToFilename(reporteUrl, link);
      const filePath = path.join(pacienteDir, filename);

      // Reanudación: saltar si ya existe
      try {
        await access(filePath);
        saltados++;
        continue;
      } catch (_) {}

      // 5. Descargar el reporte
      await sleep(250);
      try {
        const rDoc = await httpReq(reporteUrl, { cookieStr });
        if (rDoc.status === 200 && rDoc.body.length >= 5000) {
          await writeFile(filePath, rDoc.body, "utf8");
          totalDocs++;
        }
      } catch (e) {
        errores.push(`${filename}: ${e.message}`);
      }
    }
  }

  return { ok: true, totalDocs, saltados, errores };
}

// ── Leer pacientes de carpetas existentes ─────────────────────────────────────

async function leerPacientes(limite, cedulasFijas) {
  if (cedulasFijas) return cedulasFijas.map((c) => ({ cedula: c, dir: null }));
  const carpetas = (await readdir(CERT_DIR)).sort();
  const pacientes = [];
  for (const carpeta of carpetas) {
    const cedula = carpeta.split("_")[0];
    if (!cedula || isNaN(cedula)) continue;
    pacientes.push({ cedula, dir: path.join(CERT_DIR, carpeta) });
    if (pacientes.length >= limite) break;
  }
  return pacientes;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let limite = 99999;
  let cedulasFijas = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limite") limite = parseInt(args[++i]);
    if (args[i] === "--cedulas") cedulasFijas = args[++i].split(",").map((c) => c.trim());
  }

  console.log("=".repeat(65));
  console.log("  Equivida — Documentos clínicos EQUIVIDA 2025");
  console.log("=".repeat(65));
  console.log("  (visiometria, audiometria, espirometria, electrocardiograma,");
  console.log("   optometria, general — todos con formato EQUIVIDA)");
  console.log("=".repeat(65));

  const cookieStr = await setupSession();
  const pacientes = await leerPacientes(limite, cedulasFijas);
  const total = pacientes.length;
  console.log(`\nProcesando ${total} pacientes...\n`);

  let okCount = 0, errCount = 0, totalDocs = 0, totalSaltados = 0;
  const errorLog = [];
  const inicio = Date.now();

  for (let i = 0; i < pacientes.length; i++) {
    const { cedula, dir } = pacientes[i];

    let pacienteDir = dir;
    if (!pacienteDir) {
      const carpetas = await readdir(CERT_DIR);
      const carpeta = carpetas.find((c) => c.startsWith(cedula + "_"));
      if (!carpeta) { errCount++; continue; }
      pacienteDir = path.join(CERT_DIR, carpeta);
    }
    const nombre = path.basename(pacienteDir).replace(cedula + "_", "").replace(/_/g, " ");
    const pct = (((i + 1) / total) * 100).toFixed(1);
    const eta = i > 0 ? Math.round(((Date.now() - inicio) / i) * (total - i) / 1000) : "...";

    process.stdout.write(`[${i + 1}/${total}] ${cedula} — ${nombre.slice(0, 35)}\n`);

    try {
      const res = await downloadDocumentos(pacienteDir, cedula, cookieStr);
      if (res.ok) {
        okCount++;
        totalDocs += res.totalDocs;
        totalSaltados += res.saltados;
        const msg = res.totalDocs > 0
          ? `    ✓ ${res.totalDocs} nuevos, ${res.saltados} ya tenían [${pct}% | ~${eta}s restantes]\n`
          : `    ↩ ${res.saltados > 0 ? res.saltados + " ya descargados" : "sin documentos de especialidad"}\n`;
        process.stdout.write(msg);
        if (res.errores.length > 0) res.errores.forEach((e) => process.stdout.write(`    ⚠ ${e}\n`));
      } else {
        errCount++;
        errorLog.push({ cedula, nombre, reason: res.reason });
        process.stdout.write(`    ✗ ${res.reason}\n`);
        if (res.reason?.includes("renovar")) break;
      }
    } catch (e) {
      errCount++;
      errorLog.push({ cedula, nombre: "", reason: e.message });
      process.stdout.write(`    ✗ Error: ${e.message.slice(0, 60)}\n`);
    }

    if (i < pacientes.length - 1) await sleep(800);
  }

  const duracion = Math.round((Date.now() - inicio) / 1000);
  const min = Math.floor(duracion / 60);
  const seg = duracion % 60;

  console.log("\n" + "=".repeat(65));
  console.log(`  ✅ Pacientes OK:  ${okCount}  |  ❌ Errores: ${errCount}`);
  console.log(`  📄 Docs nuevos:  ${totalDocs}  |  ↩ Ya tenían: ${totalSaltados}`);
  console.log(`  ⏱  Tiempo:       ${min}m ${seg}s`);
  console.log(`  📁 Carpeta:      ${CERT_DIR}`);
  if (errorLog.length > 0) {
    console.log(`\n  Errores:`);
    errorLog.forEach((e) => console.log(`    - ${e.cedula} | ${e.nombre}: ${e.reason}`));
  }
  console.log("=".repeat(65));
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message || err);
  process.exit(1);
});
