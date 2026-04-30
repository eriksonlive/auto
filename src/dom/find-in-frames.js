export async function findLinkInAnyFrame(page, options = {}) {
  const {
    hrefIncludes,
    textIncludes,
    target,
    exactHref,
  } = options;

  const frames = await page.frames();

  for (const frame of frames) {
    try {
      const match = await frame.evaluate(
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

          if (!found) return null;

          return {
            href: found.getAttribute('href') || '',
            text: (found.textContent || '').trim(),
            target: found.getAttribute('target') || '',
          };
        },
        { hrefIncludes, textIncludes, target, exactHref },
      );

      if (match) {
        return {
          frame,
          match,
        };
      }
    } catch {
      // ignorar frames inaccesibles
    }
  }

  return null;
}