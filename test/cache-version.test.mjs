// El index.html pide sus JS/CSS con ?v=<CACHE_VERSION> y el service worker los precarga con esa misma URL.
// Si alguien sube CACHE_VERSION a mano sin pasar por scripts/bump-version.mjs, este test lo detecta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const v = Number((sw.match(/const CACHE_VERSION = (\d+);/) || [])[1]);

test('cada <script>/<link> propio de index.html lleva ?v=CACHE_VERSION', () => {
  const refs = [...html.matchAll(/<script src="(src\/[^"]+)"|<link rel="stylesheet" href="(styles\/[^"]+)"/g)].map((m) => m[1] || m[2]);
  assert.ok(refs.length > 10);
  for (const r of refs) assert.match(r, new RegExp(`\\?v=${v}$`), `${r} debería terminar en ?v=${v}`);
});

test('el service worker precarga esos mismos archivos', () => {
  const shell = [...sw.matchAll(/'\.\/((?:src|styles)\/[^']+\.(?:js|css))'/g)].map((m) => m[1]);
  const refs = [...html.matchAll(/<script src="(src\/[^"?]+)|<link rel="stylesheet" href="(styles\/[^"?]+)/g)].map((m) => m[1] || m[2]);
  for (const r of refs) assert.ok(shell.includes(r), `${r} no está en APP_SHELL de sw.js`);
  assert.match(sw, /APP_SHELL\.map\(/, 'SHELL_URLS añade ?v= a JS/CSS');
});
