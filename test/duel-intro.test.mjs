// Duelos: desbloqueo (10 partidas o 100 aciertos), presentación de la primera vez y ayuda. Script clásico en un vm mínimo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../src/ui/duel-intro.js', import.meta.url), 'utf8');
const HTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function load(ls = {}) {
  const win = {};
  const ctx = { window: win, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } }, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, Math, Number, isFinite };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { M: win.SEQDuelIntro, ls };
}

test('bloqueado por debajo del nivel 5; se abre al llegar a 700 XP', () => {
  const { M } = load();
  assert.equal(M.gate({ xp: 0 }).open, false);
  assert.equal(M.gate({ xp: 699 }).open, false);
  assert.equal(M.gate({ xp: 700 }).open, true);
  const g = JSON.parse(JSON.stringify(M.gate({ xp: 250 })));
  assert.equal(g.level, 3); assert.equal(g.needLevel, 5); assert.equal(g.missing, 450); assert.equal(g.needXp, 700);
  assert.equal(M.gate({}).open, false);
  assert.equal(M.gate(null).open, false);
});

test('quien ya usó los duelos nunca se bloquea (ayuda vista, historial o desbloqueo anotado)', () => {
  assert.equal(load({ siredwards_quiz_v1_1_duel_help_seen: '1' }).M.gate({ xp: 10 }).open, true);
  assert.equal(load({ siredwards_quiz_duel_unlocked: '1' }).M.gate({}).open, true);
  assert.equal(load().M.gate({ duelStats: { played: 2 } }).open, true);
  assert.equal(load().M.gate({ duelStats: { multiWins: 1 } }).open, true);
});

test('la ayuda lleva el texto nuevo y no el viejo; la presentación avisa y se despide', () => {
  const { M } = load();
  const h = M.helpHtml();
  for (const t of ['Jugáis a la vez', 'Cuerdo (±1)', 'Insensato (±3)', 'valen el doble', 'dentro del plazo de 3 días', 'El Múltiple tiene sus propias estadísticas y logros']) assert.ok(h.includes(t), t);
  for (const t of ['En directo', 'cuando quiera', 'Sir Edwards ya sabe']) assert.ok(!h.includes(t), t);
  assert.match(SRC, /Dije que no habría tutorial/);
  assert.match(SRC, /no me dejes mal/i);
});

test('index.html: enlaza módulo y estilos, engancha switchTab y la ayuda se pinta desde el módulo', () => {
  assert.match(HTML, /src\/ui\/duel-intro\.js\?v=/);
  assert.match(HTML, /styles\/duel-intro\.css\?v=/);
  assert.match(HTML, /SEQDuelIntro\.intercept\(\)/);
  assert.match(HTML, /SEQDuelIntro\.introIfNeeded\(\)/);
  assert.match(HTML, /id="duel-help-body"/);
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /src\/ui\/duel-intro\.js/); assert.match(sw, /styles\/duel-intro\.css/);
});
