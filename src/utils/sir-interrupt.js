// SirEdwards Quiz 2.5 — Preguntas de Sir Edwards: motor PURO (sin DOM, sin store, sin reloj).
// Decide CUÁNDO interrumpe (una por cada bloque de 3 partidas, en una partida y un hueco al azar), CUÁL pregunta toca (bolsa sin
// repetición hasta agotarlas) y cómo se corrige. Quien lo usa (src/ui/sir-interrupt.js) guarda el estado y pinta la interrupción.
// Script clásico (scope global), sin dependencias.

const SEQSirInterruptCore = (function () {
  'use strict';

  var ELIGIBLE = ['play', 'survival', 'sudden_death', 'review'];
  var BLOCK = 3;            // una interrupción por cada 3 partidas
  var FIRST_IDX = 3;        // nunca antes de la 4.ª pregunta (índice 3)…
  var MIN_TOTAL = 6;        // …ni en partidas cortas (Repaso con pocas falladas)
  var LAST_WINDOW = 14;     // y en las partidas largas (Supervivencia/Súbita) sale pronto, no hacia el final que quizá no llegue

  function newState() { return { n: 0, hit: -1, done: false, bag: [], last: null }; }

  function rint(rng, n) { return Math.min(n - 1, Math.floor(rng() * n)); }

  function eligible(mode, isDuel) { return !isDuel && ELIGIBLE.indexOf(mode) !== -1; }

  // Al empezar una partida elegible. Devuelve { state, at }: `at` es el índice de pregunta ANTE EL que interrumpe (o null).
  // `state` es una copia nueva (no muta la recibida). Las partidas no elegibles no cuentan para el bloque.
  function startGame(state, game, rng) {
    var s = JSON.parse(JSON.stringify(state || newState()));
    if (!game || !eligible(game.mode, game.isDuel)) return { state: s, at: null };
    if (s.hit < 0 || s.hit >= BLOCK || s.n < 0 || s.n >= BLOCK) { s.hit = rint(rng, BLOCK); s.done = false; s.n = 0; }   // bloque nuevo (o estado guardado raro)
    var total = Math.floor(Number(game.total) || 0);
    var host = total >= MIN_TOTAL;
    var due = !s.done && s.n >= s.hit && host;
    var at = null;
    if (due) {
      var lo = FIRST_IDX, hi = Math.min(total - 2, LAST_WINDOW);
      at = hi <= lo ? lo : lo + rint(rng, hi - lo + 1);
    }
    s.n++;
    if (s.n >= BLOCK) { s.n = 0; s.hit = -1; s.done = false; }
    return { state: s, at: at };
  }

  // La interrupción llegó a mostrarse: el bloque queda cumplido.
  function markShown(state) {
    var s = JSON.parse(JSON.stringify(state || newState()));
    s.done = true;
    return s;
  }

  // Elige la pregunta: bolsa sin repetición hasta agotarlas; nunca la misma dos veces seguidas al recomenzar.
  function pick(state, questions, rng) {
    var s = JSON.parse(JSON.stringify(state || newState()));
    var ids = questions.map(function (q) { return q.id; });
    var bag = (s.bag || []).filter(function (id) { return ids.indexOf(id) !== -1; });
    var left = questions.filter(function (q) { return bag.indexOf(q.id) === -1; });
    if (!left.length) { bag = []; left = questions.filter(function (q) { return q.id !== s.last; }); if (!left.length) left = questions.slice(); }
    var q = left[rint(rng, left.length)];
    bag.push(q.id);
    s.bag = bag; s.last = q.id;
    return { state: s, question: q };
  }

  // Orden en que se muestran las opciones: en las de «trampa» se barajan (la correcta no va siempre en el mismo sitio);
  // en las de opinión se respeta el orden escrito. Devuelve un array de índices originales.
  function order(q, rng) {
    var idx = (q.options || []).map(function (_, i) { return i; });
    if (q.kind !== 'trap') return idx;
    for (var i = idx.length - 1; i > 0; i--) { var j = rint(rng, i + 1); var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return idx;
  }

  // Trampas (2.5): corrección de la respuesta ESCRITA. `matcher(texto, preguntaParaCorregir)` es isMatchWithAlias (answer-alias.js);
  // `extraAlias` admite formas extra (p. ej. el nombre del jugador en «¿cómo se llama el conductor?»).
  function gradeText(q, text, matcher, extraAlias) {
    if (!q || q.kind !== 'trap' || typeof matcher !== 'function') return null;
    var t = String(text == null ? '' : text).trim();
    if (!t) return null;
    var ok = false;
    try {
      ok = !!matcher(t, { q: q.q, a: q.a, alias: (q.alias || []).concat(q.id === 'sq24' && extraAlias ? extraAlias : []), rj: q.rj || [], strict: true });
    } catch (e) { ok = false; }
    return { correct: ok, reaction: ok ? q.right : q.wrong };
  }

  // Opinión: corrige la opción elegida (índice original). correct: null (no hay mala). Las trampas se corrigen con gradeText.
  function grade(q, optionIdx) {
    if (!q || q.kind !== 'opinion' || !q.options || optionIdx < 0 || optionIdx >= q.options.length) return null;
    return { correct: null, reaction: q.reactions[optionIdx] };
  }

  return { ELIGIBLE: ELIGIBLE, BLOCK: BLOCK, newState: newState, eligible: eligible, startGame: startGame, markShown: markShown, pick: pick, order: order, grade: grade, gradeText: gradeText };
})();
