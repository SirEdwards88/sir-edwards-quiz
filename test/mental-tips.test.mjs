// Cálculo de Fondo: trucos tras un fallo (src/utils/mental-tips.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(read('src/utils/mental-calc.js') + ';' + read('src/utils/mental-tips.js') + ';this.M=SEQMentalCalc;this.T=SEQMentalTips;', ctx);
const { M, T } = ctx;
const op = (a, sign, b) => ({ a, b, sign, type: sign, answer: sign === '+' ? a + b : sign === '-' ? a - b : sign === '×' ? a * b : a / b });
const tip = (a, s, b) => T.tip(op(a, s, b));

test('miles de operaciones generadas: el texto lleva el resultado, un solo «:» y cabe en 90 caracteres', () => {
  let con = 0, total = 0;
  for (let g = 0; g < 150; g++) {
    const s = M.createSession();
    for (let i = 0; i < 60; i++) {
      const o = M.nextOperation(s, { streak: i }); total++;
      const t = T.tip(o);
      if (!t) continue;
      con++;
      assert.ok(t.length <= 90, t);
      assert.ok((t.match(/:/g) || []).length <= 1, t);
      assert.ok(t.includes(String(o.answer)), o.text + ' → ' + t);
      assert.equal(Number(t.match(/\d+/g).pop()), o.answer, o.text + ' → ' + t);
      assert.ok(!/NaN|undefined|Infinity/.test(t), t);
    }
  }
  assert.ok(con / total > 0.25 && con / total < 0.75, 'proporción con truco: ' + con / total);
});

test('líneas exactas de cada familia', () => {
  assert.equal(tip(730, '+', 470), 'Sin el cero final, 73 + 47 = 120; devuélvelo, 1200.');
  assert.equal(tip(48000, '-', 2000), 'Sin los ceros finales, 48 − 2 = 46; devuélvelos, 46000.');
  assert.equal(tip(183, '+', 197), 'Redondea 197 a 200: 183 + 200 = 383, menos 3 son 380.');
  assert.equal(tip(757, '-', 397), 'Resta 400 en lugar de 397: 757 − 400 = 357; suma 3, 360.');
  assert.equal(tip(802, '-', 469), 'Resta 470 en lugar de 469: 802 − 470 = 332; suma 1, 333.');
  assert.equal(tip(408, '-', 110), 'Redondea 408 a 410: 410 − 110 = 300; resta 2, 298.');
  assert.equal(tip(70, '-', 55), '');           // «Cuenta desde… hasta…» no es un truco
  assert.equal(tip(500, '-', 132), 'Con 499 en vez de 500: 499 − 132 = 367; suma 1, 368.');
  assert.equal(tip(789, '×', 2), 'Por 2: duplica por partes, 1400 + 178 = 1578.');
  assert.equal(tip(459, '×', 4), 'Duplica dos veces: 459 → 918 → 1836.');
  assert.equal(tip(245, '×', 8), 'Duplica tres veces: 245 → 490 → 980 → 1960.');
  assert.equal(tip(99, '×', 5), 'Por 5: por 10 y a la mitad, 990 → 495.');
  assert.equal(tip(73, '×', 25), 'Por 25: por 100 y entre 4, 7300 ÷ 4 = 1825.');
  assert.equal(tip(96, '×', 11), 'Por 11: por 10 y suma el número, 960 + 96 = 1056.');
  assert.equal(tip(591, '×', 9), 'Por 9: por 10 y resta el número, 5910 − 591 = 5319.');
  assert.equal(tip(43, '×', 99), 'Por 99: por 100 y resta el número, 4300 − 43 = 4257.');
  assert.equal(tip(88, '×', 19), 'Redondea 19 a 20: 88 × 20 = 1760, menos 88, 1672.');
  assert.equal(tip(53, '×', 98), 'Redondea 98 a 100: 53 × 100 = 5300, menos 2 × 53 = 106, 5194.');
  assert.equal(tip(6, '×', 980), 'Sin el cero, 6 × 98 = 588; devuélvelo, 5880.');
  assert.equal(tip(818, '÷', 2), 'Mitad por partes: 800 → 400 y 18 → 9, suman 409.');
  assert.equal(tip(728, '÷', 4), 'Mitad de la mitad: 728 → 364 → 182.');
  assert.equal(tip(880, '÷', 5), 'Por 2 y entre 10: 880 × 2 = 1760 → 176.');
  assert.equal(tip(340, '÷', 10), 'Quita un cero: 340 → 34.');
  assert.equal(tip(1100, '÷', 25), 'Por 4 y entre 100: 1100 × 4 = 4400 → 44.');
  assert.equal(tip(464, '÷', 16), 'Entre 16 es entre 2 y entre 8: 464 → 232 → 29.');
  assert.equal(tip(342, '÷', 6), 'Entre 6 es entre 2 y entre 3: 342 → 171 → 57.');
  assert.equal(tip(819, '÷', 9), 'Entre 9 es entre 3 y entre 3: 819 → 273 → 91.');
  assert.equal(tip(348, '÷', 3), '');
  assert.equal(tip(348, '÷', 6), 'Entre 6 es entre 2 y entre 3: 348 → 174 → 58.');
  assert.equal(tip(1960, '÷', 40), 'Sin un cero en cada número, 1960 ÷ 40 → 196 ÷ 4 = 49.');
  assert.equal(tip(946, '÷', 22), 'Al revés: 40 × 22 = 880; quedan 66 = 3 × 22, total 43.');
  assert.equal(tip(312, '÷', 8), 'Al revés: 30 × 8 = 240; quedan 72 = 9 × 8, total 39.');
});

test('filtros: sin truco cuando la cuenta ya es trivial o el atajo no lo es', () => {
  assert.equal(tip(12, '×', 2), '');            // ×2 con factor pequeño
  assert.equal(tip(300, '×', 2), '');           // sin parte suelta: no hay nada que explicar
  assert.equal(tip(8, '×', 6), '');             // tabla
  assert.equal(tip(50, '×', 30), '');           // 5 × 3 = 15 con ceros: demasiado simple
  assert.equal(tip(20, '×', 30), '');
  assert.equal(tip(80, '+', 60), '');           // los dos reducidos son de una cifra
  assert.equal(tip(64, '÷', 2), '');            // dividir un número pequeño
  assert.equal(tip(84, '÷', 4), '');
  assert.equal(tip(84, '×', 101), '');          // ×101 descartado
  assert.equal(tip(9, '×', 9), '');             // x < 12
  assert.equal(tip(100, '-', 7), '');           // sustraendo de una cifra
  assert.equal(tip(33, '-', 32), '');           // diferencia 1
  assert.equal(tip(24, '-', 11), '');           // b < 20
  assert.equal(tip(116, '÷', 4 * 29), '');      // división exacta de resultado 1 sin truco
  assert.equal(tip(96, '÷', 3), '');            // ÷3 sin truco
});

test('casos límite: ceros, unos y números largos', () => {
  for (const [a, s, b] of [[0, '+', 0], [5, '+', 0], [7, '×', 1], [1, '×', 1], [10, '÷', 10], [9, '÷', 1], [5728, '+', 4584], [98765, '×', 99], [45000, '-', 3000], [10000, '÷', 25], [123456, '÷', 4], [1000, '-', 1]]) {
    const o = op(a, s, b);
    const t = T.tip(o);
    assert.equal(typeof t, 'string');
    if (t) { assert.ok(t.length <= 90, t); assert.equal(Number(t.match(/\d+/g).pop()), o.answer, t); }
  }
  assert.equal(T.tip(null), '');
  assert.equal(T.tip({ a: 1, b: 2, sign: '+', answer: 4 }), '');   // respuesta que no cuadra: no inventa
  assert.equal(T.html({ a: 8, b: 6, sign: '×', answer: 48 }), '');
  assert.match(T.html(op(459, '×', 4)), /<span class="mt-label">TRUCO<\/span><span class="mt-text">Duplica dos veces/);
});

test('el módulo está enlazado y solo Fondo lo usa', () => {
  const html = read('index.html');
  assert.match(html, /src\/utils\/mental-tips\.js\?v=\d+/);
  assert.ok(read('sw.js').includes("'./src/utils/mental-tips.js'"));
  assert.match(html, /if \(classic && !currentGame\.isDuel && typeof SEQMentalTips !== 'undefined'\)/);
  assert.equal(M.FAMILIES === undefined, false);
  assert.ok(!/SEQMentalTips/.test(read('src/online/duels.js')) && !/SEQMentalTips/.test(read('src/online/online.js')));
  assert.match(html, /Cada 8 aciertos, una vida extra \(máximo 4\)\. Tras cada fallo, un truco\./);
});

test('pausa tras fallo de 4,5 s', () => {
  const C = vm.runInNewContext(read('src/utils/mental-classic.js') + '\nSEQMentalClassic', {});
  assert.equal(C.FAIL_PAUSE_MS, 4500);
});
