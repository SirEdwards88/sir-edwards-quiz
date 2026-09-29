// Prompt 4 — Revancha, ¿Otra vez tú? y bonus de Lucidez por Fragmentos.
// Carga los archivos reales en un contexto vm (sin navegador) y extrae de
// index.html solo las funciones necesarias. Ejecutar: node --test test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

function extractFn(name) {
  const i = html.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name + ' no encontrada');
  let depth = 0, j = html.indexOf('{', i);
  for (let k = j; k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}' && --depth === 0) return html.slice(i, k + 1);
  }
  throw new Error('llaves sin cerrar en ' + name);
}
function extractBlock(startMarker, endMarker) {
  const a = html.indexOf(startMarker), b = html.indexOf(endMarker, a);
  assert.ok(a >= 0 && b > a, 'bloque ' + startMarker);
  return html.slice(a, b);
}

function makeEnv() {
  const toasts = [];
  const ctx = vm.createContext({
    console, toasts,
    getLevelData: () => 1, getMasteredCount: () => 0, getCategoryMastery: () => [],
    saveStore: () => {}, showInfoToast: (m) => toasts.push(m),
    document: { getElementById: () => null }
  });
  vm.runInContext(read('src/data/medals.js') + '\n' + read('src/utils/store.js'), ctx);
  vm.runInContext(
    extractBlock('const UNLOCKABLE_MODES', '// ====== SISTEMA DE FRAGMENTOS') + '\n' +
    extractBlock('const FRAGMENT_TOTAL', '// Migraciones específicas') + '\n' +
    extractBlock('const FRAGMENT_MILESTONES', 'function renderFragmentsProgress') + '\n' +
    extractFn('getDefaultDuelStats') + '\n' + extractFn('checkMedalsAndGetNew') + '\n' +
    'var store = getDefaultStore();', ctx);
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);
const setFragments = (ctx, n) => run(ctx, `store.unlockedMedals = FRAGMENT_MEDAL_IDS.slice(0, ${n});`);
let duelSeq = 0;
const duel = (ctx, rival, result) =>
  run(ctx, `registerOnlineDuelResult({ duelId: 'D${String(++duelSeq).padStart(9, '0')}', rivalId: '${rival}', result: '${result}' })`);
const has = (ctx, id) => run(ctx, `store.unlockedMedals.includes('${id}')`);
const BRUNO = 'BRUNO00001', CARLOS = 'CARLOS0001';

test('Revancha: A) victoria sin derrota previa NO desbloquea', () => {
  const c = makeEnv(); duel(c, BRUNO, 'win');
  assert.equal(has(c, 'duel_revancha'), false);
});
test('Revancha: B) derrota y después victoria contra el mismo rival', () => {
  const c = makeEnv(); duel(c, BRUNO, 'loss'); assert.equal(has(c, 'duel_revancha'), false);
  duel(c, BRUNO, 'win'); assert.equal(has(c, 'duel_revancha'), true);
});
test('Revancha: C) perder con Bruno, ganar a Carlos, ganar a Bruno', () => {
  const c = makeEnv(); duel(c, BRUNO, 'loss'); duel(c, CARLOS, 'win');
  assert.equal(has(c, 'duel_revancha'), false, 'ganar a otro rival no vale');
  duel(c, BRUNO, 'win'); assert.equal(has(c, 'duel_revancha'), true);
});
test('¿Otra vez tú?: 1, 2 y 3 victorias; 2+1 con otro rival no cuenta', () => {
  const c = makeEnv();
  duel(c, BRUNO, 'win'); assert.equal(has(c, 'duel_otra_vez_tu'), false);
  duel(c, BRUNO, 'win'); duel(c, CARLOS, 'win'); assert.equal(has(c, 'duel_otra_vez_tu'), false);
  duel(c, BRUNO, 'win'); assert.equal(has(c, 'duel_otra_vez_tu'), true);
});
test('Ambos logros pueden desbloquearse en la misma partida', () => {
  const c = makeEnv(); duel(c, BRUNO, 'loss'); duel(c, BRUNO, 'win'); duel(c, BRUNO, 'win');
  const r = duel(c, BRUNO, 'win');
  assert.ok(has(c, 'duel_revancha') && has(c, 'duel_otra_vez_tu'));
  assert.deepEqual(JSON.parse(JSON.stringify(r.medals.map(m => m.id))), ['duel_otra_vez_tu']); // Revancha ya estaba
});
test('Un mismo duelo (mismo ID) no cuenta dos veces; abandono no cuenta', () => {
  const c = makeEnv();
  for (let i = 0; i < 3; i++) run(c, `registerOnlineDuelResult({ duelId: 'SAMEDUEL01', rivalId: '${BRUNO}', result: 'win' })`);
  assert.equal(run(c, `store.duelStats.rivals.${BRUNO}.wins`), 1);
  run(c, `registerOnlineDuelResult({ duelId: 'FORFEIT001', rivalId: '${BRUNO}', result: 'win', forfeit: true })`);
  assert.equal(run(c, `store.duelStats.rivals.${BRUNO}.wins`), 1);
});
test('Persistencia: sobrevive a guardar/cargar (migrateStore) y sanea basura', () => {
  const c = makeEnv(); duel(c, BRUNO, 'loss'); duel(c, BRUNO, 'win');
  const restored = run(c, `migrateStore(JSON.parse(JSON.stringify(store)))`);
  assert.equal(restored.duelStats.revengeWon, true);
  assert.equal(restored.duelStats.rivals[BRUNO].wins, 1);
  assert.ok(restored.unlockedMedals.includes('duel_revancha'));
  const dirty = run(c, `migrateStore({ duelStats: { revengeWon: 'false', bestWinsVsRival: -4, rivals: { 'x<b>': {wins: 9}, ${BRUNO}: { wins: 'a', losses: 2 } } } })`);
  assert.equal(dirty.duelStats.revengeWon, false);
  assert.equal(dirty.duelStats.bestWinsVsRival, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(dirty.duelStats.rivals)), { [BRUNO]: { wins: 0, losses: 2 } });
  const old = run(c, `migrateStore({ duelStats: { played: 3, wins: 2 } })`); // guardado anterior a Prompt 4
  assert.equal(old.duelStats.wins, 2); assert.deepEqual(JSON.parse(JSON.stringify(old.duelStats.rivals)), {});
});

test('Fragmentos: bonus 0/0/+1/+1/+1/+2 (15 NO es +3)', () => {
  const c = makeEnv();
  const bonus = n => { setFragments(c, n); return run(c, 'getLucidezBonusLives(store)'); };
  assert.equal(bonus(0), 0); assert.equal(bonus(11), 0);
  assert.equal(bonus(12), 1); assert.equal(bonus(13), 1); assert.equal(bonus(14), 1);
  assert.equal(bonus(15), 2);
  assert.equal(run(c, 'LUCIDEZ_BASE_LIVES + getLucidezBonusLives(store)'), 4);
});
test('Fragmentos: máximo sigue en 15 y el bonus no consume Fragmentos', () => {
  const c = makeEnv(); setFragments(c, 15);
  assert.equal(run(c, 'FRAGMENT_TOTAL'), 15); assert.equal(run(c, 'getFragmentCount(store)'), 15);
  run(c, 'getLucidezBonusLives(store)'); assert.equal(run(c, 'getFragmentCount(store)'), 15);
});
test('Fragmentos: persistencia del bonus tras guardar/cargar', () => {
  const c = makeEnv();
  for (const [n, expected] of [[12, 1], [15, 2]]) {
    setFragments(c, n);
    const restored = run(c, 'migrateStore(JSON.parse(JSON.stringify(store)))');
    c.tmp = restored;
    assert.equal(run(c, 'getLucidezBonusLives(tmp)'), expected);
  }
});
test('Fragmentos: aviso de hito una sola vez; 15 directo avisa solo el de 15', () => {
  const c = makeEnv(); setFragments(c, 11);
  assert.equal(run(c, 'checkFragmentRewardsAndGetNew()'), null);
  setFragments(c, 12); assert.equal(run(c, 'checkFragmentRewardsAndGetNew().fragments'), 12);
  assert.equal(run(c, 'checkFragmentRewardsAndGetNew()'), null);
  setFragments(c, 15); assert.equal(run(c, 'checkFragmentRewardsAndGetNew().fragments'), 15);
  assert.equal(run(c, 'checkFragmentRewardsAndGetNew()'), null);
  const d = makeEnv(); setFragments(d, 15);
  assert.equal(run(d, 'checkFragmentRewardsAndGetNew().fragments'), 15);
  assert.equal(run(d, 'checkFragmentRewardsAndGetNew()'), null);
});
test('Errores perdonados: se gastan en orden, en cualquier fase, y solo el bonus', () => {
  const c = makeEnv();
  for (const [frag, expected] of [[0, 0], [11, 0], [12, 1], [14, 1], [15, 2]]) {
    setFragments(c, frag);
    run(c, 'var g = { lucidezForgiveLeft: getLucidezBonusLives(store) }');
    let used = 0;
    for (let k = 0; k < 4; k++) if (run(c, 'tryForgiveLucidezError(g)')) used++;
    assert.equal(used, expected, frag + ' Fragmentos');
    assert.equal(run(c, 'g.lucidezForgiveLeft'), 0);
  }
});
test('Errores perdonados: nunca en Duelo ni en partidas sin el campo (antiguas)', () => {
  const c = makeEnv();
  assert.equal(run(c, 'tryForgiveLucidezError({ isDuel: true, lucidezForgiveLeft: 2 })'), false);
  assert.equal(run(c, 'tryForgiveLucidezError({})'), false);
  assert.equal(run(c, 'tryForgiveLucidezError(null)'), false);
});
test('Errores perdonados: el bonus se fija al empezar (no cambia a mitad de partida)', () => {
  const c = makeEnv(); setFragments(c, 12);
  run(c, 'var g = { lucidezForgiveLeft: getLucidezBonusLives(store) }');
  setFragments(c, 15);
  assert.equal(run(c, 'g.lucidezForgiveLeft'), 1);
});
test('Los IDs de logro son únicos y los nuevos existen', () => {
  const c = makeEnv();
  const ids = run(c, 'ALL_MEDALS.map(m => m.id)');
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('duel_revancha') && ids.includes('duel_otra_vez_tu'));
});

test('Caja de Fragmentos: hitos y mensaje del siguiente objetivo', () => {
  const c = makeEnv();
  const st = n => JSON.parse(JSON.stringify(run(c, `getFragmentMilestoneState(${n})`)));
  const flags = n => st(n).items.map(i => i.unlocked);
  assert.deepEqual(flags(0), [false, false, false]);
  assert.deepEqual(flags(9), [false, false, false]);
  assert.deepEqual(flags(10), [true, false, false]);
  assert.deepEqual(flags(11), [true, false, false]);
  assert.deepEqual(flags(12), [true, true, false]);
  assert.deepEqual(flags(14), [true, true, false]);
  assert.deepEqual(flags(15), [true, true, true]);
  assert.equal(st(7).message, 'Te faltan 3 Fragmentos para desbloquear Lucidez Mental.');
  assert.equal(st(9).message, 'Te falta 1 Fragmento para desbloquear Lucidez Mental.');
  assert.equal(st(10).message, 'Te faltan 2 Fragmentos para conseguir +1 error extra.');
  assert.equal(st(12).message, 'Te faltan 3 Fragmentos para conseguir +2 errores extra.');
  assert.equal(st(15).message, 'Todas las ventajas desbloqueadas.');
  assert.equal(st(15).complete, true); assert.equal(st(14).complete, false);
});
