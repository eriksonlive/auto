export async function runClick(step, ctx, i) {
  const selector = step.selector;
  if (!selector) throw new Error("click requiere 'selector'");

  ctx.logs.push(`[${i}] click ${selector}`);
  await ctx.helpers.waitForSelectorAny(step, selector, {
    timeoutMs: step.timeoutMs ?? 30000,
    state: "attached",
  });

  await ctx.helpers.clickAny(step, selector);
  return { clicked: selector };
}