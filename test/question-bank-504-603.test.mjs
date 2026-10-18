// Lote de 100 preguntas de razonamiento (IDs 504-603). Todas van al modo test; las medias y difíciles se reflejan también en el banco de
// Lucidez (como exige test/question-bank-2-2), pero solo las de respuesta corta son jugables allí (llevan lz y alias).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(read('src/data/questions.js') + read('src/utils/matching.js') + read('src/utils/answer-alias.js') +
  ';this.T=TEST_QUESTIONS;this.Q=QUESTIONS;this.m=isMatchWithAlias;', ctx);
const { T, Q } = ctx;
const NEW = T.filter((q) => q.n >= 504 && q.n <= 603);
const OLD = T.filter((q) => q.n < 504);

test('son 100, con IDs 504-603 seguidos, y no se toca ninguna anterior', () => {
  assert.deepEqual(Array.from(NEW, (q) => q.n), Array.from({ length: 100 }, (_, i) => 504 + i));
  assert.equal(OLD.length, 500);
});

test('Lucidez: solo las 7 de respuesta corta jugables están en Lucidez (mismo texto y respuesta, sin opciones)', () => {
  const NQ = Q.filter((q) => q.n >= 504 && q.n <= 603);
  assert.deepEqual(Array.from(NQ, (q) => q.n), [545, 558, 560, 566, 571, 585, 590]);
  for (const q of NQ) {
    const t = T.find((x) => x.n === q.n);
    assert.equal(q.q, t.q); assert.equal(q.a, t.a); assert.equal(q.sabias, t.sabias); assert.ok(!q.options);
  }
  assert.deepEqual(Array.from(NQ.filter((q) => q.lz), (q) => q.n), [545, 558, 560, 566, 571, 585, 590]);
});

test('Lucidez: la respuesta y sus variantes se aceptan; las demás opciones, no', () => {
  const m = ctx.m;
  for (const q of Q.filter((x) => x.n >= 504 && x.lz)) {
    assert.ok(m(q.a, q), 'la respuesta ' + q.n);
    for (const v of q.alias || []) assert.ok(m(v, q), 'variante «' + v + '» en ' + q.n);
    const t = T.find((x) => x.n === q.n);
    for (const o of t.options) if (o !== q.a) assert.ok(!m(o, q), 'opción incorrecta aceptada en ' + q.n + ': ' + o);
  }
});

test('formato: 4 opciones distintas con la respuesta entre ellas, categoría y dificultad válidas y un «Sabías que» de hasta 140 caracteres', () => {
  const cats = ['historia', 'geografia', 'ciencia', 'arte_literatura', 'deporte', 'cultura_general'];
  for (const q of NEW) {
    assert.equal(q.options.length, 4, '' + q.n);
    assert.equal(new Set(q.options).size, 4, '' + q.n);
    assert.ok(q.options.includes(q.a), '' + q.n);
    assert.ok(cats.includes(q.cat), '' + q.n);
    assert.ok(['facil', 'medio', 'dificil'].includes(q.dif), '' + q.n);
    assert.ok(q.sabias && q.sabias.length <= 140, 'sabías de ' + q.n + ': ' + (q.sabias || '').length);
    assert.ok(q.q.length <= 130, 'enunciado largo en ' + q.n);
  }
});

test('reparto: 26 fáciles, 56 medias y 18 difíciles; la respuesta cae en las cuatro posiciones por igual', () => {
  const c = (f) => NEW.filter(f).length;
  assert.deepEqual([c((q) => q.dif === 'facil'), c((q) => q.dif === 'medio'), c((q) => q.dif === 'dificil')], [26, 56, 18]);
  for (let p = 0; p < 4; p++) assert.equal(c((q) => q.options.indexOf(q.a) === p), 25);
});

test('sin pistas de estilo: la correcta no es sistemáticamente la más larga ni la única con matices', () => {
  const longest = NEW.filter((q) => q.options.every((o) => o === q.a || q.a.length > o.length)).length;
  assert.ok(longest <= 40, 'la correcta es la más larga en ' + longest + ' de 100');
  const hedge = /\b(puede|pueden|suele|suelen|normalmente|habitualmente|a menudo|probablemente)\b/i;
  assert.equal(NEW.filter((q) => hedge.test(q.a)).length, 0);
  for (const q of NEW) {
    const wrong = q.options.filter((o) => o !== q.a);
    assert.ok(Math.max(...wrong.map((o) => o.length)) >= 0.7 * q.a.length || q.a.length < 20, 'distractores muy cortos en ' + q.n);
  }
});

test('ninguna repite un enunciado ni una respuesta del banco anterior', () => {
  const norm = (s) => s.toLowerCase().replace(/[^a-záéíóúñü0-9 ]/g, '').trim();
  const qs = new Set(OLD.concat(Q.filter((q) => q.n < 504)).map((q) => norm(q.q)));
  for (const q of NEW) assert.ok(!qs.has(norm(q.q)), 'enunciado repetido en ' + q.n);
  assert.equal(new Set(NEW.map((q) => norm(q.q))).size, 100);
});
