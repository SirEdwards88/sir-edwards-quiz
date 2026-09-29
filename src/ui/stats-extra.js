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
    { key: 'historia', label: 'Historia', icon: '🏛️' },
    { key: 'geografia', label: 'Geografía', icon: '🌍' },
    { key: 'ciencia', label: 'Ciencia', icon: '🔬' },
    { key: 'arte_literatura', label: 'Arte y Lit.', icon: '🎨' },
    { key: 'deporte', label: 'Deporte', icon: '⚽' },
    { key: 'cultura_general', label: 'Cultura', icon: '🧠' }
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
      h += '<text x="' + (p[0] + dx) + '" y="' + (p[1] - 3) + '" text-anchor="' + anchor + '" class="radar-lbl">' + v.icon + ' ' + v.label + '</text>';
      h += '<text x="' + (p[0] + dx) + '" y="' + (p[1] + 12) + '" text-anchor="' + anchor + '" class="radar-pct">' + (v.answered ? v.pct + '%' : '—') + '</text>';
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
        return { label: c.label, icon: c.icon, answered: answered, pct: answered ? Math.round(correct / answered * 100) : 0 };
      });
      var box = $id('stats-radar');
      if (!box) {
        box = document.createElement('div');
        box.id = 'stats-radar';
        box.className = 'stats-radar';
        host.parentNode.insertBefore(box, host);
      }
      var anyAnswered = values.some(function (v) { return v.answered > 0; });
      var best = values.filter(function (v) { return v.answered >= 3; }).sort(function (a, b) { return b.pct - a.pct; })[0];
      box.innerHTML = radarSvg(values) + (anyAnswered
        ? (best ? '<p class="radar-note">Tu punto fuerte: <b>' + best.icon + ' ' + best.label + '</b></p>' : '')
        : '<p class="radar-note">Juega unas partidas y aquí aparecerá la forma de tu conocimiento.</p>');
    } catch (e) { /* nunca debe romper Estadísticas */ }
  }
  function $id(id) { return document.getElementById(id); }

  window.SEQStatsExtra = { render: render };
})();
