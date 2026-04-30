export async function extractInteractiveDom(page) {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll(`
      input,
      textarea,
      select,
      button,
      a,
      [role="button"],
      [role="tab"],
      [role="dialog"],
      [role="option"],
      [role="combobox"]
    `));

    return nodes.map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").replace(/\s+/g, " ").trim(),
      id: el.id || null,
      name: el.getAttribute("name"),
      role: el.getAttribute("role"),
      type: el.getAttribute("type"),
      ariaLabel: el.getAttribute("aria-label"),
      title: el.getAttribute("title"),
      dataTestId: el.getAttribute("data-testid"),
      selectorHint: [
        el.id ? `#${el.id}` : null,
        el.getAttribute("name") ? `${el.tagName.toLowerCase()}[name="${el.getAttribute("name")}"]` : null,
        el.getAttribute("data-testid") ? `${el.tagName.toLowerCase()}[data-testid="${el.getAttribute("data-testid")}"]` : null
      ].filter(Boolean)
    }));
  });
}