export async function runFill(step, ctx, i) {
  const selector = step.selector;
  const value = step.value;

  if (!selector) throw new Error("fill requiere 'selector'");
  if (value === undefined) throw new Error("fill requiere 'value'");

  ctx.logs.push(`[${i}] fill ${selector}`);
  await ctx.helpers.waitForSelectorAny(step, selector, {
    timeoutMs: step.timeoutMs ?? 30000,
    state: "attached",
  });

  await ctx.helpers.fillAny(step, selector, value);
  return { filled: selector };
}