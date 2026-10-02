// XP extra por rachas: tabla de hitos, modos que dan XP, y que grantXp la suma sin pasarse del tope.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(read('src/utils/streak-xp.js'), ctx);
const S = ctx.SEQStreakXp;

test('bonus por hito: 5→10, 10→20, 15→30, 20→50 y +50 cada 10 más', () => {
  const tabla = { 4: 0, 5: 10, 6: 0, 9: 0, 10: 20, 14: 0, 15: 30, 19: 0, 20: 50, 25: 0, 30: 50, 40: 50, 50: 50, 60: 50 };
  for (const [n, xp] of Object.entries(tabla)) assert.equal(S.bonus(Number(n)), xp, 'racha ' + n);
  for (const n of [0, 1, 2, 3, -1, NaN, undefined, null, 'x']) assert.equal(S.bonus(n), 0);
});

test('el bonus medio nunca pasa de 6 XP por acierto (cabe en el tope de 16 por acierto del Worker)', () => {
  let total = 0;
  for (let n = 1; n <= 500; n++) { total += S.bonus(n); assert.ok(total / n <= 6, 'racha ' + n + ': ' + total / n); }
});

test('solo los modos que ya daban XP', () => {
  for (const m of ['play', 'review', 'survival', 'sudden_death', 'timetrial', 'lucidez_mental']) assert.equal(S.modeGivesXp(m), true, m);
  for (const m of ['mental_calc', 'duel', 'reto', undefined]) assert.equal(S.modeGivesXp(m), false, String(m));
});

test('grantXp suma 10 + bonus, cuenta la XP de la partida y respeta el nivel 30 y el tope', () => {
  const c = vm.createContext({ store: { xp: 0 }, currentGame: {}, answerStreak: 0, getLevelData: (xp) => (xp >= 23200 ? 30 : 1) });
  vm.runInContext(read('src/utils/streak-xp.js'), c);
  vm.runInContext(read('src/state/write-helpers.js').replace(/^function /gm, 'globalThis.__f = globalThis.__f || {}; function ') + '\n;globalThis.grantXp = grantXp;', c);
  const g = (streak) => { c.answerStreak = streak; c.grantXp(); };
  g(1); assert.equal(c.store.xp, 10);
  g(5); assert.equal(c.store.xp, 30);            // 10 + 10
  g(10); assert.equal(c.store.xp, 60);           // 10 + 20
  assert.equal(c.currentGame.sessionXpGained, 60);
  c.store.xp = 23199; g(20);                       // 10 + 50 = 60 → recortado al tope
  assert.equal(c.store.xp, 23209);
  c.currentGame.sessionXpGained = 0; g(10);        // nivel 30: no da XP
  assert.equal(c.store.xp, 23209);
  assert.equal(c.currentGame.sessionXpGained, 0);
});

test('index.html y sw.js enlazan el módulo antes que write-helpers', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('src/utils/streak-xp.js') !== -1 && html.indexOf('src/utils/streak-xp.js') < html.indexOf('src/state/write-helpers.js'));
  assert.ok(read('sw.js').includes('./src/utils/streak-xp.js'));
});

test('Repaso no tiene racha: updateAnswerStreak sale pronto y no toca récords', () => {
  const html = read('index.html');
  const i = html.indexOf('function updateAnswerStreak');
  const body = html.slice(i, html.indexOf('\n}\n', i));
  assert.match(body, /currentGame\.mode === 'review'[\s\S]*?return;[\s\S]*?answerStreak\+\+/, 'el early return de Repaso va antes de contar la racha');
});

test('Estándar: tramos de resultado para 20 preguntas (casi perfecto alcanzable)', () => {
  const html = read('index.html');
  const i = html.indexOf('function getResultData');
  const src = html.slice(i, html.indexOf('\n}\n', i) + 3);
  const c = vm.createContext({ END_PHRASES: Object.fromEntries(['desastre', 'mediocre', 'bien', 'casi_perfecto', 'perfecto'].map(k => [k, { title: k, phrases: ['x'] }])), pickRotatingPhrase: (k, p) => p[0] });
  vm.runInContext(src + ';globalThis.f = getResultData;', c);
  const key = (n) => c.f(n, 20).key;
  assert.deepEqual([0, 11].map(key), ['desastre', 'desastre']);
  assert.deepEqual([12, 14].map(key), ['mediocre', 'mediocre']);
  assert.deepEqual([15, 17].map(key), ['bien', 'bien']);
  assert.deepEqual([18, 19].map(key), ['casi_perfecto', 'casi_perfecto']);
  assert.equal(key(20), 'perfecto');
});
