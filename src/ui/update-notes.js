// SirEdwards Quiz 2.5 — Presentación del aviso de novedades (#update-modal).
// El contenido NO se escribe aquí: sale solo de la entrada del historial de la versión (index.html copia sus <li> al modal).
// Este módulo solo los viste: Sir Edwards en grande arriba y cada punto como una tarjetita (titular + línea de apoyo).
// Regla automática de titular/apoyo (vale para cualquier versión futura):
//   · si el texto tiene «: », titular = lo anterior, apoyo = lo posterior;
//   · si no, y tiene dos o más frases, titular = la primera frase, apoyo = el resto;
//   · si no, todo es titular.
// Lo llama src/ui/intro.js justo tras abrir el aviso. Script clásico; no toca datos ni el almacenamiento.
const SEQUpdateNotes = (function () {
  'use strict';
  var HERO = 'assets/character/event_siredwards_visit.webp';

  function split(text) {
    var t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!t) return { head: '', rest: '' };
    var c = t.indexOf(': ');
    if (c > 0 && c < t.length - 2) return { head: t.slice(0, c), rest: t.slice(c + 2) };
    var m = /^(.+?[.!?])\s+(\S.*)$/.exec(t);
    if (m) return { head: m[1], rest: m[2] };
    return { head: t, rest: '' };
  }

  function decorate() {
    try {
      var modal = document.getElementById('update-modal');
      var list = document.getElementById('update-modal-list');
      if (!modal || !list || list.classList.contains('upd-cards')) return;
      var card = modal.querySelector('.modal-card');
      var lis = list.querySelectorAll('li');
      for (var i = 0; i < lis.length; i++) {
        var p = split(lis[i].textContent);
        lis[i].textContent = '';
        lis[i].className = 'upd-item';
        lis[i].style.setProperty('--upd-i', String(i));
        var h = document.createElement('strong'); h.className = 'upd-h'; h.textContent = p.head; lis[i].appendChild(h);
        if (p.rest) { var r = document.createElement('span'); r.className = 'upd-t'; r.textContent = p.rest; lis[i].appendChild(r); }
      }
      list.classList.add('upd-cards');
      if (card && !card.querySelector('.upd-hero')) {
        card.classList.add('upd-card');
        var img = document.createElement('img');
        img.className = 'upd-hero'; img.src = HERO; img.alt = ''; img.width = 96; img.height = 120; img.decoding = 'async'; img.draggable = false;
        card.insertBefore(img, card.firstChild);
      }
    } catch (e) {}
  }

  return { decorate: decorate, split: split };
})();
