// Lote de 33 preguntas difíciles (IDs 454-486) y las 9 correcciones del banco (q8, q146, q223, q225, q247, q297, q305, q330, q392).
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
const inRange = (q) => q.n >= 454 && q.n <= 486;
const NEW_T = T.filter(inRange), NEW_Q = Q.filter(inRange);

test('las 33 entran en los dos bancos, todas difíciles, con los mismos ID, texto y respuesta', () => {
  assert.equal(NEW_T.length, 33);
  assert.equal(NEW_Q.length, 33);
  assert.ok(NEW_T.every((q) => q.dif !== 'facil')); // tras la auditoría de octubre de 2026, 4 pasaron a medio
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
    assert.ok(q.sabias && sabiasOk(q), 'sabías de ' + q.n);
  }
});

test('Lucidez: 32 elegibles (la 461, SOS, tiene una respuesta demasiado larga); Big Ben y el Comité Noruego pesan 1', () => {
  assert.deepEqual(Array.from(NEW_Q.filter((q) => !q.lz), (q) => q.n), [461]);
  assert.ok(NEW_Q.filter((q) => q.lz).every((q) => q.lz === 'A' || q.lz === 'B'));
  assert.deepEqual(Array.from(NEW_Q.filter((q) => q.lz === 'B'), (q) => q.n), [459, 480]);
  assert.deepEqual(Array.from(NEW_Q.find((q) => q.n === 454).par), [468]);
  assert.deepEqual(Array.from(NEW_Q.find((q) => q.n === 468).par), [454]);
});

test('Lucidez: la respuesta y sus variantes se aceptan; las demás opciones, no', () => {
  const ok = { 456: ['Naranja'], 459: ['La campana', 'campana'], 461: ['Nada', 'No son siglas'], 463: ['Stanley'], 465: ['3,05', '3,05 m', '10 pies'],
    467: ['Bosco', 'Bosch'], 468: ['Gehry'], 470: ['La Hansa'], 471: ['Oxígeno'], 472: ['Procariota'], 475: ['Danubio'], 476: ['Mesina'],
    477: ['Vermeer'], 480: ['Comité Noruego'], 482: ['Yangtsé', 'Yangtze'], 483: ['Fútbol americano'], 485: ['Fenicios'], 486: ['York y Lancaster'] };
  for (const q of NEW_Q) {
    assert.ok(ctx.m(q.a, q), 'la respuesta ' + q.n);
    for (const v of ok[q.n] || []) assert.ok(ctx.m(v, q), 'variante «' + v + '» en ' + q.n);
    const t = T.find((x) => x.n === q.n);
    for (const o of t.options) if (o !== q.a) assert.ok(!ctx.m(o, q), 'opción incorrecta aceptada en ' + q.n + ': ' + o);
  }
});

test('correcciones: q8, q146, q223, q225, q247, q297, q305, q330 y q392 iguales en los dos bancos', () => {
  const g = (A, n) => A.find((q) => q.n === n);
  for (const n of [8, 146, 223, 225, 247, 297, 305, 330, 392]) {
    for (const k of ['q', 'a', 'sabias']) assert.equal(g(Q, n)[k], g(T, n)[k], k + ' de ' + n);
    assert.ok(g(T, n).sabias, 'sabías de ' + n);
  }
  assert.match(g(T, 8).sabias, /radiactividad/);
  assert.match(g(T, 146).q, /tiroides/);
  assert.deepEqual(Array.from(g(T, 223).options), ['Nueva Delhi', 'Calcuta', 'Bombay', 'Madrás']);
  assert.match(g(T, 225).q, /«Back to Black»/);
  assert.match(g(T, 247).q, /ha ganado más títulos del Mundial de rugby masculino/);
  assert.match(g(T, 297).q, /ecuador y el meridiano de Greenwich/);
  assert.deepEqual(Array.from(g(Q, 297).par), [295]);
  assert.match(g(T, 305).sabias, /relatividad general/);
  assert.equal(g(T, 330).a, 'Pau Gasol');
  assert.ok(g(T, 330).options.includes('Pau Gasol'));
  assert.ok(ctx.m('Gasol', g(Q, 330)));
  assert.match(g(T, 392).q, /número atómico 54/);
  assert.ok(ctx.m('xenon', g(Q, 392)));
});
