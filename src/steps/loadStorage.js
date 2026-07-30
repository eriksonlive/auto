import path from 'path';
import { readJson } from '../lib/fs.js';

export async function runLoadStorage(step, ctx, i) {
  const sessionFile = step.file;
  if (!sessionFile) throw new Error("loadStorage requiere 'file'");

  const absPath = path.resolve(sessionFile);
  ctx.logs.push(`[${i}] loadStorage ${absPath}`);

  let session;
  try {
    session = await readJson(absPath);
  } catch {
    throw new Error(`No se encontró el archivo de sesión: ${absPath}. Ejecuta scripts/save-session.js primero.`);
  }

  const browserContext = ctx.stagehand.context;

  if (session.cookies?.length) {
    await browserContext.addCookies(session.cookies);
  }

  if (session.localStorage && Object.keys(session.localStorage).length > 0) {
    const storageUrl = session.storageUrl || step.storageUrl;
    if (!storageUrl) throw new Error("loadStorage requiere 'storageUrl' en el step o en el archivo de sesión cuando hay localStorage");

    await ctx.page.goto(storageUrl, { waitUntil: 'domcontentloaded' });
    await ctx.page.evaluate((data) => {
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }
    }, session.localStorage);
  }

  return {
    loaded: absPath,
    cookies: session.cookies?.length ?? 0,
    localStorageKeys: Object.keys(session.localStorage ?? {}).length
  };
}
