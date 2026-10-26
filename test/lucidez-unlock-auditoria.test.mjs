import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('lucidez-unlock: los sonidos en espera suenan al soltar, en orden, y se restauran las funciones', () => {
  const log = [];
  const origPlay = (n) => log.push('play:' + n), origRec = () => log.push('record');
  globalThis.playSound = origPlay; globalThis.playRecordSound = origRec;
  const U = require('../src/ui/lucidez-unlock.js');
  const modes = [{ id: 'lucidez_mental', name: 'Lucidez Mental' }];
  U.gate(modes);
  assert.notEqual(globalThis.playSound, origPlay, 'durante la espera están sustituidas');
  globalThis.playRecordSound(); globalThis.playSound('win');
  assert.deepEqual(log, [], 'nada suena mientras tanto');
  assert.equal(U.release(), 2);
  assert.deepEqual(log, ['record', 'play:win']);
  assert.equal(globalThis.playSound, origPlay); assert.equal(globalThis.playRecordSound, origRec);
});

test('lucidez-unlock: si la espera fue larga, ok/bad ya no se sueltan de golpe', () => {
  const log = [];
  globalThis.playSound = (n) => log.push(n); globalThis.playRecordSound = () => log.push('record');
  const U = require('../src/ui/lucidez-unlock.js');
  const real = Date.now; let t = 1000; Date.now = () => t;
  try {
    U.gate([{ name: 'Lucidez Mental' }]);
    globalThis.playSound('ok'); globalThis.playSound('bad'); globalThis.playRecordSound();
    t += 5000;
    assert.equal(U.release(), 1);
    assert.deepEqual(log, ['record']);
  } finally { Date.now = real; }
});

test('lucidez-unlock: gate solo actúa con Lucidez y active() empieza en falso', () => {
  const U = require('../src/ui/lucidez-unlock.js');
  const f = () => {}; globalThis.playSound = f;
  U.gate([{ name: 'Contrarreloj' }]);
  assert.equal(globalThis.playSound, f);
  assert.equal(U.active(), false);
});

test('v467 revisión: arranque con concesión de logros, sync sin gastar Lucidez, service worker y Fondo con ceremonia', () => {
  const html = read('index.html'), sw = read('sw.js'), online = read('src/online/online.js');
  assert.match(html, /try \{ if \(checkMedalsAndGetNew\(\)\.length\) saveStore\(false\); \} catch \(e\) \{\}\s*\n\s*updateBadges\(\);/);
  assert.match(online, /notifiedModeUnlocks = store\.notifiedModeUnlocks\.filter\(function \(id\) \{ return id !== 'lucidez_mental'; \}\)/);
  assert.match(online, /checkFragmentRewardsAndGetNew\(\)/);
  assert.match(sw, /\.then\(\(\) => cacheAssets\(\)\.catch\(\(\) => \{\}\)\)/);
  const fondo = read('src/ui/mental-classic-ui.js');
  assert.match(fondo, /SEQLucidezUnlock\.gate\(newModes\)/);
  assert.match(fondo, /SEQLucidezUnlock\.run\(newModes, afterReveal\)/);
  assert.match(fondo, /appendFragmentRewardToResults\(\)/);
});
