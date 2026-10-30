// Devolución a la bolsa de las preguntas no mostradas (src/state/bag-return.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => fs.readFileSync(path.join(here, '..', ...p), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(read('src', 'state', 'bag-return.js') + '\n;globalThis.B = SEQBagReturn;', ctx);
const B = ctx.B;

const q = (n, dif) => ({ n, dif, cat: 'c' });
const game = (mode, idx, extra = {}) => ({
  mode, currentIdx: idx, queue: [q(1, 'facil'), q(2, 'medio'), q(3, 'dificil'), q(4, 'dificil'), q(5, 'facil')], ...extra,
});

test('devuelve las posteriores a la actual, cada una a la bolsa de su dificultad, y las quita de recientes', () => {
  const store = { questionBags: { facil: [9], dificil: [] }, recentQuestionIds: [1, 2, 3, 4, 5, 77] };
  assert.equal(B.giveBack(game('sudden_death', 1), store), 3);
  assert.deepEqual(store.questionBags.dificil, [3, 4]);
  assert.deepEqual(store.questionBags.facil, [9, 5], 'al final de la bolsa: es de donde se extrae primero');
  assert.deepEqual(store.recentQuestionIds, [1, 2, 77], 'las mostradas siguen como recientes; las no mostradas no');
});

test('partida terminada del todo: no devuelve nada', () => {
  const store = { questionBags: {}, recentQuestionIds: [] };
  assert.equal(B.giveBack(game('play', 5), store), 0);
  assert.equal(B.giveBack(game('play', 4), store), 0, 'la última ya se mostró');
});

test('solo en Estándar, Supervivencia y Muerte Súbita; nunca en Duelo/Retos ni en otros modos', () => {
  for (const mode of ['timetrial', 'review', 'lucidez_mental', 'mental_calc']) {
    assert.equal(B.giveBack(game(mode, 0), { questionBags: {} }), 0, mode);
  }
  assert.equal(B.giveBack(game('survival', 0, { isDuel: true }), { questionBags: {} }), 0);
  for (const mode of ['play', 'survival', 'sudden_death']) {
    assert.equal(B.giveBack(game(mode, 0), { questionBags: {} }), 4, mode);
  }
});

test('es idempotente por partida y no duplica ids ya presentes en la bolsa', () => {
  const store = { questionBags: { dificil: [3] }, recentQuestionIds: [] };
  const g = game('play', 1);
  assert.equal(B.giveBack(g, store), 2, 'la 3 ya estaba en la bolsa');
  assert.equal(B.giveBack(g, store), 0);
  assert.deepEqual(store.questionBags.dificil, [3, 4]);
});

test('tolera datos ausentes o raros', () => {
  assert.equal(B.giveBack(null, {}), 0);
  assert.equal(B.giveBack(game('play', 0), null), 0);
  assert.equal(B.giveBack({ mode: 'play', queue: null, currentIdx: 0 }, {}), 0);
  const store = {};
  assert.equal(B.giveBack(game('play', 'x'), store), 4, 'currentIdx no numérico se trata como 0');
  assert.ok(store.questionBags);
});

test('conexión: index.html lo carga y lo llama al terminar y al descartar; sw.js lo cachea', () => {
  const html = read('index.html');
  assert.match(html, /<script src="src\/state\/bag-return\.js\?v=\d+"><\/script>/);
  assert.match(html, /SEQBagReturn\.giveBack\(currentGame, store\)/);
  assert.match(html, /SEQBagReturn\.giveBack\(store\.savedGame, store\)/);
  assert.match(read('sw.js'), /'\.\/src\/state\/bag-return\.js'/);
});
