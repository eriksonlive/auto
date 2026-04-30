import { findLinkInAnyFrame } from '../dom/find-in-frames.js';

export async function runMenuClickAnyFrame(step, ctx, i) {
  const hrefIncludes = step.hrefIncludes || null;
  const textIncludes = step.textIncludes || null;
  const target = step.target || null;
  const exactHref = step.exactHref || null;
  const navigateDirect = step.navigateDirect ?? false;
  const saveAs = step.saveAs || null;

  if (!hrefIncludes && !textIncludes && !exactHref) {
    throw new Error(
      "menuClickAnyFrame requiere 'hrefIncludes', 'textIncludes' o 'exactHref'",
    );
  }

  ctx.logs.push(
    `[${i}] menuClickAnyFrame hrefIncludes=${hrefIncludes || '-'} textIncludes=${textIncludes || '-'} target=${target || '-'} navigateDirect=${navigateDirect}`,
  );

  const found = await findLinkInAnyFrame(ctx.page, {
    hrefIncludes,
    textIncludes,
    target,
    exactHref,
  });

  if (!found) {
    throw new Error('No se encontró el link del menú en ningún frame');
  }

  const { frame, match } = found;

  if (saveAs) {
    ctx.result.outputs[saveAs] = match.href;
  }

  if (navigateDirect) {
    await ctx.page.goto(match.href, {
      waitUntil: step.waitUntil || 'load',
      timeout: step.timeoutMs ?? 60000,
    });

    return {
      mode: 'goto',
      href: match.href,
      text: match.text,
      target: match.target,
      savedAs: saveAs || null,
    };
  }

  const clicked = await frame.evaluate(
    ({ hrefIncludes, textIncludes, target, exactHref }) => {
      const anchors = Array.from(document.querySelectorAll('a'));

      const found = anchors.find((a) => {
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim();
        const tgt = a.getAttribute('target') || '';

        const hrefOk = exactHref
          ? href === exactHref
          : hrefIncludes
          ? href.includes(hrefIncludes)
          : true;

        const textOk = textIncludes
          ? text.toLowerCase().includes(String(textIncludes).toLowerCase())
          : true;

        const targetOk = target ? tgt === target : true;

        return hrefOk && textOk && targetOk;
      });

      if (!found) return false;

      found.click();
      return true;
    },
    { hrefIncludes, textIncludes, target, exactHref },
  );

  if (!clicked) {
    throw new Error('Se encontró el link, pero no se pudo hacer click');
  }

  return {
    mode: 'click',
    href: match.href,
    text: match.text,
    target: match.target,
    savedAs: saveAs || null,
  };
}