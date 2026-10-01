// SirEdwards Quiz 2.0 — accesibilidad básica de las tarjetas pulsables (Inicio, Jugar, dificultad).
// Son <div onclick>: aquí se les da rol de botón, foco con teclado y activación con Intro/Espacio,
// sin tocar su HTML ni su lógica. Script clásico, sin dependencias.
(function () {
  'use strict';
  var SEL = '.home-big-card[onclick], .mode-card[onclick]';
  function enhance(root) {
    var els = (root || document).querySelectorAll(SEL);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    }
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target;
    if (!el || el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
    if (el.getAttribute && el.getAttribute('role') === 'button' && el.hasAttribute('onclick')) { e.preventDefault(); el.click(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { enhance(); });
  else enhance();
  window.SEQA11y = { enhance: enhance };
})();
