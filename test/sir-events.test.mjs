// 2.2 Eventos Sorpresa de Sir Edwards: reglas del motor, no interferencia con la partida, frases y cableado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx0 = { console };
vm.createContext(ctx0);
vm.runInContext(read('src/utils/sir-events.js') + ';this.S=SEQSirEvents;', ctx0);
const S = ctx0.S;
const arr = (x) => Array.from(x);

function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ALWAYS = () => 0;           // todas las tiradas «salen»
const NEVER = () => 0.9999;       // ninguna sale
// Una respuesta correcta en el instante `t` (ms), a la hora `hour`, con racha `streak`.
const ans = (st, t, hour, streak = 1, extra = {}, rng = ALWAYS) => S.evaluate(st, { nowMs: t, hour, streak, correct: true, last: false, blocked: false, ...extra }, rng);
// Avanza 3 respuestas para salir de la zona «inicio de partida».
function warm(st, t0 = 0) { for (let i = 0; i < S.MIN_ANSWERS_START; i++) assert.equal(ans(st, t0 + i, 12, 1, {}, ALWAYS), null); }

test('visit: como mucho una por partida, no en todas las partidas y puede no aparecer', () => {
  let games = 0, withVisit = 0;
  for (let g = 0; g < 4000; g++) {
    const rng = mulberry(g + 1), st = S.newState();
    let visits = 0;
    for (let i = 0; i < 20; i++) { const ev = ans(st, i * 60000, 14, 1, {}, rng); if (ev && ev.type === 'visit') visits++; assert.ok(!ev || ev.type === 'visit'); }
    assert.ok(visits <= 1);
    games++; if (visits) withVisit++;
  }
  const f = withVisit / games;
  assert.ok(f > 0.15 && f < 0.6, 'fracción de partidas con visit: ' + f);
});

test('nada en las primeras respuestas, ni tras un fallo, ni en la última pregunta, ni con la pestaña oculta', () => {
  const st = S.newState();
  for (let i = 0; i < S.MIN_ANSWERS_START; i++) assert.equal(ans(st, i, 14), null);
  assert.equal(S.evaluate(st, { nowMs: 1e6, hour: 14, streak: 0, correct: false, last: false, blocked: false }, ALWAYS), null);
  assert.equal(ans(st, 2e6, 14, 1, { last: true }), null);
  assert.equal(ans(st, 3e6, 14, 1, { blocked: true }), null);
  assert.ok(ans(st, 4e6, 14), 'y con todo despejado sí');
});

test('cooldown común: nunca dos seguidos; separación mínima de tiempo y de respuestas; uno por respuesta', () => {
  const st = S.newState(); warm(st);
  const first = ans(st, 100000, 14, 1, {}, ALWAYS);
  assert.ok(first);
  assert.equal(ans(st, 100001, 14), null, 'inmediatamente después, no');
  assert.equal(ans(st, 100000 + S.COOLDOWN_MS - 1, 14), null, 'antes del cooldown de tiempo, no');
  // aunque haya pasado el tiempo, faltan respuestas de por medio
  const st2 = S.newState(); warm(st2);
  assert.ok(ans(st2, 100000, 14));
  const t = 100000 + S.COOLDOWN_MS + 10;
  let fired = 0, answers = 0;
  for (let i = 0; i < S.MIN_ANSWERS_BETWEEN - 1; i++) { answers++; if (ans(st2, t + i, 14, 20)) fired++; }
  assert.equal(fired, 0, 'con 3 respuestas de por medio no sale (el hito de racha tampoco se salta el cooldown)');
});

test('streak: no antes de 10; sale en 10/15/20/30; cada hito una sola vez; frase del hito', () => {
  const st = S.newState(); warm(st);
  const fired = [];
  let t = 3e6;
  for (let streak = 1; streak <= 35; streak++) {
    t += 70000;
    for (let k = 0; k < S.MIN_ANSWERS_BETWEEN; k++) S.evaluate(st, { nowMs: t - 1, hour: 12, streak, correct: false, last: false, blocked: false }, ALWAYS); // respuestas de relleno
    const ev = ans(st, t, 12, streak, {}, ALWAYS);
    if (ev && ev.type === 'streak') fired.push([streak, ev.message]);
    if (streak < 10) assert.ok(!ev || ev.type !== 'streak', 'antes de 10 no hay streak');
  }
  assert.deepEqual(fired.map((f) => f[0]), [10, 15, 20, 30]);
  [10, 15, 20, 30].forEach((m, i) => assert.ok(S.PHRASES.streak[m].includes(fired[i][1])));
});

test('streak: un mismo hito no se repite; el hito no «se pierde» al instante pero tampoco llega tarde', () => {
  const st = S.newState(); warm(st);
  assert.equal(ans(st, 1e6, 12, 10).type, 'streak');
  for (let i = 1; i <= 12; i++) { const ev = ans(st, 1e6 + i * 100000, 12, 10 + (i % 2), {}, ALWAYS); assert.ok(!ev || ev.type !== 'streak', 'el hito 10 no repite'); }
  // Si la tirada falla en 10, todavía puede salir con 11 (un acierto de margen) …
  const st2 = S.newState(); warm(st2);
  assert.equal(ans(st2, 1e6, 12, 10, {}, NEVER), null);
  assert.equal(ans(st2, 1e6 + 1, 12, 11, {}, ALWAYS).type, 'streak');
  // … pero no con 12.
  const st3 = S.newState(); warm(st3);
  assert.equal(ans(st3, 1e6, 12, 10, {}, NEVER), null);
  assert.equal(ans(st3, 1e6 + 1, 12, 12, {}, NEVER), null);
  assert.notEqual(ans(st3, 1e6 + 2, 12, 12, {}, ALWAYS).type, 'streak');
});

test('day: solo de 06:00 a 09:59 hora local; night: solo de 00:00 a 03:59; fuera, solo visit', () => {
  const typeAt = (hour) => { const st = S.newState(); warm(st); const ev = ans(st, 1e6, hour, 1, {}, ALWAYS); return ev && ev.type; };
  for (let h = 0; h < 24; h++) {
    const t = typeAt(h);
    if (h >= 0 && h < 4) assert.equal(t, 'night', 'hora ' + h);
    else if (h >= 6 && h < 10) assert.equal(t, 'day', 'hora ' + h);
    else assert.equal(t, 'visit', 'hora ' + h);
  }
  assert.equal(S.isNight(3), true); assert.equal(S.isNight(4), false);
  assert.equal(S.isDay(5), false); assert.equal(S.isDay(6), true); assert.equal(S.isDay(9), true); assert.equal(S.isDay(10), false);
});

test('day y night: máx. 1 por partida y no en todas las partidas', () => {
  for (const [hour, type] of [[7, 'day'], [2, 'night']]) {
    const st = S.newState(); warm(st);
    const types = [];
    for (let i = 0; i < 12; i++) { const ev = ans(st, 1e6 + i * 100000, hour, 1, {}, ALWAYS); if (ev) types.push(ev.type); }
    assert.equal(types.filter((x) => x === type).length, 1);
    assert.equal(types.filter((x) => x === 'visit').length <= 1, true);
    let games = 0, withEv = 0;
    for (let g = 0; g < 3000; g++) {
      const rng = mulberry(900 + g), s = S.newState(); let n = 0;
      for (let i = 0; i < 20; i++) { const ev = ans(s, i * 60000, hour, 1, {}, rng); if (ev && ev.type === type) n++; }
      assert.ok(n <= 1); games++; if (n) withEv++;
    }
    assert.ok(withEv / games < 0.55, type + ' aparece en ' + withEv / games);
  }
});

test('prioridad: streak > night > day > visit, un solo evento por respuesta, y la prioridad no salta el cooldown', () => {
  const st = S.newState(); warm(st);
  assert.equal(ans(st, 1e6, 2, 10).type, 'streak', 'streak gana a night');
  assert.equal(ans(st, 1e6 + 1, 2, 10), null, 'cooldown: ni siquiera night');
  const st2 = S.newState(); warm(st2);
  const order = [];
  for (let i = 0; i < 8; i++) { const ev = ans(st2, 1e6 + i * 100000, 2, 1, {}, ALWAYS); if (ev) order.push(ev.type); }
  assert.deepEqual(order, ['night', 'visit'], 'night antes que visit; después ya no queda nada');
  const st3 = S.newState(); warm(st3);
  const order3 = [];
  for (let i = 0; i < 8; i++) { const ev = ans(st3, 1e6 + i * 100000, 8, 1, {}, ALWAYS); if (ev) order3.push(ev.type); }
  assert.deepEqual(order3, ['day', 'visit'], 'day antes que visit');
});

test('frases: todas en «tú», sin plurales, con comillas; las de hora concreta solo salen a su hora', () => {
  const all = [];
  const walk = (x) => { if (typeof x === 'string') all.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') { if (x.t) all.push(x.t); else Object.values(x).forEach(walk); } };
  walk(S.PHRASES);
  assert.ok(all.length >= 45);
  all.forEach((t) => {
    assert.ok(t.startsWith('«') && t.endsWith('»'), t);
    assert.ok(!/\b(vuestr\w*|seguid|preocupéis|tramáis|estáis|os\b|decepcionéis|estropeéis)/i.test(t), 'plural en: ' + t);
  });
  const stripH = [['«Son las siete', 7], ['«Son las tres', 3], ['«03:17', 3]];
  for (let hour = 0; hour < 24; hour++) {
    for (let g = 0; g < 400; g++) {
      const rng = mulberry(g * 24 + hour + 5), st = S.newState(); warm(st);
      const ev = ans(st, 1e6, hour, 1, {}, rng);
      if (!ev) continue;
      stripH.forEach(([pref, h]) => { if (ev.message.includes(pref.slice(1))) assert.equal(hour, h, ev.message + ' a las ' + hour); });
    }
  }
  assert.ok(S.PHRASES.streak[30].includes('«SirEdwards Imparable. Te lo has ganado.»'));
  S.MILESTONES.filter((m) => m !== 30).forEach((m) => assert.ok(!S.PHRASES.streak[m].some((p) => p.includes('Imparable'))));
});

test('frase muy rara: mucho menos frecuente que las normales', () => {
  let rare = 0, n = 0;
  for (let g = 0; g < 20000; g++) { const st = S.newState(); warm(st); const ev = ans(st, 1e6, 14, 1, {}, mulberry(g + 77777)); if (ev) { n++; if (S.PHRASES.visitRare.includes(ev.message)) rare++; } }
  assert.ok(n > 300);
  const f = rare / n;
  assert.ok(f > 0.01 && f < 0.1, 'rara: ' + f);
});

test('no repite la misma frase dos veces seguidas del mismo evento', () => {
  const st = S.newState(); st.last.visit = S.PHRASES.visit[0];
  for (let g = 0; g < 200; g++) { const s2 = S.newState(); s2.last.visit = S.PHRASES.visit[0]; warm(s2); const ev = ans(s2, 1e6, 14, 1, {}, mulberry(g)); if (ev) assert.notEqual(ev.message, S.PHRASES.visit[0]); }
});

test('el estado es de UNA partida: newState reinicia límites e hitos', () => {
  const a = S.newState(); warm(a); assert.ok(ans(a, 1e6, 14));
  assert.equal(ans(a, 9e6, 14, 1, {}, ALWAYS), null, 'visit ya usado en esa partida');
  const b = S.newState(); warm(b); assert.ok(ans(b, 1e6, 14), 'partida nueva: vuelve a poder salir');
  assert.deepEqual(JSON.parse(JSON.stringify(S.newState())), { shown: { visit: 0, day: 0, night: 0 }, milestones: {}, lastAt: null, lastAnswer: null, answers: 0, last: {} });
});

// ---- Enganche con la partida: no modifica nada del juego ----
function makeGameEnv(game, extra = {}) {
  const shown = [];
  const timers = [];
  const c = { console, currentGame: game, answerStreak: 12, timeTrialEndTime: 0, document: { hidden: false, getElementById: () => null }, SEQSirEventsUI: { show: (ev) => { shown.push(ev); return true; } },
    setTimeout: (fn) => { timers.push(fn); return timers.length; }, ...extra };
  vm.createContext(c);
  vm.runInContext(read('src/utils/sir-events.js'), c);
  vm.runInContext(read('src/state/sir-events.js'), c);
  c.shown = shown;
  c.flush = () => timers.splice(0).forEach((f) => f());
  return c;
}
test('enganche: no escribe en la partida (puntuación, tiempo, vidas…) ni en el store; el estado no es enumerable', () => {
  const game = { mode: 'survival', currentIdx: 5, totalQuestionsToPlay: 30, score: 5, lives: 3, answered: true, sessionXpGained: 40, sessionBestStreak: 12 };
  const store = Object.freeze({ xp: 100, fragments: 2, currentStreak: 12 });
  const c = makeGameEnv(game, { store });
  const before = JSON.stringify(game), sb = JSON.stringify(store);
  vm.runInContext('Math.random = () => 0', c);
  let n = 0;
  for (let i = 0; i < 30; i++) { const ev = vm.runInContext('sirEventsOnAnswer(true)', c); c.flush(); if (ev) n++; }
  assert.ok(n >= 1 && c.shown.length === n, 'lo evaluado se muestra tras el retardo');
  assert.equal(JSON.stringify(game), before, 'la partida queda idéntica');
  assert.equal(JSON.stringify(store), sb);
  assert.equal(c.answerStreak, 12);
  assert.ok(Object.getOwnPropertyDescriptor(game, '_sev') && !Object.getOwnPropertyDescriptor(game, '_sev').enumerable);
  assert.ok(!JSON.stringify(game).includes('_sev'));
});

test('enganche: Duelo y modos desconocidos, fallos, última pregunta y poco tiempo de Contrarreloj → nada', () => {
  const run = (game, correct = true, extra = {}) => { const c = makeGameEnv(game, extra); vm.runInContext('Math.random = () => 0', c); let n = 0; for (let i = 0; i < 40; i++) { game.currentIdx = game.currentIdx; if (vm.runInContext(`sirEventsOnAnswer(${correct})`, c)) n++; c.flush(); } return c.shown.length; };
  assert.equal(run({ mode: 'play', isDuel: true, currentIdx: 3, totalQuestionsToPlay: 30 }), 0);
  assert.equal(run({ mode: 'duelo_online', currentIdx: 3, totalQuestionsToPlay: 30 }), 0);
  assert.equal(run({ mode: 'play', currentIdx: 3, totalQuestionsToPlay: 30 }, false), 0);
  assert.equal(run({ mode: 'play', currentIdx: 29, totalQuestionsToPlay: 30 }), 0);
  assert.equal(run({ mode: 'timetrial', currentIdx: 3, totalQuestionsToPlay: 20 }, true, { timeTrialEndTime: Date.now() + 5000 }), 0);
  assert.ok(run({ mode: 'timetrial', currentIdx: 3, totalQuestionsToPlay: 20 }, true, { timeTrialEndTime: Date.now() + 60000 }) >= 1);
  ['play', 'survival', 'sudden_death', 'timetrial', 'mental_calc', 'review', 'lucidez_mental'].forEach((m) => assert.ok(run({ mode: m, currentIdx: 3, totalQuestionsToPlay: 30 }, true, { timeTrialEndTime: Date.now() + 99999 }) >= 1, m));
  assert.equal(run({ mode: 'play', currentIdx: 3, totalQuestionsToPlay: 30 }, true, { document: { hidden: true } }), 0);
});

test('enganche: una partida nueva (objeto nuevo) reinicia el estado de eventos', () => {
  const g1 = { mode: 'play', currentIdx: 3, totalQuestionsToPlay: 30 };
  const c = makeGameEnv(g1); vm.runInContext('Math.random = () => 0', c);
  let n1 = 0; for (let i = 0; i < 40; i++) { if (vm.runInContext('sirEventsOnAnswer(true)', c)) n1++; c.flush(); }
  const g2 = { mode: 'play', currentIdx: 3, totalQuestionsToPlay: 30 };
  c.currentGame = g2; vm.runInContext('currentGame = this.currentGame', c);
  let n2 = 0; for (let i = 0; i < 40; i++) { if (vm.runInContext('sirEventsOnAnswer(true)', c)) n2++; c.flush(); }
  assert.ok(n1 >= 1 && n2 >= 1);
});

test('cableado: assets, index.html, sw.js, solo vía updateAnswerStreak, sin tocar el backend', () => {
  ['visit', 'streak', 'day', 'night'].forEach((t) => {
    assert.ok(fs.existsSync(new URL(`../assets/character/event_siredwards_${t}.webp`, import.meta.url)), t);
    assert.ok(read('sw.js').includes(`event_siredwards_${t}.webp`));
    assert.ok(read('src/utils/sir-events.js').includes(`event_siredwards_${t}.webp`));
  });
  const html = read('index.html'), sw = read('sw.js');
  ['src/utils/sir-events.js', 'src/ui/sir-events-ui.js', 'src/state/sir-events.js', 'styles/sir-events.css'].forEach((f) => { assert.ok(html.includes(f), f); assert.ok(sw.includes(f), f); });
  assert.equal((html.match(/sirEventsOnAnswer\(/g) || []).length, 2, 'solo en updateAnswerStreak (Repaso y modos con racha)');
  assert.ok(!/observing/i.test(read('src/utils/sir-events.js')));
  const css = read('styles/sir-events.css');
  assert.ok(/pointer-events:\s*none/.test(css), 'el evento no recibe toques');
  assert.ok(!/sir-event|SirEvent/.test(read('src/online/online.js')), 'sin telemetría ni backend');
});

test('enganche: si el componente no puede mostrarlo sin tapar la partida, es como si no hubiera salido (el evento sigue disponible)', () => {
  const game = { mode: 'play', currentIdx: 3, totalQuestionsToPlay: 30 };
  let refuse = true; const shown = [];
  const c = makeGameEnv(game, { SEQSirEventsUI: { show: (ev) => { if (refuse) return false; shown.push(ev); return true; } } });
  vm.runInContext('Math.random = () => 0', c);
  for (let i = 0; i < 6; i++) { vm.runInContext('sirEventsOnAnswer(true)', c); c.flush(); }
  assert.equal(shown.length, 0);
  assert.equal(game._sev.shown.visit, 0, 'el límite de visit no se gastó');
  assert.equal(game._sev.lastAt, null, 'ni el cooldown');
  assert.ok(game._sev.answers >= 6, 'pero el recuento de respuestas se conserva');
  refuse = false;
  vm.runInContext('sirEventsOnAnswer(true)', c); c.flush();
  assert.equal(shown.length, 1);
  assert.equal(game._sev.shown.visit + game._sev.shown.day + game._sev.shown.night, 1);
});

test('enganche: si la partida cambió o ya hay resultados cuando toca mostrarlo, no se muestra y no se consume', () => {
  const game = { mode: 'play', currentIdx: 3, totalQuestionsToPlay: 30 };
  const c = makeGameEnv(game, { document: { hidden: false, getElementById: () => ({ style: { display: 'block' } }) } });
  vm.runInContext('Math.random = () => 0', c);
  for (let i = 0; i < 6; i++) { vm.runInContext('sirEventsOnAnswer(true)', c); c.flush(); }
  assert.equal(c.shown.length, 0);
  assert.equal(game._sev.lastAt, null);
  const g2 = { mode: 'play', currentIdx: 3, totalQuestionsToPlay: 30 };
  const c2 = makeGameEnv(g2); vm.runInContext('Math.random = () => 0', c2);
  for (let i = 0; i < 6; i++) { vm.runInContext('sirEventsOnAnswer(true)', c2); c2.currentGame = { mode: 'play' }; vm.runInContext('currentGame = this.currentGame', c2); c2.flush(); c2.currentGame = g2; vm.runInContext('currentGame = this.currentGame', c2); }
  assert.equal(c2.shown.length, 0);
});
