// SirEdwards Quiz v2.0 — sincronización de TODOS los datos de jugador con la cuenta.
//
// Complementa (no sustituye) a /progress/sync de la v1.4, que sigue llevando XP, partidas, aciertos,
// fallos, mejor racha y logros con deltas idempotentes. Este módulo lleva el resto de lo que hay en
// `store`: historial, estadísticas por pregunta, preguntas falladas/vistas, ajustes, Duelo (estadísticas,
// rivales, historial) y contadores de modos.
//
// Cómo funciona (ver src/utils/sync-merge.js, que comparte código con el servidor):
//   1. Se extrae de `store` un documento acotado y saneado.
//   2. POST /data/sync: el servidor lo COMBINA con lo que ya tiene (nunca lo sustituye) y devuelve el resultado.
//   3. Se combina ese resultado con el `store` ACTUAL (por si el jugador siguió jugando mientras volaba la
//      petición) y se aplica. Nada se resta: máximos, uniones y «gana el cambio más reciente» por grupo.
//   4. Si sigue habiendo algo local que el servidor no tiene, se repite (hasta 3 vueltas).
// La combinación es idempotente: reenviar lo mismo tras un corte no duplica nada. Sin conexión no se pierde
// nada: el store local es la cola, y el documento se vuelve a extraer en cuanto haya red.
//
// Estado propio (una clave pequeña): siredwards_quiz_v2_0_datasync -> {v, playerId, t, s, fp, lastAt}
//   t  = instante de la última modificación local de cada grupo de ajustes/aprendizaje
//   s  = huella del contenido de cada grupo la última vez que se miró (para detectar cambios locales)
//   fp = huella del último documento confirmado por el servidor (para no hacer peticiones inútiles)
//
// Script clásico: usa `SEQSyncMerge` (src/utils/sync-merge.js) y, en tiempo de ejecución, store/saveStore & co.

(function () {
  'use strict';

  var KEY = 'siredwards_quiz_v2_0_datasync';
  var MAX_ROUNDS = 3;
  var M = function () { return window.SEQSyncMerge || (typeof SEQSyncMerge !== 'undefined' ? SEQSyncMerge : null); };

  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function fingerprint(doc) {
    var s = M().stableStringify(doc), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16) + ':' + s.length;
  }

  var state = null;
  function load(playerId) {
    var s = lsGet();
    if (s && s.v === 1 && s.playerId === playerId && s.t && s.s) state = s;
    else state = { v: 1, playerId: playerId, t: {}, s: {}, fp: '', lastAt: 0 };
    return state;
  }
  function save() { if (state) lsSet(state); }

  // ¿El grupo está tal cual lo crea el juego por defecto? Un dispositivo nuevo no debe pisar con sus valores
  // por defecto los ajustes reales de la cuenta.
  function isDefaultGroup(name) {
    var v = {};
    M().GROUPS[name].forEach(function (k) { v[k] = store[k]; });
    // El tema es local de cada dispositivo (ver run()): no cuenta para saber si los ajustes son los de por defecto.
    if (name === 'settings') return v.sound === undefined || v.sound === 'on';
    return !(v.failedQuestions && v.failedQuestions.length) && !(v.recentQuestionIds && v.recentQuestionIds.length) &&
      !(v.questionStreaks && Object.keys(v.questionStreaks).length);
  }

  // Detecta cambios locales de cada grupo (ajustes / aprendizaje) y fija su marca de tiempo `t`:
  //   primera vez que se ve el grupo: 0 si son valores por defecto (no compite), 1 si ya tiene contenido real;
  //   después, cualquier cambio de contenido = «modificado ahora».
  function refreshMeta(st) {
    var now = Date.now();
    Object.keys(M().GROUPS).forEach(function (g) {
      var cur = M().groupHash(store, g);
      if (st.s[g] === undefined) { st.t[g] = isDefaultGroup(g) ? 0 : 1; st.s[g] = cur; }
      else if (st.s[g] !== cur) { st.t[g] = now; st.s[g] = cur; }
    });
  }
  // Documento que se enviaría ahora. Un grupo por defecto y nunca modificado (t = 0) no se envía.
  function docFor(st) {
    refreshMeta(st);
    var doc = M().extractDoc(store, st);
    Object.keys(M().GROUPS).forEach(function (g) { if (!st.t[g] && doc.g[g]) delete doc.g[g]; });
    return doc;
  }

  function refreshUi() {
    try { if (typeof applyTheme === 'function') applyTheme(store.theme); } catch (e) {}
    try { if (typeof updateThemeButtons === 'function') updateThemeButtons(store.theme); } catch (e) {}
    try { if (typeof updateSoundButtons === 'function') updateSoundButtons(store.sound); } catch (e) {}
    try { if (typeof updateBadges === 'function') updateBadges(); } catch (e) {}
  }
  function wrapErr(err) { if (err && typeof err === 'object') err.dataSync = true; return err; }

  // env = { api(method, path, body), playerId, withApplying(fn), afterApply() }
  // reason: 'auto' (tras guardar: solo si hay algo nuevo) u otro (arranque, volver a la app, manual…: también consulta).
  function run(env, reason) {
    if (!M()) return Promise.resolve('unavailable');
    if (typeof store === 'undefined' || !store) return Promise.resolve('nostore');
    try { if (typeof hasSavedGame === 'function' ? hasSavedGame() : store.savedGame) return Promise.resolve('ingame'); } catch (e) {} // a mitad de partida: al terminar
    load(env.playerId);
    var rounds = 0;

    function round() {
      rounds++;
      var doc = docFor(state);
      var fp = fingerprint(doc);
      if (reason === 'auto' && rounds === 1 && fp === state.fp) { save(); return Promise.resolve('idle'); }
      return env.api('POST', '/data/sync', { data: doc }).then(function (res) {
        var server = res && res.data;
        if (!server || typeof server !== 'object') { var e = new Error('invalid'); e.invalid = true; throw e; }
        server = M().sanitizeDoc(server);
        // El tema (claro/oscuro) es una preferencia de CADA dispositivo (móvil oscuro, ordenador claro…): lo que
        // venga de la cuenta nunca lo cambia. Se sustituye el del servidor por el local antes de combinar, para que
        // no haya conflicto ni vueltas extra de sincronización. El sonido sí sigue sincronizándose.
        try {
          var sg = server.g && server.g.settings;
          if (sg && sg.v && (store.theme === 'light' || store.theme === 'dark')) sg.v.theme = store.theme;
        } catch (e) {}
        // Se combina con el store ACTUAL (puede haber cambiado mientras volaba la petición) y se aplica.
        refreshMeta(state);
        var finalDoc = M().mergeDocs(M().extractDoc(store, state), server);
        var changed = false;
        env.withApplying(function () {
          changed = M().applyDoc(store, finalDoc);
          if (changed) {
            try { if (typeof sanitizeStore === 'function') sanitizeStore(store); } catch (e) {}
            if (typeof env.afterApply === 'function') env.afterApply();
          }
        });
        if (changed) refreshUi();
        // Lo que se acaba de aplicar no cuenta como cambio local: se actualizan marcas y huellas.
        Object.keys(M().GROUPS).forEach(function (g) {
          if (finalDoc.g[g]) state.t[g] = finalDoc.g[g].t;
          state.s[g] = M().groupHash(store, g);
        });
        var after = docFor(state);
        var inSync = M().docsEqual(after, server);
        state.fp = inSync ? fingerprint(after) : '';
        state.lastAt = Date.now();
        save();
        if (!inSync && rounds < MAX_ROUNDS) return round();
        return inSync ? 'ok' : 'partial';
      });
    }
    return round().catch(function (err) { throw wrapErr(err); });
  }

  // ¿Hay cambios locales que el servidor todavía no ha confirmado? (no modifica el estado guardado)
  function hasPending(playerId) {
    try {
      if (!M() || typeof store === 'undefined' || !store) return false;
      var st = JSON.parse(JSON.stringify(load(playerId)));
      return fingerprint(docFor(st)) !== st.fp;
    } catch (e) { return false; }
  }
  function reset() { state = null; try { localStorage.removeItem(KEY); } catch (e) {} }

  window.SEQDataSync = { run: run, hasPending: hasPending, reset: reset, _fingerprint: fingerprint };
})();
