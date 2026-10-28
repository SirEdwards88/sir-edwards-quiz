// Auditoría 6: Service Worker y datos locales.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const r = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const sw = r('sw.js'), html = r('index.html');

test('SW: navegación con revalidación, tope de 4 s, clave fija y solo páginas de la app (1, 2, 5, 17)', () => {
  assert.match(sw, /cache: 'no-cache', redirect: 'manual'/);
  assert.match(sw, /setTimeout\(\(\) => resolve\(null\), 4000\)/);
  assert.match(sw, /put\('\.\/index\.html', copy\)/);
  assert.match(sw, /includes\('siredwards_quiz_v1_0_data'\)/);
});
test('SW: okToCache, ?v= inmutable, sin Range, poda solo al activar, pushsubscriptionchange (1, 6, 14, 16, 10)', () => {
  assert.match(sw, /function okToCache\(res, url\)/);
  assert.match(sw, /if \(cached && versioned\) return cached;/);
  assert.match(sw, /req\.headers\.has\('range'\)\) return;/);
  assert.match(sw, /async function cacheAssets\(prune\)/);
  assert.match(sw, /cacheAssets\(true\)/);
  assert.match(sw, /'pushsubscriptionchange'/);
  assert.match(sw, /type === 'SKIP_WAITING'/);
});
test('index: copia del progreso ilegible, listener storage, aviso de versión y almacenamiento persistente (3, 4, 7, 13)', () => {
  assert.match(html, /siredwards_quiz_v1_0_data_corrupto_/);
  assert.match(html, /addEventListener\('storage'/);
  assert.match(html, /postMessage\(\{ type: 'SKIP_WAITING' \}\)/);
  assert.match(html, /navigator\.storage\.persist\(\)/);
  assert.ok(html.includes("localStorage.getItem('siredwards_quiz_v1_0_data')"), 'la clave de datos no cambia');
});
