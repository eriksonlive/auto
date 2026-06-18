export async function buildDomContext(page, extra = {}) {
  const context = await page.evaluate(() => {
    function isVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function cleanText(text) {
      return (text || "").replace(/\s+/g, " ").trim();
    }

    function getLabelFor(el) {
      if (!el) return null;

      const id = el.id;
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label) return cleanText(label.innerText);
      }

      const wrapperLabel = el.closest("label");
      if (wrapperLabel) return cleanText(wrapperLabel.innerText);

      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return cleanText(ariaLabel);

      const labelledBy = el.getAttribute("aria-labelledby");
      if (labelledBy) {
        const parts = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map((node) => cleanText(node.innerText))
          .filter(Boolean);

        if (parts.length) return parts.join(" ");
      }

      return null;
    }

    function cssEscapeSafe(value) {
      try {
        return CSS.escape(value);
      } catch {
        return value;
      }
    }

    function getSelector(el) {
      if (!el) return null;

      if (el.id) return `#${cssEscapeSafe(el.id)}`;

      const name = el.getAttribute("name");
      if (name) {
        return `${el.tagName.toLowerCase()}[name='${name.replace(/'/g, "\\'")}']`;
      }

      const role = el.getAttribute("role");
      if (role) {
        return `${el.tagName.toLowerCase()}[role='${role.replace(/'/g, "\\'")}']`;
      }

      const dataTestId = el.getAttribute("data-testid");
      if (dataTestId) {
        return `${el.tagName.toLowerCase()}[data-testid='${dataTestId.replace(/'/g, "\\'")}']`;
      }

      return el.tagName.toLowerCase();
    }

    function getFormSelector(el) {
      const form = el.closest("form");
      return form ? getSelector(form) : null;
    }

    function getCurrentValue(el) {
      if (!el) return null;
      if ("value" in el) return el.value ?? null;
      return null;
    }

    function getOptions(selectEl) {
      return [...selectEl.options].map((opt) => ({
        value: opt.value,
        text: cleanText(opt.textContent),
        selected: !!opt.selected,
        disabled: !!opt.disabled
      }));
    }

    const inputs = [...document.querySelectorAll("input, textarea")]
      .filter(isVisible)
      .map((el) => ({
        kind: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || "text",
        name: el.getAttribute("name") || null,
        id: el.id || null,
        label: getLabelFor(el),
        selector: getSelector(el),
        formSelector: getFormSelector(el),
        placeholder: el.getAttribute("placeholder") || null,
        required: !!el.required,
        disabled: !!el.disabled,
        readOnly: !!el.readOnly,
        value: getCurrentValue(el)
      }));

    const selects = [...document.querySelectorAll("select")]
      .filter(isVisible)
      .map((el) => ({
        kind: "select",
        name: el.getAttribute("name") || null,
        id: el.id || null,
        label: getLabelFor(el),
        selector: getSelector(el),
        formSelector: getFormSelector(el),
        required: !!el.required,
        disabled: !!el.disabled,
        value: el.value ?? null,
        options: getOptions(el)
      }));

    const comboboxes = [...document.querySelectorAll("div[role='combobox'] input, input[role='combobox']")]
      .filter(isVisible)
      .map((el) => {
        const owner = el.closest("[name]") || el;
        return {
          kind: "combobox",
          name: owner?.getAttribute?.("name") || el.getAttribute("name") || null,
          id: el.id || null,
          label: getLabelFor(el),
          selector: getSelector(el),
          formSelector: getFormSelector(el),
          placeholder: el.getAttribute("placeholder") || null,
          disabled: !!el.disabled,
          readOnly: !!el.readOnly,
          value: getCurrentValue(el)
        };
      });

    const buttons = [...document.querySelectorAll("button, a, input[type='button'], input[type='submit']")]
      .filter(isVisible)
      .map((el) => ({
        kind: "button",
        text: cleanText(el.innerText || el.value || ""),
        selector: getSelector(el),
        disabled: !!el.disabled,
        role: el.getAttribute("role") || null,
        href: el.getAttribute("href") || null
      }))
      .filter((b) => b.text || b.href);

    const tabs = [...document.querySelectorAll("[role='tab']")]
      .filter(isVisible)
      .map((el) => ({
        kind: "tab",
        id: el.id || null,
        text: cleanText(el.innerText),
        selector: getSelector(el),
        selected: el.getAttribute("aria-selected") === "true",
        controls: el.getAttribute("aria-controls") || null
      }));

    const dialogs = [...document.querySelectorAll("[role='dialog']")]
      .filter(isVisible)
      .map((el, index) => ({
        kind: "dialog",
        index,
        id: el.id || null,
        selector: getSelector(el),
        textPreview: cleanText(el.innerText).slice(0, 800)
      }));

    const tables = [...document.querySelectorAll("table")]
      .filter(isVisible)
      .map((table, index) => {
        const headers = [...table.querySelectorAll("thead th, tr th")]
          .map((th) => cleanText(th.innerText))
          .filter(Boolean);

        const firstRows = [...table.querySelectorAll("tbody tr")]
          .slice(0, 3)
          .map((tr) =>
            [...tr.querySelectorAll("td")]
              .map((td) => cleanText(td.innerText))
              .filter(Boolean)
          );

        return {
          kind: "table",
          index,
          selector: getSelector(table),
          headers,
          sampleRows: firstRows
        };
      });

    const forms = [...document.querySelectorAll("form")]
      .filter(isVisible)
      .map((form, index) => ({
        kind: "form",
        index,
        selector: getSelector(form),
        id: form.id || null,
        name: form.getAttribute("name") || null
      }));

    return {
      url: location.href,
      title: document.title,
      forms,
      inputs,
      selects,
      comboboxes,
      buttons,
      tabs,
      dialogs,
      tables,
      visibleTextPreview: cleanText(document.body?.innerText || "").slice(0, 2000)
    };
  });

  return {
    capturedAt: new Date().toISOString(),
    ...extra,
    ...context
  };
}