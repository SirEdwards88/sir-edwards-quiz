// SirEdwards Quiz 2.5 — scroll al feedback sin perder la cabecera.
// Antes, tras responder, el feedback se centraba con scrollIntoView({block:'center'}) y en móvil (360 px) eso sacaba de la
// pantalla la cabecera (progreso y racha). Ahora solo se desplaza lo justo para ver el feedback entero y nunca más allá de
// la cabecera del juego (.game-hud), salvo que el feedback quedara casi fuera de la pantalla (teclado abierto, pantallas bajas).
// Script clásico, sin dependencias. La parte pura (delta) se prueba en test/feedback-scroll.test.mjs.

(function (root) {
  'use strict';

  var MARGIN_BOTTOM = 12;   // aire bajo el feedback
  var MARGIN_TOP = 8;       // el principio del feedback nunca sube por encima de esto
  var MIN_VISIBLE = 90;     // si respetar la cabecera deja menos que esto del feedback a la vista, se prioriza el feedback

  // Cuánto hay que desplazar (px; + = hacia abajo) para ver el feedback. fbTop/fbBottom y hudTop son posiciones en pantalla;
  // hudTop es null si no hay cabecera visible a la que atenerse; vh es el alto visible (con teclado, el reducido).
  function delta(fbTop, fbBottom, vh, hudTop) {
    var d = fbBottom - (vh - MARGIN_BOTTOM);
    if (d <= 0) return 0;                       // ya se ve entero
    if (fbTop - d < MARGIN_TOP) d = fbTop - MARGIN_TOP;   // no pasarse: el principio del feedback manda
    if (d <= 0) return 0;
    if (hudTop !== null && hudTop >= 0 && d > hudTop - 4) {
      var capped = Math.max(0, hudTop - 4);
      if (fbTop - capped <= vh - MIN_VISIBLE) d = capped;   // se respeta la cabecera si el feedback sigue a la vista
    }
    return Math.round(d);
  }

  function reveal(fb) {
    try {
      if (!fb || !fb.getBoundingClientRect) return;
      var vv = root.visualViewport;
      var vh = (vv && vv.height) || root.innerHeight || 0;
      if (!vh) return;
      var r = fb.getBoundingClientRect();
      var hud = root.document.querySelector('#view-game .game-hud');
      var hudTop = null;
      if (hud) { var hr = hud.getBoundingClientRect(); if (hr.height > 0) hudTop = hr.top; }
      var d = delta(r.top, r.bottom, vh, hudTop);
      if (!d) return;
      var reduce = false;
      try { reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
      root.scrollBy({ top: d, left: 0, behavior: reduce ? 'auto' : 'smooth' });
    } catch (e) {
      try { fb.scrollIntoView({ block: 'nearest' }); } catch (e2) {}
    }
  }

  var api = { delta: delta, reveal: reveal };
  root.SEQFeedbackScroll = api;
})(typeof window !== 'undefined' ? window : globalThis);
