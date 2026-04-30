export async function runClickLinkInRow(step, ctx, i) {
  const rowText = step.rowText;
  const linkAriaLabel = step.linkAriaLabel;
  const timeoutMs = step.timeoutMs ?? 30000;

  if (!rowText) {
    throw new Error("clickLinkInRow requiere 'rowText'");
  }

  if (!linkAriaLabel) {
    throw new Error("clickLinkInRow requiere 'linkAriaLabel'");
  }

  ctx.logs.push(
    `[${i}] clickLinkInRow rowText="${rowText}" linkAriaLabel="${linkAriaLabel}"`
  );

  const start = Date.now();
  let clicked = false;

  while (Date.now() - start < timeoutMs) {
    clicked = await ctx.page.evaluate(({ rowText, linkAriaLabel }) => {
      const normalize = (s) =>
        String(s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const wantedRowText = normalize(rowText);
      const wantedLink = normalize(linkAriaLabel);

      const rows = Array.from(document.querySelectorAll('tr, [role="row"], .MuiDataGrid-row'));

      const row = rows.find((r) =>
        normalize(r.textContent || '').includes(wantedRowText)
      );

      if (!row) return false;

      const links = Array.from(row.querySelectorAll('a'));

      const link = links.find((a) =>
        normalize(a.getAttribute('aria-label') || '').includes(wantedLink)
      );

      if (!link) return false;

      link.scrollIntoView({ block: 'center', inline: 'center' });
      link.click();
      return true;
    }, { rowText, linkAriaLabel });

    if (clicked) break;

    await new Promise((r) => setTimeout(r, 250));
  }

  if (!clicked) {
    throw new Error(
      `No se encontró una fila con "${rowText}" y link "${linkAriaLabel}" en ${timeoutMs}ms`
    );
  }

  return {
    clicked: true,
    rowText,
    linkAriaLabel,
  };
}