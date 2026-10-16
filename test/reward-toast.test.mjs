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

test('logros sin recompensa: ninguna tarjeta', () => {
  assert.equal(load().cards([m('games_5', 'Cliente Habitual')]).length, 0);
});
test('un logro con avatar o fragmento: una tarjeta con su recompensa', () => {
  const t = load();
  assert.equal(JSON.stringify(t.cards([m('av_a', 'Imparable')]).map(c => [c.title, c.reward])), JSON.stringify([['Imparable', 'Avatar desbloqueado']]));
  assert.equal(t.cards([m('frag_a', 'Mente Fracturada')])[0].reward, '+1 Fragmento de Mente');
});
test('varios logros: una tarjeta por cada uno con recompensa, en orden, sin los normales', () => {
  const c = load().cards([m('av_a', 'A'), m('games_5', 'D'), m('frag_a', 'C'), m('av_b', 'B')]);
  assert.equal(c.map(x => x.title).join(','), 'A,C,B');
});
