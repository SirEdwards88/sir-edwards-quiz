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
    timetrial: 'contrarreloj', mental_calc: 'calculo', lucidez_mental: 'secreto' };
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
  // Versión «mini» (assets/modes/mini/): la misma ilustración recortada al centro, sin marco ni gemas, para los
  // sitios donde el icono sale pequeño (cabecera de la partida, historial). El aro dorado lo pone el CSS.
  function miniSrc(mode, tier) {
    var s = src(mode, tier);
    return s ? s.replace(DIR, DIR + 'mini/') : '';
  }
  function miniImg(mode, tier) {
    var s = miniSrc(mode, tier);
    return s ? '<img class="mode-img mode-img-mini" src="' + s + '" alt="" draggable="false">' : '';
  }

  // Versión «suelta» (assets/modes/suelto/): solo el objeto, sin insignia, para la cabecera de la partida y la
  // tarjeta final, donde el icono sale pequeño y la insignia completa se emborronaba.
  function looseSrc(mode, tier) {
    var s = src(mode, tier);
    return s ? s.replace(DIR, DIR + 'suelto/') : '';
  }

  // Icono de la cabecera de la partida: sigue al modo en curso cada vez que cambia el marcador.
  function syncHud() {
    var el = document.getElementById('game-mode-badge');
    if (!el) return;
    var g = null;
    try { g = currentGame; } catch (e) {}
    var s = g ? looseSrc(g.mode, g.survivalTier) : '';
    if (s) { if (el.getAttribute('src') !== s) el.setAttribute('src', s); el.style.display = ''; }
    else el.style.display = 'none';
  }

  // 2.0: la etiqueta de la cabecera de juego llega como «NOMBRE · datos» desde muchos sitios de index.html.
  // Aquí se parte siempre en dos líneas fijas (nombre del modo arriba, datos de la partida abajo) para que
  // ningún modo se parta a mitad en el móvil. Se mueven los nodos (no se reescribe el HTML), así los <span>
  // con id que se animan cada segundo (segundos, puntos, aciertos) siguen siendo los mismos.
  function splitHudLabel(lbl) {
    var first = lbl.firstChild;
    if (!first || (first.nodeType === 1 && first.classList.contains('hud-name'))) return;
    if (first.nodeType !== 3) return;
    var t = first.nodeValue, i = t.indexOf(' · ');
    if (i < 1) return;
    var name = document.createElement('span'); name.className = 'hud-name'; name.textContent = t.slice(0, i);
    var data = document.createElement('span'); data.className = 'hud-data';
    first.nodeValue = t.slice(i + 3);
    while (lbl.firstChild) data.appendChild(lbl.firstChild);
    lbl.appendChild(name); lbl.appendChild(data);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var lbl = document.getElementById('game-progress-lbl');
    if (!lbl || typeof MutationObserver === 'undefined') return;
    new MutationObserver(function () { try { splitHudLabel(lbl); } catch (e) {} try { syncHud(); } catch (e) {} }).observe(lbl, { childList: true, characterData: true, subtree: true });
  });

  window.SEQModeBadges = { src: src, img: img, miniSrc: miniSrc, miniImg: miniImg, looseSrc: looseSrc, syncHud: syncHud };
})();
