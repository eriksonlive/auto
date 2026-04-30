export async function runPressKeys(step, ctx, i) {
  const keys = step.keys || [];
  const delayMs = step.delayMs ?? 150;

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("pressKeys requiere 'keys' como arreglo no vacío");
  }

  ctx.logs.push(`[${i}] pressKeys ${JSON.stringify(keys)}`);

  for (const key of keys) {
    await ctx.page.keyboard.press(key);
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return {
    pressed: keys
  };
}