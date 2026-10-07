// 2.1: cada logro activo tiene su insignia, y los iconos de modos, apuestas y avatares existen y están en el service worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const exists = (p) => fs.existsSync(new URL(p, root));
const sw = read('sw.js');
function medalIds() {
  const c = { console, getLevelData: () => 1, getMasteredCount: () => 0, getCategoryMastery: () => [], getFragmentCount: () => 0 };
  vm.createContext(c);
  vm.runInContext(read('src/data/medals.js').replace(/^const /gm, 'var ') + ';this.ids = ALL_MEDALS.map(m => m.id);', c);
  return Array.from(c.ids);
}
test('los 60 logros activos tienen su insignia (webp) y está en el service worker', () => {
  const ids = medalIds();
  assert.equal(ids.length, 60);
  for (const id of ids) {
    assert.ok(exists('assets/logros/' + id + '.webp'), 'falta la insignia de ' + id);
    assert.ok(sw.includes("'./assets/logros/" + id + ".webp'"), id + ' no está en el service worker');
  }
});
test('los logros retirados ya no se precargan', () => {
  assert.equal(sw.includes('logros/world_citizen.webp'), false);
  assert.equal(sw.includes('logros/duel_eso_era_un_duelo.webp'), false);
  assert.equal(exists('assets/logros/duel_eso_era_un_duelo.webp'), false);
});
test('iconos de modos y de apuestas: existen y están precargados', () => {
  for (const f of ['modos/classic', 'modos/stakes', 'apuestas/cuerdo', 'apuestas/osado', 'apuestas/insensato']) {
    assert.ok(exists('assets/duelos/' + f + '.webp'), f);
    assert.ok(sw.includes("'./assets/duelos/" + f + ".webp'"), f + ' no está en el service worker');
  }
});
test('los 5 iconos de rango: existen y están precargados', () => {
  for (const r of ['plebeyo_ilustrado', 'caballero_del_dato', 'erudito_de_salon', 'lord_sabelotodo', 'sir_edwards']) {
    assert.ok(exists('assets/duelos/rangos/' + r + '.webp'), r);
    assert.ok(sw.includes("'./assets/duelos/rangos/" + r + ".webp'"), r + ' no está en el service worker');
  }
});
test('los 6 avatares de logro: archivo y service worker', () => {
  for (const a of ['coleccionista', 'vengador', 'insensato', 'imparable', 'medianoche', 'supremo']) {
    assert.ok(exists('assets/avatars/avatar_siredwards_' + a + '.png'), a);
    assert.ok(sw.includes("'./assets/avatars/avatar_siredwards_" + a + ".png'"), a + ' no está en el service worker');
  }
});
test('la versión de la app es 2.2 en todas partes y la caché coincide con index.html', () => {
  const html = read('index.html');
  assert.match(html, /const APP_VERSION = "2\.2";/);
  for (const re of [/id="welcome-version">v2\.2</, /id="brand-sub-version">v2\.2</, /LUCIDEZ MENTAL · v2\.2</, /Mental v2\.2"/]) assert.match(html, re);
});
