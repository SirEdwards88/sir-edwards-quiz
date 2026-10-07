// Service worker: caché versionada para el código, caché estable con huellas para las imágenes, instalación tolerante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { assetList, shellList, computeRevs, currentBlock } from '../scripts/asset-revs.mjs';

const root = new URL('../', import.meta.url);
const sw = fs.readFileSync(new URL('sw.js', root), 'utf8');

test('todo archivo de APP_SHELL existe (si uno falta, cache.addAll rompería la instalación)', () => {
  const missing = shellList(sw).filter((u) => !fs.existsSync(new URL(u.split('?')[0].slice(2) || 'index.html', root)) && u !== './');
  assert.deepEqual(missing, []);
});

test('las huellas de imágenes de sw.js están al día con los archivos (si no: node scripts/bump-version.mjs --revs)', () => {
  const block = currentBlock(sw);
  assert.ok(block, 'falta el bloque <asset-revs>');
  const revs = Object.fromEntries([...block.matchAll(/'(\.\/assets\/[^']+)': '([0-9a-f]{8})'/g)].map((m) => [m[1], m[2]]));
  const list = assetList(sw);
  assert.ok(list.length > 100);
  assert.deepEqual(Object.keys(revs).sort(), [...list].sort(), 'cada imagen de assets/ de APP_SHELL tiene huella, y solo ellas');
  assert.deepEqual(revs, computeRevs(root, list));
});

test('el retrato nuevo de la carta de aprobación tiene su propia huella (mismo nombre, contenido distinto)', () => {
  assert.match(sw, /'\.\/assets\/character\/lunes-aprobacion\.webp': '[0-9a-f]{8}'/);
});

test('dos cachés: código versionado y imágenes estables; la instalación de imágenes es tolerante y acotada', () => {
  assert.match(sw, /const CACHE_NAME = `sedq-shell-v\$\{CACHE_VERSION\}`/);
  assert.match(sw, /const ASSET_CACHE = 'sedq-assets';/, 'nombre fijo: no cambia con cada publicación');
  assert.ok(!/startsWith\('sedq-assets'/.test(sw), 'la limpieza de versiones viejas no toca la caché estable');
  assert.match(sw, /key\.startsWith\('sedq-shell-'\)/);
  const install = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
  assert.match(install, /code\.addAll\(SHELL_URLS\)/, 'el código sí es imprescindible');
  assert.ok(!/addAll\(ASSET_URLS/.test(sw), 'las imágenes no van en un addAll de todo o nada');
  assert.match(install, /try \{ await Promise\.race\(\[cacheAssets\(\)/, 'imágenes: dentro de try y con tope de tiempo');
  assert.match(sw, /cache: 'reload'/, 'nunca guarda una copia vieja de la caché HTTP');
});

test('los archivos de código y los de imagen no se mezclan: SHELL_URLS sin assets/, ASSET_URLS solo assets/', () => {
  const ctx = { self: { addEventListener() {}, location: 'https://x.test/sw.js' }, caches: {}, URL, Request: class { constructor(u) { this.url = u; } } };
  vm.createContext(ctx);
  vm.runInContext(sw.replace(/^const /gm, 'var ') + ';this.__s = SHELL_URLS; this.__a = ASSET_URLS;', ctx);
  assert.ok(ctx.__s.length > 40 && ctx.__s.every((u) => !u.startsWith('./assets/')));
  assert.ok(ctx.__a.length === assetList(sw).length && ctx.__a.every((u) => u.startsWith('./assets/')));
  assert.ok(ctx.__s.some((u) => /^\.\/src\/.+\.js\?v=\d+$/.test(u)), 'el código conserva su ?v=');
  assert.ok(ctx.__s.includes('./icons/icon-192.png?v=4'), 'los iconos (con su ?v=) viajan con el código');
});
