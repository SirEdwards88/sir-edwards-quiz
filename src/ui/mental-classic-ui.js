// SirEdwards Quiz — Cálculo de Fondo (2.3): arranque y final de partida.
// El modo reutiliza el bucle de Cálculo Turbo de index.html (currentGame.mode === 'mental_calc' con variant 'classic');
// aquí vive lo que es solo suyo: la comprobación de la variante, el arranque y la tarjeta final. Los logros de
// Cálculo mental (bestMentalCalcCorrect) cuentan las partidas de Turbo y de Fondo; cada partida de Fondo también suma
// a partidas jugadas, historial y Encargos (no a la XP ni a los récords de Turbo). Su récord vive en store.bestMentalClassicCorrect / bestMentalClassicScore
// (viajan por la sincronización y alimentan el ranking de Fondo); la marca antigua store.mentalClassicBest se sigue leyendo.
// Script clásico (scope global). Reglas puras en src/utils/mental-classic.js.
(function () {
  'use strict';
  function isClassic(g) { return !!g && g.mode === 'mental_calc' && g.variant === 'classic'; }

  // Mejor partida de Fondo: lo guardado en los campos nuevos o, si es mayor, la marca de la primera versión.
  function bestOf() {
    var old = (store && store.mentalClassicBest) || {};
    var oc = old.correct || 0, nc = store.bestMentalClassicCorrect || 0, ns = store.bestMentalClassicScore || 0;
    if (!oc && !nc) return null;
    if (nc > oc) return { correct: nc, score: ns };
    if (oc > nc) return { correct: oc, score: old.score || 0 };
    return { correct: nc, score: Math.max(ns, old.score || 0) };
  }

  function start() {
    if (!(store.unlockedMedals || []).includes('tt_15')) {
      // Sin aviso: Fondo y Turbo se desbloquean con Cálculo mental, que es el único que muestra el candado.
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

    // Marca local exclusiva del Fondo: no se mezcla con la de Turbo, no sube a ningún ránking.
    var best = bestOf();
    var isRecord = SEQMentalClassic.isBetter(g.correct, g.score, best);
    if (isRecord) { store.bestMentalClassicCorrect = g.correct; store.bestMentalClassicScore = g.score; }
    // Los logros de Cálculo mental valen para ambos modos de cálculo.
    if (g.correct > (store.bestMentalCalcCorrect || 0)) store.bestMentalCalcCorrect = g.correct;
    // Cuenta como partida terminada, igual que Turbo: partidas jugadas, historial y Encargos (el récord sigue siendo propio).
    store.gamesPlayed++;
    store.lastGameAccuracy = accuracy;
    if (!store.gameHistory) store.gameHistory = [];
    pushCapped(store.gameHistory, {
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: 'Cálculo de Fondo', score: g.correct + '/' + totalQ, percentage: accuracy, ts: Date.now()
    }, 5);
    try { encargosOnGameEnd('mental_calc', g.correct, totalQ); } catch (e) {}
    try { SEQEncargosIntro.noteGame({ mode: 'mental_calc', score: g.correct, total: totalQ, failed: false }); } catch (e) {}
    var newMedals = checkMedalsAndGetNew();
    clearSavedGame();
    saveStore(false);
    updateResumeButton();

    // «Compartir resultado» también en el Fondo (tarjeta con su insignia; no sube nada a ningún ránking).
    lastResultShareData = { modeName: 'Cálculo de Fondo', scoreStr: g.correct + '/' + totalQ, accuracy: accuracy, streak: g.bestStreak || 0 };
    var shareBtn = document.getElementById('res-share-btn');
    if (shareBtn) { shareBtn.innerHTML = seqIco('compartir') + 'Compartir resultado'; shareBtn.style.display = ''; }
    var backBtn = document.getElementById('res-back-btn'); if (backBtn) backBtn.textContent = 'Volver al Menú principal';

    document.getElementById('game-play-area').style.display = 'none';
    document.getElementById('results-card').style.display = 'block';
    SEQLevelUp.show();
    var grid = document.getElementById('results-metrics-grid'); if (grid) grid.style.display = '';
    var phrase = document.getElementById('results-phrase-container'); if (phrase) phrase.style.display = '';

    document.getElementById('res-main-title').textContent = 'CÁLCULO DE FONDO';
    document.getElementById('res-score-text').textContent = String(g.correct);
    document.getElementById('res-score-label').textContent = g.correct === 1 ? 'Acierto' : 'Aciertos';
    document.getElementById('res-percentage-text').textContent = String(g.score);
    document.getElementById('res-percentage-label').textContent = 'Puntos';

    var r = getModeEndPhrase(MENTAL_CALC_END_PHRASES, g.correct || 0, 'mentalcalc');
    document.getElementById('res-category-text').textContent = ({ mal: 'Las matemáticas ganan', normal: 'Tregua con los números', bien: 'Los números se rinden' })[r.category] || '';
    document.getElementById('res-phrase-text').textContent = r.phrase;
    setResultTone('mentalcalc', RESULT_MOOD_BY_CATEGORY.mentalcalc[r.category] || RESULT_MOOD_ICONS.mentalcalc, RESULT_CHARACTER_BY_CATEGORY[r.category] || null, RESULT_TIER_BY_CATEGORY[r.category]);
    renderLucidezStamp(null, 'ok');

    var avg = g.total > 0 ? (g.totalTimeMs / g.total / 1000).toFixed(1) : '0.0';
    renderModeChips([
      { icon: 'racha', label: 'Racha máxima', short: 'racha', value: String(g.bestStreak || 0) },
      { icon: 'tiempo', label: 'Tiempo medio por operación', value: avg + 's de media' }
    ]);
    renderRecordBadge(isRecord ? seqIco('copa') + 'NUEVO RÉCORD' : null, 'gold');

    var m1 = document.getElementById('session-mode-unlock-box'); if (m1) m1.style.display = 'none';
    var m2 = document.getElementById('session-medals-box'), ml = document.getElementById('session-medals-list');
    if (m2 && ml && newMedals.length) {
      m2.style.display = 'block';
      ml.innerHTML = newMedals.map(function (m) {
        return '<div class="session-medal-item"><div class="session-medal-icon' + (window.SEQAchievements ? ' has-img' : '') + '">' +
          (window.SEQAchievements ? SEQAchievements.iconHTML(m) : '') + '</div><div><div class="session-medal-info">' + m.title +
          '</div><div class="session-medal-desc">' + m.desc + '</div></div></div>';
      }).join('');
    } else if (m2) m2.style.display = 'none';
    if (!recordSoundPlayed) playSound(r.category !== 'mal' ? 'win' : 'lose');
    if (newMedals.some(function (m) { return m.secret; })) playSound('eye');
  }

  // Estadísticas > Récords personales: fila propia del Fondo (aciertos, no puntos), junto a la de Turbo.
  // Se crea aquí para no crecer index.html.
  function renderStat() {
    var best = store && bestOf();
    var box = document.getElementById('best-mentalclassic-box');
    if (!box) {
      var turbo = document.querySelector('#extra-stats .stat-mentalcalc');
      if (!turbo) return;
      box = document.createElement('div');
      box.id = 'best-mentalclassic-box';
      box.className = 'stat-extra stat-mentalcalc';
      box.innerHTML = '<span class="stat-extra-icon has-img" aria-hidden="true"><img class="mode-img mode-img-loose" src="assets/modes/suelto/calculo-clasico.webp" alt="" draggable="false"></span>' +
        '<div><span class="stat-extra-label">Mejor Cálculo de Fondo</span><span class="stat-extra-value" id="best-mentalclassic"></span></div>';
      turbo.parentNode.insertBefore(box, turbo.nextSibling);
    }
    box.style.display = '';
    var v = document.getElementById('best-mentalclassic');
    var n = best ? best.correct : 0;
    if (v) v.textContent = String(n);
  }

  // «Continuar partida» del Fondo: el reloj de la operación vuelve con los segundos que quedaban al salir.
  function restore(saved) {
    var u = SEQMentalClassic.unpack(saved);
    currentGame = u.game;
    if (!SEQMentalClassic.isResumable(saved)) {
      // Sin vidas: la partida ya estaba perdida y su cierre no llegó a ejecutarse. Se cierra (y se cuenta) ahora.
      currentGame.lives = 0;
      mentalCalcSession = SEQMentalCalc.createSession();
      currentMentalOp = null;
      clearCardThemeClasses();
      document.getElementById('main-card-container').classList.add('theme-mentalcalc');
      switchTab('game');
      finish();
      return true;
    }
    mentalCalcSession = SEQMentalCalc.createSession();
    var hasOp = !!u.op;
    currentMentalOp = hasOp ? u.op : null;
    mentalCalcEndTime = Date.now() + u.remainingMs;
    mentalCalcSecondsLeft = Math.ceil(u.remainingMs / 1000);
    if (hasOp) currentMentalOp.startedAt = Date.now() - (SEQMentalClassic.OP_MS - u.remainingMs);

    clearCardThemeClasses();
    document.getElementById('main-card-container').classList.add('theme-mentalcalc');
    document.getElementById('results-card').style.display = 'none'; SEQLevelUp.mark();
    document.getElementById('game-play-area').style.display = 'block';

    switchTab('game');
    renderQuestion(hasOp);
    runMentalCalcTimer(true);
    updateResumeButton();
    return true;
  }

  window.SEQMentalClassicUI = { bestOf: bestOf, isClassic: isClassic, start: start, finish: finish, livesHtml: livesHtml, renderStat: renderStat, restore: restore };
})();
