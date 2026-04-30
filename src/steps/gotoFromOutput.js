function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function runGotoFromOutput(step, ctx, i) {
  const key = step.key;
  if (!key) throw new Error("gotoFromOutput requiere 'key'");

  const rawValue = ctx.result.outputs[key];
  if (!rawValue) {
    throw new Error(`No existe output con key='${key}'`);
  }

  const url = String(rawValue).trim();
  if (!isValidHttpUrl(url)) {
    throw new Error(`El output '${key}' no contiene una URL válida: ${url}`);
  }

  const waitUntil = step.waitUntil || "load";
  const timeout = step.timeoutMs ?? 60000;

  ctx.logs.push(`[${i}] gotoFromOutput ${key} -> ${url}`);
  await ctx.page.goto(url, { waitUntil, timeout });

  return { navigated: true, fromKey: key, url, waitUntil, timeout };
}