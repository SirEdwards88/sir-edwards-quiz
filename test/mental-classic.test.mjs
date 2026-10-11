// Cálculo de Fondo (en pruebas): reglas puras y cableado mínimo en index.html / sw.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const C = vm.runInNewContext(read('src/utils/mental-classic.js') + '\nSEQMentalClassic', {});

test('una vida, 20 s por operación y vida extra con rachas de 8, 16 y 24', () => {
  assert.equal(C.START_LIVES, 1);
  assert.equal(C.OP_MS, 20000);
  assert.deepEqual([...C.LIFE_STREAKS], [8, 16, 24]);
  assert.equal(C.MAX_LIVES, 4);
  for (let s = 1; s <= 30; s++) assert.equal(C.lifeGain(s, 1), [8, 16, 24].includes(s) ? 1 : 0, 'racha ' + s);
  assert.equal(C.lifeGain(8, 4), 0, 'nunca por encima del máximo');
});

test('la marca del Fondo: más aciertos, y a igualdad más puntos; sin aciertos no hay récord', () => {
  assert.equal(C.isBetter(0, 50, null), false);
  assert.equal(C.isBetter(5, 100, null), true);
  assert.equal(C.isBetter(6, 10, { correct: 5, score: 999 }), true);
  assert.equal(C.isBetter(5, 101, { correct: 5, score: 100 }), true);
  assert.equal(C.isBetter(5, 100, { correct: 5, score: 100 }), false);
  assert.equal(C.isBetter(4, 999, { correct: 5, score: 1 }), false);
});

test('cableado: tarjeta pública con candado como Turbo, scripts enlazados y archivos en sw.js', () => {
  const html = read('index.html'), sw = read('sw.js');
  assert.match(html, /class="mode-card mode-mentalcalc locked" id="mode-card-mental_classic"/);
  assert.ok(!/style="display:none;" onclick="SEQMentalClassicUI/.test(html), 'ya no está oculta');
  assert.match(html, /cardId: 'mode-card-mental_classic'/);
  assert.ok(!/clasico=/.test(read('src/ui/mental-classic-ui.js')), 'sin bandera de pruebas');
  assert.match(html, /src="src\/utils\/mental-classic\.js\?v=\d+"/);
  assert.match(html, /src="src\/ui\/mental-classic-ui\.js\?v=\d+"/);
  assert.ok(sw.includes("'./src/utils/mental-classic.js'") && sw.includes("'./src/ui/mental-classic-ui.js'"));
});

test('Estadísticas: la fila del Fondo se crea desde el módulo, solo con récord, y renderStats la invoca', () => {
  const ui = read('src/ui/mental-classic-ui.js'), html = read('index.html');
  assert.ok(ui.includes('best-mentalclassic-box') && ui.includes('renderStat: renderStat'));
  assert.ok(!html.includes('best-mentalclassic'), 'index.html no crece con la fila: la crea el módulo');
  const rs = html.slice(html.indexOf('function renderStats('));
  assert.ok(rs.indexOf('SEQMentalClassicUI.renderStat()') > 0 && rs.indexOf('SEQMentalClassicUI.renderStat()') < rs.indexOf('best-lucidez-box'));
});

test('el final del Fondo no toca estadísticas de Turbo ni el contador de partidas', () => {
  const ui = read('src/ui/mental-classic-ui.js');
  for (const k of ['gamesPlayed', 'bestMentalCalcScore', 'bestMentalCalcCorrect', 'mentalCalcBestStreak', 'mentalCalcTotalCorrect', 'encargosOnGameEnd', 'checkMedalsAndGetNew', 'gameHistory']) {
    assert.ok(!ui.includes(k), 'mental-classic-ui.js no debe tocar ' + k);
  }
  const html = read('index.html');
  const fg = html.slice(html.indexOf('function finishGame('));
  assert.ok(fg.indexOf('isMentalClassicGame()) { SEQMentalClassicUI.finish()') > 0 && fg.indexOf('isMentalClassicGame()) { SEQMentalClassicUI.finish()') < fg.indexOf('store.gamesPlayed++'), 'el Fondo sale de finishGame antes de contar la partida');
});
