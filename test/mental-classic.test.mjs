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

test('cableado: una sola tarjeta Cálculo con selector Turbo/Fondo, scripts enlazados y archivos en sw.js', () => {
  const html = read('index.html'), sw = read('sw.js'), menu = read('src/ui/mental-menu.js');
  assert.match(html, /class="mode-card mode-mentalcalc locked" id="mode-card-mental_calc" onclick="SEQMentalMenu\.open\(\)"/);
  assert.ok(!html.includes('id="mode-card-mental_classic"') && !html.includes("cardId: 'mode-card-mental_classic'"), 'Fondo ya no tiene tarjeta propia');
  assert.match(html, /data-mental="turbo" onclick="SEQMentalMenu\.pick\('turbo'\)"/);
  assert.match(html, /data-mental="fondo" onclick="SEQMentalMenu\.pick\('fondo'\)"/);
  assert.ok(/SEQMentalClassicUI\.start\(\)/.test(menu) && /startMentalCalcMode\(\)/.test(menu), 'el selector arranca cada modo por su camino');
  assert.ok(menu.includes("'tt_15'"), 'el selector respeta el desbloqueo');
  assert.ok(!/clasico=/.test(read('src/ui/mental-classic-ui.js')), 'sin bandera de pruebas');
  assert.match(html, /src="src\/utils\/mental-classic\.js\?v=\d+"/);
  assert.match(html, /src="src\/ui\/mental-classic-ui\.js\?v=\d+"/);
  assert.match(html, /src="src\/ui\/mental-menu\.js\?v=\d+"/);
  assert.ok(sw.includes("'./src/utils/mental-classic.js'") && sw.includes("'./src/ui/mental-classic-ui.js'") && sw.includes("'./src/ui/mental-menu.js'"));
});

test('Estadísticas: la fila del Fondo se crea desde el módulo, solo con récord, y renderStats la invoca', () => {
  const ui = read('src/ui/mental-classic-ui.js'), html = read('index.html');
  assert.ok(ui.includes('best-mentalclassic-box') && ui.includes('renderStat: renderStat'));
  assert.ok(!html.includes('best-mentalclassic'), 'index.html no crece con la fila: la crea el módulo');
  const rs = html.slice(html.indexOf('function renderStats('));
  assert.ok(rs.indexOf('SEQMentalClassicUI.renderStat()') > 0 && rs.indexOf('SEQMentalClassicUI.renderStat()') < rs.indexOf('best-lucidez-box'));
});

test('el final del Fondo cuenta como partida (jugadas, historial y Encargos) sin tocar las marcas de Turbo', () => {
  const ui = read('src/ui/mental-classic-ui.js');
  for (const k of ['bestMentalCalcScore', 'mentalCalcBestStreak', 'mentalCalcTotalCorrect']) {
    assert.ok(!ui.includes(k), 'mental-classic-ui.js no debe tocar ' + k);
  }
  for (const k of ['store.gamesPlayed++', 'pushCapped(store.gameHistory', "encargosOnGameEnd('mental_calc'", 'noteGame']) {
    assert.equal(ui.split(k).length - 1, 1, 'Fondo debe llamar una sola vez a ' + k);
  }
  assert.ok(ui.includes('bestMentalCalcCorrect') && ui.includes('checkMedalsAndGetNew'), 'los logros de Cálculo mental cuentan también el Fondo');
  assert.ok(!ui.includes('grantXp'), 'Fondo no da XP');
  const html = read('index.html');
  const fg = html.slice(html.indexOf('function finishGame('));
  assert.ok(fg.indexOf('isMentalClassicGame()) { SEQMentalClassicUI.finish()') > 0 && fg.indexOf('isMentalClassicGame()) { SEQMentalClassicUI.finish()') < fg.indexOf('store.gamesPlayed++'), 'el cierre de Fondo sale antes del de Turbo (no se cuenta dos veces)');
});

test('el récord de Fondo viaja por la sincronización y el ranking de Fondo existe en la PWA', () => {
  for (const f of ['bestMentalClassicCorrect', 'bestMentalClassicScore']) {
    assert.ok(read('src/utils/sync-merge.js').includes("'" + f + "'"), f + ' en MAX_FIELDS');
    assert.ok(read('src/utils/store.js').split(f).length >= 3, f + ' con valor por defecto y saneado');
  }
  const rk = read('src/online/duels-v21.js');
  assert.match(rk, /fondo: \{ nombre: 'Cálculo de Fondo'/);
  assert.ok(rk.includes("CALC_BOARDS = ['mental', 'fondo']"), 'Cálculo con dos subpestañas');
  assert.match(read('index.html'), /data-mental="fondo"[\s\S]*data-mental="turbo"/, 'Fondo arriba, Turbo abajo');
});

test('el Fondo se puede continuar: el reloj de la operación queda en pausa', () => {
  const g = { mode: 'mental_calc', variant: 'classic', lives: 2, score: 90, correct: 7, total: 8, streak: 3, bestStreak: 5, totalTimeMs: 1000, currentIdx: 7, answered: false };
  const op = { text: '7 × 8', answer: 56, tier: 'facil', startedAt: 1 };
  const p = C.pack(g, op, 12500);
  assert.equal(C.isResumable(p), true);
  assert.equal(p.remainingMs, 12500);
  const u = C.unpack(p);
  assert.equal(u.remainingMs, 12500);
  assert.equal(u.op.answer, 56);
  assert.equal(u.game.variant, 'classic');
  assert.equal(u.game.lives, 2);
  assert.equal(u.game.score, 90);
  // entre operaciones: operación nueva con los 20 s completos
  const q = C.unpack(C.pack(Object.assign({}, g, { answered: true }), op, 3000));
  assert.equal(q.op, null);
  assert.equal(q.remainingMs, C.OP_MS);
  // sin vidas no se continúa; Turbo no es Fondo
  assert.equal(C.isResumable(Object.assign({}, g, { lives: 0 })), false);
  assert.equal(C.isResumable({ mode: 'mental_calc' }), false);
});

test('el Fondo guarda y restaura la partida desde index.html', () => {
  const html = read('index.html');
  assert.ok(!/el Fondo \(en pruebas\) no se reanuda/.test(html));
  assert.match(html, /SEQMentalClassic\.pack\(currentGame/);
  assert.match(html, /SEQMentalClassicUI\.restore\(saved\)/);
  assert.match(html, /function runMentalCalcTimer\(classic\)/);
  assert.match(read('src/ui/mental-classic-ui.js'), /restore: restore/);
});

test('el resultado del Fondo se puede compartir: datos de la tarjeta y botón visible; la tarjeta tiene su tema', () => {
  const ui = read('src/ui/mental-classic-ui.js'), card = read('src/share/share-card.js');
  assert.ok(/lastResultShareData = \{ modeName: 'Cálculo de Fondo'/.test(ui));
  assert.ok(!/res-share-btn'\); if \(shareBtn\) shareBtn\.style\.display = 'none'/.test(ui), 'el botón ya no se oculta');
  assert.ok(card.includes("'cálculo de fondo': 'mental_classic'") && /mental_classic:\s*\{[^}]*calculo-clasico/.test(card));
});
