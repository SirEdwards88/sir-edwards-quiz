// SirEdwards Quiz — Encargos (2.2): estado semanal, reparto de recompensas y avisos. Script clásico.
//
// Datos en el store (la clave local `siredwards_quiz_v1_0_data` no cambia; solo se añaden dos campos):
//   store.encargos        = { w: 'YYYY-Www', p: <progreso de esa semana> }   (se reinicia al cambiar de semana)
//   store.encargosClaimed = ['<semana>:m:<id>', '<semana>:b', '<semana>:g:<id>', …]  claves ya cobradas (sincronizadas)
//
// Garantías:
//   · Cada clave se cobra UNA sola vez: antes de cualquier cambio se relee lo guardado por otras pestañas y se une
//     (progreso: máximo por contador; claves: unión), así dos pestañas no pagan dos veces ni se pisan.
//   · Sin red y sin cuenta funciona igual; el servidor solo valida las claves al sincronizar (ver online.js).
//   · El XP respeta el nivel máximo y el tope de XP del cliente; la clave se cobra aunque no haya XP que dar.
//   · Los avisos se agrupan: durante la partida solo avisa al COMPLETAR; al terminar, un único «Encargo avanzado».
//
// Necesita: encargos-core.js, encargos-progress.js, y los globales del juego (store, saveStore, getLevelData, SEQStreakXp).

const STORE_KEY_ENCARGOS = 'siredwards_quiz_v1_0_data';
const ENCARGOS_CLAIMED_MAX = 120;
let encargosGameSnap = null; // avance de cada misión al empezar a contar en la partida en curso

function encargosNowMs() { return Date.now(); }
function encargosLocalDay(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Las claves empiezan por la semana ISO, así que ordenarlas como texto las ordena por antigüedad.
function encargosCleanClaimed(list) {
  const seen = {}, out = [];
  (Array.isArray(list) ? list : []).forEach(function (k) {
    if (typeof k === 'string' && k.length <= 40 && !seen[k] && SEQEncargos.parseKey(k)) { seen[k] = true; out.push(k); }
  });
  out.sort();
  return out.slice(-ENCARGOS_CLAIMED_MAX);
}

// Une lo que haya guardado (otra pestaña) con lo que hay en memoria. Devuelve true si aparecieron claves nuevas.
function encargosAbsorbStorage() {
  let stored = null;
  try { const raw = localStorage.getItem(STORE_KEY_ENCARGOS); if (raw) stored = JSON.parse(raw); } catch (e) { stored = null; }
  if (!stored || typeof stored !== 'object') return false;
  let newKeys = false;
  const mine = Array.isArray(store.encargosClaimed) ? store.encargosClaimed : [];
  const theirs = encargosCleanClaimed(stored.encargosClaimed);
  const have = {}; mine.forEach(function (k) { have[k] = true; });
  theirs.forEach(function (k) { if (!have[k]) newKeys = true; });
  if (newKeys) {
    store.encargosClaimed = encargosCleanClaimed(mine.concat(theirs));
    // Otra pestaña cobró XP que esta no ha visto: se adopta el mayor para no pisarlo al guardar.
    const sx = Number(stored.xp);
    if (isFinite(sx) && sx > store.xp) store.xp = Math.min(Math.floor(sx), SEQStreakXp.XP_CAP);
  }
  const se = stored.encargos;
  if (se && typeof se === 'object' && typeof se.w === 'string') {
    const cur = store.encargos && store.encargos.w;
    if (!cur || se.w > cur) store.encargos = { w: se.w, p: SEQEncargosProgress.normalize(se.p) };
    else if (se.w === cur) store.encargos.p = SEQEncargosProgress.merge(store.encargos.p, se.p);
  }
  return newKeys;
}

// Deja `store.encargos` apuntando a la semana actual (reinicia el progreso si ha cambiado la semana).
function encargosEnsureWeek(nowMs) {
  if (!Array.isArray(store.encargosClaimed)) store.encargosClaimed = [];
  const week = SEQEncargos.weekIdOf(SEQEncargos.weekIndexAt(nowMs == null ? encargosNowMs() : nowMs));
  const e = store.encargos;
  if (!e || typeof e !== 'object' || typeof e.w !== 'string' || SEQEncargos.weekIndexOfId(e.w) === null) {
    store.encargos = { w: week, p: SEQEncargosProgress.emptyProgress() };
  } else if (e.w < week) {
    store.encargos = { w: week, p: SEQEncargosProgress.emptyProgress() };
    encargosGameSnap = null;
  } else {
    e.p = SEQEncargosProgress.normalize(e.p); // si el reloj retrocede (e.w > week) se sigue con la semana guardada
  }
  return store.encargos;
}

function encargosActiveIds(week) {
  const idx = SEQEncargos.weekIndexOfId(week);
  return { normals: SEQEncargos.missionsForWeek(idx), great: SEQEncargos.greatForWeek(idx) };
}
function encargosIsClaimed(key) { return Array.isArray(store.encargosClaimed) && store.encargosClaimed.indexOf(key) !== -1; }

// Cobra una clave (si no estaba) y da el XP. Devuelve el XP realmente sumado, o -1 si ya estaba cobrada.
function encargosClaim(key, xp) {
  if (encargosIsClaimed(key)) return -1;
  store.encargosClaimed = encargosCleanClaimed((store.encargosClaimed || []).concat([key]));
  let gained = 0;
  if (getLevelData(store.xp) < 30) {
    const before = store.xp;
    store.xp = Math.min(before + xp, SEQStreakXp.XP_CAP);
    gained = store.xp - before;
  }
  return gained;
}

// Cobra todo lo completado y aún no cobrado. Devuelve los hitos nuevos [{kind:'m'|'b'|'g', id, xp, title}] (puede ir vacío).
function encargosSettle() {
  const e = encargosEnsureWeek();
  const act = encargosActiveIds(e.w);
  const events = [];
  const P = SEQEncargosProgress, C = SEQEncargos;
  act.normals.forEach(function (id) {
    if (!P.evaluate(id, e.p).done) return;
    const key = C.keyMission(e.w, id);
    if (encargosClaim(key, C.XP_MISSION) !== -1) events.push({ kind: 'm', id: id, xp: C.XP_MISSION, title: C.NORMAL_BY_ID[id].titulo });
  });
  if (act.normals.every(function (id) { return encargosIsClaimed(C.keyMission(e.w, id)); })) {
    if (encargosClaim(C.keyBonus(e.w), C.XP_BONUS) !== -1) events.push({ kind: 'b', id: null, xp: C.XP_BONUS, title: 'Encargos semanales' });
  }
  if (P.evaluate(act.great, e.p).done) {
    if (encargosClaim(C.keyGreat(e.w, act.great), C.XP_GREAT) !== -1) events.push({ kind: 'g', id: act.great, xp: C.XP_GREAT, title: C.GREAT_BY_ID[act.great].titulo });
  }
  return events;
}

// Remate de Sir Edwards al saldar (sale al azar entre los de su tipo): m = un encargo, b = los de la semana, g = el Gran Encargo.
const ENCARGOS_QUIPS = {
  m: ['Cumplido; no te acostumbres a los elogios.', 'Eficiencia sin aspavientos, como debe ser.', 'Anotado. Sin fanfarrias.', 'Saldado. Empiezo a perder motivos para quejarme.'],
  b: ['Sigo sin aplaudir.', 'La semana, por una vez, te debe algo.', 'Semana en orden. Qué poco común.', 'Todo cobrado. Hasta el lunes, la paz.'],
  g: ['La ambición tiene sus recompensas.', 'Ahí va algo digno de mención.', 'Eso sí ha tenido mérito. Lo digo una vez.', 'El Gran Encargo, cobrado. Tomo nota con mi mejor pluma.']
};
function encargosQuip(kind) {
  const l = ENCARGOS_QUIPS[kind] || ENCARGOS_QUIPS.g;
  // Con bolsa (sin repetir hasta agotar) cuando existe pickRotatingPhrase; si no, al azar.
  try { if (typeof pickRotatingPhrase === 'function' && typeof store === 'object' && store) { const t = pickRotatingPhrase('encargos_quip_' + kind, l); if (t) return t; } } catch (e) {}
  return l[Math.floor(Math.random() * l.length)];
}
function encargosToastText(ev, quip) {
  const k = ev.kind === 'm' ? 'Encargo saldado' : ev.kind === 'b' ? 'Encargos saldados' : 'Gran Encargo cobrado';
  return k + '. +' + ev.xp + ' XP. ' + quip;
}
function encargosToastEvents(events) {
  if (!events.length || typeof SEQEncargosUI === 'undefined') return;
  events.forEach(function (ev) {
    const q = encargosQuip(ev.kind);
    const o = ev.kind === 'm' ? { kicker: 'Encargo saldado', name: ev.title, aux: '+' + ev.xp + ' XP', quip: q }
      : ev.kind === 'b' ? { kicker: 'Encargos saldados', name: ev.title, aux: '+' + ev.xp + ' XP', quip: q }
      : { kicker: 'Gran Encargo cobrado', name: ev.title, aux: '+' + ev.xp + ' XP', quip: q };
    SEQEncargosUI.toast(encargosToastText(ev, q), ev.kind === 'g' ? 'great' : 'done', ev.title, o);
  });
}

// Avance actual de las misiones activas: { id: cur }.
function encargosSnapshot() {
  const e = encargosEnsureWeek(), act = encargosActiveIds(e.w), s = {};
  act.normals.concat([act.great]).forEach(function (id) { s[id] = SEQEncargosProgress.evaluate(id, e.p).cur; });
  return s;
}

// Aplica un cambio al progreso con todas las garantías: relee lo guardado, aplica, cobra, guarda y avisa.
// Los avisos de Encargo saldado que salen a mitad de partida se guardan aquí y se enseñan al terminarla (o al volver a Inicio).
let encargosPendingEvents = [];
function encargosMutate(fn, deferToast) {
  try {
    encargosEnsureWeek();
    encargosAbsorbStorage();
    encargosEnsureWeek();
    if (!encargosGameSnap) encargosGameSnap = encargosSnapshot();
    fn(store.encargos.p);
    const events = encargosSettle();
    if (events.length) { saveStore(false); if (deferToast) encargosPendingEvents = encargosPendingEvents.concat(events); else encargosToastEvents(events); }
    encargosRefreshUi();
    return events;
  } catch (err) { console.warn('Encargos: no se pudo actualizar.', err); return []; }
}

// Si la pantalla de Encargos o la tira de Inicio están a la vista, se repintan con el avance nuevo.
function encargosRefreshUi() {
  if (typeof document === 'undefined' || typeof SEQEncargosUI === 'undefined') return;
  try {
    const on = (id) => { const v = document.getElementById(id); return !!(v && v.classList.contains('active')); };
    if (on('view-encargos')) SEQEncargosUI.renderScreen();
    if (on('view-home')) SEQEncargosUI.renderHome();
  } catch (e) {}
}

// ---- puntos de enganche (los llama index.html y duels.js) ------------------------------------------------
// Cada respuesta: solo cuenta en partidas que no son Repaso.
function encargosOnAnswer(correct, q) {
  if (typeof currentGame !== 'undefined' && currentGame && currentGame.mode === 'review') return;
  const cat = q && typeof q.cat === 'string' ? q.cat : null;
  encargosMutate(function (p) { SEQEncargosProgress.recordAnswer(p, cat, !!correct); }, true);
}
// Enseña los avisos retenidos durante la partida. Devuelve cuántos había.
function encargosFlushPending() {
  const ev = encargosPendingEvents; encargosPendingEvents = [];
  if (ev.length) encargosToastEvents(ev);
  return ev.length;
}
// Fin de una partida en solitario (finishGame / finishLucidezMode). total y correct ya calculados por quien llama.
function encargosOnGameEnd(mode, correct, total) {
  const events = encargosMutate(function (p) {
    SEQEncargosProgress.recordGame(p, { mode: mode, correct: correct, total: total, day: encargosLocalDay(encargosNowMs()) });
  });
  const held = encargosFlushPending();
  encargosFinishToast(events.length > 0 || held > 0);
}
// Un duelo terminado (Duelo online, por apuestas o Reto). info = {won, stakes}.
function encargosOnDuel(won, stakes) {
  const events = encargosMutate(function (p) { SEQEncargosProgress.recordDuel(p, { won: !!won, stakes: !!stakes }); });
  const held = encargosFlushPending();
  encargosFinishToast(events.length > 0 || held > 0);
}

// Un único aviso «Encargo avanzado» (la misión con más avance) si algo avanzó y no se avisó ya de una compleción.
function encargosFinishToast(hadCompletion) {
  const before = encargosGameSnap; encargosGameSnap = null;
  if (hadCompletion || !before || typeof SEQEncargosUI === 'undefined') return;
  const e = encargosEnsureWeek(), act = encargosActiveIds(e.w), P = SEQEncargosProgress, C = SEQEncargos;
  let best = null;
  act.normals.concat([act.great]).forEach(function (id) {
    const r = P.evaluate(id, e.p);
    if (r.cur > (before[id] || 0) && !r.done && (!best || r.frac > best.r.frac)) best = { id: id, r: r };
  });
  if (!best) return;
  const m = C.NORMAL_BY_ID[best.id] || C.GREAT_BY_ID[best.id];
  SEQEncargosUI.toast('Encargo avanzado', 'progress', m.titulo + ' · ' + best.r.label, { kicker: 'Encargo avanzado', name: m.titulo, aux: best.r.label, frac: best.r.frac });
}

// ---- vista para la pantalla y la tira de inicio -------------------------------------------------------------
function encargosView(nowMs) {
  nowMs = nowMs == null ? encargosNowMs() : nowMs;
  const e = encargosEnsureWeek(nowMs), act = encargosActiveIds(e.w), P = SEQEncargosProgress, C = SEQEncargos;
  const idx = C.weekIndexOfId(e.w);
  const missions = act.normals.map(function (id) {
    const m = C.NORMAL_BY_ID[id], r = P.evaluate(id, e.p);
    return { id: id, titulo: m.titulo, desc: m.desc, r: r, claimed: encargosIsClaimed(C.keyMission(e.w, id)), xp: C.XP_MISSION };
  });
  const gm = C.GREAT_BY_ID[act.great];
  const great = { id: gm.id, titulo: gm.titulo, desc: gm.desc, r: P.evaluate(gm.id, e.p), claimed: encargosIsClaimed(C.keyGreat(e.w, gm.id)), xp: C.XP_GREAT };
  const doneCount = missions.filter(function (m) { return m.claimed; }).length;
  const bonusClaimed = encargosIsClaimed(C.keyBonus(e.w));
  let xpAvailable = 0;
  missions.forEach(function (m) { if (!m.claimed) xpAvailable += m.xp; });
  if (!bonusClaimed) xpAvailable += C.XP_BONUS;
  if (!great.claimed) xpAvailable += great.xp;
  return { week: e.w, missions: missions, great: great, doneCount: doneCount, bonusClaimed: bonusClaimed, bonusXp: C.XP_BONUS,
    xpAvailable: xpAvailable, msLeft: Math.max(0, C.endMsLocal(idx) - nowMs), allDone: doneCount === 3 && great.claimed };
}
