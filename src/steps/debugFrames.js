export async function runDebugFrames(step, ctx, i) {
  const key = step.saveAs || `frames_${i}`;

  ctx.logs.push(`[${i}] debugFrames -> ${key}`);

  const framesRaw = await ctx.page.frames();

  const safeCall = (obj, methodName, fallback = null) => {
    try {
      if (!obj) return fallback;

      if (typeof obj[methodName] === "function") {
        return obj[methodName]();
      }

      if (obj[methodName] !== undefined) {
        return obj[methodName];
      }

      return fallback;
    } catch {
      return fallback;
    }
  };

  const frames = framesRaw.map((frame, idx) => {
    const parent =
      typeof frame.parentFrame === "function"
        ? frame.parentFrame()
        : frame.parentFrame || null;

    return {
      idx,
      url: safeCall(frame, "url"),
      name: safeCall(frame, "name"),
      parentUrl: parent ? safeCall(parent, "url") : null,
    };
  });

  ctx.result.outputs[key] = frames;

  return {
    savedAs: key,
    count: frames.length,
  };
}