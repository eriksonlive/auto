export async function runDebugDom(step, ctx, i) {
  const key = step.saveAs || `debug_${i}`;
  ctx.logs.push(`[${i}] debugDom -> ${key}`);
  await ctx.helpers.debugDom(key);
  return { savedAs: key };
}