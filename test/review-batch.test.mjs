import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load() {
  const store = {};
  const ctx = { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/utils/review-batch.js', 'utf8'), ctx);
  return { R: ctx.SEQReviewBatch, store };
}
const pool = Array.from({ length: 82 }, (_, i) => ({ n: i + 1 }));
const ns = (l) => Array.from(l.map((q) => q.n));

test('con 82 pendientes, una partida de Repaso trae 20 distintas de la bolsa', () => {
  const { R } = load();
  const b = R.pick(pool, {});
  assert.equal(b.length, 20);
  assert.equal(new Set(ns(b)).size, 20);
  assert.ok(b.every((q) => pool.includes(q)));
});
test('salen primero las que más tiempo llevan sin aparecer (las que nunca han salido, antes que todas)', () => {
  const { R } = load();
  const seen = {};
  pool.forEach((q) => { seen[q.n] = 1000 + q.n; });          // todas vistas: la 1 la más antigua
  for (let n = 61; n <= 82; n++) delete seen[n];              // 22 nunca vistas
  const b = ns(R.pick(pool, seen));
  assert.equal(b.length, 20);
  assert.ok(b.every((n) => n >= 61), 'las nunca vistas van primero');
  const seen2 = {}; pool.forEach((q) => { seen2[q.n] = 1000 + q.n; });
  assert.deepEqual(ns(R.pick(pool, seen2)).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1), 'las 20 más antiguas');
});
test('rotación completa: en 5 tandas seguidas (82 pendientes) salen todas antes de repetir ninguna', () => {
  const { R } = load();
  const seen = {}, out = [];
  for (let k = 0; k < 5; k++) { const b = R.pick(pool, seen); out.push(...ns(b)); b.forEach((q) => { seen[q.n] = 100 + k; }); }
  assert.equal(new Set(out).size, 82, 'ninguna se queda sin salir');
});
test('con 20 o menos se repasan todas; la bolsa original no se toca; entradas raras no rompen', () => {
  const { R } = load();
  assert.equal(R.pick(pool.slice(0, 7), {}).length, 7);
  const before = pool.map((q) => q.n).join();
  R.pick(pool, {});
  assert.equal(pool.map((q) => q.n).join(), before);
  assert.deepEqual(Array.from(R.pick(null, null)), []);
  assert.equal(R.pick(pool, 'raro').length, 20);
});
test('next: anota la tanda en su propia clave y deja de guardar las que ya no están pendientes', () => {
  const { R, store } = load();
  const b = R.next(pool);
  const seen = JSON.parse(store[R.KEY]);
  assert.deepEqual(Object.keys(seen).map(Number).sort((a, c) => a - c), ns(b).sort((a, c) => a - c));
  assert.notEqual(R.KEY, 'siredwards_quiz_v1_0_data');
  const b2 = R.next(pool);                                    // la segunda tanda no repite la primera
  assert.equal(ns(b2).filter((n) => ns(b).includes(n)).length, 0);
  R.next(pool.slice(0, 5));                                   // solo quedan 5 pendientes
  assert.equal(Object.keys(JSON.parse(store[R.KEY])).length, 5);
});
test('si localStorage falla, sigue funcionando al azar', () => {
  const ctx = { localStorage: { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/utils/review-batch.js', 'utf8'), ctx);
  assert.equal(ctx.SEQReviewBatch.next(pool).length, 20);
});
test('cableado: Repaso usa la tanda, el contador de la tarjeta sigue siendo el total y el script está en el shell sin conexión', () => {
  const idx = fs.readFileSync('index.html', 'utf8');
  assert.match(idx, /SEQReviewBatch\.next\(reviewPool\)/);
  assert.match(idx, /getElementById\('repaso-count'\)\.textContent = store\.failedQuestions\.length/);
  assert.match(idx, /<script src="src\/utils\/review-batch\.js\?v=\d+"/);
  assert.match(fs.readFileSync('sw.js', 'utf8'), /\.\/src\/utils\/review-batch\.js/);
});

test('la tarjeta del modo explica las tandas de 20', () => {
  assert.match(fs.readFileSync('index.html', 'utf8'), /Tus fallos, en tandas de hasta 20. Tres aciertos seguidos y la dominas y desaparece\./);
});
