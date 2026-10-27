/* SirEdwards Quiz — Espera de avisos antes de pasar a la pregunta siguiente.
 *
 * Tras un acierto con auto-avance (Supervivencia, Muerte súbita…), el aviso de racha (1,5 s) o «Sigues con vida» (2,2 s)
 * podía quedar encima de la pregunta nueva. SEQAdvance.whenClear(go) llama a `go` en cuanto no haya ningún aviso en
 * pantalla, con un tope (6 × 250 ms) para no retener nunca la partida. Solo para modos SIN reloj de partida: ahí esperar es gratis.
 * Script clásico, sin dependencias.
 */
(function () {
  'use strict';
  var SEL = '.fx-streak-banner, .fx-lastlife-banner';
  var STEP = 250, MAX_STEPS = 6;

  function banner() { try { return !!document.querySelector(SEL); } catch (e) { return false; } }

  function whenClear(go) {
    var n = 0;
    (function check() {
      if (banner() && n < MAX_STEPS) { n++; setTimeout(check, STEP); return; }
      go();
    })();
  }

  window.SEQAdvance = { whenClear: whenClear };
})();
