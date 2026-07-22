// selectNth: selects an option from the Nth <select> anywhere on page (0-indexed)
export async function runSelectNth(step, ctx, i) {
  const index = step.index ?? 0;
  const value = step.value;
  const text = step.text;
  const timeoutMs = step.timeoutMs ?? 15000;

  if (value === undefined && !text) throw new Error("selectNth requiere 'value' o 'text'");

  ctx.logs.push(`[${i}] selectNth index=${index} ${text ?? value}`);

  const locator = ctx.page.locator('select').nth(index);

  const selectOption = text ? { label: text } : { value: String(value) };
  await locator.selectOption(selectOption, { timeout: timeoutMs });

  return { selectedNth: index, text: text ?? value };
}
