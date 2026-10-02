// Muerte Súbita progresiva (cliente): forma de dificultad y nombres de tramo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, '..', 'src', 'utils', 'sudden-progression.js'), 'utf8') + '\n;globalThis.S = { SUDDEN_SHAPE };', ctx);
const { SUDDEN_SHAPE } = ctx.S;

test('forma de 25 preguntas: 8 fáciles, 9 medias y 8 difíciles, con subida gradual', () => {
  assert.equal(SUDDEN_SHAPE.length, 25);
  const count = (d) => SUDDEN_SHAPE.filter((x) => x === d).length;
  assert.deepEqual([count('facil'), count('medio'), count('dificil')], [8, 9, 8]);
  assert.ok(SUDDEN_SHAPE.slice(0, 5).every((d) => d === 'facil'), 'arranca fácil');
  assert.ok(SUDDEN_SHAPE.slice(20).every((d) => d === 'dificil'), 'termina difícil');
  assert.ok(SUDDEN_SHAPE.slice(0, 15).every((d) => d !== 'dificil'), 'sin difíciles en la primera mitad');
  assert.ok(SUDDEN_SHAPE.slice(15).every((d) => d !== 'facil'), 'sin fáciles en la segunda mitad');
  const rank = { facil: 0, medio: 1, dificil: 2 };
  const avg = (a, b) => SUDDEN_SHAPE.slice(a, b).reduce((s, d) => s + rank[d], 0) / (b - a);
  for (let k = 0; k < 4; k++) assert.ok(avg(k * 5, k * 5 + 5) < avg(k * 5 + 5, k * 5 + 10), 'cada bloque de 5 es más difícil que el anterior');
  // Sin saltos bruscos: nunca una fácil pegada a una difícil.
  for (let i = 1; i < 25; i++) assert.ok(Math.abs(rank[SUDDEN_SHAPE[i]] - rank[SUDDEN_SHAPE[i - 1]]) <= 1, 'sin saltos de fácil a difícil');
});

test('index.html y sw.js enlazan el módulo', () => {
  assert.ok(fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8').includes('src/utils/sudden-progression.js'));
  assert.ok(fs.readFileSync(path.join(here, '..', 'sw.js'), 'utf8').includes('./src/utils/sudden-progression.js'));
});
