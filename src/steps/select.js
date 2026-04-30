export async function runSelect(step, ctx, i) {
  const selector = step.selector;
  const value = step.value;
  const text = step.text;

  if (!selector) throw new Error("select requiere 'selector'");
  if (value === undefined && !text) {
    throw new Error("select requiere 'value' o 'text'");
  }

  if (
    ctx.state.lastWaitForOptionsSelector &&
    ctx.state.lastWaitForOptionsSelector !== selector
  ) {
    ctx.logs.push(
      `[${i}] WARN: el último waitForOptions fue para '${ctx.state.lastWaitForOptionsSelector}', pero ahora haces select sobre '${selector}'`
    );
  }

  ctx.logs.push(
    `[${i}] select ${selector} ${value !== undefined ? `value=${value}` : `text=${text}`}`
  );

  await ctx.helpers.selectAny(
    step,
    selector,
    { value, text },
    {
      timeoutMs: step.timeoutMs ?? 30000,
      state: step.state ?? "attached",
    },
  );

  ctx.state.lastWaitForOptionsSelector = null;

  return { selected: selector };
}