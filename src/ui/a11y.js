// SirEdwards Quiz 2.0 — accesibilidad básica: tarjetas pulsables (Inicio, Jugar, dificultad) y modales.
// Las tarjetas son <div onclick>: aquí se les da rol de botón, foco con teclado y activación con Intro/Espacio,
// sin tocar su HTML ni su lógica. Los modales (.modal-overlay) los abren y cierran otras partes con style.display;
// aquí se vigilan todos a la vez (foco al abrir, Tab atrapado, Escape en los que lo permiten y foco devuelto al cerrar).
// Script clásico, sin dependencias.
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

  // ---- Modales ----------------------------------------------------------------------------------------------------
  // · Al abrirse: el foco pasa a la tarjeta del modal (se anuncia su nombre) o, si tiene data-autofocus, a ese botón
  //   (solo en acciones inocuas: nunca en «Sí, empezar nueva»).
  // · Tab y Mayús+Tab no salen del modal que está encima.
  // · Escape solo cierra los marcados con data-modal-esc (Cancelar, o el único botón); los que obligan a decidir
  //   (cuenta, bienvenida, migración) no se cierran con Escape.
  // · Al cerrarse: el foco vuelve a lo que lo tenía antes.
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var stack = [], openers = new WeakMap();
  function isOpen(m) { return m.style.display !== 'none' && getComputedStyle(m).display !== 'none'; }
  function cardOf(m) { return m.querySelector('.modal-card') || m; }
  function focusables(m) { return Array.prototype.filter.call(m.querySelectorAll(FOCUSABLE), function (el) { return el.offsetParent !== null; }); }
  function topModal() { for (var i = stack.length - 1; i >= 0; i--) if (isOpen(stack[i])) return stack[i]; return null; }
  function opened(m) {
    if (stack.indexOf(m) !== -1) return;
    stack.push(m);
    var prev = document.activeElement;
    openers.set(m, prev && prev !== document.body && !m.contains(prev) ? prev : null);
    var card = cardOf(m);
    if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '-1');
    var target = m.querySelector('[data-autofocus]') || card;
    try { target.focus({ preventScroll: true }); } catch (e) {}
  }
  function closed(m) {
    var i = stack.indexOf(m);
    if (i === -1) return;
    stack.splice(i, 1);
    var prev = openers.get(m); openers.delete(m);
    if (prev && document.contains(prev) && !topModal()) { try { prev.focus({ preventScroll: true }); } catch (e) {} }
  }
  function syncModals() {
    var all = document.querySelectorAll('.modal-overlay');
    for (var i = 0; i < all.length; i++) {
      if (all[i].classList.contains('auth-gate')) continue;   // el muro de cuenta ya gestiona su propio foco y Tab (index.html)
      if (isOpen(all[i])) opened(all[i]); else closed(all[i]);
    }
  }
  document.addEventListener('keydown', function (e) {
    var m = topModal();
    if (!m) return;
    if (e.key === 'Escape') {
      if (!m.hasAttribute('data-modal-esc')) return;
      var btn = m.querySelector('[data-modal-cancel]') || m.querySelector('.btn-secondary') || m.querySelector('.btn-primary');
      if (btn) { e.preventDefault(); e.stopPropagation(); btn.click(); }
      return;
    }
    if (e.key !== 'Tab') return;
    var f = focusables(m), card = cardOf(m), a = document.activeElement;
    if (!f.length) { e.preventDefault(); card.focus(); return; }
    var first = f[0], last = f[f.length - 1];
    if (!m.contains(a) || a === card) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }   // desde fuera o desde la propia tarjeta: al primero / al último
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }, true);
  function watchModals() {
    syncModals();
    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(syncModals), all = document.querySelectorAll('.modal-overlay');
    for (var i = 0; i < all.length; i++) if (!all[i].classList.contains('auth-gate')) obs.observe(all[i], { attributes: true, attributeFilter: ['style', 'class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchModals);
  else watchModals();

  window.SEQA11y = { enhance: enhance, syncModals: syncModals };
})();
