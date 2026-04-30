export async function runWaitForSelector(step, ctx, i) {
  const selector = step.selector;
  if (!selector) throw new Error("waitForSelector requiere 'selector'");

  const timeoutMs = step.timeoutMs ?? 30000;
  const state = step.state ?? "attached";

  ctx.logs.push(`[${i}] waitForSelector ${selector}`);
  const where = await ctx.helpers.waitForSelectorAny(step, selector, { timeoutMs, state });

  return { ready: selector, state, timeoutMs, ...where };
}