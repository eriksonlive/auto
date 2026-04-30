export async function runToggleAllSwitches(step, ctx) {
  const { page, logs } = ctx;

  const containerSelector = step.containerSelector || "[role='dialog']";
  const switchSelector = step.switchSelector || "input[type='checkbox']";
  const timeout = step.timeoutMs ?? 30000;
  const waitMs = step.waitMs ?? 500;

  await page.waitForSelector(containerSelector, {
    state: "visible",
    timeout
  });

  const switches = await page.$$(`${containerSelector} ${switchSelector}`);

  if (!switches.length) {
    throw new Error(`toggleAllSwitches: no se encontraron switches en ${containerSelector}`);
  }

  let toggled = 0;

  for (const sw of switches) {
    const checked = await sw.evaluate(el => el.checked);

    if (!checked) {
      await sw.click({ force: true });
      toggled++;

      if (waitMs > 0) {
        await page.waitForTimeout(waitMs);
      }
    }
  }

  logs?.push(`[toggleAllSwitches] encontrados=${switches.length} activados=${toggled}`);

  return {
    ok: true,
    found: switches.length,
    toggled
  };
}