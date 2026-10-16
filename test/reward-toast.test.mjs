import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load() {
  const ctx = { window: {}, document: { getElementById: () => null }, setTimeout, FRAGMENT_MEDAL_IDS: ['frag_a', 'frag_b'], getMedalAvatar: (id) => (id === 'av_a' || id === 'av_b' ? 'x' : null) };
  vm.runInNewContext(fs.readFileSync('src/ui/reward-toast.js', 'utf8'), ctx);
  return ctx.window.SEQRewardToast;
}
const m = (id, title) => ({ id, title });

test('logros sin recompensa: ningún aviso', () => {
  assert.equal(load().message([m('games_5', 'Cliente Habitual')]), '');
});
test('un logro con avatar o fragmento: aviso con su nombre', () => {
  const t = load();
  assert.equal(t.message([m('av_a', 'Imparable')]), 'Logro conseguido: Imparable · avatar desbloqueado');
  assert.equal(t.message([m('frag_a', 'Mente Fracturada')]), 'Logro conseguido: Mente Fracturada · +1 Fragmento de Mente');
});
test('varias recompensas se agrupan en un solo aviso, ignorando los logros normales', () => {
  const t = load();
  assert.equal(t.message([m('av_a', 'A'), m('av_b', 'B'), m('frag_a', 'C'), m('games_5', 'D')]), 'Nuevas recompensas: 2 avatares y 1 Fragmento de Mente');
});
