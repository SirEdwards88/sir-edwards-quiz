// SirEdwards Quiz — Eventos Sorpresa (2.2): enganche con la partida. Script clásico.
// Se llama tras cada respuesta (updateAnswerStreak). Lee la racha que YA existe (`answerStreak`) y la hora local; el
// estado de eventos vive en la propia partida (propiedad no enumerable, no se guarda ni se sincroniza) y se reinicia al
// empezar otra. No escribe en store ni en currentGame (salvo ese estado), no toca temporizadores ni da nada.
//
// Modos: los de juego en solitario. Duelo y Retos nunca (tienen su propia pantalla y no pasan por aquí).

const SIR_EVENT_MODES = ['play', 'survival', 'sudden_death', 'timetrial', 'mental_calc', 'review', 'lucidez_mental'];

function sirEventsGameState(g) {
  if (!g._sev) Object.defineProperty(g, '_sev', { value: SEQSirEvents.newState(), writable: true, enumerable: false, configurable: true });
  return g._sev;
}
// ¿Es la última pregunta, o queda poco tiempo? Entonces no se interrumpe el final de la partida.
function sirEventsIsLast(g, nowMs) {
  if (g.mode === 'timetrial') return typeof timeTrialEndTime === 'number' && timeTrialEndTime > 0 && timeTrialEndTime - nowMs < 8000;
  const total = Number(g.totalQuestionsToPlay) > 0 ? Number(g.totalQuestionsToPlay) : 30;
  return Number(g.currentIdx) >= total - 1;
}

// Deshace el consumo del evento (límite, cooldown, hito) si no llegó a verse; el recuento de respuestas se conserva.
function sirEventsRollback(st, snap) {
  const answers = st.answers;
  Object.assign(st, JSON.parse(snap)); st.answers = answers;
}
const SIR_EVENT_DELAY_MS = 450; // tras la respuesta: se espera a que aparezca el comentario y se asiente el diseño

function sirEventsOnAnswer(correct) {
  try {
    const g = typeof currentGame !== 'undefined' ? currentGame : null;
    if (!g || g.isDuel || SIR_EVENT_MODES.indexOf(g.mode) === -1) return null;
    if (typeof SEQSirEvents === 'undefined' || typeof SEQSirEventsUI === 'undefined') return null;
    const now = Date.now();
    const st = sirEventsGameState(g), snap = JSON.stringify(st);
    const ev = SEQSirEvents.evaluate(st, {
      nowMs: now,
      hour: new Date(now).getHours(),                       // hora LOCAL del dispositivo
      streak: typeof answerStreak === 'number' ? answerStreak : 0,
      correct: correct === true,
      last: sirEventsIsLast(g, now),
      blocked: typeof document !== 'undefined' && document.hidden === true
    }, Math.random);
    if (!ev) return null;
    // Se muestra un instante después, ya asentado el diseño de la pantalla, y solo si sigue la misma partida, sin
    // resultados a la vista y sin tapar controles ni relojes. Si no, es como si no hubiera salido.
    setTimeout(function () {
      try {
        const done = typeof document !== 'undefined' && (document.getElementById('results-card') || {}).style && document.getElementById('results-card').style.display === 'block';
        if (typeof currentGame === 'undefined' || currentGame !== g || done || !SEQSirEventsUI.show(ev)) sirEventsRollback(st, snap);
      } catch (e) { sirEventsRollback(st, snap); }
    }, SIR_EVENT_DELAY_MS);
    return ev;
  } catch (e) { return null; }
}
