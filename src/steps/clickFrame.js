/**
 * clickFrame: clicks a link in a frameset <frame> using frame.evaluate().
 * If evaluate throws StagehandEvalError after the click (context destroyed by navigation),
 * we treat it as a successful click.
 *
 * Options:
 *   frameIndex: 0-based index in page.frames()
 *   linkText:   partial text of an <a> to find and click
 *   selector:   CSS selector (if no linkText)
 */
export async function runClickFrame(step, ctx, i) {
  const { frameIndex, linkText, selector } = step;
  const timeoutMs = step.timeoutMs ?? 30000;

  if (frameIndex === undefined) throw new Error("clickFrame requiere 'frameIndex'");
  if (!linkText && !selector) throw new Error("clickFrame requiere 'linkText' o 'selector'");

  ctx.logs.push(`[${i}] clickFrame frameIndex=${frameIndex} ${linkText ? 'text:' + linkText : selector}`);

  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    const frames = ctx.page.frames();
    const frame = frames[frameIndex];

    if (!frame) {
      lastError = new Error(`No hay frame en indice ${frameIndex}. Total: ${frames.length}`);
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    try {
      await frame.evaluate(({ linkText, selector }) => {
        let el;
        if (linkText) {
          el = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim().includes(linkText));
          if (!el) throw new Error('Link no encontrado:  + linkText + . Links: ' + Array.from(document.querySelectorAll('a')).slice(0,15).map(a=>a.textContent.trim()).join(' | '));
        } else {
          el = document.querySelector(selector);
          if (!el) throw new Error('No encontrado: ' + selector);
        }
        el.click();
      }, { linkText, selector });

      return { frameIndex, clicked: linkText ?? selector };
    } catch (e) {
      const msg = e.message || '';
      // Context destroyed by navigation = click worked
      if (msg.includes('StagehandEvalError') || msg.includes('context') || msg.includes('Target closed') || msg.includes('detached')) {
        ctx.logs.push(`[${i}] click OK (contexto destruido por navegacion)`);
        return { frameIndex, clicked: linkText ?? selector, note: 'context-destroyed' };
      }
      lastError = e;
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw new Error(`clickFrame timeout (${timeoutMs}ms): ${lastError?.message}`);
}
