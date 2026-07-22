import path from 'path';
import { readJson, writeJson, ensureDir } from './lib/fs.js';
import { slugFromUrl } from './lib/slug.js';
import { nowStamp } from './utils/time.js';
import { createStagehand } from './core/stagehand.js';
import { createRunContext } from './core/context.js';
import { createInitialResult, finalizeResult } from './core/result.js';
import { executeStep } from './steps/registry.js';

async function runTest(jsonPath) {
  const absJson = path.resolve(jsonPath);
  const test = await readJson(absJson);

  const baseUrl = test.url;
  if (!baseUrl) {
    throw new Error("El JSON debe incluir 'url'.");
  }

  const runRoot = path.resolve('runs');
  const slug = slugFromUrl(baseUrl);
  const stamp = nowStamp();
  const outDir = path.join(runRoot, slug, stamp);

  await ensureDir(outDir);
  await writeJson(path.join(outDir, 'input.json'), test);

  const logs = [];
  const result = createInitialResult({
    name: test.name || path.basename(jsonPath),
    url: baseUrl,
  });

  let stagehand;

  try {
    stagehand = createStagehand(test);
    await stagehand.init();

    const page = stagehand.context.pages()[0];

    const ctx = createRunContext({
      test,
      page,
      stagehand,
      outDir,
      logs,
      result,
      baseUrl,
    });

    const steps = Array.isArray(test.steps) ? test.steps : [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      const stepRec = {
        i,
        type: step.type,
        startedAt: new Date().toISOString(),
        ok: true,
        data: null,
        error: null,
        screenshots: {
          before: null,
          after: null,
          error: null,
        },
        pageInfo: {
          before: null,
          after: null,
          error: null,
        },
      };

      try {
        // info de página antes
        try {
          stepRec.pageInfo.before = {
            url: await page.url(),
            title: await page.title(),
          };
        } catch (pageInfoErr) {
          logs.push(
            `[${i}] WARN pageInfo before: ${String(pageInfoErr?.message || pageInfoErr)}`,
          );
        }

        // screenshot antes
        try {
          stepRec.screenshots.before = await ctx.helpers.captureStepScreenshot({
            index: i,
            type: step.type,
            phase: 'before',
          });
        } catch (shotErr) {
          logs.push(
            `[${i}] WARN screenshot before: ${String(shotErr?.message || shotErr)}`,
          );
        }

        // ejecutar step
        stepRec.data = await executeStep(step, ctx, i);

        // info de página después
        try {
          stepRec.pageInfo.after = {
            url: await page.url(),
            title: await page.title(),
          };
        } catch (pageInfoErr) {
          logs.push(
            `[${i}] WARN pageInfo after: ${String(pageInfoErr?.message || pageInfoErr)}`,
          );
        }

        // screenshot después
        try {
          stepRec.screenshots.after = await ctx.helpers.captureStepScreenshot({
            index: i,
            type: step.type,
            phase: 'after',
          });
        } catch (shotErr) {
          logs.push(
            `[${i}] WARN screenshot after: ${String(shotErr?.message || shotErr)}`,
          );
        }
      } catch (err) {
        stepRec.ok = false;
        stepRec.error = String(err?.message || err);
        logs.push(`[${i}] ERROR (${step.type}): ${stepRec.error}`);

        // info de página en error
        try {
          stepRec.pageInfo.error = {
            url: await page.url(),
            title: await page.title(),
          };
        } catch (pageInfoErr) {
          logs.push(
            `[${i}] WARN pageInfo error: ${String(pageInfoErr?.message || pageInfoErr)}`,
          );
        }

        // screenshot de error
        try {
          stepRec.screenshots.error = await ctx.helpers.captureStepScreenshot({
            index: i,
            type: step.type,
            phase: 'error',
          });
        } catch (shotErr) {
          logs.push(
            `[${i}] WARN screenshot error: ${String(shotErr?.message || shotErr)}`,
          );
        }

        result.steps.push({
          ...stepRec,
          finishedAt: new Date().toISOString(),
        });
        break;
      }

      result.steps.push({
        ...stepRec,
        finishedAt: new Date().toISOString(),
      });
    }

    finalizeResult(result);
  } catch (err) {
    result.meta.status = 'failed';
    result.meta.finishedAt = new Date().toISOString();
    result.meta.fatalError = String(err?.message || err);
    logs.push(`[FATAL] ${result.meta.fatalError}`);
  } finally {
    if (stagehand) {
      try {
        await stagehand.close();
      } catch {}
    }
  }

  await writeJson(path.join(outDir, 'result.json'), result);
  await writeJson(path.join(outDir, 'meta.json'), result.meta);

  await (await import('fs')).promises.writeFile(
    path.join(outDir, 'logs.txt'),
    logs.join('\n') + '\n',
    'utf-8',
  );

  console.log(`✅ Run terminado: ${outDir}`);
  console.log(`Status: ${result.meta.status}`);

  return {
    outDir,
    status: result.meta.status,
  };
}

const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error('Uso: node src/run.js tests/archivo.json');
  process.exit(1);
}

runTest(jsonPath).catch((e) => {
  console.error(e);
  process.exit(1);
});