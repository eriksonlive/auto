export async function buildDomContext(page) {
  return await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function getSelectorHint(el) {
      if (!el) return null;
      if (el.id) return `#${el.id}`;
      const name = el.getAttribute("name");
      if (name) return `${el.tagName.toLowerCase()}[name='${name}']`;
      return el.tagName.toLowerCase();
    }

    const selects = [...document.querySelectorAll("select")]
      .filter(isVisible)
      .map((el) => ({
        kind: "select",
        id: el.id || null,
        name: el.name || null,
        selector: getSelectorHint(el),
        options: [...el.options].map((opt) => ({
          value: opt.value,
          text: opt.textContent?.trim() || ""
        }))
      }));

    const inputs = [...document.querySelectorAll("input, textarea")]
      .filter(isVisible)
      .map((el) => ({
        kind: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "text",
        id: el.id || null,
        name: el.getAttribute("name") || null,
        selector: getSelectorHint(el),
        placeholder: el.getAttribute("placeholder") || null
      }));

    const buttons = [...document.querySelectorAll("button, a, input[type='button'], input[type='submit']")]
      .filter(isVisible)
      .map((el) => ({
        kind: "button",
        id: el.id || null,
        text: (el.innerText || el.value || "").trim(),
        selector: getSelectorHint(el)
      }));

    return {
      url: location.href,
      title: document.title,
      elements: [
        ...selects,
        ...inputs,
        ...buttons
      ]
    };
  });
}