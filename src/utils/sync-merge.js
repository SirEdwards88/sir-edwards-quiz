// SirEdwards Quiz v2.0 — combinación de los datos de jugador que NO viajan por
// /progress/sync (historial, estadísticas por pregunta, preguntas falladas,
// ajustes, Duelo, contadores de modos…).
//
// ESTE ARCHIVO ES LA ÚNICA FUENTE DE VERDAD DE LA COMBINACIÓN y se usa en DOS sitios:
//   - cliente (src/utils/sync-merge.js, script clásico -> `SEQSyncMerge` global)
//   - servidor (backend src/sync-merge.js: MISMO texto + una línea final `export default`)
// Un test del backend comprueba que ambos textos son idénticos.
//
// Propiedades que se exigen (y se prueban): la combinación es CONMUTATIVA, ASOCIATIVA e
// IDEMPOTENTE. Por eso repetir una petición, reintentarla tras un corte o combinarla en otro
// orden nunca duplica ni resta nada, y no importa qué dispositivo sincronice primero.
//
// Tipos de campo (cada dato del juego pertenece a exactamente uno):
//   max   -> número: gana el mayor (récords, contadores de modo). Nunca suma dos veces.
//   or    -> booleano: true si algún dispositivo lo tiene (banderas de logros).
//   set   -> lista: unión sin duplicados (preguntas vistas, avisos ya mostrados, códigos de reto jugados).
//   hist  -> lista de objetos: unión por contenido, orden por `ts` desc, con tope (historiales).
//   kmax  -> objeto clave -> {campo: número}: máximo por clave y por campo (estadísticas por pregunta, rivales).
//   grupo LWW (settings / learning) -> gana el grupo modificado más recientemente (`t`), empate
//            resuelto de forma determinista. Son ajustes y estado de repaso, donde «lo último que hice» manda.
//
// Los contadores acumulados grandes (XP, partidas, aciertos, fallos, mejor racha, logros) NO están aquí:
// siguen con su mecanismo de deltas idempotentes (/progress/sync) de la v1.4.

const SEQSyncMerge = (function () {
  'use strict';

  const DOC_VERSION = 1;
  const MAX_NUM = 1e9;

  const MAX_FIELDS = [
    'standardGamesCount', 'errorsCleaned', 'survivalAmebaWins', 'survivalHumanoWins', 'survivalDerrameWins',
    'suddenWins', 'maxTimeTrialScore', 'standardBestStreak', 'timeTrialBestStreak', 'hardBestStreak',
    'noRepeatCatBestStreak', 'bestMentalCalcScore', 'mentalCalcBestStreak', 'bestMentalCalcCorrect',
    'mentalCalcTotalCorrect', 'bestLucidezScore', 'bestLucidezStreak', 'lucidezTotalCorrect',
    'duelStats.played', 'duelStats.wins', 'duelStats.losses', 'duelStats.draws',
    'duelStats.bestWinStreak', 'duelStats.bestWinsVsRival'
  ];
  const OR_FIELDS = [
    'hasCompletedNightGame', 'lucidezPlayed', 'lucidezEverWon', 'lucidezEverPerfect',
    'duelStats.wonByOnePoint', 'duelStats.wonByTenPlus', 'duelStats.revengeWon'
  ];
  const SET_FIELDS = { seenQuestionIds: 2000, notifiedModeUnlocks: 50, notifiedFragmentRewards: 10, duelPlayedCodes: 400 };
  const HIST_FIELDS = { gameHistory: 5, duelHistory: 30 };
  // campo -> {claves permitidas de cada entrada, patrón de la clave}
  const KMAX_FIELDS = {
    questionStats: { subs: ['correct', 'wrong'], keyRe: /^L?[0-9]{1,6}$/, maxKeys: 2500 },
    'duelStats.rivals': { subs: ['wins', 'losses'], keyRe: /^[0-9A-Z]{10}$/, maxKeys: 100 }
  };
  const GROUPS = {
    settings: ['theme', 'sound'],
    learning: ['failedQuestions', 'questionStreaks', 'recentQuestionIds']
  };

  // ---- utilidades -------------------------------------------------------------------------
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function cleanNum(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(Math.floor(v), MAX_NUM) : 0; }
  function cmpAny(a, b) {
    const ta = typeof a, tb = typeof b;
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function stableStringify(v) {
    if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stableStringify(v[k]); }).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }

  // ---- limpieza de una entrada de historial (lista blanca de campos y tipos) ----------------
  const ENTRY_STR = { date: 40, mode: 40, score: 20, code: 40, role: 12, modeId: 40, result: 10 };
  const ENTRY_NUM = ['percentage', 'cfgIdx', 'myScore', 'totalQ', 'opponentScore', 'ts'];
  function cleanEntry(e) {
    if (!isObj(e)) return null;
    const out = {};
    Object.keys(ENTRY_STR).forEach(function (k) {
      if (typeof e[k] === 'string') out[k] = e[k].slice(0, ENTRY_STR[k]);
    });
    ENTRY_NUM.forEach(function (k) {
      if (e[k] === null && (k === 'opponentScore')) out[k] = null;
      else if (typeof e[k] === 'number' && isFinite(e[k]) && e[k] >= 0) out[k] = Math.min(Math.floor(e[k]), 1e13);
    });
    if (e.result === null) out.result = null;
    if (typeof e.repeat === 'boolean') out.repeat = e.repeat;
    if (typeof e.modeId === 'number' && isFinite(e.modeId)) out.modeId = e.modeId;
    return Object.keys(out).length ? out : null;
  }
  function entryKey(e) { return stableStringify(e); }

  // ---- limpieza de listas de los grupos ------------------------------------------------------
  function cleanIntList(v, max) {
    if (!Array.isArray(v)) return [];
    const out = [], seen = {};
    for (let i = 0; i < v.length && out.length < max; i++) {
      const x = Number(v[i]);
      if (!isFinite(x) || x < 0 || x !== Math.floor(x) || x > 1e6) continue;
      if (seen[x]) continue;
      seen[x] = true; out.push(x);
    }
    return out;
  }
  function cleanSetItem(x) {
    if (typeof x === 'number') return isFinite(x) && x >= 0 && x === Math.floor(x) && x <= 1e6 ? x : undefined;
    if (typeof x === 'string') return x.length > 0 && x.length <= 40 ? x : undefined;
    return undefined;
  }

  function cleanGroup(name, g) {
    if (!isObj(g) || !isObj(g.v)) return null;
    const v = {};
    if (name === 'settings') {
      if (g.v.theme === 'light' || g.v.theme === 'dark') v.theme = g.v.theme;
      if (g.v.sound === 'on' || g.v.sound === 'off') v.sound = g.v.sound;
    } else if (name === 'learning') {
      if (Array.isArray(g.v.failedQuestions)) v.failedQuestions = cleanIntList(g.v.failedQuestions, 2000).sort(function (a, b) { return a - b; });
      if (Array.isArray(g.v.recentQuestionIds)) v.recentQuestionIds = cleanIntList(g.v.recentQuestionIds, 200); // el orden importa (recientes)
      if (isObj(g.v.questionStreaks)) {
        const qs = {};
        Object.keys(g.v.questionStreaks).slice(0, 2500).forEach(function (k) {
          if (/^[0-9]{1,6}$/.test(k)) qs[k] = Math.min(cleanNum(g.v.questionStreaks[k]), 1000);
        });
        v.questionStreaks = qs;
      }
    }
    if (!Object.keys(v).length) return null;
    // `t` es una marca de tiempo en ms (~1,7e12): NO puede pasar por cleanNum (tope 1e9), porque dejaba a todos los
    // grupos con el mismo `t` y el «gana el más reciente» se decidía por el contenido, no por la fecha (v2.0).
    const tt = Number(g.t);
    return { t: isFinite(tt) && tt > 0 ? Math.min(Math.floor(tt), 1e13) : 0, v: v };
  }

  // ---- saneado de un documento entero (todo lo que llega del cliente pasa por aquí) ---------
  function sanitizeDoc(raw) {
    const out = { v: DOC_VERSION, f: {}, g: {} };
    if (!isObj(raw)) return out;
    const f = isObj(raw.f) ? raw.f : {};
    MAX_FIELDS.forEach(function (k) { if (k in f) out.f[k] = cleanNum(f[k]); });
    OR_FIELDS.forEach(function (k) { if (k in f) out.f[k] = f[k] === true; });
    Object.keys(SET_FIELDS).forEach(function (k) {
      if (!Array.isArray(f[k])) return;
      const seen = {}, list = [];
      f[k].forEach(function (x) {
        const c = cleanSetItem(x);
        if (c === undefined) return;
        const key = typeof c + ':' + c;
        if (seen[key]) return;
        seen[key] = true; list.push(c);
      });
      list.sort(cmpAny);
      out.f[k] = list.slice(0, SET_FIELDS[k]);
    });
    Object.keys(HIST_FIELDS).forEach(function (k) {
      if (!Array.isArray(f[k])) return;
      const seen = {}, list = [];
      f[k].slice(0, 200).forEach(function (e) {
        const c = cleanEntry(e);
        if (!c) return;
        const key = entryKey(c);
        if (seen[key]) return;
        seen[key] = true; list.push({ e: c, key: key });
      });
      list.sort(function (a, b) { return ((b.e.ts || 0) - (a.e.ts || 0)) || cmpAny(a.key, b.key); });
      out.f[k] = list.slice(0, HIST_FIELDS[k]).map(function (x) { return x.e; });
    });
    Object.keys(KMAX_FIELDS).forEach(function (k) {
      if (!isObj(f[k])) return;
      const spec = KMAX_FIELDS[k], o = {};
      Object.keys(f[k]).sort().slice(0, spec.maxKeys).forEach(function (key) {
        if (!spec.keyRe.test(key) || !isObj(f[k][key])) return;
        const item = {};
        spec.subs.forEach(function (s) { item[s] = Math.min(cleanNum(f[k][key][s]), 1e6); });
        o[key] = item;
      });
      out.f[k] = o;
    });
    const g = isObj(raw.g) ? raw.g : {};
    Object.keys(GROUPS).forEach(function (name) {
      const c = cleanGroup(name, g[name]);
      if (c) out.g[name] = c;
    });
    return out;
  }

  // ---- combinación de dos documentos ya saneados ---------------------------------------------
  function mergeDocs(a, b) {
    a = sanitizeDoc(a); b = sanitizeDoc(b);
    const raw = { v: DOC_VERSION, f: {}, g: {} };
    const keys = {};
    Object.keys(a.f).concat(Object.keys(b.f)).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      const x = a.f[k], y = b.f[k];
      if (x === undefined) { raw.f[k] = y; return; }
      if (y === undefined) { raw.f[k] = x; return; }
      if (MAX_FIELDS.indexOf(k) !== -1) raw.f[k] = Math.max(x, y);
      else if (OR_FIELDS.indexOf(k) !== -1) raw.f[k] = x || y;
      else if (k in SET_FIELDS) raw.f[k] = x.concat(y);
      else if (k in HIST_FIELDS) raw.f[k] = x.concat(y);
      else if (k in KMAX_FIELDS) {
        const o = {}, spec = KMAX_FIELDS[k];
        Object.keys(x).concat(Object.keys(y)).forEach(function (key) {
          const p = x[key] || {}, q = y[key] || {}, item = {};
          spec.subs.forEach(function (s) { item[s] = Math.max(p[s] || 0, q[s] || 0); });
          o[key] = item;
        });
        raw.f[k] = o;
      }
    });
    const gk = {};
    Object.keys(a.g).concat(Object.keys(b.g)).forEach(function (k) { gk[k] = true; });
    Object.keys(gk).forEach(function (k) {
      const x = a.g[k], y = b.g[k];
      if (!x) { raw.g[k] = y; return; }
      if (!y) { raw.g[k] = x; return; }
      if (x.t !== y.t) raw.g[k] = x.t > y.t ? x : y;
      else raw.g[k] = stableStringify(x.v) >= stableStringify(y.v) ? x : y; // empate: resultado independiente del orden
    });
    return sanitizeDoc(raw); // ordena, deduplica y aplica los topes
  }

  function docsEqual(a, b) { return stableStringify(sanitizeDoc(a)) === stableStringify(sanitizeDoc(b)); }

  // ---- store <-> documento (solo cliente) -----------------------------------------------------
  function getPath(store, path) {
    const p = path.split('.');
    let cur = store;
    for (let i = 0; i < p.length; i++) { if (!isObj(cur)) return undefined; cur = cur[p[i]]; }
    return cur;
  }
  function setPath(store, path, value) {
    const p = path.split('.');
    let cur = store;
    for (let i = 0; i < p.length - 1; i++) { if (!isObj(cur[p[i]])) cur[p[i]] = {}; cur = cur[p[i]]; }
    cur[p[p.length - 1]] = value;
  }
  function groupValues(store, name) {
    const v = {};
    GROUPS[name].forEach(function (k) { if (store[k] !== undefined) v[k] = store[k]; });
    return v;
  }
  // Huella del contenido actual de un grupo (para saber si cambió desde la última sincronización).
  function groupHash(store, name) {
    const c = cleanGroup(name, { t: 1, v: groupValues(store, name) });
    return c ? stableStringify(c.v) : '';
  }
  // meta.t = {grupo: ms}: instante de la última modificación local de cada grupo.
  function extractDoc(store, meta) {
    const raw = { v: DOC_VERSION, f: {}, g: {} };
    MAX_FIELDS.concat(OR_FIELDS).forEach(function (k) { const v = getPath(store, k); if (v !== undefined) raw.f[k] = v; });
    Object.keys(SET_FIELDS).concat(Object.keys(HIST_FIELDS)).concat(Object.keys(KMAX_FIELDS)).forEach(function (k) {
      const v = getPath(store, k); if (v !== undefined) raw.f[k] = v;
    });
    Object.keys(GROUPS).forEach(function (name) {
      raw.g[name] = { t: (meta && meta.t && meta.t[name]) || 0, v: groupValues(store, name) };
    });
    return sanitizeDoc(raw);
  }
  // Escribe en el store el resultado de combinar (local ∪ remoto), CONSERVANDO lo que ya hay en local:
  //   - nunca elimina campos que el documento no menciona ni reordena listas locales sin motivo;
  //   - conjuntos (preguntas vistas…): se añaden al final solo los elementos que faltan;
  //   - historiales: solo se tocan si llegan entradas nuevas de otro dispositivo (el orden local se respeta);
  //   - por clave (estadísticas por pregunta, rivales): se sube cada campo al máximo, sin tocar otros campos.
  // Devuelve true si algo cambió.
  function sameSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    const seen = {};
    a.forEach(function (x) { seen[typeof x + ':' + x] = true; });
    return b.every(function (x) { return seen[typeof x + ':' + x]; });
  }
  function applyDoc(store, doc) {
    const d = sanitizeDoc(doc);
    let changed = false;
    Object.keys(d.f).forEach(function (k) {
      const v = d.f[k], cur = getPath(store, k);
      if (k in SET_FIELDS) {
        if (!Array.isArray(cur)) { setPath(store, k, v.slice()); changed = true; return; }
        const have = {};
        cur.forEach(function (x) { have[typeof x + ':' + x] = true; });
        v.forEach(function (x) { if (!have[typeof x + ':' + x]) { cur.push(x); changed = true; } });
        return;
      }
      if (k in HIST_FIELDS) {
        const local = Array.isArray(cur) ? cur : [];
        const have = {};
        local.forEach(function (e) { const c = cleanEntry(e); if (c) have[entryKey(c)] = true; });
        const fresh = v.filter(function (e) { return !have[entryKey(e)]; });
        if (!fresh.length && Array.isArray(cur)) return;
        const all = local.concat(fresh).map(function (e, i) { return { e: e, i: i }; });
        all.sort(function (x, y) { return ((y.e.ts || 0) - (x.e.ts || 0)) || (x.i - y.i); }); // estable: lo local conserva su orden
        setPath(store, k, all.slice(0, HIST_FIELDS[k]).map(function (x) { return x.e; }));
        changed = true;
        return;
      }
      if (k in KMAX_FIELDS) {
        const spec = KMAX_FIELDS[k];
        if (!isObj(cur)) { setPath(store, k, JSON.parse(JSON.stringify(v))); changed = true; return; }
        Object.keys(v).forEach(function (key) {
          if (!isObj(cur[key])) { cur[key] = JSON.parse(JSON.stringify(v[key])); changed = true; return; }
          spec.subs.forEach(function (sub) {
            if ((Number(cur[key][sub]) || 0) < v[key][sub]) { cur[key][sub] = v[key][sub]; changed = true; }
          });
        });
        return;
      }
      if (stableStringify(cur) !== stableStringify(v)) { setPath(store, k, v); changed = true; } // máximos y booleanos
    });
    Object.keys(d.g).forEach(function (name) {
      const gv = d.g[name].v;
      Object.keys(gv).forEach(function (k) {
        const cur = store[k], v = gv[k];
        if (k === 'failedQuestions') { if (sameSet(cur, v)) return; }
        else if (stableStringify(cur) === stableStringify(v)) return;
        store[k] = v; changed = true;
      });
    });
    return changed;
  }

  return {
    DOC_VERSION: DOC_VERSION, MAX_FIELDS: MAX_FIELDS, OR_FIELDS: OR_FIELDS, SET_FIELDS: SET_FIELDS,
    HIST_FIELDS: HIST_FIELDS, KMAX_FIELDS: KMAX_FIELDS, GROUPS: GROUPS,
    sanitizeDoc: sanitizeDoc, mergeDocs: mergeDocs, docsEqual: docsEqual, stableStringify: stableStringify,
    extractDoc: extractDoc, applyDoc: applyDoc, groupHash: groupHash
  };
})();
