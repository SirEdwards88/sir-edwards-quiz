// SirEdwards Quiz — Encargos (2.2): progreso semanal. Lógica PURA (sin store, sin DOM, sin reloj).
//
// El estado de una semana es un objeto pequeño `p` (ver emptyProgress) que `src/state/encargos.js` guarda en
// store.encargos.p y reinicia al cambiar de semana. Aquí solo hay funciones que lo actualizan y lo evalúan.
//
// Qué cuenta:
//   · Acierto: todo acierto de una partida que no sea Repaso (Duelo incluido). Los de categoría suman en su categoría.
//   · Partida: una partida terminada de cualquier modo (salvo Repaso y Duelo) con al menos MIN_GAME_ANSWERS respuestas.
//   · Precisión (80 %, 90 %, Trabajo Limpio): partida con al menos MIN_PRECISION_ANSWERS respuestas, para que no valga
//     una partida de 2 preguntas.
//   · Duelo: Duelo online, Duelo por Apuestas y Reto (las tres cosas). «Juego de Apuestas» cuenta SOLO los de apuestas.
//   · Sin Titubeos: racha de aciertos seguidos (cualquier categoría, y también respuestas sin categoría); un fallo la
//     reinicia. Sigue entre partidas durante la semana.
//
// Script clásico (scope global). Necesita SEQEncargos (encargos-core.js) cargado antes.

const SEQEncargosProgress = (function () {
  'use strict';

  var CATS = ['historia', 'geografia', 'ciencia', 'arte_literatura', 'deporte', 'cultura_general'];
  var MIN_GAME_ANSWERS = 5, MIN_PRECISION_ANSWERS = 10;
  var CAP = 9999;

  function zeroCats() { var o = {}; CATS.forEach(function (c) { o[c] = 0; }); return o; }
  function emptyProgress() {
    return { ok: 0, cat: zeroCats(), st: 0, sb: 0, games: 0, days: [], g80: 0, g90: 0, clean: 0,
      modes: {}, std: 0, other: 0, duels: 0, wins: 0, stakes: 0 };
  }
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.min(Math.floor(v), CAP) : 0; }
  // Normaliza un progreso que viene del almacenamiento (puede estar incompleto o corrupto).
  function normalize(p) {
    var o = emptyProgress();
    if (!p || typeof p !== 'object') return o;
    o.ok = num(p.ok); o.games = num(p.games); o.g80 = num(p.g80); o.g90 = num(p.g90); o.clean = p.clean ? 1 : 0;
    o.st = num(p.st); o.sb = num(p.sb); o.std = num(p.std); o.other = num(p.other); o.duels = num(p.duels); o.wins = num(p.wins); o.stakes = num(p.stakes);
    CATS.forEach(function (c) { o.cat[c] = num(p.cat && p.cat[c]); });
    if (Array.isArray(p.days)) p.days.forEach(function (d) { if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && o.days.indexOf(d) === -1 && o.days.length < 7) o.days.push(d); });
    if (p.modes && typeof p.modes === 'object') Object.keys(p.modes).slice(0, 12).forEach(function (m) { if (/^[a-z_]{1,24}$/.test(m)) o.modes[m] = num(p.modes[m]); });
    return o;
  }

  // Un acierto o un fallo. `cat` puede ser null (cálculo mental, enigmas…): suma al total de aciertos y a la racha,
  // pero no a ninguna categoría. `st` es la racha EN CURSO de aciertos seguidos (un fallo la pone a 0) y `sb` la mejor
  // de la semana (Sin Titubeos: 10 seguidas; la racha sigue entre partidas).
  function recordAnswer(p, cat, correct) {
    if (correct) {
      p.ok = Math.min(p.ok + 1, CAP);
      if (CATS.indexOf(cat) !== -1) p.cat[cat] = Math.min(p.cat[cat] + 1, CAP);
      p.st = Math.min(p.st + 1, CAP);
      if (p.st > p.sb) p.sb = p.st;
    } else {
      p.st = 0;
    }
  }

  // Fin de una partida en solitario. g = {mode, correct, total, day:'YYYY-MM-DD'}. Devuelve true si contó.
  function recordGame(p, g) {
    var total = num(g && g.total), correct = Math.min(num(g && g.correct), total), mode = String((g && g.mode) || '');
    if (total < MIN_GAME_ANSWERS || mode === 'review' || !/^[a-z_]{1,24}$/.test(mode)) return false;
    p.games = Math.min(p.games + 1, CAP);
    if (g.day && /^\d{4}-\d{2}-\d{2}$/.test(g.day) && p.days.indexOf(g.day) === -1 && p.days.length < 7) p.days.push(g.day);
    p.modes[mode] = Math.min((p.modes[mode] || 0) + 1, CAP);
    if (mode === 'play') p.std = Math.min(p.std + 1, CAP); else p.other = Math.min(p.other + 1, CAP);
    if (total >= MIN_PRECISION_ANSWERS) {
      var acc = correct / total;
      if (acc >= 0.8) p.g80 = Math.min(p.g80 + 1, CAP);
      if (acc >= 0.9) p.g90 = Math.min(p.g90 + 1, CAP);
      if (total - correct <= 1) p.clean = 1;
    }
    return true;
  }

  // Un duelo terminado. d = {won:boolean, stakes:boolean}.
  function recordDuel(p, d) {
    p.duels = Math.min(p.duels + 1, CAP);
    if (d && d.won) p.wins = Math.min(p.wins + 1, CAP);
    if (d && d.stakes) p.stakes = Math.min(p.stakes + 1, CAP);
  }

  // Combina dos progresos de la MISMA semana (dos pestañas del mismo dispositivo): máximo por contador, unión de días.
  // Conmutativa, asociativa e idempotente. `st` (racha en curso) se queda con la mayor, que solo afecta a `sb`.
  function merge(a, b) {
    a = normalize(a); b = normalize(b);
    var o = emptyProgress();
    ['ok', 'st', 'sb', 'games', 'g80', 'g90', 'clean', 'std', 'other', 'duels', 'wins', 'stakes'].forEach(function (k) { o[k] = Math.max(a[k], b[k]); });
    CATS.forEach(function (c) { o.cat[c] = Math.max(a.cat[c], b.cat[c]); });
    a.days.concat(b.days).sort().forEach(function (d) { if (o.days.indexOf(d) === -1 && o.days.length < 7) o.days.push(d); });
    Object.keys(a.modes).concat(Object.keys(b.modes)).forEach(function (m) { o.modes[m] = Math.max(a.modes[m] || 0, b.modes[m] || 0); });
    return o;
  }

  function sumCap(p, key, n) { return CATS.reduce(function (s, c) { return s + Math.min(p[key][c], n); }, 0); }
  function catsReached(p, key, n) { return CATS.filter(function (c) { return p[key][c] >= n; }).length; }
  function modeCount(p) { return Object.keys(p.modes).filter(function (m) { return p.modes[m] > 0; }).length; }
  function mk(cur, max, label) { cur = Math.min(cur, max); return { cur: cur, max: max, frac: max ? cur / max : 0, done: cur >= max, label: label || (cur + '/' + max) }; }
  // El texto cuenta lo mismo que la barra (aciertos válidos sobre el total) y añade cuántas categorías están completas.
  function perCat(p, key, n) {
    var k = catsReached(p, key, n), cur = sumCap(p, key, n);
    return { cur: cur, max: 6 * n, frac: cur / (6 * n), done: k === 6, label: cur + '/' + (6 * n) + ' aciertos · ' + k + '/6 categorías' };
  }

  // Evalúa una misión (normal o grande) con el progreso `p`. Devuelve {cur, max, frac, done, label}.
  function evaluate(id, p) {
    switch (id) {
      case 'cerebro_despierto': return mk(p.ok, 100);
      case 'semana_productiva': return mk(p.games, 8);
      case 'presencia_arena': return mk(p.duels, 5);
      case 'constancia': return mk(p.days.length, 3, Math.min(p.days.length, 3) + '/3 días');
      case 'mente_curiosa': return perCat(p, 'cat', 10);
      case 'sin_terreno_comodo': return perCat(p, 'cat', 15);
      case 'sexto_sentido': return mk(p.sb, 10, Math.min(p.sb, 10) + '/10 seguidos');
      case 'mano_firme': return mk(p.g80, 3);
      case 'no_era_suerte': return mk(p.g80, 5);
      case 'rival_digno': return mk(p.wins, 3);
      case 'trabajo_limpio': return mk(p.clean, 1, p.clean ? '1/1' : '0/1');
      case 'juego_apuestas': return mk(p.stakes, 3);
      case 'a_todo_o_nada': return mk(p.g90, 5);
      case 'vuelta_completa': {
        var a = Math.min(p.std, 5), b = Math.min(p.duels, 2), c = Math.min(p.other, 5);
        return { cur: a + b + c, max: 12, frac: (a + b + c) / 12, done: a === 5 && b === 2 && c === 5, label: a + '/5 estándar · ' + b + '/2 duelos · ' + c + '/5 otros' };
      }
      case 'semana_completa': return perCat(p, 'cat', 25);
      case 'cambio_marcha': {
        var g = Math.min(p.games, 15), m = modeCount(p);
        return { cur: g, max: 15, frac: (g / 15 + Math.min(m, 4) / 4) / 2, done: g >= 15 && m >= 4, label: g + '/15 partidas · ' + Math.min(m, 4) + '/4 modos' };
      }
    }
    return mk(0, 1);
  }

  return { CATS: CATS, MIN_GAME_ANSWERS: MIN_GAME_ANSWERS, MIN_PRECISION_ANSWERS: MIN_PRECISION_ANSWERS,
    emptyProgress: emptyProgress, normalize: normalize, recordAnswer: recordAnswer, recordGame: recordGame, recordDuel: recordDuel, merge: merge, evaluate: evaluate };
})();
