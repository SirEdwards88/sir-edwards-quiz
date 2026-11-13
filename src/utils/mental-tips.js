// SirEdwards Quiz — Cálculo de Fondo: «trucos mentales» tras un fallo y biblioteca de la Ayuda.
// Reglas puras, sin interfaz. Cada operación se estudia con TODOS los trucos de su familia (no depende de la `strategy` del
// analizador): cada truco decide por sí mismo si es compatible, calcula sus pasos y su coste mental aproximado, y gana el más barato.
// Si ninguno ahorra esfuerzo real, no hay truco (el juego sigue con su transición breve de siempre).
//
// Reglas:
//  - la corrección matemática es innegociable: cada paso se calcula aquí con los operandos reales y, al final, el resultado
//    del último paso debe ser op.answer; si no, no se muestra nada;
//  - gana el truco de menor coste; si dos están a menos de TIE_COST, se prefiere el menos mostrado hace poco (variedad sin perder utilidad);
//  - la tarjeta lleva la regla («rule», genérica) y el cálculo con los números reales («calc»);
//  - la biblioteca de Ayuda reutiliza estos mismos trucos con ejemplos calculados por el mismo código (no hay fórmulas duplicadas).
// Script clásico (scope global). Solo Cálculo de Fondo y la Ayuda lo usan: Turbo, Duelo y Reto no.
const SEQMentalTips = (function () {
  'use strict';
  var MINUS = '−';
  var TIE_COST = 0.25;       // diferencia de coste por debajo de la cual dos trucos se consideran equivalentes
  var MIN_SAVING = 0.4;      // un truco solo sale si cuesta al menos esto MENOS que hacer la cuenta directamente (ver directCost)
  var recent = [];           // últimos trucos mostrados (solo en memoria; una partida reanudada empieza sin historial)
  var RECENT_MAX = 4;

  // ---- utilidades numéricas -------------------------------------------------------------------
  function tz(n) { var t = 0; while (n > 0 && n % 10 === 0) { n = n / 10; t++; } return t; }
  function pow10(k) { return Math.pow(10, k); }
  function dg(n) { return String(Math.abs(n)).length; }
  function nz(n) { return String(Math.abs(n)).replace(/0/g, '').length; }
  function carries(a, b) { var c = 0, n = 0; while (a > 0 || b > 0 || c > 0) { var s = (a % 10) + (b % 10) + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  function borrows(a, b) { var n = 0, br = 0; while (a > 0 || b > 0) { var da = a % 10, db = (b % 10) + br; br = da < db ? 1 : 0; n += br; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
  // Número a ≤ 2 unidades de una decena, ≤ 3 de una centena o ≤ 5 de un millar (misma regla que SEQMentalCalc).
  function nearRound(n) {
    var bases = [1000, 100, 10], maxd = { 10: 2, 100: 3, 1000: 5 };
    if (n < 10) return null;
    for (var i = 0; i < bases.length; i++) {
      var B = bases[i], r = n % B, dist = Math.min(r, B - r);
      if (dist > 0 && dist <= maxd[B]) { var near = r < B - r ? n - r : n + (B - r); return { r: near, delta: n - near }; }
    }
    return null;
  }
  // Costes mentales aproximados (pasos «pesados»): solo sirven para ordenar trucos entre sí.
  function cAdd(a, b) { return 1 + 0.7 * carries(a, b); }
  function cSub(a, b) { return 1 + 0.8 * borrows(a, b); }
  function cDbl(x) { return 0.6 + 0.3 * carries(x, x); }   // duplicar es lo más cómodo que hay: sin tabla de multiplicar
  function cTimes(x, d) { // x × d, con d en {1..6, 8, 9}
    if (d === 1) return 0;
    if (d === 2) return cDbl(x);
    if (d === 3) return cDbl(x) + cAdd(2 * x, x);
    if (d === 4) return cDbl(x) + cDbl(2 * x);
    if (d === 5) return 1.4;                                   // por 10 y mitad
    if (d === 6) return cTimes(x, 3) + cDbl(3 * x);
    if (d === 8) return cDbl(x) + cDbl(2 * x) + cDbl(4 * x);
    if (d === 9) return 0.4 + cSub(10 * x, x);
    return 99;                                                 // ×7 y demás: nunca un paso cómodo
  }
  // Coste de hacer la cuenta directamente, por el método de siempre (columnas, filas parciales, división larga). Mismas unidades que los trucos.
  function carriesMul(x, d) { var n = 0, carry = 0; while (x > 0 || carry > 0) { var p = (x % 10) * d + carry; carry = Math.floor(p / 10); if (carry > 0) n++; x = Math.floor(x / 10); } return n; }
  function rowCost(x, d) { return d <= 1 ? 0.2 * dg(x) : 0.6 * dg(x) + 0.6 * carriesMul(x, d); }
  function directMul(a, b) {
    var s = Math.min(a, b), l = Math.max(a, b), rows = 0, cost = 0;
    String(s).split('').forEach(function (ch) { var d = Number(ch); if (d) { rows++; cost += rowCost(l, d); } });
    return cost + (rows - 1) * 1.4;
  }
  function directCost(op) {
    var a = op.a, b = op.b, g = signOf(op);
    if (g === '+') return 1 + 0.9 * carries(a, b) + 0.2 * Math.max(0, dg(Math.max(a, b)) - 2);
    if (g === MINUS) return 1 + 1.0 * borrows(a, b) + 0.2 * Math.max(0, dg(a) - 2);
    if (g === '×') return directMul(a, b);
    return (b <= 5 ? 0.9 : b < 10 ? 1.2 : 1.4) * dg(a);   // dividir entre 6-9 cuesta más (tabla más dura)
  }
  var DIV_BASE = { 2: 0.7, 3: 1.5, 4: 1.4, 5: 1.0, 6: 2.6, 7: 2.8, 8: 2.1, 9: 2.8 };
  function cDiv(n, c) { return DIV_BASE[c] * (n >= 1000 ? 1.5 : n >= 100 ? 1.2 : 1); }

  // ---- catálogo: lo que se enseña de cada truco (regla genérica) ------------------------------
  var TRICKS = {
    'sum-ceros':       { group: 'Sumas', name: 'Sumar quitando ceros', rule: 'Quita los ceros finales de los dos números, suma y devuélvelos.' },
    'sum-redondeo':    { group: 'Sumas', name: 'Sumar redondeando', rule: 'Redondea un sumando a una decena o centena y corrige la diferencia.' },
    'res-ceros':       { group: 'Restas', name: 'Restar quitando ceros', rule: 'Quita los ceros finales de los dos números, resta y devuélvelos.' },
    'res-compensar':   { group: 'Restas', name: 'Restar de más y devolver', rule: 'Resta el número redondo más cercano y devuelve la diferencia.' },
    'res-redondear':   { group: 'Restas', name: 'Redondear el primer número', rule: 'Redondea el primer número, resta y corrige la diferencia.' },
    'res-completar':   { group: 'Restas', name: 'Restar contando hacia arriba', rule: 'Cuenta desde el número pequeño hasta la decena y de ahí hasta el grande.' },
    'mul-ceros':       { group: 'Multiplicaciones', name: 'Multiplicar quitando ceros', rule: 'Quita los ceros finales, multiplica y devuélvelos.' },
    'mul-2':           { group: 'Multiplicaciones', name: 'Multiplicar por 2 por partes', rule: 'Duplica por partes: las centenas por un lado y el resto por otro.' },
    'mul-4':           { group: 'Multiplicaciones', name: 'Multiplicar por 4', rule: 'Multiplicar por 4 es duplicar dos veces.' },
    'mul-8-dup':       { group: 'Multiplicaciones', name: 'Multiplicar por 8', rule: 'Multiplicar por 8 es duplicar tres veces.' },
    'mul-8-diez':      { group: 'Multiplicaciones', name: 'Multiplicar por 8 (por 10 menos el doble)', rule: 'Multiplicar por 8 es multiplicar por 10 y restar el doble del número.' },
    'mul-5':           { group: 'Multiplicaciones', name: 'Multiplicar por 5', rule: 'Multiplicar por 5 es multiplicar por 10 y dividir entre 2.' },
    'mul-50':          { group: 'Multiplicaciones', name: 'Multiplicar por 50', rule: 'Multiplicar por 50 es multiplicar por 100 y dividir entre 2.' },
    'mul-25':          { group: 'Multiplicaciones', name: 'Multiplicar por 25', rule: 'Multiplicar por 25 es multiplicar por 100 y dividir entre 4.' },
    'mul-11':          { group: 'Multiplicaciones', name: 'Multiplicar por 11', rule: 'Por 11: separa las cifras y escribe su suma en medio. Si pasa de 9, suma 1 a la primera.' },
    'mul-11b':         { group: 'Multiplicaciones', name: 'Multiplicar por 11 (más de dos cifras)', rule: 'Multiplicar por 11 es multiplicar por 10 y sumar el número.' },
    'mul-9':           { group: 'Multiplicaciones', name: 'Multiplicar por 9', rule: 'Multiplicar por 9 es multiplicar por 10 y restar el número.' },
    'mul-99':          { group: 'Multiplicaciones', name: 'Multiplicar por 99', rule: 'Multiplicar por 99 es multiplicar por 100 y restar el número.' },
    'mul-101':         { group: 'Multiplicaciones', name: 'Multiplicar por 101', rule: 'Multiplicar por 101 es multiplicar por 100 y sumar el número.' },
    'mul-redondeo':    { group: 'Multiplicaciones', name: 'Multiplicar por 19, 21, 18, 22…', rule: 'Multiplica por el número redondo más cercano y corrige la diferencia.' },
    'mul-factores':    { group: 'Multiplicaciones', name: 'Multiplicar por factores', rule: 'Descompón el factor en dos pequeños (16 = 2 × 8) y multiplica de uno en uno.' },
    'mul-cuadrado5':   { group: 'Multiplicaciones', name: 'Cuadrado de un número de dos cifras acabado en 5', rule: 'Multiplica las decenas por la siguiente (en 35: 3 × 4) y escribe 25 detrás.' },
    'div-ceros10':     { group: 'Divisiones', name: 'Dividir entre 10 o 100', rule: 'Dividir entre 10 es quitar un cero; entre 100, dos.' },
    'div-ceros':       { group: 'Divisiones', name: 'Dividir quitando ceros', rule: 'Quita los mismos ceros finales en los dos números y divide.' },
    'div-2':           { group: 'Divisiones', name: 'Dividir entre 2 por partes', rule: 'Saca la mitad de las centenas y del resto por separado, y suma.' },
    'div-4':           { group: 'Divisiones', name: 'Dividir entre 4', rule: 'Dividir entre 4 es sacar la mitad dos veces.' },
    'div-8':           { group: 'Divisiones', name: 'Dividir entre 8', rule: 'Dividir entre 8 es sacar la mitad tres veces.' },
    'div-5':           { group: 'Divisiones', name: 'Dividir entre 5', rule: 'Dividir entre 5 es multiplicar por 2 y dividir entre 10.' },
    'div-25':          { group: 'Divisiones', name: 'Dividir entre 25', rule: 'Dividir entre 25 es multiplicar por 4 y dividir entre 100.' },
    'div-factores':    { group: 'Divisiones', name: 'Dividir por factores', rule: 'Divide en dos pasos por los factores del divisor, empezando por el más cómodo.' }
  };

  function c(id, cost, calc) { return { id: id, cost: cost, calc: calc }; }
  function ar(s) { return s.join(' → '); }

  // ---- sumas ---------------------------------------------------------------------------------
  function sumCands(a, b) {
    var out = [], z = Math.min(tz(a), tz(b));
    if (z >= 1) {
      var f = pow10(z), x = a / f, y = b / f;
      if (!(x <= 10 && y <= 10)) out.push(c('sum-ceros', 1.5, a + ' + ' + b + ' → ' + x + ' + ' + y + ' = ' + (x + y) + ' → ' + (a + b)));
    }
    [[a, b], [b, a]].forEach(function (p) {
      var n = p[0], other = p[1], nr = nearRound(n);
      if (!nr || Math.abs(nr.delta) > 3 || nr.r < 20 || carries(a, b) < 1 || carries(nr.r, other) >= carries(a, b)) return;
      var t = other + nr.r, d = nr.delta;
      out.push(c('sum-redondeo', 1.6 + 0.5 * carries(other, nr.r) + 0.1 * Math.abs(d),
        other + ' + ' + nr.r + ' = ' + t + ' → ' + t + ' ' + (d < 0 ? MINUS : '+') + ' ' + Math.abs(d) + ' = ' + (a + b)));
    });
    return out;
  }

  // ---- restas (a > b) -------------------------------------------------------------------------
  function subCands(a, b) {
    var out = [], z = Math.min(tz(a), tz(b)), d0 = a - b;
    if (d0 <= 15) return out;                                  // diferencia pequeña: se resuelve contando, no hay truco
    if (z >= 1) {
      var f = pow10(z), x = a / f, y = b / f;
      if (!(x <= 10 && y <= 10)) out.push(c('res-ceros', 1.5, a + ' ' + MINUS + ' ' + b + ' → ' + x + ' ' + MINUS + ' ' + y + ' = ' + (x - y) + ' → ' + d0));
    }
    var nb = nearRound(b);
    if (nb && Math.abs(nb.delta) <= 3 && nb.r >= 20 && nb.r < a && borrows(a, b) >= 1 && borrows(a, nb.r) < borrows(a, b)) {
      var t = a - nb.r, d = nb.delta; // b = r + d  →  a − b = (a − r) − d
      out.push(c('res-compensar', 1.8 + 0.8 * borrows(a, nb.r) + 0.1 * Math.abs(d),
        a + ' ' + MINUS + ' ' + nb.r + ' = ' + t + ' → ' + t + ' ' + (d < 0 ? '+' : MINUS) + ' ' + Math.abs(d) + ' = ' + d0));
    }
    var na = nearRound(a);
    if (na && Math.abs(na.delta) <= 3 && na.r >= 20 && na.r > b && borrows(a, b) >= 1 && borrows(na.r, b) < borrows(a, b)) {
      var u = na.r - b, e = na.delta; // a = r + e  →  a − b = (r − b) + e
      out.push(c('res-redondear', 1.9 + 0.8 * borrows(na.r, b) + 0.1 * Math.abs(e),
        na.r + ' ' + MINUS + ' ' + b + ' = ' + u + ' → ' + u + ' ' + (e < 0 ? MINUS : '+') + ' ' + Math.abs(e) + ' = ' + d0));
    }
    if (a % 100 === 0 && a >= 100 && b >= 10 && b % 10 !== 0) {
      var up = 10 - (b % 10), tenth = b + up, rest = a - tenth;
      out.push(c('res-completar', 2.2, b + ' + ' + up + ' = ' + tenth + ' → ' + a + ' ' + MINUS + ' ' + tenth + ' = ' + rest + ' → ' + up + ' + ' + rest + ' = ' + d0));
    }
    return out;
  }

  // ---- multiplicaciones -----------------------------------------------------------------------
  function mulCands(a, b) {
    var out = [], p = a * b, za = tz(a), zb = tz(b), z = za + zb;
    if (a <= 1 || b <= 1) return out;
    if (z >= 1) {
      var xa = a / pow10(za), xb = b / pow10(zb), q = xa * xb;
      if (xa > 1 && xb > 1 && q >= 20) out.push(c('mul-ceros', 1.5, a + ' × ' + b + ' → ' + xa + ' × ' + xb + ' = ' + q + ' → ' + p));
    }
    if (a === b && a % 10 === 5 && a >= 15 && a <= 95) {
      var n = (a - 5) / 10;
      out.push(c('mul-cuadrado5', 1.6, n + ' × ' + (n + 1) + ' = ' + (n * (n + 1)) + ' → ' + (n * (n + 1)) + ' y 25 → ' + p));
    }
    [[a, b], [b, a]].forEach(function (pr, idx) {
      var x = pr[0], y = pr[1];
      if (idx === 1 && a === b) return;
      if (x < 12) return;
      if (y === 2 && x >= 100 && x % 100 >= 12) {
        var h = Math.floor(x / 100) * 100, r = x - h;
        out.push(c('mul-2', 2.0, h + ' × 2 = ' + (2 * h) + '; ' + r + ' × 2 = ' + (2 * r) + ' → ' + (2 * h) + ' + ' + (2 * r) + ' = ' + p));
      }
      if (y === 4 && x >= 20 && x % 25 !== 0) out.push(c('mul-4', cDbl(x) + cDbl(2 * x), x + ' × 2 = ' + (2 * x) + ' → ' + (2 * x) + ' × 2 = ' + p));
      if (y === 8 && x >= 20 && x % 25 !== 0) {
        out.push(c('mul-8-dup', cDbl(x) + cDbl(2 * x) + cDbl(4 * x), x + ' × 2 = ' + (2 * x) + ' → ' + (2 * x) + ' × 2 = ' + (4 * x) + ' → ' + (4 * x) + ' × 2 = ' + p));
      }
      if (y === 5 && x % 10 !== 0) out.push(c('mul-5', 1.4 + (x % 2 ? 0.2 : 0), x + ' × 10 = ' + (10 * x) + ' → ' + (10 * x) + ' ÷ 2 = ' + p));
      if (y === 50 && x % 10 !== 0) out.push(c('mul-50', 1.3, x + ' × 100 = ' + (100 * x) + ' → ' + (100 * x) + ' ÷ 2 = ' + p));
      if (y === 25 && x % 100 !== 0) out.push(c('mul-25', 1.7 + (x % 4 ? 0.4 : 0), x + ' × 100 = ' + (100 * x) + ' → ' + (100 * x) + ' ÷ 4 = ' + p));
      if (y === 11 && x >= 12 && x < 100 && x % 10 !== 0) {
        var t = Math.floor(x / 10), u = x % 10, s = t + u;
        out.push(c('mul-11', s > 9 ? 1.6 : 1.2, s > 9
          ? t + ' + ' + u + ' = ' + s + ' → ' + (s % 10) + ' en medio y ' + t + ' + 1 = ' + (t + 1) + ' delante → ' + p
          : t + ' + ' + u + ' = ' + s + ' en medio → ' + p));
      }
      // Redondear el factor y corregir: x·y = x·r ± x·|d|, con r redondo (10, 20, 30, 40… 100) y |d| de 1 a 5.
      if (y >= 8 && y <= 110 && y % 10 !== 0 && x % 10 !== 0) {   // con ceros finales en x mandan los ceros
        var seen = {};
        [Math.round(y / 10) * 10, Math.floor(y / 10) * 10, Math.ceil(y / 10) * 10].forEach(function (rr) {
          var d = y - rr, ad = Math.abs(d);
          if (seen[rr] || rr < 10 || d === 0 || ad > 5) return;
          seen[rr] = true;
          var big = x * rr, small = x * ad, cost = (rr >= 100 ? 0.3 : cTimes(x, rr / 10)) + cTimes(x, ad) + (d < 0 ? cSub(big, small) : cAdd(big, small)) + (y === 8 ? 0.6 : 0); // ×8: la duplicación sucesiva es más fácil de recordar
          var steps = x + ' × ' + rr + ' = ' + big + (ad === 1 ? '' : '; ' + x + ' × ' + ad + ' = ' + small) + ' → ' + big + ' ' + (d < 0 ? MINUS : '+') + ' ' + small + ' = ' + p;
          var id = y === 9 ? 'mul-9' : y === 99 ? 'mul-99' : y === 101 ? 'mul-101' : y === 11 ? 'mul-11b' : y === 8 ? 'mul-8-diez' : 'mul-redondeo';
          if (y === 11 && x < 100) return;             // con dos cifras gana el método de las cifras
          if (y === 8 && x < 20) return;
          out.push(c(id, cost, steps));
        });
      }
      // Por factores del multiplicador (y de 12 a 99): x × c × d, con c y d en {2,3,4,5,6,8,9}; se prueban los dos órdenes y gana el más barato.
      // Condición propia (no depende del redondeo): 16 = 4 × 4, 18 = 3 × 6, 24 = 3 × 8, 36 = 4 × 9, 45 = 5 × 9…
      if (y >= 12 && y <= 99 && y % 10 !== 0 && x % 10 !== 0) {
        var FACT = [2, 3, 4, 5, 6, 8, 9], bf = null;
        FACT.forEach(function (c1) {
          var d1 = y / c1;
          if (d1 !== Math.floor(d1) || FACT.indexOf(d1) === -1) return;
          [[c1, d1], [d1, c1]].forEach(function (o) {
            var cost = cTimes(x, o[0]) + cTimes(x * o[0], o[1]);
            if (!bf || cost < bf.cost - 1e-9) bf = { c: o[0], d: o[1], cost: cost };
          });
        });
        if (bf) out.push(c('mul-factores', bf.cost, x + ' × ' + bf.c + ' = ' + (x * bf.c) + ' → ' + (x * bf.c) + ' × ' + bf.d + ' = ' + p));
      }
    });
    return out;
  }

  // ---- divisiones (exactas: a = b·q) ----------------------------------------------------------
  function divCands(a, b) {
    var out = [], q = a / b;
    if (!(b >= 2 && a % b === 0 && q >= 2)) return out;
    var kz = tz(b);
    if (b === pow10(kz) && kz >= 1) { if (q > 12) out.push(c('div-ceros10', 0.5, a + ' → ' + q)); return out; }
    if (a % 10 === 0 && b % 10 === 0) {
      var z = Math.min(tz(a), tz(b)), f = pow10(z);
      out.push(c('div-ceros', 1.5, a + ' ÷ ' + b + ' → ' + (a / f) + ' ÷ ' + (b / f) + ' = ' + q));
    }
    if (b === 2 && a >= 100 && a % 100 !== 0) {
      var h = Math.floor(a / 100) * 100, r = a - h;
      out.push(c('div-2', 2.0, h + ' ÷ 2 = ' + (h / 2) + '; ' + r + ' ÷ 2 = ' + (r / 2) + ' → ' + (h / 2) + ' + ' + (r / 2) + ' = ' + q));
    }
    if (b === 4 && a >= 100) out.push(c('div-4', 2.2, a + ' ÷ 2 = ' + (a / 2) + ' → ' + (a / 2) + ' ÷ 2 = ' + q));
    if (b === 8 && a >= 100) out.push(c('div-8', 3.0, a + ' ÷ 2 = ' + (a / 2) + ' → ' + (a / 2) + ' ÷ 2 = ' + (a / 4) + ' → ' + (a / 4) + ' ÷ 2 = ' + q));
    if (b === 5 && a >= 100) out.push(c('div-5', 1.8, a + ' × 2 = ' + (2 * a) + ' → ' + (2 * a) + ' ÷ 10 = ' + q));
    if (b === 25 && a >= 100) out.push(c('div-25', 2.0, a + ' × 4 = ' + (4 * a) + ' → ' + (4 * a) + ' ÷ 100 = ' + q));
    // Por factores del divisor: se prueban todos los pares (c·d) y los dos órdenes, y se elige el de menor coste.
    if (b >= 6 && [8, 10, 25].indexOf(b) === -1 && a >= 100) {
      var best = null;
      for (var c1 = 2; c1 <= 9; c1++) {
        var d1 = b / c1;
        if (d1 !== Math.floor(d1) || d1 < 2 || d1 > 9 || a % c1 !== 0 || (a / c1) % d1 !== 0) continue;
        var cost = cDiv(a, c1) + cDiv(a / c1, d1);
        if (!best || cost < best.cost - 1e-9) best = { c1: c1, d1: d1, cost: cost };
      }
      if (best) out.push(c('div-factores', best.cost, a + ' ÷ ' + best.c1 + ' = ' + (a / best.c1) + ' → ' + (a / best.c1) + ' ÷ ' + best.d1 + ' = ' + q));
    }
    return out;
  }

  // ---- selección ------------------------------------------------------------------------------
  function isOp(op) { return !!op && Number.isInteger(op.a) && Number.isInteger(op.b) && Number.isFinite(op.answer) && op.a > 0 && op.b > 0; }
  function signOf(op) { var s = op.sign || op.type; return s === '-' ? MINUS : s; }
  function candidates(op) {
    var s = signOf(op), a = op.a, b = op.b, list, direct = directCost(op);
    if (s === '+') list = sumCands(a, b);
    else if (s === MINUS) list = a > b ? subCands(a, b) : [];
    else if (s === '×') list = mulCands(a, b);
    else if (s === '÷') list = divCands(a, b);
    else list = [];
    // Autocomprobación: ningún truco sale si su último número no es la respuesta o si trae algo raro.
    return list.filter(function (k) {
      var nums = k.calc.match(/\d+/g);
      return nums && Number(nums[nums.length - 1]) === op.answer && !/NaN|undefined|Infinity|-\d/.test(k.calc) && k.cost <= direct - MIN_SAVING;
    }).sort(function (x, y) { return x.cost - y.cost; });
  }
  function recency(id, rec) { var i = rec.lastIndexOf(id); return i === -1 ? -1 : i; }   // -1: no mostrado; mayor = más reciente
  // Devuelve {id, group, name, rule, calc, cost} o null. `opts.recent`: ids mostrados hace poco (por defecto, la memoria del módulo).
  function get(op, opts) {
    if (!isOp(op)) return null;
    var list = candidates(op);
    if (!list.length) return null;
    var rec = (opts && opts.recent) || recent, top = list[0], pool = list.filter(function (k) { return k.cost - top.cost <= TIE_COST + 1e-9; });
    var pick = pool[0];
    for (var i = 1; i < pool.length; i++) if (recency(pool[i].id, rec) < recency(pick.id, rec)) pick = pool[i];
    var t = TRICKS[pick.id];
    return { id: pick.id, group: t.group, name: t.name, rule: t.rule, calc: pick.calc, cost: pick.cost, direct: directCost(op) };
  }
  // Línea única (regla + cálculo) o '' si no hay truco. No altera la memoria de variedad.
  function tip(op) { var g = get(op, { recent: [] }); return g ? g.rule + ' ' + g.calc : ''; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  // Bloque HTML de la tarjeta de fallo (vacío si no hay truco). Recuerda el truco mostrado para variar la próxima vez.
  function html(op) {
    var g = get(op);
    if (!g) return '';
    recent.push(g.id); if (recent.length > RECENT_MAX) recent.shift();
    return '<div class="mental-tip"><span class="mt-label">TRUCO MENTAL</span><span class="mt-rule">' + esc(g.rule) + '</span><span class="mt-calc">' + esc(g.calc) + '</span></div>';
  }
  function reset() { recent = []; }

  // ---- biblioteca de la Ayuda -----------------------------------------------------------------
  // [id del truco, ejemplos [a, signo, b]]. El texto de cada ejemplo lo calcula el mismo código que la tarjeta.
  var LIBRARY_IDS = [
    ['sum-ceros', [[730, '+', 470]]], ['sum-redondeo', [[183, '+', 197]]],
    ['res-ceros', [[910, '-', 570]]], ['res-compensar', [[352, '-', 98]]], ['res-redondear', [[1008, '-', 410]]], ['res-completar', [[100, '-', 37]]],
    ['mul-ceros', [[67, '×', 800]]], ['mul-2', [[789, '×', 2]]], ['mul-4', [[37, '×', 4]]], ['mul-8-dup', [[245, '×', 8]]], ['mul-5', [[99, '×', 5]]],
    ['mul-50', [[36, '×', 50]]], ['mul-25', [[36, '×', 25]]], ['mul-11', [[34, '×', 11], [78, '×', 11]]], ['mul-9', [[47, '×', 9]]],
    ['mul-99', [[32, '×', 99]]], ['mul-101', [[34, '×', 101]]], ['mul-redondeo', [[32, '×', 19], [24, '×', 21]]], ['mul-factores', [[35, '×', 16]]], ['mul-cuadrado5', [[35, '×', 35], [75, '×', 75]]],
    ['div-ceros10', [[340, '÷', 10]]], ['div-ceros', [[1960, '÷', 40]]], ['div-2', [[818, '÷', 2]]], ['div-4', [[728, '÷', 4]]], ['div-8', [[536, '÷', 8]]],
    ['div-5', [[880, '÷', 5]]], ['div-25', [[1100, '÷', 25]]], ['div-factores', [[336, '÷', 12], [342, '÷', 6]]]
  ];
  function mk(a, s, b) { var sg = s === '-' ? MINUS : s; return { a: a, b: b, sign: s, type: s, answer: s === '+' ? a + b : s === '-' ? a - b : s === '×' ? a * b : a / b, text: a + ' ' + sg + ' ' + b }; }
  // Devuelve [{group, items: [{id, name, rule, examples: [{text, answer, calc}]}]}], en el orden Sumas, Restas, Multiplicaciones, Divisiones.
  function library() {
    var groups = [], by = {};
    LIBRARY_IDS.forEach(function (e) {
      var t = TRICKS[e[0]];
      if (!by[t.group]) { by[t.group] = { group: t.group, items: [] }; groups.push(by[t.group]); }
      var examples = e[1].map(function (x) {
        var op = mk(x[0], x[1], x[2]), k = candidates(op).filter(function (z) { return z.id === e[0]; })[0];
        return k ? { text: op.text, answer: op.answer, calc: k.calc, line: k.calc.indexOf(op.text) === 0 ? k.calc : op.text + ' → ' + k.calc } : null;
      }).filter(Boolean);
      by[t.group].items.push({ id: e[0], name: t.name, rule: t.rule, examples: examples });
    });
    return groups;
  }

  return { get: get, tip: tip, html: html, reset: reset, library: library, candidates: candidates, TRICKS: TRICKS, TIE_COST: TIE_COST, MIN_SAVING: MIN_SAVING, directCost: directCost };
})();
