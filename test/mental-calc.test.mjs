// Cálculo Mental: dificultad real, generación por objetivo, progresión por racha (src/utils/mental-calc.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const M = vm.runInNewContext(read('src/utils/mental-calc.js') + '\nSEQMentalCalc', {});
const D = (sign, a, b) => M.calculateOperationDifficulty({ sign, a, b });
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function run(streak, n, seed) { const s = M.createSession(mulberry32(seed)); const out = []; for (let i = 0; i < n; i++) out.push(M.nextOperation(s, { streak })); return out; }
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

test('divisiones siempre exactas (cociente entero ≥ 2) y restas nunca negativas', () => {
  for (const st of [0, 5, 12, 20, 40]) for (const o of run(st, 1500, st + 1)) {
    if (o.sign === '÷') { assert.equal(o.a % o.b, 0); assert.ok(o.b >= 2 && o.answer >= 2); assert.equal(o.answer, o.a / o.b); }
    if (o.sign === '-') { assert.ok(o.answer > 0); assert.equal(o.answer, o.a - o.b); }
    if (o.sign === '+') assert.equal(o.answer, o.a + o.b);
    if (o.sign === '×') assert.equal(o.answer, o.a * o.b);
    assert.ok(Number.isInteger(o.answer));
    assert.equal(o.text, `${o.a} ${o.sign} ${o.b}`);
  }
});

test('la dificultad real de las operaciones generadas ≈ la solicitada', () => {
  for (const T of [15, 25, 35, 50, 65]) {
    const r = mulberry32(T); const errs = [];
    for (let i = 0; i < 1200; i++) errs.push(Math.abs(M.generateOperation(T, M.TYPES[i % 4], r).difficulty - T));
    assert.ok(mean(errs) <= 5, `T=${T} error medio ${mean(errs)}`);
    assert.ok(errs.filter((e) => e > 10).length / errs.length < 0.05, `T=${T} demasiadas fuera de ±10`);
  }
  for (const T of [80, 90]) { // el extremo alto está limitado por lo que existe: más margen
    const r = mulberry32(T); const errs = [];
    for (let i = 0; i < 1200; i++) errs.push(Math.abs(M.generateOperation(T, M.TYPES[i % 4], r).difficulty - T));
    assert.ok(mean(errs) <= 8, `T=${T} error medio ${mean(errs)}`);
  }
});

test('la dificultad guardada coincide con calculateOperationDifficulty', () => {
  for (const o of run(10, 400, 3)) assert.equal(o.difficulty, D(o.sign, o.a, o.b));
});

test('la estructura manda, no el tamaño: 25×12 < 23×17 y 25×12 < 17×19', () => {
  assert.ok(D('×', 25, 12) < D('×', 23, 17));
  assert.ok(D('×', 25, 12) < D('×', 17, 19));
  assert.ok(D('+', 1200, 800) < D('+', 387, 268));
  assert.ok(D('÷', 144, 12) < D('÷', 221, 13));
  assert.ok(D('÷', 48, 6) < D('÷', 391, 17));
  assert.ok(D('×', 45, 20) < D('×', 17, 18));
});

test('más llevadas → más dificultad; préstamos → más dificultad', () => {
  assert.ok(D('+', 521, 362) < D('+', 589, 367) );
  assert.ok(D('+', 1121, 3432) < D('+', 1786, 947));
  assert.ok(D('+', 123, 456) < D('+', 187, 459));
  assert.ok(D('-', 875, 423) < D('-', 875, 496));
  assert.ok(D('-', 786, 325) < D('-', 786, 358));
  assert.ok(D('-', 80, 20) < D('-', 83, 27));
});

test('prácticamente sin repeticiones: nada idéntico seguido ni dentro de una ventana, pocas repeticiones globales', () => {
  for (const st of [0, 10, 25]) {
    const ops = run(st, 2000, st + 9);
    for (let i = 1; i < ops.length; i++) assert.notEqual(ops[i].text, ops[i - 1].text);
    for (let i = 0; i < ops.length; i++) for (let j = Math.max(0, i - 20); j < i; j++) assert.notEqual(ops[i].text, ops[j].text);
    const types = {}; ops.forEach((o) => { types[o.sign] = (types[o.sign] || 0) + 1; });
    M.TYPES.forEach((t) => assert.ok(types[t] > 400 && types[t] < 600, `reparto de ${t}: ${types[t]}`));
    for (let i = 2; i < ops.length; i++) assert.ok(!(ops[i].sign === ops[i - 1].sign && ops[i].sign === ops[i - 2].sign), 'tres iguales seguidas');
  }
});

test('la dificultad crece gradualmente con la racha, sin saltos en los umbrales', () => {
  // partidas cortas y muchas (con una sola sesión de 400 operaciones entraría el suelo por progreso, que es lo que se pide en otra prueba)
  const short = (st, seed) => { const out = []; for (let k = 0; k < 60; k++) { const s = M.createSession(mulberry32(seed + k)); for (let i = 0; i < 10; i++) { const o = M.nextOperation(s, { streak: st }); if (i >= 3) out.push(o.difficulty); } } return out; };
  const m = []; for (let st = 0; st <= 30; st++) m.push(mean(short(st, st * 1000 + 100)));
  assert.ok(m[0] < 22 && m[5] > 18 && m[10] > 27 && m[15] > 33 && m[20] > 41 && m[30] > 54, JSON.stringify(m.map(Math.round)));
  for (let st = 1; st <= 30; st++) assert.ok(m[st] > m[st - 1] - 4, `retroceso en racha ${st}`);           // sin bajadas (ruido aparte)
  for (let st = 1; st <= 30; st++) assert.ok(m[st] - m[st - 1] < 9, `salto brusco en racha ${st}: ${m[st] - m[st - 1]}`);
  assert.ok(m[30] - m[0] > 40);
});

test('en niveles altos casi no salen operaciones triviales', () => {
  for (const st of [20, 30]) {
    const ops = run(st, 2000, st);
    assert.ok(ops.filter((o) => o.difficulty < 25).length / ops.length < 0.05);
  }
  // nunca 100 + 200 / 500 - 100 / 25 × 4 / 100 ÷ 10 con racha alta
  const trivial = new Set(['100 + 200', '500 - 100', '25 × 4', '100 ÷ 10']);
  assert.equal(run(25, 3000, 5).filter((o) => trivial.has(o.text)).length, 0);
});

test('familias de estrategia: aparecen todas las de cada operación', () => {
  const fam = {}; for (const st of [0, 8, 16, 25]) run(st, 3000, st + 1).forEach((o) => { (fam[o.sign] = fam[o.sign] || new Set()).add(o.family); });
  for (const f of ['redondos', 'compensacion', 'descomposicion']) assert.ok(fam['+'].has(f), '+' + f);
  for (const f of ['compensacion', 'completar', 'bloques', 'prestamo']) assert.ok(fam['-'].has(f), '-' + f);
  for (const f of ['x2', 'x5', 'x10', 'x11', 'x25', 'distributiva', 'cerca10', 'cerca20']) assert.ok(fam['×'].has(f), '×' + f);
  for (const f of ['dividir2', 'dividir4', 'dividir5', 'dividir10', 'factores', 'inversa', 'divisibilidad']) assert.ok(fam['÷'].has(f), '÷' + f);
});

test('adaptación: suave y según la regla pedida', () => {
  const mk = (ok, ms, d = 40, n = 6) => Array.from({ length: n }, (_, i) => ({ ok: typeof ok === 'function' ? ok(i) : ok, ms, d }));
  const fast = M.performanceAdjust(mk(true, 1500)), slow = M.performanceAdjust(mk(true, 12000));
  assert.ok(fast > 0 && fast > slow && slow >= 0 && slow <= 2);
  assert.equal(M.performanceAdjust(mk((i) => i !== 2, 1500)), 0);                // rápido pero con un fallo: no sube
  assert.ok(M.performanceAdjust(mk((i) => i < 2, 4000)) < 0);                    // varios fallos: baja
  assert.equal(M.performanceAdjust(mk(true, 1500).slice(0, 2)), 0);              // pocos datos
  const one = mk(true, 3000); one[5].ok = false;                                 // un único fallo: no castiga
  assert.ok(M.performanceAdjust(one) >= 0);
  assert.ok(Math.abs(M.performanceAdjust(mk(false, 3000))) <= 8);
});

test('un fallo suaviza la caída de dificultad pero la racha vuelve a 0 como siempre', () => {
  const s = M.createSession(mulberry32(1)); for (let i = 0; i < 3; i++) M.nextOperation(s, { streak: 30 }); // pasado el calentamiento
  const op = M.nextOperation(s, { streak: 30 });
  M.recordResult(s, op, false, 5000);
  const t = []; for (let i = 0; i < 300; i++) t.push(M.targetForStreak(0, s));
  assert.ok(mean(t) > M.curve(0) + 5, 'tras fallar no se cae al suelo de golpe');
  // en index.html el fallo sigue reiniciando la racha
  const i = html.indexOf('function checkMentalCalcAnswer');
  const body = html.slice(i, html.indexOf('\nfunction ', i + 10));
  assert.match(body, /\} else \{[\s\S]*currentGame\.streak = 0;/);
});

test('buildSequence: determinista por semilla, 150 operaciones, sin adaptación y creciente', () => {
  const a = M.buildSequence(150, mulberry32(42)), b = M.buildSequence(150, mulberry32(42)), c = M.buildSequence(150, mulberry32(43));
  assert.equal(a.length, 150);
  assert.deepEqual(a.map((o) => o.text), b.map((o) => o.text));
  assert.notDeepEqual(a.map((o) => o.text), c.map((o) => o.text));
  assert.ok(mean(a.slice(0, 10).map((o) => o.difficulty)) < mean(a.slice(40, 50).map((o) => o.difficulty)));
});

test('buildSequence con tope: la dificultad se estabiliza y no lo supera de forma notable', () => {
  const seq = M.buildSequence(150, mulberry32(5), 64);
  assert.ok(seq.every((o) => o.difficulty <= 74), 'ninguna muy por encima del tope');
  const late = seq.slice(50).map((o) => o.difficulty);
  assert.ok(mean(late) > 52 && mean(late) < 66, 'media final ' + mean(late));
  assert.ok(mean(seq.slice(0, 8).map((o) => o.difficulty)) < mean(seq.slice(25, 35).map((o) => o.difficulty)));
});

test('calentamiento: las 3 primeras operaciones de una partida son suaves; ÷5 con 3 cifras ya no es «fácil»', () => {
  for (let k = 0; k < 300; k++) {
    const s = M.createSession(mulberry32(k + 1));
    for (let i = 0; i < 3; i++) assert.ok(M.nextOperation(s, { streak: 0 }).difficulty <= 22, 'calentamiento');
  }
  assert.ok(D('÷', 265, 5) >= 22 && D('÷', 265, 5) > D('÷', 48, 6) + 10);
  assert.ok(D('÷', 130, 2) > D('÷', 26, 2));
});

test('puntuación existente: puntos base 10/20/35, bonus de velocidad y de racha intactos; temporizador intacto', () => {
  assert.equal(M.basePoints(5), 10); assert.equal(M.basePoints(20), 10);
  assert.equal(M.basePoints(45), 20); assert.equal(M.basePoints(75), 35); assert.equal(M.basePoints(100), 35);
  let prev = 0; for (let d = 0; d <= 100; d++) { const p = M.basePoints(d); assert.ok(p >= prev && p >= 10 && p <= 35); prev = p; }
  assert.match(html, /const speedBonus = Math\.max\(0, Math\.round\(\(6000 - Math\.min\(elapsedMs, 6000\)\) \* 3 \/ 1000\)\);/);
  assert.match(html, /const streakBonus = Math\.min\(currentGame\.streak, 20\) \* 2;/);
  assert.match(html, /MENTALCALC_START_MS = 60000/); assert.match(html, /MENTALCALC_MAX_MS = 90000/);
  assert.match(html, /MENTALCALC_BONUS_MS = 4000/); assert.match(html, /mentalCalcEndTime \+ MENTALCALC_BONUS_MS/); assert.ok(!/mentalCalcEndTime \+ 2000/.test(html), 'ya no es +2 s'); assert.ok(!/MENTALCALC_BONUS_MS = 3000/.test(html), 'ya no es +3 s'); assert.match(html, /mentalCalcEndTime -= 3000/);
});

test('mental-calc.js está en index.html y en la caché sin conexión', () => {
  assert.match(html, /src\/utils\/mental-calc\.js\?v=\d+/);
  assert.ok(read('sw.js').includes("'./src/utils/mental-calc.js'"));
});

test('suelo por progreso: fallar a propósito no devuelve a las operaciones fáciles', () => {
  const s = M.createSession(mulberry32(7)); s.noAdapt = true;
  for (let i = 0; i < 30; i++) M.nextOperation(s, { streak: 30 });   // 30 operaciones jugadas con racha
  const t = []; for (let i = 0; i < 400; i++) t.push(M.targetForStreak(0, s));   // racha a 0 tras fallar
  assert.ok(mean(t) > 0.4 * M.curve(30) - 6, 'el suelo sigue el 40 % de la curva de la partida');
  assert.ok(mean(t) > M.curve(0) + 6, 'ya no vuelve a las fáciles');
  // sin sesión de partida larga (inicio) no cambia nada
  const fresh = M.createSession(mulberry32(7)); const u = []; for (let i = 0; i < 300; i++) u.push(M.targetForStreak(0, fresh));
  assert.ok(Math.abs(mean(u) - M.curve(0)) < 3);
  // los Retos (posición = racha) no cambian: el suelo queda siempre por debajo de la curva
  for (let n = 1; n <= 60; n++) assert.ok(0.4 * M.curve(n) <= M.curve(n));
});

test('reparto más justo: tras una operación difícil no sale un pico; sin ella sí puede', () => {
  const hard = M.createSession(mulberry32(3)); hard.lastD = 70;
  const free = M.createSession(mulberry32(3)); free.lastD = 20;
  let maxHard = -1, maxFree = -1;
  for (let i = 0; i < 600; i++) { maxHard = Math.max(maxHard, M.targetForStreak(20, hard)); maxFree = Math.max(maxFree, M.targetForStreak(20, free)); }
  assert.ok(maxHard <= Math.round(M.curve(20)), 'tras una difícil, como mucho la base: ' + maxHard);
  assert.ok(maxFree > Math.round(M.curve(20)) + 4, 'sin una difícil previa los picos siguen existiendo: ' + maxFree);
  // en una partida entera nunca hay dos picos seguidos por encima de la base
  const s = M.createSession(mulberry32(11)); s.noAdapt = true; let prevPeak = false, bad = 0;
  for (let i = 0; i < 300; i++) { const st = 20, base = M.curve(st); const op = M.nextOperation(s, { streak: st }); const peak = op.target > Math.round(base) && op.difficulty >= 55; if (prevPeak && op.target > Math.round(Math.max(base, 0.4 * M.curve(s.n - 1)))) bad++; prevPeak = op.difficulty >= 55; }
  assert.equal(bad, 0);
});

test('divisiones con divisor de 2 cifras: pesan más que por «comprobar multiplicando» (2520 ÷ 63 ya no es una operación de racha 5)', () => {
  const d = (a, b) => M.calculateOperationDifficulty({ sign: '÷', a, b });
  assert.ok(d(2520, 63) >= 45, '2520 ÷ 63: ' + d(2520, 63));
  assert.ok(d(1350, 45) >= 45 && d(3120, 26) >= 60);
  assert.ok(d(770, 5) <= 30 && d(2850, 50) <= 30 && d(840, 12) <= 30 && d(7600, 100) <= 15, 'las fáciles siguen fáciles');
  assert.ok(d(1700, 17) <= 25, 'cociente 100: sigue siendo fácil');
  // a rachas bajas casi no salen divisiones con divisor de 2 cifras
  let n = 0, hi = 0;
  for (let g = 0; g < 300; g++) { const s = M.createSession(mulberry32(g)); for (let i = 0; i < 8; i++) { const o = M.nextOperation(s, { streak: Math.min(i, 5) }); if (i >= 3 && o.type === '÷') { n++; if (o.b > 12 && o.b % 10 !== 0 && o.difficulty >= 45) hi++; } } }
  assert.ok(n > 100);
  assert.ok(hi / n < 0.03, 'a racha ≤ 5 casi no salen divisiones de divisor de 2 cifras tan duras: ' + hi + '/' + n);
});

test('el aviso flotante de Cálculo Mental muestra el bonus real (no un +3 fijo)', () => {
  const i = html.indexOf('function playMentalCalcChangeFX');
  const body = html.slice(i, html.indexOf('\n}', i));
  assert.match(body, /MENTALCALC_BONUS_MS/);
  assert.ok(!/\+3 SEGUNDOS/.test(body));
});
