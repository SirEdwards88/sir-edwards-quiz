// v2.0 — instalar la app y avatares disponibles sin conexión.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('instalar la app no silencia el aviso para siempre y Ajustes ofrece instalar', () => {
  const onInstalled = html.slice(html.indexOf("window.addEventListener('appinstalled'"));
  assert.ok(!/dismissPwaHint\(\)/.test(onInstalled.slice(0, 200)), 'appinstalled no debe marcar el aviso como descartado');
  assert.match(html, /PWA_HINT_SNOOZE_MS/);
  assert.match(html, /id="install-app-group"/);
  assert.match(html, /<script src="src\/ui\/install-app\.js"><\/script>/);
});
test('los avatares y su catálogo están en la caché sin conexión', () => {
  for (const f of ['src/data/avatars.js', 'src/ui/install-app.js', ...['sombrero', 'libro', 'reloj', 'lupa', 'mascara', 'pluma'].map((n) => `assets/avatars/${n}.png`)]) {
    assert.ok(sw.includes(`'./${f}'`), f);
    assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)), 'existe ' + f);
  }
});
test('las imágenes de avatar son ligeras (recortadas a 256 px)', () => {
  for (const n of ['sombrero', 'libro', 'reloj', 'lupa', 'mascara', 'pluma']) {
    const size = fs.statSync(new URL(`../assets/avatars/${n}.png`, import.meta.url)).size;
    assert.ok(size < 150000, `${n}.png pesa ${size} bytes`);
  }
});
