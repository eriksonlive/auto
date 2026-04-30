export async function runSelectAutocompleteFirstOption(step, ctx) {
  const { page, logs } = ctx;

  const inputSelector = step.inputSelector;
  const searchText = step.searchText ?? "";
  const optionSelector = step.optionSelector || "body .MuiAutocomplete-popper [role='option']";
  const timeout = step.timeoutMs ?? 30000;
  const waitMs = step.waitMs ?? 800;

  if (!inputSelector) {
    throw new Error('selectAutocompleteFirstOption: falta "inputSelector"');
  }

  await page.waitForSelector(inputSelector, {
    state: "visible",
    timeout
  });

  const input = await page.$(inputSelector);
  if (!input) {
    throw new Error(`selectAutocompleteFirstOption: no se encontró el input ${inputSelector}`);
  }

  await input.click();
  await input.fill("");

  if (searchText) {
    await input.type(searchText, { delay: 80 });
  }

  await page.waitForSelector(optionSelector, {
    state: "visible",
    timeout
  });

  const options = await page.$$(optionSelector);
  if (!options.length) {
    throw new Error(`selectAutocompleteFirstOption: no se encontraron opciones con ${optionSelector}`);
  }

  const firstOption = options[0];
  const optionText = ((await firstOption.textContent()) || "").trim();

  await firstOption.click();

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  logs?.push(
    `[selectAutocompleteFirstOption] input=${inputSelector} search="${searchText}" selected="${optionText}"`
  );

  return {
    ok: true,
    selectedText: optionText
  };
}