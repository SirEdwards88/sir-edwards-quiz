// Interfaz propia del modo secreto (2.0). Clásico, sin dependencias; expone window.SEQLucidezUI.
//
// 1) La presentación de cada fase (#lucidez-story-overlay) se cuelga de <body>. Dentro de la tarjeta de
//    juego, un ancestro con transform/filter/animación convertía su `position: fixed` en «fijo respecto a
//    la tarjeta», así que el juego asomaba por detrás. Colgada del body ocupa de verdad toda la pantalla.
//    Cuándo aparece y cuánto dura lo sigue decidiendo index.html (showLucidezStoryOverlay): aquí no cambia.
// 2) Línea del Último Enigma: el reloj («57 s», que se pone rojo al final) y, debajo, una nota pequeña
//    «Una sola respuesta» + « · 2 errores extra» (solo si quedan los que da el bonus de Fragmentos).
(function () {
  'use strict';

  function mountOverlay() {
    var overlay = document.getElementById('lucidez-story-overlay');
    if (overlay && overlay.parentNode !== document.body) document.body.appendChild(overlay);
  }

  function extraErrorsText(n) {
    n = Math.max(0, Math.floor(Number(n)) || 0);
    return n > 0 ? ' · ' + n + (n === 1 ? ' error extra' : ' errores extra') : '';
  }

  function enigmaHeader(seconds, forgiveLeft, low) {
    var timer = document.getElementById('lucidez-enigma-timer');
    var note = document.getElementById('lucidez-enigma-note');
    if (timer) {
      var ico = '';
      try { ico = typeof seqIco === 'function' ? seqIco('tiempo') : ''; } catch (e) {}
      timer.innerHTML = ico + '<span class="lucidez-enigma-secs">' + (Number(seconds) || 0) + ' s</span>';
      timer.className = 'lucidez-enigma-timer' + (low ? ' lucidez-timer-low' : '');
    }
    if (note) note.textContent = 'Una sola respuesta' + extraErrorsText(forgiveLeft);
  }

  window.SEQLucidezUI = { mountOverlay: mountOverlay, enigmaHeader: enigmaHeader, extraErrorsText: extraErrorsText };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountOverlay);
  else mountOverlay();
})();
