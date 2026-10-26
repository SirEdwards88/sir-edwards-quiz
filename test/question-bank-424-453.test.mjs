// Lote de 30 preguntas (IDs 424-453): banco de test, banco de Lucidez (escritas) y su comprobación de respuestas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { sabiasOk } from './_sabias.mjs';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(read('src/data/questions.js') + read('src/utils/matching.js') + read('src/utils/answer-alias.js') +
  ';this.T=TEST_QUESTIONS;this.Q=QUESTIONS;this.m=isMatchWithAlias;', ctx);
const { T, Q } = ctx;
const inRange = (q) => q.n >= 424 && q.n <= 453;
const NEW_T = T.filter(inRange), NEW_Q = Q.filter(inRange);

test('las 30 entran en los dos bancos, con los mismos ID, texto y respuesta', () => {
  assert.equal(NEW_T.length, 30);
  assert.equal(NEW_Q.length, 30);
  for (const q of NEW_Q) {
    const t = T.find((x) => x.n === q.n);
    assert.equal(q.q, t.q); assert.equal(q.a, t.a); assert.equal(q.cat, t.cat); assert.equal(q.dif, t.dif);
    assert.ok(!q.options, 'el banco de Lucidez no lleva opciones (' + q.n + ')');
  }
});

test('ajustes aprobados: la 439 reconstruida, 424/434/435 en medio y las curiosidades reescritas', () => {
  const g = (n) => T.find((q) => q.n === n);
  assert.equal(g(439).a, 'Parásitos');
  assert.deepEqual([424, 434, 435].map((n) => g(n).dif), ['medio', 'medio', 'medio']);
  assert.equal(g(452).dif, 'dificil');
  assert.match(g(425).sabias, /Gran Kan/);
  assert.match(g(444).sabias, /graphein/);
  assert.ok(NEW_T.every((q) => sabiasOk(q)));
});

test('Lucidez: 28 elegibles (432 y 451 no, por admitir otras respuestas válidas); las fáciles y las menos canónicas pesan 1', () => {
  assert.deepEqual(Array.from(NEW_Q.filter((q) => !q.lz), (q) => q.n), [432, 451]);
  assert.ok(NEW_Q.filter((q) => q.dif === 'facil').every((q) => q.lz === 'B'));
  assert.ok([427, 430, 446].every((n) => NEW_Q.find((q) => q.n === n).lz === 'B'));
  assert.ok(NEW_Q.filter((q) => q.lz).every((q) => q.lz === 'A' || q.lz === 'B'));
});

test('Lucidez: la respuesta correcta y sus variantes habituales se aceptan; las demás opciones, no', () => {
  const ok = { 424: ['Caligula'], 428: ['La bola negra', 'negra'], 430: ['Mayweather'], 431: ['triatlon', 'Triathlon'],
    435: ['Arquímedes', 'Ley de Arquímedes'], 436: ['Morse'], 441: ['Hongos', 'Fungi', 'Reino Fungi'], 445: ['Janus'],
    446: ['3', 'tres'], 447: ['Rosetta'], 449: ['Colibrí', 'Picaflor'], 453: ['La antigua China'] };
  for (const q of NEW_Q) {
    assert.ok(ctx.m(q.a, q), 'la respuesta ' + q.n);
    for (const v of ok[q.n] || []) assert.ok(ctx.m(v, q), 'variante «' + v + '» en ' + q.n);
    const t = T.find((x) => x.n === q.n);
    for (const o of t.options) if (o !== q.a) assert.ok(!ctx.m(o, q), 'opción incorrecta aceptada en ' + q.n + ': ' + o);
  }
});
