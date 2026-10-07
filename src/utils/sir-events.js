// SirEdwards Quiz — Eventos Sorpresa de Sir Edwards (2.2). Motor PURO: sin DOM, sin store, sin reloj propio.
//
// Son 100 % cosméticos: no tocan puntuación, vidas, tiempo, rachas, XP ni Fragmentos. Este archivo solo decide SI aparece
// un evento y CUÁL (y su frase); quien lo llama (src/state/sir-events.js) lo muestra con src/ui/sir-events-ui.js.
//
// Cuatro eventos, un único sistema:
//   · streak (🔥)  hito de racha 10 / 15 / 20 / 30; cada hito una sola vez por partida.
//   · night  (🌙)  00:00–04:00 hora local.
//   · day    (☀️)  06:00–10:00 hora local.
//   · visit  (🎩)  genérico (incluye el antiguo «evaluando»).
// Prioridad: streak > night > day > visit; como máximo UNO por respuesta, y la prioridad nunca se salta el cooldown ni
// los límites (si el prioritario no puede, se evalúa el siguiente).
//
// Cuándo se evalúa: solo tras un acierto, a partir de la 3.ª respuesta de la partida, con probabilidad baja, con un
// cooldown de tiempo y de respuestas entre eventos, y máx. 1 por partida de visit/day/night.
//
// El estado de eventos es de UNA partida (newState al empezar); nada se guarda en el progreso del jugador.
// Script clásico (scope global), sin dependencias.

const SEQSirEvents = (function () {
  'use strict';

  var COOLDOWN_MS = 40000;        // mínimo entre dos eventos
  var MIN_ANSWERS_BETWEEN = 4;    // y al menos 4 respuestas de por medio
  var MIN_ANSWERS_START = 3;      // nunca en las primeras respuestas de la partida
  var P = { visit: 0.03, day: 0.025, night: 0.02 };       // probabilidad por acierto evaluado
  var STREAK_P = { 10: 0.7, 15: 0.85, 20: 1, 30: 1 };     // 10 «puede», 15 más probable, 20 y 30 especiales
  var MILESTONES = [10, 15, 20, 30];
  var RARE_P = 0.05;              // frase «muy rara»

  var ASSETS = {
    visit: 'assets/character/event_siredwards_visit.webp',
    streak: 'assets/character/event_siredwards_streak.webp',
    day: 'assets/character/event_siredwards_day.webp',
    night: 'assets/character/event_siredwards_night.webp'
  };
  var LABELS = { streak: '🔥 SirEdwards ha detectado una racha' };

  // Frases. `h` (opcional) limita la frase a esas horas locales (para que no mienta con la hora).
  var VISIT = [
    '«Ah, tú por aquí.»', '«Veo que has vuelto.»', '«Continúa, continúa.»', '«No quería interrumpir.»',
    '«Solo estaba pasando por aquí.»', '«Muy bien. Prosigue.»', '«Me alegra verte por aquí.»',
    '«He venido a supervisar. No te pongas nervioso.»', '«No hay presión. Bueno... quizá un poco.»',
    '«Continúa. Fingiré que no estoy mirando.»', '«Estoy de paso. Procura no hacer el ridículo.»',
    '«Todo parece estar en orden. De momento.»', '«Interesante. Sigue, sigue.»', '«No te preocupes. Mi libreta es confidencial.»'
  ];
  var VISIT_RARE = ['«No tengo nada que añadir. Es preocupante.»'];
  var STREAK_PHRASES = {
    10: ['«Hmm... llevas unas cuantas.»', '«Eso empieza a parecer una racha.»', '«Bien. Muy bien.»', '«No parece que quieras fallar hoy.»'],
    15: ['«Esto empieza a ponerse serio.»', '«¿Piensas parar en algún momento?»', '«Estoy empezando a preocuparme por tus respuestas.»', '«Curiosamente, todavía no has cometido ningún desastre.»'],
    20: ['«Veinte. Eso ya merece mi atención.»', '«Excelente racha. No la estropees ahora.»', '«Esto empieza a ser digno de un caballero.»', '«No quiero presionarte, pero... veinte.»'],
    30: ['«Treinta. Bien. Ahora sí estoy impresionado.»', '«Esto ya no es suerte.»', '«Creo que acabamos de encontrar un problema para tus rivales.»', '«SirEdwards Imparable. Te lo has ganado.»']
  };
  var DAY = [
    '«Buenos días. Veamos qué estás tramando.»', '«Una mañana prometedora. No la estropees.»', '«Ya despierto y haciendo preguntas. Admirable.»',
    '«El día acaba de empezar. Procura no decepcionarme demasiado pronto.»', '«Un poco de cultura antes del desayuno. Excelente decisión.»',
    '«He decidido madrugar. Tú también, aparentemente.»', '«Buenos días. Espero que tu cerebro haya llegado antes que tú.»',
    '«A estas horas hasta las malas decisiones parecen razonables.»'
  ];
  var DAY_RARE = [{ t: '«Son las siete de la mañana y ya estoy supervisando tu rendimiento. Qué vida tan plena.»', h: [7] }];
  var NIGHT_EARLY = ['«Buenas noches... supongo.»', '«¿Todavía jugando?»', '«Veo que la noche te ha dado conocimientos.»', '«Una partida nocturna. Excelente decisión cuestionable.»']; // 00:00–02:00
  var NIGHT_LATE = [                                                                                                                              // 02:00–04:00
    { t: '«Son las tres de la mañana. Esto ya es personal.»', h: [3] }, '«¿Dormir? No. ¿Otra partida? Evidentemente.»',
    '«A estas horas solo quedan los valientes y los insensatos.»', '«No preguntaré por qué sigues despierto.»', '«He venido a comprobar que no soy el único.»'
  ];
  var NIGHT_RARE = [{ t: '«03:17. La hora exacta en la que normalmente tomo decisiones cuestionables.»', h: [3] }];

  function isNight(hour) { return hour >= 0 && hour < 4; }
  function isDay(hour) { return hour >= 6 && hour < 10; }

  function newState() {
    return { shown: { visit: 0, day: 0, night: 0 }, milestones: {}, lastAt: null, lastAnswer: null, answers: 0, last: {} };
  }

  // Elige una frase del grupo (cadena u objeto {t,h}) válida para la hora, sin repetir la última del mismo evento.
  function pick(list, hour, rng, avoid) {
    var ok = list.filter(function (x) { return typeof x === 'string' || !x.h || x.h.indexOf(hour) !== -1; })
      .map(function (x) { return typeof x === 'string' ? x : x.t; });
    var pool = ok.filter(function (t) { return t !== avoid; });
    if (!pool.length) pool = ok;
    if (!pool.length) return null;
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  }
  function phraseFor(type, hour, rng, avoid, milestone) {
    var rare = { visit: VISIT_RARE, day: DAY_RARE, night: NIGHT_RARE }[type];
    if (rare && rng() < RARE_P) { var r = pick(rare, hour, rng, avoid); if (r) return r; }
    if (type === 'streak') return pick(STREAK_PHRASES[milestone], hour, rng, avoid);
    if (type === 'visit') return pick(VISIT, hour, rng, avoid);
    if (type === 'day') return pick(DAY, hour, rng, avoid);
    return pick(hour < 2 ? NIGHT_EARLY : NIGHT_LATE, hour, rng, avoid);
  }

  // Hito de racha disponible: el mayor ≤ racha todavía no usado, alcanzado hace como mucho 1 acierto.
  function milestoneFor(state, streak) {
    for (var i = MILESTONES.length - 1; i >= 0; i--) {
      var m = MILESTONES[i];
      if (streak >= m && streak - m <= 1 && !state.milestones[m]) return m;
    }
    return null;
  }

  // ctx = { nowMs, hour (0-23, hora LOCAL), streak, correct, last (¿última pregunta / sin tiempo?), blocked (¿no interrumpir?) }
  // Devuelve null o { type, asset, label, message, durationMs } y anota el evento en `state`.
  function evaluate(state, ctx, rng) {
    rng = rng || Math.random;
    state.answers++;                                 // respuestas de la partida (acierto o no)
    if (!ctx || ctx.correct !== true || ctx.blocked || ctx.last) return null;
    if (state.answers <= MIN_ANSWERS_START) return null;
    if (state.lastAt !== null && (ctx.nowMs - state.lastAt < COOLDOWN_MS || state.answers - state.lastAnswer < MIN_ANSWERS_BETWEEN)) return null;

    var hour = Math.floor(ctx.hour);
    var chosen = null, milestone = null;

    var m = milestoneFor(state, Number(ctx.streak) || 0);
    if (m !== null && rng() < STREAK_P[m]) { chosen = 'streak'; milestone = m; }
    if (!chosen && isNight(hour) && state.shown.night < 1 && rng() < P.night) chosen = 'night';
    if (!chosen && isDay(hour) && state.shown.day < 1 && rng() < P.day) chosen = 'day';
    if (!chosen && state.shown.visit < 1 && rng() < P.visit) chosen = 'visit';

    if (!chosen) return null;
    var text = phraseFor(chosen, hour, rng, state.last[chosen], milestone);
    if (!text) return null;
    if (chosen === 'streak') state.milestones[milestone] = true; else state.shown[chosen]++;
    // Un hito superado sin evento queda cerrado para no disparar tarde: los inferiores se consideran vistos.
    if (chosen === 'streak') MILESTONES.forEach(function (x) { if (x < milestone) state.milestones[x] = true; });
    state.lastAt = ctx.nowMs; state.lastAnswer = state.answers; state.last[chosen] = text;
    return { type: chosen, asset: ASSETS[chosen], label: LABELS[chosen] || '', message: text, durationMs: Math.min(5200, 3200 + text.length * 25) };
  }

  return {
    COOLDOWN_MS: COOLDOWN_MS, MIN_ANSWERS_BETWEEN: MIN_ANSWERS_BETWEEN, MIN_ANSWERS_START: MIN_ANSWERS_START,
    P: P, STREAK_P: STREAK_P, MILESTONES: MILESTONES, ASSETS: ASSETS, LABELS: LABELS, RARE_P: RARE_P,
    PHRASES: { visit: VISIT, visitRare: VISIT_RARE, streak: STREAK_PHRASES, day: DAY, dayRare: DAY_RARE, nightEarly: NIGHT_EARLY, nightLate: NIGHT_LATE, nightRare: NIGHT_RARE },
    isNight: isNight, isDay: isDay, newState: newState, evaluate: evaluate
  };
})();
