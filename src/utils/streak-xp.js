// SirEdwards Quiz — XP extra por rachas (2.0).
//
// Cada acierto da 10 XP; además, al llegar a ciertas rachas (aciertos seguidos en la misma partida) hay un bonus:
//   5 → +10 · 10 → +20 · 15 → +30 · 20 → +50 · y +50 cada 10 más (30, 40, 50…).
// Solo en los modos que dan XP (el mismo conjunto que llama a grantXp). Cálculo Mental, Duelos y Retos no pasan por aquí:
// los Duelos y Retos los paga el servidor a 10 por acierto, sin bonus.
// El Worker admite hasta 16 XP por acierto al sincronizar (XP_MAX_PER_CORRECT en src/constants.js del backend): con estas
// cifras el máximo real es ~5,5 de bonus por acierto en una racha larguísima, así que cabe de sobra.
// Script clásico, sin dependencias; la lógica pura se prueba en test/streak-xp.test.mjs.

(function (root) {
  'use strict';

  var XP_PER_CORRECT = 10;
  var XP_CAP = 23209;                 // = XP_MAX del Worker: el nivel 30 se alcanza con 23.200 y el último acierto puede pasarse
  var MODES = ['play', 'review', 'survival', 'sudden_death', 'timetrial', 'lucidez_mental'];

  // Bonus de XP que da el acierto número `streak` de una racha (0 si no es un hito).
  function bonus(streak) {
    var n = Math.floor(Number(streak));
    if (!(n >= 5)) return 0;
    if (n === 5) return 10;
    if (n === 10) return 20;
    if (n === 15) return 30;
    if (n >= 20 && n % 10 === 0) return 50;
    return 0;
  }
  function modeGivesXp(mode) { return MODES.indexOf(mode) !== -1; }

  root.SEQStreakXp = { XP_PER_CORRECT: XP_PER_CORRECT, XP_CAP: XP_CAP, bonus: bonus, modeGivesXp: modeGivesXp };
})(typeof window !== 'undefined' ? window : globalThis);
