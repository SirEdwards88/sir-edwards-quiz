// SirEdwards Quiz — Ayuda (pantalla dentro de la app, también sin conexión).
// El contenido vive en src/data/help.js (SEQHelpData). El contenedor #help-modal sí está en index.html para que src/ui/a11y.js
// gestione su foco y su cierre con Escape como el resto de diálogos. Todo se pinta con textContent: nada de innerHTML.
// Abrir la Ayuda no guarda nada ni toca las marcas de desbloqueo de Duelos (eso lo hacía el antiguo aviso «?», y era un fallo).
// Script clásico (scope global): expone window.SEQHelp.

var SEQHelp = (function () {
  'use strict';

  function data() { return window.SEQHelpData || { title: 'Ayuda', lead: '', topics: [] }; }
  function el(id) { return document.getElementById(id); }
  // Las invitaciones por enlace solo se mencionan si el servidor las declara activas (features.duel_links).
  function linksOn() { try { var s = window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session(); return !!(s && s.features && s.features.classic_duel && s.features.duel_links); } catch (e) { return false; } }
  // Un texto puede ser: cadena; '@enlace …' (solo con enlaces); o {on, off} (variante según haya enlaces o no). Devuelve null si no se muestra.
  function pick(x, on) {
    if (x && typeof x === 'object' && !Array.isArray(x) && ('on' in x || 'off' in x)) return on ? x.on : x.off;
    if (typeof x === 'string' && x.indexOf('@enlace ') === 0) return on ? x.slice(8) : null;
    return x;
  }

  // En el texto, **así** marca negrita.
  function inline(parent, text) {
    String(text).split('**').forEach(function (part, i) {
      if (!part) return;
      if (i % 2) { var s = document.createElement('strong'); s.textContent = part; parent.appendChild(s); }
      else parent.appendChild(document.createTextNode(part));
    });
  }

  function build() {
    var body = el('help-modal-body');
    if (!body) return;
    var on = linksOn();
    if (body.getAttribute('data-links') === (on ? '1' : '0') && body.childNodes.length) return;
    body.setAttribute('data-links', on ? '1' : '0');
    while (body.firstChild) body.removeChild(body.firstChild);
    var d = data();
    if (d.lead) { var lead = document.createElement('p'); lead.className = 'help-lead'; lead.textContent = d.lead; body.appendChild(lead); }
    var tut = document.createElement('button');
    tut.type = 'button'; tut.className = 'btn btn-secondary help-tutorial'; tut.textContent = d.tutorialLabel || 'Ver el tutorial';
    tut.addEventListener('click', tutorial);
    body.appendChild(tut);
    d.topics.forEach(function (t) {
      var det = document.createElement('details'); det.className = 'help-topic'; det.id = 'help-topic-' + t.id;
      var sum = document.createElement('summary'); sum.textContent = t.title; det.appendChild(sum);
      var inner = document.createElement('div'); inner.className = 'help-topic-body';
      t.blocks.forEach(function (blk0) {
        var blk = pick(blk0, on);
        if (blk == null || blk === '') return;
        if (blk && typeof blk.t === 'string') { var q = document.createElement('p'); if (blk.sep) q.className = 'help-sep'; inline(q, blk.t); inner.appendChild(q); }
        else if (Array.isArray(blk)) {
          var ul = document.createElement('ul');
          blk.forEach(function (x0) { var x = pick(x0, on); if (x == null || x === '') return; var li = document.createElement('li'); inline(li, x); ul.appendChild(li); });
          inner.appendChild(ul);
        } else { var p = document.createElement('p'); inline(p, blk); inner.appendChild(p); }
      });
      det.appendChild(inner);
      body.appendChild(det);
    });
  }

  // open('ranking') abre la Ayuda con ese tema desplegado; sin tema, todo plegado.
  function open(topicId) {
    var m = el('help-modal'); if (!m) return;
    build();
    Array.prototype.forEach.call(m.querySelectorAll('details.help-topic'), function (d) { d.open = !!topicId && d.id === 'help-topic-' + topicId; });
    m.style.display = 'flex';
    var sc = el('help-modal-body'); if (sc) sc.scrollTop = 0;
    var target = topicId && el('help-topic-' + topicId);
    if (sc && target) sc.scrollTop = target.offsetTop - sc.offsetTop;
  }
  function close() { var m = el('help-modal'); if (m) m.style.display = 'none'; }

  // Vuelve a ver la presentación de Sir Edwards. No cambia ninguna marca: solo se enseña.
  function tutorial() {
    close();
    try { var di = window.SEQDuelIntro; if (di && di.replay) di.replay(); } catch (e) {}
  }

  return { open: open, close: close, tutorial: tutorial, topics: function () { return data().topics; }, _pick: pick };
})();
