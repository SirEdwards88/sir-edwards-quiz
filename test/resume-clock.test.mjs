// «Continuar» tras «← Menú principal»: los relojes se reanudan con el tiempo que quedaba (src/ui/resume-clock.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('el módulo está en sw.js y se carga al final de index.html (después de las funciones que envuelve)', () => {
  assert.ok(read('sw.js').includes("'./src/ui/resume-clock.js'"));
  const html = read('index.html');
  const at = html.indexOf('src/ui/resume-clock.js');
  assert.ok(at > html.indexOf('function exitGameToMenu') && at > html.indexOf('function switchTab'));
  assert.ok(html.indexOf('</script>', html.lastIndexOf('function pauseActiveGameTimers')) < at);
});

// Banco de pruebas mínimo: simula las globales de index.html y comprueba que, tras pausar y volver a la partida,
// cada reloj se rearma con los ms que quedaban al salir (no con los que quedarían descontando el rato en el menú).
function setup() {
  const calls = [];
  let now = 1_000_000;
  const dateNow = () => now;
  const ctx = {
    Date: { now: dateNow }, Number, Math, setInterval: () => 1, clearInterval() {}, console,
    document: { getElementById: () => ({ classList: { contains: () => true } }) },
    currentGame: { mode: 'mental_calc' }, currentMentalOp: { startedAt: now - 2000 },
    timeTrialTimer: null, timeTrialEndTime: 0, timeTrialSecondsLeft: 0,
    mentalCalcTimer: 7, mentalCalcEndTime: now + 12000,
    lucidezPhase3Timer: null, lucidezPhase3EndTime: 0, lucidezFinalTimer: null, lucidezFinalEndTime: 0,
    isMentalClassicGame: () => true,
    runMentalCalcTimer: (c) => calls.push(['mc', c, ctx.mentalCalcEndTime - now]),
    startLucidezPhase3Timer() {}, startLucidezFinalTimer() {}, updateTimeTrialHeader() {}, updateUrgencySound() {}, finishGame() {},
  };
  ctx.window = ctx;
  ctx.pauseActiveGameTimers = () => { ctx.mentalCalcTimer = null; ctx.mentalCalcEndTime = now + 12000; };
  ctx.switchTab = () => {};
  vm.createContext(ctx);
  vm.runInContext(read('src/ui/resume-clock.js'), ctx);
  return { ctx, calls, advance: (ms) => { now += ms; } };
}

test('Cálculo (Turbo/Fondo): tras 5 s en el menú, el reloj vuelve con los 12 s que quedaban al salir', () => {
  const { ctx, calls, advance } = setup();
  ctx.pauseActiveGameTimers();
  advance(5000);
  ctx.switchTab('game');
  assert.deepEqual(calls, [['mc', true, 12000]]);
});

test('si entre medias se empieza otra partida, no se rearma nada', () => {
  const { ctx, calls, advance } = setup();
  ctx.pauseActiveGameTimers();
  ctx.currentGame = { mode: 'mental_calc' };
  advance(1000);
  ctx.switchTab('game');
  assert.deepEqual(calls, []);
});

test('sin pausa previa, volver a la pantalla de juego no hace nada', () => {
  const { ctx, calls } = setup();
  ctx.switchTab('game');
  assert.deepEqual(calls, []);
});
