export async function runGotoMenuRouteFromMainUrl(step, ctx, i) {
  const fromKey = step.fromKey || 'mainUrl';
  const raw = ctx.result.outputs[fromKey];

  if (!raw) {
    throw new Error(`No existe output con key='${fromKey}'`);
  }

  const action = step.action;
  const level = step.level;

  if (!action) {
    throw new Error("gotoMenuRouteFromMainUrl requiere 'action'");
  }

  if (!level) {
    throw new Error("gotoMenuRouteFromMainUrl requiere 'level'");
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

  const targetUrl =
    `${parsed.origin}/as.pl` +
    `?path=bin/mozilla` +
    `&action=${encodeURIComponent(action)}` +
    `&level=${encodeURIComponent(level)}` +
    `&login=${encodeURIComponent(login)}` +
    `&timeout=${encodeURIComponent(step.timeoutParam ?? 360000)}` +
    `&sessionid=${encodeURIComponent(sessionid)}` +
    `&js=${encodeURIComponent(step.js ?? 1)}`;

  ctx.logs.push(
    `[${i}] gotoMenuRouteFromMainUrl ${fromKey} -> action=${action} level=${level}`
  );

  await ctx.page.goto(targetUrl, {
    waitUntil: step.waitUntil || 'domcontentloaded',
    timeout: step.timeoutMs ?? 60000,
  });

  try {
    await ctx.page.waitForLoadState('domcontentloaded', {
      timeout: step.timeoutMs ?? 60000,
    });
  } catch {}

  await new Promise((r) => setTimeout(r, step.waitMs ?? 2000));

  if (step.saveAs) {
    ctx.result.outputs[step.saveAs] = targetUrl;
  }

  return {
    navigated: true,
    fromKey,
    action,
    level,
    url: targetUrl,
    savedAs: step.saveAs || null,
    sessionid,
    login,
  };
}