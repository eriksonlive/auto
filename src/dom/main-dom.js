// src/dom/main-dom.js
import { sleep } from "./sleep.js";

export async function waitForSelectorMain(
  page,
  selector,
  { timeoutMs = 30000, state = "attached" } = {},
) {
  const start = Date.now();
  let lastReason = null;

  while (Date.now() - start < timeoutMs) {
    const res = await page.evaluate(({ sel, st }) => {
      try {
        const el = document.querySelector(sel);
        if (!el) return { ok: false, reason: "missing" };
        if (st === "attached") return { ok: true, reason: null };

        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const visible =
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0;

        return { ok: visible, reason: visible ? null : "not visible" };
      } catch (e) {
        return { ok: false, reason: String(e?.message || e) };
      }
    }, { sel: selector, st: state });

    if (res?.ok) return true;
    lastReason = res?.reason || null;
    await sleep(200);
  }

  throw new Error(
    `waitForSelector timeout (${state}): ${selector}. Último: ${lastReason || "sin detalle"}`
  );
}

export async function fillMain(page, selector, value) {
  await page.evaluate(({ sel, val }) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("No existe selector: " + sel);

    el.focus();
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));

    el.value = String(val ?? "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, { sel: selector, val: value });
}

export async function clickMain(page, selector) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("No existe selector: " + sel);
    el.click();
  }, selector);
}