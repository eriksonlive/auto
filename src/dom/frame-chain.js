// src/dom/frame-chain.js
import { sleep } from "./sleep.js";

export function normalizeFrameTarget(step) {
  const frameChain = Array.isArray(step.frameChain) && step.frameChain.length
    ? step.frameChain
    : step.frame
    ? [step.frame]
    : [];

  return {
    kind: frameChain.length ? "chain" : "none",
    chain: frameChain,
    frameName: step.frameName || null,
  };
}

export async function waitForFrameChainReady(page, frameChain, timeoutMs = 30000) {
  const start = Date.now();
  let lastErr = null;

  while (Date.now() - start < timeoutMs) {
    const res = await page.evaluate(({ chain }) => {
      try {
        let doc = document;

        for (const sel of chain) {
          const iframe = doc.querySelector(sel);
          if (!iframe) return { ok: false, reason: `iframe not found: ${sel}` };

          const nextDoc = iframe.contentDocument;
          if (!nextDoc) return { ok: false, reason: `contentDocument not ready: ${sel}` };

          doc = nextDoc;
        }

        return { ok: true, reason: null };
      } catch (e) {
        return { ok: false, reason: String(e?.message || e) };
      }
    }, { chain: frameChain });

    if (res?.ok) return true;
    lastErr = res?.reason || null;
    await sleep(150);
  }

  throw new Error(
    `frameChain no listo (${timeoutMs}ms). Último: ${lastErr || "sin detalle"}`
  );
}

export async function evalInFrameChain(page, frameChain, fn, args) {
  return await page.evaluate(({ chain, fnBody, args }) => {
    function getDocFromChain(chain) {
      let doc = document;
      for (const sel of chain) {
        const iframe = doc.querySelector(sel);
        if (!iframe) throw new Error("No existe iframe en chain: " + sel);
        const nextDoc = iframe.contentDocument;
        if (!nextDoc) throw new Error("contentDocument no listo/cross-origin en: " + sel);
        doc = nextDoc;
      }
      return doc;
    }

    const doc = getDocFromChain(chain);
    const f = new Function("doc", "args", fnBody);
    return f(doc, args);
  }, { chain: frameChain, fnBody: String(fn), args });
}

export async function getFrameDocUrl(page, frameChain, frameName = null) {
  return await page.evaluate(({ chain, wantedFrameName }) => {
    let doc = document;

    for (const sel of chain) {
      const iframe = doc.querySelector(sel);
      if (!iframe) throw new Error("No existe iframe: " + sel);

      const nextDoc = iframe.contentDocument;
      if (!nextDoc) throw new Error("contentDocument no listo/cross-origin en: " + sel);

      doc = nextDoc;
    }

    if (wantedFrameName) {
      const childFrames = Array.from(doc.querySelectorAll("iframe, frame"));
      const found = childFrames.find((el) => {
        return (
          el.getAttribute("name") === wantedFrameName ||
          el.name === wantedFrameName ||
          el.id === wantedFrameName
        );
      });

      if (!found) {
        throw new Error(`No se encontró frame hijo con name/id='${wantedFrameName}'`);
      }

      const foundDoc = found.contentDocument;
      if (!foundDoc) {
        throw new Error(`El frame '${wantedFrameName}' no está listo o es cross-origin`);
      }

      return foundDoc.location.href;
    }

    return doc.location.href;
  }, { chain: frameChain, wantedFrameName: frameName });
}