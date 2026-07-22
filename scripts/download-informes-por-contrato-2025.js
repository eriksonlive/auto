/**
 * download-informes-por-contrato-2025.js
 * Descarga los informes de Historia Ocupacional para cada contrato, mes a mes, año 2025.
 * Total: 101 contratos × 12 meses = 1,212 archivos.
 *
 * Estructura de salida:
 *   informes/por_contrato/001_PARTICULARES/historia_ocupacional_enero_2025.xls
 *   informes/por_contrato/002_MC_CONSTRUCCIONES_LTDA_.../historia_ocupacional_enero_2025.xls
 *   ...
 *
 * Uso:
 *   node scripts/download-informes-por-contrato-2025.js
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
const OUT_DIR = path.resolve("informes/por_contrato");

const CONTRATOS = [
  { id: 1,   nombre: "PARTICULARES", codempresa: "000232" },
  { id: 2,   nombre: "MC CONSTRUCCIONES LTDA - LA MADRID II", codempresa: "000014" },
  { id: 3,   nombre: "CORPORACION PARA EL DESARROLLO ECONOMICO Y SOCIAL DE LA ORINOQUIA", codempresa: "000003" },
  { id: 4,   nombre: "MC CONSTRUCCIONES LTDA - FORESTAL", codempresa: "000014" },
  { id: 6,   nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS SAS EXA ADMON", codempresa: "000026" },
  { id: 7,   nombre: "IVAN ALBERTO PEREZ", codempresa: "000001" },
  { id: 8,   nombre: "TRANSPORTES Y SERVICIOS TRANSER S.A", codempresa: "000002" },
  { id: 9,   nombre: "MUNDOPETROL S.A.S", codempresa: "000021" },
  { id: 10,  nombre: "BAGUER S.A.S", codempresa: "000207" },
  { id: 11,  nombre: "RB HIDRAULICOS SAS", codempresa: "000004" },
  { id: 12,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61010116100", codempresa: "000041" },
  { id: 13,  nombre: "PLANTAS Y EQUIPOS H.G. SAS", codempresa: "000006" },
  { id: 14,  nombre: "JHOAN ANDREY MONTAÑA CLAROS", codempresa: "000007" },
  { id: 15,  nombre: "EXPO ANDAMIOS", codempresa: "000008" },
  { id: 16,  nombre: "GIMNASIO CAMPESTRE LA FONTANA", codempresa: "000009" },
  { id: 17,  nombre: "CONSORCIO ENERGIA COLOMBIA S.A CENERCOL S.A", codempresa: "000010" },
  { id: 18,  nombre: "PALMERAS LOS ARAGUATOS S.A.S", codempresa: "000011" },
  { id: 19,  nombre: "MC CONSTRUCCIONES LTDA", codempresa: "000014" },
  { id: 20,  nombre: "MC CONSTRUCCIONES LTDA - GUATAPE III", codempresa: "000014" },
  { id: 21,  nombre: "MC CONSTRUCCIONES LTDA - OCOA FASE III", codempresa: "000014" },
  { id: 22,  nombre: "EQUIVIDA SOLUCIONES EMPRESARIALES S.A.S", codempresa: "000015" },
  { id: 23,  nombre: "DISTRILLANO S.A.S", codempresa: "000016" },
  { id: 24,  nombre: "DISTRISUIZE S.A.S", codempresa: "000017" },
  { id: 25,  nombre: "SUIZE DISTRIBUCIONES LTDA", codempresa: "000018" },
  { id: 26,  nombre: "LA AURORA DE ORIENTE S.A.S", codempresa: "000019" },
  { id: 27,  nombre: "MAVALLE S.A.S", codempresa: "000020" },
  { id: 28,  nombre: "TURESTUR LIMITADA", codempresa: "000022" },
  { id: 29,  nombre: "SEGUROS ASESORES INTERMEDIARIOS LTDA", codempresa: "000023" },
  { id: 30,  nombre: "SALITRE TRES SAS", codempresa: "000025" },
  { id: 31,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3000400", codempresa: "000026" },
  { id: 32,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS SAS - EXA ACACIAS", codempresa: "000026" },
  { id: 33,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3004573", codempresa: "000026" },
  { id: 34,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3005273", codempresa: "000026" },
  { id: 35,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3005868", codempresa: "000026" },
  { id: 36,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3008642", codempresa: "000026" },
  { id: 37,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3009695", codempresa: "000026" },
  { id: 38,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3009780", codempresa: "000026" },
  { id: 39,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3010357", codempresa: "000026" },
  { id: 40,  nombre: "MONTAJES TECNICOS ZAMBRANO Y VARGAS LTDA - 3011213", codempresa: "000026" },
  { id: 41,  nombre: "EMPRESA DE SERVICIOS E INGENIERIA EMSEI LTDA", codempresa: "000027" },
  { id: 42,  nombre: "MENESES RAMIREZ S.A.S", codempresa: "000030" },
  { id: 43,  nombre: "FEDERACION NACIONAL DE ARROCEROS FEDEARROZ", codempresa: "000031" },
  { id: 44,  nombre: "MC CONSTRUCCIONES LTDA - INMOBILIARIA", codempresa: "000014" },
  { id: 45,  nombre: "PETRELLANOS SAS", codempresa: "000032" },
  { id: 46,  nombre: "GRUPO PRISMA D.N. SAS", codempresa: "000033" },
  { id: 47,  nombre: "SOS MEDICAL SAS", codempresa: "000034" },
  { id: 48,  nombre: "ALUMINIO Y VIDRIO DE LUJO SAS", codempresa: "000037" },
  { id: 49,  nombre: "ACEITES CIMARRONES S.A.S. ZONA FRANCA PERMANENTE ESPECIAL AGROINDUSTRIAL", codempresa: "000039" },
  { id: 50,  nombre: "MACO INGENIERIA SA - CENTRO LOGISTICO CASTILLA", codempresa: "000040" },
  { id: 51,  nombre: "MACO INGENIERIA SA - 25 MANTENIMIENTO", codempresa: "000040" },
  { id: 52,  nombre: "MACO INGENIERIA SA - OFICINA CENTRAL", codempresa: "000040" },
  { id: 53,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61011001100", codempresa: "000041" },
  { id: 54,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61010102100", codempresa: "000041" },
  { id: 55,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 63020000104", codempresa: "000041" },
  { id: 56,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 63020101104", codempresa: "000041" },
  { id: 57,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61020000104", codempresa: "000041" },
  { id: 58,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 60020000700", codempresa: "000041" },
  { id: 59,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 63020109423", codempresa: "000041" },
  { id: 60,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61010110100", codempresa: "000041" },
  { id: 61,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61010109100", codempresa: "000041" },
  { id: 62,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61010115100", codempresa: "000041" },
  { id: 63,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 63020000103", codempresa: "000041" },
  { id: 64,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 61010114100", codempresa: "000041" },
  { id: 65,  nombre: "CONFIPETROL SAS - CENTRO DE COSTO 63020000447", codempresa: "000041" },
  { id: 66,  nombre: "SERVICIO INTEGRAL TALENTOS LTDA", codempresa: "000043" },
  { id: 67,  nombre: "OBRAS CIVILES Y MANTENIMIENTO J.J SAS", codempresa: "000044" },
  { id: 68,  nombre: "CONCEJO MUNICIPAL DE VILLAVICENCIO", codempresa: "000045" },
  { id: 69,  nombre: "GERENCIAS INVERSIONES Y CONSTRUCCIONES LIMITADA", codempresa: "000047" },
  { id: 70,  nombre: "EDIFICIO TERMINAL DE TRANSPORTE VILLAVICENCIO", codempresa: "000048" },
  { id: 71,  nombre: "INSTITUCION DE EDUCACION PARA EL TRABAJO Y EL DESARROLLO HUMANO COSBELL SAS", codempresa: "000049" },
  { id: 72,  nombre: "ABA INGENIEROS CIVILES S.A.S", codempresa: "000050" },
  { id: 73,  nombre: "SERVITRANSGUAMAL SAS", codempresa: "000051" },
  { id: 74,  nombre: "TRANSPORTE DE CARGA JUC SAS", codempresa: "000052" },
  { id: 75,  nombre: "BIENESTAR Y SALUD LABORAL SAS", codempresa: "000053" },
  { id: 76,  nombre: "VITAGRO LIMITADA", codempresa: "000054" },
  { id: 77,  nombre: "LIBIA YANNETH HERNANDEZ CHAPARRO", codempresa: "000055" },
  { id: 78,  nombre: "OBSERVAR LTDA", codempresa: "000056" },
  { id: 79,  nombre: "SALPROMIN LTDA", codempresa: "000057" },
  { id: 80,  nombre: "TERMOMORICHAL SAS", codempresa: "000058" },
  { id: 81,  nombre: "SERVIMEDICOS LTDA", codempresa: "000059" },
  { id: 82,  nombre: "SIMSE LTDA", codempresa: "000060" },
  { id: 83,  nombre: "COOPERATIVA DE TRANSPORTADORES DE TANQUES Y CAMIONES PARA COLOMBIA", codempresa: "000061" },
  { id: 84,  nombre: "CENTRAL DE IMAGENES Y DIAGNOSTICOS M&M SAS", codempresa: "000062" },
  { id: 85,  nombre: "CANCHAS SINTETICAS MI SELECCION LLANERA SAS", codempresa: "000065" },
  { id: 86,  nombre: "DEPARTAMENTO ADMINISTRATIVO NACIONAL DE ESTADISTICA", codempresa: "000066" },
  { id: 87,  nombre: "FUMIGACIONES YOUNG SAS", codempresa: "000067" },
  { id: 88,  nombre: "MARSELLA HACIENDA ECOTURISTICA SAS", codempresa: "000068" },
  { id: 89,  nombre: "WILFREDO CUELLAR LOPEZ", codempresa: "000069" },
  { id: 90,  nombre: "CENTRO COMERCIAL VILLACENTRO", codempresa: "000070" },
  { id: 91,  nombre: "CONSORCIO VIVIENDA PRIORITARIA - LA MACARENA", codempresa: "000071" },
  { id: 92,  nombre: "CARLOS SAMUEL CASTRO MONROY", codempresa: "000072" },
  { id: 93,  nombre: "CONSORCIO CRUCE GUAYURIBA", codempresa: "000073" },
  { id: 94,  nombre: "CASACOL SAS", codempresa: "000074" },
  { id: 95,  nombre: "INVERSORA LA PAZ SAS", codempresa: "000076" },
  { id: 96,  nombre: "EXTRACTORA LA PAZ SA", codempresa: "000077" },
  { id: 97,  nombre: "ELECTRIFICADORA DE MAPIRIPAN SA ESP", codempresa: "000080" },
  { id: 98,  nombre: "MARGARITA ROSA VARGAS GARCIA", codempresa: "000081" },
  { id: 99,  nombre: "CONSORCIO VIVIENDAS FUENTE DE ORO Y CUMARAL - CENTRO TRABAJO CUMARAL", codempresa: "000085" },
  { id: 100, nombre: "CONSORCIO VIVIENDAS FUENTE DE ORO Y CUMARAL - FUENTE DE ORO", codempresa: "000085" },
  { id: 101, nombre: "ROSARIO VARGAS FRANCO", codempresa: "000086" },
];

const MESES = [
  { mes: "enero",      n: "01", fechaini: "2025/01/01", fechafin: "2025/01/31" },
  { mes: "febrero",    n: "02", fechaini: "2025/02/01", fechafin: "2025/02/28" },
  { mes: "marzo",      n: "03", fechaini: "2025/03/01", fechafin: "2025/03/31" },
  { mes: "abril",      n: "04", fechaini: "2025/04/01", fechafin: "2025/04/30" },
  { mes: "mayo",       n: "05", fechaini: "2025/05/01", fechafin: "2025/05/31" },
  { mes: "junio",      n: "06", fechaini: "2025/06/01", fechafin: "2025/06/30" },
  { mes: "julio",      n: "07", fechaini: "2025/07/01", fechafin: "2025/07/31" },
  { mes: "agosto",     n: "08", fechaini: "2025/08/01", fechafin: "2025/08/31" },
  { mes: "septiembre", n: "09", fechaini: "2025/09/01", fechafin: "2025/09/30" },
  { mes: "octubre",    n: "10", fechaini: "2025/10/01", fechafin: "2025/10/31" },
  { mes: "noviembre",  n: "11", fechaini: "2025/11/01", fechafin: "2025/11/30" },
  { mes: "diciembre",  n: "12", fechaini: "2025/12/01", fechafin: "2025/12/31" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(id, nombre) {
  const slug = nombre
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 50)
    .replace(/_+$/, "");
  return `${String(id).padStart(3, "0")}_${slug}`;
}

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
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

async function setupBrowserSession() {
  process.stdout.write("Iniciando browser para establecer sesión... ");
  const session = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--ignore-certificate-errors", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });

  if (session.cookies?.length) await context.addCookies(session.cookies);

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/sisma.php`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  try {
    await page.selectOption("form select:first-of-type", { label: "VILLAVICENCIO" });
    await page.waitForTimeout(3000);
    const selects = await page.locator("form select").all();
    if (selects.length >= 2) {
      const options = await selects[1].locator("option").all();
      if (options.length > 1) {
        const val = await options[1].getAttribute("value");
        await selects[1].selectOption({ value: val });
      }
    }
    await page.waitForTimeout(1000);
    await page.click("form div button");
    await page.waitForTimeout(5000);
  } catch (e) {
    // continua aunque falle la seleccion de sede
  }

  const cookies = await context.cookies();
  const cookieStr = cookies
    .filter((c) => INFORME_URL.includes(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  await browser.close();
  console.log(`OK (${cookies.length} cookies)`);
  return cookieStr;
}

async function downloadMes(contrato, mes, cookieStr, contratoDir) {
  const params = new URLSearchParams({
    contrato: String(contrato.id),
    remisor: "",
    cliente: "",
    fechaini: mes.fechaini,
    fechafin: mes.fechafin,
  });
  const url = `${INFORME_URL}?${params.toString()}`;
  const filename = `${mes.n}_${mes.mes}_2025.xls`;
  const outPath = path.join(contratoDir, filename);

  try {
    const resp = await httpGet(url, cookieStr);
    const size = resp.body.length;
    const ct = resp.headers["content-type"] || "";

    if (resp.status !== 200 || (size < 300 && ct.includes("text/html"))) {
      return { ok: false, mes: mes.mes, size, reason: `HTTP ${resp.status}` };
    }

    await writeFile(outPath, resp.body);
    return { ok: true, mes: mes.mes, size };
  } catch (e) {
    return { ok: false, mes: mes.mes, size: 0, reason: e.message };
  }
}

async function main() {
  const total = CONTRATOS.length * MESES.length;
  console.log("=".repeat(65));
  console.log(`  Equivida — Informes por Contrato 2025`);
  console.log(`  ${CONTRATOS.length} contratos × 12 meses = ${total} archivos`);
  console.log("=".repeat(65));

  await mkdir(OUT_DIR, { recursive: true });

  const cookieStr = await setupBrowserSession();
  console.log();

  let done = 0;
  let errors = 0;
  const errorLog = [];

  for (let ci = 0; ci < CONTRATOS.length; ci++) {
    const contrato = CONTRATOS[ci];
    const slug = slugify(contrato.id, contrato.nombre);
    const contratoDir = path.join(OUT_DIR, slug);
    await mkdir(contratoDir, { recursive: true });

    const label = `[${ci + 1}/${CONTRATOS.length}] ${slug}`;
    process.stdout.write(`${label}\n`);

    // Descargar los 12 meses del contrato en lotes de 3 paralelos
    for (let mi = 0; mi < MESES.length; mi += 3) {
      const batch = MESES.slice(mi, mi + 3);
      const results = await Promise.all(
        batch.map((mes) => downloadMes(contrato, mes, cookieStr, contratoDir))
      );

      for (const r of results) {
        done++;
        const pct = ((done / total) * 100).toFixed(1);
        if (r.ok) {
          process.stdout.write(`    ✓ ${r.mes.padEnd(11)} ${(r.size / 1024).toFixed(1).padStart(7)} KB   [${pct}%]\n`);
        } else {
          errors++;
          process.stdout.write(`    ✗ ${r.mes.padEnd(11)} ERROR: ${r.reason}   [${pct}%]\n`);
          errorLog.push({ contrato: slug, mes: r.mes, reason: r.reason });
        }
      }

      if (mi + 3 < MESES.length) await sleep(600);
    }

    // Pausa entre contratos para no saturar el servidor
    if (ci < CONTRATOS.length - 1) await sleep(1500);
    console.log();
  }

  // Resumen final
  console.log("=".repeat(65));
  console.log(`  ✅ Descargados:  ${done - errors}/${total}`);
  if (errors > 0) {
    console.log(`  ❌ Errores:      ${errors}`);
    for (const e of errorLog) {
      console.log(`     - ${e.contrato} / ${e.mes}: ${e.reason}`);
    }
  }
  console.log(`  📁 Carpeta: ${OUT_DIR}`);
  console.log("=".repeat(65));

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err.message || err);
  process.exit(1);
});
