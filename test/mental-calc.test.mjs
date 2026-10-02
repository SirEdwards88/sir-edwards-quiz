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
  const m = []; for (let st = 0; st <= 30; st++) m.push(mean(run(st, 400, st + 100).map((o) => o.difficulty)));
  assert.ok(m[0] < 22 && m[5] > 25 && m[10] > 38 && m[15] > 50 && m[20] > 60 && m[30] > 70, JSON.stringify(m.map(Math.round)));
  for (let st = 1; st <= 30; st++) assert.ok(m[st] > m[st - 1] - 4, `retroceso en racha ${st}`);           // sin bajadas (ruido aparte)
  for (let st = 1; st <= 30; st++) assert.ok(m[st] - m[st - 1] < 9, `salto brusco en racha ${st}: ${m[st] - m[st - 1]}`);
  assert.ok(m[30] - m[0] > 50);
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
  const s = M.createSession(mulberry32(1)); const op = M.nextOperation(s, { streak: 20 });
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

test('puntuación existente: puntos base 10/20/35, bonus de velocidad y de racha intactos; temporizador intacto', () => {
  assert.equal(M.basePoints(5), 10); assert.equal(M.basePoints(20), 10);
  assert.equal(M.basePoints(45), 20); assert.equal(M.basePoints(75), 35); assert.equal(M.basePoints(100), 35);
  let prev = 0; for (let d = 0; d <= 100; d++) { const p = M.basePoints(d); assert.ok(p >= prev && p >= 10 && p <= 35); prev = p; }
  assert.match(html, /const speedBonus = Math\.max\(0, Math\.round\(\(6000 - Math\.min\(elapsedMs, 6000\)\) \* 3 \/ 1000\)\);/);
  assert.match(html, /const streakBonus = Math\.min\(currentGame\.streak, 20\) \* 2;/);
  assert.match(html, /MENTALCALC_START_MS = 60000/); assert.match(html, /MENTALCALC_MAX_MS = 90000/);
  assert.match(html, /mentalCalcEndTime \+ 2000/); assert.match(html, /mentalCalcEndTime -= 3000/);
});

test('mental-calc.js está en index.html y en la caché sin conexión', () => {
  assert.match(html, /src\/utils\/mental-calc\.js\?v=\d+/);
  assert.ok(read('sw.js').includes("'./src/utils/mental-calc.js'"));
});
