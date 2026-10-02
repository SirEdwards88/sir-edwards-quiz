// Contrarreloj: lo jugado hace poco va al final de la cola (src/utils/fresh-first.js), sin tocar la bolsa ni los demás modos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

function loadFreshFirst() {
  const c = vm.createContext({});
  vm.runInContext(read('src/utils/fresh-first.js') + ';globalThis.f = freshFirst;', c);
  return c.f;
}
// pickDiverseFromBag real (copiado de index.html), con un store y un barajado propios.
function loadPicker(store) {
  const i = html.indexOf('function pickDiverseFromBag');
  const src = html.slice(i, html.indexOf('\n}\n', i) + 3);
  const shuffleArray = (a) => { a = a.slice(); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } return a; };
  const c = vm.createContext({ store, shuffleArray });
  vm.runInContext(src + ';globalThis.p = pickDiverseFromBag;', c);
  return c.p;
}
const bank = Array.from({ length: 360 }, (_, n) => ({ n, cat: ['a', 'b', 'c', 'd', 'e', 'f'][n % 6] }));

test('freshFirst: primero las no recientes (mismo orden), después las recientes; no pierde ni duplica', () => {
  const f = loadFreshFirst();
  const q = [1, 2, 3, 4, 5, 6].map((n) => ({ n }));
  const ns = (r) => Array.from(r, (x) => x.n); // los arrays de vm son de otro «realm»
  assert.deepEqual(ns(f(q, [2, 5])), [1, 3, 4, 6, 2, 5]);
  assert.deepEqual(ns(f(q, [])), [1, 2, 3, 4, 5, 6], 'sin recientes no cambia nada');
  assert.deepEqual(ns(f(q, undefined)), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(ns(f(q, [1, 2, 3, 4, 5, 6])), [1, 2, 3, 4, 5, 6], 'si todo es reciente, sigue funcionando');
  assert.equal(f([], [1]).length, 0);
});

test('Contrarreloj (cola real de 360 con 60 recientes): ninguna reciente entre las primeras 300 y siguen estando las 360 una sola vez', () => {
  const f = loadFreshFirst();
  for (let run = 0; run < 200; run++) {
    const recent = Array.from({ length: 60 }, (_, k) => (k * 7 + run) % 360);
    const store = { questionBags: {}, lastQuestionInBag: {}, recentQuestionIds: recent };
    const raw = loadPicker(store)('full', bank, bank.length, []);
    const q = f(raw, store.recentQuestionIds);
    const rs = new Set(recent);
    assert.equal(q.length, 360);
    assert.equal(new Set(q.map((x) => x.n)).size, 360, 'sin duplicados dentro de una vuelta');
    assert.ok(q.slice(0, 300).every((x) => !rs.has(x.n)), 'las 300 primeras son frescas');
    assert.ok(q.slice(300).every((x) => rs.has(x.n)), 'las recientes quedan al final');
  }
});

test('Contrarreloj usa freshFirst y solo ahí; la bolsa «full» y las de los demás modos no cambian', () => {
  assert.match(html, /queue = pickDiverseFromBag\('full', TEST_QUESTIONS, TEST_QUESTIONS\.length, \[\]\);\s*(\/\/[^\n]*\n\s*)?queue = freshFirst\(queue, store\.recentQuestionIds\);/);
  assert.equal((html.match(/freshFirst\(/g) || []).length, 1, 'solo se llama desde Contrarreloj');
  assert.match(html, /pickDiverseFromBag\('facil', pools\.facil, numBlocks \* 4, recentCategories\)/, 'Estándar sin cambios');
  assert.match(html, /queue\.push\(\.\.\.pickDiverseFromBag\(d, pools\[d\], counts\[d\], recentCategories\)\)/, 'Supervivencia sin cambios');
  assert.match(html, /facil: pickDiverseFromBag\('facil', pools\.facil, need\.facil, recentCategories\)/, 'Muerte Súbita sin cambios');
});

test('el módulo está enlazado en index.html y en la lista sin conexión de sw.js', () => {
  assert.match(html, /<script src="src\/utils\/fresh-first\.js\?v=\d+"><\/script>/);
  assert.match(read('sw.js'), /'\.\/src\/utils\/fresh-first\.js'/);
});
