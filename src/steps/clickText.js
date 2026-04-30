export async function clickText(step, ctx) {
  const { page, logs } = ctx;

  if (!step || typeof step !== 'object') {
    throw new Error('clickText: step no recibido o inválido');
  }

  const text = step.text;
  const exact = step.exact ?? false;
  const timeoutMs = step.timeoutMs ?? 30000;
  const index = step.index ?? 0;

  if (!text || !String(text).trim()) {
    throw new Error(`clickText: falta "text". Step recibido: ${JSON.stringify(step)}`);
  }

  const escaped = String(text).replace(/"/g, '\\"');

  let selector;
  if (exact) {
    selector = `text="${escaped}"`;
  } else {
    selector = `text=${escaped}`;
  }

  try {
    if (typeof page.waitForSelector === 'function') {
      await page.waitForSelector(selector, { timeout: timeoutMs });
    }

    if (index > 0) {
      const matches = await page.$$(selector);
      if (!matches || matches.length <= index) {
        throw new Error(
          `clickText: se encontraron ${matches ? matches.length : 0} coincidencias para "${text}", pero se pidió index=${index}`
        );
      }
      await matches[index].click({ timeout: timeoutMs });
    } else {
      await page.click(selector, { timeout: timeoutMs });
    }
  } catch (e) {
    throw new Error(`clickText: no se pudo hacer click sobre texto "${text}": ${String(e?.message || e)}`);
  }

  if (logs) {
    logs.push(`[clickText] click OK sobre text="${text}" exact=${exact} index=${index}`);
  }

  return {
    ok: true,
    text,
    exact,
    index
  };
}