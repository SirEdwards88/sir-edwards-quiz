// 2.2 Encargos: progreso semanal, cobro idempotente, multi-pestaña, cambio de semana, avisos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const KEY = 'siredwards_quiz_v1_0_data';
const MON = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime(); // hora local
const T0 = MON(2026, 10, 7);           // miércoles de la semana de salida (2026-W41)

function makeLS() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}
function makeEnv(ls = makeLS(), initial) {
  const toasts = [];
  const ctx = {
    console, localStorage: ls, toasts,
    SEQEncargosUI: { toast: (main, kind, sub) => toasts.push({ main, kind, sub }) },
    currentGame: { mode: 'play' },
    SEQStreakXp: { XP_CAP: 23209 },
    getLevelData(xp) { let l = 1, c = xp; while (l < 30) { const n = 100 + (l - 1) * 50; if (c >= n) { c -= n; l++; } else break; } return Math.min(l, 30); },
    saveStore() { ls.setItem(KEY, JSON.stringify(ctx.store)); }
  };
  vm.createContext(ctx);
  ['src/utils/encargos-core.js', 'src/utils/encargos-progress.js', 'src/state/encargos.js'].forEach((f) => vm.runInContext(read(f), ctx));
  ctx.store = initial || { xp: 0, encargos: null, encargosClaimed: [] };
  ctx.T = T0; ctx.encargosNowMs = () => ctx.T;
  vm.runInContext('var E = SEQEncargos, P = SEQEncargosProgress;', ctx);
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);
const weekId = (ctx) => run(ctx, 'encargosEnsureWeek().w');
const missions = (ctx) => Array.from(run(ctx, 'encargosActiveIds(encargosEnsureWeek().w).normals'));
const great = (ctx) => run(ctx, 'encargosActiveIds(encargosEnsureWeek().w).great');
// Fuerza un progreso suficiente para completar una misión concreta.
function fill(ctx, id) {
  run(ctx, `encargosMutate(function (p) { var C = P.CATS;
    switch (${JSON.stringify(id)}) {
      case 'cerebro_despierto': p.ok = 100; break;
      case 'semana_productiva': p.games = 8; break;
      case 'presencia_arena': p.duels = 5; break;
      case 'constancia': p.days = ['2026-10-05','2026-10-06','2026-10-07']; break;
      case 'mente_curiosa': C.forEach(function (c) { p.cat[c] = 10; }); break;
      case 'sin_terreno_comodo': C.forEach(function (c) { p.cat[c] = 15; }); break;
      case 'sexto_sentido': C.forEach(function (c) { p.best[c] = 3; }); break;
      case 'mano_firme': p.g80 = 3; break;
      case 'no_era_suerte': p.g80 = 5; break;
      case 'rival_digno': p.wins = 3; break;
      case 'trabajo_limpio': p.clean = 1; break;
      case 'juego_apuestas': p.stakes = 3; break;
      case 'a_todo_o_nada': p.g90 = 5; break;
      case 'vuelta_completa': p.std = 5; p.duels = 2; p.other = 5; break;
      case 'semana_completa': C.forEach(function (c) { p.cat[c] = 25; }); break;
      case 'cambio_marcha': p.games = 15; p.modes = { play: 5, survival: 4, timetrial: 3, sudden_death: 3 }; break;
    } })`);
}

test('evaluadores: umbrales exactos de las 12 normales y las 4 grandes', () => {
  const ctx = makeEnv();
  const ev = (id, mut) => run(ctx, `(function(){ var p = P.emptyProgress(); (${mut})(p); return JSON.parse(JSON.stringify(P.evaluate(${JSON.stringify(id)}, p))); })()`);
  assert.equal(ev('cerebro_despierto', 'p => { p.ok = 99; }').done, false);
  assert.equal(ev('cerebro_despierto', 'p => { p.ok = 100; }').done, true);
  assert.equal(ev('cerebro_despierto', 'p => { p.ok = 63; }').label, '63/100');
  assert.equal(ev('semana_productiva', 'p => { p.games = 7; }').done, false);
  assert.equal(ev('semana_productiva', 'p => { p.games = 8; }').done, true);
  assert.equal(ev('presencia_arena', 'p => { p.duels = 5; }').done, true);
  assert.equal(ev('constancia', 'p => { p.days = ["a","b"]; }').done, false);
  assert.equal(ev('rival_digno', 'p => { p.wins = 2; }').done, false);
  assert.equal(ev('mano_firme', 'p => { p.g80 = 3; }').done, true);
  assert.equal(ev('no_era_suerte', 'p => { p.g80 = 4; }').done, false);
  assert.equal(ev('trabajo_limpio', 'p => { p.clean = 1; }').done, true);
  assert.equal(ev('a_todo_o_nada', 'p => { p.g90 = 4; }').done, false);
  const cats = (n, except) => `p => { P.CATS.forEach((c, i) => { p.cat[c] = ${n}; }); p.cat.deporte = ${except}; }`;
  assert.equal(ev('mente_curiosa', cats(10, 9)).done, false);
  assert.equal(ev('mente_curiosa', cats(10, 10)).done, true);
  assert.equal(ev('sin_terreno_comodo', cats(15, 14)).done, false);
  assert.equal(ev('sin_terreno_comodo', cats(15, 15)).done, true);
  assert.equal(ev('semana_completa', cats(25, 24)).done, false);
  assert.equal(ev('semana_completa', cats(25, 25)).done, true);
  assert.equal(ev('sexto_sentido', 'p => { P.CATS.forEach(c => { p.best[c] = 3; }); p.best.ciencia = 2; }').done, false);
  assert.equal(ev('sexto_sentido', 'p => { P.CATS.forEach(c => { p.best[c] = 3; }); }').done, true);
});

test('Juego de Apuestas cuenta SOLO duelos por apuestas; Retos y duelos normales cuentan como duelos', () => {
  const ctx = makeEnv();
  run(ctx, 'encargosOnDuel(true, false); encargosOnDuel(false, false); encargosOnDuel(true, true);');
  const p = run(ctx, 'JSON.parse(JSON.stringify(store.encargos.p))');
  assert.equal(p.duels, 3); assert.equal(p.wins, 2); assert.equal(p.stakes, 1);
});

test('La Vuelta Completa: exactamente 5 estándar + 2 duelos + 5 otros', () => {
  const ctx = makeEnv();
  const done = (p) => run(ctx, `(function(){var p=Object.assign(P.emptyProgress(),${JSON.stringify(p)});return P.evaluate('vuelta_completa',p).done;})()`);
  assert.equal(done({ std: 5, duels: 2, other: 5 }), true);
  assert.equal(done({ std: 10, duels: 0, other: 5 }), false);   // el exceso de una parte no compensa otra
  assert.equal(done({ std: 5, duels: 1, other: 5 }), false);
  assert.equal(done({ std: 5, duels: 2, other: 4 }), false);
  assert.equal(done({ std: 4, duels: 2, other: 5 }), false);
});

test('Cambio de Marcha: 15 partidas y al menos 4 modos distintos', () => {
  const ctx = makeEnv();
  const done = (p) => run(ctx, `(function(){var p=Object.assign(P.emptyProgress(),${JSON.stringify(p)});return P.evaluate('cambio_marcha',p).done;})()`);
  assert.equal(done({ games: 15, modes: { play: 8, survival: 4, timetrial: 3 } }), false);
  assert.equal(done({ games: 15, modes: { play: 6, survival: 4, timetrial: 3, sudden_death: 2 } }), true);
  assert.equal(done({ games: 14, modes: { play: 6, survival: 4, timetrial: 2, sudden_death: 2 } }), false);
});

test('partidas: mínimo de respuestas, Repaso no cuenta, precisión y Trabajo Limpio', () => {
  const ctx = makeEnv();
  const game = (mode, c, t) => run(ctx, `SEQEncargosProgress.recordGame(store.encargos.p, {mode:${JSON.stringify(mode)},correct:${c},total:${t},day:'2026-10-07'})`);
  run(ctx, 'encargosEnsureWeek()');
  assert.equal(game('play', 4, 4), false);       // < 5 respuestas
  assert.equal(game('review', 10, 10), false);   // Repaso
  assert.equal(game('play', 9, 10), true);       // 90 %, 1 fallo: limpia
  assert.equal(game('survival', 8, 10), true);   // 80 %
  assert.equal(game('play', 7, 10), true);       // 70 %: cuenta partida, no precisión
  const p = run(ctx, 'JSON.parse(JSON.stringify(store.encargos.p))');
  assert.equal(p.games, 3); assert.equal(p.g80, 2); assert.equal(p.g90, 1); assert.equal(p.clean, 1);
  assert.equal(p.std, 2); assert.equal(p.other, 1);
  const ctx2 = makeEnv(); run(ctx2, 'encargosEnsureWeek()');
  run(ctx2, `SEQEncargosProgress.recordGame(store.encargos.p, {mode:'play',correct:5,total:5,day:'2026-10-07'})`);
  assert.equal(run(ctx2, 'store.encargos.p.clean'), 0); // partida de 5: no vale para precisión
});

test('El Sexto Sentido: 3 aciertos CONSECUTIVOS de la misma categoría; otra categoría, un fallo o una respuesta sin categoría la cortan', () => {
  const ctx = makeEnv();
  const ans = (cat, ok) => run(ctx, `encargosOnAnswer(${ok}, {cat:${JSON.stringify(cat)}})`);
  const best = (c) => run(ctx, `store.encargos.p.best.${c}`);
  ans('historia', true); ans('historia', true); ans('ciencia', true); ans('historia', true); // otra categoría en medio: corta
  assert.equal(best('historia'), 2);
  ans('historia', true); ans('historia', true); // 1.ª + 2.ª + 3.ª seguidas tras la interrupción
  ans('deporte', true); ans('deporte', false); ans('deporte', true); ans('deporte', true); // un fallo corta
  assert.equal(best('historia'), 3);
  assert.equal(best('deporte'), 2);
  ans('geografia', true); ans('geografia', true); ans(null, true); ans('geografia', true); // sin categoría corta
  assert.equal(best('geografia'), 2);
  ans('ciencia', false); ans('ciencia', true); ans('ciencia', true); ans('ciencia', true);
  assert.equal(best('ciencia'), 3);
  assert.equal(run(ctx, 'store.encargos.p.ok'), 16);
});

test('El Sexto Sentido: la racha continúa entre partidas y un solo valor de `run` queda activo', () => {
  const ctx = makeEnv();
  const ans = (cat, ok) => run(ctx, `encargosOnAnswer(${ok}, {cat:${JSON.stringify(cat)}})`);
  ans('arte_literatura', true); ans('arte_literatura', true);
  run(ctx, `SEQEncargosProgress.recordGame(store.encargos.p, {mode:'play',correct:5,total:5,day:'2026-10-07'})`); // fin de partida: no la reinicia
  ans('arte_literatura', true);
  assert.equal(run(ctx, 'store.encargos.p.best.arte_literatura'), 3);
  assert.equal(run(ctx, 'Object.values(store.encargos.p.run).filter(Boolean).length'), 1);
  ans('historia', true);
  assert.equal(run(ctx, 'store.encargos.p.run.arte_literatura'), 0);
  assert.equal(run(ctx, 'store.encargos.p.run.historia'), 1);
});

test('Repaso no cuenta aciertos', () => {
  const ctx = makeEnv();
  ctx.currentGame.mode = 'review';
  run(ctx, "encargosOnAnswer(true, {cat:'historia'})");
  assert.equal(run(ctx, 'store.encargos && store.encargos.p.ok || 0'), 0);
});

test('XP idempotente: cada misión 100 una sola vez, bonus 250 al cobrar las tres, Gran Encargo 200; máximo 750', () => {
  const ctx = makeEnv();
  const ms = missions(ctx), g = great(ctx);
  fill(ctx, ms[0]); assert.equal(ctx.store.xp, 100);
  fill(ctx, ms[0]); fill(ctx, ms[0]); assert.equal(ctx.store.xp, 100, 'repetir no paga otra vez');
  fill(ctx, ms[1]); assert.equal(ctx.store.xp, 200);
  fill(ctx, ms[2]); assert.equal(ctx.store.xp, 200 + 100 + 250, 'tercera + bonus');
  fill(ctx, ms[2]); assert.equal(ctx.store.xp, 550);
  fill(ctx, g); assert.equal(ctx.store.xp, 750);
  fill(ctx, g); assert.equal(ctx.store.xp, 750);
  const w = weekId(ctx);
  assert.equal(ctx.store.encargosClaimed.length, 5);
  assert.ok(ctx.store.encargosClaimed.includes(w + ':b'));
  assert.ok(Array.from(ctx.store.encargosClaimed).every((k) => run(ctx, `SEQEncargos.parseKey(${JSON.stringify(k)}, ${T0}) !== null`)));
});

test('el bonus no se da sin las tres, y el Gran Encargo no depende de ellas', () => {
  const ctx = makeEnv();
  const ms = missions(ctx), g = great(ctx);
  fill(ctx, ms[0]); fill(ctx, ms[1]); fill(ctx, g);
  assert.equal(ctx.store.xp, 100 + 100 + 200);
  assert.ok(!ctx.store.encargosClaimed.includes(weekId(ctx) + ':b'));
});

test('avisos: formato, y nada si no hay avance', () => {
  const ctx = makeEnv();
  run(ctx, "encargosOnAnswer(false, {cat:'historia'})");
  run(ctx, "encargosOnGameEnd('play', 0, 3)"); // partida demasiado corta: sin progreso
  assert.equal(ctx.toasts.length, 0);
  const ms = missions(ctx);
  fill(ctx, ms[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.toasts[0])).main, 'Encargo saldado. +100 XP');
  fill(ctx, ms[1]); fill(ctx, ms[2]);
  assert.ok(ctx.toasts.some((t) => t.main === 'Encargos saldados. +250 XP. Sigo sin aplaudir.'));
  fill(ctx, great(ctx));
  assert.ok(ctx.toasts.some((t) => t.main === 'Gran Encargo cobrado. +200 XP. Qué ambición.'));
});

test('aviso «Encargo avanzado» al terminar una partida con avance, un único aviso con título y avance', () => {
  const ctx = makeEnv();
  for (let i = 0; i < 6; i++) run(ctx, "encargosOnAnswer(true, {cat:'ciencia'})");
  run(ctx, "encargosOnGameEnd('play', 6, 10)");
  const t = ctx.toasts.filter((x) => x.main === 'Encargo avanzado');
  assert.equal(t.length, 1);
  assert.match(t[0].sub, /·/);
});

test('cambio de semana: el progreso se reinicia, las claves cobradas se conservan y la nueva semana vuelve a pagar', () => {
  const ctx = makeEnv();
  const w1 = weekId(ctx); const ms1 = missions(ctx);
  fill(ctx, ms1[0]); assert.equal(ctx.store.xp, 100);
  ctx.T = MON(2026, 10, 12, 9); // lunes siguiente
  const w2 = weekId(ctx);
  assert.notEqual(w1, w2);
  assert.equal(run(ctx, 'store.encargos.p.ok'), 0);
  assert.ok(ctx.store.encargosClaimed.includes(w1 + ':m:' + ms1[0]));
  const ms2 = missions(ctx);
  assert.notDeepEqual(ms2, ms1);
  fill(ctx, ms2[0]); assert.equal(ctx.store.xp, 200);
});

test('domingo 23:59 sigue siendo la semana; lunes 00:00 es la siguiente', () => {
  const ctx = makeEnv();
  ctx.T = new Date(2026, 9, 11, 23, 59).getTime(); const a = weekId(ctx);
  ctx.T = new Date(2026, 9, 12, 0, 0).getTime(); const b = weekId(ctx);
  assert.notEqual(a, b);
  const c2 = makeEnv(); c2.T = new Date(2026, 9, 5, 0, 0).getTime();   // lunes 00:00 de esa primera semana
  assert.equal(weekId(c2), a);
});

test('las misiones no cambian durante la semana ni al recargar', () => {
  const ctx = makeEnv();
  const a = missions(ctx);
  ctx.T = MON(2026, 10, 11, 23); assert.deepEqual(missions(ctx), a);
  const stored = JSON.parse(JSON.stringify(ctx.store));
  const ctx2 = makeEnv(makeLS(), stored); ctx2.T = ctx.T;
  assert.deepEqual(missions(ctx2), a);
  assert.equal(great(ctx2), great(ctx));
});

test('recargar y reabrir: lo cobrado no se vuelve a cobrar ni a avisar', () => {
  const ls = makeLS();
  const ctx = makeEnv(ls);
  const ms = missions(ctx); fill(ctx, ms[0]);
  const saved = JSON.parse(ls.getItem(KEY));
  const ctx2 = makeEnv(ls, saved);
  fill(ctx2, ms[0]);
  assert.equal(ctx2.store.xp, 100);
  assert.equal(ctx2.toasts.length, 0);
});

test('dos pestañas: la que va desfasada no paga otra vez y no pisa el XP', () => {
  const ls = makeLS();
  const initial = { xp: 0, encargos: null, encargosClaimed: [] };
  const A = makeEnv(ls, JSON.parse(JSON.stringify(initial)));
  const B = makeEnv(ls, JSON.parse(JSON.stringify(initial)));
  const ms = missions(A);
  fill(A, ms[0]);                       // pestaña A cobra 100 y guarda
  assert.equal(A.store.xp, 100);
  fill(B, ms[0]);                       // pestaña B (desfasada) completa la misma misión
  assert.equal(B.store.xp, 100, 'B adopta el XP de A en vez de cobrar de nuevo');
  assert.equal(B.store.encargosClaimed.length, 1);
  const final = JSON.parse(ls.getItem(KEY));
  assert.equal(final.encargosClaimed.length, 1);
  fill(B, ms[1]);                       // B cobra otra distinta: suma sobre lo de A
  assert.equal(B.store.xp, 200);
  assert.equal(JSON.parse(ls.getItem(KEY)).encargosClaimed.length, 2);
});

test('almacenamiento existente sin campos de Encargos: se completa sin romper nada', () => {
  const ctx = makeEnv(makeLS(), { xp: 500, gamesPlayed: 3 });
  const v = run(ctx, 'JSON.parse(JSON.stringify(encargosView()))');
  assert.equal(v.missions.length, 3);
  assert.equal(v.doneCount, 0);
  assert.equal(v.xpAvailable, 3 * 100 + 250 + 200);
  assert.equal(ctx.store.xp, 500);
  assert.equal(ctx.store.gamesPlayed, 3);
});

test('progreso corrupto o manipulado se normaliza', () => {
  const ctx = makeEnv(makeLS(), { xp: 0, encargos: { w: '2026-W41', p: { ok: -5, cat: 'x', days: ['hoy', '2026-10-07', '2026-10-07'], modes: { 'A<b': 3, play: 'z' } } }, encargosClaimed: ['nope', 7] });
  const v = run(ctx, 'JSON.parse(JSON.stringify(encargosView()))');
  assert.equal(v.doneCount, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.store.encargos.p.days)), ['2026-10-07']);
});

test('nivel 30: la clave se cobra pero no se suma XP', () => {
  const ctx = makeEnv(makeLS(), { xp: 23209, encargos: null, encargosClaimed: [] });
  fill(ctx, missions(ctx)[0]);
  assert.equal(ctx.store.xp, 23209);
  assert.equal(ctx.store.encargosClaimed.length, 1);
});

test('el XP se recorta en el tope del cliente', () => {
  const ctx = makeEnv(makeLS(), { xp: 23150, encargos: null, encargosClaimed: [] });
  ctx.getLevelData = () => 29;
  fill(ctx, missions(ctx)[0]);
  assert.equal(ctx.store.xp, 23209);
});

test('rotación: tras 5 semanas seguidas (cambio de ciclo) las claves siguen siendo únicas y válidas', () => {
  const ctx = makeEnv();
  const keys = new Set();
  for (let w = 0; w < 5; w++) {
    ctx.T = MON(2026, 10, 7) + w * 7 * 86400000;
    missions(ctx).forEach((id) => { fill(ctx, id); });
    fill(ctx, great(ctx));
  }
  assert.equal(ctx.store.encargosClaimed.length, 5 * 5);
  assert.equal(ctx.store.xp, 5 * 750);
});

test('vista: tiempo restante y estados', () => {
  const ctx = makeEnv();
  const v = run(ctx, 'JSON.parse(JSON.stringify(encargosView()))');
  assert.ok(v.msLeft > 0 && v.msLeft <= 7 * 86400000);
  assert.equal(v.allDone, false);
  for (const id of missions(ctx)) fill(ctx, id);
  fill(ctx, great(ctx));
  const v2 = run(ctx, 'JSON.parse(JSON.stringify(encargosView()))');
  assert.equal(v2.allDone, true); assert.equal(v2.xpAvailable, 0);
});

test('cableado: index.html, sw.js, store, duels.js', () => {
  const html = read('index.html'), sw = read('sw.js');
  ['encargos-core', 'encargos-progress', 'state/encargos', 'ui/encargos-ui', 'styles/encargos.css'].forEach((f) => {
    assert.ok(html.includes(f), 'index ' + f); assert.ok(sw.includes(f), 'sw ' + f);
  });
  assert.ok(sw.includes('siredwards_encargos.webp') && sw.includes('siredwards_encargos_completados.webp'));
  assert.ok(html.includes('id="home-encargos"') && html.includes('id="view-encargos"'));
  assert.ok(/encargosOnAnswer\(isCorrect, q\)/.test(html));
  assert.equal((html.match(/encargosOnGameEnd\(/g) || []).length, 2);
  assert.ok(html.includes('encargosOnDuel(info.result'));
  assert.ok(read('src/online/duels.js').includes("stakes: kind === 'duel' && d.modo === 'stakes'"));
  assert.ok(!/siredwards_quiz_v1_1/.test(read('src/state/encargos.js')));
  assert.ok(fs.existsSync(new URL('../assets/character/siredwards_encargos.webp', import.meta.url)));
});

test('sincronización: las claves viajan en el mismo lote que el XP y se confirman al responder el servidor', () => {
  const on = read('src/online/online.js');
  assert.ok(on.includes('weekly: d.weekly'), 'el lote pendiente guarda las claves');
  assert.ok(on.includes('body.weekly = pending.weekly'));
  assert.ok(on.includes('confirmWeekly(pending.weekly)'));
  assert.ok(on.includes('weekly: sentWeekly') && on.includes('confirmWeekly(sentWeekly)'), 'la migración también las envía y las confirma');
  assert.ok(/weekly\.length > 0/.test(on), 'unas claves sin confirmar bastan para sincronizar');
});

test('claves por SEMANA: la misma misión y el mismo Gran Encargo se cobran una vez esta semana y otra vez en una semana nueva', () => {
  const ctx = makeEnv();
  const E0 = run(ctx, 'E.EPOCH_IDX');
  // semana (relativa) en la que se repite una misión normal / el Gran Encargo de la semana 0 (T0 cae en la semana 0 de la rotación)
  const normals0 = missions(ctx), great0 = great(ctx);
  let wN = -1, wG = -1;
  for (let r = 1; r < 40 && (wN < 0 || wG < 0); r++) {
    if (wN < 0 && run(ctx, `Array.from(E.missionsForWeek(${E0 + r}))`).includes(normals0[0])) wN = r;
    if (wG < 0 && run(ctx, `E.greatForWeek(${E0 + r})`) === great0) wG = r;
  }
  assert.ok(wN > 0 && wG > 0, 'la rotación vuelve a ofrecer la misma misión y el mismo Gran Encargo');
  const w1 = weekId(ctx);
  fill(ctx, normals0[0]); fill(ctx, great0);
  assert.equal(ctx.store.xp, 100 + 200);
  fill(ctx, normals0[0]); fill(ctx, great0);
  assert.equal(ctx.store.xp, 300, 'repetir en la misma semana no paga');
  // El reloj nunca retrocede de semana: se visitan las semanas de reaparición en orden cronológico.
  let w2 = null;
  [['n', wN], ['g', wG]].sort((x, y) => x[1] - y[1]).forEach(([kind, wk]) => {
    ctx.T = T0 + wk * 7 * 86400000;
    const w = weekId(ctx);
    assert.notEqual(w, w1);
    const before = ctx.store.xp;
    if (kind === 'n') {
      w2 = w;
      assert.ok(missions(ctx).includes(normals0[0]));
      assert.equal(run(ctx, 'encargosView().missions.every(m => !m.claimed)'), true, 'semana nueva: nada cobrado');
      fill(ctx, normals0[0]);
      assert.equal(ctx.store.xp, before + 100, 'la misma misión paga otra vez en la semana nueva');
      fill(ctx, normals0[0]);
      assert.equal(ctx.store.xp, before + 100, 'y solo una vez');
    } else {
      assert.equal(great(ctx), great0);
      fill(ctx, great0); // (el progreso que completa el Gran Encargo puede completar de paso otra misión de esa semana)
      const gained = ctx.store.xp - before;
      assert.ok(gained >= 200, 'el mismo Gran Encargo paga otra vez en otra semana');
      assert.ok(Array.from(ctx.store.encargosClaimed).includes(w + ':g:' + great0));
      fill(ctx, great0);
      assert.equal(ctx.store.xp, before + gained, 'y solo una vez');
    }
  });
  const keys = Array.from(ctx.store.encargosClaimed);
  assert.ok(keys.includes(w1 + ':m:' + normals0[0]) && keys.includes(w2 + ':m:' + normals0[0]), 'claves distintas por semana');
  assert.ok(keys.every((k) => /^\d{4}-W\d{2}:/.test(k)), 'toda clave lleva su semana');
});
