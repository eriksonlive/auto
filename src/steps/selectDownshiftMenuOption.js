export async function runSelectDownshiftMenuOption(step, ctx) {
  const { page, logs } = ctx;

  const inputSelector = step.inputSelector;
  const menuSelector = step.menuSelector || '#downshift-simple-menu';
  const value = step.value ?? '';
  const optionText = step.optionText ?? null;
  const timeoutMs = step.timeoutMs ?? 30000;
  const waitAfterFillMs = step.waitAfterFillMs ?? 1200;
  const itemSelector = step.itemSelector || '[role="option"], li, div';

  if (!inputSelector) {
    throw new Error('selectDownshiftMenuOption: falta "inputSelector"');
  }

  if (!value) {
    throw new Error('selectDownshiftMenuOption: falta "value"');
  }

  await page.waitForSelector(inputSelector, { timeout: timeoutMs });

  await page.click(inputSelector, { timeout: timeoutMs });
  await page.fill(inputSelector, '', { timeout: timeoutMs });
  await page.fill(inputSelector, value, { timeout: timeoutMs });

  if (waitAfterFillMs > 0) {
    await page.waitForTimeout(waitAfterFillMs);
  }

  await page.waitForSelector(menuSelector, { timeout: timeoutMs });

  const clicked = await page.evaluate(
    ({ menuSelector, itemSelector, optionText }) => {
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

      const menu = document.querySelector(menuSelector);
      if (!menu) {
        return { ok: false, reason: 'menu-not-found' };
      }

      const candidates = Array.from(menu.querySelectorAll(itemSelector))
        .filter(isVisible);

      if (!candidates.length) {
        return { ok: false, reason: 'no-visible-options' };
      }

      let target = null;

      if (optionText) {
        const wanted = normalize(optionText);

        target =
          candidates.find((el) => normalize(el.textContent).includes(wanted)) ||
          null;
      }

      if (!target) {
        target = candidates[0];
      }

      target.scrollIntoView({ block: 'nearest' });

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

      target.dispatchEvent(down);
      target.dispatchEvent(up);
      target.dispatchEvent(click);

      if (typeof target.click === 'function') {
        target.click();
      }

      return {
        ok: true,
        text: (target.textContent || '').trim()
      };
    },
    { menuSelector, itemSelector, optionText }
  );

  if (!clicked?.ok) {
    throw new Error(
      `selectDownshiftMenuOption: no se pudo seleccionar opción en ${menuSelector}. reason=${clicked?.reason || 'unknown'}`
    );
  }

  await page.waitForTimeout(1000);

  if (logs) {
    logs.push(
      `[selectDownshiftMenuOption] input=${inputSelector} menu=${menuSelector} value="${value}" clicked="${clicked.text || ''}"`
    );
  }

  return {
    ok: true,
    value,
    clickedText: clicked.text || null
  };
}