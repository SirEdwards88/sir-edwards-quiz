// SirEdwards Quiz v2.0 — pestaña Logros agrupada y con progreso.
//
// Solo presentación: el catálogo y las condiciones siguen en src/data/medals.js (ALL_MEDALS) y el estado en
// store.unlockedMedals. Aquí se decide CÓMO se enseñan:
//   - Por familias (Progresión, Rachas, Nivel, Dominio…), cada una plegable con su «x/y» y su barra.
//   - Cada logro pendiente medible muestra cuánto le falta («3/5 partidas»).
//   - Un logro nuevo en medals.js que no esté en ninguna familia aparece en «Otros»: nunca desaparece.
//   - Los secretos siguen como «???» hasta conseguirlos.
// index.html (renderMedals) delega aquí si este módulo está cargado. Script clásico, sin dependencias.

(function () {
  'use strict';

  var GROUPS = [
    { key: 'prog', name: 'Progresión', icon: '🎮', ids: ['first_game', 'games_5', 'games_10', 'games_20', 'games_50'] },
    { key: 'racha', name: 'Rachas', icon: '🔥', ids: ['streak_5', 'streak_10', 'sharp_eye', 'sin_preferencias'] },
    { key: 'nivel', name: 'Nivel', icon: '⭐', ids: ['level_5', 'level_10', 'level_20', 'level_30'] },
    { key: 'aciertos', name: 'Aciertos', icon: '🎯', ids: ['correct_100', 'correct_300', 'correct_600'] },
    { key: 'dominio', name: 'Dominio', icon: '📚', ids: ['master_10', 'master_50', 'master_150', 'master_250', 'world_citizen', 'polimata', 'balanced_master'] },
    { key: 'errores', name: 'Aprender de los errores', icon: '🔄', ids: ['cleaner_5', 'cleaner_25', 'limpieza_general'] },
    { key: 'modos', name: 'Modos de juego', icon: '🏆', ids: ['surv_ameba', 'surv_humano', 'surv_derrame', 'sd_primer_riesgo', 'tt_15', 'tt_30', 'tt_50', 'sin_frenos', 'mental_calc_15', 'mental_calc_30', 'mental_calc_40'] },
    { key: 'duelo', name: 'Duelo', icon: '⚔️', ids: ['duel_primera_sangre', 'duel_victoria_inaugural', 'duel_por_los_pelos', 'duel_eso_era_un_duelo', 'duel_rey_del_empate', 'duel_cinco_victorias', 'duel_revancha', 'duel_otra_vez_tu'] },
    { key: 'especial', name: 'Especiales', icon: '✨', ids: ['noctambulo', 'mente_fracturada', 'medal_collector_10', 'medal_collector_20', 'medal_collector_30'] },
    { key: 'secretos', name: 'Secretos', icon: '👁️', ids: ['lucidez_mente_despierta', 'lucidez_conexiones_imposibles', 'lucidez_absoluta', 'all_medals_secret'] }
  ];

  // Progreso medible de los logros pendientes: [valor actual, objetivo, unidad]. Mismas fuentes que sus
  // condiciones en medals.js; si una condición cambia allí, aquí solo se desajusta la barra, nunca el logro.
  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; }
  function safe(fn) { try { return fn(); } catch (e) { return 0; } }
  function collectorCount(s) {
    var skip = ['medal_collector_10', 'medal_collector_20', 'medal_collector_30', 'all_medals_secret'];
    return (s.unlockedMedals || []).filter(function (id) { return skip.indexOf(id) === -1; }).length;
  }
  var PROGRESS = {
    games_5: function (s) { return [n(s.gamesPlayed), 5, 'partidas']; },
    games_10: function (s) { return [n(s.gamesPlayed), 10, 'partidas']; },
    games_20: function (s) { return [n(s.gamesPlayed), 20, 'partidas']; },
    games_50: function (s) { return [n(s.gamesPlayed), 50, 'partidas']; },
    streak_5: function (s) { return [n(s.standardBestStreak), 5, 'seguidas']; },
    streak_10: function (s) { return [n(s.standardBestStreak), 10, 'seguidas']; },
    sharp_eye: function (s) { return [n(s.hardBestStreak), 5, 'seguidas']; },
    sin_preferencias: function (s) { return [n(s.noRepeatCatBestStreak), 10, 'seguidas']; },
    level_5: function (s) { return [safe(function () { return getLevelData(s.xp); }), 5, 'nivel']; },
    level_10: function (s) { return [safe(function () { return getLevelData(s.xp); }), 10, 'nivel']; },
    level_20: function (s) { return [safe(function () { return getLevelData(s.xp); }), 20, 'nivel']; },
    level_30: function (s) { return [safe(function () { return getLevelData(s.xp); }), 30, 'nivel']; },
    correct_100: function (s) { return [n(s.totalCorrect), 100, 'aciertos']; },
    correct_300: function (s) { return [n(s.totalCorrect), 300, 'aciertos']; },
    correct_600: function (s) { return [n(s.totalCorrect), 600, 'aciertos']; },
    master_10: function (s) { return [safe(function () { return getMasteredCount(s); }), 10, 'dominadas']; },
    master_50: function (s) { return [safe(function () { return getMasteredCount(s); }), 50, 'dominadas']; },
    master_150: function (s) { return [safe(function () { return getMasteredCount(s); }), 100, 'dominadas']; },
    master_250: function (s) { return [safe(function () { return getMasteredCount(s); }), 200, 'dominadas']; },
    cleaner_5: function (s) { return [n(s.errorsCleaned), 5, 'superadas']; },
    cleaner_25: function (s) { return [n(s.errorsCleaned), 25, 'superadas']; },
    tt_15: function (s) { return [n(s.maxTimeTrialScore), 15, 'aciertos']; },
    tt_30: function (s) { return [n(s.maxTimeTrialScore), 30, 'aciertos']; },
    tt_50: function (s) { return [n(s.maxTimeTrialScore), 50, 'aciertos']; },
    sin_frenos: function (s) { return [n(s.timeTrialBestStreak), 10, 'seguidas']; },
    mental_calc_15: function (s) { return [n(s.bestMentalCalcCorrect), 15, 'aciertos']; },
    mental_calc_30: function (s) { return [n(s.bestMentalCalcCorrect), 30, 'aciertos']; },
    mental_calc_40: function (s) { return [n(s.bestMentalCalcCorrect), 40, 'aciertos']; },
    duel_rey_del_empate: function (s) { return [n(s.duelStats && s.duelStats.draws), 3, 'empates']; },
    duel_cinco_victorias: function (s) { return [n(s.duelStats && s.duelStats.wins), 5, 'victorias']; },
    duel_otra_vez_tu: function (s) { return [n(s.duelStats && s.duelStats.bestWinsVsRival), 3, 'victorias']; },
    medal_collector_10: function (s) { return [collectorCount(s), 10, 'logros']; },
    medal_collector_20: function (s) { return [collectorCount(s), 20, 'logros']; },
    medal_collector_30: function (s) { return [collectorCount(s), 30, 'logros']; }
  };

  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var openState = {};

  function row(m, s, unlocked) {
    var frag = false; try { frag = FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1; } catch (e) {}
    var lock = typeof MEDAL_LOCK_SVG === 'string' ? MEDAL_LOCK_SVG : '🔒';
    if (m.secret && !unlocked) {
      return '<div class="ach-row is-secret"><div class="ach-ico">' + lock + '</div><div class="ach-body"><div class="ach-title">???</div>' +
        '<div class="ach-desc">Logro secreto</div></div></div>';
    }
    var prog = '';
    if (!unlocked && PROGRESS[m.id]) {
      var p = PROGRESS[m.id](s), cur = Math.min(p[0], p[1]), pct = Math.round(cur / p[1] * 100);
      prog = '<div class="ach-prog"><div class="ach-bar"><span style="width:' + pct + '%"></span></div><span class="ach-num">' + cur + '/' + p[1] + '</span></div>';
    }
    var tag = frag ? '<span class="ach-frag' + (unlocked ? ' got' : '') + '" title="' + (unlocked ? 'Fragmento obtenido' : 'Otorga un Fragmento de Mente') + '">🧩</span>' : '';
    return '<div class="ach-row ' + (unlocked ? 'is-done' : 'is-locked') + '">' +
      '<div class="ach-ico">' + m.icon + (unlocked ? '<span class="ach-check" aria-hidden="true">✓</span>' : '') + '</div>' +
      '<div class="ach-body"><div class="ach-title">' + esc(m.title) + tag + '</div><div class="ach-desc">' + esc(m.desc) + '</div>' + prog + '</div></div>';
  }

  function render(container) {
    var s = (typeof store !== 'undefined' && store) || {};
    var got = s.unlockedMedals || [];
    var byId = {}; ALL_MEDALS.forEach(function (m) { byId[m.id] = m; });
    var used = {};
    var groups = GROUPS.map(function (g) {
      var list = g.ids.filter(function (id) { if (byId[id]) { used[id] = true; return true; } return false; }).map(function (id) { return byId[id]; });
      return { key: g.key, name: g.name, icon: g.icon, list: list };
    });
    var rest = ALL_MEDALS.filter(function (m) { return !used[m.id]; });
    if (rest.length) groups.splice(groups.length - 1, 0, { key: 'otros', name: 'Otros', icon: '🏅', list: rest });

    container.classList.add('ach-groups');
    container.innerHTML = groups.filter(function (g) { return g.list.length; }).map(function (g) {
      var done = g.list.filter(function (m) { return got.indexOf(m.id) !== -1; }).length, total = g.list.length;
      // Conseguidos primero, luego los pendientes más cercanos a completarse.
      var sorted = g.list.slice().sort(function (a, b) {
        var ua = got.indexOf(a.id) !== -1, ub = got.indexOf(b.id) !== -1;
        if (ua !== ub) return ua ? -1 : 1;
        if (a.secret !== b.secret) return a.secret ? 1 : -1;
        var pa = PROGRESS[a.id] ? PROGRESS[a.id](s) : null, pb = PROGRESS[b.id] ? PROGRESS[b.id](s) : null;
        return (pb ? pb[0] / pb[1] : 0) - (pa ? pa[0] / pa[1] : 0);
      });
      var isOpen = openState[g.key] != null ? openState[g.key] : (done > 0 && done < total);
      var complete = done === total;
      return '<details class="ach-group' + (complete ? ' is-complete' : '') + '" data-key="' + g.key + '"' + (isOpen ? ' open' : '') + '>' +
        '<summary><span class="ach-g-ico" aria-hidden="true">' + g.icon + '</span><span class="ach-g-name">' + g.name + '</span>' +
        '<span class="ach-g-count">' + (complete ? '✓ ' : '') + done + '/' + total + '</span>' +
        '<span class="ach-g-bar"><span style="width:' + Math.round(done / total * 100) + '%"></span></span></summary>' +
        '<div class="ach-list">' + sorted.map(function (m) { return row(m, s, got.indexOf(m.id) !== -1); }).join('') + '</div></details>';
    }).join('');
    container.querySelectorAll('details.ach-group').forEach(function (d) {
      d.addEventListener('toggle', function () { openState[d.getAttribute('data-key')] = d.open; });
    });
  }

  window.SEQAchievements = { render: render, GROUPS: GROUPS, PROGRESS: PROGRESS };
})();
