// SirEdwards Quiz — Eventos Sorpresa de Sir Edwards (2.2). Motor PURO: sin DOM, sin store, sin reloj propio.
//
// Son 100 % cosméticos: no tocan puntuación, vidas, tiempo, rachas, XP ni Fragmentos. Este archivo solo decide SI aparece
// un evento y CUÁL (y su frase); quien lo llama (src/state/sir-events.js) lo muestra con src/ui/sir-events-ui.js.
//
// Ocho eventos, un único sistema:
// · streak () hito de racha 10  15  20  30; cada hito una sola vez por partida.
// · record () nueva mejor racha personal (≥5): lo avisa quien llama con ctx.record = n. Una vez por partida.
// · comeback () vuelta tras 4-20 días sin jugar: ctx.comeback; sale tras la 1.ª respuesta (acierto o no). Una vez por partida.
// · weak () un acierto en la categoría más floja del jugador: ctx.weakCat = nombre. Una vez por partida y como mucho 1 al día.
// · broken () racha rota: un FALLO tras 5 o más aciertos seguidos; la frase cita el número real. Una vez por partida.
//   Es el único que sale tras un fallo; usa la imagen de «visita» (Sir Edwards observando).
// · night () 00:00–04:00 hora local.
// · day () 06:00–10:00 hora local.
// · visit () genérico (incluye el antiguo «evaluando»).
// Prioridad (tras un acierto): streak > night > day > visit; como máximo UNO por respuesta, y la prioridad nunca se salta el
// cooldown ni los límites. «Racha rota» solo tras un fallo y con su propio margen (no espera el cooldown largo, pero nunca sale
// justo detrás de otro evento).
//
// Cuándo se evalúa: tras un acierto (o, para «racha rota», tras un fallo), a partir de la 3.ª respuesta de la partida, con probabilidad baja, con un
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
  var BROKEN_MIN_RUN = 5;         // racha mínima para que su rotura merezca comentario
  var BROKEN_P = { low: 0.35, mid: 0.7, high: 1 };        // 5-9 · 10-19 · 20 o más
  var MAX_PER_GAME = 2;           // como mucho dos eventos por partida (salvo un hito de racha de 20 o más)
  var RECENT_MS = 3 * 3600 * 1000;        // día, noche y visita: como mucho uno cada 3 h (lo recuerda quien llama, entre partidas)
  var WEAK_MS = 24 * 3600 * 1000;         // categoría débil: como mucho uno al día
  var RECORD_P = 0.85, WEAK_P = 0.5;
  var RARE_P = 0.05;              // frase «muy rara»

  var ASSETS = {
    visit: 'assets/character/event_siredwards_visit.webp',
    broken: 'assets/character/event_siredwards_visit.webp',
    comeback: 'assets/character/event_siredwards_comeback.webp',
    weak: 'assets/character/event_siredwards_visit.webp',
    record: 'assets/character/event_siredwards_streak.webp',
    streak: 'assets/character/event_siredwards_streak.webp',
    day: 'assets/character/event_siredwards_day.webp',
    night: 'assets/character/event_siredwards_night.webp'
  };
  var LABELS = {};                  // sin rótulos: Sir Edwards y su frase bastan

  // Frases. `h` (opcional) limita la frase a esas horas locales (para que no mienta con la hora).
  // Los grupos normales no llevan `h`: así se pueden rotar con bolsa (ver `rotate`). Las frases ligadas a una hora exacta
  // viven en los grupos «raros» y se eligen al azar entre las válidas para la hora.
  var VISIT = [
    '«Ah, tú por aquí. Qué casualidad tan convenientemente calculada.»',
    '«No me hagas caso. Yo solo superviso.»',
    '«Tomo notas. Con calma: algunas son incluso favorables.»',
    '«Un caballero observa antes de opinar. Yo ya he opinado.»',
    '«Estoy aquí por si necesitas un testigo.»',
    '«Sigue, sigue. Fingiré que no estoy mirando.»',
    '«He visto cosas peores. También mejores. Hoy aún no me decido.»',
    '«Qué concentración. Casi parece que te importa.»',
    '«Pasaba por aquí. Es mentira, pero queda elegante.»',
    '«No te distraigas por mí. Hazlo por tu dignidad.»',
    '«Guardo silencio. Es lo más amable que sé ofrecerte.»',
    '«Una respuesta sensata. Anotaremos la fecha.»',
    '«Todo en orden. Intenta no estropear mi informe.»',
    '«Sigues aquí. Yo también. Esto empieza a parecer una costumbre.»',
    '«Continúa. De momento no has estropeado nada. No arruinemos el momento.»'
  ];
  var VISIT_RARE = [
    '«No tengo nada que añadir. Francamente, me preocupa.»',
    '«Si estás leyendo esto, deberías estar mirando la pregunta.»'
  ];
  var STREAK_PHRASES = {
    10: ['«Hmm... llevas unas cuantas.»',
      '«Eso empieza a parecer una racha.»',
      '«Bien. Muy bien. Me incomoda decirlo.»',
      '«No parece que quieras fallar hoy.»',
      '«Diez. Empiezo a tomarte en serio.»',
      '«Qué regularidad. Casi parece un método.»',
      '«Diez seguidas. Qué inesperadamente competente.»',
      '«Diez. Admito que esperaba el primer desastre antes.»',
      '«Esto empieza a ser incómodo para mis teorías.»',
      '«Diez aciertos. Seguiré fingiendo que no estoy impresionado.»'],
    15: ['«Esto empieza a ponerse serio.»',
      '«¿Piensas parar en algún momento?»',
      '«Estoy empezando a preocuparme por mis propias estadísticas.»',
      '«Curiosamente, todavía no has cometido ningún desastre.»',
      '«Quince. Si fallas ahora, lo recordaré.»',
      '«Alguien se ha estudiado los apuntes.»',
      '«Quince. Esto ya requiere cierta explicación.»',
      '«Quince seguidas. Voy a revisar mis notas.»',
      '«Quince. ¿Piensas dejarme sin críticas hoy?»',
      '«Quince. Muy bien. Ahora intenta no convertirlo en una casualidad.»'],
    20: ['«Veinte. Eso ya merece mi atención.»',
      '«Excelente racha. No la estropees ahora.»',
      '«Esto empieza a ser digno de cierta distinción.»',
      '«No quiero presionarte, pero... veinte.»',
      '«Veinte sin fallar. Ya casi me da miedo hablar.»',
      '«Voy a necesitar una página nueva.»',
      '«Veinte seguidas. Empiezo a reconsiderar algunas opiniones.»',
      '«Veinte. No quisiera decir “impresionante”. Pero sería mentira.»',
      '«Veinte. Procura disfrutarlo discretamente.»',
      '«Veinte. Esto empieza a ser personalmente incómodo.»'],
    30: ['«Treinta. Bien. Ahora sí estoy impresionado.»',
      '«Esto ya no es suerte.»',
      '«Creo que acabamos de encontrar un problema para tus rivales.»',
      '«Treinta. Voy a tener que retirar algunas de mis opiniones.»',
      '«Hay que ser muy valiente para seguir ahora.»',
      '«Treinta. Esto ya no necesita comentarios. Y eso me molesta.»',
      '«Treinta. Mis felicitaciones. No las malgastes.»',
      '«Treinta aciertos. Admito que has sido impecable.»',
      '«Treinta. Ya no puedo fingir que no sabes lo que haces.»',
      '«Treinta. Qué inconveniente. Estaba disfrutando de subestimarte.»']
  };

  // Racha rota: {n} es la racha real que acaba de perder (la sustituye evaluate; la bolsa rota por tramos guarda la plantilla).
  var BROKEN_PHRASES = {
    low: ['«{n} seguidas. Y entonces ocurrió esto. Qué oportuno.»',
      '«Qué racha tan prometedora. Qué final tan innecesario.»',
      '«{n} aciertos y un tropiezo. Siempre hay una primera caída.»',
      '«Y ahí terminó. {n} no está nada mal. Este final sí.»',
      '«Era una buena racha. Para ser tuya.»',
      '«{n} seguidas, sacrificadas por una sola pregunta. Admirable.»',
      '«Lo estabas haciendo bien. Qué descuido tan puntual.»',
      '«Un fallo a tiempo. Qué considerado: así no te creces.»'],
    mid: ['«{n} seguidas. Todo eso, derrotado por una sola pregunta.»',
      '«{n}. Y ahora cero. Las matemáticas tienen un sentido del humor peculiar.»',
      '«Qué lástima. Iba a felicitarte.»',
      '«{n} aciertos seguidos y una pregunta para echarlo todo a perder. Eficiencia admirable.»',
      '«Lo he visto. Tú también. Podemos fingir que no ha pasado.»',
      '«Así termina una racha: sin avisar y con público.»',
      '«{n}. Hubiera preferido no tener que escribir esto.»',
      '«Ni siquiera yo esperaba ese fallo. Bueno... quizá un poco.»'],
    high: ['«{n} seguidas. Qué manera tan meticulosa de arruinarlo.»',
      '«{n} seguidas. Y una sola respuesta para recordarte que nadie es infalible.»',
      '«Hubo {n}. Habrá que estudiar este inesperado desenlace.»',
      '«{n} aciertos y un final para el archivo. Sección: tragedias.»',
      '«Mi expediente conservará esos {n} aciertos. Y esta pregunta. Especialmente esta pregunta.»',
      '«Una racha de {n} merece un pequeño funeral. Sin flores, por supuesto.»',
      '«{n}... y ahora el silencio. Un momento precioso.»',
      '«Casi pude respetarte. {n} seguidas. Casi.»']
  };

  // Récord personal ({n} = la racha nueva), regreso tras días y categoría débil ({cat} = su nombre): siempre en positivo o en tono de reproche suave.
  var RECORD = [
    '«{n} seguidas. Tu mejor marca. Qué inoportuna mejora.»', '«Récord personal: {n}. Lo anoto en tinta discreta.»',
    '«{n}. Mejor que nunca. Hasta hoy eras otra persona.»', '«Tu mejor racha hasta ahora: {n}. Procura que no sea el techo.»',
    '«Récord. {n} seguidas. Detesto tener que felicitarte.»', '«{n}. Superas tu marca anterior. Y mis expectativas, de paso.»'
  ];
  var COMEBACK = [
    '«Vaya. De vuelta. Había empezado a archivar tu expediente.»', '«Así que sigues por aquí. Qué detalle avisar.»',
    '«Ha pasado tiempo. Tu expediente ha criado polvo; tú, con suerte, conocimiento.»', '«Regresas sin avisar. No preguntaré dónde estabas. Lo adivino.»',
    '«Mi silla favorita cogía polvo. Qué oportuno tu regreso.»', '«Días sin verte. Los he empleado en dudar de ti. Con método.»'
  ];
  var WEAK = [
    '«{cat}. Tu talón de Aquiles. Y has acertado. Lo anoto, con reservas.»', '«{cat}, de todas las categorías. Casi parece que has estudiado.»',
    '«{cat} suele ser tu punto flaco. Hoy se ha portado. Interesante.»', '«Has acertado en {cat}. La vigilaré con más respeto.»',
    '«{cat}: tu categoría más débil. Acabas de darle una oportunidad. Aprovéchala.»'
  ];
  var DAY = [
    '«Buenos días. Veamos qué estás tramando.»',
    '«Una mañana prometedora. Procura no estropearla.»',
    '«A estas horas y ya haciendo preguntas. Admirable.»',
    '«El día acaba de empezar. No me estropees la mañana tan pronto.»',
    '«Cultura antes del desayuno. Una decisión respetable.»',
    '«He decidido madrugar. Tú también, aparentemente.»',
    '«Buenos días. Espero que tu cerebro haya llegado antes que tú.»',
    '«A estas horas hasta las malas decisiones parecen razonables.»',
    '«Madrugando. Inquietante, pero encomiable.»',
    '«Café, luz y preguntas. Una combinación peligrosa para tu ego.»',
    '«El mundo todavía se despereza y tú ya estás aquí.»',
    '«Una mente despierta a primera hora. Qué desconcertante.»',
    '«Mientras los demás buscan las zapatillas, tú buscas respuestas.»',
    '«A estas horas, hasta mi paciencia está recién planchada.»',
    '«Buenos días. Qué manera tan innecesariamente productiva de empezar el día.»',
    '«Madrugando para demostrar conocimientos. Cada cual con sus aficiones.»',
    '«El día apenas empieza y ya aspiras a tener razón. Ambicioso.»'
  ];
  var DAY_RARE = [{ t: '«Son las siete de la mañana y ya estoy supervisando tu rendimiento. Qué vida tan plena.»', h: [7] }];
  var NIGHT_EARLY = [
    '«Buenas noches... supongo.»',
    '«¿Todavía jugando? Admirable falta de prudencia.»',
    '«Veo que la noche te ha dado conocimientos. O confianza.»',
    '«Una partida nocturna. Excelente decisión cuestionable.»',
    '«Pasada la medianoche, la mente rinde... o eso dicen.»',
    '«La noche es joven. Tu criterio, quizá menos.»',
    '«Medianoche y todavía respondiendo. Qué disciplina tan discutible.»',
    '«Mañana habrá que madrugar. Pero eso será problema de tu yo futuro.»',
    '«Otra pregunta antes de dormir. Naturalmente.»',
    '«A estas horas incluso las buenas ideas parecen malas. Veremos las tuyas.»',
    '«La noche avanza. Tu sentido común, aparentemente, no.»',
    '«Ya es mañana. Tú sigues aquí. Admirable o preocupante.»'
  ];
  var NIGHT_LATE = [
    '«¿Dormir? No. ¿Otra partida? Evidentemente.»',
    '«A estas horas solo queda quien sigue despierto por convicción o por imprudencia.»',
    '«No preguntaré por qué sigues en pie. Tengo cierta dignidad.»',
    '«He venido a comprobar que no soy el único.»',
    '«A estas horas, la cultura general es un acto de rebeldía.»',
    '«Las mejores ideas llegan de madrugada. Las peores también.»',
    '«Ya no es tarde. Es temprano. Y sigues aquí.»',
    '«Tu almohada debe de sentirse bastante ofendida.»',
    '«La madrugada: donde la lucidez y el insomnio se dan la mano.»',
    '«Sigues en pie. Ya no sé quién vigila a quién.»'
  ];
  var NIGHT_RARE = [{ t: '«03:17. La hora exacta en la que normalmente tomo decisiones cuestionables.»', h: [3] },
    { t: '«Son las tres de la mañana. Esto ya es personal.»', h: [3] }];

  function isNight(hour) { return hour >= 0 && hour < 4; }
  function isDay(hour) { return hour >= 6 && hour < 10; }

  function newState() {
    return { shown: { visit: 0, day: 0, night: 0, broken: 0, record: 0, comeback: 0, weak: 0 }, milestones: {}, lastAt: null, lastAnswer: null, answers: 0, run: 0, count: 0, last: {} };
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
  function phraseFor(type, hour, rng, avoid, milestone, rotate, cat) {
    var rare = { visit: VISIT_RARE, day: DAY_RARE, night: NIGHT_RARE }[type];
    if (rare && rng() < RARE_P) { var r = chooseRare(type + '_rare', rare, hour, rng, avoid, rotate); if (r) return r; }
    if (type === 'record' || type === 'comeback' || type === 'weak') {
      var lst = type === 'record' ? RECORD : type === 'comeback' ? COMEBACK : WEAK;
      var tp = choose(type, lst, hour, rng, avoid, rotate);
      return tp ? tp.replace(/\{n\}/g, String(milestone)).replace(/\{cat\}/g, String(cat || 'Esta categoría')) : null;
    }
    if (type === 'broken') {
      var tier = milestone >= 20 ? 'high' : milestone >= 10 ? 'mid' : 'low';
      var tpl = choose('broken_' + tier, BROKEN_PHRASES[tier], hour, rng, avoid, rotate);
      return tpl ? tpl.replace(/\{n\}/g, String(milestone)) : null;
    }
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
  function recentOk(ctx, type, nowMs) {
    var t = ctx && ctx.recent && ctx.recent[type];
    return !(typeof t === 'number' && nowMs - t < (type === 'weak' ? WEAK_MS : RECENT_MS));
  }
  function done(state, ctx, type, text, nowMs) {
    if (type !== 'streak') state.shown[type] = (state.shown[type] || 0) + 1;   // el hito de racha se cuenta en state.milestones
    state.count++;
    state.lastAt = nowMs; state.lastAnswer = state.answers; state.last[type] = text;
    return { type: type, asset: ASSETS[type], label: LABELS[type] || '', message: text, durationMs: Math.min(5200, 3200 + text.length * 25) };
  }

  function evaluate(state, ctx, rng) {
    rng = rng || Math.random;
    state.answers++;                                 // respuestas de la partida (acierto o no)
    ['broken', 'record', 'comeback', 'weak'].forEach(function (k) { if (!state.shown[k]) state.shown[k] = 0; });
    if (!state.count) state.count = 0;
    var run = state.run || 0;                        // aciertos seguidos que llevaba el motor antes de esta respuesta
    if (ctx && ctx.correct === true) state.run = run + 1; else state.run = 0;
    if (!ctx || ctx.blocked || ctx.last) return null;

    // Regreso tras días sin jugar: tras la 1.ª respuesta, acierto o no.
    if (state.answers === 1 && ctx.comeback === true && !state.shown.comeback) {
      var ct = phraseFor('comeback', Math.floor(ctx.hour), rng, state.last.comeback, 0, ctx.rotate);
      if (ct) return done(state, ctx, 'comeback', ct, ctx.nowMs);
    }
    if (state.answers <= MIN_ANSWERS_START) return null;

    // Racha rota: un fallo tras una buena racha. No en Repaso ni en Muerte Súbita (lo avisa quien llama con noBroken).
    if (ctx.correct !== true) {
      if (ctx.noBroken || run < BROKEN_MIN_RUN || state.shown.broken >= 1) return null;
      if (state.count >= MAX_PER_GAME && run < 20) return null;
      if (state.lastAnswer !== null && state.answers - state.lastAnswer < 2) return null;     // nunca pegado a otro evento
      var tier = run >= 20 ? BROKEN_P.high : run >= 10 ? BROKEN_P.mid : BROKEN_P.low;
      if (!(rng() < tier)) return null;
      var btext = phraseFor('broken', Math.floor(ctx.hour), rng, state.last.broken, run, ctx.rotate);
      if (!btext) return null;
      return done(state, ctx, 'broken', btext, ctx.nowMs);
    }
    if (state.lastAt !== null && (ctx.nowMs - state.lastAt < COOLDOWN_MS || state.answers - state.lastAnswer < MIN_ANSWERS_BETWEEN)) return null;

    var hour = Math.floor(ctx.hour);
    var chosen = null, milestone = null;
    var capped = state.count >= MAX_PER_GAME;

    var m = milestoneFor(state, Number(ctx.streak) || 0);
    if (m !== null && (!capped || m >= 20) && rng() < STREAK_P[m]) { chosen = 'streak'; milestone = m; }
    if (!chosen && capped) return null;
    if (!chosen && Number(ctx.record) >= 5 && !state.shown.record && rng() < RECORD_P) { chosen = 'record'; milestone = Number(ctx.record); }
    if (!chosen && isNight(hour) && state.shown.night < 1 && recentOk(ctx, 'night', ctx.nowMs) && rng() < P.night) chosen = 'night';
    if (!chosen && isDay(hour) && state.shown.day < 1 && recentOk(ctx, 'day', ctx.nowMs) && rng() < P.day) chosen = 'day';
    if (!chosen && ctx.weakCat && !state.shown.weak && recentOk(ctx, 'weak', ctx.nowMs) && rng() < WEAK_P) chosen = 'weak';
    if (!chosen && state.shown.visit < 1 && recentOk(ctx, 'visit', ctx.nowMs) && rng() < P.visit) chosen = 'visit';

    if (!chosen) return null;
    var text = phraseFor(chosen, hour, rng, state.last[chosen], milestone, ctx.rotate, ctx.weakCat);
    if (!text) return null;
    // Un hito superado sin evento queda cerrado para no disparar tarde: los inferiores se consideran vistos.
    if (chosen === 'streak') { state.milestones[milestone] = true; MILESTONES.forEach(function (x) { if (x < milestone) state.milestones[x] = true; }); }
    return done(state, ctx, chosen, text, ctx.nowMs);
  }

  return {
    COOLDOWN_MS: COOLDOWN_MS, MIN_ANSWERS_BETWEEN: MIN_ANSWERS_BETWEEN, MIN_ANSWERS_START: MIN_ANSWERS_START,
    P: P, STREAK_P: STREAK_P, BROKEN_MIN_RUN: BROKEN_MIN_RUN, BROKEN_P: BROKEN_P, MAX_PER_GAME: MAX_PER_GAME, RECENT_MS: RECENT_MS, WEAK_MS: WEAK_MS, MILESTONES: MILESTONES, ASSETS: ASSETS, LABELS: LABELS, RARE_P: RARE_P,
    PHRASES: { visit: VISIT, visitRare: VISIT_RARE, streak: STREAK_PHRASES, broken: BROKEN_PHRASES, record: RECORD, comeback: COMEBACK, weak: WEAK, day: DAY, dayRare: DAY_RARE, nightEarly: NIGHT_EARLY, nightLate: NIGHT_LATE, nightRare: NIGHT_RARE },
    isNight: isNight, isDay: isDay, newState: newState, evaluate: evaluate
  };
})();
