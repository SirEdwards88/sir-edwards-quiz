// SirEdwards Quiz — Cálculo de Fondo (en pruebas): reglas puras del modo.
// Una vida y 20 s por operación; con rachas de 8, 16 y 24 aciertos seguidos se gana una vida extra.
// Las operaciones y su dificultad las genera src/utils/mental-calc.js, igual que en Turbo (el Cálculo Mental de siempre).
// Script clásico (scope global), sin dependencias. La interfaz y el final de partida viven en src/ui/mental-classic-ui.js.
const SEQMentalClassic = (function () {
  'use strict';
  var OP_MS = 20000;                 // tiempo por operación
  var START_LIVES = 1;
  var LIFE_STREAKS = [8, 16, 24];    // racha en curso que concede una vida extra
  var MAX_LIVES = START_LIVES + LIFE_STREAKS.length;
  var FAIL_PAUSE_MS = 2500;          // pausa tras un fallo: tiempo de leer la solución y el truco (un toque la salta)
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
  // Continuar partida: lo que se guarda al salir y cómo se recupera. El reloj de la operación se queda en pausa mientras se está
  // fuera (se guardan los ms que quedaban, no la hora de fin): a diferencia de Turbo, 20 s por operación no sobrevivirían a una salida.
  function isResumable(s) {
    return !!s && s.mode === 'mental_calc' && s.variant === 'classic' && Number.isFinite(Number(s.lives)) && Number(s.lives) > 0;
  }
  function pack(game, op, remainingMs) {
    var o = {}; for (var k in game) o[k] = game[k];
    // Entre operaciones (ya contestada) no hay operación a medias: al volver sale una nueva con sus 20 s.
    o.currentMentalOp = game.answered ? null : (op || null);
    o.remainingMs = Math.max(0, Math.min(OP_MS, Number(remainingMs) || 0));
    return o;
  }
  function unpack(s) {
    var op = s.currentMentalOp;
    var valid = !s.answered && op && typeof op.text === 'string' && Number.isFinite(op.answer) && typeof op.tier === 'string';
    var remaining = Number.isFinite(Number(s.remainingMs)) ? Math.max(1000, Math.min(OP_MS, Number(s.remainingMs))) : OP_MS;
    return {
      game: {
        mode: 'mental_calc', variant: 'classic',
        currentIdx: Number(s.currentIdx) || 0, answered: false,
        score: Number(s.score) || 0, correct: Number(s.correct) || 0, total: Number(s.total) || 0,
        streak: Number(s.streak) || 0, bestStreak: Number(s.bestStreak) || 0, totalTimeMs: Number(s.totalTimeMs) || 0,
        lives: Math.max(1, Math.min(MAX_LIVES, Number(s.lives) || 1))
      },
      op: valid ? op : null,
      remainingMs: valid ? remaining : OP_MS
    };
  }
  return { isResumable: isResumable, pack: pack, unpack: unpack, OP_MS: OP_MS, FAIL_PAUSE_MS: FAIL_PAUSE_MS, START_LIVES: START_LIVES, LIFE_STREAKS: LIFE_STREAKS, MAX_LIVES: MAX_LIVES, TICK_FROM_S: TICK_FROM_S, lifeGain: lifeGain, isBetter: isBetter };
})();
