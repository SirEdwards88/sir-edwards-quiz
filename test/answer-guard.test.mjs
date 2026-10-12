// 2.4: la guarda del corrector de respuestas escritas (src/utils/answer-alias.js) no da por buena otra opción del banco.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
const strip = (s) => s.replace(/^const (\w+) =/gm, 'globalThis.$1 =');
vm.runInContext(read('src/utils/matching.js') + strip(read('src/data/questions.js')) + strip(read('src/data/lucidez.js')) +
  read('src/utils/answer-alias.js') + ';this.M=isMatchWithAlias;this.Q=QUESTIONS;this.T=TEST_QUESTIONS;this.R=LUCIDEZ_RIDDLES;', ctx);
const { M, Q, T, R } = ctx;
const q = (n) => Q.find((x) => x.n === n);

test('toda respuesta y todo alias del banco escrito se aceptan a sí mismos', () => {
  for (const x of Q) for (const a of [x.a, ...(x.alias || [])]) assert.ok(M(a, x), x.n + ' «' + a + '»');
});

test('ningún distractor del banco tipo test se acepta como respuesta escrita', () => {
  for (const x of Q) {
    const t = T.find((y) => y.n === x.n);
    if (!t || !t.options) continue;
    for (const o of t.options) if (o !== x.a) assert.ok(!M(o, x), x.n + ' «' + o + '» no es «' + x.a + '»');
  }
});

test('casos concretos: La Niña, Fisión, O+, difracción, expresionismo, ISSN, Minos', () => {
  const casos = [[405, 'La Niña', false], [405, 'El Niño', true], [405, 'Niño', true], [314, 'Fisión nuclear', false], [314, 'fusión nuclar', true],
    [148, 'negativo', false], [148, 'O+', false], [148, 'o', false], [148, 'O-', true], [148, 'O negativo', true],
    [153, 'La difracción', false], [193, 'Expresionismo', false], [356, 'ISSN', false], [288, 'Minos', false], [288, 'rey', false], [288, 'Midas', true],
    [45, 'Guerra de Secesión', false]];
  for (const [n, u, ok] of casos) assert.equal(M(u, q(n)), ok, n + ' «' + u + '»');
});

test('una palabra del enunciado no es una respuesta', () => {
  assert.equal(M('tratado', { n: 0, q: '¿Qué tratado de 1494 repartió el mundo?', a: 'El Tratado de Tordesillas' }), false);
  assert.equal(M('Tordesillas', { n: 0, q: '¿Qué tratado de 1494 repartió el mundo?', a: 'El Tratado de Tordesillas' }), true);
});

test('Enigma Final: formas naturales válidas y partes sueltas no', () => {
  const si = [[2, 'cinco'], [2, '5'], [3, 'm'], [9, 'cuatro'], [10, '10 y 20'], [10, '20 y 10'], [13, '23 gallinas y 12 conejos'], [14, 'segundo'],
    [15, 'cuatro'], [18, 'cinco'], [20, '500 g'], [20, 'medio kilo'], [20, '1/2 kg'], [20, '0,5 kg'], [5, 'cuatrocientos veintiuno'], [8, 'cuarenta y dos']];
  const no = [[6, 'caballo'], [6, 'domingo'], [19, 'entre'], [17, '7'], [20, '1 kg'], [9, 'cinco'], [14, 'primero'], [12, 'hijo']];
  for (const [i, u] of si) assert.ok(M(u, R[i]), i + ' «' + u + '»');
  for (const [i, u] of no) assert.ok(!M(u, R[i]), i + ' «' + u + '»');
});
