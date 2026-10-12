// Contrarreloj: bolsa persistente de preguntas vistas (src/state/timetrial-bag.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
function load() {
  const c = { store: { questionBags: {}, recentQuestionIds: [] } };
  vm.createContext(c);
  vm.runInContext(read('src/state/timetrial-bag.js') + ';this.B=SEQTimetrialBag;', c);
  return c;
}
const bank = Array.from({ length: 50 }, (_, i) => ({ n: i + 1 }));
const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);

test('no repite ninguna pregunta hasta haber visto todo el banco, partida tras partida', () => {
  const c = load();
  const seenInRound = new Set();
  let games = 0;
  while (seenInRound.size < bank.length && games < 50) {
    const queue = c.B.arrange(shuffle(bank));
    assert.equal(queue.length, bank.length, 'no quita ni duplica');
    for (const q of queue.slice(0, 10)) { // cada partida solo llega a 10 preguntas (50 = 5 partidas exactas)
      assert.ok(!seenInRound.has(q.n), 'repetida en la misma vuelta: ' + q.n);
      seenInRound.add(q.n); c.B.markSeen(q);
    }
    games++;
  }
  assert.equal(seenInRound.size, bank.length);
  assert.equal(games, 5);
});

test('al verse todo el banco empieza otra vuelta', () => {
  const c = load();
  bank.forEach((q) => c.B.markSeen(q));
  const queue = c.B.arrange(shuffle(bank));
  assert.equal(queue.length, bank.length);
  assert.deepEqual(Array.from(c.store.questionBags[c.B.KEY]), []);
});

test('lo jugado hace poco en otros modos va después de lo no visto, y lo visto al final', () => {
  const c = load();
  const out = c.B.order(bank, [1, 2, 3], [4, 5]);
  const ids = Array.from(out.queue.map((q) => q.n));
  assert.deepEqual(ids.slice(-3), [1, 2, 3]);
  assert.deepEqual(ids.slice(-5, -3), [4, 5]);
});

test('ids que ya no están en el banco se descartan de la memoria', () => {
  const c = load();
  const out = c.B.order(bank, [1, 999], []);
  assert.deepEqual(Array.from(out.seen), [1]);
});

test('está enlazado en index.html (tras lucidez-bag) y en el service worker; Duelo no la alimenta', () => {
  const html = read('index.html');
  assert.match(html, /<script src="src\/state\/timetrial-bag\.js\?v=\d+"><\/script>/);
  assert.ok(read('sw.js').includes("'./src/state/timetrial-bag.js'"));
  assert.match(html, /SEQTimetrialBag\.markSeen\(q\)/);
  assert.match(html, /mode === 'timetrial' && !currentGame\.isDuel\) SEQTimetrialBag/);
});
