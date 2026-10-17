// Duelo múltiple: el registro de logros (src/state/multi-result.js) anota los hitos del SERVIDOR una sola vez por sala,
// no toca las estadísticas del 1 vs 1 y las medallas del múltiple se consiguen con ellos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

function env() {
  const ctx = { console, toasts: [], saved: 0 }; ctx.window = ctx;
  ctx.store = { duelPlayedCodes: [], duelStats: { played: 3, wins: 1, losses: 2, draws: 0 }, unlockedMedals: [] };
  vm.createContext(ctx);
  vm.runInContext(read('src/data/medals.js') + '\n;this.ALL_MEDALS = ALL_MEDALS;', ctx);
  ctx.checkMedalsAndGetNew = () => {
    const nuevos = ctx.ALL_MEDALS.filter((m) => m.id.startsWith('multi_') && !ctx.store.unlockedMedals.includes(m.id) && m.check(ctx.store));
    nuevos.forEach((m) => ctx.store.unlockedMedals.push(m.id));
    return nuevos;
  };
  ctx.checkFragmentRewardsAndGetNew = () => null;
  ctx.saveStore = () => { ctx.saved++; };
  ctx.showInfoToast = (t) => ctx.toasts.push(t);
  vm.runInContext(read('src/state/multi-result.js'), ctx);
  return ctx;
}
const hit = (o) => ({ victoria: false, mesa_completa: false, corriente: false, niebla: false, ultimo: false, ...o });

test('una sala se registra una sola vez y no toca las estadísticas del 1 vs 1', () => {
  const c = env();
  const a = c.window.SEQMultiResult.register({ duelId: 'S1', hitos: hit({ victoria: true, mesa_completa: true }) });
  assert.deepEqual(Array.from(a.medals, (m) => m.id), ['multi_mesa_completa']);
  assert.equal(c.window.SEQMultiResult.register({ duelId: 'S1', hitos: hit({ victoria: true, mesa_completa: true }) }), null, 'repetir la sala no cuenta otra vez');
  assert.equal(c.store.duelStats.multiWins, 1);
  assert.deepEqual([c.store.duelStats.played, c.store.duelStats.wins, c.store.duelStats.losses], [3, 1, 2]);
  assert.ok(c.store.duelPlayedCodes.includes('multi:S1'));
});

test('las cinco medallas del múltiple se consiguen con los hitos del servidor', () => {
  const c = env();
  const got = (r) => (r ? Array.from(r.medals, (m) => m.id) : []);
  assert.deepEqual(got(c.window.SEQMultiResult.register({ duelId: 'a', hitos: hit({ victoria: true, corriente: true }) })), ['multi_contra_la_corriente']);
  assert.deepEqual(got(c.window.SEQMultiResult.register({ duelId: 'b', hitos: hit({ victoria: true, niebla: true }) })), ['multi_entre_la_niebla']);
  assert.deepEqual(got(c.window.SEQMultiResult.register({ duelId: 'c', hitos: hit({ ultimo: true }) })), ['multi_alguien_tenia_que_perder']);
  assert.deepEqual(got(c.window.SEQMultiResult.register({ duelId: 'd', hitos: hit({ victoria: true }) })), []);
  assert.deepEqual(got(c.window.SEQMultiResult.register({ duelId: 'e', hitos: hit({ victoria: true }) })), []);
  assert.deepEqual(got(c.window.SEQMultiResult.register({ duelId: 'f', hitos: hit({ victoria: true }) })), ['multi_costumbre_preocupante'], '5.ª victoria');
  assert.equal(c.store.duelStats.multiWins, 5);
  assert.ok(c.toasts.length >= 1 && c.saved >= 1);
});

test('sin hitos válidos no se registra nada', () => {
  const c = env();
  assert.equal(c.window.SEQMultiResult.register({ duelId: 'x' }), null);
  assert.equal(c.window.SEQMultiResult.register({ hitos: hit({ victoria: true }) }), null);
  assert.equal(c.window.SEQMultiResult.register(null), null);
  assert.equal(c.store.duelStats.multiWins, undefined);
});

test('integración mínima: scripts, service worker y sincronización de los campos nuevos', () => {
  assert.match(read('index.html'), /src\/state\/multi-result\.js\?v=\d+/);
  assert.ok(read('sw.js').includes("'./src/state/multi-result.js'"));
  const merge = read('src/utils/sync-merge.js');
  for (const f of ['multiWins', 'multiMesaCompleta', 'multiCorriente', 'multiNiebla', 'multiUltimo']) assert.ok(merge.includes("duelStats." + f), f + ' se sincroniza');
  assert.match(read('src/online/duels.js'), /SEQMultiResult\.register/);
  assert.match(read('src/online/multi-duels.js'), /medalsBlock\('multi:'/);
});
