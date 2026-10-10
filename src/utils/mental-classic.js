// SirEdwards Quiz — Cálculo Clásico (en pruebas): reglas puras del modo.
// Una vida y 20 s por operación; con rachas de 8, 16 y 24 aciertos seguidos se gana una vida extra.
// Las operaciones y su dificultad las genera src/utils/mental-calc.js, igual que en Turbo (el Cálculo Mental de siempre).
// Script clásico (scope global), sin dependencias. La interfaz y el final de partida viven en src/ui/mental-classic-ui.js.
const SEQMentalClassic = (function () {
  'use strict';
  var OP_MS = 20000;                 // tiempo por operación
  var START_LIVES = 1;
  var LIFE_STREAKS = [8, 16, 24];    // racha en curso que concede una vida extra
  var MAX_LIVES = START_LIVES + LIFE_STREAKS.length;
  var TICK_FROM_S = 5;               // el tic-tac de urgencia solo suena en los últimos segundos de cada operación

  // Vidas que se ganan al llegar a esta racha (0 o 1). Se pasa la racha YA incrementada.
  function lifeGain(streak, lives) {
    return LIFE_STREAKS.indexOf(streak) !== -1 && lives < MAX_LIVES ? 1 : 0;
  }
  // Mejor marca local (solo de este modo): más aciertos y, a igualdad, más puntos.
  function isBetter(correct, score, best) {
    if (!(correct > 0)) return false;
    if (!best) return true;
    return correct > (best.correct || 0) || (correct === (best.correct || 0) && score > (best.score || 0));
  }
  return { OP_MS: OP_MS, START_LIVES: START_LIVES, LIFE_STREAKS: LIFE_STREAKS, MAX_LIVES: MAX_LIVES, TICK_FROM_S: TICK_FROM_S, lifeGain: lifeGain, isBetter: isBetter };
})();
