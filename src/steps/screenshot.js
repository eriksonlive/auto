export async function runScreenshot(step, ctx, i) {
  ctx.logs.push(`[${i}] screenshot ${step.name || ""}`);
  return await ctx.helpers.doScreenshot(step);
}