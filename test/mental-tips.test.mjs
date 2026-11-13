// Cálculo de Fondo: trucos mentales (src/utils/mental-tips.js), pausa «Entendido» (src/ui/mental-classic-ui.js) y biblioteca de Ayuda.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(read('src/utils/mental-calc.js') + ';' + read('src/utils/mental-tips.js') + ';this.M=SEQMentalCalc;this.T=SEQMentalTips;', ctx);
const { M, T } = ctx;
const S = '−';
const ans = (a, s, b) => s === '+' ? a + b : s === '-' ? a - b : s === '×' ? a * b : a / b;
const op = (a, sign, b) => ({ a, b, sign, type: sign, answer: ans(a, sign, b) });
const get = (a, s, b) => T.get(op(a, s, b), { recent: [] });
const line = (a, s, b) => { const g = get(a, s, b); return g ? g.rule + ' ' + g.calc : ''; };
const calc = (a, s, b) => { const g = get(a, s, b); return g ? g.calc : ''; };
const id = (a, s, b) => { const g = get(a, s, b); return g ? g.id : ''; };
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Comprobador independiente: cada «A ○ B = C» del cálculo debe ser aritméticamente cierto (y las divisiones, exactas).
function verifyCalc(text, o) {
  const re = /(\d+) ([+×÷−]) (\d+) = (\d+)/g;
  let m, n = 0;
  while ((m = re.exec(text))) {
    const x = Number(m[1]), y = Number(m[3]), r = Number(m[4]);
    n++;
    if (m[2] === '÷') { assert.equal(x % y, 0, 'división intermedia inexacta: ' + m[0] + ' en ' + text); assert.equal(x / y, r, m[0] + ' en ' + text); }
    else assert.equal(m[2] === '+' ? x + y : m[2] === '×' ? x * y : x - y, r, m[0] + ' en ' + text + ' (' + (o && o.text) + ')');
  }
  assert.ok(n >= 1 || /→ \d+$/.test(text), 'sin ningún paso comprobable: ' + text);
  const nums = text.match(/\d+/g);
  if (o) assert.equal(Number(nums[nums.length - 1]), o.answer, text);
  assert.ok(!/NaN|undefined|Infinity|-\d/.test(text), text);
}

test('operaciones reales del generador (semillas deterministas): todos los pasos son ciertos y acaban en la respuesta', () => {
  let con = 0, total = 0; const ids = new Set(), fam = {};
  for (let g = 0; g < 200; g++) {
    const s = M.createSession(mulberry(g + 1));
    for (let i = 0; i < 60; i++) {
      const o = M.nextOperation(s, { streak: i }); total++;
      const k = T.get(o, { recent: [] });
      const f = o.sign + ':' + o.family; fam[f] = fam[f] || [0, 0]; fam[f][1]++;
      if (!k) continue;
      con++; fam[f][0]++; ids.add(k.id);
      verifyCalc(k.calc, o);
      assert.ok(k.rule.length >= 20 && k.rule.length <= 110, k.rule);
      assert.ok(k.calc.length <= 90, o.text + ' → ' + k.calc);
      assert.ok(!/\s{2,}|^\s|\s$/.test(k.rule + k.calc));
    }
  }
  assert.ok(con / total > 0.3 && con / total < 0.75, 'proporción con truco: ' + con / total);
  // Cada familia de trucos del generador que merece truco lo recibe alguna vez.
  for (const f of ['+:compensacion', '-:compensacion', '-:completar', '×:x2', '×:x4', '×:x5', '×:x11', '×:x25', '×:cerca10', '×:cerca20', '×:factorizacion', '÷:dividir4', '÷:dividir5', '÷:factores', '÷:divisibilidad', '÷:dividir10']) assert.ok(fam[f][0] > 0, 'familia sin trucos: ' + f);
  assert.ok(ids.size >= 22, 'variedad de trucos: ' + ids.size);
});

test('barrido exhaustivo de operandos: ningún truco con pasos falsos ni respuesta distinta', () => {
  let n = 0;
  const check = (a, s, b) => { const o = op(a, s, b); const k = T.get(o, { recent: [] }); if (k) { verifyCalc(k.calc, o); n++; } };
  for (let a = 1; a <= 330; a++) for (let b = 1; b <= 330; b += (a % 3 ? 7 : 1)) { check(a, '+', b); if (a > b) check(a, '-', b); }
  for (const a of [100, 200, 500, 1000, 1500, 4800, 9999]) for (let b = 1; b < a; b += 3) check(a, '-', b);
  for (let a = 2; a <= 140; a++) for (let b = 2; b <= 140; b++) check(a, '×', b);
  for (const a of [150, 480, 999, 1000, 2500, 12345]) for (const b of [2, 4, 5, 8, 9, 11, 19, 21, 25, 50, 99, 101]) check(a, '×', b);
  for (let b = 2; b <= 60; b++) for (let q = 2; q <= 70; q++) check(b * q, '÷', b);
  for (const b of [10, 100, 25, 40, 400, 600]) for (let q = 2; q <= 90; q++) check(b * q, '÷', b);
  assert.ok(n > 5000, 'casos con truco comprobados: ' + n);
});

test('líneas exactas de cada familia (regla + cálculo)', () => {
  assert.equal(calc(730, '+', 470), '730 + 470 → 73 + 47 = 120 → 1200');
  assert.equal(calc(183, '+', 197), '183 + 200 = 383 → 383 − 3 = 380');
  assert.equal(calc(47, '+', 58), '47 + 60 = 107 → 107 − 2 = 105');
  assert.equal(id(47, '+', 61), '');            // 47 + 61: redondear no quita ninguna llevada
  assert.equal(calc(910, '-', 570), '910 − 570 → 91 − 57 = 34 → 340');
  assert.equal(id(4800, '-', 2000), '');          // restar redondos ya es trivial: sin truco
  assert.equal(calc(352, '-', 98), '352 − 100 = 252 → 252 + 2 = 254');
  assert.equal(id(757, '-', 397), '');            // el cálculo directo no es peor que el truco
  assert.equal(id(408, '-', 110), '');
  assert.equal(calc(100, '-', 37), '37 + 3 = 40 → 100 − 40 = 60 → 3 + 60 = 63');
  assert.equal(calc(500, '-', 132), '132 + 8 = 140 → 500 − 140 = 360 → 8 + 360 = 368');
  assert.equal(id(45, '×', 20), '');              // ×20 de dos cifras: directo
  assert.equal(calc(789, '×', 2), '700 × 2 = 1400; 89 × 2 = 178 → 1400 + 178 = 1578');
  assert.equal(calc(37, '×', 4), '37 × 2 = 74 → 74 × 2 = 148');
  assert.equal(calc(245, '×', 8), '245 × 2 = 490 → 490 × 2 = 980 → 980 × 2 = 1960');
  assert.equal(calc(99, '×', 5), '99 × 10 = 990 → 990 ÷ 2 = 495');
  assert.equal(calc(36, '×', 50), '36 × 100 = 3600 → 3600 ÷ 2 = 1800');
  assert.equal(calc(48, '×', 25), '48 × 100 = 4800 → 4800 ÷ 4 = 1200');
  assert.equal(calc(47, '×', 9), '47 × 10 = 470 → 470 − 47 = 423');
  assert.equal(calc(32, '×', 19), '32 × 20 = 640 → 640 − 32 = 608');
  assert.equal(calc(24, '×', 21), '24 × 20 = 480 → 480 + 24 = 504');
  assert.equal(calc(32, '×', 99), '32 × 100 = 3200 → 3200 − 32 = 3168');
  assert.equal(calc(34, '×', 101), '34 × 100 = 3400 → 3400 + 34 = 3434');
  assert.equal(calc(53, '×', 98), '53 × 100 = 5300; 53 × 2 = 106 → 5300 − 106 = 5194');
  assert.equal(calc(818, '÷', 2), '800 ÷ 2 = 400; 18 ÷ 2 = 9 → 400 + 9 = 409');
  assert.equal(calc(728, '÷', 4), '728 ÷ 2 = 364 → 364 ÷ 2 = 182');
  assert.equal(calc(536, '÷', 8), '536 ÷ 2 = 268 → 268 ÷ 2 = 134 → 134 ÷ 2 = 67');
  assert.equal(calc(880, '÷', 5), '880 × 2 = 1760 → 1760 ÷ 10 = 176');
  assert.equal(calc(340, '÷', 10), '340 → 34');
  assert.equal(calc(1100, '÷', 25), '1100 × 4 = 4400 → 4400 ÷ 100 = 44');
  assert.equal(calc(1960, '÷', 40), '1960 ÷ 40 → 196 ÷ 4 = 49');
  assert.equal(calc(342, '÷', 6), '342 ÷ 2 = 171 → 171 ÷ 3 = 57');
  assert.equal(id(819, '÷', 9), '');              // ÷9 en dos pasos no ahorra nada
  // La tarjeta lleva regla genérica + cálculo con los números reales.
  assert.equal(line(48, '×', 25), 'Multiplicar por 25 es multiplicar por 100 y dividir entre 4. 48 × 100 = 4800 → 4800 ÷ 4 = 1200');
  assert.equal(line(352, '-', 98), 'Resta el número redondo más cercano y devuelve la diferencia. 352 − 100 = 252 → 252 + 2 = 254');
});

test('×11: método de las cifras con llevadas correctas (todos los de dos cifras) y ×10 + número para más cifras', () => {
  let con = 0;
  for (let x = 12; x <= 99; x++) {
    if (x % 10 === 0) continue;
    const k = get(x, '×', 11);
    assert.ok(k && k.id === 'mul-11', 'x=' + x);
    con++;
    const t = Math.floor(x / 10), u = x % 10, s = t + u;
    if (s <= 9) assert.equal(k.calc, `${t} + ${u} = ${s} en medio → ${x * 11}`);
    else {
      assert.equal(k.calc, `${t} + ${u} = ${s} → ${s % 10} en medio y ${t} + 1 = ${t + 1} delante → ${x * 11}`);
      assert.equal((t + 1) * 100 + (s % 10) * 10 + u, x * 11, 'la regla de la llevada es correcta para ' + x);
    }
    assert.equal(T.get(op(11, '×', x), { recent: [] }).id, 'mul-11');   // factores en el otro orden
  }
  assert.equal(con, 80);
  assert.equal(calc(34, '×', 11), '3 + 4 = 7 en medio → 374');
  assert.equal(calc(78, '×', 11), '7 + 8 = 15 → 5 en medio y 7 + 1 = 8 delante → 858');
  assert.equal(calc(99, '×', 11), '9 + 9 = 18 → 8 en medio y 9 + 1 = 10 delante → 1089');
  assert.equal(calc(101, '×', 11), '101 × 10 = 1010 → 1010 + 101 = 1111');
  assert.ok(!/en medio/.test(calc(30, '×', 11)));
});

test('cuadrados acabados en 5: 15² a 95², siempre n·(n+1) y 25', () => {
  for (let a = 15; a <= 95; a += 10) {
    const n = (a - 5) / 10, k = get(a, '×', a);
    assert.ok(k && k.id === 'mul-cuadrado5', 'a=' + a);
    assert.equal(k.calc, `${n} × ${n + 1} = ${n * (n + 1)} → ${n * (n + 1)} y 25 → ${a * a}`);
    assert.equal(Number('' + n * (n + 1) + '25'), a * a);
  }
  assert.equal(calc(35, '×', 35), '3 × 4 = 12 → 12 y 25 → 1225');
  assert.equal(id(5, '×', 5), '');          // 5 × 5: tabla
  assert.notEqual(id(25, '×', 35), 'mul-cuadrado5');   // solo cuadrados
  assert.notEqual(id(34, '×', 34), 'mul-cuadrado5');
});

test('×9, ×19, ×21 y ×99 priorizan la compensación; ×8 conserva duplicar (o ×10 − doble si compensa); ×5 y ×25 intactos', () => {
  assert.equal(id(47, '×', 9), 'mul-9');
  assert.equal(id(32, '×', 19), 'mul-redondeo');
  assert.equal(id(24, '×', 21), 'mul-redondeo');
  assert.equal(id(32, '×', 99), 'mul-99');
  assert.equal(id(245, '×', 8), 'mul-8-dup');
  assert.equal(id(76, '×', 8), '');               // dos cifras ×8: directo es igual de cómodo
  assert.equal(id(48, '×', 5), 'mul-5');
  assert.equal(id(48, '×', 25), 'mul-25');
  assert.equal(id(73, '×', 25), 'mul-25');
  // ×8 con llevadas pesadas: ×10 − doble es más cómodo que tres duplicaciones.
  let diez = 0, dup = 0;
  for (let x = 100; x <= 999; x++) { const i = id(x, '×', 8); if (i === 'mul-8-diez') diez++; else if (i === 'mul-8-dup') dup++; }
  assert.ok(dup > 0 && diez > 0, `dup ${dup}, diez ${diez}`);
});

test('divisiones por factores: cada paso exacto y orden más cómodo; sin truco cuando solo queda un ÷7 pesado o un ÷3 directo', () => {
  assert.equal(calc(336, '÷', 12), '336 ÷ 4 = 84 → 84 ÷ 3 = 28');   // no «336 ÷ 3 ÷ 4»: dos mitades y un ÷3 sobre 84 es más cómodo
  assert.equal(calc(435, '÷', 15), '435 ÷ 5 = 87 → 87 ÷ 3 = 29');
  assert.equal(calc(384, '÷', 16), '384 ÷ 4 = 96 → 96 ÷ 4 = 24');
  assert.equal(id(348, '÷', 3), '');
  assert.equal(id(96, '÷', 3), '');
  for (const b of [6, 9, 12, 14, 15, 16, 18, 24]) for (let q = 5; q <= 80; q++) {
    const a = b * q, o = op(a, '÷', b), k = T.get(o, { recent: [] });
    if (!k) continue;
    assert.equal(k.id, 'div-factores', a + ' ÷ ' + b);
    verifyCalc(k.calc, o);
    const [p1, p2] = [...k.calc.matchAll(/÷ (\d)/g)].map(m => Number(m[1]));
    assert.equal(p1 * p2, b);
  }
});

test('divisores y restas: filtros de utilidad (sin truco cuando el cálculo directo ya es trivial)', () => {
  assert.equal(id(12, '×', 2), '');
  assert.equal(id(300, '×', 2), '');
  assert.equal(id(8, '×', 6), '');
  assert.equal(id(50, '×', 30), '');
  assert.equal(id(20, '×', 30), '');
  assert.equal(id(80, '+', 60), '');
  assert.equal(id(64, '÷', 2), '');
  assert.equal(id(84, '÷', 4), '');
  assert.equal(id(9, '×', 9), '');
  assert.equal(id(100, '-', 7), '');
  assert.equal(id(33, '-', 32), '');
  assert.equal(id(70, '-', 55), '');
  assert.equal(id(100, '-', 40), '');            // 100 − 40: nada que explicar
  assert.equal(id(100, '×', 100), '');
  assert.equal(id(48, '×', 100), '');            // ×100: añadir ceros no es un truco
  assert.equal(id(116, '÷', 4 * 29), '');
  assert.equal(id(1000, '÷', 8 * 125), '');
});

test('selección independiente de la estrategia del analizador y sin mostrar un método peor', () => {
  // `strategy` del analizador no interviene: get() solo mira los números (aquí, una operación sin campo strategy ni family).
  assert.equal(id(352, '-', 98), 'res-compensar');
  assert.equal(T.get({ a: 352, b: 98, sign: '-', answer: 254, strategy: 'prestamo', family: 'prestamo' }, { recent: [] }).id, 'res-compensar');
  assert.equal(T.get({ a: 48, b: 25, sign: '×', answer: 1200, strategy: 'distributiva' }, { recent: [] }).id, 'mul-25');
  // Con cualquier operación: el elegido nunca cuesta más de TIE_COST por encima del mejor candidato, y todos ahorran al menos MIN_SAVING frente al cálculo directo.
  let n = 0;
  for (let g = 0; g < 60; g++) {
    const s = M.createSession(mulberry(g + 900));
    for (let i = 0; i < 60; i++) {
      const o = M.nextOperation(s, { streak: i }), list = T.candidates(o), k = T.get(o, { recent: ['mul-9', 'div-factores', 'mul-redondeo', 'sum-redondeo'] });
      if (!list.length) { assert.equal(k, null); continue; }
      n++;
      assert.ok(k.cost - list[0].cost <= T.TIE_COST + 1e-9, o.text + ' ' + k.id + ' vs ' + list[0].id);
      assert.ok(list.every(z => z.cost <= T.directCost(o) - T.MIN_SAVING + 1e-9), o.text);
    }
  }
  assert.ok(n > 1000);
});

test('variedad: entre dos trucos equivalentes gana el menos repetido; con diferencia real, siempre el mejor; determinista', () => {
  // Busca operaciones con dos candidatos a menos de TIE_COST (equivalentes).
  let ties = 0;
  for (let a = 12; a <= 99 && ties < 5; a++) {
    const o = op(a, '×', 12), list = T.candidates(o);
    if (list.length >= 2 && list[1].cost - list[0].cost <= T.TIE_COST && list[0].id !== list[1].id) {
      ties++;
      assert.equal(T.get(o, { recent: [] }).id, list[0].id);
      assert.equal(T.get(o, { recent: [list[0].id] }).id, list[1].id, 'prefiere el menos repetido');
      assert.equal(T.get(o, { recent: [list[1].id, list[0].id] }).id, list[1].id, 'y el menos reciente');
    }
  }
  assert.ok(ties > 0, 'debe haber operaciones con trucos equivalentes');
  // Con ventaja real, la variedad no manda: ×25 siempre es mul-25.
  assert.equal(T.get(op(48, '×', 25), { recent: ['mul-25', 'mul-25'] }).id, 'mul-25');
  assert.equal(T.get(op(99, '×', 5), { recent: ['mul-5'] }).id, 'mul-5');
  // Determinismo.
  for (const o of [op(336, '÷', 12), op(76, '×', 8), op(62, '×', 12)]) assert.deepEqual(T.get(o, { recent: ['x'] }), T.get(o, { recent: ['x'] }));
  // html() recuerda lo mostrado (memoria en el módulo) y reset() la limpia; tip() no la toca.
  T.reset();
  const o = op(62, '×', 12);
  const first = T.get(o).id; T.tip(o); assert.equal(T.get(o).id, first, 'tip() no modifica la memoria');
  T.html(o); T.html(o); T.reset(); assert.equal(T.get(o).id, first);
});

test('entradas raras: ceros, unos, nulos, números enormes y respuestas que no cuadran', () => {
  for (const [a, s, b] of [[0, '+', 0], [5, '+', 0], [7, '×', 1], [1, '×', 1], [10, '÷', 10], [9, '÷', 1], [5728, '+', 4584], [98765, '×', 99], [45000, '-', 3000], [10000, '÷', 25], [123456, '÷', 4], [1000, '-', 1], [2, '÷', 2], [999999, '+', 1]]) {
    const o = op(a, s, b), k = T.get(o, { recent: [] });
    if (k) verifyCalc(k.calc, o);
  }
  assert.equal(T.get(null), null);
  assert.equal(T.tip(null), '');
  assert.equal(T.tip({ a: 1, b: 2, sign: '+', answer: 4 }), '');
  assert.equal(T.tip({ a: 48, b: 25, sign: '×', answer: 1201 }), '');   // respuesta que no cuadra: no inventa
  assert.equal(T.tip({ a: 5.5, b: 2, sign: '×', answer: 11 }), '');
  assert.equal(T.html({ a: 8, b: 6, sign: '×', answer: 48 }), '');
  assert.equal(T.get({ a: 5, b: 9, sign: '-', answer: -4 }), null);    // resta negativa
  assert.equal(T.get({ a: 7, b: 2, sign: '÷', answer: 3.5 }), null);   // división inexacta
});

test('la tarjeta: rótulo «TRUCO MENTAL», regla y cálculo, escapados', () => {
  const h = T.html(op(48, '×', 25));
  assert.match(h, /^<div class="mental-tip"><span class="mt-label">TRUCO MENTAL<\/span><span class="mt-rule">Multiplicar por 25 es multiplicar por 100 y dividir entre 4\.<\/span><span class="mt-calc">48 × 100 = 4800 → 4800 ÷ 4 = 1200<\/span><\/div>$/);
  assert.ok(!/<(?!\/?(div|span)\b)/.test(h));
  T.reset();
});

test('biblioteca de Ayuda: grupos, ejemplos correctos, mismos trucos que el juego y sin duplicar fórmulas', () => {
  const lib = T.library();
  assert.deepEqual([...lib.map(g => g.group)], ['Sumas', 'Restas', 'Multiplicaciones', 'Divisiones']);
  const names = [];
  for (const g of lib) {
    assert.ok(g.items.length >= 2);
    for (const it of g.items) {
      names.push(it.name);
      assert.ok(it.name.length >= 8 && it.name.length <= 50 && it.rule.length >= 20 && it.rule.length <= 110, it.name);
      assert.ok(it.examples.length >= 1, 'sin ejemplo: ' + it.name);
      assert.equal(T.TRICKS[it.id].rule, it.rule, 'la regla de la biblioteca es la del juego');
      for (const e of it.examples) {
        const m = e.text.match(/^(\d+) ([+−×÷]) (\d+)$/); assert.ok(m, e.text);
        const a = Number(m[1]), b = Number(m[3]), r = m[2] === '+' ? a + b : m[2] === '−' ? a - b : m[2] === '×' ? a * b : a / b;
        assert.equal(e.answer, r);
        verifyCalc(e.calc, { text: e.text, answer: r });
        assert.ok(e.line.startsWith(e.text) && e.line.endsWith(String(r)), e.line);
        // el ejemplo es exactamente lo que el juego mostraría con ese truco
        assert.ok(T.candidates(op(a, m[2] === '−' ? '-' : m[2], b)).some(k => k.id === it.id && k.calc === e.calc), e.text);
      }
    }
  }
  assert.equal(new Set(names).size, names.length, 'los nombres de la biblioteca son únicos');
  assert.equal(names.length, 28, 'número real de trucos');
  assert.equal(lib.reduce((n, g) => n + g.items.reduce((m, it) => m + it.examples.length, 0), 0), 32, 'ejemplos');
  const all = JSON.stringify(lib);
  for (const t of ['Multiplicar por 25', 'Multiplicar por 11', 'Multiplicar por 9', 'Multiplicar por 99', 'Cuadrado de un número de dos cifras acabado en 5', 'Dividir por factores', 'Restar de más y devolver']) assert.ok(all.includes(t), t);
  assert.ok(all.includes('36 × 25') && all.includes('3600 ÷ 4 = 900'));
  assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(all), 'sin emojis');
});

test('utilidad: todo truco mostrado ahorra frente al cálculo directo; lo trivial no lleva truco; ahorro medio positivo', () => {
  let n = 0, tips = 0, saved = 0;
  for (let g = 0; g < 40; g++) {
    const s = M.createSession(mulberry(g + 4000));
    for (let i = 0; i < 80; i++) {
      const o = M.nextOperation(s, { streak: i }), k = T.get(o, { recent: [] });
      n++;
      if (!k) continue;
      tips++; saved += k.direct - k.cost;
      assert.ok(k.cost <= k.direct - T.MIN_SAVING + 1e-9, o.text + ' ' + k.id);
      assert.ok((k.calc.match(/[=→;]/g) || []).length <= 5, 'cálculo largo: ' + k.calc);
    }
  }
  assert.ok(tips > n * 0.25 && tips < n * 0.8, `frecuencia de truco ${tips}/${n}`);
  assert.ok(saved / tips >= 0.8, 'ahorro medio ' + saved / tips);
  for (const [a, sg, b] of [[12, '×', 2], [8, '×', 6], [300, '×', 2], [50, '×', 30], [80, '+', 60], [64, '÷', 2], [100, '-', 40], [48, '×', 100]]) assert.equal(id(a, sg, b), '', a + sg + b);
});

test('factorización de ×: es candidata por sí sola, sin depender del redondeo', () => {
  for (const [x, y] of [[35, 16], [63, 18], [47, 45], [52, 12], [27, 14]]) {
    const o = op(x, '×', y), c = T.candidates(o).find(k => k.id === 'mul-factores');
    if (!c) continue;
    verifyCalc(c.calc, o);
    assert.ok(/^\d+ × \d = \d+ → \d+ × \d = \d+$/.test(c.calc), c.calc);
  }
  assert.equal(id(35, '×', 16), 'mul-factores');
  assert.equal(id(63, '×', 18), 'mul-factores');
  assert.equal(calc(35, '×', 16), '35 × 2 = 70 → 70 × 8 = 560');
});

test('cuadrados acabados en 5: la regla explica las decenas por la siguiente y el 25 final', () => {
  const t = T.TRICKS['mul-cuadrado5'];
  assert.match(t.rule, /decenas/); assert.match(t.rule, /siguiente/); assert.match(t.rule, /25/);
  assert.equal(calc(35, '×', 35), '3 × 4 = 12 → 12 y 25 → 1225');
});
