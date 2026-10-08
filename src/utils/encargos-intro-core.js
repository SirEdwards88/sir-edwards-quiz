// SirEdwards Quiz — Presentación de los Encargos: lógica pura (sin DOM, sin almacenamiento). Script clásico.
// La interfaz y el estado local viven en src/ui/encargos-intro.js; aquí solo se decide QUÉ y CUÁNDO, para poder probarlo.

const SEQEncargosIntroCore = (function () {
  'use strict';

  // Nombre para dirigirse al jugador: el de su perfil, solo si existe y es razonable. Si no, null (la línea sale sin nombre).
  function cleanName(raw) {
    if (typeof raw !== 'string') return null;
    var s = raw.replace(/\s+/g, ' ').trim();
    if (!s || /^jugador(-[0-9a-z]{3,8})?$/i.test(s)) return null;   // «Jugador» y el nombre genérico del servidor («Jugador-ab12») no son un nombre
    if (/https?:|www\.|@|\.(com|es|net|org)\b|[<>{}\[\]\\\/]/i.test(s)) return null;
    if (s.length > 16) { s = s.split(' ')[0]; if (s.length > 16) return null; }
    if (!/[\p{L}]/u.test(s)) return null;
    return s;
  }

  // Cómo fue la partida que acaba de terminar → clave de ENCARGOS_INTRO.result.
  //   info: { kind:'duel', result:'win'|'loss'|'draw' }  |  { mode, score, total, failed }
  function classify(info) {
    if (!info || typeof info !== 'object') return 'neutra';
    if (info.kind === 'duel') return info.result === 'win' ? 'victoria' : info.result === 'draw' ? 'empate' : info.result === 'loss' ? 'derrota' : 'neutra';
    var m = info.mode, s = Number(info.score), t = Number(info.total);
    if (m === 'play') {
      if (!(t > 0) || !isFinite(s)) return 'neutra';
      var pct = s / t * 100;      // mismos tramos que las 20 preguntas de Estándar: 0-10 · 11-14 · 15+
      return pct < 55 ? 'mala' : pct < 75 ? 'normal' : 'buena';
    }
    if (m === 'timetrial' || m === 'mental_calc') {
      if (!isFinite(s)) return 'neutra';
      return s <= 14 ? 'mala' : s <= 30 ? 'normal' : 'buena';   // mismos umbrales que getModeEndPhrase
    }
    if (m === 'survival' || m === 'sudden_death' || m === 'lucidez_mental') return info.failed ? 'mala' : 'buena';
    return 'neutra';
  }

  // ¿Hay que presentarse ahora? Solo en Inicio, sin partida ni modales a la vista, con una partida terminada y sin haberla visto.
  //   ctx: { seen, hasResult, onHome, inGame, blocked }
  function shouldShowIntro(ctx) {
    return !!ctx && !ctx.seen && !!ctx.hasResult && !!ctx.onHome && !ctx.inGame && !ctx.blocked;
  }

  // Carta semanal: una vez por semana nueva, la primera vez que se abre Inicio (no hace falta que sea lunes). Nunca en la semana de
  // incorporación (la de la gran presentación): quien llega un miércoles no recibe carta ni reproche por una semana que no vivió.
  //   ctx: { seen, introWeek, weekId, lastShown, onHome, inGame, blocked }
  function shouldShowMonday(ctx) {
    if (!ctx || !ctx.seen || !ctx.onHome || ctx.inGame || ctx.blocked) return false;
    if (ctx.lastShown === ctx.weekId) return false;
    if (ctx.introWeek && ctx.introWeek === ctx.weekId) return false;
    return true;
  }

  // Semanas sin ver a Sir Edwards: distancia entre la semana actual y la última carta vista (o, si no hay ninguna, la de la
  // presentación). Con ABSENCE_WEEKS o más, la carta es de «has vuelto»: no se juzga una semana concreta, se recibe al que regresa.
  var ABSENCE_WEEKS = 3;
  function weeksAway(idx, lastIdx) {
    if (typeof idx !== 'number' || typeof lastIdx !== 'number' || !isFinite(idx) || !isFinite(lastIdx)) return 0;
    return Math.max(0, idx - lastIdx);
  }

  // Aprobación = los cuatro encargos de la semana pasada cobrados (3 semanales + Gran Encargo); cualquier otra cosa, reproche.
  // Si la semana pasada fue la de incorporación no se evalúa: 'incorporacion'. Tras una ausencia larga: 'ausencia'.
  function mondayKind(claimed, lastWeekId, introWeek, away) {
    if (introWeek && introWeek === lastWeekId) return 'incorporacion';
    if (away >= ABSENCE_WEEKS) return 'ausencia';
    var list = Array.isArray(claimed) ? claimed : [], m = 0, g = 0;
    for (var i = 0; i < list.length; i++) {
      var k = String(list[i]);
      if (k.indexOf(lastWeekId + ':m:') === 0) m++;
      else if (k.indexOf(lastWeekId + ':g:') === 0) g++;
    }
    return m >= 3 && g >= 1 ? 'aprobacion' : 'reproche';
  }

  // Líneas de la carta: la apertura fija («Es lunes.» / «Nueva semana.») y tres bolsas rotativas independientes (las elige quien
  // llama con pickRotatingPhrase): veredicto y comentario según la variante, y un cierre común a las tres.
  function mondayOpen(phrases, isMonday) { return isMonday === false ? phrases.openOther : phrases.open; }
  function variantOf(map, kind) { return kind === 'aprobacion' ? map.aprobacion : kind === 'incorporacion' ? map.incorporacion : kind === 'ausencia' ? map.ausencia : map.reproche; }
  function mondayVerdictPool(phrases, kind) { return variantOf(phrases.verdict, kind); }
  function mondayCommentPool(phrases, kind) { return variantOf(phrases.comment, kind); }
  function mondayClosePool(phrases) { return phrases.close; }

  // Cuánto se queda la carta antes de cerrarse sola, una vez mostradas todas las líneas: proporcional a lo que hay que leer
  // (unos 38 ms por carácter más un margen), entre 6 y 13 s. Quien quiera irse antes, toca fuera o pulsa «Cerrar».
  function readMs(lines) {
    var chars = 0, list = Array.isArray(lines) ? lines : [];
    for (var i = 0; i < list.length; i++) chars += String(list[i] == null ? '' : list[i]).length;
    return Math.min(13000, Math.max(6000, 2200 + chars * 38));
  }

  // Temporizador de pasos de la Presentación, con pausa: after(fn, ms) programa el paso siguiente; pause() congela lo que queda
  // y resume() lo retoma. Los temporizadores se inyectan (setT/clearT/now) para poder probarlo sin navegador.
  function makeStepper(setT, clearT, now) {
    var timer = null, fn = null, left = 0, started = 0, paused = false;
    function fire() { timer = null; var f = fn; fn = null; if (f) f(); }
    return {
      after: function (f, ms) { if (timer) clearT(timer); timer = null; fn = f; left = ms; started = now(); if (!paused) timer = setT(fire, ms); },
      clear: function () { if (timer) clearT(timer); timer = null; fn = null; },
      pause: function () { if (paused) return; paused = true; if (timer) { clearT(timer); timer = null; left = Math.max(0, left - (now() - started)); } },
      resume: function () { if (!paused) return; paused = false; if (fn) { started = now(); timer = setT(fire, left); } },
      isPaused: function () { return paused; }
    };
  }

  return { cleanName: cleanName, makeStepper: makeStepper, weeksAway: weeksAway, ABSENCE_WEEKS: ABSENCE_WEEKS, readMs: readMs, classify: classify, shouldShowIntro: shouldShowIntro, shouldShowMonday: shouldShowMonday,
    mondayKind: mondayKind, mondayOpen: mondayOpen, mondayVerdictPool: mondayVerdictPool, mondayCommentPool: mondayCommentPool,
    mondayClosePool: mondayClosePool };
})();
