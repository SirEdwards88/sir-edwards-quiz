// Tercera tanda: 30 preguntas fáciles (IDs 654-683) para repartir mejor el banco fácil (Ameba). Todas van al modo test;
// solo 6 de respuesta corta se copian al banco de Lucidez (con lz «B» y alias).
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
const NEW = T.filter((q) => q.n >= 654 && q.n <= 683); // 684-694 son las nuevas de octubre de 2026
const OLD = T.filter((q) => q.n < 654);
const CATS = ['historia', 'geografia', 'ciencia', 'arte_literatura', 'deporte', 'cultura_general'];
const LZ = [654, 658, 660, 661, 663, 664, 674, 679, 681]; // 654, 658 y 660 entraron en Lucidez el 30 de octubre de 2026

test('son 27 (30 menos las 659, 669 y 682 retiradas en octubre de 2026), con IDs 654-683, todas fáciles, y no se toca ninguna anterior', () => {
  assert.deepEqual(Array.from(NEW, (q) => q.n), Array.from({ length: 30 }, (_, i) => 654 + i).filter((n) => ![659, 669, 682].includes(n)));
  assert.equal(OLD.length, 623);
  assert.ok(NEW.every((q) => q.dif === 'facil'));
});

test('formato: 4 opciones distintas con la respuesta entre ellas, categoría válida y «Sabías que» de hasta 140 caracteres', () => {
  for (const q of NEW) {
    assert.equal(q.options.length, 4, '' + q.n);
    assert.equal(new Set(q.options).size, 4, '' + q.n);
    assert.ok(q.options.includes(q.a), '' + q.n);
    assert.ok(CATS.includes(q.cat), '' + q.n);
    assert.ok(q.sabias && sabiasOk(q), 'sabías ' + q.n);
  }
});

test('ninguna repite un enunciado ni una respuesta+tema del banco anterior', () => {
  const norm = (s) => s.toLowerCase().replace(/[^a-záéíóúñü0-9 ]/g, '').trim();
  const qs = new Set(OLD.map((q) => norm(q.q)));
  for (const q of NEW) assert.ok(!qs.has(norm(q.q)), 'enunciado repetido en ' + q.n);
  assert.equal(new Set(NEW.map((q) => norm(q.q))).size, 27);
});

test('Lucidez (hasta la 683): solo las 9 de respuesta corta (lz «B», fáciles, mismo texto y respuesta salvo la escrita, sin opciones)', () => {
  const NQ = Q.filter((q) => q.n >= 654 && q.n <= 683);
  assert.deepEqual(Array.from(NQ, (q) => q.n).sort((a, b) => a - b), LZ);
  for (const q of NQ) {
    const t = T.find((x) => x.n === q.n);
    assert.equal(q.q, t.q); assert.equal(q.sabias, t.sabias); assert.equal(q.cat, t.cat);
    assert.equal(q.dif, 'facil'); assert.equal(q.lz, 'B'); assert.ok(!q.options);
  }
});

test('Lucidez: la respuesta y sus variantes se aceptan; las opciones incorrectas, no', () => {
  const m = ctx.m;
  for (const q of Q.filter((x) => x.n >= 654)) {
    assert.ok(m(q.a, q), 'la respuesta ' + q.n);
    for (const v of q.alias || []) assert.ok(m(v, q), 'variante «' + v + '» en ' + q.n);
    const t = T.find((x) => x.n === q.n);
    for (const o of t.options) if (o !== t.a && o !== q.a) assert.ok(!m(o, q), 'opción incorrecta aceptada en ' + q.n + ': ' + o);
  }
});
