// src/dom/debug.js
export async function debugDom({ page, result, saveAs = "debug" }) {
  const info = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input"))
      .slice(0, 50)
      .map((el) => ({
        id: el.id || null,
        name: el.getAttribute("name"),
        type: el.getAttribute("type"),
        placeholder: el.getAttribute("placeholder"),
      }));

    const iframes = Array.from(document.querySelectorAll("iframe")).map((f) => ({
      id: f.id || null,
      name: f.getAttribute("name"),
      src: f.getAttribute("src"),
    }));

    return {
      url: location.href,
      title: document.title || "",
      forms: document.querySelectorAll("form").length,
      inputs,
      iframes,
      bodyTextSample: document.body ? document.body.innerText.slice(0, 400) : "",
    };
  });

  result.outputs[saveAs] = info;
  return info;
}