/**
 * fillFrameAutocomplete: fills a search field in a frame, waits for AJAX autocomplete,
 * reads the suggested values (code + name), sets the hidden field directly,
 * and optionally clicks the autocomplete option.
 *
 * For forms where autocomplete sets a hidden code field + a display name field.
 *
 * Options:
 *   frameIndex: which frame
 *   inputName: name of the visible text input (display field)
 *   hiddenName: name of the hidden code input
 *   searchText: text to type/search
 *   matchText: text to match in autocomplete results (defaults to searchText)
 *   autocompleteSelector: CSS selector for the autocomplete container (default: '.autocomplete-suggestions, ul.autocomplete')
 *   timeoutMs: max time to wait for autocomplete (default 10000)
 */
export async function runFillFrameAutocomplete(step, ctx, i) {
  const { frameIndex, inputName, hiddenName, searchText, matchText } = step;
  const autoSelector = step.autocompleteSelector || 'div[id*="autocomplete"], ul[id*="autocomplete"], .autocomplete-suggestions, div[class*="autocomplete"]';
  const timeoutMs = step.timeoutMs ?? 10000;

  if (frameIndex === undefined) throw new Error("fillFrameAutocomplete requiere 'frameIndex'");
  if (!inputName) throw new Error("fillFrameAutocomplete requiere 'inputName'");
  if (!searchText) throw new Error("fillFrameAutocomplete requiere 'searchText'");

  const target = matchText || searchText;
  ctx.logs.push(`[${i}] fillFrameAutocomplete[${frameIndex}] ${inputName} = ${searchText}`);

  const frames = ctx.page.frames();
  const frame = frames[frameIndex];
  if (!frame) throw new Error('No hay frame ' + frameIndex);

  // Step 1: fill the visible input field to trigger AJAX
  await frame.evaluate(({ inputName, searchText }) => {
    const el = document.querySelector('[name="' + inputName + '"]');
    if (!el) throw new Error('Input no encontrado: ' + inputName);
    el.value = searchText;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, { inputName, searchText });

  ctx.logs.push(`[${i}] typed, waiting for autocomplete...`);

  // Step 2: wait for autocomplete results and read the option value
  const deadline = Date.now() + timeoutMs;
  let selectedCode = null;
  let selectedName = null;

  while (Date.now() < deadline && !selectedCode) {
    await new Promise(r => setTimeout(r, 400));
    
    try {
      const result = await frame.evaluate(({ autoSelector, target, inputName, hiddenName }) => {
        // Check various autocomplete patterns
        
        // Pattern 1: div/ul with autocomplete items
        const containers = document.querySelectorAll(autoSelector + ', div[style*="position: absolute"][style*="display"], div[style*="position:absolute"]');
        for (const container of containers) {
          const items = container.querySelectorAll('li, div.item, div[class*="item"], a');
          for (const item of items) {
            if (item.textContent.trim().toLowerCase().includes(target.toLowerCase())) {
              // Get the code from data attributes or onclick
              const code = item.getAttribute('data-id') || item.getAttribute('data-value') || 
                          item.getAttribute('data-codigo') || item.getAttribute('id');
              const onclick = item.getAttribute('onclick') || '';
              // Try to extract code from onclick like: seleccionar('123', 'Particulares')
              const match = onclick.match(/['"](\w+)['"],\s*['"]/);
              const extractedCode = match ? match[1] : code;
              
              if (extractedCode) {
                return { code: extractedCode, name: item.textContent.trim(), found: 'data-attr' };
              }
              
              // If we can click it and it sets the value
              item.click();
              return { code: null, name: item.textContent.trim(), found: 'clicked', clicked: true };
            }
          }
        }
        
        // Pattern 2: check if hidden field was already set
        if (hiddenName) {
          const hidden = document.querySelector('[name="' + hiddenName + '"]');
          if (hidden && hidden.value) {
            return { code: hidden.value, name: searchText, found: 'hidden-field' };
          }
        }
        
        return null;
      }, { autoSelector, target, inputName, hiddenName, searchText });

      if (result) {
        ctx.logs.push(`[${i}] autocomplete: ${JSON.stringify(result)}`);
        if (result.code) {
          selectedCode = result.code;
          selectedName = result.name;
        } else if (result.clicked) {
          // Was clicked, wait and check hidden field
          await new Promise(r => setTimeout(r, 500));
          const codeAfterClick = await frame.evaluate((hiddenName) => {
            const el = document.querySelector('[name="' + hiddenName + '"]');
            return el ? el.value : null;
          }, hiddenName);
          selectedCode = codeAfterClick;
          selectedName = result.name;
        }
        if (selectedCode) break;
      }
    } catch (e) {
      ctx.logs.push(`[${i}] autocomplete check error: ${e.message}`);
    }
  }

  if (!selectedCode && hiddenName) {
    // Last resort: read whatever is in the hidden field
    try {
      selectedCode = await frame.evaluate((hiddenName) => {
        const el = document.querySelector('[name="' + hiddenName + '"]');
        return el ? el.value : '';
      }, hiddenName);
    } catch (e) {}
  }

  ctx.logs.push(`[${i}] result: code=${selectedCode} name=${selectedName}`);

  return {
    code: selectedCode,
    name: selectedName,
    inputName,
    hiddenName
  };
}
