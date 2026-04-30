export async function runAct(step, ctx, i) {
  const instruction = step.instruction;
  if (!instruction) throw new Error("act requiere 'instruction'");

  ctx.logs.push(`[${i}] act: ${instruction}`);
  await ctx.stagehand.act(instruction);

  return { acted: true };
}