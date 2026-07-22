/**
 * auto-generate.js — Pipeline completo: URL → navegar → capturar DOM → AI → caso JSON
 *
 * Uso:
 *   node scripts/auto-generate.js "descripción de lo que hacer" https://target.com
 *   node scripts/auto-generate.js "descarga el certificado" https://portal.com --session sessions/foo.json
 *   node scripts/auto-generate.js "haz login y extrae datos" https://app.com --headless false
 *
 * Opciones:
 *   --session <path>    Archivo de sesión JSON con cookies/storage (generado por scripts/save-session.js)
 *   --headless false    Lanza el browser en modo visible (útil para depurar)
 *   --out <path>        Ruta de salida (default: tests/generated/case.generated.json)
 *   --dom-only          Solo captura y guarda el DOM, sin generar el caso
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createStagehand } from "../src/core/stagehand.js";
import { buildDomContext } from "../src/ai/build-dom-context.js";
import { generateLlmText } from "../src/ai/llm.js";
import { extractJson } from "../src/ai/utils.js";
import { STEP_CATALOG } from "../src/ai/catalog.js";
import { getKnowledge } from "../src/ai/knowledge.js";
import { validateCaseOrThrow } from "../src/ai/validate-case.js";
import { normalizeCase } from "../src/ai/normalize-case.js";
import { buildGeneratePrompt } from "../src/ai/prompts/generate.js";
import { EXAMPLES } from "../src/ai/examples.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    prompt: null,
    url: null,
    session: null,
    headless: true,
    out: 'tests/generated/case.generated.json',
    domOnly: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--session') { result.session = args[++i]; }
    else if (arg === '--headless') { result.headless = args[++i] !== 'false'; }
    else if (arg === '--out') { result.out = args[++i]; }
    else if (arg === '--dom-only') { result.domOnly = true; }
    else if (!result.prompt && !arg.startsWith('http')) { result.prompt = arg; }
    else if (!result.url && arg.startsWith('http')) { result.url = arg; }
    i++;
  }

  return result;
}

async function loadSession(context, sessionPath) {
  const raw = await fs.readFile(sessionPath, 'utf8');
  const session = JSON.parse(raw);

  if (Array.isArray(session.cookies) && session.cookies.length > 0) {
    await context.addCookies(session.cookies);
    console.log(`[session] Cargadas ${session.cookies.length} cookies`);
  }

  if (Array.isArray(session.origins)) {
    for (const origin of session.origins) {
      if (origin.localStorage?.length > 0) {
        await context.addInitScript(({ origin, items }) => {
          if (location.origin === origin) {
            for (const { name, value } of items) {
              localStorage.setItem(name, value);
            }
          }
        }, { origin: origin.origin, items: origin.localStorage });
      }
    }
    console.log(`[session] localStorage configurado para ${session.origins.length} orígenes`);
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  if (!opts.url) {
    console.error('Error: debes proporcionar una URL.');
    console.error('Uso: node scripts/auto-generate.js "prompt" https://target.com [--session sessions/foo.json]');
    process.exit(1);
  }

  if (!opts.domOnly && !opts.prompt) {
    console.error('Error: debes proporcionar un prompt (descripción de qué automatizar).');
    console.error('O usa --dom-only para solo capturar el DOM.');
    process.exit(1);
  }

  console.log(`\n🌐 URL: ${opts.url}`);
  if (opts.prompt) console.log(`📝 Prompt: ${opts.prompt}`);
  if (opts.session) console.log(`🔑 Sesión: ${opts.session}`);

  // 1. Inicializar browser
  const stagehand = createStagehand({
    stagehand: { headless: opts.headless }
  });

  try {
    await stagehand.init();
    const page = stagehand.context.pages()[0];

    // 2. Cargar sesión si se proporcionó
    if (opts.session) {
      await loadSession(stagehand.context, opts.session);
    }

    // 3. Navegar a la URL
    console.log(`\n[1/4] Navegando a ${opts.url}...`);
    await page.goto(opts.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // 4. Capturar DOM
    console.log(`[2/4] Capturando DOM...`);
    const domContext = await buildDomContext(page, { capturedUrl: opts.url });

    const domJson = JSON.stringify(domContext, null, 2);
    console.log(`      ✓ ${domContext.inputs?.length || 0} inputs, ${domContext.buttons?.length || 0} botones, ${domContext.selects?.length || 0} selects`);

    // Guardar DOM para referencia
    const domOutDir = path.resolve('tmp');
    await fs.mkdir(domOutDir, { recursive: true });
    const domOutPath = path.join(domOutDir, 'dom-context.json');
    await fs.writeFile(domOutPath, domJson, 'utf8');
    console.log(`      DOM guardado en: ${domOutPath}`);

    if (opts.domOnly) {
      console.log('\n✅ --dom-only: DOM capturado. Usa generate-from-dom.js para generar el caso.');
      return;
    }

    // 5. Generar caso con AI
    console.log(`[3/4] Generando caso con AI...`);

    const domAwareRequest = `
${opts.prompt}

URL actual: ${opts.url}

Contexto DOM estructurado capturado de la página:
${domJson}

Instrucciones adicionales:
- Usa el contexto DOM como fuente de verdad para selectores, labels y opciones.
- Para formularios, usa únicamente campos reales del contexto si existen.
- Para select HTML nativo, usa text o value presentes en options del DOM.
- Nunca generes value vacío en un select.
- Para combobox/autocomplete, usa selectAutocompleteOption solo si el contexto muestra comboboxes reales.
- Prefiere los selectors exactos que ya aparezcan en el contexto DOM.
- Incluye la url del caso: "${opts.url}".
`.trim();

    const { system, user } = buildGeneratePrompt({
      userRequest: domAwareRequest,
      catalog: STEP_CATALOG,
      knowledge: getKnowledge(),
      examples: EXAMPLES,
    });

    const rawText = await generateLlmText({ system, user });

    console.log('\n===== RAW LLM TEXT =====\n');
    console.log(rawText);

    // 6. Parsear, validar y normalizar
    const jsonText = extractJson(rawText);
    const parsed = JSON.parse(jsonText);

    console.log('\n===== JSON PARSEADO =====\n');
    console.log(JSON.stringify(parsed, null, 2));

    const validated = validateCaseOrThrow(parsed);
    const normalized = normalizeCase(validated);

    // 7. Guardar caso generado
    console.log(`\n[4/4] Guardando caso...`);
    const outPath = path.resolve(opts.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(normalized, null, 2), 'utf8');

    console.log(`\n✅ Caso generado en: ${outPath}`);
    console.log(`   Pasos generados: ${normalized.steps?.length || 0}`);
    console.log(`\nPara ejecutarlo:`);
    console.log(`   node index.js ${opts.out}`);

  } finally {
    await stagehand.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err);
  process.exit(1);
});
