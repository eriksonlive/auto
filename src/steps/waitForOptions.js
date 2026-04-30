export async function runWaitForOptions(step, ctx, i) {
  const selector = step.selector;
  if (!selector) throw new Error("waitForOptions requiere 'selector'");

  const min = step.min ?? 1;
  const timeoutMs = step.timeoutMs ?? 30000;

  ctx.logs.push(`[${i}] waitForOptions ${selector} (min=${min})`);
  const count = await ctx.helpers.waitForOptionsAny(step, selector, { min, timeoutMs });

  ctx.state.lastWaitForOptionsSelector = selector;

  return { selector, options: count, min };
}