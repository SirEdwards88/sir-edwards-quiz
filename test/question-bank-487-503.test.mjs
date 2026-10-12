// Lote de 17 preguntas difíciles (IDs 487-503) que completa las 500.
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
const inRange = (q) => q.n >= 487 && q.n <= 503;
const NEW_T = T.filter(inRange), NEW_Q = Q.filter(inRange);

test('las 17 entran en los dos bancos, todas difíciles, con los mismos ID, texto y respuesta', () => {
  assert.equal(NEW_T.length, 17);
  assert.equal(NEW_Q.length, 17);
  assert.ok(NEW_T.every((q) => q.dif === 'dificil'));
  for (const q of NEW_Q) {
    const t = T.find((x) => x.n === q.n);
    assert.equal(q.q, t.q); assert.equal(q.a, t.a); assert.equal(q.cat, t.cat); assert.equal(q.dif, t.dif);
    assert.ok(!q.options, 'el banco de Lucidez no lleva opciones (' + q.n + ')');
  }
});

test('formato: 4 opciones distintas con la respuesta entre ellas y una curiosidad de hasta 140 caracteres', () => {
  for (const q of NEW_T) {
    assert.equal(q.options.length, 4, '' + q.n);
    assert.equal(new Set(q.options).size, 4, '' + q.n);
    assert.ok(q.options.includes(q.a), '' + q.n);
    assert.ok(q.sabias && q.sabias.length <= 140, 'sabías de ' + q.n);
  }
});

test('Lucidez: 16 elegibles (la 503, de explicación larga, no); la 487 y la 500 pesan 1; la 493 va emparejada con la 476', () => {
  assert.deepEqual(Array.from(NEW_Q.filter((q) => !q.lz), (q) => q.n), [503]);
  assert.deepEqual(Array.from(NEW_Q.filter((q) => q.lz === 'B'), (q) => q.n), [487, 500]);
  assert.deepEqual(Array.from(Q.find((q) => q.n === 493).par), [476]);
  assert.deepEqual(Array.from(Q.find((q) => q.n === 476).par), [493]);
});

test('Lucidez: la respuesta y sus variantes se aceptan; las demás opciones, no', () => {
  const ok = { 487: ['La Antártida', 'Antártida'], 488: ['Las Maldivas'], 489: ['Merckx'], 490: ['Scuderia Ferrari'], 491: ['Klimt'], 492: ['Tierra'],
    494: ['Ljubljana'], 495: ['Yashin', 'Lev Yachin'], 496: ['Cirílico', 'Alfabeto cirílico'], 497: ['Exosfera'], 498: ['Cachalote'],
    499: ['Melatonina'], 500: ['El Sudán'], 502: ['Joaquín Salvador Lavado'] };
  for (const q of NEW_Q) {
    assert.ok(ctx.m(q.a, q), 'la respuesta ' + q.n);
    for (const v of ok[q.n] || []) assert.ok(ctx.m(v, q), 'variante «' + v + '» en ' + q.n);
    const t = T.find((x) => x.n === q.n);
    for (const o of t.options) if (o !== q.a) assert.ok(!ctx.m(o, q), 'opción incorrecta aceptada en ' + q.n + ': ' + o);
  }
});
