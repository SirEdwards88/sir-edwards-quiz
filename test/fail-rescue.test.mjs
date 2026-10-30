// Rescate tras fallos seguidos y apertura fácil (src/utils/fail-rescue.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => fs.readFileSync(path.join(here, '..', ...p), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(read('src', 'utils', 'fail-rescue.js') + '\n;globalThis.F = SEQFailRescue;', ctx);
const F = ctx.F;

const mk = (difs) => difs.map((dif, i) => ({ n: i + 1, dif, cat: i % 2 ? 'historia' : 'ciencia' }));
const difs = (queue) => queue.map((q) => q.dif[0]).join('');
const sorted = (queue) => queue.map((q) => q.n).sort((a, b) => a - b).join(',');
const game = (mode, queue, extra = {}) => ({ mode, queue, currentIdx: 0, ...extra });

test('tras 2 fallos seguidos, la siguiente no fácil cambia por una fácil sin alterar los totales', () => {
  const g = game('play', mk(['facil', 'facil', 'dificil', 'medio', 'facil', 'dificil']));
  const before = sorted(g.queue);
  F.record(g, false); F.record(g, false);
  g.currentIdx = 2;
  assert.equal(F.rescue(g), true);
  assert.equal(g.queue[2].dif, 'facil');
  assert.equal(g.queue[4].dif, 'dificil', 'la difícil desplazada pasa más adelante, no se pierde');
  assert.equal(sorted(g.queue), before);
  assert.equal(g.wrongRun, 0, 'el contador se reinicia al usarse');
});

test('un solo fallo, o un acierto entre medias, no activa el rescate', () => {
  const g = game('play', mk(['facil', 'dificil', 'facil']), { currentIdx: 1 });
  F.record(g, false);
  assert.equal(F.rescue(g), false);
  F.record(g, true); F.record(g, false);
  assert.equal(g.wrongRun, 1);
  assert.equal(F.rescue(g), false);
  assert.equal(g.queue[1].dif, 'dificil');
});

test('si la siguiente ya es fácil no se toca, y si no queda ninguna fácil tampoco', () => {
  const a = game('survival', mk(['medio', 'facil', 'medio']), { survivalTier: 'humano', currentIdx: 1, wrongRun: 2 });
  assert.equal(F.rescue(a), false);
  assert.equal(a.wrongRun, 0);
  const b = game('survival', mk(['medio', 'dificil', 'medio']), { survivalTier: 'humano', currentIdx: 1, wrongRun: 2 });
  assert.equal(F.rescue(b), false);
  assert.equal(difs(b.queue), 'mdm');
  assert.equal(b.wrongRun, 2, 'se mantiene por si más adelante hay una fácil');
});

test('nunca deja 3 difíciles seguidas al desplazar una difícil', () => {
  // Posición 1 es difícil; la única fácil (índice 3) tiene dos difíciles detrás: colocar la difícil ahí haría 3 seguidas.
  const g = game('play', mk(['facil', 'dificil', 'medio', 'facil', 'dificil', 'dificil']), { currentIdx: 1, wrongRun: 2 });
  assert.equal(F.rescue(g), false);
  assert.equal(difs(g.queue), 'fdmfdd');
});

test('solo aplica a Estándar, Supervivencia (sin «derrame») y Contrarreloj, y nunca a Duelo/Retos', () => {
  const q = () => mk(['facil', 'dificil', 'facil']);
  assert.equal(F.eligible(game('play', q())), true);
  assert.equal(F.eligible(game('timetrial', q())), true);
  assert.equal(F.eligible(game('survival', q(), { survivalTier: 'ameba' })), true);
  assert.equal(F.eligible(game('survival', q(), { survivalTier: 'humano' })), true);
  assert.equal(F.eligible(game('survival', q(), { survivalTier: 'derrame' })), false);
  for (const mode of ['sudden_death', 'lucidez_mental', 'review', 'mental_calc']) assert.equal(F.eligible(game(mode, q())), false, mode);
  assert.equal(F.eligible(game('play', q(), { isDuel: true })), false);
  const g = game('sudden_death', q(), { currentIdx: 1 });
  F.record(g, false); F.record(g, false);
  assert.equal(g.wrongRun, undefined, 'fuera de los modos elegibles ni siquiera se anota');
  assert.equal(F.rescue(g), false);
});

test('Estándar abre con 3 fáciles y conserva los totales por dificultad', () => {
  const shapeDifs = ['dificil', 'medio', 'dificil', 'facil', 'facil', 'facil', 'facil', 'medio', 'medio', 'medio',
    'medio', 'facil', 'facil', 'facil', 'facil', 'medio', 'medio', 'medio', 'dificil', 'dificil'];
  const queue = mk(shapeDifs);
  const before = sorted(queue);
  const count = (d) => queue.filter((x) => x.dif === d).length;
  const totals = [count('facil'), count('medio'), count('dificil')];
  F.openWithEasy(queue);
  assert.ok(queue.slice(0, 3).every((x) => x.dif === 'facil'));
  assert.equal(sorted(queue), before);
  assert.deepEqual([count('facil'), count('medio'), count('dificil')], totals);
  assert.ok(!/ddd/.test(difs(queue)), 'sin 3 difíciles seguidas');
});

test('openWithEasy no rompe nada si no hay suficientes fáciles', () => {
  const queue = mk(['dificil', 'medio', 'facil', 'medio']);
  const before = sorted(queue);
  F.openWithEasy(queue, 3);
  assert.equal(queue.length, 4);
  assert.equal(sorted(queue), before, 'solo intercambia, no quita ni duplica');
  const sinFacilesDetras = mk(['dificil', 'medio', 'dificil', 'medio', 'medio']);
  F.openWithEasy(sinFacilesDetras, 3);
  assert.equal(difs(sinFacilesDetras), 'dmdmm', 'sin fáciles que traer, no cambia nada');
});

test('index.html y sw.js enlazan el módulo y lo usan', () => {
  const html = read('index.html');
  assert.ok(html.includes('src/utils/fail-rescue.js'));
  assert.ok(read('sw.js').includes('./src/utils/fail-rescue.js'));
  assert.ok(html.includes('SEQFailRescue.record(currentGame, correct)'));
  assert.ok(html.includes('SEQFailRescue.rescue(currentGame)'));
  assert.ok(html.includes('SEQFailRescue.openWithEasy('));
});
