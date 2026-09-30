/* SirEdwards Quiz v2.0 — Cuadro «¿Sabías que…?» y «Explicación» bajo la respuesta.
 *
 * Solo genera el HTML (texto escapado); el aspecto vive en styles/theme.css (.sabias-que-box).
 * Uso: SEQSabias.html('sabias', texto) · SEQSabias.html('explicacion', texto)
 */
(function () {
  'use strict';
  var KINDS = {
    sabias: { img: 'assets/ui/libro.webp', title: '¿Sabías que…?' },
    explicacion: { img: 'assets/ui/bombilla.webp', title: 'Explicación' }
  };
  function esc(s) {
    if (typeof escapeHtml === 'function') return escapeHtml(String(s));
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function html(kind, text) {
    var k = KINDS[kind] || KINDS.sabias;
    return '<div class="sabias-que-box sq-' + (KINDS[kind] ? kind : 'sabias') + '">'
      + '<div class="sq-head"><img class="sq-ico" src="' + k.img + '" alt="" draggable="false"><span>' + k.title + '</span></div>'
      + '<div class="sq-text">' + esc(text) + '</div></div>';
  }
  window.SEQSabias = { html: html };
})();
