export async function runSelectAutocompleteOption(step, ctx) {
  const { page, logs } = ctx;
  const outputs = ctx.outputs || {};

  const {
    inputSelector,
    searchText,
    optionText,
    optionSelector = "body .MuiAutocomplete-popper [role='option']",
    match = "includes",
    timeoutMs = 30000,
    waitMs = 1200,
    saveAs
  } = step;

  if (!inputSelector) {
    throw new Error('selectAutocompleteOption: falta "inputSelector"');
  }

  if (!searchText && !optionText) {
    throw new Error('selectAutocompleteOption: falta "searchText" u "optionText"');
  }

  const textToSearch = String(searchText || optionText || "").replace(/\s+/g, " ").trim();
  const expected = String(optionText || searchText || "").replace(/\s+/g, " ").trim().toLowerCase();

  logs?.push(`[selectAutocompleteOption] esperando input: ${inputSelector}`);
  await page.waitForSelector(inputSelector, { timeout: timeoutMs });

  logs?.push(`[selectAutocompleteOption] seteando valor react-friendly: ${textToSearch}`);
  await page.evaluate(
    ({ selector, value }) => {
      const input = document.querySelector(selector);
      if (!input) {
        throw new Error(`No se encontró el input: ${selector}`);
      }

      input.focus();

      const proto = Object.getPrototypeOf(input);
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      const setValue = descriptor && descriptor.set;

      if (!setValue) {
        throw new Error("No se encontró el setter nativo del input");
      }

      setValue.call(input, "");
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "" }));

      setValue.call(input, value);
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
      input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "ArrowDown" }));
    },
    { selector: inputSelector, value: textToSearch }
  );

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  let optionsVisible = false;

  try {
    logs?.push(`[selectAutocompleteOption] esperando opciones globales: ${optionSelector}`);
    await page.waitForSelector(optionSelector, { timeout: 4000 });
    optionsVisible = true;
  } catch (_) {
    logs?.push("[selectAutocompleteOption] no abrió con input event, intento fallback con teclado");
  }

  if (!optionsVisible) {
    await page.focus(inputSelector);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(500);

    try {
      await page.waitForSelector(optionSelector, { timeout: 4000 });
      optionsVisible = true;
    } catch (_) {}
  }

  if (!optionsVisible) {
    throw new Error(
      `selectAutocompleteOption: el autocomplete no mostró opciones para "${textToSearch}".`
    );
  }

  const options = page.locator(optionSelector);
  const count = await options.count();

  logs?.push(`[selectAutocompleteOption] opciones encontradas: ${count}`);

  if (!count) {
    throw new Error(`selectAutocompleteOption: no se encontraron opciones para "${textToSearch}"`);
  }

  for (let i = 0; i < count; i++) {
    const option = options.nth(i);
    const rawText = await option.textContent();
    const text = String(rawText || "").replace(/\s+/g, " ").trim();
    const normalized = text.toLowerCase();

    logs?.push(`[selectAutocompleteOption] opción[${i}]: ${text}`);

    const isMatch =
      match === "exact"
        ? normalized === expected
        : normalized.includes(expected);

    if (isMatch) {
      logs?.push(`[selectAutocompleteOption] seleccionando opción[${i}]: ${text}`);
      await option.click();

      if (saveAs) {
        outputs[saveAs] = text;
        ctx.outputs = outputs;
      }

      return {
        ok: true,
        selectedText: text
      };
    }
  }

  const available = [];
  for (let i = 0; i < Math.min(count, 10); i++) {
    const txt = await options.nth(i).textContent();
    if (txt) available.push(String(txt).replace(/\s+/g, " ").trim());
  }

  throw new Error(
    `selectAutocompleteOption: no encontré "${optionText || searchText}". Opciones: ${available.join(" | ")}`
  );
}