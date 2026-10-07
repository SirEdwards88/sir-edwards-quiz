// 2.2: selección única de Lucidez (curva 10+5+9, variedad, pares, memoria) y datos lz/par/alias.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(read('src/utils/matching.js') + read('src/utils/answer-alias.js') + read('src/data/questions.js') +
  read('src/utils/lucidez-select.js') + ';this.S=SEQLucidezSelect;this.Q=QUESTIONS;this.M=isMatchWithAlias;', ctx);
const { S, Q, M } = ctx;
const BANK = Array.from(Q);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const RANK = { facil: 0, medio: 1, dificil: 2 };
const count = (arr, f) => arr.filter(f).length;

test('datos: 244 con lz (156 A, 88 B): 169 medias, 50 difíciles, 25 fáciles', () => {
  const lz = BANK.filter((q) => q.lz);
  assert.equal(lz.length, 244);
  assert.equal(count(lz, (q) => q.lz === 'A'), 156);
  assert.equal(count(lz, (q) => q.lz === 'B'), 88);
  assert.equal(count(lz, (q) => q.dif === 'medio'), 169);
  assert.equal(count(lz, (q) => q.dif === 'dificil'), 50);
  assert.equal(count(lz, (q) => q.dif === 'facil'), 25);
  assert.ok(BANK.every((q) => !q.lz || q.lz === 'A' || q.lz === 'B'));
  assert.ok(lz.every((q) => !(Array.isArray(q.options) && q.options.length)), 'Lucidez es de respuesta escrita: nada con opciones');
  assert.equal(new Set(BANK.map((q) => q.n)).size, BANK.length, 'ids únicos');
});

test('datos: los pares son simétricos y ambos extremos están en la criba', () => {
  const by = new Map(BANK.map((q) => [q.n, q]));
  for (const q of BANK.filter((x) => x.par)) {
    assert.ok(q.lz, '#' + q.n + ' lleva par pero no lz');
    for (const p of q.par) { assert.ok(by.get(p) && by.get(p).lz, 'par #' + p); assert.ok(Array.from(by.get(p).par).includes(q.n), 'simetría ' + q.n + '-' + p); }
  }
  const ids = BANK.filter((q) => q.par).map((q) => q.n).sort((a, b) => a - b);
  assert.deepEqual(ids, [32, 48, 87, 196, 205, 295, 297, 383]);
});

test('alias: las respuestas naturales que fallaban ahora se aceptan', () => {
  const por = (n) => BANK.find((q) => q.n === n);
  const casos = { 389: 'rocas ígneas', 421: 'memoria RAM', 226: 'The Matrix', 227: 'Citizen Kane', 289: 'Naciones Unidas',
    292: 'Producto Interno Bruto', 274: 'Sputnik', 271: 'Apolo XI', 160: 'C-14', 245: 'once', 379: 'Ulaanbaatar', 351: 'ARNt',
    305: 'dilatación del tiempo', 147: 'Hz', 36: 'crac del 29', 198: 'Raphael', 218: 'film noir', 320: 'BCE', 410: 'programa espía',
    142: '300000', 35: 'Revolución americana', 359: 'Clavicémbalo',
    23: 'batalla de Waterloo', 93: 'monte Kilimanjaro', 374: 'río Mekong', 376: 'cordillera de los Andes', 196: 'Alhambra de Granada',
    147: 'Hertz', 266: 'telégrafo eléctrico', 205: 'dinastía nazarí', 399: 'chita', 405: 'fenómeno de El Niño', 411: 'rey Hammurabi', 192: 'estilo gótico' };
  for (const [n, u] of Object.entries(casos)) assert.ok(M(u, por(+n)), '#' + n + ' «' + u + '»');
  assert.ok(!M('rocas sedimentarias', por(389)));
});

function check(sel, seed, loose) {
  const all = sel.p1.concat(sel.p2, sel.p3);
  assert.equal(sel.p1.length, 10, 'F1 ' + seed);
  assert.equal(sel.p2.length, 5, 'F2 ' + seed);
  assert.equal(sel.p3.length, 9, 'F3 ' + seed);
  assert.equal(new Set(all.map((q) => q.n)).size, 24, 'sin repetidas ' + seed);
  assert.ok(all.every((q) => q.lz === 'A' || q.lz === 'B'));
  const lv = (a, d) => count(a, (q) => q.dif === d);
  assert.deepEqual([lv(sel.p1, 'facil'), lv(sel.p1, 'medio'), lv(sel.p1, 'dificil')], [1, 7, 2], 'curva F1 ' + seed);
  assert.deepEqual([lv(sel.p2, 'medio'), lv(sel.p2, 'dificil'), lv(sel.p2, 'facil')], [5, 0, 0], 'curva F2 ' + seed);
  assert.deepEqual([lv(sel.p3, 'medio'), lv(sel.p3, 'dificil')], [4, 5], 'curva F3 ' + seed);
  for (const ph of [sel.p1, sel.p2, sel.p3]) for (let i = 1; i < ph.length; i++) assert.ok(RANK[ph[i - 1].dif] <= RANK[ph[i].dif], 'orden ascendente ' + seed);
  const lim = loose ? [] : [[sel.p1, 3], [sel.p2, 2], [sel.p3, 3]];
  for (const [ph, m] of lim) for (const c of S.CATS) assert.ok(count(ph, (q) => q.cat === c) <= m, 'límite de fase ' + c + ' ' + seed);
  if (!loose) for (const c of S.CATS) { const k = count(all, (q) => q.cat === c); assert.ok(k >= 2 && k <= 6, 'categoría ' + c + '=' + k + ' ' + seed); }
  const ids = new Set(all.map((q) => q.n));
  for (const q of all) for (const p of (q.par || [])) assert.ok(!ids.has(p), 'par ' + q.n + '-' + p + ' ' + seed);
  for (const ph of [sel.p1, sel.p2, sel.p3]) for (let i = 2; i < ph.length; i++) assert.ok(!(ph[i].cat === ph[i - 1].cat && ph[i].cat === ph[i - 2].cat), 'tres seguidas ' + seed);
}

test('500 partidas con semilla cumplen curva, categorías, pares y orden', () => {
  for (let s = 1; s <= 500; s++) check(S.select(BANK, mulberry32(s)), s);
});

test('determinista con la misma semilla y distinta con otra', () => {
  const a = JSON.stringify(S.select(BANK, mulberry32(7)));
  assert.equal(a, JSON.stringify(S.select(BANK, mulberry32(7))));
  assert.notEqual(a, JSON.stringify(S.select(BANK, mulberry32(8))));
});

test('ignora las preguntas sin lz aunque sean medias o difíciles', () => {
  const sinLz = BANK.filter((q) => !q.lz).map((q) => q.n);
  assert.ok(sinLz.length >= 22);
  for (let s = 1; s <= 200; s++) { const sel = S.select(BANK, mulberry32(s)); for (const q of sel.p1.concat(sel.p2, sel.p3)) assert.ok(!sinLz.includes(q.n)); }
});

test('memoria (avoid): se evita lo visto; solo se repite alguna difícil tarde, por la variedad', () => {
  const seen = new Set();
  const rng = mulberry32(99);
  let dup = 0;
  for (let g = 0; g < 6; g++) {
    const sel = S.select(BANK, rng, seen);
    for (const q of sel.p1.concat(sel.p2, sel.p3)) { if (q.dif === 'dificil' && seen.has(q.n)) dup++; seen.add(q.n); }
  }
  assert.ok(dup <= 3, 'difíciles repetidas en 6 partidas: ' + dup);
});

test('con la memoria llena no falla: relaja la memoria, nunca la curva', () => {
  const todo = new Set(BANK.map((q) => q.n));
  check(S.select(BANK, mulberry32(3), todo), 'memoria-llena');
});

test('banco pequeño: devuelve menos preguntas pero nunca de otro nivel', () => {
  const pocas = BANK.filter((q) => q.lz && q.dif === 'medio').slice(0, 8);
  const sel = S.select(pocas, mulberry32(1));
  assert.ok(sel.p1.concat(sel.p2, sel.p3).every((q) => q.dif === 'medio'));
  assert.ok(sel.p1.concat(sel.p2, sel.p3).length <= 8);
});

// --- Envoltorio del solitario (memoria en store.questionBags) ---
function bagCtx(initialSeen) {
  const c = { console, Math, store: { questionBags: initialSeen ? { lucidez_vistas: initialSeen } : {} } };
  vm.createContext(c);
  vm.runInContext(read('src/data/questions.js') + read('src/utils/lucidez-select.js') + read('src/state/lucidez-bag.js') + ';this.P=pickLucidezGame;', c);
  return c;
}

test('pickLucidezGame: guarda las vistas y apenas repite difíciles en 6 partidas seguidas', () => {
  const c = bagCtx();
  const vistas = new Set();
  let dup = 0;
  for (let g = 0; g < 6; g++) {
    const sel = c.P();
    check(sel, 'cliente' + g);
    for (const q of sel.p1.concat(sel.p2, sel.p3)) { if (q.dif === 'dificil' && vistas.has(q.n)) dup++; vistas.add(q.n); }
  }
  assert.ok(dup <= 5, 'difíciles repetidas en 6 partidas: ' + dup);
  assert.ok(c.store.questionBags.lucidez_vistas.length >= 40);
});

test('pickLucidezGame: en 12 partidas seguidas la variedad y la curva nunca se rompen', () => {
  const c = bagCtx();
  for (let g = 0; g < 12; g++) check(c.P(), 'ciclo' + g);
  const vistas = c.store.questionBags.lucidez_vistas;
  assert.ok(vistas.length <= 244);
});

test('pickLucidezGame: ids desconocidos o corruptos en la memoria se descartan', () => {
  const c = bagCtx([99999, 'x', null, 1, 2]);
  check(c.P(), 'sucia');
  assert.ok(!c.store.questionBags.lucidez_vistas.includes(99999));
  const d = bagCtx(); d.store.questionBags.lucidez_vistas = 'roto';
  check(d.P(), 'rota');
});

test('index.html: usa la selección única y carga los módulos antes que el script principal', () => {
  const html = read('index.html');
  assert.ok(!html.includes('pickLucidezFromBag'));
  assert.ok(html.includes('pickLucidezGame()'));
  const iSel = html.indexOf('<script src="src/utils/lucidez-select.js');
  const iBag = html.indexOf('<script src="src/state/lucidez-bag.js');
  assert.ok(iSel > 0 && iBag > iSel);
  assert.ok(iBag < html.indexOf('<script src="src/online/duels.js'));
  const sw = read('sw.js');
  assert.ok(sw.includes("'./src/utils/lucidez-select.js'") && sw.includes("'./src/state/lucidez-bag.js'"));
});
