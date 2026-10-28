// 2.2: alias de respuesta por pregunta (Lucidez), sin tocar matching.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(read('src/utils/matching.js') + read('src/utils/answer-alias.js') + read('src/data/questions.js') +
  ';this.M=isMatchWithAlias;this.F=isMatchFlexible;this.Q=QUESTIONS;', ctx);
const { M, F, Q } = ctx;
const q = (n) => Q.find((x) => x.n === n);

test('370 (24 segundos) acepta «24», «veinticuatro» y «veinticuatro segundos» además de la respuesta', () => {
  const p = q(370);
  assert.deepEqual(Array.from(p.alias), ['24', 'veinticuatro', 'veinticuatro segundos']);
  for (const u of ['24 segundos', '24', 'veinticuatro', '24 Segundos', 'veinticuatro segundos', 'Veinticuatro Segundos']) assert.ok(M(u, p), u);
  for (const u of ['25', '14', 'veinte', '']) assert.ok(!M(u, p), 'no debería aceptar «' + u + '»');
});

test('sin alias, la respuesta exacta y lo que no es respuesta se comportan como isMatchFlexible', () => {
  for (const n of [383, 381, 22, 27, 28]) {
    const p = q(n);
    assert.equal(p.alias, undefined);
    for (const u of [p.a, 'cualquier cosa', '']) assert.equal(M(u, p), F(u, p.a, p.q), n + ' «' + u + '»');
  }
});

test('las sustituidas aceptan las variantes de siempre (Tolstói, Suez)', () => {
  for (const u of ['Tolstói', 'tolstoi', 'León Tolstói', 'Lev Tolstoi']) assert.ok(M(u, q(414)), u);
  for (const u of ['Suez', 'El canal de Suez', 'canal suez']) assert.ok(M(u, q(383)), u);
});

test('alias malformado no rompe: se ignora', () => {
  assert.equal(M('x', { a: 'y', q: '', alias: 'no-es-array' }), false);
  assert.equal(M('seis', { a: '6', q: '¿Cuántos?', alias: ['seis'] }), true);
});

test('auditoría 5: palabras de un distractor no valen por errata («Pentatlón» no es «Heptatlón», «Fisión» no es «Fusión»)', () => {
  assert.ok(!M('Pentatlón', q(234)) && !M('Pentatlon', q(234)));
  assert.ok(M('Heptatlón', q(234)));
  assert.ok(!M('Fisión', q(314)));
  assert.ok(M('Fusión nuclear', q(314)) && M('Fusion', q(314)));
});

test('auditoría 5: alias retirados (Tiroides, Hole in one, Gasol) y alias nuevos que sí se aceptan', () => {
  assert.ok(!M('Tiroides', q(146)) && M('Yodo', q(146)));
  assert.ok(!M('Hole in one', q(324)) && M('Birdie', q(324)));
  assert.ok(!M('Gasol', q(330)) && M('Pau', q(330)));
  for (const u of ['Guerra Civil', 'Guerra civil americana']) assert.ok(M(u, q(46)), u);
  assert.ok(M('Wellington', q(345)));
});
