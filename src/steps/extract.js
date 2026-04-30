export async function runExtract(step, ctx, i) {
  const prompt = step.prompt;
  if (!prompt) throw new Error("extract requiere 'prompt'");

  ctx.logs.push(`[${i}] extract: ${prompt}`);
  const value = await ctx.stagehand.extract(prompt);

  const key = step.saveAs || `extract_${i}`;
  ctx.result.outputs[key] = value;

  return { savedAs: key };
}