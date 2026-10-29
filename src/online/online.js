// SirEdwards Quiz v1.4/v1.5 — capa online (cuenta, sincronización, migración, ranking; en v1.5 además
// expone api()/session() a src/online/duels.js).
//
// Principios (ver DEPLOY.md / notas de v1.4):
//  - El juego local NO depende de nada de esto. Si falta la configuración, no
//    hay red o el servidor está caído, todo funciona exactamente como en v1.3.
//  - NO se crea ningún almacenamiento local paralelo del progreso: el progreso
//    sigue siendo `store` (clave siredwards_quiz_v1_0_data, sin tocar). Solo se
//    guardan DOS claves nuevas y pequeñas, separadas y documentadas:
//      siredwards_quiz_v1_4_account -> {token, expiresAt, player}  (sesión)
//      siredwards_quiz_v1_4_sync    -> estado de sincronización (ver abajo)
//  - Sin cola de eventos: se sincroniza un DELTA acumulado desde la última
//    confirmación del servidor. El lote pendiente se congela con un match_id y
//    se reenvía idéntico hasta que el servidor lo confirma (idempotencia).
//
// Cargado como script clásico (scope global compartido con el script
// principal, igual que el resto de src/). Usa por nombre, en tiempo de
// ejecución (nunca al cargar): store, saveStore, updateBadges, ALL_MEDALS,
// getLevelData, checkMedalsAndGetNew, checkModeUnlocksAndGetNew, escapeHtml,
// showInfoToast, switchTab.

(function () {
  'use strict';

  var CFG = window.SEQ_ONLINE_CONFIG || {};
  var API = String(CFG.API_BASE_URL || '').replace(/\/+$/, '');
  var CLIENT_ID = String(CFG.GOOGLE_CLIENT_ID || '');
  // La capa online solo se activa con una URL de API válida (https, o http en localhost para desarrollo)
  // y un Client ID. Cualquier otra configuración -vacía, mal escrita, con otro esquema- la deja desactivada.
  function validApiUrl(u) { return /^https:\/\/[^\s\/?#]+/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u); }
  var ENABLED = !!(API && CLIENT_ID && validApiUrl(API));

  var ACCOUNT_KEY = 'siredwards_quiz_v1_4_account';
  var SYNC_KEY = 'siredwards_quiz_v1_4_sync';

  // Prompt 3 — Fase C/D: el catálogo de avatares, su validación y su render
  // viven en src/data/avatars.js (window.SEQAvatars), compartido con
  // src/online/duels.js — antes cada archivo mantenía su propia copia. Fase D
  // sustituyó los 12 glifos-emoji de Fase C (antes idénticos a los del
  // backend, test/auth-profile.test.mjs) por 6 ids de emblema ilustrado — ver
  // la nota de contrato de backend en avatars.js. El array de aquí abajo es
  // solo el fallback defensivo para el caso (no esperado) de que avatars.js no
  // haya cargado.
  var AVATARS = window.SEQAvatars ? window.SEQAvatars.GLYPHS : ['sombrero', 'libro', 'reloj', 'lupa', 'mascara', 'pluma'];
  var DEFAULT_AVATAR = window.SEQAvatars ? window.SEQAvatars.DEFAULT_GLYPH : 'sombrero';

  // [campo en el servidor, campo en store]
  var COUNTERS = [['xp', 'xp'], ['games', 'gamesPlayed'], ['correct', 'totalCorrect'], ['wrong', 'totalWrong']];

  // ---- Estado en memoria -------------------------------------------------
  var account = null; // {token, expiresAt, player:{id, display_name, avatar}}
  var sync = null;    // {v, playerId, migration:'pending'|'done'|'skipped', base, seen, pending, lastSyncAt}
  var ui = { status: 'idle', error: '', syncing: false, editing: false, editName: null, editAvatar: null, gisLoading: false, gisInit: false, msg: '', busy: false, expired: false };
  var timer = null;
  var retryTimer = null;
  var retryStep = 0;
  var applying = false;

  // ---- Utilidades --------------------------------------------------------
  // n(): entero >= 0. NUNCA lanza (un objeto con toString roto, un Symbol… dan 0): todo lo que viene del servidor
  // o de localStorage pasa por aquí antes de pintarse o de sumarse.
  function n(v) { try { v = Math.floor(Number(v)); } catch (e) { return 0; } return isFinite(v) && v > 0 ? v : 0; }
  function esc(s) {
    if (typeof s !== 'string') { try { s = String(s == null ? '' : s); } catch (e) { s = ''; } } // un objeto hostil no puede hacer lanzar el pintado
    return escapeHtml_(s);
  }
  function escapeHtml_(s) { return typeof escapeHtml === 'function' ? escapeHtml(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  // v1.5: flags del servidor. Fail-closed: solo `true` exacto activa algo.
  function normFeatures(f) {
    f = f || {};
    return { ranking: f.ranking === true, classic_duel: f.classic_duel === true, async_challenges: f.async_challenges === true, multi_duel: f.multi_duel === true, multi_reto: f.multi_reto === true, push: f.push === true };
  }
  // v1.5: avisa a la capa de Duelos (src/online/duels.js). Nunca rompe nada.
  function notifyDuels() { try { if (window.SEQDuels && typeof window.SEQDuels.onAccountChange === 'function') window.SEQDuels.onAccountChange(); } catch (e) {} }
  function notifyDuelsShown() { try { if (window.SEQDuels && typeof window.SEQDuels.onShow === 'function') window.SEQDuels.onShow(); } catch (e) {} }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ico(n, cls) { return window.seqIco ? window.seqIco(n, cls) : ''; }
  function pickOne(list) { return list[Math.floor(Math.random() * list.length)]; }
  function toast(msg, icon) { try { if (typeof showInfoToast === 'function') showInfoToast(msg, icon); } catch (e) {} }
  // ¿Hay una partida REALMENTE a medias? hasSavedGame() ignora partidas ya terminadas/perdidas que aún dejan un `savedGame`
  // residual (p. ej. al cambiar el tema justo después de acabar): esas no deben bloquear la sincronización.
  function midGame() { try { return typeof hasSavedGame === 'function' ? hasSavedGame() : !!store.savedGame; } catch (e) { return false; } }
  // Jugando AHORA: hay partida guardada y se está en la pantalla de juego sin resultados. Una partida guardada y dejada en Inicio
  // no debe impedir sincronizar.
  function playingNow() {
    try {
      var rc = document.getElementById('results-card');
      return midGame() && document.body.classList.contains('in-game') && !(rc && rc.offsetParent !== null);
    } catch (e) { return false; }
  }
  function hasStore() { return typeof store !== 'undefined' && store && typeof store === 'object'; }
  function knownMedals() {
    var set = {};
    try { ALL_MEDALS.forEach(function (m) { set[m.id] = true; }); } catch (e) {}
    return set;
  }
  function newMatchId() {
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
    return 'b-' + id;
  }
  function levelOf(xp) { try { return getLevelData(xp); } catch (e) { return 1; } }
  function fragCount(medals) {
    try { return FRAGMENT_MEDAL_IDS.filter(function (id) { return medals.indexOf(id) !== -1; }).length; } catch (e) { return 0; }
  }
  function ago(ts) {
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return 'ahora mismo';
    var m = Math.round(s / 60);
    if (m < 60) return 'hace ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return 'hace ' + h + ' h';
    return 'hace ' + Math.round(h / 24) + ' d';
  }

  // Totales locales (lo único que se lee del store; nada se copia a otro sitio).
  function localTotals() {
    var s = hasStore() ? store : {};
    var known = knownMedals();
    return {
      xp: n(s.xp), games: n(s.gamesPlayed), correct: n(s.totalCorrect), wrong: n(s.totalWrong),
      best_streak: n(s.bestStreak),
      medals: (Array.isArray(s.unlockedMedals) ? s.unlockedMedals : []).filter(function (id, i, a) { return typeof id === 'string' && known[id] && a.indexOf(id) === i; })
    };
  }
  function hasLocalProgress() {
    var t = localTotals();
    return t.xp > 0 || t.games > 0 || t.correct > 0 || t.wrong > 0 || t.medals.length > 0;
  }
  // Restos de Encargos de otra cuenta en un dispositivo sin XP, partidas ni logros: no los detecta hasLocalProgress(), se limpian aparte.
  function wipeLocalEncargos() {
    try {
      if (typeof store === 'object' && store) { delete store.encargos; store.encargosClaimed = []; if (typeof saveStore === 'function') saveStore(false); }
      localStorage.removeItem('siredwards_quiz_encargos_intro_seen');
      localStorage.removeItem('siredwards_quiz_encargos_monday_week');
      try { SEQEncargosUI.renderHome(); } catch (e) {}
    } catch (e) {}
  }
  function progressHasData(p) { return !!p && (n(p.xp) > 0 || n(p.games) > 0 || n(p.correct) > 0 || n(p.wrong) > 0 || (p.medals || []).length > 0); }

  // ---- Persistencia de cuenta / estado de sync ------------------------------
  // ---- Validación de lo que llega del servidor (nunca se confía en tipos ni en formas) ----------------
  function invalidResponse() { var e = new Error('respuesta no válida del servidor'); e.code = 'invalid_response'; e.invalid = true; return e; }
  function cleanProgress(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw invalidResponse();
    var medals = Array.isArray(p.medals) ? p.medals.filter(function (id) { return typeof id === 'string' && id.length <= 64; }).slice(0, 200) : [];
    return { xp: n(p.xp), games: n(p.games), correct: n(p.correct), wrong: n(p.wrong), best_streak: n(p.best_streak), medals: medals };
  }
  function cleanPlayer(p) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(p.id)) throw invalidResponse();
    return {
      id: p.id,
      display_name: (typeof p.display_name === 'string' && p.display_name) ? p.display_name.slice(0, 48) : 'Jugador',
      avatar: AVATARS.indexOf(p.avatar) !== -1 ? p.avatar : null
    };
  }

  function loadState() {
    var a = lsGet(ACCOUNT_KEY);
    account = null;
    try {
      if (a && typeof a.token === 'string' && /^[A-Za-z0-9._-]{10,2048}$/.test(a.token)) {
        account = { token: a.token, expiresAt: n(a.expiresAt), features: normFeatures(a.features), player: cleanPlayer(a.player) };
      }
    } catch (e) { account = null; }
    var s = lsGet(SYNC_KEY);
    sync = (s && s.v === 1 && typeof s.playerId === 'string' && s.base && typeof s.base === 'object' && s.seen && typeof s.seen === 'object') ? s : null;
    if (sync) { // tipos coherentes aunque el JSON guardado haya sido editado
      ['xp', 'games', 'correct', 'wrong'].forEach(function (k) { sync.base[k] = n(sync.base[k]); sync.seen[k] = n(sync.seen[k]); });
      sync.seen.best = n(sync.seen.best);
      sync.wk = Array.isArray(sync.wk) ? sync.wk.filter(isWeeklyKey).slice(-200) : [];
      if (sync.pending && sync.pending.weekly !== undefined) sync.pending.weekly = Array.isArray(sync.pending.weekly) ? sync.pending.weekly.filter(isWeeklyKey).slice(0, 40) : [];
      sync.seen.medals = Array.isArray(sync.seen.medals) ? sync.seen.medals.filter(function (id) { return typeof id === 'string'; }) : [];
    }
  }
  function saveAccount() { if (account) lsSet(ACCOUNT_KEY, account); else lsDel(ACCOUNT_KEY); }
  // 2.2 Encargos: claves de recompensa («2026-W41:m:mano_firme»…) cobradas aquí y aún no confirmadas por el servidor.
  // Viajan en el MISMO lote que el XP (el Worker amplía el tope de XP solo por claves válidas y no cobradas).
  function isWeeklyKey(k) { return typeof k === 'string' && k.length <= 40 && /^\d{4}-W\d{2}:/.test(k); }
  function unconfirmedWeekly() {
    var all = (typeof store !== 'undefined' && store && Array.isArray(store.encargosClaimed)) ? store.encargosClaimed : [];
    var done = {}; ((sync && sync.wk) || []).forEach(function (k) { done[k] = true; });
    return all.filter(function (k) { return isWeeklyKey(k) && !done[k]; }).slice(-40);
  }
  function confirmWeekly(keys) {
    if (!sync || !keys || !keys.length) return;
    var have = {}; (sync.wk || []).forEach(function (k) { have[k] = true; });
    keys.forEach(function (k) { if (isWeeklyKey(k) && !have[k]) { have[k] = true; (sync.wk = sync.wk || []).push(k); } });
    sync.wk = (sync.wk || []).slice(-200);
  }
  function saveSync() { if (sync) lsSet(SYNC_KEY, sync); }
  function newSyncState(playerId, migration, base, seen) {
    return {
      v: 1, playerId: playerId, migration: migration,
      base: base, // totales locales ya contabilizados online
      seen: seen, // totales del servidor en la última respuesta
      pending: null, lastSyncAt: 0,
      wk: [] // 2.2: claves de Encargos ya confirmadas por el servidor
    };
  }
  function emptySeen() { return { xp: 0, games: 0, correct: 0, wrong: 0, best: 0, medals: [] }; }
  function seenFrom(p) { return { xp: n(p.xp), games: n(p.games), correct: n(p.correct), wrong: n(p.wrong), best: n(p.best_streak), medals: (Array.isArray(p.medals) ? p.medals : []).filter(function (id) { return typeof id === 'string'; }) }; }
  function baseFromLocal() { var t = localTotals(); return { xp: t.xp, games: t.games, correct: t.correct, wrong: t.wrong }; }

  // ---- HTTP ------------------------------------------------------------------
  function api(method, path, body, opts) {
    opts = opts || {};
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeoutMs || 15000) : null;
    var headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.auth !== false && account) headers.Authorization = 'Bearer ' + account.token;
    return fetch(API + path, { method: method, headers: headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
      .catch(function () { if (t) clearTimeout(t); var e = new Error('network'); e.network = true; throw e; })
      .then(function (res) {
        if (t) clearTimeout(t);
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok) {
            var err = new Error((data && data.error && data.error.message) || ('HTTP ' + res.status));
            err.status = res.status;
            err.code = data && data.error && data.error.code;
            err.retryAfter = Number(res.headers.get('Retry-After')) || n(data && data.error && data.error.retry_after) || 0; // CORS oculta la cabecera: el cuerpo también lo trae
            throw err;
          }
          return data;
        });
      });
  }

  // ---- Aplicar progreso remoto al store local (siempre aditivo/máximo) --------
  // Nunca resta ni sustituye: solo suma lo que el servidor sabe y aquí falta.
  function afterLocalChange(gamesAdded) {
    // Compensación mínima documentada: el desbloqueo de Supervivencia depende
    // de standardGamesCount (partidas en Modo Estándar), que no se sincroniza.
    // Si el progreso restaurado trae >= 5 partidas y aquí no consta, se marca
    // el requisito como cumplido para no dejar Supervivencia bloqueado en un
    // dispositivo nuevo que ya tiene los logros de niveles/modos posteriores.
    try {
      if (gamesAdded > 0 && n(store.gamesPlayed) >= 5 && n(store.standardGamesCount) < 5) store.standardGamesCount = 5;
      if (typeof checkMedalsAndGetNew === 'function') checkMedalsAndGetNew();
      if (typeof checkModeUnlocksAndGetNew === 'function') {
        // Si el 10.º Fragmento llega por sincronización, Lucidez no se da por avisada: la celebra el próximo fin de partida.
        var nm = checkModeUnlocksAndGetNew();
        if (Array.isArray(nm) && nm.some(function (m) { return m && m.id === 'lucidez_mental'; }) && Array.isArray(store.notifiedModeUnlocks)) {
          store.notifiedModeUnlocks = store.notifiedModeUnlocks.filter(function (id) { return id !== 'lucidez_mental'; });
        }
      }
      if (typeof checkFragmentRewardsAndGetNew === 'function') checkFragmentRewardsAndGetNew(); // hitos 12/15 ya vistos en otro dispositivo
    } catch (e) {}
    applying = true;
    try { if (typeof saveStore === 'function') saveStore(false); } catch (e) {} finally { applying = false; }
    try { if (typeof updateBadges === 'function') updateBadges(); } catch (e) {}
  }
  function unionMedalsIntoStore(ids) {
    var known = knownMedals();
    if (!Array.isArray(store.unlockedMedals)) store.unlockedMedals = [];
    var added = 0;
    (ids || []).forEach(function (id) {
      try { if (typeof resolveMedalId === 'function') id = resolveMedalId(id); } catch (e) {}
      if (known[id] && store.unlockedMedals.indexOf(id) === -1) { store.unlockedMedals.push(id); added++; }
    });
    return added;
  }

  // Respuesta de /progress/sync: suma solo lo que OTROS dispositivos aportaron.
  function applySyncResult(pending, prog) {
    var gamesAdded = 0, remoteTotal = 0;
    COUNTERS.forEach(function (c) {
      var k = c[0], sv = n(prog[k]);
      var remoteOnly = Math.max(0, sv - sync.seen[k] - pending.delta[k]);
      if (remoteOnly > 0) { store[c[1]] = n(store[c[1]]) + remoteOnly; remoteTotal += remoteOnly; if (k === 'games') gamesAdded += remoteOnly; }
      sync.base[k] = sync.base[k] + pending.delta[k] + remoteOnly;
      sync.seen[k] = sv;
    });
    var best = n(prog.best_streak), bestRaised = false;
    if (best > sync.seen.best && best > n(store.bestStreak)) { store.bestStreak = best; bestRaised = true; }
    sync.seen.best = Math.max(sync.seen.best, best);
    var newRemote = (prog.medals || []).filter(function (id) { return sync.seen.medals.indexOf(id) === -1 && pending.medals.indexOf(id) === -1; });
    var medalsAdded = unionMedalsIntoStore(newRemote);
    sync.seen.medals = (prog.medals || []).slice();
    return { gamesAdded: gamesAdded, changed: medalsAdded > 0 || remoteTotal > 0 || bestRaised };
  }

  // ---- Sincronización -----------------------------------------------------------
  // Lo que el Worker ha recibido y no ha devuelto (p. ej. un logro nuevo antes de redesplegar el Worker, o una racha que recorta):
  // no se reenvía en bucle. Solo en memoria: al reabrir la app se vuelve a intentar una vez.
  var storeLost = false;
  var ignored = { medals: [], best: 0 };
  function noteIgnored(pending, prog) {
    (pending.medals || []).forEach(function (id) { if ((prog.medals || []).indexOf(id) === -1 && ignored.medals.indexOf(id) === -1) ignored.medals.push(id); });
    if (n(pending.best_streak) > n(prog.best_streak)) ignored.best = Math.max(ignored.best, n(pending.best_streak));
  }
  function computeDelta() {
    var t = localTotals();
    var delta = {};
    COUNTERS.forEach(function (c) {
      var k = c[0];
      if (t[k] < sync.base[k]) storeLost = true; // el progreso local quedó por debajo de lo ya contabilizado (se perdió o falló el guardado): syncNow() lo repone desde la cuenta
      delta[k] = Math.max(0, t[k] - sync.base[k]); // nunca negativos
    });
    var medalsNew = t.medals.some(function (id) { return sync.seen.medals.indexOf(id) === -1 && ignored.medals.indexOf(id) === -1; });
    var bestNew = t.best_streak > Math.max(sync.seen.best, ignored.best);
    var weekly = unconfirmedWeekly();
    var any = delta.xp > 0 || delta.games > 0 || delta.correct > 0 || delta.wrong > 0 || medalsNew || bestNew || weekly.length > 0;
    return { totals: t, delta: delta, any: any, weekly: weekly };
  }
  function hasUnsynced() {
    if (!account || !sync || sync.migration === 'pending') return false;
    if (sync.pending) return true;
    try { if (computeDelta().any) return true; } catch (e) { return false; }
    // v2.0: también cuentan los datos que no viajan por /progress/sync (historial, estadísticas, ajustes, Duelo…).
    try { return sync.migration === 'done' && !!window.SEQDataSync && window.SEQDataSync.hasPending(account.player.id); } catch (e) { return false; }
  }

  function scheduleSync(ms, reason) { clearTimeout(timer); timer = setTimeout(function () { syncNow(reason || 'auto'); }, ms); }
  function scheduleRetry(secs) {
    clearTimeout(retryTimer);
    var wait = secs ? secs * 1000 : Math.min(300000, 30000 * Math.pow(2, retryStep));
    retryStep = Math.min(retryStep + 1, 4);
    retryTimer = setTimeout(function () { syncNow('retry'); }, wait);
  }
  function authFailure(err) {
    if (err && err.status === 401) {
      account = null; saveAccount(); ui.expired = true; ui.error = '';
      setMsg('Tu sesión ha caducado. Inicia sesión de nuevo con tu cuenta.'); // también en el gate, que tapa Ajustes
      return true;
    }
    return false;
  }

  // Lectura de la cuenta sin lote propio: aplica solo lo que aportaron otros dispositivos.
  function refreshFeatures(res) {
    if (account && res && res.features) { var f = normFeatures(res.features); if (JSON.stringify(account.features) !== JSON.stringify(f)) { account.features = f; saveAccount(); notifyDuels(); } }
  }

  function pull() {
    return api('GET', '/me').then(function (res) {
      refreshFeatures(res);
      var r = applySyncResult({ delta: { xp: 0, games: 0, correct: 0, wrong: 0 }, medals: [] }, cleanProgress(res && res.progress));
      sync.lastSyncAt = Date.now();
      saveSync();
      retryStep = 0;
      if (r.changed) afterLocalChange(r.gamesAdded);
      return 'pulled';
    });
  }

  function syncNow(reason) {
    if (!ENABLED || !account || !sync || ui.syncing || !hasStore()) return Promise.resolve();
    if (sync.playerId !== account.player.id || sync.migration === 'pending' || sync.needsMerge) { render(); return Promise.resolve(); }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { render(); return Promise.resolve(); }
    // Un temporizador (reintento, XP de Duelo, guardado al terminar) no debe lanzar el lote a media partida: se retrasa.
    if (reason !== 'manual' && playingNow()) { scheduleSync(15000, reason); return Promise.resolve(); }
    // Con el progreso local por debajo de lo ya contabilizado (se perdió o falló el guardado local), la cuenta repone el móvil
    // en lugar de re-baselinear a la baja en silencio y dejarlo en nivel 1.
    try {
      computeDelta();
      if (storeLost) { storeLost = false; sync.migration = 'pending'; sync.pending = null; saveSync(); render(); setTimeout(doMerge, 0); return Promise.resolve(); }
    } catch (e) {}
    ui.syncing = true; ui.error = ''; render();

    var rounds = 0;
    function step() {
      rounds++;
      var pending = sync.pending;
      if (!pending) {
        var d = computeDelta();
        if (!d.any) {
          saveSync();
          // Sin cambios propios: solo se consulta la cuenta (lectura, sin escribir en D1) cuando el
          // disparador NO es el guardado automático, para recibir lo que otros dispositivos hayan
          // aportado (arranque, volver a la app, recuperar conexión, botón manual).
          return reason !== 'auto' ? pull() : Promise.resolve('idle');
        }
        pending = sync.pending = { matchId: newMatchId(), delta: d.delta, best_streak: d.totals.best_streak, medals: d.totals.medals, weekly: d.weekly };
        saveSync();
      }
      var body = { match_id: pending.matchId, delta: pending.delta, best_streak: pending.best_streak, medals: pending.medals };
      if (pending.weekly && pending.weekly.length) body.weekly = pending.weekly;
      return api('POST', '/progress/sync', body).then(function (res) {
        var prog = cleanProgress(res && res.progress);
        var r = applySyncResult(pending, prog);
        noteIgnored(pending, prog);
        confirmWeekly(pending.weekly);
        sync.pending = null;
        sync.lastSyncAt = Date.now();
        saveSync();
        retryStep = 0;
        if (r.changed) afterLocalChange(r.gamesAdded);
        return rounds < 2 ? step() : 'ok'; // 2ª vuelta: recoge lo jugado mientras volaba la petición
      });
    }

    // v2.0: tras el progreso principal, se sincronizan el resto de datos del jugador (src/online/data-sync.js).
    // Solo si el jugador ya decidió asociar su progreso a la cuenta (migration === 'done').
    function dataRound() {
      if (!window.SEQDataSync || !sync || sync.migration !== 'done' || !account) return Promise.resolve();
      // Reseteo puntual de records de una cuenta (src/utils/records-reset.js): antes de sincronizar, para que el máximo no los devuelva.
      try {
        if (window.SEQRecordsReset && typeof store !== 'undefined' && window.SEQRecordsReset.run(store, account.player.id) && typeof saveStore === 'function') saveStore(false);
      } catch (e) {}
      return window.SEQDataSync.run({
        api: api,
        playerId: account.player.id,
        withApplying: function (fn) { applying = true; try { fn(); } finally { applying = false; } },
        afterApply: function () { afterLocalChange(0); }
      }, reason);
    }

    // Las dos sincronizaciones son INDEPENDIENTES: que el servidor limite o rechace una (p. ej. 429 en el progreso
    // principal) no impide sincronizar la otra. Se relanza después el primer error, que es el que se muestra/reintenta.
    var firstErr = null;
    return step().then(function () {
      ui.error = '';
    }, function (err) {
      if (err && err.status === 401) throw err; // sesión caducada: no tiene sentido seguir
      firstErr = err;
    }).then(function () {
      return dataRound().catch(function (err) { if (!firstErr || firstErr.status === 429) firstErr = err; }); // un 429 del progreso es silencioso: no oculta un fallo real de datos
    }).then(function () {
      if (firstErr) throw firstErr;
      if (sync && sync.migration === 'done' && hasStore() && (computeDelta().any)) scheduleSync(2000, 'auto'); // logros derivados de datos recién traídos
    }).catch(function (err) {
      if (err && err.dataSync) {
        // Un fallo de la sincronización de datos NUNCA marca «needsMerge» ni descarta nada: los datos locales se
        // conservan intactos y se reintenta.
        if (authFailure(err)) return;
        if (err.network) { ui.error = 'No se ha podido sincronizar. Se conservarán los datos locales y se volverá a intentar.'; scheduleRetry(0); return; }
        if (err.invalid || err.status === 409 || err.status === 429 || err.status >= 500) { ui.error = 'No se ha podido sincronizar. Se conservarán los datos locales y se volverá a intentar.'; scheduleRetry(err.retryAfter || 0); return; }
        ui.error = 'No se ha podido sincronizar. Tus datos locales están a salvo.';
        return;
      }
      if (authFailure(err)) return;
      if (err && err.network) { ui.error = 'No se ha podido sincronizar. Se conservarán los datos locales y se volverá a intentar.'; scheduleRetry(0); return; }
      if (err && err.invalid) { ui.error = 'El servidor devolvió una respuesta no válida. Se reintentará.'; scheduleRetry(0); return; }
      if (err && (err.status === 429 || (err.status >= 500))) { ui.error = err.status === 429 ? '' : 'El servidor no responde ahora mismo. Se reintentará.'; scheduleRetry(err.retryAfter || 0); return; }
      // 4xx (p. ej. 400 valor fuera de rango, 409 match_id ya usado con otro contenido): el servidor rechaza este
      // lote de forma definitiva. NO se descarta el progreso: la línea base no se mueve (el delta sigue siendo
      // "no confirmado"), se marca `needsMerge` y se deja de reintentar en bucle hasta que el usuario pulse
      // «Restaurar / combinar progreso», que reenvía los TOTALES (máximo por contador) y re-baselina.
      ui.error = 'El servidor no ha aceptado la última sincronización. Tu progreso local está intacto: pulsa «Reintentar».';
      sync.pending = null; sync.needsMerge = true; sync.rejected = err && err.code ? err.code : 'error'; saveSync();
      if (mergeTries < 3) { mergeTries++; setTimeout(function () { if (mergeDue()) doMerge(); }, 800); } // el servidor rechazó el lote: se reenvían los totales (máximo por contador)
    }).then(function () {
      ui.syncing = false; render();
    });
  }

  // ---- Inicio de sesión (Google Identity Services) ---------------------------------
  function loadGis() {
    return new Promise(function (resolve, reject) {
      if (window.google && google.accounts && google.accounts.id) return resolve();
      var existing = document.getElementById('seq-gis-script');
      if (existing) { existing.addEventListener('load', resolve); existing.addEventListener('error', function () { reject(new Error('gis')); }); return; }
      var s = document.createElement('script');
      s.id = 'seq-gis-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { var e = document.getElementById('seq-gis-script'); if (e) e.remove(); reject(new Error('gis')); };
      document.head.appendChild(s);
    });
  }
  function setMsg(m) {
    ui.msg = m || '';
    // v1.5 — Fase B (Prompt 3): el mismo aviso ahora puede aparecer en dos sitios
    // (el bloque de cuenta en Ajustes y, si la capa online está activa, el gate de
    // acceso obligatorio). Se escribe en cualquiera de los dos que exista en el DOM.
    ['seq-online-msg', 'seq-gate-msg'].forEach(function (id) { var el = $(id); if (el) el.textContent = ui.msg; });
  }

  // Nonce anti-repetición: lo emite el Worker (firmado, un solo uso, 5 min) y se pasa a Google, que lo incluye
  // en el ID token. Se reutiliza mientras esté vigente para no pedir uno nuevo en cada repintado.
  var gis = { nonce: null, at: 0 };
  var NONCE_FRESH_MS = 4 * 60 * 1000;
  function getNonce(force) {
    if (!force && gis.nonce && Date.now() - gis.at < NONCE_FRESH_MS) return Promise.resolve(gis.nonce);
    return api('GET', '/auth/nonce', undefined, { auth: false, timeoutMs: 10000 }).then(function (d) {
      gis = { nonce: d.nonce, at: Date.now() };
      return gis.nonce;
    });
  }

  // v1.5 — Fase B (Prompt 3): el botón de Google puede necesitar pintarse en más de
  // un sitio a la vez que existe en el DOM (el bloque de cuenta en Ajustes y, si la
  // capa online está activa, el gate de acceso obligatorio). Es el MISMO botón/​
  // credencial/callback en los dos sitios — no hay un segundo mecanismo de login.
  function gisSlots() {
    var ids = ['seq-gsi-slot', 'seq-gate-gsi-slot'];
    var out = [];
    for (var i = 0; i < ids.length; i++) { var el = $(ids[i]); if (el) out.push(el); }
    return out;
  }
  function ensureGisButton(force) {
    var slots = gisSlots();
    if (!ENABLED || account || !slots.length) return;
    if (navigator.onLine === false) { setMsg(MSG_OFFLINE); showGateRetry(true); return; }
    var primary = slots[0];
    if (!force && primary.firstChild && gis.nonce && Date.now() - gis.at < NONCE_FRESH_MS) return; // ya pintado y vigente
    if (force !== true && !ui.expired) setMsg(''); // al renovar tras un fallo se conserva el aviso («había caducado…»)
    showGateRetry(false);
    Promise.all([loadGis(), getNonce(force === true)]).then(function (r) {
      var nonce = r[1];
      // initialize() se vuelve a llamar con cada nonce nuevo (Google usa el último).
      google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, auto_select: false, cancel_on_tap_outside: true, nonce: nonce });
      ui.gisInit = true;
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      slots.forEach(function (slot) {
        slot.innerHTML = '';
        google.accounts.id.renderButton(slot, { type: 'standard', theme: dark ? 'filled_black' : 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'es', width: Math.min(300, slot.clientWidth || 300) });
      });
      clearTimeout(nonceTimer);
      nonceTimer = setTimeout(function () { if (!account) ensureGisButton(true); }, NONCE_FRESH_MS + 1000);
    }).catch(function (err) {
      setMsg(err && err.network === undefined && err.status ? MSG_SERVER : MSG_LOAD);
      showGateRetry(true);
    });
  }
  // 2.5: sin conexión (o con Google/servidor caídos) el gate no se queda mudo: frase de Sir Edwards y «Reintentar», sin recargar ni tocar datos.
  var MSG_OFFLINE = 'Sin conexión. Hasta la elegancia necesita internet.';
  var MSG_LOAD = 'Google no contesta. Qué falta de modales. Revisa tu conexión y reinténtalo.';
  var MSG_SERVER = 'Algo falla al otro lado. Por una vez, no es culpa tuya. Reinténtalo.';
  function showGateRetry(on) { var b = $('seq-gate-retry'); if (b) b.hidden = !on; }
  function retryGate() {
    if (!ENABLED || account) return;
    showGateRetry(false); setMsg('');
    ensureGisButton(true);
  }
  var nonceTimer = null;
  var loginHadProgress = false;

  function onCredential(resp) {
    if (!resp || !resp.credential) { setMsg('No se recibió la credencial de Google.'); return; }
    ui.busy = true; setMsg('Iniciando sesión…');
    api('POST', '/auth/google', { credential: resp.credential }, { auth: false }).then(function (raw) {
      // Se valida y limpia la respuesta ENTERA antes de guardar nada: así una respuesta rara no deja una cuenta a medias.
      if (!raw || typeof raw.token !== 'string' || !/^[A-Za-z0-9._-]{10,2048}$/.test(raw.token)) throw invalidResponse();
      var data = { token: raw.token, expires_at: n(raw.expires_at), features: normFeatures(raw.features), player: cleanPlayer(raw.player), progress: cleanProgress(raw.progress) };
      account = { token: data.token, expiresAt: data.expires_at, features: normFeatures(data.features), player: { id: data.player.id, display_name: data.player.display_name, avatar: data.player.avatar } };
      gis = { nonce: null, at: 0 }; // el nonce de este login ya está gastado
      ui.nonceFails = 0;
      saveAccount();
      ui.expired = false; ui.error = ''; ui.editing = false;
      var same = !!(sync && sync.playerId === data.player.id);
      if (same && sync.migration !== 'pending') {
        // Misma cuenta que ya estaba enlazada en este dispositivo: se retoma sin volver a preguntar.
        render();
        syncNow('login');
      } else {
        var otherBefore = !!(sync && sync.playerId !== data.player.id);
        if (otherBefore) { try { SEQDuelIntro.onAccountSwitch(); SEQDuelIntro.refresh(); } catch (e) {} }
        var hasLocal = hasLocalProgress();
        var hasOnline = progressHasData(data.progress);
        loginHadProgress = hasOnline; // para no dar la bienvenida de «nuevo aspirante» a quien ya jugaba en otro dispositivo
        sync = newSyncState(data.player.id, 'pending', baseFromLocal(), seenFrom(data.progress));
        sync.otherAccountBefore = otherBefore;
        saveSync();
        // Cada cuenta con su progreso, sin combinar: lo que hay en el móvil es de otra cuenta (o de la cuenta, que manda) y se descarta.
        // Única excepción: progreso de antes de existir las cuentas (nunca enlazado) en una cuenta vacía: pasa a ser de esa cuenta.
        if (!same && hasLocal && (otherBefore || hasOnline)) { wipeLocalForOtherAccount(hasOnline, data.progress); return; } // recarga: tras ella, init() carga la cuenta
        if (otherBefore) wipeLocalEncargos();
        if (!hasLocal && !hasOnline) {
          sync.migration = 'done'; saveSync();
        } else {
          setTimeout(function () { doMerge(); }, 0);
        }
        render();
      }
    }).catch(function (err) {
      if (err && (err.code === 'invalid_nonce' || err.code === 'nonce_expired' || err.code === 'credential_replayed')) {
        gis = { nonce: null, at: 0 };
        ui.nonceFails = (ui.nonceFails || 0) + 1;
        // Se renueva el nonce volviendo a llamar a initialize(). Si Google ignorase la re-inicialización (no
        // verificado con Google real), dos fallos seguidos indican que hay que reabrir la app.
        setMsg(ui.nonceFails >= 2
          ? 'No se ha podido renovar el inicio de sesión. Cierra y vuelve a abrir la app e inténtalo de nuevo.'
          : 'El inicio de sesión había caducado. Pulsa de nuevo el botón de Google.');
        if (ui.nonceFails < 3) ensureGisButton(true);
        return;
      }
      // Fase B.1 (Prompt 3): mensaje corregido — este error solo puede darse
      // dentro de un intento de inicio de sesión real (ensureGisButton ya impide
      // llegar aquí si SEQOnline.enabled es false), así que ya no afirma que "el
      // juego sigue funcionando sin cuenta" (falso cuando la cuenta es
      // obligatoria). Deja claro que no se completó el acceso y que se puede
      // reintentar, sin sonar alarmista ni cerrar sesión ni tocar el progreso.
      setMsg(err && err.network
        ? 'No se ha podido conectar para completar el acceso. Comprueba tu conexión y vuelve a intentarlo.'
        : 'No se ha podido completar el acceso. Vuelve a intentarlo en un momento.');
    }).then(function () { ui.busy = false; });
  }

  // Cerrar sesión: antes se sube lo pendiente. Si algo no se puede subir (sin conexión), se avisa: al entrar con otra cuenta en este móvil se perdería.
  function signOut() {
    if (!account || !sync || !hasUnsynced()) { doSignOut(); return; }
    var whenIdle = function (cb) { var k = 0; (function w() { if (!ui.syncing || ++k > 40) { cb(); return; } setTimeout(w, 500); })(); };
    var ask = function () {
      showAppConfirm({
        title: 'Cerrar sesión',
        message: 'Hay progreso que aún no se ha subido a tu cuenta (sin conexión). Si entras con otra cuenta en este móvil, se perderá.',
        confirmLabel: 'Cerrar sesión igual',
        onConfirm: doSignOut
      });
    };
    whenIdle(function () { syncNow('manual').then(function () { if (hasUnsynced()) ask(); else doSignOut(); }, ask); });
  }
  function doSignOut() {
    // Cerrar sesión NO elimina la cuenta ni borra nada local: solo descarta el token.
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    // Las notificaciones push de esta cuenta no deben seguir llegando a este móvil si entra otra (sin bloquear si falla).
    // SEQPush.disable() envía el endpoint en el cuerpo (un DELETE sin cuerpo da 415) y limpia el aviso local.
    var pushOff = null, done = false;
    try { if (account && window.SEQPush && SEQPush.disable) pushOff = Promise.race([SEQPush.disable(), new Promise(function (r) { setTimeout(r, 2500); })]); } catch (e) {}
    function finish() {
      if (done) return; done = true;
      account = null; saveAccount(); ui.editing = false; ui.expired = false; ui.error = '';
      clearTimeout(timer); clearTimeout(retryTimer);
      toast('Sesión cerrada. Tu progreso sigue en este dispositivo.', 'sombrero');
      render();
    }
    // La baja del push necesita el token: la cuenta se descarta cuando termina (tope de 2,5 s).
    if (pushOff) pushOff.then(finish, finish); else finish();
  }

  function logoutAll() {
    if (!account) return;
    showAppConfirm({
      title: 'Cerrar sesión en todos los dispositivos',
      message: 'Se cerrará tu sesión aquí y en cualquier otro dispositivo donde hayas entrado. No se borra nada: podrás volver a iniciar sesión.',
      confirmLabel: 'Cerrar en todos',
      onConfirm: function () {
        api('POST', '/auth/logout-all').then(function () { doSignOut(); }).catch(function (err) {
          if (authFailure(err)) { render(); return; }
          toast(err && err.network ? 'Necesitas conexión para cerrar todas las sesiones.' : 'No se han podido cerrar las sesiones. Inténtalo de nuevo en un momento.', 'atencion');
        });
      }
    });
  }

  function deleteAccount() {
    if (!account) return;
    var id = account.player.id;
    showAppConfirm({
      title: 'Eliminar cuenta online',
      message: 'Se borrarán tu cuenta, tu perfil y tu progreso, en el servidor y en este dispositivo. No se puede deshacer.',
      confirmLabel: 'Eliminar cuenta',
      onConfirm: function () {
        api('DELETE', '/me', { confirm: id }).then(function () {
          account = null; saveAccount(); sync = null; lsDel(SYNC_KEY); try { if (window.SEQDataSync) window.SEQDataSync.reset(); } catch (e) {}
          clearTimeout(timer); clearTimeout(retryTimer);
          ui.editing = false; ui.expired = false; ui.error = '';
          // También se borra el progreso local: si no, el dispositivo conservaba logros y nivel de una cuenta que ya no existe.
          try {
            // Se vacía la partida en memoria para que 'pagehide' no vuelva a guardar el progreso al recargar.
            if (typeof currentGame !== 'undefined') currentGame = { mode: 'play', queue: [], currentIdx: 0, score: 0, answered: false, totalQuestionsToPlay: 30, lives: 3 };
            if (typeof store !== 'undefined' && store) store.savedGame = null;
            localStorage.removeItem('siredwards_quiz_v1_0_data');
            localStorage.removeItem('siredwards_quiz_v1_1_welcome_seen');
            localStorage.removeItem('siredwards_quiz_v2_0_datasync');
            localStorage.removeItem('siredwards_quiz_encargos_intro_seen');
            localStorage.removeItem('siredwards_quiz_encargos_monday_week');
          } catch (e) {}
          location.reload();
        }).catch(function (err) {
          if (authFailure(err)) { render(); return; }
          toast(err && err.network ? 'Necesitas conexión para eliminar la cuenta.' : 'No se ha podido eliminar la cuenta. Inténtalo de nuevo en un momento.', 'atencion');
        });
      }
    });
  }

  // ---- Unión automática con la cuenta -------------------------------------------------------
  // Sin preguntas y sin combinar: cada cuenta con su progreso. Al entrar con una cuenta distinta de la del móvil, lo local era de
  // la anterior (que ya lo tiene en el servidor) y se descarta; la cuenta nueva carga el suyo (vacío si es nueva).
  // doMerge() es solo el mecanismo (POST /progress/merge) para cargar el progreso de la cuenta con el móvil vacío, o reenviar
  // los totales de la propia cuenta si el servidor rechazó una sincronización.
  var mergeTries = 0, mergeTimer = null;

  function wipeLocalForOtherAccount(hasOnline, progress) {
    try {
      // Se vacía la partida en memoria para que 'pagehide' no vuelva a guardar el progreso ajeno al recargar.
      if (typeof currentGame !== 'undefined') currentGame = { mode: 'play', queue: [], currentIdx: 0, score: 0, answered: false, totalQuestionsToPlay: 30, lives: 3 };
      if (typeof store !== 'undefined' && store) store.savedGame = null;
      localStorage.removeItem('siredwards_quiz_v1_0_data');
      // El store en memoria sigue siendo el de la cuenta anterior hasta recargar: si algo guardara en ese hueco, escribiría el progreso ajeno.
      try { if (typeof getDefaultStore === 'function') store = getDefaultStore(); } catch (e) {}
      localStorage.removeItem('siredwards_quiz_encargos_intro_seen');
      localStorage.removeItem('siredwards_quiz_encargos_monday_week');
      try { SEQDuelIntro.resetLocal(); } catch (e) {}
      if (window.SEQDataSync) window.SEQDataSync.reset();
      sync = newSyncState(account.player.id, 'pending', { xp: 0, games: 0, correct: 0, wrong: 0 }, seenFrom(progress));
      sync.otherAccountBefore = true;
      saveSync();
      // Cuenta sin progreso: la bienvenida vuelve a salir como a un jugador nuevo.
      if (!hasOnline) localStorage.removeItem('siredwards_quiz_v1_1_welcome_seen');
    } catch (e) {}
    location.reload();
  }

  function doMerge(retried) {
    if (!account || !sync || ui.busy) return;
    ui.busy = true;
    clearTimeout(mergeTimer);
    var t = localTotals(), sentWeekly = unconfirmedWeekly();
    api('POST', '/progress/merge', { match_id: 'mig-' + newMatchId().slice(2), local: { xp: t.xp, games: t.games, correct: t.correct, wrong: t.wrong, best_streak: t.best_streak, medals: t.medals }, weekly: sentWeekly })
      .then(function (res) {
        var p = cleanProgress(res && res.progress), gamesAdded = 0, target = {}, played = {};
        COUNTERS.forEach(function (c) {
          var sv = n(p[c[0]]), sent = n(t[c[0]]), cur = n(store[c[1]]);
          target[c[0]] = Math.max(sv, sent);                // lo contabilizado en la cuenta: lo que se envió o lo que tenía
          played[c[0]] = Math.max(0, cur - sent);           // lo jugado mientras la petición volaba: sigue siendo delta pendiente
          if (sv > sent && c[0] === 'games') gamesAdded = sv - sent;
        });
        // ORDEN IMPORTANTE (integridad ante cierres a mitad): primero se guarda el estado de sync con la
        // nueva línea base, y solo después se modifica el store. Si la app se cierra entre ambos pasos, el
        // store queda por DEBAJO de la línea base y el cliente re-baselinea hacia abajo (no envía nada):
        // se puede repetir la combinación. El orden inverso enviaría lo recién traído como si fuera
        // progreso nuevo y lo contaría dos veces en el servidor.
        var other = !!(sync && sync.otherAccountBefore);
        sync = newSyncState(account.player.id, 'done', { xp: target.xp, games: target.games, correct: target.correct, wrong: target.wrong }, seenFrom(p));
        sync.otherAccountBefore = other;
        confirmWeekly(sentWeekly);
        sync.lastSyncAt = Date.now();
        saveSync();
        COUNTERS.forEach(function (c) { store[c[1]] = target[c[0]] + played[c[0]]; });
        store.bestStreak = Math.max(n(store.bestStreak), n(p.best_streak));
        unionMedalsIntoStore(p.medals);
        // Quien recupera su cuenta ya tenía Duelo abierto: se anota en silencio (sin la tarjeta de «modo nuevo» encima del nombre).
        try { SEQDuelIntro.markOpenSilently(); } catch (e) {}
        afterLocalChange(gamesAdded);
        // Quien recupera una cuenta con partidas no es nuevo: sin presentación de los Encargos y con la tira de Inicio ya visible.
        if (target.games > 0) { try { SEQEncargosIntro.markSeen(); SEQEncargosUI.renderHome(); } catch (e) {} }
        mergeTries = 0;
        scheduleSync(1800, 'merge'); // logros derivados que el juego desbloquea localmente al aplicar los totales
      })
      .catch(function (err) {
        if (authFailure(err)) return;
        if (err && err.status === 429 && retried !== true) {
          // El servidor limita la frecuencia (p. ej. justo después de una sincronización automática):
          // se reintenta una vez sola, en cuanto pase el plazo que indica el servidor.
          setTimeout(function () { doMerge(true); }, Math.max(2, err.retryAfter || 2) * 1000);
          return;
        }
        // Sin aviso emergente: es automático. Ajustes lo dice y ofrece «Reintentar».
        ui.error = (err && err.network) ? '' : 'No se ha podido cargar tu progreso. Pulsa «Reintentar».';
        // Se queda pendiente (Ajustes lo dice y tiene «Reintentar»); se reintenta solo unas pocas veces.
        if (++mergeTries <= 5) mergeTimer = setTimeout(function () { if (navigator.onLine !== false) doMerge(); }, 30000);
      })
      .then(function () { ui.busy = false; render(); });
  }

  // ¿Hay una unión por hacer? (primer arranque con cuenta, unión a medias, o el servidor rechazó una sincronización)
  function mergeDue() { return !!(account && sync && (sync.migration === 'pending' || sync.needsMerge)); }

  // ---- Perfil ---------------------------------------------------------------------------
  function toggleEdit() {
    ui.avatarHint = null; ui.editing = !ui.editing; ui.editName = null; ui.editAvatar = account ? account.player.avatar : null; render(); }
  // 2.1: al tocar un avatar bloqueado se muestra, dentro del propio selector, cómo se desbloquea.
  function showAvatarHint(a) {
    var cur = $('seq-name-input'); if (cur) ui.editName = cur.value;
    ui.avatarHint = a; render();
  }
  function avatarHintText(a) {
    try {
      var A = window.SEQAvatars, need = A && A.medalOf(a);
      if (!need || A.isAvailable(a, hasStore() ? store.unlockedMedals : [])) return '';
      if (A.isSecret && A.isSecret(a)) return 'Se desbloquea al completar un logro secreto.';
      var mm = typeof ALL_MEDALS !== 'undefined' ? ALL_MEDALS.filter(function (x) { return x.id === need; })[0] : null;
      return 'Se desbloquea al completar el logro «' + (mm ? mm.title : 'secreto') + '»';
    } catch (e) { return ''; }
  }
  function pickAvatar(a) {
    // 2.1: un avatar de logro no se puede elegir sin el logro (el servidor también lo rechaza).
    try { if (a && window.SEQAvatars && !window.SEQAvatars.isAvailable(a, hasStore() ? store.unlockedMedals : [])) return; } catch (e) {}
    var cur = $('seq-name-input'); if (cur) ui.editName = cur.value; // no perder lo ya escrito al re-pintar
    ui.avatarHint = null;
    ui.editAvatar = a === '' ? null : a; render();
    // 2.0: sin enfocar el campo de nombre: en móvil abriría el teclado en cada toque.
  }
  function saveProfile() {
    if (!account || ui.busy) return;
    var input = $('seq-name-input');
    var name = input ? String(input.value).trim() : account.player.display_name;
    if (!name) { toast('El nombre no puede estar vacío.', 'atencion'); return; }
    ui.busy = true;
    api('PATCH', '/me', { display_name: name, avatar: ui.editAvatar }).then(function (d) {
      var pl = cleanPlayer(d && d.player); account.player.display_name = pl.display_name; account.player.avatar = pl.avatar; saveAccount();
      ui.editing = false; toast(pickOne(['Perfil actualizado. Un poco de vanidad nunca viene mal.', 'Perfil actualizado. La presentación importa.']), 'correcto');
    }).catch(function (err) {
      if (authFailure(err)) return;
      toast(err && err.network ? 'Necesitas conexión para cambiar el perfil.' : 'No se ha podido guardar el perfil. Inténtalo de nuevo.', 'atencion');
    }).then(function () { ui.busy = false; render(); });
  }
  function copyId() {
    if (!account) return;
    var id = account.player.id;
    var done = function () { toast('ID copiado', 'correcto'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).then(done, function () { toast('ID: ' + id); });
    else toast('ID: ' + id);
  }

  function goToAccount() { try { switchTab('settings'); } catch (e) {} }

  // ---- Render de la interfaz -------------------------------------------------------------------
  function statusInfo() {
    if (!account) return ui.expired ? { cls: 'warn', text: 'Tu sesión ha caducado. Inicia sesión de nuevo con tu cuenta.' } : null;
    if (sync && sync.migration === 'pending') return ui.error ? { cls: 'bad', text: ui.error } : { cls: 'warn', text: 'Cargando tu progreso…' };
    if (sync && sync.needsMerge) return { cls: 'bad', text: 'El servidor no aceptó tu última sincronización. Tu progreso local está intacto: pulsa «Reintentar».' };
    if (ui.syncing) return { cls: 'info', text: 'Sincronizando...' };
    if (navigator.onLine === false) return { cls: 'warn', text: hasUnsynced() ? 'Sin conexión. Los cambios se sincronizarán cuando vuelva Internet.' : 'Sin conexión. El juego funciona con normalidad.' };
    if (ui.error) return { cls: 'bad', text: ui.error };
    if (hasUnsynced()) return { cls: 'info', text: 'Guardando en tu cuenta…' };
    if (sync && sync.lastSyncAt) return { cls: 'ok', text: 'Guardado en tu cuenta · ' + ago(sync.lastSyncAt) };
    return { cls: 'ok', text: 'Guardado en tu cuenta' };
  }

  // 2.0: la cuenta se presenta como el perfil del jugador. Arriba, una tarjeta pulsable (avatar, nombre,
  // nivel) que abre la edición; debajo, UNA línea de estado discreta. Los estados normales
  // (guardado / guardando / sincronizando) no ocupan sitio; solo los problemas se destacan y traen
  // su propia acción. Lo que casi nadie usa queda plegado en «Cuenta».
  function localXp() { try { return Math.max(0, Number(store.xp) || 0); } catch (e) { return 0; } }
  function renderAccount() {
    var host = $('online-account-section');
    if (!host) return;
    if (!ENABLED) { host.style.display = 'none'; return; }
    host.style.display = '';
    var st = statusInfo();
    if (!account) {
      host.innerHTML = '<h3 style="margin-top:0;">Tu perfil</h3>' +
        '<p class="settings-note">Entra con Google para guardar tu progreso en tu cuenta y jugar Duelos y Retos con tus amigos.</p>' +
        (st ? '<p class="seq-status seq-' + st.cls + '" id="seq-status">' + esc(st.text) + '</p>' : '') +
        '<div id="seq-gsi-slot" class="seq-gsi-slot"></div><p class="settings-note seq-msg" id="seq-online-msg">' + esc(ui.msg) + '</p>';
      return;
    }
    var p = account.player;
    var av = AVATARS.indexOf(p.avatar) !== -1 ? p.avatar : DEFAULT_AVATAR;
    var avHtml = window.SEQAvatars ? window.SEQAvatars.avatarHTML(av) : av;
    var xp = localXp();
    var quiet = st && (st.cls === 'ok' || st.cls === 'info');
    var html = '<h3 style="margin-top:0;">Tu perfil</h3>';
    if (ui.editing) {
      html += '<div class="seq-edit"><div class="seq-edit-head"><div class="seq-avatar seq-avatar-lg">' + (window.SEQAvatars ? window.SEQAvatars.avatarHTML(ui.editAvatar || av) : av) + '</div>' +
        '<div class="seq-edit-head-txt"><label class="settings-field-label" for="seq-name-input">Tu nombre</label>' +
        '<input id="seq-name-input" class="seq-input" type="text" maxlength="24" value="' + esc(ui.editName != null ? ui.editName : p.display_name) + '" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" onkeydown="if(event.key===\'Enter\')SEQOnline.saveProfile()"></div></div>' +
        '<p class="settings-kicker seq-av-kicker">Elige tu emblema</p>' +
        '<div class="seq-avatars" role="group" aria-label="Avatar">' +
        AVATARS.map(function (a) {
          var sel = (ui.editAvatar === a) || (ui.editAvatar == null && a === av);
          var img = window.SEQAvatars ? window.SEQAvatars.avatarHTML(a) : a;
          var name = window.SEQAvatars && window.SEQAvatars.shortName ? '<span class="seq-av-name">' + esc(window.SEQAvatars.shortName(a)) + '</span>' : '';
          var hint = avatarHintText(a), locked = !!hint;
          // Bloqueado: se puede tocar (no está «disabled») para ver el requisito; nunca se selecciona.
          if (locked) return '<button type="button" class="seq-av-btn seq-av-locked' + (ui.avatarHint === a ? ' hint' : '') + '" aria-disabled="true" aria-label="' + esc(window.SEQAvatars.shortName(a) + ' bloqueado. ' + hint) + '" onclick="SEQOnline.showAvatarHint(\'' + a + '\')">' + img + '<span class="seq-av-name">' + seqIco('candado') + esc(window.SEQAvatars.shortName(a)) + '</span></button>';
          return '<button type="button" class="seq-av-btn' + (sel ? ' sel' : '') + '" onclick="SEQOnline.pickAvatar(\'' + a + '\')" aria-pressed="' + sel + '">' + img + name + '</button>';
        }).join('') + '</div>' +
        (ui.avatarHint && avatarHintText(ui.avatarHint) ? '<p class="seq-av-hint" role="status" aria-live="polite">' + esc(avatarHintText(ui.avatarHint)) + '</p>' : '') +
        '<div class="seq-btnrow seq-btnrow-2"><button class="btn btn-secondary" onclick="SEQOnline.toggleEdit()">Cancelar</button><button class="btn btn-primary" onclick="SEQOnline.saveProfile()"' + (ui.busy ? ' disabled' : '') + '>Guardar</button></div></div>';
      host.innerHTML = html;
      return;
    }
    html += '<button type="button" class="seq-profile-card" onclick="SEQOnline.toggleEdit()" aria-label="Editar perfil">' +
      '<span class="seq-avatar seq-avatar-lg">' + avHtml + '</span>' +
      '<span class="seq-profile-info"><span class="seq-name">' + esc(p.display_name) + '</span>' +
      '<span class="seq-profile-level">Nivel ' + levelOf(xp) + ' · ' + xp + ' XP</span></span>' +
      '<span class="seq-profile-edit" aria-hidden="true"><span class="ui-line ui-line-pencil" aria-hidden="true"></span></span></button>';
    if (st) {
      if (quiet) html += '<p class="seq-sync-line seq-sync-' + st.cls + '" id="seq-status"><span class="seq-sync-dot" aria-hidden="true"></span>' + esc(st.text) + '</p>';
      else html += '<p class="seq-status seq-' + st.cls + '" id="seq-status">' + esc(st.text) + '</p>';
    }
    // Acciones que solo aparecen cuando hacen falta.
    if (mergeDue()) {
      html += '<div class="seq-btnrow"><button class="btn btn-primary" onclick="SEQOnline.doMerge()"' + (ui.busy ? ' disabled' : '') + '>↻ Reintentar</button></div>';
    } else if (st && !quiet && navigator.onLine !== false) {
      html += '<div class="seq-btnrow"><button class="btn btn-primary" onclick="SEQOnline.syncNowUi()"' + (ui.syncing ? ' disabled' : '') + '>↻ Reintentar</button></div>';
    }
    html += '<details class="seq-manage"><summary>Cuenta</summary>' +
      '<button class="seq-id" onclick="SEQOnline.copyId()" title="Copiar ID">Tu ID de jugador: <b>' + esc(p.id) + '</b> <span class="ui-line ui-line-copy" aria-hidden="true"></span></button>' +
      '<div class="seq-btnrow">' +
      '<button class="btn btn-secondary" onclick="SEQOnline.syncNowUi()"' + (ui.syncing ? ' disabled' : '') + '>↻ Sincronizar ahora</button>' +
      '<button class="btn btn-secondary" onclick="SEQOnline.signOut()">Cerrar sesión</button>' +
      '<button class="btn btn-danger" onclick="SEQOnline.deleteAccount()">Eliminar mi cuenta online</button></div></details>';
    host.innerHTML = html;
  }

  function render() {
    try { renderAccount(); } catch (e) { /* la UI online nunca debe romper el juego */ }
    notifyDuels();
    // v1.5 — Fase B (Prompt 3): actualiza si el gate de acceso obligatorio debe
    // mostrarse (solo lo hace cuando SEQOnline.enabled es true y no hay sesión;
    // ver updateAuthGate() en index.html). Se llama en cada cambio de estado de
    // cuenta (login, logout, expiración, borrado) para que el gate reaccione al
    // momento, sin esperar a un cambio de pestaña.
    try { if (typeof window.updateAuthGate === 'function') window.updateAuthGate(); } catch (e) {}
    // El script de Google solo se carga cuando el usuario está mirando Ajustes sin
    // sesión iniciada, o cuando el gate de acceso obligatorio está visible.
    if (ENABLED && !account) {
      var v = $('view-settings');
      var gateOpen = document.body.classList.contains('auth-gate-open');
      if ((v && v.classList.contains('active')) || gateOpen) ensureGisButtonLater();
    }
  }
  var gisTimer = null;
  function ensureGisButtonLater() { clearTimeout(gisTimer); gisTimer = setTimeout(ensureGisButton, 0); }

  // ---- Puntos de integración con el juego (llamados desde index.html) -----------------------------
  function onLocalSave() {
    // Llamado al final de saveStore(). Barato: si no hay cuenta, no hace nada.
    if (!ENABLED || !account || applying) return;
    try { if (hasStore() && playingNow()) return; } catch (e) {} // a mitad de partida: se sincroniza al terminar
    scheduleSync(5000);
  }
  function onTabShown(tabId) {
    if (!ENABLED) return;
    if (tabId === 'settings') render();
    if (tabId === 'duelo') notifyDuelsShown();
  }

  function init() {
    if (!ENABLED) { render(); return; }
    loadState();
    render();
    window.addEventListener('online', function () { retryStep = 0; render(); if (account && !playingNow()) syncNow('online'); if (mergeDue()) doMerge();});
    window.addEventListener('offline', function () { render(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && account) { render(); if (!playingNow()) scheduleSync(1000, 'visible'); } });
    if (account && !playingNow()) scheduleSync(1500, 'startup');
    // Unión pendiente (primer arranque, cierre a medias; los dispositivos que quedaron en el antiguo «saltado» se cargan también): se hace sola.
    if (account && sync && sync.migration === 'skipped') { sync.migration = 'pending'; saveSync(); }
    if (account && sync && sync.migration === 'pending') setTimeout(function () { if (navigator.onLine !== false && mergeDue()) doMerge(); }, 800);
    // En el resto de casos, la decisión pendiente queda visible en Ajustes; no se fuerza al arrancar.
  }

  window.SEQOnline = {
    enabled: ENABLED,
    init: init,
    onLocalSave: onLocalSave,
    onTabShown: onTabShown,
    syncNowUi: function () { retryStep = 0; syncNow('manual'); },
    // 2.0: el servidor concede XP al cerrar un Duelo / terminar tu parte de un Reto; el pull la trae a este dispositivo.
    syncSoon: function () { if (ENABLED && account) scheduleSync(1500, 'duelxp'); },
    signOut: signOut, logoutAll: logoutAll, deleteAccount: deleteAccount,
    goToAccount: goToAccount,
    retryGate: retryGate,
    accountHadProgress: function () { return loginHadProgress || !!(sync && account && progressHasData(sync.seen)); }, migrationPending: function () { return !!(ENABLED && account && sync && sync.migration === 'pending'); }, hasAccount: function () { return !!(ENABLED && account); }, doMerge: function () { mergeTries = 0; doMerge(); },
    rerenderAccount: function () { try { renderAccount(); } catch (e) {} },
    // 2.2: poner el nombre desde la pregunta de bienvenida (src/ui/name-prompt.js); no toca el avatar.
    setDisplayName: function (name) {
      if (!ENABLED || !account) return Promise.reject(Object.assign(new Error('Inicia sesión para usar esta función.'), { code: 'no_session' }));
      return api('PATCH', '/me', { display_name: String(name) }).then(function (d) {
        var pl = cleanPlayer(d && d.player); account.player.display_name = pl.display_name; saveAccount(); render(); return pl;
      });
    },
    toggleEdit: toggleEdit, pickAvatar: pickAvatar, showAvatarHint: showAvatarHint, saveProfile: saveProfile, copyId: copyId,
    // v1.5 — para src/online/duels.js: mismo cliente HTTP (sesión, timeouts, errores) sin duplicarlo.
    api: function (method, path, body) { if (!ENABLED || !account) return Promise.reject(Object.assign(new Error('Inicia sesión para usar esta función.'), { code: 'no_session' })); return api(method, path, body); },
    session: function () { return ENABLED && account ? { id: account.player.id, display_name: account.player.display_name, avatar: account.player.avatar, features: account.features || normFeatures() } : null; },
    // Solo para pruebas automatizadas:
    _state: function () { return { account: account, sync: sync, ui: ui }; },
    _syncNow: syncNow
  };

  document.addEventListener('DOMContentLoaded', init);
})();
