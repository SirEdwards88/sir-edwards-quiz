// Duelo todos contra todos (2.4): registro de logros al terminar una sala.
// El SERVIDOR calcula los hitos de cada sala terminada (resultado.hitos: victoria, mesa_completa, corriente, niebla, ultimo);
// aquí solo se anotan en el progreso (una sola vez por sala) para evaluar las medallas del Duelo todos contra todos, igual que
// registerOnlineDuelResult hace con el 1 vs 1. NO toca las estadísticas, el ELO ni los logros del 1 vs 1.
// Usa las funciones globales de index.html (store, checkMedalsAndGetNew, checkFragmentRewardsAndGetNew, saveStore).
(function () {
  'use strict';

  function fragLabel(n) { return n + (Number(n) === 1 ? ' Fragmento' : ' Fragmentos'); }

  function register(info) {
    if (!info || !info.duelId || !info.hitos || typeof info.hitos !== 'object') return null;
    if (typeof store === 'undefined' || typeof checkMedalsAndGetNew !== 'function') return null;
    if (!Array.isArray(store.duelPlayedCodes)) store.duelPlayedCodes = [];
    var key = 'multi:' + info.duelId;
    if (store.duelPlayedCodes.indexOf(key) >= 0) return null;
    store.duelPlayedCodes.push(key);
    if (store.duelPlayedCodes.length > 200) store.duelPlayedCodes.shift();

    if (!store.duelStats || typeof store.duelStats !== 'object') store.duelStats = {};
    var ds = store.duelStats, h = info.hitos;
    if (h.victoria === true) ds.multiWins = (Number(ds.multiWins) || 0) + 1;
    if (h.mesa_completa === true) ds.multiMesaCompleta = true;
    if (h.corriente === true) ds.multiCorriente = true;
    if (h.niebla === true) ds.multiNiebla = true;
    if (h.ultimo === true) ds.multiUltimo = true;

    var medals = checkMedalsAndGetNew();
    var reward = typeof checkFragmentRewardsAndGetNew === 'function' ? checkFragmentRewardsAndGetNew() : null;
    if (typeof saveStore === 'function') saveStore(false);
    // Igual que en el 1 vs 1: todos los logros nuevos van en la tarjeta final; los que dan recompensa llevan además el
    // aviso flotante (src/ui/reward-toast.js); el premio por Fragmentos, si toca, va después.
    if (medals.length && typeof SEQRewardToast !== 'undefined') {
      SEQRewardToast.announceNow(medals);
      if (reward && typeof showInfoToast === 'function') setTimeout(function () { showInfoToast(fragLabel(reward.fragments) + ': ' + reward.text, 'copa'); }, 4600);
    } else {
      var parts = medals.map(function (m) { return m.title; });
      if (reward) parts.push(fragLabel(reward.fragments) + ': ' + reward.text);
      if (parts.length && typeof showInfoToast === 'function') showInfoToast('Desbloqueado: ' + parts.join(' · '), 'copa');
    }
    return { medals: medals, reward: reward };
  }

  window.SEQMultiResult = { register: register };
})();
