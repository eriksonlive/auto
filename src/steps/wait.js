export async function runWait(step, ctx, i) {
  ctx.logs.push(`[${i}] wait ${step.ms}ms`);
  return await ctx.helpers.doWait(step);
}