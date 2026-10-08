// 2.3 — Avisos push en la PWA: lógica pura, service worker y cableado (todo apagado salvo que el servidor lo active).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = { document: { addEventListener() {}, getElementById() { return null; }, readyState: 'complete' }, setTimeout() { return 0; }, setInterval() { return 0; }, navigator: {}, location: { hash: '' }, atob, btoa, Uint8Array };
ctx.addEventListener = () => {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('src/online/push.js'), ctx);
const C = ctx.SEQPush.core;

test('urlKey decodifica base64url; linkId solo acepta IDs válidos; tzMinutes es al este de UTC', () => {
  assert.equal(Array.from(C.urlKey('AQID')).join(','), '1,2,3');
  assert.equal(Array.from(C.urlKey('-_8')).join(','), '251,255');
  assert.equal(C.linkId('#reto=ABCDEFGHJK'), 'ABCDEFGHJK');
  assert.equal(C.linkId('#reto=abc'), null);
  assert.equal(C.linkId('#reto=ABCDEFGHJK<script>'), 'ABCDEFGHJK');
  assert.equal(C.linkId(''), null);
  assert.equal(C.tzMinutes({ getTimezoneOffset: () => -120 }), 120);
});

test('sin soporte o sin features.push no hay ajuste (apagado por defecto)', () => {
  assert.doesNotThrow(() => ctx.SEQPush.paint());
});

test('service worker: manejadores push y notificationclick, sin duplicar con la app a la vista', () => {
  const sw = read('sw.js');
  assert.match(sw, /addEventListener\('push'/);
  assert.match(sw, /addEventListener\('notificationclick'/);
  assert.match(sw, /visibilityState === 'visible'/);
  assert.match(sw, /openWindow\('\.\/' \+ \(id \? '#reto=' \+ id : ''\)\)/);
  assert.match(sw, /'\.\/src\/online\/push\.js'/);
});

test('cableado: script en index.html con la versión vigente, grupo en Ajustes oculto por defecto, sin ofertas emergentes', () => {
  const html = read('index.html'), ver = /CACHE_VERSION = (\d+)/.exec(read('sw.js'))[1];
  assert.ok(html.includes('src/online/push.js?v=' + ver));
  assert.match(html, /id="push-group" style="display:none;"/);
  assert.ok(!/SEQPush\.offer/.test(read('src/online/duels.js')) && !/push-offer/.test(read('src/online/push.js')));
  assert.ok(!/siredwards_quiz_v1_0_data/.test(read('src/online/push.js')), 'no toca la clave de datos');
});
