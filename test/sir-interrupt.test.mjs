// 2.5 Preguntas de Sir Edwards: datos, motor (una por bloque de 3 partidas), bolsa y corrección.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(read('src/utils/matching.js') + ';' + read('src/utils/answer-alias.js') + ';this.MATCH=isMatchWithAlias;', ctx);
vm.runInContext(read('src/data/sir-questions.js') + ';this.Q=SIR_QUESTIONS;', ctx);
vm.runInContext(read('src/utils/sir-interrupt.js') + ';this.C=SEQSirInterruptCore;', ctx);
const Q = Array.from(ctx.Q), C = ctx.C;

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const game = (mode = 'play', total = 20) => ({ mode, total });

test('datos: ids únicos, opciones y reacciones completas, textos cortos', () => {
  assert.ok(Q.length >= 20);
  assert.equal(new Set(Q.map((q) => q.id)).size, Q.length);
  for (const q of Q) {
    assert.ok(['trap', 'opinion'].includes(q.kind), q.id);
    assert.ok(q.q.length <= 90, q.id + ' enunciado largo');
    if (q.kind === 'trap') {
      assert.ok(q.a && q.a.length <= 40 && Array.isArray(q.alias) && q.alias.length >= 1 && Array.isArray(q.rj) && q.rj.length >= 2, q.id + ' trampa escrita');
      assert.ok(!q.options, q.id + ' las trampas no llevan opciones a la vista');
      assert.ok(q.right && q.wrong && q.right.length <= 90 && q.wrong.length <= 90, q.id + ' reacciones');
    } else {
      assert.ok(q.options.length >= 2 && q.options.length <= 4, q.id);
      assert.equal(new Set(q.options).size, q.options.length, q.id + ' opciones repetidas');
      for (const o of q.options) assert.ok(o.length <= 40, q.id + ' opción larga: ' + o);
      assert.equal(q.reactions.length, q.options.length, q.id);
      for (const r of q.reactions) assert.ok(r && r.length <= 90, q.id);
    }
  }
  assert.ok(Q.filter((q) => q.kind === 'trap').length >= 12, 'suficientes con respuesta correcta para el logro de 20');
});

test('datos: tuteo, sin «usted» ni emojis ni «Otra ronda»', () => {
  const all = JSON.stringify(Q);
  assert.ok(!/\busted\b|\bse lo\b/i.test(all));
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(all));
});

test('plan: exactamente una interrupción por bloque de 3 partidas elegibles, en partida y hueco al azar', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = mulberry(seed); let st = C.newState(); const hits = [];
    for (let g = 0; g < 30; g++) {
      const r = C.startGame(st, game('play', 20), rng); st = r.state;
      if (r.at !== null) { hits.push(g); st = C.markShown(st); assert.ok(r.at >= 3 && r.at <= 14, 'hueco ' + r.at); }
    }
    assert.equal(hits.length, 10, 'seed ' + seed);
    for (let b = 0; b < 10; b++) assert.equal(hits.filter((g) => Math.floor(g / 3) === b).length, 1, 'bloque ' + b);
  }
});

test('plan: la partida elegida varía (no siempre la misma del bloque)', () => {
  const pos = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    let st = C.newState(); const rng = mulberry(seed);
    for (let g = 0; g < 3; g++) { const r = C.startGame(st, game(), rng); st = r.state; if (r.at !== null) { pos.add(g); st = C.markShown(st); } }
  }
  assert.deepEqual([...pos].sort(), [0, 1, 2]);
});

test('plan: modos no elegibles, Duelos y partidas cortas no la llevan ni gastan el bloque', () => {
  const rng = mulberry(5); let st = C.newState();
  for (const m of ['timetrial', 'mental_calc', 'lucidez_mental', 'review']) { const r = C.startGame(st, game(m), rng); assert.equal(r.at, null); assert.deepEqual(r.state, st); }
  const d = C.startGame(st, { mode: 'play', total: 20, isDuel: true }, rng); assert.equal(d.at, null); assert.deepEqual(d.state, st);
  for (const m of ['play', 'survival', 'sudden_death']) assert.ok(C.eligible(m, false), m);
  assert.ok(!C.eligible('review', false), 'Repaso no lleva pregunta de Sir Edwards');
  // una partida corta (de 4 preguntas) no puede alojarla: la deuda pasa a la siguiente elegible del bloque
  let s2 = C.newState(); let shown = 0;
  for (let g = 0; g < 3; g++) { const r = C.startGame(s2, game('play', g === 0 ? 4 : 20), mulberry(g + 11)); s2 = r.state; if (r.at !== null) { shown++; s2 = C.markShown(s2); } }
  assert.ok(shown <= 1);
});

test('plan: sale entre la 4.ª pregunta y la penúltima; en partidas largas, pronto', () => {
  for (let seed = 1; seed <= 400; seed++) {
    let st = C.newState(); const rng = mulberry(seed);
    for (let g = 0; g < 3; g++) {
      const total = [6, 8, 25, 40][seed % 4];
      const r = C.startGame(st, game('survival', total), rng); st = r.state;
      if (r.at !== null) { assert.ok(r.at >= 3 && r.at <= total - 2 && r.at <= 14, total + ':' + r.at); st = C.markShown(st); }
    }
  }
});

test('bolsa: no repite hasta agotar todas y recomienza sin repetir la última', () => {
  const rng = mulberry(9); let st = C.newState(); const seen = [];
  for (let i = 0; i < Q.length; i++) { const r = C.pick(st, Q, rng); st = r.state; seen.push(r.question.id); }
  assert.equal(new Set(seen).size, Q.length);
  const last = seen[seen.length - 1];
  const next = C.pick(st, Q, rng); assert.notEqual(next.question.id, last);
  // ids retirados del banco desaparecen de la bolsa sin romper nada
  const small = Q.slice(0, 3); const r = C.pick({ n: 0, hit: -1, done: false, bag: ['sq01', 'zzz'], last: 'sq01' }, small, rng);
  assert.ok(['sq02', 'sq03'].includes(r.question.id));
});

test('opciones: las de opinión se muestran en el orden escrito; las trampas no llevan opciones (se escriben)', () => {
  const trap = Q.find((q) => q.kind === 'trap'), op = Q.find((q) => q.kind === 'opinion');
  assert.deepEqual(Array.from(C.order(trap, mulberry(1))), []);
  assert.deepEqual(Array.from(C.order(op, mulberry(1))), Array.from(op.options, (_, i) => i));
});

test('corrección: opinión no tiene mala; índice raro no rompe; las trampas ya no se corrigen por índice', () => {
  const op = Q.find((q) => q.id === 'sq14'), trap = Q.find((q) => q.id === 'sq29');
  assert.deepEqual({ ...C.grade(op, 2) }, { correct: null, reaction: op.reactions[2] });
  assert.equal(C.grade(op, 9), null);
  assert.equal(C.grade(trap, 0), null);
  assert.equal(C.grade(null, 0), null);
});

// Respuestas escritas: lo que un jugador teclearía de verdad (corrector de Lucidez Mental).
const OK = {
  sq01: ['Doce', 'doce', '12', 'Todos', 'todos los meses'],
  sq02: ['En ninguna parte', 'en ningun sitio', 'No se entierran', 'Nadie', 'a los vivos no se les entierra'],
  sq03: ['Ninguno', 'ninguna', 'cero', '0', 'ningún animal'],
  sq07: ['Los gallos no ponen huevos', 'no ponen huevos', 'un gallo no pone huevos', 'los gallos no ponen'],
  sq10: ['Diez', '10', 'diez letras'],
  sq21: ['Uno', 'uno', '1', 'solo uno', 'Un huevo'],
  sq22: ['Juan', 'juan', 'Se llama Juan'],
  sq23: ['No echa humo', 'no echa', 'a ninguna parte', 'es electrico', 'no tiene humo'],
  sq24: ['Como tú', 'como tu', 'como yo', 'yo', 'soy yo'],
  sq25: ['Mal', 'mal', '«mal»', 'la palabra mal'],
  sq26: ['Ocho', '8', 'ocho dias', 'en 8 días'],
  sq29: ['La letra «d»', 'la d', 'D', 'una d', 'la letra d'],
  sq30: ['Una hora', 'una hora', '1 hora', '60 minutos', '60 min', 'sesenta minutos', '1 h'],
  sq32: ['Un agujero', 'agujero', 'el agujero', 'hoyo', 'un hoyo', 'el hoyo'],
  sq33: ['Jueves', 'jueves', 'el jueves']
};
const KO = {
  sq01: ['Febrero', 'solo febrero', 'ninguno', 'cuatro', '28', 'siete'],
  sq02: ['en españa', 'En Francia', 'la frontera', 'en el mar'],
  sq03: ['dos', 'Uno', 'siete', 'Moisés', 'Noé', 'fue Noe', 'Dos de cada'],
  sq07: ['a la izquierda', 'derecha', 'rueda hasta el suelo', 'cae al suelo'],
  sq10: ['27', 'veintisiete', '8', '12', 'doce'],
  sq21: ['dos', 'tres', 'los que quieras', 'ninguno'],
  sq22: ['Santiago', 'mateo', 'no se sabe', 'Pablo'],
  sq23: ['al norte', 'al sur', 'norte', 'este', 'al este'],
  sq24: ['Pedro', 'Sir Edwards', 'se ignora', 'no se sabe'],
  sq25: ['equivocacion', 'ortografia', 'ninguna', 'bien'],
  sq26: ['siete', 'diez', '10', 'cinco', '7'],
  sq29: ['El Retiro', 'la puerta del sol', 'un oso y un madroño', 'la a', 'la m'],
  sq30: ['media hora', 'hora y media', 'dos horas', '30 minutos', '90 minutos', 'tres horas', 'una'],
  sq32: ['una deuda', 'una bola de nieve', 'un montón', 'un pozo grande', 'una montaña'],
  sq33: ['lunes', 'martes', 'miércoles', 'viernes', 'sábado', 'domingo']
};
test('corrección escrita: cada trampa acepta sus formas y rechaza los cebos', () => {
  const traps = Q.filter((q) => q.kind === 'trap');
  assert.equal(traps.length, Object.keys(OK).length);
  for (const q of traps) {
    for (const t of OK[q.id]) assert.equal(C.gradeText(q, t, ctx.MATCH).correct, true, q.id + ' debería valer: ' + t);
    for (const t of KO[q.id]) assert.equal(C.gradeText(q, t, ctx.MATCH).correct, false, q.id + ' NO debería valer: ' + t);
    for (const t of q.rj) assert.equal(C.gradeText(q, t, ctx.MATCH).correct, false, q.id + ' cebo aceptado: ' + t);
    for (const t of q.alias) assert.equal(C.gradeText(q, t, ctx.MATCH).correct, true, q.id + ' alias roto: ' + t);
  }
});

test('corrección escrita: reacción, vacío, tipo equivocado y nombre del jugador', () => {
  const q = Q.find((x) => x.id === 'sq24'), q2 = Q.find((x) => x.id === 'sq01');
  assert.deepEqual({ ...C.gradeText(q2, 'doce', ctx.MATCH) }, { correct: true, reaction: q2.right });
  assert.deepEqual({ ...C.gradeText(q2, 'febrero', ctx.MATCH) }, { correct: false, reaction: q2.wrong });
  assert.equal(C.gradeText(q2, '   ', ctx.MATCH), null);
  assert.equal(C.gradeText(Q.find((x) => x.kind === 'opinion'), 'hola', ctx.MATCH), null);
  assert.equal(C.gradeText(q2, 'doce', null), null);
  assert.equal(C.gradeText(q, 'Eduardo', ctx.MATCH, ['Eduardo']).correct, true);
  assert.equal(C.gradeText(q2, 'Eduardo', ctx.MATCH, ['Eduardo']).correct, false, 'el nombre solo vale en la del conductor');
});

// ---- Solapes: la interrupción cede ante eventos, hitos, avisos y modales; y los demás ceden ante ella ----
function makeUI(over = {}) {
  const stub = () => ({ addEventListener() {}, removeEventListener() {}, style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, textContent: '', innerHTML: '', hidden: true, setAttribute() {}, getAttribute() { return '0'; }, focus() {}, contains() { return false; }, querySelector() { return stub(); }, querySelectorAll() { return []; } });
  const st = { busySel: false, modals: [], results: null };
  const doc = {
    body: { appendChild() {}, contains() { return true; } },
    activeElement: null,
    createElement() { const e = stub(); e.style = { display: 'none' }; return e; },
    querySelector(sel) { return st.busySel && sel.includes('.sir-hito') ? {} : null; },
    querySelectorAll() { return st.modals; },
    getElementById(id) { return id === 'results-card' ? st.results : id === 'view-game' ? { style: {} } : null; },
    addEventListener() {}, removeEventListener() {}
  };
  const c = { console, document: doc, getComputedStyle: (e) => ({ display: (e && e.style && e.style.display) || 'block' }), setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, localStorage: { getItem() { return null; }, setItem() {} }, store: {}, saveStore() {}, Math, JSON, Array, Number, Object, ...over };
  vm.createContext(c);
  vm.runInContext(read('src/data/sir-questions.js') + ';' + read('src/utils/sir-interrupt.js') + ';' + read('src/ui/sir-interrupt.js') + ';this.U=SEQSirInterrupt;this.SIRQ=SIR_QUESTIONS;', c);
  return { U: c.U, st, c };
}

test('solapes: aplazamiento exacto (hito en la pregunta, aviso visible, sin siguiente)', () => {
  const { U, st, c } = makeUI({ SEQHitos: { hitoFor: (m, i) => (i === 10 ? { n: 10 } : null) } });
  const g = { mode: 'play', isDuel: false, totalQuestionsToPlay: 20, queue: new Array(20).fill(0), currentIdx: 0 };
  // Sin azar: en la partida marcada, la interrupción toca la pregunta 3 (primera posible).
  vm.runInContext('SEQSirInterruptCore.startGame = function (s) { return { state: s, at: 3 }; };', c);
  U.plan(g);
  g.currentIdx = 3; st.busySel = true;
  assert.equal(U.maybe(g, () => {}), false, 'aviso a la vista: cede');
  g.currentIdx = 3; st.busySel = false;
  assert.equal(U.maybe(g, () => {}), false, 'ya no es su pregunta: se aplazó a la 4');
  g.currentIdx = 4;
  assert.equal(U.maybe(g, () => {}), true, 'en la 4, libre: sale');
  assert.equal(U.isOpen(), true);
});

test('solapes: una pregunta con hito de Sir Edwards no lleva interrupción delante', () => {
  const { U, st, c } = makeUI({ SEQHitos: { hitoFor: (m, i) => (i === 3 ? { n: 3 } : null) } });
  const g = { mode: 'play', isDuel: false, totalQuestionsToPlay: 20, queue: new Array(20).fill(0), currentIdx: 0 };
  vm.runInContext('SEQSirInterruptCore.startGame = function (s) { return { state: s, at: 3 }; };', c);
  U.plan(g);
  g.currentIdx = 3;
  assert.equal(U.maybe(g, () => {}), false);
  g.currentIdx = 4;
  assert.equal(U.maybe(g, () => {}), true);
});

test('solapes: si no queda pregunta siguiente, se pierde sin penalizar', () => {
  const { U, st, c } = makeUI();
  const g = { mode: 'play', isDuel: false, totalQuestionsToPlay: 6, queue: new Array(6).fill(0), currentIdx: 0 };
  vm.runInContext('SEQSirInterruptCore.startGame = function (s) { return { state: s, at: 5 }; };', c);
  U.plan(g); g.currentIdx = 5; st.busySel = true;
  assert.equal(U.maybe(g, () => {}), false);
  st.busySel = false; g.currentIdx = 5;
  assert.equal(U.maybe(g, () => {}), false, 'perdida: ya no hay siguiente a la que aplazarla');
  assert.equal(U.isOpen(), false);
});

test('solapes: cede ante evento visible, evento pendiente, modal abierto y «última pregunta»', () => {
  const g = { mode: 'play', isDuel: false, totalQuestionsToPlay: 20, queue: new Array(20).fill(0), currentIdx: 7 };
  assert.equal(makeUI({ SEQSirEventsUI: { isVisible: () => true } }).U.busy(g), true, 'evento visible');
  assert.equal(makeUI({ sirEventsPending: () => true }).U.busy(g), true, 'evento en su espera de 450 ms');
  assert.equal(makeUI({ SEQRewardToast: { busy: () => true } }).U.busy(g), true, 'aviso de logro');
  assert.equal(makeUI({ SEQEncargosUI: { busy: () => true } }).U.busy(g), true, 'aviso de Encargo');
  assert.equal(makeUI({ SEQLucidezUnlock: { active: () => true } }).U.busy(g), true, 'solemne de Lucidez');
  const m = makeUI(); m.st.modals = [{ style: {} }];
  assert.equal(m.U.busy(g), true, 'modal abierto');
  const r = makeUI(); r.st.results = { style: { display: 'block' } };
  assert.equal(r.U.busy(g), true, 'tarjeta de resultados');
  assert.equal(makeUI().U.busy({ ...g, mode: 'survival', currentIdx: 19 }), true, 'última pregunta de Supervivencia');
  assert.equal(makeUI().U.busy({ ...g, mode: 'sudden_death', currentIdx: 19 }), true, 'última pregunta de Muerte Súbita');
  assert.equal(makeUI().U.busy(g), false, 'nada: libre');
});

test('solapes: con la tarjeta abierta, eventos, Encargos, bandeja y nextQuestion esperan (cableado)', () => {
  assert.match(read('src/state/sir-events.js'), /SEQSirInterrupt\.isOpen\(\)\) return true/);
  assert.match(read('src/state/sir-events.js'), /sirEventsPendingN\+\+/);
  assert.match(read('src/ui/encargos-ui.js'), /SEQSirInterrupt\.isOpen\(\)\) return true/);
  assert.match(read('src/online/inbox.js'), /SEQSirInterrupt\.isOpen\(\)/);
  assert.match(read('index.html'), /function nextQuestion\(\) \{\n  if \(SEQSirInterrupt\.isOpen\(\)\) return;/);
});

// ---- Parche 2.5: foco, aviso de conexión, tope de carga de Google y contadores enteros ----
test('foco: la tarjeta de Sir Edwards se registra en a11y.js (foco dentro, Tab atrapado, foco devuelto)', () => {
  assert.match(read('src/ui/a11y.js'), /window\.SEQA11y = \{[^}]*watch: watch/);
  assert.match(read('src/ui/sir-interrupt.js'), /SEQA11y\.watch\(el\)/);
  // simulación: a11y.js vigila el overlay creado tras la carga y lo trata como el modal de arriba
  let observed = null;
  const mk = () => ({ style: { display: 'none' }, classList: { contains: () => false }, querySelector: () => null, querySelectorAll: () => [], contains: () => false, hasAttribute: () => false, setAttribute() {} });
  const m = mk();
  const c = {
    console, getComputedStyle: (e) => ({ display: e.style.display }),
    MutationObserver: function (cb) { this.observe = (n) => { observed = n; }; },
    document: { readyState: 'complete', querySelectorAll: () => [], addEventListener() {}, activeElement: null, contains: () => true, body: {} }
  };
  c.window = c; vm.createContext(c);
  vm.runInContext(read('src/ui/a11y.js'), c);
  c.SEQA11y.watch(m);
  assert.equal(observed, m, 'el overlay nuevo se observa');
});

test('conexión: el aviso y «Reintentar» se limpian si vuelve la red con el botón ya pintado; Google tiene tope de carga; el Worker sin red no culpa a Google', () => {
  const src = read('src/online/online.js');
  assert.match(src, /clearGateNotice\(\); return; \}/);
  assert.match(src, /function clearGateNotice\(\) \{[\s\S]*?showGateRetry\(false\);/);
  assert.match(src, /GIS_TIMEOUT_MS = 12000/);
  assert.match(src, /err && err\.network \? MSG_NET : err && err\.status \? MSG_SERVER : MSG_LOAD/);
  assert.doesNotMatch(src.match(/var MSG_NET = '([^']*)'/)[1], /Google/);
});

test('contadores de Sir Edwards: enteros ≥ 0 (sin decimales, negativos ni NaN)', () => {
  const c = { console, localStorage: { getItem() { return null; }, setItem() {} } };
  vm.createContext(c); vm.runInContext(read('src/utils/store.js'), c);
  const out = (a, b) => Array.from(vm.runInContext('(()=>{const s=getDefaultStore();s.sirAnswered=' + a + ';s.sirCorrect=' + b + ';sanitizeStore(s);return [s.sirAnswered,s.sirCorrect]})()', c));
  assert.deepEqual(out('4.7', '-3'), [4, 0]);
  assert.deepEqual(out('NaN', "'7.9'"), [0, 7]);
  assert.deepEqual(out('5', '20'), [5, 20]);
});

test('desenlace: escena en grande con sello y frase; sonido propio en audio.js', () => {
  const ui = read('src/ui/sir-interrupt.js');
  for (const id of ['sir-int-stage', 'sir-int-verdict', 'sir-int-say', 'sir-int-go']) assert.ok(ui.includes(id), id);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(read('src/audio/audio.js'), /function playSirVerdictSound\(kind\)/);
  assert.match(read('src/audio/audio.js'), /function startQuillSound\(seconds\)/);
  assert.match(ui, /startQuillSound\(/);
  assert.match(ui, /stopQuillSound\(/);
  assert.match(read('styles/sir-interrupt.css'), /\.sir-int\.stage-on/);
});

test('respuesta resaltada: cada trampa tiene un fragmento `hl` que aparece en su frase de acierto y en la de fallo', () => {
  for (const q of Q.filter((x) => x.kind === 'trap')) {
    assert.ok(Array.isArray(q.hl) && q.hl.length >= 1, q.id);
    for (const text of [q.right, q.wrong]) {
      assert.ok(q.hl.some((h) => text.toLowerCase().includes(h.toLowerCase())), q.id + ' sin respuesta resaltable en: ' + text);
    }
  }
});

test('cada vez que se abre una pregunta con opciones se limpia el «is-done» de la anterior (si no, la segunda de la sesión no admitía respuesta)', () => {
  assert.match(read('src/ui/sir-interrupt.js'), /opts\.classList\.remove\('is-done'\);[^\n]*\n\s*opts\.classList\.add\('is-wait'\)/);
});

// ---- Ampliación a 40 preguntas especiales (20 originales sq01-sq29 intactas + 20 nuevas sq30-sq49) ----
const ORIGINAL_IDS = ['sq01', 'sq02', 'sq03', 'sq07', 'sq10', 'sq14', 'sq15', 'sq16', 'sq17', 'sq18', 'sq20', 'sq21', 'sq22', 'sq23', 'sq24', 'sq25', 'sq26', 'sq27', 'sq28', 'sq29'];
const NEW_IDS = Array.from({ length: 20 }, (_, i) => 'sq' + (30 + i));
const NEW_TRAPS = { sq30: 'Una hora', sq32: 'Un agujero', sq33: 'Jueves' };
const REQUIRED_TRAP = ['id', 'kind', 'q', 'a', 'alias', 'rj', 'hl', 'right', 'wrong'];
const REQUIRED_OP = ['id', 'kind', 'q', 'options', 'reactions'];

test('ampliación: 40 preguntas especiales, 20 originales intactas y 20 nuevas (3 trampas y 17 opiniones)', () => {
  assert.equal(Q.length, 40);
  assert.deepEqual(Q.filter((q) => ORIGINAL_IDS.includes(q.id)).map((q) => q.id).sort(), [...ORIGINAL_IDS].sort());
  const nuevas = Q.filter((q) => NEW_IDS.includes(q.id));
  assert.equal(nuevas.length, 20);
  assert.equal(Q.filter((q) => !ORIGINAL_IDS.includes(q.id) && !NEW_IDS.includes(q.id)).length, 0, 'no hay ids fuera de los dos grupos');
  assert.equal(nuevas.filter((q) => q.kind === 'trap').length, 3);
  assert.equal(nuevas.filter((q) => q.kind === 'opinion').length, 17);
  assert.equal(Q.filter((q) => q.kind === 'trap').length, 15);
  assert.equal(Q.filter((q) => q.kind === 'opinion').length, 25);
  assert.equal(new Set(Q.map((q) => q.id)).size, 40);
});

test('ampliación: las 20 originales conservan su texto exacto (huella)', () => {
  const orig = Q.filter((q) => ORIGINAL_IDS.includes(q.id));
  const byId = Object.fromEntries(orig.map((q) => [q.id, q]));
  assert.equal(byId.sq01.q, '¿Cuántos meses tienen 28 días?');
  assert.equal(byId.sq29.a, 'La letra «d»');
  assert.deepEqual(Array.from(byId.sq28.options), ['Muchísimo', 'Un poco', 'Ni lo notaría']);
  assert.equal(byId.sq24.right, 'Como tú. Eres el conductor. Impecable.');
});

test('ampliación: campos obligatorios en las nuevas y comillas españolas, sin emojis', () => {
  for (const q of Q.filter((x) => NEW_IDS.includes(x.id))) {
    for (const f of q.kind === 'trap' ? REQUIRED_TRAP : REQUIRED_OP) assert.ok(q[f] && (!Array.isArray(q[f]) || q[f].length), q.id + ' falta ' + f);
    const textos = [q.q, q.right, q.wrong, ...(q.options || []), ...(q.reactions || [])].filter(Boolean).join(' ');
    assert.ok(!/["“”]/.test(textos), q.id + ' comillas no españolas');
  }
});

test('ampliación: las tres trampas nuevas validan su respuesta y rechazan las erróneas', () => {
  for (const [id, a] of Object.entries(NEW_TRAPS)) {
    const q = Q.find((x) => x.id === id);
    assert.equal(q.a, a);
    assert.equal(C.gradeText(q, a, ctx.MATCH).correct, true, id);
    for (const t of q.alias) assert.equal(C.gradeText(q, t, ctx.MATCH).correct, true, id + ' alias: ' + t);
    for (const t of q.rj) assert.equal(C.gradeText(q, t, ctx.MATCH).correct, false, id + ' cebo: ' + t);
    assert.ok(!q.alias.some((t) => q.rj.includes(t)), id + ' alias y cebo se solapan');
  }
  const pastillas = Q.find((x) => x.id === 'sq30');
  assert.deepEqual(Array.from(pastillas.alias), ['1 hora', '60 minutos', '60 min', 'Sesenta minutos', '1 h']);
});

test('ampliación: cada opción de opinión muestra su reacción y nunca es correcta ni incorrecta', () => {
  const ops = Q.filter((x) => NEW_IDS.includes(x.id) && x.kind === 'opinion');
  for (const q of ops) {
    assert.equal(q.options.length, 3, q.id);
    assert.equal(q.reactions.length, 3, q.id);
    assert.deepEqual(Array.from(C.order(q, mulberry(3))), [0, 1, 2], q.id + ' orden escrito');
    for (let i = 0; i < q.options.length; i++) assert.deepEqual({ ...C.grade(q, i) }, { correct: null, reaction: q.reactions[i] }, q.id + ' opción ' + i);
    assert.equal(C.gradeText(q, q.options[0], ctx.MATCH), null, q.id + ' no se escribe');
  }
});

test('ampliación: las opiniones no tocan vidas, XP, ELO, precisión ni rachas (solo sirAnswered/sirCorrect)', () => {
  const ui = read('src/ui/sir-interrupt.js');
  assert.ok(!/(lives|xp|elo|streak|accuracy|totalCorrect|totalAnswered)/i.test(ui.replace(/\/\/.*$/gm, '').replace(/streak-banner|fx-streak/g, '')), 'la interrupción no menciona vidas/XP/ELO/racha');
  assert.match(ui, /if \(g\.correct === true\) store\.sirCorrect/);
  for (const q of Q.filter((x) => x.kind === 'opinion')) assert.equal(C.grade(q, 0).correct, null, q.id);
});

test('ampliación: la bolsa recorre las 40 sin repetir y las nuevas pueden salir', () => {
  const rng = mulberry(21); let st = C.newState(); const seen = [];
  for (let i = 0; i < 40; i++) { const r = C.pick(st, Q, rng); st = r.state; seen.push(r.question.id); }
  assert.equal(new Set(seen).size, 40);
  for (const id of NEW_IDS) assert.ok(seen.includes(id), id + ' no salió');
  // una bolsa guardada con las 20 antiguas solo ofrece ya las nuevas
  const old = { n: 0, hit: -1, done: false, bag: [...ORIGINAL_IDS], last: 'sq29' };
  const r = C.pick(old, Q, mulberry(4));
  assert.ok(NEW_IDS.includes(r.question.id));
});

test('ampliación: sin duplicados entre las nuevas y el resto de bancos', () => {
  const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();
  const bancos = ['src/data/questions.js', 'src/data/lucidez.js', 'src/data/questions-retired.js'].map(read).join('\n');
  const bancoN = norm(bancos);
  const nuevas = Q.filter((x) => NEW_IDS.includes(x.id));
  for (const q of nuevas) assert.ok(!bancoN.includes(norm(q.q)), q.id + ' repite un enunciado de otro banco');
  const originales = Q.filter((x) => ORIGINAL_IDS.includes(x.id)).map((x) => norm(x.q));
  for (const q of nuevas) assert.ok(!originales.includes(norm(q.q)), q.id + ' repite una original');
  // las cuatro descartadas por coincidir con Lucidez Mental no vuelven
  const todo = norm(JSON.stringify(Q.map((x) => x.q)));
  for (const frag of ['adelantas al corredor', 'cinco maquinas', 'cuatro hijas', 'retrato']) assert.ok(!todo.includes(frag), 'reincorporada: ' + frag);
});

test('ampliación: sq31 es la opinión del botón «No pulsar» y no conserva campos de trampa', () => {
  const q = Q.find((x) => x.id === 'sq31');
  assert.equal(q.kind, 'opinion');
  assert.equal(q.q, 'Si encontraras un botón que dice «No pulsar», ¿qué harías?');
  assert.deepEqual(Array.from(q.options), ['Lo pulsaría', 'Me alejaría', 'Preguntaría por qué']);
  assert.deepEqual(Array.from(q.reactions), ['Una curiosidad admirable. Y una esperanza de vida preocupante.', 'La prudencia. Una virtud que rara vez protagoniza aventuras.', 'Qué detalle tan inusual: informarse antes del desastre.']);
  for (const f of ['a', 'alias', 'rj', 'hl', 'right', 'wrong']) assert.ok(!(f in q), 'sobra el campo ' + f);
  for (let i = 0; i < 3; i++) assert.deepEqual({ ...C.grade(q, i) }, { correct: null, reaction: q.reactions[i] });
});
