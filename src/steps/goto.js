export async function runGoto(step, ctx, i) {
  const gotoUrl = step.urlOverride || ctx.baseUrl;
  const waitUntil = step.waitUntil || "load";
  const timeout = step.timeoutMs ?? 60000;

  ctx.logs.push(`[${i}] goto ${gotoUrl} (waitUntil=${waitUntil}, timeout=${timeout}ms)`);
  await ctx.page.goto(gotoUrl, { waitUntil, timeout });

  return { navigated: true, waitUntil, timeout, url: gotoUrl };
}