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
    { key: 'prog', name: 'Progresión', ids: ['first_game', 'games_5', 'games_10', 'games_20', 'games_50'] },
    { key: 'racha', name: 'Rachas', ids: ['streak_5', 'streak_10', 'streak_20', 'streak_30', 'sharp_eye', 'sin_preferencias'] },
    { key: 'nivel', name: 'Nivel', ids: ['level_5', 'level_10', 'level_20', 'level_30'] },
    { key: 'aciertos', name: 'Aciertos', ids: ['correct_100', 'correct_400', 'correct_800'] },
    { key: 'dominio', name: 'Dominio', ids: ['master_10', 'master_50', 'master_100', 'master_200', 'polimata', 'balanced_master'] },
    { key: 'errores', name: 'Aprender de los errores', ids: ['cleaner_5', 'cleaner_25', 'limpieza_general'] },
    { key: 'modos', name: 'Modos de juego', ids: ['surv_ameba', 'surv_humano', 'surv_derrame', 'sd_primer_riesgo', 'tt_15', 'tt_30', 'tt_50', 'sin_frenos', 'mental_calc_15', 'mental_calc_30', 'mental_calc_40'] },
    { key: 'duelo', name: 'Duelo', ids: ['duel_primera_sangre', 'duel_victoria_inaugural', 'duel_por_los_pelos', 'duel_contra_las_cuerdas', 'duel_rey_del_empate', 'duel_cinco_victorias', 'duel_tres_al_hilo', 'duel_revancha', 'duel_otra_vez_tu', 'duel_sin_titubear', 'duel_apuestas_calculada', 'duel_apuestas_ultima_locura'] },
    { key: 'especial', name: 'Especiales', ids: ['noctambulo', 'diurno', 'mente_fracturada', 'medal_collector_10', 'medal_collector_20', 'medal_collector_30'] },
    { key: 'secretos', name: 'Secretos', ids: ['lucidez_mente_despierta', 'lucidez_conexiones_imposibles', 'lucidez_absoluta', 'all_medals_secret'] }
  ];

  // Progreso medible de los logros pendientes: [valor actual, objetivo, unidad]. Mismas fuentes que sus
  // condiciones en medals.js; si una condición cambia allí, aquí solo se desajusta la barra, nunca el logro.
  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; }
  function safe(fn) { try { return fn(); } catch (e) { return 0; } }
  function collectorCount(s) {
    var skip = ['medal_collector_10', 'medal_collector_20', 'medal_collector_30', 'all_medals_secret'];
    return (s.unlockedMedals || []).filter(function (id) { return skip.indexOf(id) === -1 && isActiveMedalId(id); }).length;
  }
  var PROGRESS = {
    games_5: function (s) { return [n(s.gamesPlayed), 5, 'partidas']; },
    games_10: function (s) { return [n(s.gamesPlayed), 10, 'partidas']; },
    games_20: function (s) { return [n(s.gamesPlayed), 20, 'partidas']; },
    games_50: function (s) { return [n(s.gamesPlayed), 50, 'partidas']; },
    streak_5: function (s) { return [n(s.standardBestStreak), 5, 'seguidas']; },
    streak_10: function (s) { return [n(s.standardBestStreak), 10, 'seguidas']; },
    streak_20: function (s) { return [n(s.standardBestStreak), 20, 'seguidas']; },
    streak_30: function (s) { return [n(s.bestStreak), 30, 'seguidas']; },
    sharp_eye: function (s) { return [n(s.hardBestStreak), 5, 'seguidas']; },
    sin_preferencias: function (s) { return [n(s.noRepeatCatBestStreak), 10, 'seguidas']; },
    level_5: function (s) { return [safe(function () { return getLevelData(s.xp); }), 5, 'nivel']; },
    level_10: function (s) { return [safe(function () { return getLevelData(s.xp); }), 10, 'nivel']; },
    level_20: function (s) { return [safe(function () { return getLevelData(s.xp); }), 20, 'nivel']; },
    level_30: function (s) { return [safe(function () { return getLevelData(s.xp); }), 30, 'nivel']; },
    correct_100: function (s) { return [n(s.totalCorrect), 100, 'aciertos']; },
    correct_400: function (s) { return [n(s.totalCorrect), 400, 'aciertos']; },
    correct_800: function (s) { return [n(s.totalCorrect), 800, 'aciertos']; },
    master_10: function (s) { return [safe(function () { return getMasteredCount(s); }), 10, 'dominadas']; },
    master_50: function (s) { return [safe(function () { return getMasteredCount(s); }), 50, 'dominadas']; },
    master_100: function (s) { return [safe(function () { return getMasteredCount(s); }), 100, 'dominadas']; },
    master_200: function (s) { return [safe(function () { return getMasteredCount(s); }), 200, 'dominadas']; },
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
    duel_tres_al_hilo: function (s) { return [n(s.duelStats && s.duelStats.bestWinStreak), 3, 'victorias seguidas']; },
    duel_otra_vez_tu: function (s) { return [n(s.duelStats && s.duelStats.bestWinsVsRival), 3, 'victorias']; },
    medal_collector_10: function (s) { return [collectorCount(s), 10, 'logros']; },
    medal_collector_20: function (s) { return [collectorCount(s), 20, 'logros']; },
    medal_collector_30: function (s) { return [collectorCount(s), 30, 'logros']; }
  };

  // Símbolos SVG que usa Estadísticas (títulos de sección, récords): se inyectan una vez en el documento.
  var SPRITE = '<symbol id="sb-hat" viewBox="0 0 64 64"><path d="M20 12 L44 12 L46 42 L18 42 Z" fill="#1c2340"/><rect x="18.6" y="34" width="26.8" height="5.5" fill="#5b2e8f"/><path d="M6 44 C6 40 58 40 58 44 C58 50 6 50 6 44 Z" fill="#1c2340"/><path d="M23 15 L25 38" stroke="#46557f" stroke-width="2.4" stroke-linecap="round"/><circle cx="40" cy="36.7" r="2.2" fill="#c9992e"/></symbol> <symbol id="sb-flame" viewBox="0 0 64 64"><path d="M32 6 C34 18 48 24 48 40 C48 51 41 58 32 58 C23 58 16 51 16 40 C16 30 22 26 24 18 C28 24 28 28 30 30 C32 22 30 14 32 6 Z" fill="#e8663a" stroke="#1c2340" stroke-width="1.6" stroke-linejoin="round"/><path d="M32 30 C34 38 42 40 42 47 C42 53 37 56 32 56 C27 56 22 53 22 47 C22 42 26 40 27 35 C29 38 30 39 31 40 C32 36 31 33 32 30 Z" fill="#f6c453"/></symbol> <symbol id="sb-spyglass" viewBox="0 0 64 64"><g transform="rotate(-35 32 32)"><rect x="8" y="26" width="16" height="12" rx="2" fill="#c9992e" stroke="#1c2340" stroke-width="1.5"/><rect x="24" y="24" width="18" height="16" rx="2" fill="#1849b3" stroke="#1c2340" stroke-width="1.5"/><rect x="42" y="22" width="14" height="20" rx="2" fill="#c9992e" stroke="#1c2340" stroke-width="1.5"/><rect x="56" y="24" width="3" height="16" rx="1" fill="#1c2340"/><path d="M27 28 L39 28" stroke="#9fc0ff" stroke-width="2" stroke-linecap="round"/></g></symbol> <symbol id="sb-compass" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#f4efe4" stroke="#c9992e" stroke-width="3"/><circle cx="32" cy="32" r="19" fill="none" stroke="#1c2340" stroke-width="1" opacity=".4"/><path d="M32 12 L37 32 L32 52 L27 32 Z" fill="#1c2340"/><path d="M32 12 L37 32 L27 32 Z" fill="#b6202f"/><path d="M12 32 L32 27 L52 32 L32 37 Z" fill="#c9992e" opacity=".75"/><circle cx="32" cy="32" r="3" fill="#c9992e" stroke="#1c2340" stroke-width="1"/></symbol> <symbol id="sb-laurel" viewBox="0 0 64 64"><g fill="#c9992e" stroke="#8a6414" stroke-width=".8"><path d="M30 56 C18 50 10 38 12 22" fill="none" stroke="#8a6414" stroke-width="2"/><path d="M34 56 C46 50 54 38 52 22" fill="none" stroke="#8a6414" stroke-width="2"/><ellipse cx="12" cy="24" rx="3.2" ry="6.5" transform="rotate(-15 12 24)"/><ellipse cx="13" cy="35" rx="3.2" ry="6.5" transform="rotate(-40 13 35)"/><ellipse cx="19" cy="45" rx="3.2" ry="6.5" transform="rotate(-60 19 45)"/><ellipse cx="52" cy="24" rx="3.2" ry="6.5" transform="rotate(15 52 24)"/><ellipse cx="51" cy="35" rx="3.2" ry="6.5" transform="rotate(40 51 35)"/><ellipse cx="45" cy="45" rx="3.2" ry="6.5" transform="rotate(60 45 45)"/></g><path d="M32 16 L35.5 25 L45 25.5 L37.6 31.5 L40.2 41 L32 35.6 L23.8 41 L26.4 31.5 L19 25.5 L28.5 25 Z" fill="#1849b3" stroke="#1c2340" stroke-width="1.2" stroke-linejoin="round"/></symbol> <symbol id="sb-book" viewBox="0 0 64 64"><rect x="14" y="8" width="36" height="48" rx="3" fill="#1c2340" stroke="#c9992e" stroke-width="2"/><rect x="18" y="12" width="28" height="40" rx="2" fill="none" stroke="#c9992e" stroke-width="1" opacity=".7"/><path d="M32 22 L35 30 L32 38 L29 30 Z" fill="#c9992e"/><rect x="44" y="40" width="5" height="18" fill="#b6202f"/><path d="M44 58 L46.5 55 L49 58" fill="#b6202f"/></symbol> <symbol id="sb-globe" viewBox="0 0 64 64"><circle cx="32" cy="30" r="21" fill="#1849b3" stroke="#1c2340" stroke-width="1.6"/><path d="M20 20 C26 18 28 24 24 28 C21 31 25 36 22 40 C18 38 14 32 15 26 C16 23 18 21 20 20 Z M36 12 C42 14 46 18 44 22 C40 24 38 20 34 22 C32 18 33 14 36 12 Z M38 30 C44 30 48 34 46 40 C44 44 40 46 37 44 C38 40 35 36 38 30 Z" fill="#6fbf73"/><ellipse cx="32" cy="30" rx="21" ry="8" fill="none" stroke="#e8c874" stroke-width="1.2" opacity=".8"/><path d="M14 50 L50 50" stroke="#c9992e" stroke-width="3" stroke-linecap="round"/><path d="M32 51 L32 57 M24 58 L40 58" stroke="#c9992e" stroke-width="3" stroke-linecap="round"/></symbol> <symbol id="sb-quill" viewBox="0 0 64 64"><path d="M50 6 C34 10 22 24 18 44 L22 46 C30 30 40 20 50 6 Z" fill="#f4efe4" stroke="#1c2340" stroke-width="1.5" stroke-linejoin="round"/><path d="M50 6 C42 16 30 30 22 46" fill="none" stroke="#c9992e" stroke-width="1.6"/><path d="M18 44 L12 58 L22 46 Z" fill="#1c2340"/><path d="M8 58 L30 58" stroke="#5b2e8f" stroke-width="2.4" stroke-linecap="round"/></symbol> <symbol id="sb-shield" viewBox="0 0 64 64"><path d="M32 6 L52 12 L52 30 C52 44 43 53 32 58 C21 53 12 44 12 30 L12 12 Z" fill="#1849b3" stroke="#1c2340" stroke-width="1.8" stroke-linejoin="round"/><path d="M32 11 L47 16 L47 30 C47 41 40 48 32 52 Z" fill="#c9992e"/><path d="M32 11 L17 16 L17 30 C17 41 24 48 32 52 Z" fill="#1c2340" opacity=".55"/><path d="M24 30 L30 36 L41 24" fill="none" stroke="#f4efe4" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></symbol> <symbol id="sb-broom" viewBox="0 0 64 64"><path d="M46 6 L30 36" stroke="#8a6414" stroke-width="4" stroke-linecap="round"/><path d="M26 32 L38 38 L30 56 C24 58 16 54 12 48 Z" fill="#e8c874" stroke="#1c2340" stroke-width="1.5" stroke-linejoin="round"/><path d="M26 34 L37 40" stroke="#b6202f" stroke-width="3"/><path d="M18 46 L26 40 M22 51 L30 42" stroke="#c9992e" stroke-width="1.2"/><path d="M48 44 L50 48 L54 50 L50 52 L48 56 L46 52 L42 50 L46 48 Z" fill="#c9992e"/></symbol> <symbol id="sb-bolt" viewBox="0 0 64 64"><path d="M36 4 L14 36 L30 36 L24 60 L50 24 L34 24 Z" fill="#f6c453" stroke="#1c2340" stroke-width="1.8" stroke-linejoin="round"/><path d="M34 10 L20 32" stroke="#fff7d6" stroke-width="2" stroke-linecap="round"/></symbol> <symbol id="sb-key" viewBox="0 0 64 64"><circle cx="20" cy="22" r="12" fill="none" stroke="#c9992e" stroke-width="5"/><circle cx="20" cy="22" r="4" fill="#1c2340"/><path d="M28 30 L54 56" stroke="#c9992e" stroke-width="5" stroke-linecap="round"/><path d="M44 46 L50 40 M50 52 L56 46" stroke="#c9992e" stroke-width="5" stroke-linecap="round"/><path d="M28 30 L54 56" stroke="#8a6414" stroke-width="1.2" opacity=".6"/></symbol> <symbol id="sb-moon" viewBox="0 0 64 64"><path d="M40 8 C26 10 16 22 16 36 C16 49 27 58 40 58 C46 58 51 56 54 52 C40 52 30 42 30 30 C30 20 34 12 40 8 Z" fill="#e8c874" stroke="#1c2340" stroke-width="1.6"/><circle cx="26" cy="28" r="2.4" fill="#c9992e"/><circle cx="24" cy="42" r="3" fill="#c9992e"/><path d="M48 14 L49.5 18 L53.5 19.5 L49.5 21 L48 25 L46.5 21 L42.5 19.5 L46.5 18 Z" fill="#1849b3"/></symbol> <symbol id="sb-shard" viewBox="0 0 64 64"><path d="M30 6 L46 18 L42 40 L28 58 L18 36 Z" fill="#7c3aed" stroke="#1c2340" stroke-width="1.6" stroke-linejoin="round"/><path d="M30 6 L32 30 L46 18 M32 30 L28 58 M32 30 L18 36 M32 30 L42 40" stroke="#c4b5fd" stroke-width="1.2" fill="none"/><path d="M26 14 L22 28" stroke="#ede9fe" stroke-width="2" stroke-linecap="round"/></symbol> <symbol id="sb-moustache" viewBox="0 0 64 64"><path d="M32 30 C28 24 20 24 16 30 C13 34 8 34 5 30 C6 40 16 44 24 40 C28 38 30 36 32 34 C34 36 36 38 40 40 C48 44 58 40 59 30 C56 34 51 34 48 30 C44 24 36 24 32 30 Z" fill="#3b2a1a" stroke="#1c2340" stroke-width="1.2" stroke-linejoin="round"/><circle cx="5.5" cy="29" r="2.2" fill="#3b2a1a"/><circle cx="58.5" cy="29" r="2.2" fill="#3b2a1a"/><path d="M22 30 C26 29 28 31 30 32" stroke="#7a5a3a" stroke-width="1.4" fill="none"/></symbol> <symbol id="sb-crown" viewBox="0 0 64 64"><path d="M8 22 L20 34 L32 14 L44 34 L56 22 L52 48 L12 48 Z" fill="#e8c874" stroke="#1c2340" stroke-width="1.8" stroke-linejoin="round"/><rect x="12" y="48" width="40" height="7" rx="1.5" fill="#c9992e" stroke="#1c2340" stroke-width="1.5"/><circle cx="32" cy="14" r="3" fill="#b6202f"/><circle cx="8" cy="22" r="2.6" fill="#1849b3"/><circle cx="56" cy="22" r="2.6" fill="#1849b3"/><circle cx="32" cy="40" r="3.4" fill="#b6202f" stroke="#1c2340" stroke-width="1"/></symbol> <symbol id="sb-gauntlet" viewBox="0 0 64 64"><path d="M20 58 L20 40 C14 36 12 28 16 22 L18 12 C19 9 23 9 23 12 L24 22 L26 8 C27 5 31 5 31 8 L31 22 L34 8 C35 5 39 5 39 8 L38 24 L42 14 C43 11 47 12 46 15 L42 34 C42 40 40 42 38 44 L38 58 Z" fill="#1c2340" stroke="#c9992e" stroke-width="1.6" stroke-linejoin="round"/><rect x="18" y="50" width="22" height="8" rx="1.5" fill="#5b2e8f" stroke="#c9992e" stroke-width="1.4"/></symbol> <symbol id="sb-monocle" viewBox="0 0 64 64"><circle cx="28" cy="26" r="16" fill="#dbeafe" fill-opacity=".55" stroke="#c9992e" stroke-width="4"/><path d="M20 20 C23 16 28 15 32 16" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M40 37 C44 44 42 50 48 54 C52 57 56 54 54 50" fill="none" stroke="#c9992e" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 2.4"/></symbol> <symbol id="sb-eye" viewBox="0 0 64 64"><path d="M4 32 C14 16 50 16 60 32 C50 48 14 48 4 32 Z" fill="#f4efe4" stroke="#1c2340" stroke-width="1.8"/><circle cx="32" cy="32" r="11" fill="#5b2e8f"/><circle cx="32" cy="32" r="5" fill="#1c2340"/><circle cx="35" cy="28" r="2.4" fill="#fff"/><path d="M32 6 L32 12 M16 10 L19 15 M48 10 L45 15" stroke="#c9992e" stroke-width="2.4" stroke-linecap="round"/></symbol> <symbol id="sb-constellation" viewBox="0 0 64 64"><path d="M10 44 L24 20 L38 34 L54 12 M24 20 L30 52 L38 34" fill="none" stroke="#c9992e" stroke-width="1.8"/><g fill="#e8c874" stroke="#1c2340" stroke-width="1"><circle cx="10" cy="44" r="4"/><circle cx="24" cy="20" r="5"/><circle cx="38" cy="34" r="4.4"/><circle cx="54" cy="12" r="4"/><circle cx="30" cy="52" r="3.6"/></g></symbol> <symbol id="sb-gem" viewBox="0 0 64 64"><path d="M16 12 L48 12 L60 26 L32 58 L4 26 Z" fill="#60a5fa" stroke="#1c2340" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 26 L60 26 M16 12 L24 26 L32 58 L40 26 L48 12 M24 26 L32 12 L40 26" fill="none" stroke="#1c2340" stroke-width="1.1"/><path d="M24 26 L32 58 L4 26 Z" fill="#93c5fd"/><path d="M16 12 L24 26 L4 26 Z" fill="#dbeafe"/></symbol> <symbol id="sb-keyhole" viewBox="0 0 64 64"><rect x="10" y="6" width="44" height="52" rx="8" fill="#1c2340" stroke="#c9992e" stroke-width="2.4"/><circle cx="32" cy="26" r="7.5" fill="#0b1020"/><path d="M28 30 L25 46 L39 46 L36 30 Z" fill="#0b1020"/><circle cx="32" cy="26" r="7.5" fill="none" stroke="#e8c874" stroke-width="1.2" opacity=".6"/></symbol>';
  function ensureSprite() {
    if (typeof document === 'undefined' || document.getElementById('sb-sprite') || !document.body) return;
    var d = document.createElement('div');
    d.innerHTML = '<svg id="sb-sprite" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' + SPRITE + '</svg>';
    document.body.insertBefore(d.firstChild, document.body.firstChild);
  }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureSprite); else ensureSprite(); }

  // Insignia ilustrada del logro (assets/logros/<id>.webp). El emoji de medals.js queda como texto alternativo
  // (avisos de texto) y como respaldo si la imagen no carga.
  // Escudos de cada familia (assets/familias/<key>.webp); «Otros» conserva su emoji.
  var FAMILY_IMG = { prog: 1, racha: 1, nivel: 1, aciertos: 1, dominio: 1, errores: 1, modos: 1, duelo: 1, especial: 1, secretos: 1 };
  function iconHTML(m) {
    return '<img class="ach-img" src="assets/logros/' + esc(m.id) + '.webp" alt="" draggable="false" onerror="this.remove()">';
  }
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var openState = {};

  function row(m, s, unlocked) {
    var frag = false; try { frag = FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1; } catch (e) {}
    if (m.secret && !unlocked) {
      return '<div class="ach-row is-secret"><div class="ach-ico"><span class="ach-secret-seal" aria-hidden="true">?</span></div><div class="ach-body"><div class="ach-title">???</div>' +
        '<div class="ach-desc">Logro secreto</div></div></div>';
    }
    var prog = '';
    if (!unlocked && PROGRESS[m.id]) {
      var p = PROGRESS[m.id](s), cur = Math.min(p[0], p[1]), pct = Math.round(cur / p[1] * 100);
      prog = '<div class="ach-prog"><div class="ach-bar"><span style="width:' + pct + '%"></span></div><span class="ach-num">' + cur + '/' + p[1] + '</span></div>';
    }
    var av = ''; try { av = getMedalAvatar(m.id) || ''; } catch (e) {}
    var avTag = av ? '<span class="ach-frag ach-avatar' + (unlocked ? ' got' : '') + '" title="' + (unlocked ? 'Avatar desbloqueado' : 'Desbloquea un avatar') + '">Avatar</span>' : '';
    var tag = (frag ? '<span class="ach-frag' + (unlocked ? ' got' : '') + '" title="' + (unlocked ? 'Fragmento obtenido' : 'Otorga un Fragmento de Mente') + '"><img src="assets/ui/fragmento.webp" alt="" draggable="false"></span>' : '') + avTag;
    return '<div class="ach-row ' + (unlocked ? 'is-done' : 'is-locked') + '">' +
      '<div class="ach-ico has-img">' + iconHTML(m) + (unlocked ? '<span class="ach-check" aria-hidden="true">✓</span>' : '') + '</div>' +
      '<div class="ach-body"><div class="ach-title">' + esc(m.title) + tag + '</div><div class="ach-desc">' + esc(m.desc) + '</div>' + prog + '</div></div>';
  }

  function render(container) {
    var s = (typeof store !== 'undefined' && store) || {};
    var got = s.unlockedMedals || [];
    var byId = {}; ALL_MEDALS.forEach(function (m) { byId[m.id] = m; });
    var used = {};
    var groups = GROUPS.map(function (g) {
      var list = g.ids.filter(function (id) { if (byId[id]) { used[id] = true; return true; } return false; }).map(function (id) { return byId[id]; });
      return { key: g.key, name: g.name, list: list };
    });
    var rest = ALL_MEDALS.filter(function (m) { return !used[m.id]; });
    if (rest.length) groups.splice(groups.length - 1, 0, { key: 'otros', name: 'Otros', list: rest });

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
        '<summary><span class="ach-g-ico' + (FAMILY_IMG[g.key] ? ' has-img' : '') + '" aria-hidden="true">' + (FAMILY_IMG[g.key] ? '<img src="assets/familias/' + g.key + '.webp" alt="" draggable="false">' : '') + '</span><span class="ach-g-name">' + g.name + '</span>' +
        '<span class="ach-g-count">' + (complete ? '✓ ' : '') + done + '/' + total + '</span>' +
        '<span class="ach-g-bar"><span style="width:' + Math.round(done / total * 100) + '%"></span></span></summary>' +
        '<div class="ach-list">' + sorted.map(function (m) { return row(m, s, got.indexOf(m.id) !== -1); }).join('') + '</div></details>';
    }).join('');
    container.querySelectorAll('details.ach-group').forEach(function (d) {
      d.addEventListener('toggle', function () { openState[d.getAttribute('data-key')] = d.open; });
    });
  }

  window.SEQAchievements = { render: render, iconHTML: iconHTML, GROUPS: GROUPS, PROGRESS: PROGRESS };
})();
