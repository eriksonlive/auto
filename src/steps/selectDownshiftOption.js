export async function runSelectDownshiftOption(step, ctx) {
  const { page, logs } = ctx;

  const inputSelector = step.inputSelector;
  const value = step.value ?? '';
  const optionText = step.optionText ?? value;
  const dialogSelector = step.dialogSelector ?? '[role="dialog"]';
  const timeoutMs = step.timeoutMs ?? 30000;
  const waitAfterTypeMs = step.waitAfterTypeMs ?? 1200;
  const partial = step.partial ?? true;

  if (!inputSelector) {
    throw new Error('selectDownshiftOption: falta "inputSelector"');
  }

  if (!value) {
    throw new Error('selectDownshiftOption: falta "value"');
  }

  if (typeof page.waitForSelector !== 'function') {
    throw new Error('selectDownshiftOption: page.waitForSelector no está disponible');
  }

  await page.waitForSelector(dialogSelector, { timeout: timeoutMs });
  await page.waitForSelector(inputSelector, { timeout: timeoutMs });

  // foco + escribir
  await page.click(inputSelector, { timeout: timeoutMs });
  await page.fill(inputSelector, '', { timeout: timeoutMs });
  await page.fill(inputSelector, value, { timeout: timeoutMs });

  if (waitAfterTypeMs > 0) {
    await page.waitForTimeout(waitAfterTypeMs);
  }

  // Buscar y clickear la opción visible dentro del dialog
  const clicked = await page.evaluate(
    ({ dialogSelector, optionText, partial }) => {
      function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) return false;

        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function normalize(s) {
        return String(s || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      }

      const dialog = document.querySelector(dialogSelector) || document;
      const wanted = normalize(optionText);

      const all = Array.from(dialog.querySelectorAll('*'))
        .filter(isVisible)
        .map((el) => ({
          el,
          text: normalize(el.textContent || '')
        }))
        .filter(({ text }) => !!text);

      // Prioridad 1: match exacto
      let match = all.find(({ text }) => text === wanted);

      // Prioridad 2: contains
      if (!match && partial) {
        match = all.find(({ text }) => text.includes(wanted));
      }

      // Prioridad 3: buscar por partes si el texto visible viene truncado
      if (!match && partial) {
        const tokens = wanted.split(' ').filter(Boolean);
        match = all.find(({ text }) => tokens.every((t) => text.includes(t)));
      }

      if (!match) {
        return { ok: false, reason: 'option-not-found' };
      }

      const el = match.el;

      el.scrollIntoView({ block: 'center', inline: 'nearest' });

      const down = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      const up = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      const click = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });

      el.dispatchEvent(down);
      el.dispatchEvent(up);
      el.dispatchEvent(click);

      if (typeof el.click === 'function') {
        el.click();
      }

      return {
        ok: true,
        matchedText: (el.textContent || '').trim()
      };
    },
    { dialogSelector, optionText, partial }
  );

  if (!clicked?.ok) {
    throw new Error(
      `selectDownshiftOption: no se encontró o no se pudo clickear la opción "${optionText}"`
    );
  }

  // Pequeña espera para que React procese selección
  await page.waitForTimeout(1000);

  if (logs) {
    logs.push(
      `[selectDownshiftOption] value="${value}" optionText="${optionText}" matched="${clicked.matchedText || ''}"`
    );
  }

  return {
    ok: true,
    value,
    optionText,
    matchedText: clicked.matchedText || null
  };
}