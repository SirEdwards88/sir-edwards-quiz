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
    return { ranking: f.ranking === true, classic_duel: f.classic_duel === true, async_challenges: f.async_challenges === true };
  }
  // v1.5: avisa a la capa de Duelos (src/online/duels.js). Nunca rompe nada.
  function notifyDuels() { try { if (window.SEQDuels && typeof window.SEQDuels.onAccountChange === 'function') window.SEQDuels.onAccountChange(); } catch (e) {} }
  function notifyDuelsShown() { try { if (window.SEQDuels && typeof window.SEQDuels.onShow === 'function') window.SEQDuels.onShow(); } catch (e) {} }
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ico(n, cls) { return window.seqIco ? window.seqIco(n, cls) : ''; }
  function toast(msg, icon) { try { if (typeof showInfoToast === 'function') showInfoToast(msg, icon); } catch (e) {} }
  // ¿Hay una partida REALMENTE a medias? hasSavedGame() ignora partidas ya terminadas/perdidas que aún dejan un `savedGame`
  // residual (p. ej. al cambiar el tema justo después de acabar): esas no deben bloquear la sincronización.
  function midGame() { try { return typeof hasSavedGame === 'function' ? hasSavedGame() : !!store.savedGame; } catch (e) { return false; } }
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
            err.retryAfter = Number(res.headers.get('Retry-After')) || 0;
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
      if (typeof checkModeUnlocksAndGetNew === 'function') checkModeUnlocksAndGetNew();
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
  function computeDelta() {
    var t = localTotals();
    var delta = {};
    COUNTERS.forEach(function (c) {
      var k = c[0];
      if (t[k] < sync.base[k]) sync.base[k] = t[k]; // reinicio/importación de copia antigua: se re-baselinea (nunca envía negativos)
      delta[k] = t[k] - sync.base[k];
    });
    var medalsNew = t.medals.some(function (id) { return sync.seen.medals.indexOf(id) === -1; });
    var bestNew = t.best_streak > sync.seen.best;
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
      return true;
    }
    return false;
  }

  // Lectura de la cuenta sin lote propio: aplica solo lo que aportaron otros dispositivos.
  function rankingOn() { return !!(ENABLED && account && account.features && account.features.ranking === true); }
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
        var r = applySyncResult(pending, cleanProgress(res && res.progress));
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
      ui.error = 'El servidor no aceptó una sincronización (' + (err && err.code ? err.code : 'error') + '). Pulsa «Restaurar / combinar progreso».';
      sync.pending = null; sync.needsMerge = true; sync.rejected = err && err.code ? err.code : 'error'; saveSync();
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
    if (navigator.onLine === false) { setMsg('Necesitas conexión para iniciar sesión.'); return; }
    var primary = slots[0];
    if (!force && primary.firstChild && gis.nonce && Date.now() - gis.at < NONCE_FRESH_MS) return; // ya pintado y vigente
    if (force !== true) setMsg(''); // al renovar tras un fallo se conserva el aviso («había caducado…»)
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
      setMsg(err && err.network === undefined && err.status ? 'No se pudo preparar el inicio de sesión. Inténtalo de nuevo más tarde.' : 'No se pudo cargar el inicio de sesión de Google. Comprueba tu conexión e inténtalo de nuevo.');
    });
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
      var same = sync && sync.playerId === data.player.id;
      if (same && sync.migration !== 'pending') {
        // Misma cuenta que ya estaba enlazada en este dispositivo: se retoma sin volver a preguntar.
        toast('Sesión iniciada', '✅');
        render();
        syncNow('login');
      } else {
        var otherBefore = !!(sync && sync.playerId !== data.player.id);
        var hasLocal = hasLocalProgress();
        var hasOnline = progressHasData(data.progress);
        loginHadProgress = hasOnline; // para no dar la bienvenida de «nuevo aspirante» a quien ya jugaba en otro dispositivo
        sync = newSyncState(data.player.id, 'pending', baseFromLocal(), seenFrom(data.progress));
        sync.otherAccountBefore = otherBefore;
        saveSync();
        if (!hasLocal && !hasOnline) {
          sync.migration = 'done'; saveSync();
          toast('Sesión iniciada', '✅');
        } else {
          openMigration(data.progress);
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
          ? 'No se pudo renovar el inicio de sesión. Cierra y vuelve a abrir la app e inténtalo de nuevo.'
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
        ? 'No hemos podido conectar para completar el acceso. Comprueba tu conexión y vuelve a intentarlo.'
        : ('No hemos podido completar el acceso' + (err && err.message ? ': ' + err.message : '.') + ' Vuelve a intentarlo.'));
    }).then(function () { ui.busy = false; });
  }

  function signOut() {
    // Cerrar sesión NO elimina la cuenta ni borra nada local: solo descarta el token.
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    account = null; saveAccount(); ui.editing = false; ui.expired = false; ui.error = '';
    clearTimeout(timer); clearTimeout(retryTimer);
    toast('Sesión cerrada. Tu progreso sigue en este dispositivo.', '👋');
    render();
  }

  function logoutAll() {
    if (!account) return;
    showAppConfirm({
      title: 'Cerrar sesión en todos los dispositivos',
      message: 'Se cerrará tu sesión aquí y en cualquier otro dispositivo donde hayas entrado. No se borra nada: podrás volver a iniciar sesión.',
      confirmLabel: 'Cerrar en todos',
      onConfirm: function () {
        api('POST', '/auth/logout-all').then(function () { signOut(); }).catch(function (err) {
          if (authFailure(err)) { render(); return; }
          toast(err && err.network ? 'Necesitas conexión para cerrar todas las sesiones.' : 'No se pudo completar la operación.', '⚠️');
        });
      }
    });
  }

  function deleteAccount() {
    if (!account) return;
    var id = account.player.id;
    showAppConfirm({
      title: 'Eliminar cuenta online',
      message: 'Se borrará tu cuenta, tu perfil y tu progreso guardados en el servidor, y también el progreso de este dispositivo (nivel, XP, logros y estadísticas). Esta acción no se puede deshacer.',
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
          } catch (e) {}
          location.reload();
        }).catch(function (err) {
          if (authFailure(err)) { render(); return; }
          toast(err && err.network ? 'Necesitas conexión para eliminar la cuenta.' : 'No se pudo eliminar la cuenta.', '⚠️');
        });
      }
    });
  }

  // ---- Migración / combinación ---------------------------------------------------------
  function summaryHtml(title, t) {
    return '<div class="seq-sum"><div class="seq-sum-title">' + title + '</div>' +
      '<div>Nivel <b>' + levelOf(t.xp) + '</b> · <b>' + t.xp + '</b> XP</div>' +
      '<div><b>' + t.games + '</b> partidas · <b>' + t.medals.length + '</b> logros</div></div>';
  }
  function openMigration(onlineProgress) {
    if (!$('seq-migrate-modal')) return;
    var open = function (online) {
      var loc = localTotals();
      var on = { xp: n(online.xp), games: n(online.games), medals: online.medals || [] };
      var hasLocal = hasLocalProgress(), hasOnline = progressHasData(online);
      var title, text, primary;
      if (hasLocal && !hasOnline) {
        title = 'Guardar tu progreso en la cuenta';
        text = 'Tienes progreso en este dispositivo. Puedes asociarlo a tu cuenta para no perderlo y llevarlo a cualquier dispositivo. <b>No se borra nada de este dispositivo.</b>';
        primary = 'Asociar mi progreso a la cuenta';
      } else if (!hasLocal && hasOnline) {
        title = 'Recuperar el progreso de tu cuenta';
        text = 'Tu cuenta ya tiene progreso guardado. Puedes traerlo a este dispositivo.';
        primary = 'Recuperar progreso de la cuenta';
      } else {
        title = 'Combinar tu progreso';
        text = 'Hay progreso en este dispositivo y en tu cuenta. Al combinar se conserva <b>el valor más alto de cada contador</b> y <b>todos los logros de ambos lados</b>. No se borra nada en ningún sitio.';
        primary = 'Combinar progreso';
      }
      var warn = (sync && sync.otherAccountBefore) ? '<p class="seq-warn">' + ico('atencion') + 'Este dispositivo estuvo enlazado a otra cuenta. Combina solo si el progreso de aquí es tuyo.</p>' : '';
      var host = $('seq-migrate-body');
      host.innerHTML =
        '<p>' + text + '</p>' +
        '<div class="seq-sums">' + summaryHtml(ico('movil') + 'En este dispositivo', loc) + summaryHtml(ico('nube') + 'En tu cuenta', { xp: on.xp, games: on.games, medals: on.medals }) + '</div>' + warn +
        '<p class="seq-note">Esta operación es segura y se puede repetir: nunca suma dos veces ni reduce nada.</p>' +
        '<div class="modal-warning-actions seq-actions">' +
        '<button class="btn btn-primary" id="seq-mig-primary" onclick="SEQOnline.doMerge()">' + primary + '</button>' +
        '<button class="btn btn-secondary" onclick="SEQOnline.skipMigration()">Ahora no (la cuenta empieza desde hoy)</button>' +
        '<button class="seq-link" onclick="SEQOnline.closeMigration()">Decidir más tarde</button></div>';
      $('seq-migrate-modal').style.display = 'flex';
    };
    if (onlineProgress) return open(onlineProgress);
    // Abierto desde Ajustes: pedimos el estado actual de la cuenta.
    api('GET', '/me').then(function (d) { refreshFeatures(d); open(cleanProgress(d && d.progress)); }).catch(function (err) {
      if (authFailure(err)) { render(); return; }
      toast(err && err.network ? 'Necesitas conexión para migrar.' : 'No se pudo consultar la cuenta.', '⚠️');
    });
  }
  function closeMigration() { var m = $('seq-migrate-modal'); if (m) m.style.display = 'none'; render(); }

  function doMerge(retried) {
    if (!account || !sync || ui.busy) return;
    ui.busy = true;
    var btn = $('seq-mig-primary'); if (btn) { btn.disabled = true; btn.textContent = 'Combinando…'; }
    var t = localTotals(), sentWeekly = unconfirmedWeekly();
    api('POST', '/progress/merge', { match_id: 'mig-' + newMatchId().slice(2), local: { xp: t.xp, games: t.games, correct: t.correct, wrong: t.wrong, best_streak: t.best_streak, medals: t.medals }, weekly: sentWeekly })
      .then(function (res) {
        var p = cleanProgress(res && res.progress), gamesAdded = 0, target = {};
        COUNTERS.forEach(function (c) {
          var sv = n(p[c[0]]), lv = n(store[c[1]]);
          target[c[0]] = Math.max(sv, lv);
          if (sv > lv && c[0] === 'games') gamesAdded = sv - lv;
        });
        // ORDEN IMPORTANTE (integridad ante cierres a mitad): primero se guarda el estado de sync con la
        // nueva línea base, y solo después se modifica el store. Si la app se cierra entre ambos pasos, el
        // store queda por DEBAJO de la línea base y el cliente re-baselinea hacia abajo (no envía nada):
        // se puede repetir la combinación. El orden inverso enviaría lo recién traído como si fuera
        // progreso nuevo y lo contaría dos veces en el servidor.
        sync = newSyncState(account.player.id, 'done', { xp: target.xp, games: target.games, correct: target.correct, wrong: target.wrong }, seenFrom(p));
        confirmWeekly(sentWeekly);
        sync.lastSyncAt = Date.now();
        saveSync();
        COUNTERS.forEach(function (c) { store[c[1]] = target[c[0]]; });
        store.bestStreak = Math.max(n(store.bestStreak), n(p.best_streak));
        unionMedalsIntoStore(p.medals);
        afterLocalChange(gamesAdded);
        var m = $('seq-migrate-modal'); if (m) m.style.display = 'none';
        toast(res.adjusted ? 'Progreso combinado (se ajustó algún valor imposible).' : 'Progreso combinado con tu cuenta', '✅');
        scheduleSync(1800, 'merge'); // logros derivados que el juego desbloquea localmente al aplicar los totales
      })
      .catch(function (err) {
        if (authFailure(err)) { closeMigration(); return; }
        if (err && err.status === 429 && retried !== true) {
          // El servidor limita la frecuencia (p. ej. justo después de una sincronización automática):
          // se reintenta una vez sola, en cuanto pase el plazo que indica el servidor.
          if (btn) btn.textContent = 'Un momento…';
          setTimeout(function () { doMerge(true); }, Math.max(2, err.retryAfter || 2) * 1000);
          return;
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Reintentar'; }
        toast(err && err.network ? 'Sin conexión: inténtalo de nuevo cuando vuelva Internet.' : 'No se pudo combinar' + (err && err.message ? ': ' + err.message : '.'), '⚠️');
      })
      .then(function () { ui.busy = false; render(); });
  }

  // «Reiniciar progreso» con cuenta: el dispositivo vuelve a empezar de cero y, al recargar, se ofrece
  // «Recuperar el progreso de tu cuenta». Se deja la sincronización en «pendiente» con línea base 0
  // (si no, el cliente creería que el servidor ya tenía contado lo borrado y nunca lo devolvería) y se
  // olvida el estado de la sincronización de datos (historial, estadísticas…).
  function prepareLocalReset() {
    if (!ENABLED || !account) return false;
    sync = newSyncState(account.player.id, 'pending', { xp: 0, games: 0, correct: 0, wrong: 0 }, emptySeen());
    sync.afterReset = true;
    saveSync();
    try { localStorage.removeItem('siredwards_quiz_v2_0_datasync'); } catch (e) {}
    return true;
  }

  function skipMigration() {
    if (!account || !sync) return;
    // La cuenta empieza a contar desde ahora; el progreso local queda intacto.
    var seen = sync.seen || emptySeen();
    sync = newSyncState(account.player.id, 'skipped', baseFromLocal(), seen);
    saveSync();
    var m = $('seq-migrate-modal'); if (m) m.style.display = 'none';
    toast('Vale: tu progreso local no se ha tocado.', 'ℹ️');
    render();
    syncNow('skip');
  }

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
      if (A.isSecret && A.isSecret(a)) return '🔒 Se desbloquea al completar un logro secreto.';
      var mm = typeof ALL_MEDALS !== 'undefined' ? ALL_MEDALS.filter(function (x) { return x.id === need; })[0] : null;
      return '🔒 Se desbloquea al completar el logro «' + (mm ? mm.title : 'secreto') + '»';
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
    if (!name) { toast('El nombre no puede estar vacío.', '⚠️'); return; }
    ui.busy = true;
    api('PATCH', '/me', { display_name: name, avatar: ui.editAvatar }).then(function (d) {
      var pl = cleanPlayer(d && d.player); account.player.display_name = pl.display_name; account.player.avatar = pl.avatar; saveAccount();
      ui.editing = false; toast('Perfil actualizado', '✅');
    }).catch(function (err) {
      if (authFailure(err)) return;
      toast(err && err.network ? 'Necesitas conexión para cambiar el perfil.' : ('No se pudo guardar: ' + (err && err.message ? err.message : 'error')), '⚠️');
    }).then(function () { ui.busy = false; render(); });
  }
  function copyId() {
    if (!account) return;
    var id = account.player.id;
    var done = function () { toast('ID copiado', '📋'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).then(done, function () { toast('ID: ' + id, 'ℹ️'); });
    else toast('ID: ' + id, 'ℹ️');
  }

  // ---- Ranking -------------------------------------------------------------------------------
  function openRanking() {
    if (!rankingOn()) return; // el ranking está desactivado en el servidor por defecto
    var m = $('seq-ranking-modal'); if (!m) return;
    m.style.display = 'flex';
    loadRanking();
  }
  function closeRanking() { var m = $('seq-ranking-modal'); if (m) m.style.display = 'none'; }
  function goToAccount() { closeRanking(); try { switchTab('settings'); } catch (e) {} }
  function loadRanking() {
    var body = $('seq-ranking-body'); if (!body) return;
    if (!rankingOn()) {
      body.innerHTML = '<p>El ranking no está disponible.</p>';
      return;
    }
    if (!account) {
      body.innerHTML = '<p>Inicia sesión con Google para ver el ranking global y aparecer en él.</p><div class="modal-warning-actions"><button class="btn btn-primary" onclick="SEQOnline.goToAccount()">Ir a Cuenta online</button></div>';
      return;
    }
    if (navigator.onLine === false) { body.innerHTML = '<p>El ranking necesita conexión.</p>' + retryBtn(); return; }
    body.innerHTML = '<p class="seq-loading">Cargando ranking…</p>';
    api('GET', '/ranking?limit=50').then(function (d) {
      // Todo lo que llega del servidor se trata como NO fiable al pintar: los números pasan por n() (entero >= 0),
      // el avatar solo se acepta si está en la lista cerrada y los textos por esc().
      if (!d || !Array.isArray(d.ranking)) throw invalidResponse();
      var list = d.ranking.filter(function (r) { return r && typeof r === 'object'; }).slice(0, 100);
      var rows = list.map(function (r) {
        var av = AVATARS.indexOf(r.avatar) !== -1 ? r.avatar : DEFAULT_AVATAR;
        var rk = n(r.rank), xp = n(r.xp), me = r.is_me === true;
        var pos = rk === 1 ? ico('oro', 'seq-ico-lg') : rk === 2 ? ico('plata', 'seq-ico-lg') : rk === 3 ? ico('bronce', 'seq-ico-lg') : rk;
        return '<li class="seq-rank-row' + (me ? ' me' : '') + '"><span class="seq-rank-pos">' + pos + '</span><span class="seq-rank-av">' + (window.SEQAvatars ? window.SEQAvatars.avatarHTML(av) : av) + '</span>' +
          '<span class="seq-rank-name">' + esc(r.display_name) + (me ? ' <em>(tú)</em>' : '') + '</span>' +
          '<span class="seq-rank-xp"><b>Nv ' + levelOf(xp) + '</b><small>' + xp + ' XP</small></span></li>';
      }).join('');
      var meOut = d.me && typeof d.me === 'object' && !list.some(function (r) { return r.is_me === true; })
        ? '<div class="seq-rank-me-out">Tu puesto: <b>#' + n(d.me.rank) + '</b> de ' + n(d.total_players) + ' · ' + n(d.me.xp) + ' XP</div>' : '';
      body.innerHTML = (rows ? '<ol class="seq-rank-list">' + rows + '</ol>' : '<p>Aún no hay nadie en el ranking.</p>') + meOut +
        '<p class="seq-note">Clasificación por XP total online. Se actualiza cuando cada jugador sincroniza.</p>' +
        '<p class="seq-warn">' + ico('atencion') + 'Clasificación NO verificada: cada dispositivo informa de su propio progreso y el servidor no puede comprobar que los aciertos sean reales.</p>' + retryBtn();
    }).catch(function (err) {
      if (authFailure(err)) { body.innerHTML = '<p>Tu sesión ha caducado. Vuelve a iniciar sesión desde Ajustes.</p>'; render(); return; }
      body.innerHTML = '<p>' + (err && err.network ? 'No se pudo conectar. El juego sigue funcionando sin conexión.' : 'No se pudo cargar el ranking.') + '</p>' + retryBtn();
    });
  }
  function retryBtn() { return '<div class="modal-warning-actions"><button class="btn btn-secondary" onclick="SEQOnline.loadRanking()">↻ Actualizar</button></div>'; }

  // ---- Render de la interfaz -------------------------------------------------------------------
  function statusInfo() {
    if (!account) return ui.expired ? { cls: 'warn', text: 'Tu sesión ha caducado. Inicia sesión de nuevo: tu progreso local sigue aquí y se retomará tu cuenta.' } : null;
    if (sync && sync.migration === 'pending') return { cls: 'warn', text: 'Falta decidir qué hacer con tu progreso local.' };
    if (sync && sync.needsMerge) return { cls: 'bad', text: 'El servidor no aceptó tu última sincronización. Tu progreso local está intacto: pulsa «Restaurar / combinar progreso».' };
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
        '<input id="seq-name-input" class="seq-input" type="text" maxlength="24" value="' + esc(ui.editName != null ? ui.editName : p.display_name) + '" autocomplete="off"></div></div>' +
        '<p class="settings-kicker seq-av-kicker">Elige tu emblema</p>' +
        '<div class="seq-avatars" role="group" aria-label="Avatar">' +
        AVATARS.map(function (a) {
          var sel = (ui.editAvatar === a) || (ui.editAvatar == null && a === av);
          var img = window.SEQAvatars ? window.SEQAvatars.avatarHTML(a) : a;
          var name = window.SEQAvatars && window.SEQAvatars.shortName ? '<span class="seq-av-name">' + esc(window.SEQAvatars.shortName(a)) + '</span>' : '';
          var hint = avatarHintText(a), locked = !!hint;
          // Bloqueado: se puede tocar (no está «disabled») para ver el requisito; nunca se selecciona.
          if (locked) return '<button type="button" class="seq-av-btn seq-av-locked' + (ui.avatarHint === a ? ' hint' : '') + '" aria-disabled="true" aria-label="' + esc(window.SEQAvatars.shortName(a) + ' bloqueado. ' + hint.replace('🔒 ', '')) + '" onclick="SEQOnline.showAvatarHint(\'' + a + '\')">' + img + '<span class="seq-av-name">🔒 ' + esc(window.SEQAvatars.shortName(a)) + '</span></button>';
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
    if (sync && (sync.migration === 'pending' || sync.needsMerge)) {
      html += '<div class="seq-btnrow"><button class="btn btn-primary" onclick="SEQOnline.openMigration()">' + (sync.migration === 'pending' ? '<span class="ui-line ui-line-arrow" aria-hidden="true"></span>Decidir sobre mi progreso local' : '<span class="ui-line ui-line-swap" aria-hidden="true"></span>Restaurar / combinar progreso') + '</button></div>';
    } else if (st && !quiet && navigator.onLine !== false) {
      html += '<div class="seq-btnrow"><button class="btn btn-primary" onclick="SEQOnline.syncNowUi()"' + (ui.syncing ? ' disabled' : '') + '>↻ Reintentar</button></div>';
    }
    if (rankingOn()) html += '<div class="seq-btnrow"><button class="btn btn-secondary" onclick="SEQOnline.openRanking()"><img class="ui-img ui-btn-img" src="assets/modes/mini/ranking.webp" alt="" draggable="false">Ranking global</button></div>';
    html += '<details class="seq-manage"><summary>Cuenta</summary>' +
      '<button class="seq-id" onclick="SEQOnline.copyId()" title="Copiar ID">Tu ID de jugador: <b>' + esc(p.id) + '</b> <span class="ui-line ui-line-copy" aria-hidden="true"></span></button>' +
      '<div class="seq-btnrow">' +
      '<button class="btn btn-secondary" onclick="SEQOnline.syncNowUi()"' + (ui.syncing ? ' disabled' : '') + '>↻ Sincronizar ahora</button>' +
      (sync && (sync.migration === 'pending' || sync.needsMerge) ? '' : '<button class="btn btn-secondary" onclick="SEQOnline.openMigration()"><span class="ui-line ui-line-swap" aria-hidden="true"></span>Restaurar / combinar progreso</button>') +
      '<button class="btn btn-secondary" onclick="SEQOnline.signOut()">Cerrar sesión</button>' +
      '<button class="btn btn-secondary" onclick="SEQOnline.logoutAll()">Cerrar sesión en todos los dispositivos</button>' +
      '<button class="btn btn-danger" onclick="SEQOnline.deleteAccount()">Eliminar mi cuenta online</button></div>' +
      '<p class="settings-note">Cerrar sesión no borra nada: puedes volver a entrar cuando quieras. Eliminar la cuenta borra tu perfil y tu progreso del servidor, y también el progreso de este dispositivo.</p>' +
      '<p class="settings-note">Tu progreso lo informa tu dispositivo: no sirve como prueba de resultados.</p></details>';
    host.innerHTML = html;
  }

  function renderStatsSlot() {
    var slot = $('seq-stats-slot');
    if (!slot) return;
    if (!rankingOn()) { slot.innerHTML = ''; return; }
    slot.innerHTML = '<button class="btn btn-secondary seq-stats-rank-btn" onclick="SEQOnline.openRanking()"><img class="ui-img ui-btn-img" src="assets/modes/mini/ranking.webp" alt="" draggable="false">Ranking global</button>';
  }

  function render() {
    try { renderAccount(); renderStatsSlot(); } catch (e) { /* la UI online nunca debe romper el juego */ }
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
    try { if (hasStore() && midGame()) return; } catch (e) {} // a mitad de partida: se sincroniza al terminar
    scheduleSync(5000);
  }
  function onTabShown(tabId) {
    if (!ENABLED) return;
    if (tabId === 'settings') render();
    if (tabId === 'stats') renderStatsSlot();
    if (tabId === 'duelo') notifyDuelsShown();
  }

  function init() {
    if (!ENABLED) { render(); return; }
    loadState();
    render();
    window.addEventListener('online', function () { retryStep = 0; render(); if (account) syncNow('online'); });
    window.addEventListener('offline', function () { render(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && account) { render(); scheduleSync(1000, 'visible'); } });
    if (account) scheduleSync(1500, 'startup');
    if (account && sync && sync.migration === 'pending' && sync.afterReset) {
      // Tras «Reiniciar progreso» con cuenta: se ofrece recuperar lo de la cuenta en cuanto haya conexión.
      sync.afterReset = false; saveSync();
      setTimeout(function () { if (navigator.onLine !== false) openMigration(); }, 1200);
    }
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
    openRanking: openRanking, closeRanking: closeRanking, loadRanking: loadRanking, goToAccount: goToAccount,
    openMigration: function () { openMigration(); }, prepareLocalReset: prepareLocalReset, accountHadProgress: function () { return loginHadProgress; }, hasAccount: function () { return !!(ENABLED && account); }, closeMigration: closeMigration, doMerge: doMerge, skipMigration: skipMigration,
    rerenderAccount: function () { try { renderAccount(); } catch (e) {} },
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
