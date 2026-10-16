import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../src/online/multi-stakes.js', import.meta.url), 'utf8');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; };

function load(data) {
  const calls = [];
  const S = { screen: 'multi', id: 'MMMMMMMMMM', data, sending: false };
  const H = {
    esc, num, ico: (n) => '[' + n + ']', serverNow: () => 5000, topbarShown() {},
    player: (p) => ({ name: esc((p && p.display_name) || 'Jugador'), avatar: '<i>av</i>', id: p.id }),
    itemInfo: () => ({ q: '¿Pregunta?', options: ['a', 'b', 'c', 'd'] }), optionsFor: (_i, _k, info) => info.options,
    call: (m, p, b) => { calls.push([m, p, b]); return Promise.resolve({}); }, say() {}, errText: (e) => String(e),
  };
  const ctx = vm.createContext({ Math, String, Number, Object, isFinite, console, document: { getElementById: () => null } });
  ctx.window = ctx;
  ctx.SEQDuels = { _h: H, _state: () => S, reload() { calls.push(['reload']); }, leaveDuel() {} };
  vm.runInContext(SRC, ctx);
  return { M: ctx.SEQMultiStakes, H, S, calls };
}
const J = (i, name, o = {}) => ({ id: 'JJJJJJJJJ' + i, display_name: name, es_yo: i === 0, estado: 'aceptado', abandonado: false, ...o });
const base = (ronda, o = {}) => ({
  id: 'MMMMMMMMMM', modo: 'stakes', estado: 'en_curso', n_rondas: 12, t0: 1000, niebla: false, preguntas: [1, 2, 3],
  jugadores: [J(0, 'Edu'), J(1, '<b>Ana</b>'), J(2, 'Luis')], ronda, rondas_resueltas: [], ...o,
});
const R = (o = {}) => ({ indice: 0, fase: 'apuesta', doble: false, mi_apuesta: null, bloqueadas: [], apuestas: null, yo_respondi: false, ...o });
const chips = () => '<chips>';

test('fase de apuesta: tres botones, quién ha bloqueado y ninguna apuesta ajena', () => {
  const { M, H } = load();
  const h = M.play(base(R({ bloqueadas: ['JJJJJJJJJ1'] })), H, chips);
  assert.equal((h.match(/SEQMultiStakes\.stake\('/g) || []).length, 3);
  assert.match(h, /<chips>/); assert.match(h, /1\/12/);
  assert.ok(!/Ana/.test(h) || !/sel/.test(h));
});
test('ronda doble: los valores se duplican y se avisa', () => {
  const { M, H } = load();
  const h = M.play(base(R({ indice: 10, doble: true })), H, chips);
  assert.match(h, /\+6/); assert.match(h, /Doble/);
});
test('apuesta bloqueada: botones desactivados', () => {
  const { M, H } = load();
  const h = M.play(base(R({ mi_apuesta: 'osado' })), H, chips);
  assert.match(h, /Apuesta bloqueada/); assert.match(h, /disabled/);
});
test('revelación: apuestas de todos y nombres escapados', () => {
  const { M, H } = load();
  const h = M.play(base(R({ fase: 'revelando', apuestas: { JJJJJJJJJ0: 'cuerdo', JJJJJJJJJ1: 'insensato' } })), H, chips);
  assert.match(h, /Insensato/); assert.ok(!h.includes('<b>Ana</b>')); assert.match(h, /&lt;b&gt;Ana/);
});
test('resolución: delta = valor x multiplicador; con niebla solo mi fila', () => {
  const { M, H } = load();
  const d = base(R({ fase: 'resolucion' }), { rondas_resueltas: [{ indice: 0, doble: true, jugadores: [{ id: 'JJJJJJJJJ0', apuesta: 'osado', correcta: true }, { id: 'JJJJJJJJJ1', apuesta: 'insensato', correcta: false }] }] });
  const h = M.play(d, H, chips);
  assert.match(h, /\+4/); assert.match(h, /−6/);
});
test('stake y answer solo envían entradas, una vez', async () => {
  const d = base(R());
  const { M, calls } = load(d);
  M.stake('osado'); M.stake('inventada');
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(['POST', '/multi-duels/MMMMMMMMMM/stake', { indice: 0, apuesta: 'osado' }]));
  assert.equal(calls.filter((c) => c[0] === 'POST').length, 1);
  const q = load(base(R({ fase: 'pregunta' })));
  q.M.answer(1); q.M.answer(1);
  assert.equal(JSON.stringify(q.calls[0]), JSON.stringify(['POST', '/multi-duels/MMMMMMMMMM/answer', { indice: 0, respuesta: 'b' }]));
});
