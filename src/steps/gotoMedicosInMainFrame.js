export async function runGotoMedicosInMainFrame(step, ctx, i) {
  const fromKey = step.fromKey || 'mainUrl';
  const raw = ctx.result.outputs[fromKey];

  if (!raw) {
    throw new Error(`No existe output con key='${fromKey}'`);
  }

  let parsed;
  try {
    parsed = new URL(String(raw).trim());
  } catch {
    throw new Error(`El output '${fromKey}' no contiene una URL válida: ${raw}`);
  }

  const match = parsed.pathname.match(/\/sessionid\/([^/]+)\/login\/([^/]+)/i);
  if (!match) {
    throw new Error(`No se pudo extraer sessionid/login desde: ${parsed.pathname}`);
  }

  const sessionid = match[1];
  const login = match[2];

  const medicosUrl =
    `${parsed.origin}/as.pl` +
    `?path=bin/mozilla` +
    `&action=medicos` +
    `&level=Asistencial--Administrar--Medicos--Administrar` +
    `&login=${encodeURIComponent(login)}` +
    `&timeout=360000` +
    `&sessionid=${encodeURIComponent(sessionid)}` +
    `&js=1`;

  ctx.logs.push(`[${i}] gotoMedicosInMainFrame ${fromKey} -> ${medicosUrl}`);

  const hasMainWindowFrame = await ctx.page.evaluate(() => {
    return !!(
      document.querySelector('frame[name="main_window"]') ||
      document.querySelector('iframe[name="main_window"]') ||
      document.querySelector('#main_window')
    );
  });

  if (hasMainWindowFrame) {
    const changed = await ctx.page.evaluate((url) => {
      const frameEl =
        document.querySelector('frame[name="main_window"]') ||
        document.querySelector('iframe[name="main_window"]') ||
        document.querySelector('#main_window');

      if (!frameEl) return false;

      frameEl.setAttribute('src', url);
      return true;
    }, medicosUrl);

    if (!changed) {
      throw new Error("Se detectó main_window pero no se pudo actualizar su src");
    }

    await new Promise((r) => setTimeout(r, step.waitMs ?? 2000));

    if (step.saveAs) {
      ctx.result.outputs[step.saveAs] = medicosUrl;
    }

    return {
      mode: 'frame-src',
      navigatedInFrame: true,
      fromKey,
      url: medicosUrl,
      savedAs: step.saveAs || null,
      sessionid,
      login,
    };
  }

  await ctx.page.goto(medicosUrl, {
    waitUntil: step.waitUntil || 'domcontentloaded',
    timeout: step.timeoutMs ?? 60000,
  });

  try {
    await ctx.page.waitForLoadState('domcontentloaded', {
      timeout: step.timeoutMs ?? 60000,
    });
  } catch {}

  try {
    await ctx.page.waitForSelector('table', {
      timeout: step.timeoutMs ?? 60000,
    });
  } catch {}

  await new Promise((r) => setTimeout(r, step.waitMs ?? 2000));

  if (step.saveAs) {
    ctx.result.outputs[step.saveAs] = medicosUrl;
  }

  return {
    mode: 'page-goto',
    navigated: true,
    fromKey,
    url: medicosUrl,
    savedAs: step.saveAs || null,
    sessionid,
    login,
  };
}