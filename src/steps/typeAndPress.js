export async function runTypeAndPress(step, ctx) {
  const { page, logs } = ctx;

  const selector = step.selector;
  const value = step.value ?? '';
  const keys = Array.isArray(step.keys) ? step.keys : [];
  const timeoutMs = step.timeoutMs ?? 30000;
  const delayMs = step.delayMs ?? 40;
  const waitAfterTypeMs = step.waitAfterTypeMs ?? 800;
  const clickFirst = step.clickFirst ?? true;
  const clearFirst = step.clearFirst ?? true;

  if (!selector) {
    throw new Error('typeAndPress: falta "selector"');
  }

  if (typeof page.waitForSelector !== 'function') {
    throw new Error('typeAndPress: page.waitForSelector no está disponible');
  }

  await page.waitForSelector(selector, { timeout: timeoutMs });

  if (clickFirst) {
    await page.click(selector, { timeout: timeoutMs });
  }

  if (clearFirst) {
    try {
      await page.fill(selector, '', { timeout: timeoutMs });
    } catch {}
  }

  if (value) {
    if (typeof page.type === 'function') {
      await page.type(selector, value, { delay: delayMs });
    } else {
      await page.focus(selector);
      for (const ch of String(value)) {
        await page.keyboard.press(ch);
      }
    }
  }

  if (waitAfterTypeMs > 0) {
    await page.waitForTimeout(waitAfterTypeMs);
  }

  for (const key of keys) {
    await page.keyboard.press(key);
  }

  if (logs) {
    logs.push(
      `[typeAndPress] selector=${selector} value="${value}" keys=${keys.join(',')}`
    );
  }

  return {
    ok: true,
    selector,
    value,
    keys
  };
}