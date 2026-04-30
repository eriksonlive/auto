import { buildFrameLocator } from "../dom/frame-locator.js";

export async function runClickLocator(step, ctx, i) {
  const selector = step.selector;
  if (!selector) throw new Error("clickLocator requiere 'selector'");

  ctx.logs.push(`[${i}] clickLocator ${selector}`);

  const root = buildFrameLocator(ctx.page, step);
  await root.locator(selector).click({ timeout: step.timeoutMs ?? 30000 });

  return { clicked: selector, mode: "locator" };
}