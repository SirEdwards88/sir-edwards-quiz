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
  var P = { visit: 0.03, day: 0.10, night: 0.15 };        // probabilidad por acierto evaluado (día y noche: horas raras, más probables)
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
  // Los grupos normales no llevan `h`: así se pueden rotar con bolsa (ver `rotate`). Las frases ligadas a una hora exacta
  // viven en los grupos «raros» y se eligen al azar entre las válidas para la hora.
  var VISIT = [
    '«Ah, tú por aquí.»', '«Veo que has vuelto.»', '«Continúa, continúa.»', '«No quería interrumpir.»',
    '«Solo estaba pasando por aquí.»', '«Muy bien. Prosigue.»', '«Me alegra verte por aquí.»',
    '«He venido a supervisar. No te pongas nervioso.»', '«No hay presión. Bueno... quizá un poco.»',
    '«Continúa. Fingiré que no estoy mirando.»', '«Estoy de paso. Procura no hacer el ridículo.»',
    '«Todo parece estar en orden. De momento.»', '«Interesante. Sigue, sigue.»', '«No te preocupes. Mi libreta es confidencial.»',
    '«Un caballero siempre observa antes de opinar.»', '«Sigue. Tomo notas, por si acaso.»', '«Estoy aquí solo por si necesitas un testigo.»',
    '«Qué concentración. Casi parece que te importa.»', '«Pasaba por aquí y me quedé por curiosidad.»', '«No me hagas caso. Hazlo bien, sin más.»'
  ];
  var VISIT_RARE = ['«No tengo nada que añadir. Es preocupante.»', '«Si estás leyendo esto, deberías estar mirando la pregunta.»'];
  var STREAK_PHRASES = {
    10: ['«Hmm... llevas unas cuantas.»', '«Eso empieza a parecer una racha.»', '«Bien. Muy bien.»', '«No parece que quieras fallar hoy.»',
      '«Diez. Empiezo a tomarte en serio.»', '«Aciertas con una regularidad sospechosa.»'],
    15: ['«Esto empieza a ponerse serio.»', '«¿Piensas parar en algún momento?»', '«Estoy empezando a preocuparme por tus respuestas.»', '«Curiosamente, todavía no has cometido ningún desastre.»',
      '«Quince. Si fallas ahora, lo recordaré.»', '«Alguien se ha estudiado los apuntes.»'],
    20: ['«Veinte. Eso ya merece mi atención.»', '«Excelente racha. No la estropees ahora.»', '«Esto empieza a ser digno de un caballero.»', '«No quiero presionarte, pero... veinte.»',
      '«Veinte sin fallar. Ya no me atrevo ni a pestañear.»', '«Mi libreta necesita una página nueva.»'],
    30: ['«Treinta. Bien. Ahora sí estoy impresionado.»', '«Esto ya no es suerte.»', '«Creo que acabamos de encontrar un problema para tus rivales.»', '«SirEdwards Imparable. Te lo has ganado.»',
      '«Treinta. Voy a tener que retirar algunas de mis opiniones.»', '«Hay que ser muy valiente para seguir ahora.»']
  };
  var DAY = [
    '«Buenos días. Veamos qué estás tramando.»', '«Una mañana prometedora. No la estropees.»', '«Ya despierto y haciendo preguntas. Admirable.»',
    '«El día acaba de empezar. Procura no decepcionarme demasiado pronto.»', '«Un poco de cultura antes del desayuno. Excelente decisión.»',
    '«He decidido madrugar. Tú también, aparentemente.»', '«Buenos días. Espero que tu cerebro haya llegado antes que tú.»',
    '«A estas horas hasta las malas decisiones parecen razonables.»',
    '«Madrugador. Sospechoso, pero encomiable.»', '«Café, luz y preguntas. Una combinación peligrosa para tu ego.»',
    '«El mundo todavía se despereza y tú ya estás en plena faena.»', '«Una mente despierta a primera hora. Qué desconcertante.»',
    '«Cultura antes del mediodía. Los demás aún buscan las zapatillas.»', '«A estas horas, hasta mi paciencia está recién planchada.»'
  ];
  var DAY_RARE = [{ t: '«Son las siete de la mañana y ya estoy supervisando tu rendimiento. Qué vida tan plena.»', h: [7] }];
  var NIGHT_EARLY = ['«Buenas noches... supongo.»', '«¿Todavía jugando?»', '«Veo que la noche te ha dado conocimientos.»', '«Una partida nocturna. Excelente decisión cuestionable.»', // 00:00–02:00
    '«Pasada la medianoche, la mente rinde... o eso dicen.»', '«La noche es joven. Tu criterio, quizá menos.»', '«Medianoche y todavía respondiendo. Qué disciplina tan discutible.»',
    '«Mañana habrá que madrugar, pero tú sabrás.»', '«Otra pregunta antes de dormir. Cómo no.»'];
  var NIGHT_LATE = [                                                                                                                              // 02:00–04:00
    '«¿Dormir? No. ¿Otra partida? Evidentemente.»', '«A estas horas solo quedan los valientes y los insensatos.»', '«No preguntaré por qué sigues despierto.»',
    '«He venido a comprobar que no soy el único.»', '«A estas horas la cultura general es un acto de rebeldía.»',
    '«Las mejores ideas llegan de madrugada. Las peores, también.»', '«Ya no es tarde, es temprano. Y sigues aquí.»',
    '«Tu almohada debe de sentirse bastante ofendida.»', '«La madrugada: donde la lucidez y el insomnio se dan la mano.»'
  ];
  var NIGHT_RARE = [{ t: '«03:17. La hora exacta en la que normalmente tomo decisiones cuestionables.»', h: [3] },
    { t: '«Son las tres de la mañana. Esto ya es personal.»', h: [3] }];

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
  // Grupos normales: si quien llama aporta `rotate(clave, lista)` (bolsa persistente del juego: no se repite ninguna hasta
  // haberlas visto todas, también entre partidas), se usa; si no, se elige al azar evitando la última.
  function choose(key, list, hour, rng, avoid, rotate) {
    if (typeof rotate === 'function') { var t = rotate(key, list); if (typeof t === 'string' && t) return t; }
    return pick(list, hour, rng, avoid);
  }
  // Frases raras: igual que las normales (bolsa persistente), pero solo entre las válidas para la hora. Si alguna depende de la
  // hora, hay una bolsa por hora (así cada bolsa contiene siempre las mismas frases).
  function chooseRare(key, list, hour, rng, avoid, rotate) {
    var timed = list.some(function (x) { return typeof x !== 'string' && x.h; });
    var ok = list.filter(function (x) { return typeof x === 'string' || !x.h || x.h.indexOf(hour) !== -1; })
      .map(function (x) { return typeof x === 'string' ? x : x.t; });
    if (!ok.length) return null;
    if (typeof rotate === 'function') { var t = rotate(timed ? key + '_' + hour : key, ok); if (typeof t === 'string' && t) return t; }
    return pick(list, hour, rng, avoid);
  }
  function phraseFor(type, hour, rng, avoid, milestone, rotate) {
    var rare = { visit: VISIT_RARE, day: DAY_RARE, night: NIGHT_RARE }[type];
    if (rare && rng() < RARE_P) { var r = chooseRare(type + '_rare', rare, hour, rng, avoid, rotate); if (r) return r; }
    if (type === 'streak') return choose('streak_' + milestone, STREAK_PHRASES[milestone], hour, rng, avoid, rotate);
    if (type === 'visit') return choose('visit', VISIT, hour, rng, avoid, rotate);
    if (type === 'day') return choose('day', DAY, hour, rng, avoid, rotate);
    return hour < 2 ? choose('night_early', NIGHT_EARLY, hour, rng, avoid, rotate) : choose('night_late', NIGHT_LATE, hour, rng, avoid, rotate);
  }

  // Hito de racha disponible: el mayor ≤ racha todavía no usado, alcanzado hace como mucho 1 acierto.
  function milestoneFor(state, streak) {
    for (var i = MILESTONES.length - 1; i >= 0; i--) {
      var m = MILESTONES[i];
      if (streak >= m && streak - m <= 1 && !state.milestones[m]) return m;
    }
    return null;
  }

  // ctx = { nowMs, hour (0-23, hora LOCAL), streak, correct, last (¿última pregunta?), blocked (¿no interrumpir?),
//         rotate (opcional: función (clave, lista) → frase, con bolsa persistente) }
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
    var text = phraseFor(chosen, hour, rng, state.last[chosen], milestone, ctx.rotate);
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
