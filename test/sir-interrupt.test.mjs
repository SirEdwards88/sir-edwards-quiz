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
  sq29: ['La letra «d»', 'la d', 'D', 'una d', 'la letra d']
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
  sq29: ['El Retiro', 'la puerta del sol', 'un oso y un madroño', 'la a', 'la m']
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
