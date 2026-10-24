// SirEdwards Quiz — Cálculo de Fondo: «trucos» tras un fallo.
// Convierte la estrategia que ya calcula el generador (SEQMentalCalc.analyze) en UNA línea con el atajo que habría resuelto la
// operación, con sus números reales. Reglas puras, sin interfaz: la tarjeta se pinta en index.html con SEQMentalTips.html(op).
//
// Reglas de cada línea (especificación «trucos de Fondo»):
//  - una sola línea de hasta MAX_LEN caracteres, como mucho un «:» y el resultado de la operación dentro del texto;
//  - cada truco calcula su propio resultado y, si no coincide con op.answer, no se muestra nada;
//  - solo atajos con nombre; los métodos de reserva (por partes, préstamo, distributiva, tabla) no se explican;
//  - filtros numéricos por truco para no explicar lo que ya es trivial. Si el análisis trae `direct` (carga del método base),
//    el truco solo sale si ahorra al menos MARGIN pasos (hoy analyze no lo devuelve: basta con añadirlo para activarlo).
// Script clásico (scope global). Solo Cálculo de Fondo: Turbo, Duelo y Reto no lo usan.
const SEQMentalTips = (function () {
  'use strict';
  var MAX_LEN = 90;
  var MARGIN = 0.8;
  var MINUS = '−';

  function tz(n) { var t = 0; while (n > 0 && n % 10 === 0) { n = n / 10; t++; } return t; }
  function pow10(k) { return Math.pow(10, k); }
  // Misma regla que SEQMentalCalc: número a ≤ 2 (o 3 / 5) unidades de una decena, centena o millar.
  function nearRound(n) {
    var bases = [1000, 100, 10], maxd = { 10: 2, 100: 3, 1000: 5 };
    if (n < 10) return null;
    for (var i = 0; i < bases.length; i++) {
      var B = bases[i], r = n % B, dist = Math.min(r, B - r);
      if (dist > 0 && dist <= maxd[B]) { var near = r < B - r ? n - r : n + (B - r); return { r: near, delta: n - near }; }
    }
    return null;
  }
  function plusMinus(d) { return d < 0 ? 'menos' : 'más'; }

  // ---- sumas y restas -------------------------------------------------------------------------
  function zerosAddSub(sign, a, b) {
    var z = Math.min(tz(a), tz(b)), f = pow10(z), x = a / f, y = b / f;
    if (z < 1 || (x < 10 && y < 10)) return '';
    var r = sign === '+' ? x + y : x - y;
    return 'Sin ' + (z > 1 ? 'los ceros' : 'el cero') + ' final' + (z > 1 ? 'es' : '') + ', ' + x + ' ' + (sign === '+' ? '+' : MINUS) + ' ' + y + ' = ' + r
      + '; devuélve' + (z > 1 ? 'los' : 'lo') + ', ' + (r * f) + '.';
  }
  function addComp(a, b) {
    var best = null;
    [[a, b], [b, a]].forEach(function (p) {
      var nr = nearRound(p[0]);
      if (nr && Math.abs(nr.delta) <= 3 && nr.r >= 30 && (!best || Math.abs(nr.delta) < Math.abs(best.nr.delta))) best = { n: p[0], other: p[1], nr: nr };
    });
    if (!best) return '';
    var d = best.nr.delta, t = best.other + best.nr.r;
    return 'Redondea ' + best.n + ' a ' + best.nr.r + ': ' + best.other + ' + ' + best.nr.r + ' = ' + t + ', ' + plusMinus(d) + ' ' + Math.abs(d) + ' son ' + (t + d) + '.';
  }
  function subComp(a, b) {
    var nb = nearRound(b);
    if (nb && Math.abs(nb.delta) <= 3 && nb.r >= 30 && nb.r < a) {
      var t = a - nb.r;
      return 'Resta ' + nb.r + ' en lugar de ' + b + ': ' + a + ' ' + MINUS + ' ' + nb.r + ' = ' + t + '; ' + (nb.delta < 0 ? 'suma' : 'resta') + ' ' + Math.abs(nb.delta) + ', ' + (t - nb.delta) + '.';
    }
    var na = nearRound(a);
    if (na && Math.abs(na.delta) <= 3 && na.r >= 30 && na.r > b) {
      var u = na.r - b;
      return 'Redondea ' + a + ' a ' + na.r + ': ' + na.r + ' ' + MINUS + ' ' + b + ' = ' + u + '; ' + (na.delta < 0 ? 'resta' : 'suma') + ' ' + Math.abs(na.delta) + ', ' + (u + na.delta) + '.';
    }
    return '';
  }
  function subComplete(a, b) {
    var d = a - b;
    if (d <= 15) return '';                                                 // «contar hasta»: no es un truco, no se muestra
    if (a % 100 === 0 && a >= 100 && b >= 10) return 'Con ' + (a - 1) + ' en vez de ' + a + ': ' + (a - 1) + ' ' + MINUS + ' ' + b + ' = ' + (a - 1 - b) + '; suma 1, ' + d + '.';
    return '';
  }

  // ---- multiplicaciones -----------------------------------------------------------------------
  function zerosMul(a, b) {
    var za = tz(a), zb = tz(b), z = za + zb;
    if (z < 1 || a <= 1 || b <= 1) return '';
    var x = a / pow10(za), y = b / pow10(zb), p = x * y;
    if (p < 20) return '';
    return 'Sin ' + (z > 1 ? 'los ceros' : 'el cero') + ', ' + x + ' × ' + y + ' = ' + p + '; devuélve' + (z > 1 ? 'los' : 'lo') + ', ' + (p * pow10(z)) + '.';
  }
  // El factor «especial» (2, 4, 8, 5, 25, 11) y el otro, x. Si los dos lo son, se usa el mayor como x.
  function split(a, b, k) { return a === k ? { x: b } : b === k ? { x: a } : null; }
  function mulTable(strategy, a, b) {
    var k = { x2: 2, x4: 4, x8: 8, x5: 5, x25: 25, x11: 11 }[strategy], s = split(a, b, k);
    if (!s) return '';
    var x = s.x;
    switch (strategy) {
      case 'x2': {
        if (x < 100 || x % 100 === 0) return '';
        var h = Math.floor(x / 100) * 100, r = x - h;
        return 'Por 2: duplica por partes, ' + (h * 2) + ' + ' + (r * 2) + ' = ' + (x * 2) + '.';
      }
      case 'x4': return x < 20 ? '' : 'Duplica dos veces: ' + x + ' → ' + (2 * x) + ' → ' + (4 * x) + '.';
      case 'x8': return x < 12 ? '' : 'Duplica tres veces: ' + x + ' → ' + (2 * x) + ' → ' + (4 * x) + ' → ' + (8 * x) + '.';
      case 'x5': return x < 12 ? '' : 'Por 5: por 10 y a la mitad, ' + (10 * x) + ' → ' + (5 * x) + '.';
      case 'x25': return x < 12 ? '' : 'Por 25: por 100 y entre 4, ' + (100 * x) + ' ÷ 4 = ' + (25 * x) + '.';
      case 'x11': return x < 12 ? '' : 'Por 11: por 10 y suma el número, ' + (10 * x) + ' + ' + x + ' = ' + (11 * x) + '.';
    }
    return '';
  }
  // x·y con y a ≤ 2 de un número redondo (×9, ×99, redondeos). ×101 y ×11 se excluyen a propósito.
  function mulNear(a, b) {
    var best = null;
    [[a, b], [b, a]].forEach(function (p) {
      var x = p[0], y = p[1], r = null, d = 0;
      if (y === 11 || x < 12) return;
      if (y === 9) { r = 10; d = -1; } else { var nr = nearRound(y); if (nr && Math.abs(nr.delta) <= 2 && nr.r >= 10) { r = nr.r; d = nr.delta; } }
      if (r && (!best || Math.abs(d) < Math.abs(best.d))) best = { x: x, y: y, r: r, d: d };
    });
    if (!best) return '';
    var x = best.x, r = best.r, d = best.d;
    if (d === 1 && r === 100) return '';                                    // ×101: descartado
    if (d === -1 && r === 10) return 'Por 9: por 10 y resta el número, ' + (10 * x) + ' ' + MINUS + ' ' + x + ' = ' + (9 * x) + '.';
    if (d === -1 && r === 100) return 'Por 99: por 100 y resta el número, ' + (100 * x) + ' ' + MINUS + ' ' + x + ' = ' + (99 * x) + '.';
    var tail = Math.abs(d) === 1 ? x : '2 × ' + x + ' = ' + (2 * x);
    return 'Redondea ' + best.y + ' a ' + r + ': ' + x + ' × ' + r + ' = ' + (x * r) + ', ' + plusMinus(d) + ' ' + tail + ', ' + (x * best.y) + '.';
  }

  // ---- divisiones -----------------------------------------------------------------------------
  function zerosDiv(a, b) {
    var z = Math.min(tz(a), tz(b)), f = pow10(z), x = a / f, y = b / f;
    if (z < 1 || y <= 1) return '';
    return 'Sin ' + (z > 1 ? 'los ceros' : 'un cero') + ' en cada número, ' + a + ' ÷ ' + b + ' → ' + x + ' ÷ ' + y + ' = ' + (x / y) + '.';
  }
  function divTable(strategy, a, b) {
    var q = a / b;
    switch (strategy) {
      case 'dividir2': {
        if (a < 100) return '';
        var h = Math.floor(a / 100) * 100, r = a - h;
        return r === 0 ? '' : 'Mitad por partes: ' + h + ' → ' + (h / 2) + ' y ' + r + ' → ' + (r / 2) + ', suman ' + q + '.';
      }
      case 'dividir4': return a < 100 ? '' : 'Mitad de la mitad: ' + a + ' → ' + (a / 2) + ' → ' + q + '.';
      case 'dividir5': return a < 100 ? '' : 'Por 2 y entre 10: ' + a + ' × 2 = ' + (2 * a) + ' → ' + q + '.';
      case 'dividir10': return q <= 12 ? '' : 'Quita un cero: ' + a + ' → ' + q + '.';
      case 'dividir25': return a < 100 ? '' : 'Por 4 y entre 100: ' + a + ' × 4 = ' + (4 * a) + ' → ' + q + '.';
      case 'factores': {
        for (var cf = 2; cf <= 9; cf++) {
          if (b % cf === 0 && b / cf >= 2 && b / cf <= 9 && a % cf === 0) return 'Entre ' + b + ' es entre ' + cf + ' y entre ' + (b / cf) + ': ' + a + ' → ' + (a / cf) + ' → ' + q + '.';
        }
        return '';
      }
      case 'divisibilidad': { // ÷3, ÷6 y ÷9 con el método base: solo ÷6 y ÷9 tienen un truco real (en dos pasos)
        if (a < 100) return '';
        if (b === 6) return 'Entre 6 es entre 2 y entre 3: ' + a + ' → ' + (a / 2) + ' → ' + q + '.';
        if (b === 9) return 'Entre 9 es entre 3 y entre 3: ' + a + ' → ' + (a / 3) + ' → ' + q + '.';
        return '';
      }
      case 'inversa': { // «Al revés»: solo con cocientes grandes
        if (q < 20) return '';
        var q1 = Math.floor(q / 10) * 10, rest = a - b * q1;
        if (q1 < 10 || rest <= 0) return '';
        return 'Al revés: ' + q1 + ' × ' + b + ' = ' + (b * q1) + '; quedan ' + rest + ' = ' + (q - q1) + ' × ' + b + ', total ' + q + '.';
      }
    }
    return '';
  }

  // ---- entrada --------------------------------------------------------------------------------
  function isOp(op) { return !!op && Number.isInteger(op.a) && Number.isInteger(op.b) && Number.isFinite(op.answer); }
  function build(op, an) {
    var a = op.a, b = op.b, st = an.strategy, sign = op.sign || op.type;
    if (sign === '+') return st === 'redondos' ? zerosAddSub('+', a, b) : st === 'compensacion' ? addComp(a, b) : '';
    if (sign === '-' || sign === MINUS) {
      if (st === 'redondos') return zerosAddSub('-', a, b);
      return st === 'compensacion' ? subComp(a, b) : st === 'completar' ? subComplete(a, b) : '';
    }
    if (sign === '×') {
      var z = zerosMul(a, b);
      if (z) return z;
      if (st === 'cerca10' || st === 'cerca20') return mulNear(a, b);
      return mulTable(st, a, b);
    }
    if (sign === '÷') {
      var kz = tz(b);
      if (b === pow10(kz) && kz >= 1) { // ÷10, ÷100…: quitar ceros (si el cociente ya es pequeño, no hay nada que explicar)
        return a / b <= 12 ? '' : 'Quita ' + (kz > 1 ? kz + ' ceros' : 'un cero') + ': ' + a + ' \u2192 ' + (a / b) + '.';
      }
      if (a % 10 === 0 && b % 10 === 0) return zerosDiv(a, b);
      return divTable(st, a, b);
    }
    return '';
  }
  // Devuelve la línea del truco o '' si no hay ninguno que valga la pena. `analysis` es opcional (por defecto, SEQMentalCalc.analyze).
  function tip(op, analysis) {
    if (!isOp(op)) return '';
    var an = analysis || (typeof SEQMentalCalc !== 'undefined' ? SEQMentalCalc.analyze(op) : null);
    if (!an) return '';
    var line = build(op, an);
    if (!line || line.length > MAX_LEN) return '';
    if ((line.match(/:/g) || []).length > 1) return '';
    if (line.indexOf(String(op.answer)) === -1) return '';
    // Autocomprobación: el resultado que el truco enseña es el último número de la línea y debe ser la respuesta.
    var nums = line.match(/\d+/g);
    if (!nums || Number(nums[nums.length - 1]) !== op.answer) return '';
    if (Number.isFinite(an.direct) && an.direct - an.load < MARGIN && !/^Sin /.test(line)) return '';
    return line;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function html(op, analysis) {
    var t = tip(op, analysis);
    return t ? '<div class="mental-tip"><span class="mt-label">TRUCO</span><span class="mt-text">' + esc(t) + '</span></div>' : '';
  }
  return { tip: tip, html: html, MAX_LEN: MAX_LEN, MARGIN: MARGIN };
})();
