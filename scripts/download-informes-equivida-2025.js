/**
 * download-informes-equivida-2025.js
 * Descarga los informes de Historia Ocupacional mes a mes para todo el 2025 de Equivida.
 * Guarda los archivos en /informes/ con nombre historia_ocupacional_<mes>_2025.xls
 *
 * Uso:
 *   node scripts/download-informes-equivida-2025.js
 */

import "dotenv/config";
import path from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import https from "node:https";
import http from "node:http";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const BASE_URL = "https://equivida.isismaweb.com/app/asistencial/sismaweb";
const SESSION_FILE = path.resolve("sessions/equivida.json");
const INFORME_URL = `${BASE_URL}/reportes/html/excel/recurso/historia4ocupacional.php`;
const OUT_DIR = path.resolve("informes");

const MESES = [
  { mes: "enero",      fechaini: "2025/01/01", fechafin: "2025/01/31" },
  { mes: "febrero",    fechaini: "2025/02/01", fechafin: "2025/02/28" },
  { mes: "marzo",      fechaini: "2025/03/01", fechafin: "2025/03/31" },
  { mes: "abril",      fechaini: "2025/04/01", fechafin: "2025/04/30" },
  { mes: "mayo",       fechaini: "2025/05/01", fechafin: "2025/05/31" },
  { mes: "junio",      fechaini: "2025/06/01", fechafin: "2025/06/30" },
  { mes: "julio",      fechaini: "2025/07/01", fechafin: "2025/07/31" },
  { mes: "agosto",     fechaini: "2025/08/01", fechafin: "2025/08/31" },
  { mes: "septiembre", fechaini: "2025/09/01", fechafin: "2025/09/30" },
  { mes: "octubre",    fechaini: "2025/10/01", fechafin: "2025/10/31" },
  { mes: "noviembre",  fechaini: "2025/11/01", fechafin: "2025/11/30" },
  { mes: "diciembre",  fechaini: "2025/12/01", fechafin: "2025/12/31" },
];

function httpGet(urlStr, cookieStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        Cookie: cookieStr,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: BASE_URL,
      },
      rejectUnauthorized: false,
      timeout: 60000,
    };
    const requester = url.protocol === "https:" ? https : http;
    const req = requester.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      );
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

async function setupBrowserSession() {
  console.log("Iniciando browser para establecer sesión...");
  const session = JSON.parse(readFileSync(SESSION_FILE, "utf8"));

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--ignore-certificate-errors", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({ ignoreHTTPSErrors: true });

  // Cargar cookies de sesión
  if (session.cookies?.length) {
    await context.addCookies(session.cookies);
    console.log(`  ✓ ${session.cookies.length} cookies cargadas`);
  }

  const page = await context.newPage();

  // Navegar al app
  await page.goto(`${BASE_URL}/sisma.php`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Seleccionar sede VILLAVICENCIO
  try {
    await page.selectOption("form select:first-of-type", { label: "VILLAVICENCIO" });
    console.log("  ✓ Sede: VILLAVICENCIO");
    await page.waitForTimeout(4000);
  } catch (e) {
    console.log("  ⚠ No se encontró selector de sede:", e.message);
  }

  // Seleccionar consultorio (segunda opción, índice 1)
  try {
    const selects = await page.locator("form select").all();
    if (selects.length >= 2) {
      const options = await selects[1].locator("option").all();
      if (options.length > 1) {
        const val = await options[1].getAttribute("value");
        await selects[1].selectOption({ value: val });
        const text = await options[1].textContent();
        console.log(`  ✓ Consultorio: ${text?.trim()}`);
      }
    }
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log("  ⚠ No se pudo seleccionar consultorio:", e.message);
  }

  // Click ACCEDER
  try {
    await page.click("form div button");
    console.log("  ✓ ACCEDER clickeado");
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log("  ⚠ No se encontró botón ACCEDER:", e.message);
  }

  // Obtener cookies actualizadas
  const cookies = await context.cookies();
  const cookieStr = cookies
    .filter((c) => INFORME_URL.includes(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  console.log(`  ✓ Sesión establecida (${cookies.length} cookies activas)\n`);

  await browser.close();
  return cookieStr;
}

async function downloadMes({ mes, fechaini, fechafin }, cookieStr, index) {
  const params = new URLSearchParams({
    contrato: "1",
    remisor: "",
    cliente: "",
    fechaini,
    fechafin,
  });
  const url = `${INFORME_URL}?${params.toString()}`;
  const filename = `historia_ocupacional_${mes}_2025.xls`;
  const outPath = path.join(OUT_DIR, filename);

  process.stdout.write(`  [${index + 1}/12] ${mes.padEnd(12)} (${fechaini} → ${fechafin}) ... `);

  const resp = await httpGet(url, cookieStr);

  if (resp.status !== 200) {
    console.log(`✗ HTTP ${resp.status}`);
    return { mes, ok: false, error: `HTTP ${resp.status}` };
  }

  const size = resp.body.length;

  // Detectar si el servidor devolvió HTML de error en lugar de Excel
  const contentType = resp.headers["content-type"] || "";
  if (size < 500 || (contentType.includes("text/html") && size < 5000)) {
    const preview = resp.body.toString("utf8").slice(0, 200).replace(/\s+/g, " ");
    console.log(`✗ Respuesta inesperada (${size} bytes): ${preview}`);
    return { mes, ok: false, error: `Respuesta inesperada: ${preview}` };
  }

  await writeFile(outPath, resp.body);
  console.log(`✓ ${(size / 1024).toFixed(1)} KB → ${filename}`);
  return { mes, ok: true, size, path: outPath };
}

async function main() {
  console.log("=".repeat(60));
  console.log("  Equivida — Informes Historia Ocupacional 2025");
  console.log("=".repeat(60));
  console.log();

  await mkdir(OUT_DIR, { recursive: true });

  // 1. Establecer sesión via browser
  const cookieStr = await setupBrowserSession();

  // 2. Descargar cada mes
  console.log("Descargando informes...");
  const results = [];
  for (let i = 0; i < MESES.length; i++) {
    const res = await downloadMes(MESES[i], cookieStr, i);
    results.push(res);
    // Pausa entre requests para no saturar el servidor
    if (i < MESES.length - 1) await new Promise((r) => setTimeout(r, 1500));
  }

  // 3. Resumen
  console.log();
  console.log("=".repeat(60));
  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log(`  ✅ Descargados: ${ok.length}/12`);
  if (fail.length > 0) {
    console.log(`  ❌ Fallidos: ${fail.map((r) => r.mes).join(", ")}`);
  }
  console.log(`  📁 Carpeta: ${OUT_DIR}`);
  console.log("=".repeat(60));

  if (fail.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message || err);
  process.exit(1);
});
