// «Última vida» y «Última pregunta»: lógica pura, y que el módulo está enlazado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(here, '..', 'src', 'ui', 'last-life.js'), 'utf8'), ctx);
const L = ctx.SEQLastLife;

test('última vida: solo con 1 vida y solo en Supervivencia', () => {
  assert.equal(L.isLastLife('survival', 3), false);
  assert.equal(L.isLastLife('survival', 2), false);
  assert.equal(L.isLastLife('survival', 1), true);
  assert.equal(L.isLastLife('survival', 0), false);
  assert.equal(L.isLastLife('sudden_death', 1), false);
  assert.equal(L.isLastLife('timetrial', 1), false);
});

test('última pregunta: solo la final de Supervivencia y Muerte Súbita', () => {
  assert.equal(L.isLastQuestion('survival', 48, 50), false);
  assert.equal(L.isLastQuestion('survival', 49, 50), true);
  assert.equal(L.isLastQuestion('sudden_death', 28, 30), false);
  assert.equal(L.isLastQuestion('sudden_death', 29, 30), true);
  assert.equal(L.isLastQuestion('play', 29, 30), false);
  assert.equal(L.isLastQuestion('timetrial', 29, 30), false);
});

test('contador: «n/total» salvo en la última pregunta', () => {
  assert.equal(L.counter('survival', 0, 50), '1/50');
  assert.equal(L.counter('survival', 48, 50), '49/50');
  assert.equal(L.counter('survival', 49, 50), 'ÚLTIMA');
  assert.equal(L.counter('sudden_death', 29, 30), 'ÚLTIMA');
});

test('no toca el estado de la partida', () => {
  const g = { mode: 'survival', lives: 1, currentIdx: 10, totalQuestionsToPlay: 50, score: 7 };
  const copy = JSON.stringify(g);
  L.decorate(g); L.onLifeLost(g); L.onCorrect(g);
  assert.equal(JSON.stringify(g), copy);
});

test('index.html y sw.js enlazan el módulo', () => {
  assert.ok(fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8').includes('src/ui/last-life.js'));
  assert.ok(fs.readFileSync(path.join(here, '..', 'sw.js'), 'utf8').includes('src/ui/last-life.js'));
});
