// SirEdwards Quiz — Eventos Sorpresa (2.2): componente visual ÚNICO. Recibe {type, asset, message, label, durationMs}.
// Fade-in + ligero desplazamiento + permanencia + fade-out. Sin sonido, sin partículas. Nunca recibe toques ni foco
// (pointer-events:none: los toques lo atraviesan), flota en el centro, no mueve nada de la partida y nunca hay dos a la vez.

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

  // Devuelve true si se mostró (false si ya hay uno visible).
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
    visible = true;
    n.classList.add('show');
    // Sonido de campanilla: el de récord para el aviso de récord, el de siempre para el resto de apariciones.
    try { if (ev.type === 'record') { if (typeof playRecordSound === 'function') playRecordSound(); } else if (typeof playSirEventSound === 'function') playSirEventSound(); } catch (e) {}
    clearTimeout(hideT);
    hideT = setTimeout(hide, Math.max(2500, Number(ev.durationMs) || 4000));
    return true;
  }

  return { show: show, hide: hide, isVisible: function () { return visible; } };
})();
