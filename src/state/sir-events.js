// SirEdwards Quiz — Eventos Sorpresa (2.2): enganche con la partida. Script clásico.
// Se llama tras cada respuesta (updateAnswerStreak). Lee la racha que YA existe (`answerStreak`) y la hora local; el
// estado de eventos vive en la propia partida (propiedad no enumerable, no se guarda ni se sincroniza) y se reinicia al
// empezar otra. No toca currentGame (salvo ese estado), ni temporizadores, puntuación o XP. Lo ÚNICO que escribe fuera de la
// partida son las bolsas de frases rotativas (store.phraseBags['sev_…'], las mismas que usa pickRotatingPhrase).
//
// Modos: los de juego en solitario SIN reloj de partida. Contrarreloj y Cálculo Mental nunca (ahí el centro de la pantalla es
// del aviso de ±segundos y cada segundo cuenta), ni Duelo ni Retos (tienen su propia pantalla y no pasan por aquí).

const SIR_EVENT_MODES = ['play', 'survival', 'sudden_death', 'review', 'lucidez_mental'];

function sirEventsGameState(g) {
  if (!g._sev) Object.defineProperty(g, '_sev', { value: SEQSirEvents.newState(), writable: true, enumerable: false, configurable: true });
  return g._sev;
}
// ¿Es la última pregunta? Entonces no se interrumpe el final de la partida.
function sirEventsIsLast(g) {
  const total = Number(g.totalQuestionsToPlay) > 0 ? Number(g.totalQuestionsToPlay) : 30;
  return Number(g.currentIdx) >= total - 1;
}

// Deshace el consumo del evento (límite, cooldown, hito) si no llegó a verse; el recuento de respuestas se conserva.
function sirEventsRollback(st, snap, undo) {
  const answers = st.answers;
  Object.assign(st, JSON.parse(snap)); st.answers = answers;
  // ...y devuelve a la bolsa de frases la que se había sacado y no llegó a verse.
  (undo || []).slice().reverse().forEach(function (u) {
    if (!store.phraseBags) store.phraseBags = {};
    if (!store.lastPhraseIndex) store.lastPhraseIndex = {};
    if (u.bag === undefined) delete store.phraseBags[u.k]; else store.phraseBags[u.k] = u.bag;
    if (u.last === undefined) delete store.lastPhraseIndex[u.k]; else store.lastPhraseIndex[u.k] = u.last;
  });
}
const SIR_EVENT_DELAY_MS = 450; // tras la respuesta: se espera a que aparezca el comentario y se asiente el diseño

function sirEventsOnAnswer(correct) {
  try {
    const g = typeof currentGame !== 'undefined' ? currentGame : null;
    if (!g || g.isDuel || SIR_EVENT_MODES.indexOf(g.mode) === -1) return null;
    if (typeof SEQSirEvents === 'undefined' || typeof SEQSirEventsUI === 'undefined') return null;
    const now = Date.now();
    const st = sirEventsGameState(g), snap = JSON.stringify(st), undo = [];
    // Frases con bolsa persistente (store.phraseBags): no se repite ninguna hasta haberlas visto todas, ni entre partidas.
    const rotate = typeof pickRotatingPhrase === 'function' && typeof store === 'object' && store ? function (key, list) {
      const k = 'sev_' + key, bag = store.phraseBags && store.phraseBags[k], last = store.lastPhraseIndex && store.lastPhraseIndex[k];
      undo.push({ k: k, bag: Array.isArray(bag) ? bag.slice() : undefined, last: last });
      return pickRotatingPhrase(k, list);
    } : undefined;
    const ev = SEQSirEvents.evaluate(st, {
      nowMs: now,
      hour: new Date(now).getHours(),                       // hora LOCAL del dispositivo
      streak: typeof answerStreak === 'number' ? answerStreak : 0,
      correct: correct === true,
      last: sirEventsIsLast(g),
      blocked: typeof document !== 'undefined' && document.hidden === true,
      rotate: rotate
    }, Math.random);
    if (!ev) return null;
    // Se muestra un instante después, ya asentado el diseño de la pantalla, y solo si sigue la misma partida, sin
    // resultados a la vista y sin tapar controles ni relojes. Si no, es como si no hubiera salido.
    setTimeout(function () {
      try {
        const done = typeof document !== 'undefined' && (document.getElementById('results-card') || {}).style && document.getElementById('results-card').style.display === 'block';
        if (typeof currentGame === 'undefined' || currentGame !== g || done || !SEQSirEventsUI.show(ev)) sirEventsRollback(st, snap, undo);
      } catch (e) { sirEventsRollback(st, snap, undo); }
    }, SIR_EVENT_DELAY_MS);
    return ev;
  } catch (e) { return null; }
}
