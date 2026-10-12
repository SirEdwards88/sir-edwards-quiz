// SirEdwards Quiz — «Continuar» tras «← Menú principal» con los relojes en pausa de verdad.
//
// Problema que corrige: exitGameToMenu() pausa los relojes (Contrarreloj, Cálculo Turbo, Cálculo de Fondo, y los de
// Fase III y enigma final de Lucidez), pero al pulsar «Continuar» en la misma sesión la partida seguía en memoria,
// no pasaba por restoreSavedGame() y NADIE volvía a armar el intervalo: el reloj quedaba parado (tiempo infinito).
//
// Qué hace: recuerda cuánto quedaba en cada reloj al salir y, cuando se vuelve a la pantalla de juego con esa misma
// partida, reanuda cada reloj con exactamente ese tiempo (el que pasó en el menú no se descuenta).
// No toca las reglas de ningún modo ni el guardado; usa por nombre, en tiempo de ejecución, las funciones y variables
// de index.html. Script clásico; se carga al final de index.html, cuando esas funciones ya existen.

(function () {
  'use strict';

  var paused = null; // { game, at, tt, mc, l3, lf } (ms restantes de cada reloj que estaba en marcha)

  function snapshot() {
    var now = Date.now();
    var p = { game: currentGame, at: now };
    var any = false;
    if (timeTrialTimer) { p.tt = Math.max(0, timeTrialEndTime - now); any = true; }
    if (mentalCalcTimer) { p.mc = Math.max(0, mentalCalcEndTime - now); any = true; }
    if (lucidezPhase3Timer) { p.l3 = Math.max(0, lucidezPhase3EndTime - now); any = true; }
    if (lucidezFinalTimer) { p.lf = Math.max(0, lucidezFinalEndTime - now); any = true; }
    return any ? p : null;
  }

  function armTimeTrial(ms) {
    timeTrialEndTime = Date.now() + ms;
    var tick = function () {
      var remaining = Math.max(0, timeTrialEndTime - Date.now());
      timeTrialSecondsLeft = Math.ceil(remaining / 1000);
      updateTimeTrialHeader();
      updateUrgencySound(timeTrialSecondsLeft);
      if (remaining <= 0) {
        clearInterval(timeTrialTimer); timeTrialTimer = null; timeTrialEndTime = 0;
        finishGame(false, false);
      }
    };
    if (timeTrialTimer) clearInterval(timeTrialTimer);
    tick();
    if (timeTrialEndTime > 0) timeTrialTimer = setInterval(tick, 100);
  }

  function resume() {
    var p = paused;
    paused = null;
    if (!p || p.game !== currentGame) return;         // otra partida (nueva o restaurada): nada que reanudar
    if (!document.getElementById('view-game').classList.contains('active')) return;
    var now = Date.now(), away = now - p.at;
    try {
      if (p.tt !== undefined && !timeTrialTimer && currentGame.mode === 'timetrial' && p.tt > 0) armTimeTrial(p.tt);
      if (p.mc !== undefined && !mentalCalcTimer && currentGame.mode === 'mental_calc' && p.mc > 0) {
        mentalCalcEndTime = now + p.mc;
        // La velocidad de la operación en curso se mide desde que se mostró, sin contar el rato en el menú.
        if (currentMentalOp && Number.isFinite(currentMentalOp.startedAt)) currentMentalOp.startedAt += away;
        runMentalCalcTimer(isMentalClassicGame());
      }
      if (p.l3 !== undefined && !lucidezPhase3Timer && currentGame.mode === 'lucidez_mental' && p.l3 > 0) {
        lucidezPhase3EndTime = now + p.l3;
        startLucidezPhase3Timer(false);
      }
      if (p.lf !== undefined && !lucidezFinalTimer && currentGame.mode === 'lucidez_mental' && p.lf > 0) {
        lucidezFinalEndTime = now + p.lf;
        startLucidezFinalTimer(false);
      }
    } catch (e) {}
  }

  var origPause = window.pauseActiveGameTimers;
  var origSwitch = window.switchTab;
  if (typeof origPause !== 'function' || typeof origSwitch !== 'function') return;

  window.pauseActiveGameTimers = function () {
    var snap = null;
    try { snap = snapshot(); } catch (e) {}
    var r = origPause.apply(this, arguments);
    if (snap) paused = snap;
    return r;
  };

  window.switchTab = function (tabId) {
    var r = origSwitch.apply(this, arguments);
    if (tabId === 'game') resume();
    return r;
  };
})();
