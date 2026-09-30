// SirEdwards Quiz v2.0 — insignias ilustradas de los modos (assets/modes/*.webp): una sola fuente.
//
// Qué insignia corresponde a cada modo (y, en Supervivencia, a cada dificultad) para los sitios que la pintan
// desde JS: el mini icono de la cabecera durante la partida, la tarjeta «Continuar partida» y el historial de
// Estadísticas. Las tarjetas fijas de Jugar/Duelo llevan su <img> directamente en el HTML.
// Solo presentación: no cambia modos, puntuación ni guardado. Script clásico; usa por nombre, en tiempo de
// ejecución, `currentGame` de index.html.

(function () {
  'use strict';

  var DIR = 'assets/modes/';
  var BY_MODE = { play: 'estandar', review: 'repaso', survival: 'supervivencia', sudden_death: 'muerte-subita',
    timetrial: 'contrarreloj', mental_calc: 'calculo', lucidez_mental: 'lucidez' };
  var BY_TIER = { ameba: 'ameba', humano: 'humano', derrame: 'derrame' };
  // El historial guarda el nombre visible del modo, no su clave.
  var BY_NAME = { 'Modo Estándar': 'play', 'Repaso': 'review', 'Supervivencia': 'survival', 'Muerte Súbita': 'sudden_death',
    'Contrarreloj': 'timetrial', 'Cálculo Mental': 'mental_calc', 'Lucidez Mental': 'lucidez_mental' };

  function src(mode, tier) {
    var n = (mode === 'survival' && BY_TIER[tier]) || BY_MODE[mode] || BY_MODE[BY_NAME[mode]];
    return n ? DIR + n + '.webp' : '';
  }
  function img(mode, tier) {
    var s = src(mode, tier);
    return s ? '<img class="mode-img" src="' + s + '" alt="" draggable="false">' : '';
  }

  // Mini insignia de la cabecera de la partida: sigue al modo en curso cada vez que cambia el marcador.
  function syncHud() {
    var el = document.getElementById('game-mode-badge');
    if (!el) return;
    var g = null;
    try { g = currentGame; } catch (e) {}
    var s = g ? src(g.mode, g.survivalTier) : '';
    if (s) { if (el.getAttribute('src') !== s) el.setAttribute('src', s); el.style.display = ''; }
    else el.style.display = 'none';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var lbl = document.getElementById('game-progress-lbl');
    if (!lbl || typeof MutationObserver === 'undefined') return;
    new MutationObserver(function () { try { syncHud(); } catch (e) {} }).observe(lbl, { childList: true, characterData: true, subtree: true });
  });

  window.SEQModeBadges = { src: src, img: img, syncHud: syncHud };
})();
