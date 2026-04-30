export async function runGotoMedicosFromMainUrl(step, ctx, i) {
  const fromKey = step.fromKey || 'mainUrl';
  const raw = ctx.result.outputs[fromKey];

  if (!raw) {
    throw new Error(`No existe output con key='${fromKey}'`);
  }

  const baseUrl = String(raw).trim();
  let parsed;

  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`El output '${fromKey}' no contiene una URL válida: ${baseUrl}`);
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
    `&action=medicos` +
    `&level=Asistencial--Administrar--Medicos--Administrar` +
    `&login=${encodeURIComponent(login)}` +
    `&timeout=360000` +
    `&sessionid=${encodeURIComponent(sessionid)}` +
    `&js=1`;

  ctx.logs.push(`[${i}] gotoMedicosFromMainUrl ${fromKey} -> ${targetUrl}`);

  await ctx.page.goto(targetUrl, {
    waitUntil: step.waitUntil || 'load',
    timeout: step.timeoutMs ?? 60000,
  });

  if (step.saveAs) {
    ctx.result.outputs[step.saveAs] = targetUrl;
  }

  return {
    navigated: true,
    fromKey,
    sessionid,
    login,
    url: targetUrl,
    savedAs: step.saveAs || null,
  };
}