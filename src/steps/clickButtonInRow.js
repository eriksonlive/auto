export async function runClickButtonInRow(step, ctx, i) {
  const rowText = step.rowText;
  const buttonAriaLabel = step.buttonAriaLabel;
  const timeoutMs = step.timeoutMs ?? 30000;

  if (!rowText) {
    throw new Error("clickButtonInRow requiere 'rowText'");
  }

  if (!buttonAriaLabel) {
    throw new Error("clickButtonInRow requiere 'buttonAriaLabel'");
  }

  ctx.logs.push(
    `[${i}] clickButtonInRow rowText="${rowText}" buttonAriaLabel="${buttonAriaLabel}"`
  );

  const start = Date.now();
  let clicked = false;

  while (Date.now() - start < timeoutMs) {
    clicked = await ctx.page.evaluate(({ rowText, buttonAriaLabel }) => {
      const normalize = (s) =>
        String(s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const wantedRowText = normalize(rowText);
      const wantedButton = normalize(buttonAriaLabel);

      const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));

      const row = rows.find((r) =>
        normalize(r.textContent || '').includes(wantedRowText)
      );

      if (!row) return false;

      const buttons = Array.from(row.querySelectorAll('button'));
      const btn = buttons.find((b) =>
        normalize(b.getAttribute('aria-label') || '').includes(wantedButton)
      );

      if (!btn) return false;

      btn.click();
      return true;
    }, { rowText, buttonAriaLabel });

    if (clicked) break;

    await new Promise((r) => setTimeout(r, 250));
  }

  if (!clicked) {
    throw new Error(
      `No se encontró una fila con "${rowText}" y botón "${buttonAriaLabel}" en ${timeoutMs}ms`
    );
  }

  return {
    clicked: true,
    rowText,
    buttonAriaLabel,
  };
}