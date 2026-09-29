// Enigma del elefante: presente en el banco y validado con el motor existente.
// Ejecutar: node --test test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({});
vm.runInContext(['src/data/lucidez.js', 'src/utils/matching.js', 'src/data/questions.js']
  .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n'), ctx);
const riddle = vm.runInContext('LUCIDEZ_RIDDLES.find(r => r.q.startsWith("Un elefante pesa"))', ctx);
const ok = (u) => vm.runInContext(`isMatchFlexible(${JSON.stringify(u)}, ${JSON.stringify(riddle.a)}, ${JSON.stringify(riddle.q)})`, ctx);

test('El enigma está en el banco con el enunciado y la respuesta pedidos', () => {
  assert.equal(riddle.q, 'Un elefante pesa 1000 kg más que un ratón. Entre los dos pesan 1001 kg. ¿Cuánto pesa el ratón?');
  assert.equal(riddle.a, '0,5 kg');
  assert.ok(riddle.explanation && !riddle.q.includes('0,5'), 'la explicación existe y el enunciado no da pistas');
  assert.equal(vm.runInContext('new Set(LUCIDEZ_RIDDLES.map(r => r.q)).size === LUCIDEZ_RIDDLES.length', ctx), true);
});
test('Acepta 0,5 · 0.5 · 0,5 kg · 0.5 kg', () => {
  for (const u of ['0,5', '0.5', '0,5 kg', '0.5 kg', ' 0,5 KG ']) assert.equal(ok(u), true, u);
});
test('Rechaza respuestas incorrectas (incluida la intuitiva y "0")', () => {
  for (const u of ['0', '0 kg', '5', '0,05', '1', '1 kg', '1000', '1001', '500 g', '', 'medio']) assert.equal(ok(u), false, u);
});
test('No rompe otros enigmas ni el redondeo decimal existente (42,195 km -> 42)', () => {
  const other = (a, u, q = '') => vm.runInContext(`isMatchFlexible(${JSON.stringify(u)}, ${JSON.stringify(a)}, ${JSON.stringify(q)})`, ctx);
  assert.equal(other('42', '42'), true);
  assert.equal(other('4 minutos', '5 minutos'), false);
  assert.equal(other('42,195 km', '42', '¿Cuántos km tiene la maratón?'), true);        // regla previa intacta
  assert.equal(other('42,195 km', '43', '¿Cuántos km tiene la maratón?'), false);
  assert.equal(other('Una vela', 'una vela'), true);
  assert.equal(other('421', '421'), true);
});
