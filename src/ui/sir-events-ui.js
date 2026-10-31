// SirEdwards Quiz — Eventos Sorpresa (2.2): componente visual ÚNICO. Recibe {type, asset, message, label, durationMs}.
// Fade-in + ligero desplazamiento + permanencia + fade-out. Flota en el centro, no mueve nada de la partida y nunca hay dos a la vez.
// 2.5: un toque sobre él lo despide y NO llega a la partida de detrás (la capa recibe el toque; sin foco ni teclado: Intro/Espacio siguen
// yendo a la partida). Pasado el desvanecimiento, los toques vuelven a la partida.

const SEQSirEventsUI = (function () {
  'use strict';
  var el = null, hideT = null, removeT = null, visible = false, shownAt = 0;
  var MIN_TAP_MS = 2000;   // un toque rápido (de la partida) no lo despide: hay que dejarlo ver al menos 2 s

  function esc(s) { s = String(s == null ? '' : s); return typeof escapeHtml === 'function' ? escapeHtml(s) : s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function ensure() {
    if (el && document.body.contains(el)) return el;
    el = document.createElement('div');
    el.id = 'sir-event';
    el.className = 'sir-event';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
    // El toque lo recibe la capa (no la pregunta de detrás): lo despide y ahí se queda.
    el.addEventListener('click', function (e) { if (!visible) return; e.preventDefault(); e.stopPropagation(); if (Date.now() - shownAt >= MIN_TAP_MS) hide(); });
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
    n.className = 'sir-event is-' + esc(ev.type || 'event');
    n.innerHTML =
      '<img class="sir-event-img" src="' + esc(ev.asset || '') + '" alt="" width="96" height="96" decoding="async" draggable="false">' +
      '<div class="sir-event-bubble">' +
        (ev.label ? '<div class="sir-event-label">' + esc(ev.label) + '</div>' : '') +
        '<div class="sir-event-text">' + esc(ev.message) + '</div>' +
      '</div>';
    void n.offsetWidth;
    visible = true; shownAt = Date.now();
    n.classList.add('show');
    // Sonido de campanilla: el de récord para el aviso de récord, el de siempre para el resto de apariciones.
    try { if (ev.type === 'record') { if (typeof playRecordSound === 'function') playRecordSound(); } else if (typeof playSirEventSound === 'function') playSirEventSound(); } catch (e) {}
    clearTimeout(hideT);
    hideT = setTimeout(hide, Math.max(2500, Number(ev.durationMs) || 4000));
    return true;
  }

  return { show: show, hide: hide, isVisible: function () { return visible; } };
})();
