// 2.2: ventana entre desplegar el Worker y actualizar la PWA — una pregunta que esta versión no tiene
// no deja la partida «cargando» para siempre: se pide actualizar. Las retiradas se resuelven por ID.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const D = read('src/online/duels.js'), V = read('src/online/duels-v21.js');

test('duels.js: las retiradas se cargan antes del banco vivo (el vivo manda)', () => {
  assert.match(D, /RETIRED_TEST_QUESTIONS\.forEach[\s\S]*?TEST_QUESTIONS\.forEach\(function \(q\) \{ QMAP/);
  assert.match(D, /RETIRED_QUESTIONS\.forEach[\s\S]*?\bQUESTIONS\.forEach\(function \(q\) \{ LMAP/);
});

test('duels.js: pregunta presente pero no resuelta → «Hace falta actualizar»; ausente → «Cargando»', () => {
  assert.match(D, /if \(!info\) \{ S\.shown = null; return it == null \? '<p class="stats-section-sub">Cargando pregunta…<\/p>' : updateNeeded\(\); \}/);
  assert.match(D, /function updateNeeded\(\)[\s\S]*?Hace falta actualizar[\s\S]*?location\.reload\(\)/);
  assert.match(D, /updateNeeded: updateNeeded/);
});

test('duels-v21.js (apuestas): misma guarda', () => {
  assert.match(V, /if \(!info && qn != null && h\.updateNeeded\) return h\.updateNeeded\(\);/);
});

test('index.html y sw.js cargan los módulos nuevos', () => {
  const html = read('index.html'), sw = read('sw.js');
  for (const f of ['src/data/questions-retired.js', 'src/utils/answer-alias.js']) {
    assert.ok(html.includes(f), f + ' no está en index.html');
    assert.ok(sw.includes("'./" + f + "'"), f + ' no está en sw.js');
  }
  assert.ok(html.indexOf('questions-retired.js') < html.indexOf('<script src="src/online/duels.js'), 'las retiradas deben cargarse antes de duels.js');
  assert.ok(!/isMatchFlexible\(user, q\.a, q\.q\)/.test(html), 'queda una comprobación sin alias en index.html');
});
