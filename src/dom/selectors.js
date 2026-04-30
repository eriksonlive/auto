import { buildDeepSelector } from "./frame-locator.js";

function resolveState(state) {
  if (state === "visible") return "visible";
  if (state === "hidden") return "hidden";
  if (state === "detached") return "detached";
  return "attached";
}

function buildWhere(step) {
  return {
    where: Array.isArray(step.frameChain) && step.frameChain.length
      ? "frameChain"
      : step.frame
      ? "frame"
      : "main",
    chain: step.frameChain || (step.frame ? [step.frame] : []),
  };
}

export async function waitForSelectorAny(
  page,
  step,
  selector,
  { timeoutMs = 30000, state = "attached" } = {},
) {
  const deepSelector = buildDeepSelector(step, selector);

  const ok = await page.waitForSelector(deepSelector, {
    state: resolveState(state),
    timeout: timeoutMs,
  });

  if (!ok) {
    throw new Error(`waitForSelector no encontró: ${deepSelector}`);
  }

  return {
    ready: selector,
    state,
    timeoutMs,
    deepSelector,
    ...buildWhere(step),
  };
}

export async function fillAny(page, step, selector, value) {
  const deepSelector = buildDeepSelector(step, selector);

  const ok = await page.waitForSelector(deepSelector, {
    state: "visible",
    timeout: step.timeoutMs ?? 30000,
  });

  if (!ok) {
    throw new Error(`fill no encontró visible: ${deepSelector}`);
  }

  const locator = page.deepLocator(deepSelector);
  await locator.fill(String(value ?? ""));
}

export async function clickAny(page, step, selector) {
  const deepSelector = buildDeepSelector(step, selector);

  const ok = await page.waitForSelector(deepSelector, {
    state: "visible",
    timeout: step.timeoutMs ?? 30000,
  });

  if (!ok) {
    throw new Error(`click no encontró visible: ${deepSelector}`);
  }

  const locator = page.deepLocator(deepSelector);
  await locator.click();
}

export async function selectAny(
  page,
  step,
  selector,
  { value, text },
  { timeoutMs = 30000 } = {},
) {
  const deepSelector = buildDeepSelector(step, selector);

  const ok = await page.waitForSelector(deepSelector, {
    state: "visible",
    timeout: timeoutMs,
  });

  if (!ok) {
    throw new Error(`select no encontró visible: ${deepSelector}`);
  }

  const selected = await page.evaluate(({ deepSelector, value, text }) => {
    const parts = deepSelector.split(">>").map((s) => s.trim()).filter(Boolean);

    let root = document;

    for (let i = 0; i < parts.length - 1; i++) {
      const frameEl = root.querySelector(parts[i]);
      if (!frameEl) throw new Error(`No existe iframe/frame: ${parts[i]}`);

      const nextDoc = frameEl.contentDocument;
      if (!nextDoc) throw new Error(`Iframe no accesible o no listo: ${parts[i]}`);

      root = nextDoc;
    }

    const finalSelector = parts[parts.length - 1];
    const select = root.querySelector(finalSelector);
    if (!select) throw new Error(`No existe select: ${finalSelector}`);

    const opts = Array.from(select.options || []);
    let target = null;

    if (value !== undefined && value !== null) {
      target = opts.find((o) => o.value === String(value));
    }

    if (!target && text) {
      const wanted = String(text).trim().toLowerCase();
      target = opts.find(
        (o) => String(o.textContent || "").trim().toLowerCase() === wanted
      );
    }

    if (!target) {
      throw new Error(
        `No se encontró opción en ${finalSelector}. Buscado: ` +
        (value !== undefined ? `value=${value}` : `text=${text}`)
      );
    }

    select.value = target.value;
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));

    return {
      value: target.value,
      text: String(target.textContent || "").trim(),
    };
  }, { deepSelector, value, text });

  return selected;
}

export async function waitForOptionsAny(
  page,
  step,
  selector,
  { min = 1, timeoutMs = 30000 } = {},
) {
  const deepSelector = buildDeepSelector(step, selector);

  const ok = await page.waitForSelector(deepSelector, {
    state: "attached",
    timeout: timeoutMs,
  });

  if (!ok) {
    throw new Error(`waitForOptions no encontró: ${deepSelector}`);
  }

  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const count = await page.evaluate(({ deepSelector }) => {
      const parts = deepSelector.split(">>").map((s) => s.trim()).filter(Boolean);

      let root = document;

      for (let i = 0; i < parts.length - 1; i++) {
        const frameEl = root.querySelector(parts[i]);
        if (!frameEl) return 0;

        const nextDoc = frameEl.contentDocument;
        if (!nextDoc) return 0;

        root = nextDoc;
      }

      const finalSelector = parts[parts.length - 1];
      const el = root.querySelector(finalSelector);
      if (!el || !el.options) return 0;

      return el.options.length;
    }, { deepSelector });

    if (count >= min) return count;
    await new Promise((r) => setTimeout(r, 200));
  }

  throw new Error(`waitForOptions timeout: ${deepSelector} (min=${min})`);
}