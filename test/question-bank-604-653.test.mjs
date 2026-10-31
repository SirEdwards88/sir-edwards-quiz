// Segunda tanda de 50 preguntas de razonamiento (IDs 604-653). Solo van al modo test: ninguna es de respuesta corta jugable en Lucidez, así que no se copian a ese banco.
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
const NEW = T.filter((q) => q.n >= 604 && q.n <= 653);
const OLD = T.filter((q) => q.n < 604);

test('son 50 menos las retiradas, con IDs 604-653 seguidos, y no se toca ninguna anterior', () => {
  assert.deepEqual(Array.from(NEW, (q) => q.n), Array.from({ length: 50 }, (_, i) => 604 + i).filter((n) => n !== 633 && n !== 637)); // la 637 se retiró en octubre de 2026 y la 633 el 30 de octubre (duplicaba la 503)
  assert.equal(OLD.length, 575);
});

test('al banco de Lucidez solo pasa la 653 (30 de octubre de 2026: respuesta corta, «Vitamina C»); el resto son de opciones', () => {
  assert.deepEqual(Array.from(Q.filter((q) => q.n >= 604 && q.n <= 653), (q) => q.n), [653]);
});

test('formato: 4 opciones distintas con la respuesta entre ellas, categoría y dificultad válidas y un «Sabías que» de hasta 140 caracteres', () => {
  const cats = ['historia', 'geografia', 'ciencia', 'arte_literatura', 'deporte', 'cultura_general'];
  for (const q of NEW) {
    assert.equal(q.options.length, 4, '' + q.n);
    assert.equal(new Set(q.options).size, 4, '' + q.n);
    assert.ok(q.options.includes(q.a), '' + q.n);
    assert.ok(cats.includes(q.cat), '' + q.n);
    assert.ok(['facil', 'medio', 'dificil'].includes(q.dif), '' + q.n);
    assert.ok(q.sabias && sabiasOk(q), 'sabías de ' + q.n + ': ' + (q.sabias || '').length);
    assert.ok(q.q.length <= 130, 'enunciado largo en ' + q.n);
  }
});

test('reparto: 12 fáciles, 32 medias y 4 difíciles (tras retirar la 637 y la 633); la respuesta cae en las cuatro posiciones casi por igual', () => {
  const c = (f) => NEW.filter(f).length;
  assert.deepEqual([c((q) => q.dif === 'facil'), c((q) => q.dif === 'medio'), c((q) => q.dif === 'dificil')], [12, 32, 4]);
  for (let p = 0; p < 4; p++) assert.ok([11, 12, 13, 14].includes(c((q) => q.options.indexOf(q.a) === p)), 'posición ' + p);
});

test('sin pistas de estilo: la correcta no es sistemáticamente la más larga ni la única con matices', () => {
  const longest = NEW.filter((q) => q.options.every((o) => o === q.a || q.a.length > o.length)).length;
  assert.ok(longest <= 20, 'la correcta es la más larga en ' + longest + ' de 50');
  const hedge = /\b(puede|pueden|suele|suelen|normalmente|habitualmente|a menudo|probablemente)\b/i;
  assert.equal(NEW.filter((q) => hedge.test(q.a)).length, 0);
  for (const q of NEW) {
    const wrong = q.options.filter((o) => o !== q.a);
    assert.ok(Math.max(...wrong.map((o) => o.length)) >= 0.7 * q.a.length || q.a.length < 20, 'distractores muy cortos en ' + q.n);
  }
});

test('ninguna repite un enunciado ni una respuesta del banco anterior', () => {
  const norm = (s) => s.toLowerCase().replace(/[^a-záéíóúñü0-9 ]/g, '').trim();
  const qs = new Set(OLD.concat(Q.filter((q) => q.n < 604)).map((q) => norm(q.q)));
  for (const q of NEW) assert.ok(!qs.has(norm(q.q)), 'enunciado repetido en ' + q.n);
  assert.equal(new Set(NEW.map((q) => norm(q.q))).size, 48);
});
