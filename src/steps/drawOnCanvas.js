export async function runDrawOnCanvas(step, ctx) {
  const { page, logs } = ctx;

  const {
    canvasSelector = "body canvas",
    timeoutMs = 30000,
    points
  } = step;

  const drawPoints = Array.isArray(points) && points.length >= 2
    ? points
    : [
        { x: 0.18, y: 0.72 },
        { x: 0.28, y: 0.38 },
        { x: 0.38, y: 0.60 },
        { x: 0.48, y: 0.42 },
        { x: 0.58, y: 0.66 }
      ];

  logs?.push(`[drawOnCanvas] esperando canvas: ${canvasSelector}`);
  await page.waitForSelector(canvasSelector, { timeout: timeoutMs });

  const canvas = page.locator(canvasSelector).first();
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error(`drawOnCanvas: no se pudo obtener boundingBox de ${canvasSelector}`);
  }

  const toAbs = (p) => ({
    x: box.x + box.width * p.x,
    y: box.y + box.height * p.y
  });

  const first = toAbs(drawPoints[0]);

  await page.mouse.move(first.x, first.y);
  await page.mouse.down();

  for (let i = 1; i < drawPoints.length; i++) {
    const pt = toAbs(drawPoints[i]);
    await page.mouse.move(pt.x, pt.y, { steps: 10 });
  }

  await page.mouse.up();

  logs?.push("[drawOnCanvas] garabato realizado");

  return {
    ok: true
  };
}