export async function runSelectAutocompleteFirstOptionByLabel(step, ctx) {
  const { page, logs } = ctx;

  const containerSelector = step.containerSelector || "body";
  const labelText = step.labelText;
  const searchText = step.searchText ?? "";
  const optionSelector = step.optionSelector || "body .MuiAutocomplete-popper [role='option']";
  const timeout = step.timeoutMs ?? 30000;
  const waitMs = step.waitMs ?? 800;

  if (!labelText) {
    throw new Error('selectAutocompleteFirstOptionByLabel: falta "labelText"');
  }

  await page.waitForSelector(containerSelector, { state: "visible", timeout });

  const inputHandle = await page.evaluateHandle(
    ({ containerSelector, labelText }) => {
      const container = document.querySelector(containerSelector);
      if (!container) return null;

      const labels = Array.from(container.querySelectorAll("label"));
      const label = labels.find(l => (l.textContent || "").trim().toLowerCase() === labelText.trim().toLowerCase());
      if (!label) return null;

      const forId = label.getAttribute("for");
      if (forId) {
        return document.getElementById(forId);
      }

      const wrapper = label.parentElement?.parentElement;
      return wrapper ? wrapper.querySelector("input") : null;
    },
    { containerSelector, labelText }
  );

  const input = inputHandle.asElement();
  if (!input) {
    throw new Error(`selectAutocompleteFirstOptionByLabel: no se encontró input para label "${labelText}"`);
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
    throw new Error(`selectAutocompleteFirstOptionByLabel: no se encontraron opciones con ${optionSelector}`);
  }

  const firstOption = options[0];
  const optionText = ((await firstOption.textContent()) || "").trim();

  await firstOption.click();

  if (waitMs > 0) {
    await page.waitForTimeout(waitMs);
  }

  logs?.push(
    `[selectAutocompleteFirstOptionByLabel] label="${labelText}" search="${searchText}" selected="${optionText}"`
  );

  return {
    ok: true,
    selectedText: optionText
  };
}