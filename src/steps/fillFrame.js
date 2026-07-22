/**
 * fillFrame: fills an input by name/id inside a specific frame.
 * Options:
 *   frameIndex: index in page.frames()
 *   name: input name attribute
 *   id:   input id attribute (if no name)
 *   value: value to set
 *   trigger: whether to dispatch change/input events (default true)
 */
export async function runFillFrame(step, ctx, i) {
  const { frameIndex, name, id, value } = step;
  const trigger = step.trigger !== false;
  const timeoutMs = step.timeoutMs ?? 15000;

  if (frameIndex === undefined) throw new Error("fillFrame requiere 'frameIndex'");
  if (!name && !id) throw new Error("fillFrame requiere 'name' o 'id'");
  if (value === undefined) throw new Error("fillFrame requiere 'value'");

  ctx.logs.push(`[${i}] fillFrame[${frameIndex}] ${name || id} = ${String(value).substring(0,50)}`);

  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    const frames = ctx.page.frames();
    const frame = frames[frameIndex];
    if (!frame) { lastError = new Error('No frame ' + frameIndex); await new Promise(r=>setTimeout(r,300)); continue; }

    try {
      await frame.evaluate(({ name, id, value, trigger }) => {
        const el = name ? document.querySelector('[name="' + name + '"]') : document.getElementById(id);
        if (!el) throw new Error('Input no encontrado: ' + (name||id));

        el.value = String(value);
        if (trigger) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
      }, { name, id, value: String(value), trigger });

      return { filledFrame: frameIndex, field: name || id, value };
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  throw new Error(`fillFrame timeout: ${lastError?.message}`);
}
