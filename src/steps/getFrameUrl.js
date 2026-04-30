function isUsableUrl(value) {
  const url = String(value || '').trim();
  if (!url) return false;
  if (url === 'about:blank') return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function runGetFrameUrl(step, ctx, i) {
  const key = step.saveAs || `frameUrl_${i}`;
  const timeoutMs = step.timeoutMs ?? 30000;
  const frameName = step.frameName || null;

  ctx.logs.push(
    `[${i}] getFrameUrl -> ${key} (${step.frame || JSON.stringify(step.frameChain || [])}${frameName ? ` -> ${frameName}` : ''})`
  );

  const start = Date.now();
  let foundUrl = null;
  let lastSeenUrl = null;

  while (Date.now() - start < timeoutMs) {
    // Estrategia 1: frames reales expuestos por la página
    try {
      if (frameName) {
        const frames = await ctx.page.frames();

        for (const frame of frames) {
          let name = null;
          let url = null;

          try {
            name = typeof frame.name === 'function' ? frame.name() : frame.name;
          } catch {}

          try {
            url = typeof frame.url === 'function' ? frame.url() : frame.url;
          } catch {}

          if (name === frameName) {
            lastSeenUrl = url || null;

            if (isUsableUrl(url)) {
              foundUrl = url;
              break;
            }
          }
        }
      }
    } catch {}

    if (foundUrl) break;

    // Estrategia 2: buscar el frame/iframe en el DOM del documento padre
    try {
      const domResolvedUrl = await ctx.page.evaluate(({ parentSelector, wantedFrameName }) => {
        function resolveUrl(maybeUrl, base) {
          try {
            return new URL(maybeUrl, base).toString();
          } catch {
            return null;
          }
        }

        let rootDoc = document;

        // Si viene step.frame, primero entrar a ese iframe padre
        if (parentSelector) {
          const parentFrameEl = document.querySelector(parentSelector);
          if (!parentFrameEl) return null;

          const nextDoc = parentFrameEl.contentDocument;
          if (!nextDoc) return null;

          rootDoc = nextDoc;
        }

        if (!wantedFrameName) return null;

        const frameEl =
          rootDoc.querySelector(`frame[name="${wantedFrameName}"]`) ||
          rootDoc.querySelector(`iframe[name="${wantedFrameName}"]`) ||
          rootDoc.getElementById(wantedFrameName);

        if (!frameEl) return null;

        // 1) intentar location real del child
        try {
          const href = frameEl.contentWindow?.location?.href;
          if (href && href !== 'about:blank') return href;
        } catch {}

        // 2) fallback: usar src
        const rawSrc = frameEl.getAttribute('src') || '';
        if (!rawSrc || rawSrc === 'about:blank') return null;

        return resolveUrl(rawSrc, rootDoc.baseURI || document.baseURI || location.href);
      }, {
        parentSelector: step.frame || null,
        wantedFrameName: frameName,
      });

      if (domResolvedUrl) {
        lastSeenUrl = domResolvedUrl;
        if (isUsableUrl(domResolvedUrl)) {
          foundUrl = domResolvedUrl;
          break;
        }
      }
    } catch {}

    // Estrategia 3: fallback al helper general si no hay frameName
    if (!foundUrl && !frameName) {
      try {
        const helperUrl = await ctx.helpers.getFrameUrl(step);
        lastSeenUrl = helperUrl || null;

        if (isUsableUrl(helperUrl)) {
          foundUrl = helperUrl;
          break;
        }
      } catch {}
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  if (!foundUrl) {
    throw new Error(
      `No se pudo resolver una URL válida del frame${frameName ? ` '${frameName}'` : ''} en ${timeoutMs}ms. Última URL vista: ${lastSeenUrl || 'ninguna'}`
    );
  }

  ctx.result.outputs[key] = foundUrl;

  return {
    savedAs: key,
    value: foundUrl,
    frame: step.frame || null,
    frameChain: step.frameChain || null,
    frameName,
  };
}