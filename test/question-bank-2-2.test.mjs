// 2.2: 63 preguntas nuevas, 3 sustituciones (90→383, 91→381, 197→414) y retiradas resolvibles por ID.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(read('src/data/questions.js') + read('src/data/questions-retired.js') +
  ';this.T=TEST_QUESTIONS;this.Q=QUESTIONS;this.RT=RETIRED_TEST_QUESTIONS;this.RQ=RETIRED_QUESTIONS;', ctx);
const { T, Q, RT, RQ } = ctx;
const CATS = ['historia', 'geografia', 'ciencia', 'arte_literatura', 'deporte', 'cultura_general'];
const by = (a, k) => a.reduce((m, x) => ((m[x[k]] = (m[x[k]] || 0) + 1), m), {});

test('el banco de test tiene 700 preguntas, sin IDs repetidos, de 1 a 715 con solo 15 huecos (3 de la 2.2 y 12 de octubre de 2026)', () => {
  assert.equal(T.length, 700);
  const ids = T.map((q) => q.n);
  assert.equal(new Set(ids).size, 700);
  const missing = Array.from({ length: 715 }, (_, i) => i + 1).filter((n) => !ids.includes(n));
  assert.deepEqual(missing, [90, 91, 137, 197, 393, 552, 562, 577, 594, 597, 598, 637, 659, 669, 682]);
  assert.equal(Math.max(...ids), 715);
});

test('reparto por dificultad y categorías: solo las seis oficiales', () => {
  assert.deepEqual({ ...by(T, 'dif') }, { facil: 275, medio: 297, dificil: 128 });
  assert.ok(T.every((q) => CATS.includes(q.cat)), 'categoría fuera de las seis');
  assert.ok(Q.every((q) => CATS.includes(q.cat)));
});

test('toda pregunta de test tiene 4 opciones distintas y la correcta entre ellas', () => {
  for (const q of T) {
    assert.equal(q.options.length, 4, 'pregunta ' + q.n);
    assert.equal(new Set(q.options).size, 4, 'opciones repetidas en ' + q.n);
    assert.ok(q.options.includes(q.a), 'la respuesta no está entre las opciones en ' + q.n);
  }
});

test('las tres sustituciones: los nuevos están, los antiguos ya no están en ningún banco jugable', () => {
  const g = (n) => T.find((q) => q.n === n);
  assert.equal(g(383).a, 'Canal de Suez');
  assert.equal(g(381).a, 'Kazajistán');
  assert.equal(g(414).a, 'Lev Tolstói');
  for (const n of [90, 91, 197]) {
    assert.ok(!T.some((q) => q.n === n) && !Q.some((q) => q.n === n), n + ' sigue en un banco jugable');
  }
});

test('las retiradas siguen resolviéndose por ID (duelos y retos creados antes de la 2.2)', () => {
  assert.deepEqual(Array.from(RT, (q) => q.n), [90, 91, 197, 137, 393, 552, 577, 594, 597, 598, 637, 659, 669, 682, 562]);
  assert.deepEqual(Array.from(RQ, (q) => q.n), [90, 91, 197, 393]);
  for (const q of RT) assert.ok(Array.isArray(q.options) && q.options.includes(q.a), 'retirada ' + q.n + ' sin opciones');
  assert.equal(RT.find((q) => q.n === 90).a, 'El canal de Suez');
  assert.equal(RT.find((q) => q.n === 197).a, 'León Tolstói');
  assert.ok(!RT.some((q) => T.some((t) => t.n === q.n)));
});

test('el banco de Lucidez: medias/difíciles hasta la 503, las fáciles de la criba (23 y 7) y solo las nuevas de la 504 en adelante que se pueden jugar (con lz); comparte texto y respuesta', () => {
  assert.equal(Q.length, 366);
  const faciles = Q.filter((q) => q.dif === 'facil');
  assert.equal(faciles.length, 65);
  assert.equal(faciles.filter((q) => q.n < 424).length, 50);
  assert.equal(faciles.filter((q) => q.n >= 424 && q.n < 654).length, 9);
  assert.equal(faciles.filter((q) => q.n >= 654).length, 6);
  assert.ok(faciles.filter((q) => q.lz).every((q) => q.lz === 'B'));
  const expected = T.filter((q) => q.dif !== 'facil' && (q.n < 504 || (q.n < 654 && Q.some((x) => x.n === q.n && x.lz)))).map((q) => q.n).concat(faciles.map((q) => q.n), [685, 689, 694]).sort((a, b) => a - b);
  assert.ok(Q.filter((q) => q.n >= 504).every((q) => q.lz), 'las nuevas sin lz no se copian a Lucidez');
  assert.deepEqual(Q.map((q) => q.n).sort((a, b) => a - b), expected);
  for (const q of Q) {
    const t = T.find((x) => x.n === q.n);
    assert.equal(q.q, t.q); assert.equal(q.a, t.a);
  }
});

test('reescrituras aprobadas: 397, 400, 413, 421 y 422', () => {
  const g = (n) => T.find((q) => q.n === n);
  assert.ok(!/sucesor/i.test(g(397).q) && /diciembre de 2021/.test(g(397).q) && /infrarrojo/.test(g(397).q));
  assert.ok(!/psiquiatra/.test(g(400).q));
  assert.match(g(413).q, /emperador de los franceses/);
  assert.ok(!/acceso aleatorio/i.test(g(421).q), 'el enunciado de 421 delataba la respuesta');
  assert.match(g(422).q, /2001 y 2003/);
  for (const n of [391, 396, 413]) assert.equal(g(n).dif, 'facil'); // auditoría de octubre de 2026: son fáciles
  assert.ok(T.every((q) => !/\*/.test(q.q)), 'quedaron asteriscos de Markdown');
});

test('los «Sabías que» no repiten la respuesta correcta como única información', () => {
  for (const q of T.filter((x) => x.n >= 361 && x.sabias)) {
    assert.notEqual(q.sabias.trim().toLowerCase(), String(q.a).trim().toLowerCase(), 'sabias de ' + q.n);
  }
});
