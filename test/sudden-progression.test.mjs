// Muerte Súbita progresiva (cliente): forma de dificultad y nombres de tramo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, '..', 'src', 'utils', 'sudden-progression.js'), 'utf8') + '\n;globalThis.S = { SUDDEN_SHAPE, suddenRango };', ctx);
const { SUDDEN_SHAPE, suddenRango } = ctx.S;

test('forma de 30 preguntas: 10 de cada dificultad y subida gradual', () => {
  assert.equal(SUDDEN_SHAPE.length, 30);
  const count = (d) => SUDDEN_SHAPE.filter((x) => x === d).length;
  assert.deepEqual([count('facil'), count('medio'), count('dificil')], [10, 10, 10]);
  assert.ok(SUDDEN_SHAPE.slice(0, 5).every((d) => d === 'facil'), 'arranca fácil');
  assert.ok(SUDDEN_SHAPE.slice(25).every((d) => d === 'dificil'), 'termina difícil');
  assert.ok(SUDDEN_SHAPE.slice(0, 15).every((d) => d !== 'dificil'), 'sin difíciles en la primera mitad');
  assert.ok(SUDDEN_SHAPE.slice(15).every((d) => d !== 'facil'), 'sin fáciles en la segunda mitad');
  const rank = { facil: 0, medio: 1, dificil: 2 };
  const avg = (a, b) => SUDDEN_SHAPE.slice(a, b).reduce((s, d) => s + rank[d], 0) / (b - a);
  for (let k = 0; k < 5; k++) assert.ok(avg(k * 5, k * 5 + 5) < avg(k * 5 + 5, k * 5 + 10), 'cada bloque de 5 es más difícil que el anterior');
  // Sin saltos bruscos: nunca una fácil pegada a una difícil.
  for (let i = 1; i < 30; i++) assert.ok(Math.abs(rank[SUDDEN_SHAPE[i]] - rank[SUDDEN_SHAPE[i - 1]]) <= 1, 'sin saltos de fácil a difícil');
});

test('rango según las preguntas sobrevividas', () => {
  assert.deepEqual([0, 5, 6, 10, 11, 15, 16, 20, 21, 25, 26, 29, 30].map(suddenRango),
    ['Aprendiz de superviviente', 'Aprendiz de superviviente', 'Resistente', 'Resistente', 'Veterano', 'Veterano', 'Curtido', 'Curtido',
      'Superviviente de élite', 'Superviviente de élite', 'Casi inmortal', 'Casi inmortal', 'Inmortal']);
  assert.equal(suddenRango(-3), 'Aprendiz de superviviente');
  assert.equal(suddenRango(99), 'Inmortal');
});

test('index.html y sw.js enlazan el módulo', () => {
  assert.ok(fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8').includes('src/utils/sudden-progression.js'));
  assert.ok(fs.readFileSync(path.join(here, '..', 'sw.js'), 'utf8').includes('./src/utils/sudden-progression.js'));
});
