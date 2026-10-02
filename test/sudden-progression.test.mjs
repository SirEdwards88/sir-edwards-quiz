// Muerte Súbita progresiva (cliente): forma de dificultad y nombres de tramo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, '..', 'src', 'utils', 'sudden-progression.js'), 'utf8') + '\n;globalThis.S = { SUDDEN_SHAPE, suddenTramoName };', ctx);
const { SUDDEN_SHAPE, suddenTramoName } = ctx.S;

test('forma de 30 preguntas: fácil al inicio, difícil al final, y la dificultad nunca baja de un tramo al siguiente', () => {
  assert.equal(SUDDEN_SHAPE.length, 30);
  assert.ok(SUDDEN_SHAPE.slice(0, 5).every((d) => d === 'facil'));
  assert.ok(SUDDEN_SHAPE.slice(20).every((d) => d === 'dificil'));
  assert.ok(SUDDEN_SHAPE.slice(10, 15).every((d) => d === 'medio'));
  const rank = { facil: 0, medio: 1, dificil: 2 };
  const avg = (a, b) => SUDDEN_SHAPE.slice(a, b).reduce((s, d) => s + rank[d], 0) / (b - a);
  assert.ok(avg(0, 5) < avg(5, 10) && avg(5, 10) < avg(10, 15) && avg(10, 15) < avg(15, 20) && avg(15, 20) < avg(20, 30));
});

test('nombre del tramo según la pregunta alcanzada', () => {
  assert.deepEqual([1, 5, 6, 10, 11, 15, 16, 20, 21, 30].map(suddenTramoName),
    ['Fácil', 'Fácil', 'De fácil a media', 'De fácil a media', 'Media', 'Media', 'De media a difícil', 'De media a difícil', 'Difícil', 'Difícil']);
  assert.equal(suddenTramoName(99), 'Difícil');
});

test('index.html y sw.js enlazan el módulo', () => {
  assert.ok(fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8').includes('src/utils/sudden-progression.js'));
  assert.ok(fs.readFileSync(path.join(here, '..', 'sw.js'), 'utf8').includes('./src/utils/sudden-progression.js'));
});
