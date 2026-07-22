#!/usr/bin/env node
/**
 * save-session.js
 * Abre un browser visible para que el usuario haga login manualmente.
 * Guarda cookies + localStorage en un archivo JSON reutilizable en tests.
 *
 * Uso:
 *   node scripts/save-session.js --url https://... --out sessions/equivida.json
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

const url = getArg('--url');
const outFile = getArg('--out') ?? 'sessions/session.json';

if (!url) {
  console.error('Uso: node scripts/save-session.js --url <url> --out <archivo.json>');
  process.exit(1);
}

console.log(`\nAbriendo browser en: ${url}`);
console.log('Haz login manualmente. Cuando termines, vuelve a esta terminal y presiona ENTER.\n');

const browser = await chromium.launch({
  headless: false,
  args: ['--ignore-certificate-errors'],
});

const context = await browser.newContext();
const page = await context.newPage();
await page.goto(url, { waitUntil: 'load' });

process.stdout.write('Presiona ENTER cuando hayas iniciado sesión...');
await new Promise((resolve) => {
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', resolve);
  process.stdin.resume();
});

const cookies = await context.cookies();
const storageUrl = page.url();
const localStorage = await page.evaluate(() => {
  const data = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    data[key] = window.localStorage.getItem(key);
  }
  return data;
});

await browser.close();

const session = { storageUrl, cookies, localStorage };

const dir = path.dirname(outFile);
await mkdir(dir, { recursive: true });
await writeFile(outFile, JSON.stringify(session, null, 2));

console.log(`\nSesión guardada en: ${outFile}`);
console.log(`  Cookies: ${cookies.length}`);
console.log(`  localStorage keys: ${Object.keys(localStorage).length}`);
console.log(`  URL al guardar: ${storageUrl}`);
