// SirEdwards Quiz — Cálculo Clásico (en pruebas): arranque, tarjeta oculta y final de partida.
// El modo reutiliza el bucle de Cálculo Mental de index.html (currentGame.mode === 'mental_calc' con variant 'classic');
// aquí viven lo que es solo suyo: la tarjeta del menú (oculta salvo que el propietario la active), la comprobación
// de la variante y la tarjeta final, que NO toca estadísticas, récords de Turbo, logros, encargos ni ránkings.
// Script clásico (scope global). Reglas puras en src/utils/mental-classic.js.
(function () {
  'use strict';
  var FLAG = 'seq_beta_clasico';

  function flagOn() { try { return localStorage.getItem(FLAG) === '1'; } catch (e) { return false; } }

  // Activación: abrir la app con ?clasico=1 (se recuerda en este dispositivo) y ?clasico=0 para quitarlo.
  function applyFlagFromUrl() {
    try {
      var q = new URLSearchParams(location.search).get('clasico');
      if (q === '1') localStorage.setItem(FLAG, '1');
      else if (q === '0') localStorage.removeItem(FLAG);
    } catch (e) {}
  }

  function showCardIfEnabled() {
    var card = document.getElementById('mode-card-mental_classic');
    if (card) card.style.display = flagOn() ? '' : 'none';
  }

  function isClassic(g) { return !!g && g.mode === 'mental_calc' && g.variant === 'classic'; }

  function start() {
    if (!flagOn()) return;
    if (!(store.unlockedMedals || []).includes('tt_15')) {
      showInfoToast('Cálculo Mental sigue cerrado. Antes necesitas el logro «Velocidad Mental». Ya llegarás, o no.', 'candado');
      return;
    }
    confirmDiscardSavedGame(function () { startMentalCalcModeImpl('classic'); });
  }

  // Corazones del encabezado (hasta MAX_LIVES); con 0 vidas, la calavera de siempre.
  function livesHtml(lives) { return renderLivesHearts(lives, SEQMentalClassic.MAX_LIVES); }

  function finish() {
    if (mentalCalcTimer) { clearInterval(mentalCalcTimer); mentalCalcTimer = null; }
    clearTimeout(mentalCalcAutoCheckTimer);
    mentalCalcEndTime = 0;
    var g = currentGame;
    var totalQ = g.total > 0 ? g.total : 1;
    var accuracy = Math.round((g.correct / totalQ) * 100);

    // Marca local exclusiva del Clásico: no se mezcla con la de Turbo, no sube a ningún ránking.
    var best = store.mentalClassicBest || null;
    var isRecord = SEQMentalClassic.isBetter(g.correct, g.score, best);
    if (isRecord) store.mentalClassicBest = { correct: g.correct, score: g.score };
    clearSavedGame();
    saveStore(false);
    updateResumeButton();

    lastResultShareData = null;
    var shareBtn = document.getElementById('res-share-btn'); if (shareBtn) shareBtn.style.display = 'none';
    var backBtn = document.getElementById('res-back-btn'); if (backBtn) backBtn.textContent = 'Volver al Menú principal';

    document.getElementById('game-play-area').style.display = 'none';
    document.getElementById('results-card').style.display = 'block';
    var grid = document.getElementById('results-metrics-grid'); if (grid) grid.style.display = '';
    var phrase = document.getElementById('results-phrase-container'); if (phrase) phrase.style.display = '';

    document.getElementById('res-main-title').textContent = 'CÁLCULO CLÁSICO';
    document.getElementById('res-score-text').textContent = String(g.correct);
    document.getElementById('res-score-label').textContent = g.correct === 1 ? 'Acierto' : 'Aciertos';
    document.getElementById('res-percentage-text').textContent = String(g.score);
    document.getElementById('res-percentage-label').textContent = 'Puntos';

    var r = getModeEndPhrase(MENTAL_CALC_END_PHRASES, g.correct || 0, 'mentalcalc');
    document.getElementById('res-category-text').textContent = ({ mal: 'Las matemáticas ganan', normal: 'Tregua con los números', bien: 'Los números se rinden' })[r.category] || '';
    document.getElementById('res-phrase-text').textContent = r.phrase;
    setResultTone('mentalcalc', RESULT_MOOD_BY_CATEGORY.mentalcalc[r.category] || RESULT_MOOD_ICONS.mentalcalc, RESULT_CHARACTER_BY_CATEGORY[r.category] || null);
    renderLucidezStamp(null, 'ok');

    var avg = g.total > 0 ? (g.totalTimeMs / g.total / 1000).toFixed(1) : '0.0';
    renderModeChips([
      { icon: 'racha', label: 'Racha máxima', short: 'racha', value: String(g.bestStreak || 0) },
      { icon: 'tiempo', label: 'Tiempo medio por operación', value: avg + 's de media' }
    ]);
    renderRecordBadge(isRecord ? seqIco('copa') + 'NUEVO RÉCORD' : null, 'gold');

    var m1 = document.getElementById('session-mode-unlock-box'); if (m1) m1.style.display = 'none';
    var m2 = document.getElementById('session-medals-box'); if (m2) m2.style.display = 'none';
    if (r.category !== 'mal') playSound('win');
  }

  window.SEQMentalClassicUI = { isClassic: isClassic, start: start, finish: finish, livesHtml: livesHtml, flagOn: flagOn };
  applyFlagFromUrl();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showCardIfEnabled);
  else showCardIfEnabled();
})();
