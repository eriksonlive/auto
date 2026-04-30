import { buildFrameLocator } from "../dom/frame-locator.js";

export async function runFillLocator(step, ctx, i) {
  const selector = step.selector;
  const value = step.value;

  if (!selector) throw new Error("fillLocator requiere 'selector'");
  if (value === undefined) throw new Error("fillLocator requiere 'value'");

  ctx.logs.push(`[${i}] fillLocator ${selector}`);

  const root = buildFrameLocator(ctx.page, step);
  await root.locator(selector).fill(String(value), {
    timeout: step.timeoutMs ?? 30000,
  });

  return { filled: selector, mode: "locator" };
}