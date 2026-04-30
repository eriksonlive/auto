export async function runSelectMuiOptionByText(step, ctx, i) {
  const triggerSelector = step.triggerSelector;
  const optionText = step.optionText;
  const timeoutMs = step.timeoutMs ?? 30000;
  const valueInputSelector = step.valueInputSelector ?? null;
  const expectedValue = step.expectedValue ?? null;
  const waitAfterOpenMs = step.waitAfterOpenMs ?? 400;
  const waitAfterSelectMs = step.waitAfterSelectMs ?? 700;

  if (!triggerSelector) {
    throw new Error("selectMuiOptionByText requiere 'triggerSelector'");
  }

  if (!optionText) {
    throw new Error("selectMuiOptionByText requiere 'optionText'");
  }

  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  ctx.logs.push(
    `[${i}] selectMuiOptionByText triggerSelector="${triggerSelector}" optionText="${optionText}"`
  );

  await ctx.page.waitForSelector(triggerSelector, { timeout: timeoutMs });
  await ctx.page.click(triggerSelector);

  ctx.logs.push(`[${i}] click en trigger realizado`);

  if (waitAfterOpenMs > 0) {
    await new Promise((r) => setTimeout(r, waitAfterOpenMs));
  }

  await ctx.page.waitForSelector('ul[role="listbox"]', { timeout: timeoutMs });

  ctx.logs.push(`[${i}] listbox visible detectado`);

  const wanted = normalize(optionText);
  const start = Date.now();
  let found = false;
  let seenOptions = [];

  while (Date.now() - start < timeoutMs) {
    const handles = await ctx.page.$$('ul[role="listbox"] li[role="option"]');
    seenOptions = [];

    for (const handle of handles) {
      const rawText = await handle.evaluate((el) => (el.textContent || "").trim());
      const normalized = normalize(rawText);

      if (rawText) {
        seenOptions.push(rawText);
      }

      if (normalized && normalized.includes(wanted)) {
        await handle.click();
        found = true;
        break;
      }
    }

    if (found) {
      break;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  ctx.logs.push(
    `[${i}] opciones vistas: ${JSON.stringify(seenOptions)}`
  );

  if (!found) {
    throw new Error(
      `No se encontró opción MUI con texto "${optionText}". Opciones vistas: ${JSON.stringify(seenOptions)}`
    );
  }

  if (valueInputSelector) {
    const waitStart = Date.now();
    let applied = false;

    while (Date.now() - waitStart < timeoutMs) {
      const currentValue = await ctx.page
        .$eval(valueInputSelector, (el) => el.value)
        .catch(() => null);

      ctx.logs.push(
        `[${i}] valor actual de ${valueInputSelector}: ${JSON.stringify(currentValue)}`
      );

      if (expectedValue != null) {
        if (String(currentValue) === String(expectedValue)) {
          applied = true;
          break;
        }
      } else if (currentValue != null && String(currentValue).trim() !== "") {
        applied = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    if (!applied) {
      throw new Error(
        `Se hizo click en "${optionText}" pero no cambió el valor de "${valueInputSelector}"`
      );
    }
  } else {
    if (waitAfterSelectMs > 0) {
      await new Promise((r) => setTimeout(r, waitAfterSelectMs));
    }
  }

  return {
    selected: true,
    triggerSelector,
    optionText,
    seenOptions
  };
}