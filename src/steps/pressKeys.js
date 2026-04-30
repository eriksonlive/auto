export async function runPressKeys(step, ctx) {
  const { page, logs } = ctx;

  const keys = Array.isArray(step.keys) ? step.keys : [];
  const waitMs = step.waitMs ?? 0;

  if (!keys.length) {
    throw new Error('pressKeys: falta "keys" o viene vacío');
  }

  if (!page.keyboard || typeof page.keyboard.press !== 'function') {
    throw new Error('pressKeys: page.keyboard.press no está disponible en este entorno');
  }

  for (const key of keys) {
    await page.keyboard.press(key);

    if (waitMs > 0) {
      await page.waitForTimeout(waitMs);
    }
  }

  if (logs) {
    logs.push(`[pressKeys] keys=${keys.join(',')}`);
  }

  return {
    ok: true,
    keys
  };
}