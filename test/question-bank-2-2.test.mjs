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

test('el banco de test tiene 715 preguntas, sin IDs repetidos, de 1 a 753 con solo 38 huecos (3 de la 2.2, 13 de octubre de 2026, la 85, 12 más del 30 de octubre y 9 del 31)', () => {
  assert.equal(T.length, 715);
  const ids = T.map((q) => q.n);
  assert.equal(new Set(ids).size, 715);
  const missing = Array.from({ length: 753 }, (_, i) => i + 1).filter((n) => !ids.includes(n));
  assert.deepEqual(missing, [55, 85, 87, 90, 91, 135, 137, 147, 152, 197, 212, 219, 302, 309, 311, 316, 338, 392, 393, 398, 458, 478, 483, 488, 500, 552, 562, 571, 577, 594, 597, 598, 633, 637, 659, 669, 676, 682]);
  assert.equal(Math.max(...ids), 753);
});

test('reparto por dificultad y categorías: solo las seis oficiales', () => {
  assert.deepEqual({ ...by(T, 'dif') }, { facil: 265, medio: 313, dificil: 137 });
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
  assert.deepEqual(Array.from(RT, (q) => q.n), [90, 91, 197, 137, 393, 552, 577, 594, 597, 598, 637, 659, 669, 682, 562, 212, 85, 302, 309, 311, 316, 338, 392, 458, 483, 488, 500, 571, 633, 135, 147, 152, 398, 55, 87, 478, 676, 219]);
  assert.deepEqual(Array.from(RQ, (q) => q.n), [90, 91, 197, 393, 302, 309, 311, 316, 338, 392, 458, 483, 488, 500, 571, 308, 336, 371, 446, 463, 545, 721, 735, 147, 152, 398, 55, 87, 478, 219]);
  for (const q of RT) assert.ok(Array.isArray(q.options) && q.options.includes(q.a), 'retirada ' + q.n + ' sin opciones');
  assert.equal(RT.find((q) => q.n === 90).a, 'El canal de Suez');
  assert.equal(RT.find((q) => q.n === 197).a, 'León Tolstói');
  assert.ok(!RT.some((q) => T.some((t) => t.n === q.n)));
});

test('el banco de Lucidez: medias/difíciles hasta la 503, las fáciles de la criba (23 y 7) y solo las nuevas de la 504 en adelante que se pueden jugar (con lz); comparte texto y respuesta', () => {
  assert.equal(Q.length, 395);
  const faciles = Q.filter((q) => q.dif === 'facil');
  assert.equal(faciles.length, 80);
  assert.equal(faciles.filter((q) => q.n < 424).length, 62);
  assert.equal(faciles.filter((q) => q.n >= 424 && q.n < 654).length, 8);
  assert.equal(faciles.filter((q) => q.n >= 654).length, 10);
  assert.ok(faciles.filter((q) => q.lz).every((q) => q.lz === 'B'));
  const SACADAS = [308, 336, 371, 446, 463, 545, 721, 735]; // sacadas de Lucidez el 30 de octubre de 2026 (siguen en el test)
  const PROMOVIDAS = [5, 7, 10, 12, 14, 15, 19, 26, 30, 54, 58, 61, 65, 67, 69, 167, 166, 168, 177, 183, 209, 232, 275, 276, 277, 284, 286, 369, 373, 418, 593, 653, 654, 658, 660, 691, 692, 704, 713, 739, 740, 741, 742, 743, 749, 750, 751, 753]; // pasan del test a Lucidez (30 de octubre de 2026); la 432 y la 465 no, porque admiten otras respuestas válidas
  const expected = [...new Set(T.filter((q) => q.dif !== 'facil' && (q.n < 504 || (q.n < 654 && Q.some((x) => x.n === q.n && x.lz)))).map((q) => q.n).concat(faciles.map((q) => q.n), [685, 689, 694, 718, 720, 728, 731, 732, 733, 734], PROMOVIDAS))].filter((n) => !SACADAS.includes(n)).sort((a, b) => a - b);
  assert.ok(Q.filter((q) => q.n >= 504).every((q) => q.lz), 'las nuevas sin lz no se copian a Lucidez');
  assert.deepEqual(Array.from(Q, (q) => q.n).sort((a, b) => a - b), expected);
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
  assert.match(g(422).q, /Tolkien/);
  for (const n of [391, 396, 413]) assert.equal(g(n).dif, 'facil'); // auditoría de octubre de 2026: son fáciles
  assert.ok(T.every((q) => !/\*/.test(q.q)), 'quedaron asteriscos de Markdown');
});

test('los «Sabías que» no repiten la respuesta correcta como única información', () => {
  for (const q of T.filter((x) => x.n >= 361 && x.sabias)) {
    assert.notEqual(q.sabias.trim().toLowerCase(), String(q.a).trim().toLowerCase(), 'sabias de ' + q.n);
  }
});
