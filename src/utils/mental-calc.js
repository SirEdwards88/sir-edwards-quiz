// SirEdwards Quiz — Cálculo Mental: dificultad matemática real, generación por dificultad objetivo y progresión.
//
// En vez de «generar al azar y llamarlo fácil/media/difícil», aquí:
//   1. calculateOperationDifficulty(op) mide cuánto cuesta DE VERDAD hacer la operación de cabeza (0-100):
//      llevadas, préstamos, descomposición, números redondos, compensación y estrategias propias de cada
//      operación (×2, ×5, ×11, ×25, cerca de 10/20, factorización, dividir entre 2/4/5/10, relación inversa…).
//   2. generateOperation(objetivo, tipo) fabrica una operación de ese tipo cuya dificultad real queda alrededor del
//      objetivo (muestreo con rechazo sobre generadores por FAMILIA de estrategia).
//   3. nextOperation(sesión, {streak}) decide el objetivo con una curva suave de la racha + variabilidad + una
//      adaptación suave al rendimiento reciente, y elige el tipo con una bolsa (reparto equilibrado, sin rachas de
//      lo mismo), evitando repetir operaciones, operandos y familias recientes.
//
// Todo es determinista si se pasa `rng` (mulberry32…): el Worker usa buildSequence() para fijar las operaciones de un Reto.
// Script clásico (scope global), sin dependencias.
// IMPORTANTE: el Worker (backend) tiene una COPIA LITERAL de este archivo en src/mental-calc.js (con un `export` al final);
// su test comprueba que el cuerpo es idéntico. Si cambias algo aquí, cópialo allí y vuelve a desplegar el Worker.

const SEQMentalCalc = (function () {
  'use strict';

  // ------------------------------------------------------------------ utilidades ---
  function rnd(rng) { return rng ? rng() : Math.random(); }
  function randInt(min, max, rng) { return Math.floor(rnd(rng) * (max - min + 1)) + min; }
  function pick(arr, rng) { return arr[Math.floor(rnd(rng) * arr.length)]; }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }
  function pow10(k) { return Math.pow(10, k); }
  function dg(n) { return String(Math.abs(n)).length; }              // nº de cifras
  function nz(n) { var s = String(Math.abs(n)), c = 0; for (var i = 0; i < s.length; i++) if (s.charAt(i) !== '0') c++; return c; } // cifras distintas de 0
  function tz(n) { var t = 0; while (n > 0 && n % 10 === 0) { n = n / 10; t++; } return t; } // ceros finales
  function digitSum(n) { var s = String(Math.abs(n)), c = 0; for (var i = 0; i < s.length; i++) c += s.charCodeAt(i) - 48; return c; }
  function numDigits(d, rng) { return randInt(pow10(d - 1), pow10(d) - 1, rng); }

  // Llevadas al sumar columna a columna. `clean`: las que dejan un 0 (completar la decena: 7+3, 6+4…), que cuestan poco.
  function carryInfo(a, b) {
    var n = 0, clean = 0, c = 0;
    while (a > 0 || b > 0 || c > 0) {
      var s = (a % 10) + (b % 10) + c;
      c = s >= 10 ? 1 : 0;
      if (c) { n++; if (s % 10 === 0) clean++; }
      a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return { n: n, clean: clean };
  }
  // Préstamos al restar (a > b) columna a columna. `zero`: préstamos que cruzan un 0 (1002−497), más pesados.
  function borrowInfo(a, b) {
    var n = 0, z = 0, br = 0;
    while (a > 0 || b > 0) {
      var da = a % 10, db = (b % 10) + br;
      if (da < db) { br = 1; n++; if (da === 0) z++; } else br = 0;
      a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return { n: n, zero: z };
  }
  // Número «casi redondo»: a 1-2 unidades de una decena (28, 31), ≤3 de una centena (497), ≤5 de un millar (998).
  function nearRound(n) {
    var bases = [1000, 100, 10], maxd = { 10: 2, 100: 3, 1000: 5 };
    if (n < 10) return null;
    for (var i = 0; i < bases.length; i++) {
      var B = bases[i], r = n % B, dist = Math.min(r, B - r);
      if (dist > 0 && dist <= maxd[B]) { var near = r < B - r ? n - r : n + (B - r); return { r: near, delta: n - near }; }
    }
    return null;
  }

  // -------------------------------------------------------- modelo de dificultad ---
  // Cada análisis devuelve {load, strategy}. `load` es una «carga mental» en pasos aproximados; la puntuación es load×10 (0-100).
  var COMP = 1.5; // coste de reconocer y aplicar una estrategia (compensar, completar…)
  function best(list) { var b = list[0]; for (var i = 1; i < list.length; i++) if (list[i].load < b.load) b = list[i]; return b; }

  // --- Sumas ---
  function addDirect(a, b) {
    var ci = carryInfo(a, b), parts = Math.min(nz(a), nz(b));
    return parts + (ci.n - ci.clean) * 1.2 + ci.clean * 0.5 + 0.35 * Math.max(0, dg(Math.max(a, b)) - 2);
  }
  function addAnalysis(a, b) {
    var z = Math.min(tz(a), tz(b));
    if (z > 0) { var f = pow10(z), r = addAnalysis(a / f, b / f); return { load: r.load * 0.85 + 0.15 * z, strategy: 'redondos' }; }
    var zz = Math.max(tz(a), tz(b));
    var c = [{ load: addDirect(a, b), strategy: zz >= 2 ? 'centenas' : zz === 1 ? 'decenas' : 'descomposicion' }];
    [[a, b], [b, a]].forEach(function (p) {
      var nr = nearRound(p[0]);
      if (nr) c.push({ load: addDirect(nr.r, p[1]) + COMP, strategy: 'compensacion' });
    });
    return best(c);
  }

  // --- Restas (a > b) ---
  function subDirect(a, b) {
    var bi = borrowInfo(a, b);
    return nz(b) + bi.n * 1.3 + bi.zero * 0.8 + 0.35 * Math.max(0, dg(a) - 2);
  }
  function subAnalysis(a, b) {
    var z = Math.min(tz(a), tz(b));
    if (z > 0) { var f = pow10(z), r = subAnalysis(a / f, b / f); return { load: r.load * 0.85 + 0.15 * z, strategy: 'redondos' }; }
    var bi = borrowInfo(a, b);
    var c = [{ load: subDirect(a, b), strategy: bi.n === 0 ? 'bloques' : 'prestamo' }];
    var nb = nearRound(b);
    if (nb && nb.r < a) c.push({ load: subDirect(a, nb.r) + COMP, strategy: 'compensacion' });
    var na = nearRound(a);
    if (na && na.r > b) c.push({ load: subDirect(na.r, b) + COMP, strategy: 'compensacion' });
    if (a % 100 === 0) c.push({ load: 0.8 * dg(b) + 0.7, strategy: 'completar' });
    if (a - b <= 15) c.push({ load: 0.9 * nz(a - b) + 0.6, strategy: 'completar' }); // contar hacia arriba desde b
    return best(c);
  }

  // --- Multiplicaciones ---
  function mulFact(x, y) { return 0.6 + 0.012 * x * y + (x >= 6 && y >= 6 ? 0.35 : 0); } // tabla de multiplicar (≤10×10)
  function dblCost(x) { return 0.5 + 0.3 * nz(x) + 0.5 * carryInfo(x, x).n; }            // duplicar x
  function partialCost(da, db) { return (da === 1 || db === 1) ? 0.3 : 0.5 + 0.018 * da * db; }
  // Producto por descomposición distributiva: productos parciales por cifras + sumarlos.
  function mulDirect(a, b) {
    var sa = String(a), sb = String(b), parts = [], cost = 0;
    for (var i = 0; i < sa.length; i++) {
      var da = +sa.charAt(i); if (!da) continue;
      for (var j = 0; j < sb.length; j++) {
        var db = +sb.charAt(j); if (!db) continue;
        parts.push(da * db * pow10((sa.length - 1 - i) + (sb.length - 1 - j)));
        cost += partialCost(da, db);
      }
    }
    parts.sort(function (x, y) { return y - x; });
    var acc = parts[0] || 0;
    for (var k = 1; k < parts.length; k++) {
      cost += 0.9 + carryInfo(acc, parts[k]).n;
      acc += parts[k];
    }
    return cost + 0.35 * Math.max(0, dg(a * b) - 2);
  }
  function mulAnalysis(a, b, deep) { // deep: dentro de una estrategia compuesta solo se usan las simples (evita ciclos)
    if (a < b) { var t = a; a = b; b = t; }                               // a ≥ b
    if (b <= 1) return { load: 0.3, strategy: 'x10' };
    var za = tz(a), zb = tz(b);
    if (za + zb > 0) {                                                    // ×10, ×20, ×50, ×100… se resuelve sin los ceros
      var inner = mulAnalysis(a / pow10(za), b / pow10(zb), deep);
      return { load: inner.load * 0.85 + 0.15 * (za + zb), strategy: inner.strategy === 'tabla' || inner.strategy === 'distributiva' ? 'x10' : inner.strategy };
    }
    var c = [];
    if (a <= 10) c.push({ load: mulFact(a, b), strategy: 'tabla' });
    else c.push({ load: mulDirect(a, b), strategy: 'distributiva' });
    [[a, b], [b, a]].forEach(function (p) {
      var x = p[0], y = p[1];
      if (y === 2) c.push({ load: dblCost(x), strategy: 'x2' });
      if (y === 4) c.push({ load: dblCost(x) + dblCost(2 * x) - 0.2, strategy: 'x4' });
      if (y === 8) c.push({ load: dblCost(x) + dblCost(2 * x) + dblCost(4 * x) - 0.4, strategy: 'x8' });
      if (y === 5) c.push({ load: 0.9 + 0.3 * nz(x) + (x % 2 ? 0.2 : 0), strategy: 'x5' });
      if (y === 25) c.push({ load: 1.4 + 0.3 * nz(x) + (x % 4 ? 0.6 : 0), strategy: 'x25' });
      if (y === 11) c.push({ load: dg(x) === 2 ? 1.4 + (digitSum(x) >= 10 ? 0.5 : 0) : 1.8 + 0.4 * dg(x), strategy: 'x11' });
      if (deep) return;
      // cerca de 10 / 20 / 100: x·redondo ± x·pequeño
      var r = null, delta = 0;
      if (y === 9) { r = 10; delta = -1; } else { var nr = nearRound(y); if (nr && Math.abs(nr.delta) <= 2 && nr.r >= 10) { r = nr.r; delta = nr.delta; } }
      if (r && y !== 11) {
        var adj = Math.abs(delta) === 1 ? 0 : mulAnalysis(x, Math.abs(delta), true).load;
        var combine = delta < 0 ? subAnalysis(x * r, x * Math.abs(delta)).load : addAnalysis(x * r, x * Math.abs(delta)).load;
        c.push({ load: mulAnalysis(x, r, true).load + adj + combine + COMP * 0.5, strategy: (r === 20 || r === 30) ? 'cerca20' : 'cerca10' });
      }
      // factorización: x·(c·d) = (x·c)·d con c, d pequeños
      if (y > 9 && y <= 40) {
        for (var cf = 2; cf <= 9; cf++) {
          if (y % cf === 0 && y / cf >= 2 && y / cf <= 9) {
            c.push({ load: mulAnalysis(x, cf, true).load + mulAnalysis(x * cf, y / cf, true).load + 0.6, strategy: 'factorizacion' });
            break;
          }
        }
      }
    });
    if (!deep && a === b && a % 10 === 5 && a <= 95) c.push({ load: 2.2, strategy: 'cuadrado' }); // n5² = n(n+1)|25
    return best(c);
  }

  // --- Divisiones exactas (a = b·q) ---
  function divAnalysis(a, b) {
    var q = a / b;
    if (a % 10 === 0 && b % 10 === 0) { var r = divAnalysis(a / 10, b / 10); return { load: r.load * 0.85 + 0.15, strategy: r.strategy }; }
    var c = [];
    if (b <= 12 && q <= 12) c.push({ load: 0.6 + 0.008 * a + ((b > 9 || q > 9) ? 0.3 : 0), strategy: 'tabla' });
    if (b === 2) c.push({ load: 0.5 + 0.3 * dg(a) + 0.7 * Math.max(0, dg(a) - 2), strategy: 'dividir2' });
    if (b === 4) c.push({ load: 1.0 + 0.3 * dg(a) + 0.7 * Math.max(0, dg(a) - 2), strategy: 'dividir4' });
    if (b === 5) c.push({ load: 0.9 + 0.3 * dg(a) + 0.7 * Math.max(0, dg(a) - 2), strategy: 'dividir5' });
    if (b === 10) c.push({ load: 0.3, strategy: 'dividir10' });
    if (b === 25) c.push({ load: 1.4 + 0.3 * dg(a), strategy: 'dividir25' });
    if (b > 9) {
      for (var cf = 2; cf <= 9; cf++) {
        if (b % cf === 0 && b / cf >= 2 && b / cf <= 9) {
          c.push({ load: divAnalysis(a, cf).load + divAnalysis(a / cf, b / cf).load + 0.5, strategy: 'factores' });
          break;
        }
      }
    }
    c.push({ load: 0.9 + 0.75 * mulAnalysis(b, q, true).load + 0.35 * Math.max(0, dg(a) - 2), strategy: (b === 3 || b === 6 || b === 9) ? 'divisibilidad' : 'inversa' });
    return best(c);
  }

  function norm(op) {
    var sign = op.sign || op.type, a = op.a, b = op.b;
    return { sign: sign, a: a, b: b };
  }
  // Análisis completo: {load, score (0-100), strategy}.
  function analyze(op) {
    var o = norm(op), res;
    if (o.sign === '+') res = addAnalysis(o.a, o.b);
    else if (o.sign === '-') res = subAnalysis(o.a, o.b);
    else if (o.sign === '×') res = mulAnalysis(o.a, o.b);
    else res = divAnalysis(o.a, o.b);
    return { load: res.load, score: clamp(Math.round(res.load * 10), 0, 100), strategy: res.strategy };
  }
  function calculateOperationDifficulty(op) { return analyze(op).score; }

  // ------------------------------------------------------- familias (generadores) ---
  // Cada familia devuelve [a, b]; makeOp() valida la operación. `t` = dificultad objetivo (0-100): solo orienta el tamaño.
  function pickDigits(t, rng, max) {
    var r = rnd(rng), d;
    if (t < 25) d = r < 0.8 ? 2 : 3;
    else if (t < 50) d = r < 0.45 ? 2 : r < 0.95 ? 3 : 4;
    else if (t < 75) d = r < 0.15 ? 2 : r < 0.75 ? 3 : 4;
    else d = r < 0.55 ? 3 : 4;
    return Math.min(d, max || 4);
  }
  function buildAddWithCarries(d, carries, rng) {
    var cols = [];
    for (var i = 0; i < d; i++) cols.push(i);
    var plan = {};
    while (carries > 0 && cols.length) { plan[cols.splice(randInt(0, cols.length - 1, rng), 1)[0]] = true; carries--; }
    var a = 0, b = 0, cin = 0;
    for (var j = 0; j < d; j++) {
      var top = j === d - 1, lo = top ? 1 : 0, da, db;
      if (plan[j]) { da = randInt(Math.max(lo, 1), 9, rng); db = randInt(Math.max(lo, 10 - cin - da, 0), 9, rng); }
      else {
        var cap = 9 - cin; if (top) cap = Math.max(cap, 2);
        da = randInt(lo, Math.max(lo, cap - lo), rng); db = randInt(lo, Math.max(lo, cap - da), rng);
      }
      a += da * pow10(j); b += db * pow10(j);
      cin = (da + db + cin >= 10) ? 1 : 0;
    }
    return [a, b];
  }
  function buildSubWithBorrows(d, borrows, rng) {
    var cols = [];
    for (var i = 0; i < d - 1; i++) cols.push(i);
    var plan = {};
    while (borrows > 0 && cols.length) { plan[cols.splice(randInt(0, cols.length - 1, rng), 1)[0]] = true; borrows--; }
    var a = 0, b = 0, bin = 0;
    for (var j = 0; j < d; j++) {
      var da, db;
      if (j === d - 1) { db = randInt(1, 8, rng); da = randInt(db + bin + (j === 0 ? 1 : 0), 9, rng); }
      else if (plan[j]) { db = randInt(1, 9, rng); da = randInt(0, Math.min(9, db + bin - 1), rng); }
      else { db = randInt(0, 8 - bin, rng); da = randInt(db + bin, 9, rng); }
      a += da * pow10(j); b += db * pow10(j);
      bin = (da < db + bin) ? 1 : 0;
    }
    return [a, b];
  }
  // Multiplicar por 2, 4, 5 o 10 un número de 3 cifras (985 × 5) parece fácil para la métrica, pero no al principio: hasta un objetivo de 30, máximo 2 cifras.
  function bigX(t, rng, maxD) { return numDigits(pickDigits(t, rng, t < 30 ? Math.min(2, maxD || 3) : (maxD || 3)), rng); }

  var FAMILIES = {
    '+': [
      { id: 'redondos', gen: function (t, rng) { var d = pickDigits(t, rng, 4), k = randInt(1, Math.max(1, d - 1), rng); return [numDigits(d, rng), randInt(1, 9, rng) * pow10(k)]; } },
      { id: 'decenas', gen: function (t, rng) { return [randInt(11, 99, rng), 10 * randInt(1, 9, rng)]; } },
      { id: 'centenas', gen: function (t, rng) { return [randInt(101, 999, rng), 100 * randInt(1, 9, rng) + (rnd(rng) < 0.5 ? 10 * randInt(1, 9, rng) : 0)]; } },
      { id: 'compensacion', gen: function (t, rng) { var R = pick([20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 1000], rng), dl = randInt(1, R < 100 ? 2 : 3, rng); return [numDigits(pickDigits(t, rng, 4), rng), rnd(rng) < 0.7 ? R - dl : R + dl]; } },
      { id: 'descomposicion', gen: function (t, rng) { var d = pickDigits(t, rng, 4); return buildAddWithCarries(d, randInt(0, d, rng), rng); } },
      { id: 'descomposicion', gen: function (t, rng) { var d = pickDigits(t, rng, 4); return buildAddWithCarries(d, randInt(Math.max(0, d - 2), d, rng), rng); } }
    ],
    '-': [
      { id: 'redondos', gen: function (t, rng) { var k = randInt(1, 2, rng), a = randInt(2, 99, rng) * pow10(k), b = randInt(1, 9, rng) * pow10(k); return [a, b]; } },
      { id: 'compensacion', gen: function (t, rng) { var R = pick([20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400, 500, 1000], rng), b = rnd(rng) < 0.7 ? R - randInt(1, R < 100 ? 2 : 3, rng) : R + randInt(1, R < 100 ? 2 : 3, rng); return [b + randInt(15, pow10(Math.max(2, Math.min(3, pickDigits(t, rng, 3)))) * 2, rng), b]; } },
      { id: 'completar', gen: function (t, rng) { var A = pick([100, 100, 200, 500, 1000], rng); return [A, randInt(Math.floor(A / 10) + 1, A - 1, rng)]; } },
      { id: 'bloques', gen: function (t, rng) { var d = pickDigits(t, rng, 4); return buildSubWithBorrows(d, 0, rng); } },
      { id: 'prestamo', gen: function (t, rng) { var d = pickDigits(t, rng, 4); return buildSubWithBorrows(d, randInt(1, Math.max(1, d - 1), rng), rng); } },
      { id: 'prestamo', gen: function (t, rng) { var d = pickDigits(t, rng, 4); return buildSubWithBorrows(d, Math.max(1, d - 1), rng); } }
    ],
    '×': [
      { id: 'tabla', gen: function (t, rng) { return [randInt(2, 9, rng), randInt(3, 9, rng)]; } },
      { id: 'x2', gen: function (t, rng) { return [bigX(t, rng), 2]; } },
      { id: 'x4', gen: function (t, rng) { return [bigX(t, rng, 2), pick([4, 8], rng)]; } },
      { id: 'x5', gen: function (t, rng) { return [bigX(t, rng), 5]; } },
      { id: 'x10', gen: function (t, rng) { return [bigX(t, rng), pick([10, 20, 50, 100], rng)]; } },
      { id: 'x11', gen: function (t, rng) { return [bigX(t, rng, 2), 11]; } },
      { id: 'x25', gen: function (t, rng) { return [bigX(t, rng, 2), 25]; } },
      { id: 'cerca10', gen: function (t, rng) { return [bigX(t, rng, 2), pick([9, 9, 99, 101], rng)]; } },
      { id: 'cerca20', gen: function (t, rng) { return [bigX(t, rng, 2), pick([18, 19, 21, 22], rng)]; } },
      { id: 'factorizacion', gen: function (t, rng) { return [bigX(t, rng, 2), pick([12, 14, 15, 16, 18, 24, 36], rng)]; } },
      { id: 'distributiva', gen: function (t, rng) { return [numDigits(2, rng), randInt(3, 9, rng)]; } },
      { id: 'distributiva', gen: function (t, rng) { return [numDigits(t < 30 ? 2 : 3, rng), randInt(3, 9, rng)]; } },
      { id: 'distributiva', gen: function (t, rng) { return [numDigits(2, rng), randInt(12, 29, rng)]; } },
      { id: 'distributiva', gen: function (t, rng) { return [randInt(12, 99, rng), randInt(13, 99, rng)]; } }
    ],
    '÷': [
      { id: 'tabla', gen: function (t, rng) { var b = randInt(2, 12, rng), q = randInt(2, 12, rng); return [b * q, b]; } },
      { id: 'dividir2', gen: function (t, rng) { return [2 * randInt(6, 499, rng), 2]; } },
      { id: 'dividir4', gen: function (t, rng) { return [4 * randInt(6, 200, rng), 4]; } },
      { id: 'dividir5', gen: function (t, rng) { return [5 * randInt(6, 180, rng), 5]; } },
      { id: 'dividir10', gen: function (t, rng) { return [10 * randInt(2, 99, rng), 10]; } },
      { id: 'factores', gen: function (t, rng) { var b = pick([6, 8, 12, 14, 15, 16, 18, 24], rng); return [b * randInt(5, 40, rng), b]; } },
      { id: 'divisibilidad', gen: function (t, rng) { var b = pick([3, 6, 9], rng); return [b * randInt(12, 160, rng), b]; } },
      { id: 'inversa', gen: function (t, rng) { var b = randInt(6, 25, rng); return [b * randInt(6, 45, rng), b]; } },
      { id: 'inversa', gen: function (t, rng) { var b = randInt(11, 29, rng); return [b * randInt(11, 40, rng), b]; } },
      { id: 'inversa', gen: function (t, rng) { var b = randInt(13, 49, rng); return [b * randInt(14, 60, rng), b]; } },
      { id: 'inversa', gen: function (t, rng) { var b = randInt(17, 97, rng); return [b * randInt(12, 45, rng), b]; } }
    ]
  };
  var TYPES = ['+', '-', '×', '÷'];

  // Valida y completa una operación. Mismas reglas que siempre: restas con resultado positivo, divisiones exactas con
  // divisor y cociente ≥ 2.
  function makeOp(sign, a, b, swap) {
    if (!(a > 0 && b > 0) || a !== Math.floor(a) || b !== Math.floor(b)) return null;
    var answer;
    if (sign === '+') { answer = a + b; if (swap) { var t = a; a = b; b = t; } }
    else if (sign === '-') { if (a <= b) return null; answer = a - b; }
    else if (sign === '×') { answer = a * b; if (swap) { var u = a; a = b; b = u; } }
    else { if (b < 2 || a % b !== 0 || a / b < 2) return null; answer = a / b; }
    if (answer > 1e6) return null;
    return { sign: sign, a: a, b: b, answer: answer, text: a + ' ' + sign + ' ' + b };
  }

  // ----------------------------------------------------------------- generación ---
  var RECENT_TEXTS = 24, RECENT_OPERANDS = 6;
  function penalty(op, recent, famId) {
    var p = 0, i;
    for (i = Math.max(0, recent.length - RECENT_TEXTS); i < recent.length; i++) if (recent[i].text === op.text) { p += 100; break; }
    for (i = Math.max(0, recent.length - RECENT_OPERANDS); i < recent.length; i++) {
      var r = recent[i];
      [op.a, op.b].forEach(function (x) { if (x >= 10 && (x === r.a || x === r.b)) p += 5; });
    }
    var n = recent.length;
    if (n >= 1 && recent[n - 1].family === famId) p += 3;
    if (n >= 2 && recent[n - 1].family === famId && recent[n - 2].family === famId) p += 6;
    return p;
  }
  // Genera una operación de `type` ('+', '-', '×', '÷') cuya dificultad real queda alrededor de `target`.
  // ctx: {recent (memoria de operaciones recientes), tolerance (por defecto 6), tries (por defecto 60)}.
  function generateOperation(target, type, rng, ctx) {
    ctx = ctx || {};
    var recent = ctx.recent || [], tol = ctx.tolerance != null ? ctx.tolerance : 6, tries = ctx.tries || 60;
    var fams = FAMILIES[type] || FAMILIES['+'], bestOp = null, bestScore = Infinity;
    for (var i = 0; i < tries; i++) {
      var fam = pick(fams, rng), ab = fam.gen(target, rng);
      var op = makeOp(type, ab[0], ab[1], rnd(rng) < 0.5);
      if (!op) continue;
      var an = analyze(op), dist = Math.abs(an.score - target) + penalty(op, recent, fam.id);
      if (dist < bestScore) {
        bestScore = dist;
        bestOp = { sign: op.sign, type: op.sign, a: op.a, b: op.b, answer: op.answer, text: op.text, family: fam.id, strategy: an.strategy, difficulty: an.score, target: target };
      }
      if (dist <= tol) break;
    }
    if (!bestOp) { // no debería ocurrir; salida segura
      var a = randInt(10, 60, rng), b = randInt(10, 40, rng);
      bestOp = { sign: '+', type: '+', a: a, b: b, answer: a + b, text: a + ' + ' + b, family: 'descomposicion', strategy: 'descomposicion', difficulty: calculateOperationDifficulty({ sign: '+', a: a, b: b }), target: target };
    }
    bestOp.tier = bestOp.difficulty < 33 ? 'easy' : bestOp.difficulty < 60 ? 'medium' : 'hard';
    return bestOp;
  }

  // ----------------------------------------------------- progresión y adaptación ---
  // Dificultad base según la racha: curva suave (sin saltos en los umbrales de antes). Casi igual hasta ~8 seguidas; a partir de ahí sube más despacio.
  var CURVE = [[0, 14], [5, 22], [10, 30], [15, 37], [20, 45], [30, 60], [45, 76]];
  function curve(streak) {
    if (streak <= 0) return CURVE[0][1];
    for (var i = 1; i < CURVE.length; i++) {
      if (streak <= CURVE[i][0]) {
        var p = CURVE[i - 1], q = CURVE[i];
        return p[1] + (q[1] - p[1]) * (streak - p[0]) / (q[0] - p[0]);
      }
    }
    return CURVE[CURVE.length - 1][1];
  }
  // Tiempo que tardaría «normalmente» alguien en una operación de esta dificultad (ms): solo para medir si va sobrado.
  function expectedMs(d) { return 2500 + 70 * d; }
  // Ajuste de dificultad (-8..+8) según las últimas respuestas ({ok, ms, d}). Un solo fallo no lo mueve apenas.
  function performanceAdjust(perf) {
    if (!perf || perf.length < 3) return 0;
    var ok = 0, ratios = [];
    perf.forEach(function (p) { if (p.ok) ok++; ratios.push(p.ms / expectedMs(p.d)); });
    var acc = ok / perf.length;
    ratios.sort(function (x, y) { return x - y; });
    var med = ratios[Math.floor(ratios.length / 2)];
    if (acc >= 0.9) return med < 0.6 ? 8 : med < 0.85 ? 5 : med < 1.15 ? 2 : 1; // rápido y sin fallos sube más; lento pero preciso, poco
    if (acc >= 0.7) return 0;                                                    // rápido pero con algún fallo: no se sube
    return -Math.min(8, Math.round((0.7 - acc) * 20));                           // varios fallos: baja
  }
  function createSession(rng) { return { rng: rng || null, recent: [], bag: [], types: [], perf: [], carry: 0, noAdapt: false, cap: 92, n: 0 }; }
  // Tipo de operación con una bolsa (2 de cada) → reparto equilibrado; nunca 3 seguidas del mismo.
  function nextType(s) {
    if (!s.bag.length) {
      s.bag = [];
      TYPES.forEach(function (t) { s.bag.push(t, t); });
      for (var i = s.bag.length - 1; i > 0; i--) { var j = Math.floor(rnd(s.rng) * (i + 1)); var tmp = s.bag[i]; s.bag[i] = s.bag[j]; s.bag[j] = tmp; }
    }
    var n = s.types.length, forbid = (n >= 2 && s.types[n - 1] === s.types[n - 2]) ? s.types[n - 1] : null, idx = -1;
    for (var k = s.bag.length - 1; k >= 0; k--) { if (s.bag[k] !== forbid) { idx = k; break; } }
    if (idx < 0) { s.bag = []; return nextType(s); }
    var t = s.bag.splice(idx, 1)[0];
    s.types.push(t); if (s.types.length > 4) s.types.shift();
    return t;
  }
  // Objetivo de dificultad para la próxima operación.
  function targetForStreak(streak, s) {
    var rng = s ? s.rng : null;
    var base = curve(streak);
    if (s && s.carry > 0 && streak < 8) base = Math.max(base, s.carry * (1 - streak / 8)); // tras un fallo, no se cae de golpe
    var jitter = (rnd(rng) + rnd(rng) - 1) * 9;          // variabilidad (triangular ±9)
    var r = rnd(rng);
    if (r < 0.10) jitter -= 12; else if (r > 0.92) jitter += 8; // un respiro o un pico de vez en cuando
    var adj = (s && !s.noAdapt) ? performanceAdjust(s.perf) : 0;
    return clamp(Math.round(base + jitter + adj), 8, s && s.cap ? s.cap : 92);
  }
  var WARMUP_OPS = 3, WARMUP_MAX = 14;
  function nextOperation(s, opts) {
    var streak = opts && opts.streak ? opts.streak : 0;
    var target = targetForStreak(streak, s), type = nextType(s);
    if (s.n < WARMUP_OPS) target = Math.min(target, WARMUP_MAX); // calentamiento: las primeras operaciones de una partida, suaves
    s.n++;
    var op = generateOperation(target, type, s.rng, { recent: s.recent });
    s.recent.push({ text: op.text, a: op.a, b: op.b, family: op.family });
    if (s.recent.length > 40) s.recent.shift();
    return op;
  }
  // Anota el resultado de una respuesta (para la adaptación y para suavizar la caída tras un fallo).
  function recordResult(s, op, ok, ms) {
    s.perf.push({ ok: !!ok, ms: ms, d: op.difficulty });
    if (s.perf.length > 6) s.perf.shift();
    if (!ok) s.carry = 0.5 * op.difficulty;
  }
  // Secuencia fija de `count` operaciones, sin adaptación (la usa el Worker para los Retos: los dos jugadores juegan lo mismo).
  // La posición hace de «racha» (juego perfecto): la dificultad sube de forma suave a lo largo de la secuencia.
  // `cap` (opcional): dificultad máxima a la que se pide; los Retos la limitan para que la parte final no sea más dura que el antiguo «difícil».
  function buildSequence(count, rng, cap) {
    var s = createSession(rng), out = [];
    s.noAdapt = true;
    if (cap) s.cap = cap;
    for (var i = 0; i < count; i++) out.push(nextOperation(s, { streak: i }));
    return out;
  }
  // Puntos base de un acierto según su dificultad real (mismos extremos de siempre: 10 fácil · 20 media · 35 difícil).
  function basePoints(d) {
    if (d <= 20) return 10;
    if (d <= 45) return Math.round(10 + 10 * (d - 20) / 25);
    if (d <= 75) return Math.round(20 + 15 * (d - 45) / 30);
    return 35;
  }

  return {
    calculateOperationDifficulty: calculateOperationDifficulty, analyze: analyze, generateOperation: generateOperation,
    createSession: createSession, nextOperation: nextOperation, recordResult: recordResult, buildSequence: buildSequence,
    targetForStreak: targetForStreak, performanceAdjust: performanceAdjust, basePoints: basePoints, curve: curve,
    nextType: nextType, FAMILIES: FAMILIES, TYPES: TYPES
  };
})();
