export async function runMenuPathAnyFrame(step, ctx, i) {
  const labels = Array.isArray(step.labels) ? step.labels : [];
  if (!labels.length || labels.length < 2) {
    throw new Error("menuPathAnyFrame requiere 'labels' con al menos 2 niveles");
  }

  ctx.logs.push(`[${i}] menuPathAnyFrame ${labels.join(' > ')}`);

  const frames = await ctx.page.frames();
  let foundFrame = null;

  // Buscar el frame que contenga al menos el primer label
  for (const frame of frames) {
    try {
      const hasFirst = await frame.evaluate((label) => {
        const text = document.body ? document.body.innerText || '' : '';
        return text.toLowerCase().includes(String(label).toLowerCase());
      }, labels[0]);

      if (hasFirst) {
        foundFrame = frame;
        break;
      }
    } catch {}
  }

  if (!foundFrame) {
    throw new Error(`No se encontró ningún frame con el menú '${labels[0]}'`);
  }

  // Hover sobre cada nivel menos el último
  for (let idx = 0; idx < labels.length - 1; idx++) {
    const label = labels[idx];

    const hovered = await foundFrame.evaluate((textToFind) => {
      const candidates = Array.from(
        document.querySelectorAll('a, span, li, div, td')
      );

      const el = candidates.find((node) => {
        const txt = (node.textContent || '').trim().toLowerCase();
        return txt === String(textToFind).trim().toLowerCase();
      });

      if (!el) return false;

      el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      return true;
    }, label);

    if (!hovered) {
      throw new Error(`No se pudo hacer hover sobre '${label}'`);
    }

    await new Promise((r) => setTimeout(r, step.hoverWaitMs ?? 500));
  }

  // Click en el último nivel
  const lastLabel = labels[labels.length - 1];

  const clicked = await foundFrame.evaluate((textToFind) => {
    const candidates = Array.from(
      document.querySelectorAll('a, span, li, div, td')
    );

    const el = candidates.find((node) => {
      const txt = (node.textContent || '').trim().toLowerCase();
      return txt === String(textToFind).trim().toLowerCase();
    });

    if (!el) return false;

    // Si el click cae sobre span, intenta subir al anchor
    const clickable = el.closest('a, li') || el;
    clickable.click();
    return true;
  }, lastLabel);

  if (!clicked) {
    throw new Error(`No se pudo hacer click sobre '${lastLabel}'`);
  }

  return {
    path: labels,
    clicked: lastLabel,
  };
}