// SirEdwards Quiz — victorias por abandono en las estadísticas locales de Duelo. Script clásico (window.SEQDuelForfeit).
//
// El servidor ya cuenta como victoria (y mueve el ELO) cuando el rival abandona. Las estadísticas locales no la contaban, y la ficha y
// los rankings no cuadraban con «Estadísticas». Ahora la victoria por abandono suma a un contador APARTE (duelStats.forfeitWins) que solo
// alimenta los totales visibles de victorias. Todo lo demás queda como estaba:
//   · NO suma a duelStats.wins, played, rachas, rivales (bestWinsVsRival), revancha ni hitos: los logros siguen exigiendo una victoria completada.
//   · NO cambia el ELO (lo calcula el servidor).
//   · Cada duelo cuenta una sola vez (clave 'online:<id>' en duelPlayedCodes, que ya se fusiona entre dispositivos por unión).
//   · Solo cuentan duelos EMPEZADOS desde FROM: no se reconstruye ni se «recupera» el historial anterior al abrir un resultado viejo.
// Los perfiles antiguos no traen forfeitWins: se lee como 0.

(function () {
  'use strict';

  // Primer día en que se cuentan (el de esta versión). Un duelo cuyo `t0` sea anterior no suma nunca.
  var FROM = Date.UTC(2026, 10, 13);

  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; }

  // info = lo que registerOnlineDuelResult recibe: {forfeit, abandoned, result, startedAt}. `abandoned` = el duelo acabó por abandono de alguien.
  function counts(info) {
    if (!info || info.forfeit !== true || info.abandoned !== true || info.result !== 'win') return false;
    var t0 = Number(info.startedAt);
    return isFinite(t0) && t0 >= FROM;
  }

  function record(ds) {
    ds.forfeitWins = n(ds.forfeitWins) + 1;
    return ds.forfeitWins;
  }

  // Totales visibles de Estadísticas. Los logros NO leen esto: siguen leyendo duelStats.wins.
  function totals(ds) {
    ds = ds || {};
    var wins = n(ds.wins) + n(ds.forfeitWins), losses = n(ds.losses), draws = n(ds.draws);
    var played = wins + losses + draws;
    return { wins: wins, losses: losses, draws: draws, played: played, rate: played > 0 ? Math.round(wins / played * 100) : null };
  }

  window.SEQDuelForfeit = { FROM: FROM, counts: counts, record: record, totals: totals };
})();
