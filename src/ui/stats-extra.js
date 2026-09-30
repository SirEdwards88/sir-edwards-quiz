// SirEdwards Quiz v2.0 — extras visuales de Estadísticas.
//
// Solo presentación, a partir de los datos que ya calcula index.html (getQuestionAccuracyStats,
// TEST_QUESTIONS). Añade:
//   - Un radar de las 6 categorías («tu huella de conocimiento») encima de las barras por categoría.
//   - El total real del banco de preguntas en el texto de Dominio (antes estaba escrito a mano).
// Se llama al final de renderStats(). Script clásico, sin dependencias.

(function () {
  'use strict';

  var CATS = [
    { key: 'historia', label: 'Historia', icon: '🏛️', img: 'assets/cats/historia.webp' },
    { key: 'geografia', label: 'Geografía', icon: '🌍', img: 'assets/cats/geografia.webp' },
    { key: 'ciencia', label: 'Ciencia', icon: '🔬', img: 'assets/cats/ciencia.webp' },
    { key: 'arte_literatura', label: 'Arte y Lit.', icon: '🎨', img: 'assets/cats/arte.webp' },
    { key: 'deporte', label: 'Deporte', icon: '⚽', img: 'assets/cats/deporte.webp' },
    { key: 'cultura_general', label: 'Cultura', icon: '🧠', img: 'assets/cats/cultura.webp' }
  ];

  function radarSvg(values) {
    var W = 360, H = 318, cx = 180, cy = 162, R = 90, N = values.length;
    function pt(i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / N; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    var h = '<svg class="radar-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Precisión por categoría">';
    [0.25, 0.5, 0.75, 1].forEach(function (k) {
      var p = values.map(function (_, i) { return pt(i, R * k).join(','); }).join(' ');
      h += '<polygon points="' + p + '" class="radar-ring' + (k === 1 ? ' outer' : '') + '"/>';
    });
    values.forEach(function (_, i) { var e = pt(i, R); h += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="radar-axis"/>'; });
    var shape = values.map(function (v, i) { return pt(i, R * Math.max(0.04, v.pct / 100)).join(','); }).join(' ');
    h += '<polygon points="' + shape + '" class="radar-shape"/>';
    values.forEach(function (v, i) {
      var p = pt(i, R * Math.max(0.04, v.pct / 100));
      h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" class="radar-dot' + (v.answered ? '' : ' empty') + '"/>';
    });
    values.forEach(function (v, i) {
      var p = pt(i, R + 22), anchor = Math.abs(p[0] - cx) < 8 ? 'middle' : (p[0] > cx ? 'start' : 'end');
      var dx = anchor === 'start' ? -6 : anchor === 'end' ? 6 : 0;
      // Insignia de la categoría junto a su nombre: a un lado (izquierda/derecha) o encima/debajo (arriba/abajo).
      var IS = 24, top = p[1] < cy, ix, iy, tx = p[0] + dx;
      if (anchor === 'start') { ix = tx; tx += IS + 4; iy = p[1] - 17; }
      else if (anchor === 'end') { ix = tx - IS; tx -= IS + 4; iy = p[1] - 17; }
      else { ix = p[0] - IS / 2; iy = top ? p[1] - 3 - 13 - IS - 2 : p[1] + 17; }
      h += '<image href="' + v.img + '" x="' + ix + '" y="' + iy + '" width="' + IS + '" height="' + IS + '"/>';
      h += '<text x="' + tx + '" y="' + (p[1] - 3) + '" text-anchor="' + anchor + '" class="radar-lbl">' + v.label + '</text>';
      h += '<text x="' + tx + '" y="' + (p[1] + 12) + '" text-anchor="' + anchor + '" class="radar-pct">' + (v.answered ? v.pct + '%' : '—') + '</text>';
    });
    return h + '</svg>';
  }

  function render() {
    try {
      var total = $id('stats-bank-total');
      if (total && typeof TEST_QUESTIONS !== 'undefined') total.textContent = TEST_QUESTIONS.length;
      var host = $id('category-stats');
      if (!host || typeof getQuestionAccuracyStats !== 'function') return;
      var st = getQuestionAccuracyStats();
      var values = CATS.map(function (c) {
        var x = st[c.key] || { correct: 0, answered: 0 };
        var answered = Number(x.answered) || 0, correct = Number(x.correct) || 0;
        return { label: c.label, icon: c.icon, img: c.img, answered: answered, pct: answered ? Math.round(correct / answered * 100) : 0 };
      });
      var box = $id('stats-radar');
      if (!box) {
        box = document.createElement('div');
        box.id = 'stats-radar';
        box.className = 'stats-radar';
        host.parentNode.insertBefore(box, host);
      }
      var anyAnswered = values.some(function (v) { return v.answered > 0; });
      var spec = specialty(values);
      box.innerHTML = radarSvg(values) + (anyAnswered
        ? (spec ? '<p class="radar-note">Tu especialidad: <b><img class="cat-img" src="' + spec.img + '" alt=""> ' + spec.label + '</b></p>'
                : '<p class="radar-note">Sigue jugando: con unas partidas más se verá tu especialidad.</p>')
        : '<p class="radar-note">Juega unas partidas y aquí aparecerá la forma de tu conocimiento.</p>');
    } catch (e) { /* nunca debe romper Estadísticas */ }
    try { dossier(); dominio(); } catch (e) {}
  }

  // «Especialidad» solo cuando los datos la sostienen (sin datos nuevos, con los mismos aciertos por categoría):
  // al menos 40 respuestas en total, 10 en la categoría ganadora, ≥60 % de acierto en ella y 8 puntos de ventaja
  // sobre la segunda. Si no se cumple, no se inventa.
  function specialty(values) {
    var total = values.reduce(function (a, v) { return a + v.answered; }, 0);
    if (total < 40) return null;
    var ok = values.filter(function (v) { return v.answered >= 10; }).sort(function (a, b) { return b.pct - a.pct; });
    if (!ok.length || ok[0].pct < 60) return null;
    var second = values.filter(function (v) { return v !== ok[0] && v.answered >= 5; }).sort(function (a, b) { return b.pct - a.pct; })[0];
    if (second && ok[0].pct - second.pct < 8) return null;
    return ok[0];
  }

  // Ficha: nombre e icono de perfil del jugador (cuenta online si la hay) y los tres datos principales solo cuando ya hay partidas.
  function dossier() {
    var name = 'Jugador', avatar = null;
    try { var sess = window.SEQOnline && SEQOnline.session && SEQOnline.session(); if (sess) { if (sess.display_name) name = sess.display_name; avatar = sess.avatar; } } catch (e) {}
    var n = $id('dossier-name'); if (n) n.textContent = name;
    // El icono de perfil del jugador (el mismo de Ajustes y del ranking); sin cuenta, el sombrero por defecto.
    var av = $id('dossier-avatar'); if (av && window.SEQAvatars) av.innerHTML = SEQAvatars.avatarHTML(avatar);
    var tiles = $id('dossier-tiles');
    var played = 0; try { played = Number(store.gamesPlayed) || 0; } catch (e) {}
    if (tiles) tiles.style.display = played > 0 ? '' : 'none';
  }

  // Dominio del conocimiento: barra con las vistas (claro) y las dominadas (oro) sobre el total del banco.
  // Mismas fuentes que los cuatro números de la sección (seenQuestionIds y getMasteredCount).
  function dominio() {
    if (typeof TEST_QUESTIONS === 'undefined') return;
    var total = TEST_QUESTIONS.length || 1;
    var seen = 0, mastered = 0;
    try { seen = Math.min(total, new Set(Array.isArray(store.seenQuestionIds) ? store.seenQuestionIds : []).size); } catch (e) {}
    try { mastered = Math.min(total, getMasteredCount()); } catch (e) {}
    var a = $id('dom-seen-bar'), b = $id('dom-master-bar');
    if (a) a.style.width = (seen / total * 100) + '%';
    if (b) b.style.width = (mastered / total * 100) + '%';
  }
  function $id(id) { return document.getElementById(id); }

  window.SEQStatsExtra = { render: render };
})();
