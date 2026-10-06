// v2.0 — el Duelo por código se ha retirado: solo quedan Duelo online y Retos (con cuenta y amigos).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const duels = fs.readFileSync(new URL('../src/online/duels.js', import.meta.url), 'utf8');

test('no queda ninguna entrada ni texto del Duelo por código', () => {
  for (const re of [/Unirme a un reto/, /openDuelPanel/, /openCodeHub/, /startDuelGameCommon/, /handleDuelFinish\(currentGame/, /\?reto=/, /Compartir reto/, /duel-panel-/, /duel-join-code/]) {
    assert.ok(!re.test(html), 'index.html contiene ' + re);
    assert.ok(!re.test(duels), 'duels.js contiene ' + re);
  }
  assert.ok(!fs.readFileSync(new URL('../src/utils/duel.js', import.meta.url), 'utf8').includes('SRW'), 'sin códigos SRW');
});

// Extrae registerOnlineDuelResult y getDefaultDuelStats de index.html y las prueba aisladas.
function load() {
  const grab = (name) => { const i = html.indexOf('function ' + name + '('); const j = html.indexOf('\n}\n', i); return html.slice(i, j + 3); };
  const store = { duelPlayedCodes: [], duelStats: null };
  const ctx = { store, checkMedalsAndGetNew: () => [], checkFragmentRewardsAndGetNew: () => null, saveStore: () => {} };
  vm.createContext(ctx);
  vm.runInContext(grab('getDefaultDuelStats') + grab('registerOnlineDuelResult'), ctx);
  return ctx;
}
const play = (c, id, rival, result, me, them, extra = {}) => c.registerOnlineDuelResult({ duelId: id, rivalId: rival, result, myScore: me, opponentScore: them, ...extra });

test('el Duelo online alimenta partidas, victorias, derrotas y empates', () => {
  const c = load();
  play(c, 'a', 'R1', 'win', 15, 14);
  play(c, 'b', 'R1', 'loss', 10, 12);
  play(c, 'c', 'R2', 'draw', 9, 9);
  const s = c.store.duelStats;
  assert.equal(s.played, 3); assert.equal(s.wins, 1); assert.equal(s.losses, 1); assert.equal(s.draws, 1);
});
test('márgenes: por 1 punto y por 10 o más', () => {
  const c = load();
  play(c, 'a', 'R1', 'win', 15, 14);
  assert.equal(c.store.duelStats.wonByOnePoint, true); assert.equal(c.store.duelStats.wonByTenPlus, false);
  play(c, 'b', 'R2', 'win', 20, 5);
  assert.equal(c.store.duelStats.wonByTenPlus, true);
});
test('rachas, revancha y ganar 3 veces al mismo rival', () => {
  const c = load();
  play(c, 'a', 'R1', 'loss', 5, 9);
  play(c, 'b', 'R1', 'win', 9, 5);
  assert.equal(c.store.duelStats.revengeWon, true);
  play(c, 'c', 'R1', 'win', 9, 5); play(c, 'd', 'R1', 'win', 9, 5);
  assert.equal(c.store.duelStats.bestWinsVsRival, 3);
  assert.equal(c.store.duelStats.bestWinStreak, 3);
  play(c, 'e', 'R2', 'draw', 5, 5);
  assert.equal(c.store.duelStats.currentWinStreak, 0);
});
test('un duelo no cuenta dos veces, ni el abandonado, ni resultados raros', () => {
  const c = load();
  assert.ok(play(c, 'a', 'R1', 'win', 15, 14));
  assert.equal(play(c, 'a', 'R1', 'win', 15, 14), null);
  assert.equal(play(c, 'b', 'R1', 'win', 15, 0, { forfeit: true }), null);
  assert.equal(play(c, 'c', 'R1', 'ganó', 1, 0), null);
  assert.equal(c.store.duelStats.played, 1);
});
test('los logros de Duelo son alcanzables con los datos que produce el Duelo online', async () => {
  const src = fs.readFileSync(new URL('../src/data/medals.js', import.meta.url), 'utf8');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(src.replace(/^const /gm, 'var '), ctx);
  const duelMedals = ctx.ALL_MEDALS.filter((m) => m.id.startsWith('duel_'));
  assert.ok(duelMedals.length >= 8);
  const c = load();
  for (let i = 0; i < 6; i++) play(c, 'w' + i, 'R1', 'win', i === 0 ? 15 : 20, i === 0 ? 14 : 5);
  play(c, 'l0', 'R2', 'loss', 1, 5); play(c, 'l1', 'R2', 'loss', 1, 5); play(c, 'r', 'R2', 'win', 8, 7);
  for (let i = 0; i < 3; i++) play(c, 'd' + i, 'R3', 'draw', 5, 5);
  // 2.1: remontada, apuesta final y apuesta calculada las decide el SERVIDOR (resultado.hitos de cada duelo).
  play(c, 'h0', 'R4', 'win', 9, 8, { hitos: { comeback: true, last_word: true, stakes_last_madness: true, stakes_all_three: true } });
  const earned = duelMedals.filter((m) => m.check(c.store)).map((m) => m.id);
  assert.equal(earned.length, duelMedals.length, 'faltan: ' + duelMedals.filter((m) => !earned.includes(m.id)).map((m) => m.id).join(', '));
});
