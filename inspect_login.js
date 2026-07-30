// Script temporal de inspección
import "dotenv/config";
import { createStagehand } from '/SGM/auto/src/core/stagehand.js';

const stagehand = createStagehand({ stagehand: { headless: true } });
await stagehand.init();
const page = stagehand.context.pages()[0];

await page.goto('https://equivida.isismaweb.com/app/asistencial/', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(2000);

const info = await page.evaluate(() => ({
  buttons: Array.from(document.querySelectorAll('button')).map(b => ({
    id: b.id, class: b.className.substring(0,80), type: b.type, text: b.innerText.trim().substring(0,60)
  })),
  inputs: Array.from(document.querySelectorAll('input')).map(i => ({
    id: i.id, name: i.name, type: i.type, class: i.className.substring(0,60)
  }))
}));

console.log(JSON.stringify(info, null, 2));
await stagehand.close();
