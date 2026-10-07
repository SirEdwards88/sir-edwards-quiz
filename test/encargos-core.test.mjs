// 2.2 Encargos: semana, rotación determinista, claves de recompensa.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(read('src/utils/encargos-core.js') + ';this.E=SEQEncargos;', ctx);
const E = ctx.E;
const arr = (x) => Array.from(x);
const E0 = E.EPOCH_IDX;

test('catálogo: 12 normales y 4 grandes, ids y títulos únicos, XP y máximo semanal', () => {
  assert.equal(E.NORMALES.length, 12);
  assert.equal(E.GRANDES.length, 4);
  const titles = [...E.NORMALES, ...E.GRANDES].map((m) => m.titulo);
  assert.equal(new Set(titles).size, 16);
  assert.equal(new Set([...E.NORMALES, ...E.GRANDES].map((m) => m.id)).size, 16);
  assert.equal(E.XP_MISSION, 100); assert.equal(E.XP_BONUS, 250); assert.equal(E.XP_GREAT, 200);
  assert.equal(E.XP_WEEK_MAX, 750);
  const cats = {};
  E.NORMALES.forEach((m) => { cats[m.cat] = (cats[m.cat] || 0) + 1; });
  assert.deepEqual(cats, { actividad: 2, duelos: 2, constancia: 1, variedad: 2, rachas: 1, precision: 3, apuestas: 1 });
});

test('ningún título coincide con el de un logro', () => {
  const c = { console }; vm.createContext(c);
  vm.runInContext(read('src/data/medals.js') + ';this.M=ALL_MEDALS', c);
  const titles = new Set(arr(c.M).map((m) => String(m.title).toLowerCase()));
  for (const m of [...E.NORMALES, ...E.GRANDES]) assert.ok(!titles.has(m.titulo.toLowerCase()), 'coincide con un logro: ' + m.titulo);
});

test('identificador de semana: ISO, lunes-domingo, y su inversa', () => {
  const at = (y, m, d, h = 12) => E.weekIdOf(E.weekIndexAt(new Date(y, m - 1, d, h).getTime()));
  assert.equal(at(2026, 10, 5), '2026-W41');           // lunes
  assert.equal(at(2026, 10, 11, 23), '2026-W41');      // domingo
  assert.equal(at(2026, 10, 12, 0), '2026-W42');       // lunes siguiente
  assert.equal(at(2026, 1, 1), '2026-W01');
  assert.equal(at(2027, 1, 3), '2026-W53');            // 2026 tiene 53 semanas ISO
  assert.equal(at(2027, 1, 4), '2027-W01');
  assert.equal(at(2024, 12, 30), '2025-W01');
  for (let i = E0 - 60; i < E0 + 400; i++) assert.equal(E.weekIndexOfId(E.weekIdOf(i)), i);
  for (const bad of ['', '2026-W00', '2026-W54', '2027-W53', 'x', '2026-41', null, 5]) assert.equal(E.weekIndexOfId(bad), null, String(bad));
  assert.equal(E.weekIndexOfId('2026-W53') !== null, true);
});

test('semana estable: mismas misiones todos los días de la semana y distintas al cambiar', () => {
  const i = E.weekIndexAt(new Date(2026, 9, 7, 9).getTime());
  assert.equal(E.weekIdOf(i), '2026-W41');
  const a = JSON.stringify(E.missionsForWeek(i));
  for (let k = 0; k < 50; k++) assert.equal(JSON.stringify(E.missionsForWeek(i)), a);
  assert.equal(E.greatForWeek(i), E.greatForWeek(i));
  assert.notEqual(JSON.stringify(E.missionsForWeek(i + 1)), a);
  assert.equal(E.missionsForWeek(i).length, 3);
});

test('cada ciclo de 4 semanas muestra las 12 misiones exactamente una vez (ninguna repite antes)', () => {
  for (let c = 0; c < 120; c++) {
    const ids = [];
    for (let p = 0; p < 4; p++) ids.push(...E.missionsForWeek(E0 + c * 4 + p));
    assert.equal(ids.length, 12);
    assert.equal(new Set(ids).size, 12, 'ciclo ' + c);
  }
});

test('los Grandes Encargos: 4 distintos por ciclo, el primero nunca es el último del anterior', () => {
  for (let c = 0; c < 120; c++) {
    const g = [0, 1, 2, 3].map((p) => E.greatForWeek(E0 + c * 4 + p));
    assert.equal(new Set(g).size, 4, 'ciclo ' + c);
    if (c > 0) assert.notEqual(g[0], E.greatForWeek(E0 + c * 4 - 1), 'cambio de ciclo ' + c);
  }
});

test('variedad: casi todos los tríos tienen 3 categorías distintas y ninguno es de una sola', () => {
  let three = 0, total = 0, oneCat = 0, redundant = 0;
  for (let w = 0; w < 400; w++) {
    const ids = E.missionsForWeek(E0 + w);
    const cats = new Set(ids.map((id) => E.NORMAL_BY_ID[id].cat));
    total++; if (cats.size === 3) three++; if (cats.size === 1) oneCat++;
    const key = ids.slice().sort().join('|');
    if (E.REDUNDANT.some((r) => r.slice().sort().join('|') === key)) redundant++;
  }
  assert.equal(oneCat, 0);
  assert.equal(redundant, 0);
  assert.ok(three / total >= 0.95, 'tríos con 3 categorías: ' + three + '/' + total);
});

test('un ciclo nuevo no repite ningún trío del anterior', () => {
  const key = (t) => arr(t).slice().sort().join('|');
  for (let c = 1; c < 120; c++) {
    const prev = new Set(arr(E.normalCycle(c - 1)).map(key));
    for (const t of arr(E.normalCycle(c))) assert.ok(!prev.has(key(t)), 'ciclo ' + c);
  }
});

test('antes del primer ciclo y muy lejos en el futuro sigue funcionando', () => {
  assert.equal(E.missionsForWeek(E0 - 100).length, 3);
  assert.equal(JSON.stringify(E.missionsForWeek(E0 - 100)), JSON.stringify(E.missionsForWeek(E0)));
  assert.equal(E.missionsForWeek(E0 + 52 * 60).length, 3);
});

test('claves de recompensa: formato, XP y validación contra la rotación', () => {
  const idx = E0 + 3, wk = E.weekIdOf(idx), now = E.startMsLocal(idx) + 3 * 86400000;
  const [m1] = E.missionsForWeek(idx), g = E.greatForWeek(idx);
  assert.deepEqual({ ...E.parseKey(E.keyMission(wk, m1), now) }, { week: wk, kind: 'm', id: m1, xp: 100 });
  assert.deepEqual({ ...E.parseKey(E.keyBonus(wk), now) }, { week: wk, kind: 'b', id: null, xp: 250 });
  assert.deepEqual({ ...E.parseKey(E.keyGreat(wk, g), now) }, { week: wk, kind: 'g', id: g, xp: 200 });
  const other = E.NORMALES.map((m) => m.id).find((id) => !E.missionsForWeek(idx).includes(id));
  assert.equal(E.parseKey(E.keyMission(wk, other), now), null);
  const notGreat = E.GRANDES.map((m) => m.id).find((id) => id !== g);
  assert.equal(E.parseKey(E.keyGreat(wk, notGreat), now), null);
  for (const bad of ['', 'x', wk + ':z', wk + ':m', wk + ':m:' + m1 + ':x', '2026-W99:b', 7, null, wk + ':b:b']) assert.equal(E.parseKey(bad, now), null, String(bad));
  assert.equal(E.parseKey(E.keyBonus(E.weekIdOf(idx + 5)), now), null, 'semana futura');
  assert.equal(E.parseKey(E.keyBonus(E.weekIdOf(idx - 20)), now), null, 'semana antigua');
  assert.ok(E.parseKey(E.keyBonus(E.weekIdOf(idx + 1)), now + 5 * 86400000) !== null);
  assert.ok(E.parseKey(E.keyBonus(wk)) !== null, 'sin reloj no se comprueba la fecha');
  assert.ok(E.keyMission(wk, 'sin_terreno_comodo').length <= 40);
});
