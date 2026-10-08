// Encargos: quien recupera el progreso de su cuenta no vuelve a pasar por la presentación (la marca es local al dispositivo).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function load() {
  const mem = {};
  const ctx = { localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(read('src/ui/encargos-intro.js'), ctx);
  return { intro: vm.runInContext('SEQEncargosIntro', ctx), mem };
}

test('markSeen da la presentación por vista una sola vez y conserva el día original', () => {
  const { intro, mem } = load();
  assert.equal(intro.seen(), false);
  intro.markSeen();
  assert.equal(intro.seen(), true);
  const first = mem['siredwards_quiz_encargos_intro_seen'];
  assert.match(first, /^\d{4}-\d{2}-\d{2}$/);
  mem['siredwards_quiz_encargos_intro_seen'] = '2026-01-02';
  intro.markSeen();
  assert.equal(mem['siredwards_quiz_encargos_intro_seen'], '2026-01-02');
});

test('combinar el progreso de una cuenta con partidas marca la presentación como vista y repinta la tira', () => {
  const src = read('src/online/online.js');
  const m = /function doMerge[\s\S]*?\n  \}\n/.exec(src);
  assert.ok(m, 'doMerge existe');
  assert.match(m[0], /target\.games > 0\)[^\n]*SEQEncargosIntro\.markSeen\(\)[^\n]*SEQEncargosUI\.renderHome\(\)/);
});

test('empezar de cero sigue olvidando la marca (reinicio, cuenta eliminada y «Empezar de cero»)', () => {
  assert.match(read('index.html'), /removeItem\('siredwards_quiz_encargos_intro_seen'\)/);
  const online = read('src/online/online.js');
  assert.equal((online.match(/removeItem\('siredwards_quiz_encargos_intro_seen'\)/g) || []).length, 2);
});
