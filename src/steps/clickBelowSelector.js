export async function runClickBelowSelector(step, ctx) {
  const { page, logs } = ctx;

  const selector = step.selector;
  const offsetX = step.offsetX ?? 20;
  const offsetY = step.offsetY ?? 28;
  const timeoutMs = step.timeoutMs ?? 30000;

  if (!selector) {
    throw new Error('clickBelowSelector: falta "selector"');
  }

  if (typeof page.waitForSelector !== 'function') {
    throw new Error('clickBelowSelector: page.waitForSelector no está disponible');
  }

  await page.waitForSelector(selector, { timeout: timeoutMs });

  const handle = await page.$(selector);
  if (!handle) {
    throw new Error(`clickBelowSelector: no se encontró "${selector}"`);
  }

  const box = await handle.boundingBox();
  if (!box) {
    throw new Error(`clickBelowSelector: no se pudo obtener boundingBox de "${selector}"`);
  }

  const x = box.x + offsetX;
  const y = box.y + box.height + offsetY;

  if (!page.mouse || typeof page.mouse.click !== 'function') {
    throw new Error('clickBelowSelector: page.mouse.click no está disponible');
  }

  await page.mouse.click(x, y);

  if (logs) {
    logs.push(
      `[clickBelowSelector] selector=${selector} x=${x} y=${y} offsetX=${offsetX} offsetY=${offsetY}`
    );
  }

  return {
    ok: true,
    selector,
    x,
    y,
    offsetX,
    offsetY
  };
}