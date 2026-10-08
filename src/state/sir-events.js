// SirEdwards Quiz — Eventos Sorpresa (2.2): enganche con la partida. Script clásico.
// Se llama tras cada respuesta (updateAnswerStreak). Lee la racha que YA existe (`answerStreak`) y la hora local; el
// estado de eventos vive en la propia partida (propiedad no enumerable, no se guarda ni se sincroniza) y se reinicia al
// empezar otra. No toca currentGame (salvo ese estado), ni temporizadores, puntuación o XP. Lo ÚNICO que escribe fuera de la
// partida son las bolsas de frases rotativas (store.phraseBags['sev_…'], las mismas que usa pickRotatingPhrase).
//
// Modos: los de juego en solitario SIN reloj de partida (Lucidez Mental solo en su Fase I: las fases II y III llevan reloj). Contrarreloj y Cálculo Mental nunca (ahí el centro de la pantalla es
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

// ---- Memoria local entre partidas (solo en este dispositivo, fuera del store: ni se guarda en la cuenta ni va al Worker) ----
// { day, night, visit, weak: instante (ms) del último evento de ese tipo; lastplay: última partida solo de esta pantalla }
const SEV_RECENT_KEY = 'siredwards_quiz_sev_recent';
let sevRecentMem = {};
function sevRecentRead() {
  try { const o = JSON.parse(localStorage.getItem(SEV_RECENT_KEY)); if (o && typeof o === 'object' && !Array.isArray(o)) return o; } catch (e) {}
  return sevRecentMem;
}
function sevRecentWrite(o) { sevRecentMem = o; try { localStorage.setItem(SEV_RECENT_KEY, JSON.stringify(o)); } catch (e) {} }

// Una vez por partida: anota que se juega y decide si es un REGRESO (entre 4 y 20 días sin jugar; con 3 semanas o más la carta
// semanal ya recibe a quien vuelve, y si la presentación o la carta se han visto en esta sesión, no se repite el recibimiento).
function sirEventsTouchPlay(g, now) {
  if (g._sevPlay) return;
  Object.defineProperty(g, '_sevPlay', { value: true, enumerable: false, configurable: true });
  const r = sevRecentRead(), prev = Number(r.lastplay) || 0;
  const days = prev > 0 ? (now - prev) / 86400000 : 0;
  let introShown = false;
  try { introShown = typeof SEQEncargosIntro !== 'undefined' && SEQEncargosIntro.shownThisSession(); } catch (e) {}
  Object.defineProperty(g, '_sevCome', { value: days >= 4 && days < 21 && !introShown, enumerable: false, configurable: true, writable: true });
  r.lastplay = now; sevRecentWrite(r);
}

// Categoría más floja del jugador (≥25 respuestas, ≥15 puntos por debajo de su media), solo si `q` es de esa categoría.
function sirEventsWeakCategory(q) {
  try {
    if (!q || !q.cat || typeof getQuestionAccuracyStats !== 'function') return '';
    const all = Object.values(getQuestionAccuracyStats()).filter(function (x) { return x.answered >= 25; });
    if (all.length < 3) return '';
    let c = 0, a = 0, weakest = null;
    all.forEach(function (x) { c += x.correct; a += x.answered; if (!weakest || x.correct / x.answered < weakest.correct / weakest.answered) weakest = x; });
    if (!weakest || weakest.cat !== q.cat) return '';
    if (c / a - weakest.correct / weakest.answered < 0.15) return '';
    return typeof categoryLabel === 'function' ? String(categoryLabel(q.cat)) : String(q.cat);
  } catch (e) { return ''; }
}

// ¿Cede el evento? Si otro aviso está a la vista o a punto de salir, no se pisan: el hito, «Última vida», un aviso de Encargo, la
// tarjeta de resultados, el fin de la partida o un reloj en marcha (Lucidez Mental, fases II y III). Un hito de racha que cede puede
// salir en la respuesta siguiente (el margen de 1 ya existe).
function sirEventsShouldYield(g) {
  try {
    const d = typeof document !== 'undefined' ? document : null;
    if (d && d.querySelector && d.querySelector('.fx-lastlife-banner, .sir-hito, .encargos-toast.show')) return true;
    if (g.mode === 'lucidez_mental' && Number(g.currentIdx) >= 9) return true;
    if (g.mode === 'survival' && Number(g.lives) <= 0) return true;
    if (typeof SEQHitos !== 'undefined' && SEQHitos.hitoFor && SEQHitos.hitoFor(g.mode, Number(g.currentIdx) + 1)) return true;
  } catch (e) {}
  return false;
}

function recentOkWeak(recent, now) { return !(typeof recent.weak === 'number' && now - recent.weak < SEQSirEvents.WEAK_MS); }

function sirEventsOnAnswer(correct, q) {
  try {
    const g = typeof currentGame !== 'undefined' ? currentGame : null;
    if (!g || g.isDuel) return null;
    const now = Date.now();
    sirEventsTouchPlay(g, now);
    if (SIR_EVENT_MODES.indexOf(g.mode) === -1) return null;
    if (typeof SEQSirEvents === 'undefined' || typeof SEQSirEventsUI === 'undefined') return null;
    const st = sirEventsGameState(g), snap = JSON.stringify(st), undo = [];
    // Frases con bolsa persistente (store.phraseBags): no se repite ninguna hasta haberlas visto todas, ni entre partidas.
    const rotate = typeof pickRotatingPhrase === 'function' && typeof store === 'object' && store ? function (key, list) {
      const k = 'sev_' + key, bag = store.phraseBags && store.phraseBags[k], last = store.lastPhraseIndex && store.lastPhraseIndex[k];
      undo.push({ k: k, bag: Array.isArray(bag) ? bag.slice() : undefined, last: last });
      return pickRotatingPhrase(k, list);
    } : undefined;
    const streak = typeof answerStreak === 'number' ? answerStreak : 0;
    // Récord personal: solo con una marca ya decente (la anterior ≥ 8) y con unas cuantas partidas jugadas (≥ 15); no en los primeros días,
    // cuando casi cada partida mejora la marca. `bestBefore` se arrastra por partida.
    const best = typeof store === 'object' && store ? Number(store.bestStreak) || 0 : 0;
    if (st.bestBefore === undefined) st.bestBefore = best;
    const record = correct === true && g.mode !== 'review' && streak >= 9 && streak === best && best > st.bestBefore && st.bestBefore >= 8 && (Number(store.gamesPlayed) || 0) >= 15 ? streak : 0;
    st.bestBefore = Math.max(st.bestBefore, best);
    const recent = sevRecentRead();
    const ev = SEQSirEvents.evaluate(st, {
      nowMs: now,
      hour: new Date(now).getHours(),                       // hora LOCAL del dispositivo
      streak: streak,
      correct: correct === true,
      last: sirEventsIsLast(g),
      blocked: typeof document !== 'undefined' && document.hidden === true,
      noBroken: g.mode === 'review' || g.mode === 'sudden_death',   // en Repaso no hay racha; en Muerte Súbita el fallo ya termina la partida
      record: record,
      comeback: g._sevCome === true,
      weakCat: correct === true && g.mode === 'play' && !st.shown.weak && recentOkWeak(recent, now) ? sirEventsWeakCategory(q) : '',
      recent: recent,
      rotate: rotate
    }, Math.random);
    if (!ev) return null;
    // Se muestra un instante después, ya asentado el diseño de la pantalla, y solo si sigue la misma partida, sin
    // resultados a la vista y sin tapar controles ni relojes. Si no, es como si no hubiera salido.
    setTimeout(function () {
      try {
        const done = typeof document !== 'undefined' && (document.getElementById('results-card') || {}).style && document.getElementById('results-card').style.display === 'block';
        const shown = typeof currentGame !== 'undefined' && currentGame === g && !done && !sirEventsShouldYield(g) && SEQSirEventsUI.show(ev);
        if (!shown) { sirEventsRollback(st, snap, undo); return; }
        // Logros «Noctámbulo» / «Primera Luz»: haber encontrado a Sir Edwards nocturno / diurno (se evalúan al acabar la partida).
        try { if (ev.type === 'night') store.hasCompletedNightGame = true; else if (ev.type === 'day') store.hasCompletedMorningGame = true; } catch (e) {}
        if (ev.type === 'day' || ev.type === 'night' || ev.type === 'visit' || ev.type === 'weak') { const r = sevRecentRead(); r[ev.type] = Date.now(); sevRecentWrite(r); }
      } catch (e) { sirEventsRollback(st, snap, undo); }
    }, SIR_EVENT_DELAY_MS);
    return ev;
  } catch (e) { return null; }
}
