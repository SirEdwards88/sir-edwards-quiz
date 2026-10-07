// SirEdwards Quiz — Eventos Sorpresa (2.2): componente visual ÚNICO. Recibe {type, asset, message, label, durationMs}.
// Fade-in + ligero desplazamiento + permanencia + fade-out. Sin sonido, sin partículas. Nunca recibe toques ni foco
// (pointer-events:none), no mueve nada de la partida y nunca hay dos a la vez.

const SEQSirEventsUI = (function () {
  'use strict';
  var el = null, hideT = null, removeT = null, visible = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function ensure() {
    if (el && document.body.contains(el)) return el;
    el = document.createElement('div');
    el.id = 'sir-event';
    el.className = 'sir-event';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
    return el;
  }

  function hide() {
    clearTimeout(hideT); clearTimeout(removeT);
    if (!el) { visible = false; return; }
    el.classList.remove('show');
    removeT = setTimeout(function () { visible = false; if (el) el.innerHTML = ''; }, 420);
  }

  // Controles que un evento NUNCA debe tapar (ni siquiera sin recibir toques): botones de la partida y relojes.
  var PROTECTED = ['#btn-next', '#btn-check', '#game-progress-lbl', '#lucidez-enigma-timer', '#game-exit-btn', '#ans-input', '#choice-options', '#feedback'];
  function shown(e) { return !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden'; }
  // ¿Cabe abajo sin tapar nada? Se mide la caja que ocuparía (anclada abajo) frente a los controles visibles.
  function hasRoom(n) {
    var vw = window.innerWidth, vh = window.innerHeight, w = n.offsetWidth, h = n.offsetHeight;
    var box = { left: (vw - w) / 2 - 4, right: (vw + w) / 2 + 4, bottom: vh - 10, top: vh - 14 - h - 4 };
    return !PROTECTED.some(function (sel) {
      var e = document.querySelector(sel);
      if (!shown(e)) return false;
      var b = e.getBoundingClientRect();
      if (!b.width || !b.height) return false;
      return !(b.right <= box.left || b.left >= box.right || b.bottom <= box.top || b.top >= box.bottom);
    });
  }

  // Devuelve true si se mostró (false si ya hay uno visible o si no cabe sin tapar la partida).
  function show(ev) {
    if (!ev || !ev.message || visible || typeof document === 'undefined') return false;
    var n = ensure();
    n.className = 'sir-event is-' + esc(ev.type || 'visit');
    n.innerHTML =
      '<img class="sir-event-img" src="' + esc(ev.asset || '') + '" alt="" width="96" height="96" decoding="async" draggable="false">' +
      '<div class="sir-event-bubble">' +
        (ev.label ? '<div class="sir-event-label">' + esc(ev.label) + '</div>' : '') +
        '<div class="sir-event-text">' + esc(ev.message) + '</div>' +
      '</div>';
    void n.offsetWidth;
    if (!hasRoom(n)) { n.innerHTML = ''; visible = false; return false; }
    visible = true;
    n.classList.add('show');
    clearTimeout(hideT);
    hideT = setTimeout(hide, Math.max(2500, Number(ev.durationMs) || 4000));
    return true;
  }

  return { show: show, hide: hide, isVisible: function () { return visible; } };
})();
