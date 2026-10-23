// Reseteo puntual de records, pedido por el propietario de una cuenta (los hizo cuando los modos eran más fáciles).
// Pone a 0 en el dispositivo los records indicados, UNA sola vez y solo para el ID de jugador indicado.
// La sincronización de datos se queda con el máximo de cada campo, así que el servidor (D1) debe haberse puesto a 0
// antes (ver scripts/reset-records.sql). Los logros ya conseguidos no se tocan.
// Script clásico: expone window.SEQRecordsReset = { run, RESETS, FLAG }.
(function () {
  'use strict';

  var FLAG = 'siredwards_quiz_v2_records_reset_1';
  var RESETS = {
    BKE02TTKCS: ['bestMentalCalcScore', 'bestMentalClassicCorrect', 'bestMentalClassicScore', 'maxTimeTrialScore']
  };

  // Devuelve true si ha puesto algo a 0 (y entonces el llamador guarda). Sin efectos para cualquier otro jugador.
  function run(store, playerId, storage) {
    var fields = RESETS[playerId];
    if (!fields || !store) return false;
    var ls = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try { if (ls && ls.getItem(FLAG) === playerId) return false; } catch (e) {}
    fields.forEach(function (k) { store[k] = 0; });
    try { if (ls) ls.setItem(FLAG, playerId); } catch (e) {}
    return true;
  }

  window.SEQRecordsReset = { run: run, RESETS: RESETS, FLAG: FLAG };
})();
