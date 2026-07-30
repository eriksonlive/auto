// findFormFrame: scans all frames for inputs and returns which frame has the most inputs
export async function runFindFormFrame(step, ctx, i) {
  const key = step.saveAs || 'form_frame_info';
  ctx.logs.push(`[${i}] findFormFrame`);

  const frames = ctx.page.frames();
  const results = [];

  for (let idx = 0; idx < frames.length; idx++) {
    try {
      const info = await frames[idx].evaluate(() => ({
        title: document.title,
        url: window.location.href,
        inputs: document.querySelectorAll('input, select, textarea').length,
        inputNames: Array.from(document.querySelectorAll('input, select, textarea')).map(e => e.name || e.id || e.type).join(','),
        text: document.body?.innerText?.substring(0, 200) || ''
      }));
      results.push({ idx, ...info });
    } catch (e) {
      results.push({ idx, error: e.message.substring(0, 100) });
    }
  }

  ctx.result.outputs[key] = results;
  return { savedAs: key, count: frames.length };
}
