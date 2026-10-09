// SirEdwards Quiz — Botón/gesto «atrás» del móvil (Android): navega por los menús en lugar de salir de la app.
//
// · Fuera de Inicio (cualquier otra pantalla) o con una ventana abierta, la app mantiene UNA entrada de historial de más: al
//   pulsar «atrás», el navegador la consume y aquí se decide qué hacer (decide) y se vuelve a poner si sigue haciendo falta.
// · En Inicio y sin ventanas, no hay entrada extra: «atrás» sale de la app como siempre.
// · En PARTIDA (incluida su tarjeta de resultados, Duelos y Retos), «atrás» no hace nada: no se tira una partida por un gesto
//   sin querer. Se sale con el botón de la propia pantalla.
// · Una ventana con data-modal-esc se cierra (igual que con Escape); las que obligan a decidir (cuenta, bienvenida, nombre,
//   migración) no se tocan.
// Script clásico, sin dependencias. No cambia pantallas ni datos: envuelve switchTab (index.html) y escucha popstate.
// La parte pura (decide) se prueba en test/back-nav.test.mjs.

(function (root) {
  'use strict';

  // s = { blocking: ¿ventana abierta que obliga a decidir?, esc: ¿ventana abierta que se puede cerrar?, inGame, onHome,
  //       view: id de la pantalla activa (sin «view-»), hasDuelBack: ¿hay función para subir un nivel en Duelo? }
  // → 'none' | 'escape' | 'duel' | 'home'
  function decide(s) {
    if (s.blocking) return 'none';
    if (s.esc) return 'escape';
    if (s.inGame) return 'none';
    if (s.onHome) return 'none';
    if (s.view === 'duelo' && s.hasDuelBack) return 'duel';
    return 'home';
  }

  if (typeof document === 'undefined') { root.SEQBackNav = { decide: decide }; return; }

  var guarded = false;   // ¿hay ahora mismo una entrada de historial puesta por nosotros?
  var pending = false;   // history.go(-1) lanzado por nosotros: su popstate no es un «atrás» del jugador

  function $(id) { return document.getElementById(id); }
  function isOpen(m) { return m.style.display !== 'none' && getComputedStyle(m).display !== 'none'; }
  function overlays() {
    var all = document.querySelectorAll('.modal-overlay'), blocking = false, esc = false;
    for (var i = 0; i < all.length; i++) {
      if (!isOpen(all[i])) continue;
      if (all[i].hasAttribute('data-modal-esc')) esc = true; else blocking = true;
    }
    return { blocking: blocking, esc: esc };
  }
  function onHome() { var v = $('view-home'); return !!(v && v.classList.contains('active')); }
  function activeView() {
    var v = document.querySelector('.view.active');
    return v && v.id ? v.id.replace(/^view-/, '') : '';
  }
  function state() {
    var o = overlays();
    return { blocking: o.blocking, esc: o.esc, inGame: document.body.classList.contains('in-game'), onHome: onHome(),
      view: activeView(), hasDuelBack: typeof root.duelTopbarBack === 'function' };
  }

  // ¿Hace falta la entrada extra? Sí si no estamos en Inicio o hay una ventana que se pueda cerrar.
  function need() { return !onHome() || overlays().esc; }

  function ensure() {
    if (pending) return;   // se espera al popstate de nuestro propio go(-1)
    var n = need();
    try {
      if (n && !guarded) { history.pushState({ seqBack: 1 }, '', location.href); guarded = true; }
      else if (!n && guarded) { pending = true; guarded = false; history.go(-1); }
    } catch (e) { pending = false; }
  }

  function onPop() {
    if (pending) { pending = false; ensure(); return; }
    if (!guarded) return;          // no es nuestra entrada (otro uso del historial): se deja pasar
    guarded = false;               // el navegador la consumió
    var a = 'none';
    try { a = decide(state()); } catch (e) {}
    try {
      if (a === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      else if (a === 'duel') root.duelTopbarBack();
      else if (a === 'home' && typeof root.switchTab === 'function') root.switchTab('home');
    } catch (e) {}
    setTimeout(ensure, 0);         // si sigue haciendo falta (otra ventana, otra pantalla, partida), se vuelve a poner
  }

  function init() {
    // Tras recargar la página en una pantalla interior, la entrada extra sigue ahí: se recoge como propia y, si ya no hace falta, se retira.
    try { if (history.state && history.state.seqBack) guarded = true; } catch (e) {}
    var orig = root.switchTab;
    if (typeof orig === 'function') root.switchTab = function () { var r = orig.apply(this, arguments); try { ensure(); } catch (e) {} return r; };
    window.addEventListener('popstate', onPop);
    if (typeof MutationObserver !== 'undefined') {
      var obs = new MutationObserver(function () { ensure(); }), all = document.querySelectorAll('.modal-overlay');
      for (var i = 0; i < all.length; i++) obs.observe(all[i], { attributes: true, attributeFilter: ['style', 'class'] });
    }
    ensure();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  root.SEQBackNav = { decide: decide };
})(typeof window !== 'undefined' ? window : globalThis);
