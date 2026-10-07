// SirEdwards Quiz — Encargos de SirEdwards (2.2): catálogo, semana y rotación. Lógica PURA y determinista.
//
// Cada semana hay 3 encargos normales (fijos, los marca la rotación; el jugador no elige) y 1 Gran Encargo aparte.
// Todo sale del número de semana, sin estado ni Math.random(): todos los dispositivos (y el Worker) ven lo mismo.
//
//   · Semana: de lunes 00:00 a domingo 23:59, hora local del dispositivo. Identificador estable «YYYY-Www» (semana ISO).
//   · Rotación normal: ciclos de 4 semanas. En cada ciclo las 12 misiones se reparten en 4 tríos (ninguna repite hasta
//     agotar el ciclo), buscando categorías internas distintas y evitando los tríos redundantes y repetir un trío del
//     ciclo anterior. El orden de los tríos dentro del ciclo también sale del sorteo con semilla.
//   · Rotación del Gran Encargo: otro ciclo de 4 semanas, independiente (otra semilla); el primero de un ciclo nunca es
//     el último del anterior.
//   · Recompensas: XP únicamente. Cada una tiene una clave única (la usa el cliente para no pagar dos veces y el Worker
//     para validarla y no ampliar dos veces el tope de XP):
//       «<semana>:m:<misión>» (100) · «<semana>:b» (bonus de las 3, 250) · «<semana>:g:<gran encargo>» (200). Máx. 750/semana.
//
// Script clásico (scope global), sin dependencias.
// IMPORTANTE: el Worker (backend) tiene una COPIA LITERAL de este archivo en src/encargos-core.js (con un `export` al final);
// su test comprueba que el cuerpo es idéntico. Si cambias algo aquí, cópialo allí y vuelve a desplegar el Worker.

const SEQEncargos = (function () {
  'use strict';

  var XP_MISSION = 100, XP_BONUS = 250, XP_GREAT = 200;
  var CYCLE = 4;

  // cat = categoría INTERNA (solo sirve para variar la rotación). Los textos son los del jugador.
  var NORMALES = [
    { id: 'cerebro_despierto', cat: 'actividad', titulo: 'Cerebro Despierto', desc: 'Consigue 100 aciertos durante la semana.' },
    { id: 'semana_productiva', cat: 'actividad', titulo: 'Una Semana Productiva', desc: 'Completa 8 partidas durante la semana.' },
    { id: 'presencia_arena', cat: 'duelos', titulo: 'Presencia en la Arena', desc: 'Juega 5 duelos durante la semana, del modo que sea.' },
    { id: 'constancia', cat: 'constancia', titulo: 'Constancia', desc: 'Juega al menos una partida en 3 días distintos de la semana.' },
    { id: 'mente_curiosa', cat: 'variedad', titulo: 'Mente Curiosa', desc: 'Consigue 10 aciertos en cada una de las 6 categorías.' },
    { id: 'sin_terreno_comodo', cat: 'variedad', titulo: 'Sin Terreno Cómodo', desc: 'Consigue 15 aciertos en cada una de las 6 categorías.' },
    { id: 'sexto_sentido', cat: 'rachas', titulo: 'El Sexto Sentido', desc: 'Encadena 3 aciertos seguidos de la misma categoría, en cada una de las 6. Otra categoría o un fallo cortan la racha; sigue entre partidas.' },
    { id: 'mano_firme', cat: 'precision', titulo: 'Mano Firme', desc: 'Termina 3 partidas con al menos un 80 % de aciertos.' },
    { id: 'no_era_suerte', cat: 'precision', titulo: 'No Era Suerte', desc: 'Termina 5 partidas con al menos un 80 % de aciertos.' },
    { id: 'rival_digno', cat: 'duelos', titulo: 'Rival Digno', desc: 'Gana 3 duelos, del modo que sea.' },
    { id: 'trabajo_limpio', cat: 'precision', titulo: 'Trabajo Limpio', desc: 'Termina una partida con, como máximo, 1 fallo.' },
    { id: 'juego_apuestas', cat: 'apuestas', titulo: 'Juego de Apuestas', desc: 'Juega 3 Duelos por Apuestas. No hace falta ganarlos.' }
  ];
  var GRANDES = [
    { id: 'a_todo_o_nada', titulo: 'A Todo o Nada', desc: 'Consigue 5 partidas con un 90 % o más de aciertos.' },
    { id: 'vuelta_completa', titulo: 'La Vuelta Completa', desc: 'Completa 5 partidas de Modo Estándar, juega 2 duelos y completa 5 partidas en otros modos.' },
    { id: 'semana_completa', titulo: 'La Semana Completa', desc: 'Consigue 25 aciertos en cada una de las 6 categorías.' },
    { id: 'cambio_marcha', titulo: 'Cambio de Marcha', desc: 'Completa 15 partidas usando al menos 4 modos de juego distintos.' }
  ];
  // Tríos que conviene evitar aunque tengan categorías distintas (casi lo mismo: acumular aciertos…).
  var REDUNDANT = [
    ['cerebro_despierto', 'mente_curiosa', 'sin_terreno_comodo'],
    ['mano_firme', 'no_era_suerte', 'trabajo_limpio'],
    ['presencia_arena', 'rival_digno', 'juego_apuestas']
  ];

  // ---- utilidades --------------------------------------------------------------------------------
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function byId(list) { var o = {}; list.forEach(function (m) { o[m.id] = m; }); return o; }
  var NORMAL_BY_ID = byId(NORMALES), GREAT_BY_ID = byId(GRANDES);
  var NORMAL_IDS = NORMALES.map(function (m) { return m.id; });
  var GREAT_IDS = GRANDES.map(function (m) { return m.id; });

  // ---- semanas (lunes-domingo) ---------------------------------------------------------------------
  // Un «número de semana» entero: 0 = la semana (lunes-domingo) del 1-1-1970 menos 3 días; crece de uno en uno.
  var MS_DAY = 86400000;
  function weekIndexFromDays(days) { return Math.floor((days - 4) / 7); } // el día 0 (1-1-1970) fue jueves; el lunes es el día 4
  // Semana de un instante, con la fecha LOCAL del dispositivo.
  function weekIndexAt(ms) {
    var d = new Date(ms);
    return weekIndexFromDays(Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_DAY));
  }
  function mondayDays(idx) { return idx * 7 + 4; }
  // Identificador ISO «YYYY-Www» de la semana `idx`.
  function weekIdOf(idx) {
    var thu = new Date((mondayDays(idx) + 3) * MS_DAY);           // el jueves decide el año y el número ISO
    var y = thu.getUTCFullYear();
    var doy = Math.floor((Date.UTC(y, thu.getUTCMonth(), thu.getUTCDate()) - Date.UTC(y, 0, 1)) / MS_DAY);
    var w = Math.floor(doy / 7) + 1;
    return y + '-W' + (w < 10 ? '0' : '') + w;
  }
  // Inversa: «2026-W41» → número de semana, o null si no es un identificador válido.
  function weekIndexOfId(id) {
    var m = /^(\d{4})-W(\d{2})$/.exec(String(id));
    if (!m) return null;
    var y = +m[1], w = +m[2];
    if (w < 1 || w > 53 || y < 2000 || y > 2200) return null;
    var jan4 = Math.floor(Date.UTC(y, 0, 4) / MS_DAY);
    var dow = new Date(jan4 * MS_DAY).getUTCDay();                 // 0 = domingo
    var monday1 = jan4 - ((dow + 6) % 7);
    var idx = weekIndexFromDays(monday1 + 7 * (w - 1));
    return weekIdOf(idx) === id ? idx : null;                      // rechaza la «semana 53» que no existe ese año
  }
  // Primer lunes del sistema: la semana en que sale la 2.2 (5-10-2026). Antes de ella se usa el ciclo 0.
  var EPOCH_IDX = weekIndexFromDays(Math.floor(Date.UTC(2026, 9, 5) / MS_DAY));
  function startMsLocal(idx) { var d = new Date((mondayDays(idx)) * MS_DAY); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime(); }
  function endMsLocal(idx) { return startMsLocal(idx + 1); }

  // ---- rotación de los encargos normales -------------------------------------------------------------
  function tripleKey(t) { return t.slice().sort().join('|'); }
  function tripleScore(t) {
    var cats = {}, n = 0;
    t.forEach(function (id) { var c = NORMAL_BY_ID[id].cat; if (!cats[c]) { cats[c] = 1; n++; } });
    var s = n === 3 ? 0 : n === 2 ? 5 : 50;
    var k = tripleKey(t);
    REDUNDANT.forEach(function (r) { if (tripleKey(r) === k) s += 8; });
    return s;
  }
  var normalMemo = [];
  // Reparto del ciclo `c` en 4 tríos (con su orden de semanas). Depende solo de `c` (y, por cadena, de los anteriores).
  function normalCycle(c) {
    if (normalMemo[c]) return normalMemo[c];
    var prev = c > 0 ? normalCycle(c - 1) : null;
    var prevKeys = {};
    if (prev) prev.forEach(function (t) { prevKeys[tripleKey(t)] = true; });
    var rng = mulberry32(((c + 1) * 2654435761) >>> 0 ^ 0x5eed);
    var best = null, bestScore = Infinity;
    for (var n = 0; n < 400; n++) {
      var p = shuffled(NORMAL_IDS, rng), g = [p.slice(0, 3), p.slice(3, 6), p.slice(6, 9), p.slice(9, 12)];
      var s = 0;
      g.forEach(function (t) { s += tripleScore(t); if (prevKeys[tripleKey(t)]) s += 100; });
      if (prev) { // misma misión en semanas seguidas al cambiar de ciclo
        var last = prev[3];
        g[0].forEach(function (id) { if (last.indexOf(id) !== -1) s += 10; });
      }
      if (s < bestScore) { bestScore = s; best = g; if (s === 0) break; }
    }
    normalMemo[c] = best;
    return best;
  }

  // ---- rotación del Gran Encargo -----------------------------------------------------------------------
  var greatMemo = [];
  function greatCycle(c) {
    if (greatMemo[c]) return greatMemo[c];
    var rng = mulberry32((((c + 1) * 40503) >>> 0) ^ 0x6a1);
    var p = shuffled(GREAT_IDS, rng);
    if (c > 0) {
      var last = greatCycle(c - 1)[3];
      if (p[0] === last) { var t = p[0]; p[0] = p[1]; p[1] = t; }
    }
    greatMemo[c] = p;
    return p;
  }

  function rel(idx) { return Math.max(0, idx - EPOCH_IDX); }
  function missionsForWeek(idx) { var r = rel(idx); return normalCycle(Math.floor(r / CYCLE))[r % CYCLE].slice(); }
  function greatForWeek(idx) { var r = rel(idx); return greatCycle(Math.floor(r / CYCLE))[r % CYCLE]; }

  // ---- claves de recompensa ------------------------------------------------------------------------------
  function keyMission(week, id) { return week + ':m:' + id; }
  function keyBonus(week) { return week + ':b'; }
  function keyGreat(week, id) { return week + ':g:' + id; }
  // Valida una clave y devuelve {week, kind, id, xp}, o null si no corresponde a una recompensa de esa semana.
  // `nowMs` (opcional): se rechazan semanas futuras (más de 1 día de margen por zonas horarias) y muy antiguas (60 días).
  function parseKey(key, nowMs) {
    if (typeof key !== 'string' || key.length > 60) return null;
    var p = key.split(':');
    var idx = weekIndexOfId(p[0]);
    if (idx === null) return null;
    if (nowMs != null) {
      var start = mondayDays(idx) * MS_DAY;
      if (start > nowMs + 2 * MS_DAY || start + 7 * MS_DAY < nowMs - 60 * MS_DAY) return null;
    }
    if (p.length === 2 && p[1] === 'b') return { week: p[0], kind: 'b', id: null, xp: XP_BONUS };
    if (p.length === 3 && p[1] === 'm' && missionsForWeek(idx).indexOf(p[2]) !== -1) return { week: p[0], kind: 'm', id: p[2], xp: XP_MISSION };
    if (p.length === 3 && p[1] === 'g' && greatForWeek(idx) === p[2]) return { week: p[0], kind: 'g', id: p[2], xp: XP_GREAT };
    return null;
  }

  return {
    XP_MISSION: XP_MISSION, XP_BONUS: XP_BONUS, XP_GREAT: XP_GREAT, XP_WEEK_MAX: 3 * XP_MISSION + XP_BONUS + XP_GREAT, CYCLE: CYCLE, EPOCH_IDX: EPOCH_IDX,
    NORMALES: NORMALES, GRANDES: GRANDES, NORMAL_BY_ID: NORMAL_BY_ID, GREAT_BY_ID: GREAT_BY_ID, REDUNDANT: REDUNDANT,
    weekIndexAt: weekIndexAt, weekIdOf: weekIdOf, weekIndexOfId: weekIndexOfId, startMsLocal: startMsLocal, endMsLocal: endMsLocal,
    missionsForWeek: missionsForWeek, greatForWeek: greatForWeek, normalCycle: normalCycle, greatCycle: greatCycle,
    keyMission: keyMission, keyBonus: keyBonus, keyGreat: keyGreat, parseKey: parseKey, tripleScore: tripleScore
  };
})();
