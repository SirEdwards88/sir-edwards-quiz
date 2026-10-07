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

test('370 (24 segundos) acepta «24» y «veinticuatro» además de la respuesta', () => {
  const p = q(370);
  assert.deepEqual(Array.from(p.alias), ['24', 'veinticuatro']);
  for (const u of ['24 segundos', '24', 'veinticuatro', '24 Segundos']) assert.ok(M(u, p), u);
  for (const u of ['25', '14', 'veinte', '']) assert.ok(!M(u, p), 'no debería aceptar «' + u + '»');
});

test('sin alias se comporta exactamente como isMatchFlexible', () => {
  for (const n of [383, 381, 414, 413, 397, 421]) {
    const p = q(n);
    assert.equal(p.alias, undefined);
    for (const u of [p.a, 'cualquier cosa', '', p.a.split(' ')[0]]) assert.equal(M(u, p), F(u, p.a, p.q), n + ' «' + u + '»');
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
