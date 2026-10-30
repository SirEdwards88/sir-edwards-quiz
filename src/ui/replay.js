// SirEdwards Quiz 2.5 — «Jugar de nuevo»: botón principal al final de las partidas en solitario.
// Relanza el MISMO modo con los mismos puntos de entrada que la pantalla de Jugar (así respetan candados, partida guardada,
// Repaso por tandas, etc.). «Volver al Menú principal» y «Compartir resultado» quedan como acciones secundarias.
// No sale en Duelos y Retos (tienen su «Revancha») ni en Repaso cuando ya no quedan fallos pendientes. En Lucidez Mental vuelve a
// abrir el modo con su misma puerta (openLucidezMentalMode: pide los Fragmentos y respeta la partida guardada). Vigila #results-card para ponerse al día cada vez que aparece, sin tocar los puntos
// de la lógica que la muestran. Script clásico; usa por nombre en tiempo de ejecución currentGame, store y las funciones de inicio.
// La parte pura (plan) se prueba en test/replay.test.mjs.

(function (root) {
  'use strict';

  var LABEL = 'Jugar de nuevo';

  // Qué relanzar para esta partida: 'play' | 'survival' | 'sudden_death' | 'timetrial' | 'review' | 'mental_turbo' | 'mental_classic' | 'lucidez' | null.
  function plan(g, failedCount) {
    if (!g || g.isDuel) return null;
    switch (g.mode) {
      case 'play': return 'play';
      case 'survival': return 'survival';
      case 'sudden_death': return 'sudden_death';
      case 'timetrial': return 'timetrial';
      case 'review': return failedCount > 0 ? 'review' : null;
      case 'mental_calc': return g.variant === 'classic' ? 'mental_classic' : 'mental_turbo';
      case 'lucidez_mental': return 'lucidez';
      default: return null;
    }
  }

  var api = { plan: plan, LABEL: LABEL };
  root.SEQReplay = api;
  if (typeof document === 'undefined') return;

  function $(id) { return document.getElementById(id); }
  function game() { try { return currentGame; } catch (e) { return null; } }
  function failed() { try { return (store && store.failedQuestions || []).length; } catch (e) { return 0; } }
  function current() { return plan(game(), failed()); }

  function update() {
    var btn = $('res-replay-btn'), back = $('res-back-btn');
    if (!btn) return;
    var p = current();
    btn.hidden = !p;
    if (p) {
      var ico = ''; try { ico = root.seqIco ? root.seqIco('revancha') : ''; } catch (e) {}
      btn.innerHTML = ico + LABEL;
    }
    if (back) { back.classList.toggle('btn-primary', !p); back.classList.toggle('btn-secondary', !!p); }
  }

  function start() {
    var p = current();
    if (!p) return;
    try {
      if (p === 'survival') { selectedDifficultyTier = game().survivalTier || selectedDifficultyTier; startMode('survival', 40); }
      else if (p === 'sudden_death') startSuddenDeathMode();
      else if (p === 'review') startReviewMode();
      else if (p === 'mental_turbo') startMentalCalcMode();
      else if (p === 'mental_classic') SEQMentalClassicUI.start();
      else if (p === 'lucidez') openLucidezMentalMode();
      else startMode(p);   // 'play' y 'timetrial'
    } catch (e) {}
  }
  api.start = start;
  api.update = update;

  function watch() {
    var card = $('results-card');
    if (!card) return;
    var visible = function () { return card.style.display !== 'none' && root.getComputedStyle(card).display !== 'none'; };
    if (root.MutationObserver) {
      new MutationObserver(function () { if (visible()) update(); }).observe(card, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
})(typeof window !== 'undefined' ? window : globalThis);
