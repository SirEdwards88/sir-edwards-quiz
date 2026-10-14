// SirEdwards Quiz 2.4 — recuerda qué resultados de Duelo/Reto ya se han «oído» (jingle de victoria/derrota).
// Así, reabrir un resultado viejo desde el historial no vuelve a sonar. Guarda solo las últimas 60 claves,
// en una clave propia de localStorage (no toca la clave de datos del usuario). Script clásico.
(function () {
  'use strict';
  var KEY = 'siredwards_quiz_v2_4_result_heard';
  // Devuelve true la primera vez que se ve `k` y false las siguientes.
  function first(k) {
    var heard = [];
    try { heard = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(heard)) heard = []; } catch (e) { heard = []; }
    if (heard.indexOf(k) >= 0) return false;
    heard.push(k);
    try { localStorage.setItem(KEY, JSON.stringify(heard.slice(-60))); } catch (e) {}
    return true;
  }
  window.SEQResultHeard = { first: first };
})();
