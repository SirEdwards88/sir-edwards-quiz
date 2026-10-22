// SirEdwards Quiz — frases de final de Duelo online y Retos (tono de Sir Edwards).
// Restauradas de la versión 1.x (las retiró por error la limpieza del Duelo por código).
// Script clásico: expone window.SEQDuelPhrases. Solo texto; no toca puntuaciones ni resultados.
(function () {
  'use strict';

  var PHRASES = {
  victoria_1: [
    "Un punto. Exactamente la distancia entre celebrar la victoria y tener que inventar una explicación.",
    "Victoria por un punto. El margen es microscópico. La diferencia, aparentemente, no.",
    "Has ganado por un punto. Técnicamente, victoria. Moralmente, dejémoslo en empate.",
    "Un punto de diferencia. Suficiente para ganar y demasiado poco para relajarse.",
    "Victoria por un punto. La gloria es tuya; la dignidad del rival sigue en paradero desconocido.",
    "Has ganado por un margen que invita al rival a pedir revancha. Y a ti, a rechazarla.",
    "Has ganado. El rival puede atribuirlo a la suerte si eso le ayuda a dormir."
  ],
  victoria_2_3: [
    "Victoria ajustada. Ha faltado poco para perder. Detalle que callaremos.",
    "Victoria por la mínima. No ha sido una obra maestra, pero cumple su función.",
    "Duelo igualado. Ambos han mostrado el mismo talento para dudar.",
    "Hasta el último punto. Mucha tensión para descubrir, al final, quién se equivocó menos.",
    "Has ganado. Por poco. Pero no temas: la victoria sigue siendo legal.",
    "Victoria corta. Presume con moderación; tu rival aún respira.",
    "Has ganado por muy poco. Es la victoria que más se parece a una prórroga de la derrota.",
    "Por dos o tres puntos. No es dominio: es una advertencia bastante educada.",
    "Ganar por tan poco tiene su mérito. Lástima que perder por tan poco también lo tenga.",
    "Una victoria raspada. Aun así, el trofeo no pregunta cómo llegó."
  ],
  victoria_clara: [
    "Victoria clara. La diferencia ya no permite esconderse detrás de la suerte. Qué lástima.",
    "Dirán que fue un buen duelo. El marcador, menos aficionado a la diplomacia, discrepa.",
    "Victoria con autoridad. La derrota, al menos, ha quedado perfectamente documentada.",
    "Diferencia considerable. El debate ha terminado y el rival aún no ha encontrado la salida.",
    "Victoria sin demasiadas complicaciones. Qué poco duró la resistencia.",
    "El duelo parecía prometedor. El marcador decidió contar otra historia.",
    "Resultado contundente. Las excusas tendrán que comparecer con cita previa.",
    "Has ganado con claridad. Cualquier excusa llegará tarde y mal vestida.",
    "La diferencia empieza a ser incómoda. Para el rival, concretamente.",
    "Victoria convincente. La suerte ha presentado su dimisión como coartada.",
    "Una victoria cómoda. Qué poco deportivo de tu parte.",
    "Has dejado suficiente distancia entre ambos como para cobrar peaje.",
    "El duelo estuvo cerca de ser interesante. Luego apareciste tú."
  ],
  victoria_aplastante: [
    "La batalla terminó mucho antes que la partida. El resultado solo tardó en confirmarlo.",
    "Victoria aplastante. A estas alturas, analizar los errores sería casi ensañamiento.",
    "No ha habido color. Tampoco demasiadas respuestas correctas al otro lado.",
    "Una diferencia de este tamaño merece respeto. Y quizá un pequeño periodo de reflexión.",
    "Esto ha sido menos duelo y más exhibición. La entrada era gratuita.",
    "Victoria aplastante. Hay derrotas que enseñan algo. Esta, de momento, solo enseña el marcador.",
    "La diferencia es tan grande que hasta presumir empieza a parecer innecesario.",
    "Una diferencia intelectual enorme. Elegante, limpia y, por qué negarlo, cruel.",
    "El duelo ha terminado. El orgullo del rival, según parece, necesita unos minutos más.",
    "El rival ha aprendido algo importante: elegir mejor a sus oponentes.",
    "Has ganado con tanta claridad que casi siento lástima. Casi.",
    "Una victoria tan cómoda que casi habría bastado con enviar el resultado por correo.",
    "Podría llamarlo duelo, pero sería generoso."
  ],
  derrota_1: [
    "Un punto. Exactamente lo que ha separado la victoria de una derrota bastante irritante.",
    "Derrota por un punto. El margen es mínimo. La molestia, considerable.",
    "Todo se ha decidido por un punto. Qué manera tan eficiente de arruinar una victoria.",
    "Has perdido por un punto. Enhorabuena: has encontrado la distancia exacta entre ganar y lamentarlo.",
    "Un punto. No parece gran cosa hasta que descubres que era el tuyo.",
    "Derrota por un punto. La diferencia cabe en una línea. El orgullo, de momento, no.",
    "Te ha faltado un punto. Qué generosa ha sido la victoria al dejarte tan cerca.",
    "Has perdido por un margen minúsculo. Qué manera tan elegante de sufrir.",
    "Perdiste por tan poco que el rival no sabe si celebrar o disculparse. Yo sí lo sé."
  ],
  derrota_2_3: [
    "Derrota ajustada. Ha faltado muy poco para ganar y exactamente lo suficiente para perder.",
    "El rival ha ganado por poco. Lo suficiente para celebrarlo y demasiado poco para olvidarlo.",
    "Un resultado muy ajustado. La victoria estuvo cerca, pero decidió no quedarse.",
    "Has estado cerca. Una expresión magnífica para describir a alguien que acaba de perder.",
    "Derrota ajustada. El rival no fue mucho mejor. Solo lo suficiente.",
    "Estuviste cerca de ganar. El resultado, por desgracia, sabe contar.",
    "El rival ha ganado por poco. Lo suficiente para presumir, por desgracia.",
    "Te faltó muy poco. Lamentablemente, el reglamento no contempla los casi."
  ],
  derrota_aplastante: [
    "Esto no ha sido un duelo. Ha sido un malentendido con consecuencias.",
    "La derrota ha sido tan amplia que figura en los mapas.",
    "El resultado ha dejado de ser una cifra y se ha convertido en un comentario.",
    "Te han ganado con tal holgura que el rival ha podido merendar durante la partida.",
    "Una diferencia de este tamaño no se llora: se enmarca, para no repetirla.",
    "Has perdido con una claridad pedagógica. Alguien debería tomar apuntes.",
    "Consuélate: peor que esto ya no se puede jugar. Aunque tú siempre encuentras la forma.",
    "El rival ha ganado con tanta ventaja que ni siquiera necesita presumir. Qué aburrimiento para todos.",
    "Tu rival no ha ganado; tú has colaborado con entusiasmo."
  ],
  derrota_clara: [
    "Derrota clara. El resultado no parece dispuesto a aceptar negociaciones.",
    "Se ha jugado peor. Concretamente, tú.",
    "La diferencia es demasiado grande para culpar a la suerte. Ha declinado.",
    "Has perdido con claridad. El rival ni siquiera necesita añadir comentarios.",
    "Derrota contundente. Queda otra partida, si tu amor propio lo resiste.",
    "El duelo ha hablado con claridad. Y no precisamente a tu favor.",
    "Una diferencia considerable. Al menos ahora sabes exactamente cuánto te faltaba.",
    "No ha sido una tragedia. Solo una diferencia clara, de fácil diagnóstico.",
    "Has perdido con testigos, que es lo más cruel.",
    "Derrota. Si necesitas una excusa, tienes preguntas de sobra entre las que elegir."
  ],
  empate: [
    "Empate. Ninguno ha conseguido imponerse. Qué equilibrio tan poco satisfactorio.",
    "Empate. Dos rivales, cero vencedores y una cantidad preocupante de orgullo intacto.",
    "Mismo resultado para ambos. Qué democrático. Qué poco emocionante.",
    "Empate. Nadie gana, nadie pierde y nadie tiene demasiado que celebrar.",
    "Empate. Ambos han dedicado el mismo esfuerzo a dejar la cuestión sin resolver.",
    "Empate. Ninguno ha convencido al marcador de que merecía más.",
    "Un empate. La solución perfecta cuando ninguno ha hecho méritos suficientes para celebrar.",
    "Igualdad absoluta. Al menos nadie tendrá que explicar cómo terminó esto.",
    "Empate. Ni siquiera el resultado ha querido tomar partido.",
    "Igualdad hasta el final. Qué falta de consideración hacia el suspense.",
    "Empate. El único resultado en el que ambos podéis reclamar la última palabra."
  ]
};


  // Categoría según resultado y diferencia de puntos.
  function poolKey(result, margin) {
    if (result === 'draw') return 'empate';
    if (result === 'win') {
      if (margin <= 1) return 'victoria_1';
      if (margin <= 3) return 'victoria_2_3';
      if (margin <= 7) return 'victoria_clara';
      return 'victoria_aplastante';
    }
    if (margin <= 1) return 'derrota_1';
    if (margin <= 3) return 'derrota_2_3';
    if (margin <= 7) return 'derrota_clara';
    return 'derrota_aplastante';      // desde 8 puntos de diferencia, igual que el título «Derrota sin paliativos»
  }

  // Frase estable para una misma partida: se elige por hash del id (no cambia al repintar la pantalla ni al reabrir el
  // resultado). Es la versión SIN bolsa: queda de reserva si no hay almacén (y para las pruebas).
  function pick(result, margin, seedId) {
    var list = PHRASES[poolKey(result, Math.abs(Number(margin) || 0))];
    if (!list || !list.length) return '';
    var s = String(seedId == null ? '' : seedId), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return list[(h >>> 0) % list.length];
  }

  // Versión con BOLSA (la que usa el juego): como las frases de los modos en solitario, no se repite ninguna del grupo hasta
  // haberlas dicho todas (también entre partidas). La frase de cada partida se recuerda (store.duelPhraseByGame, las últimas 40)
  // para que no cambie al repintar la pantalla ni al reabrir el resultado, y para que repintar no gaste frases de la bolsa.
  var KEEP_GAMES = 40;
  function memoPick(key, list, seedId, fallback) {
    var ok = typeof pickRotatingPhrase === 'function' && typeof store === 'object' && store && seedId != null && seedId !== '';
    if (!ok) return fallback();
    var id = String(seedId), memo = store.duelPhraseByGame;
    if (!memo || typeof memo !== 'object' || Array.isArray(memo)) memo = store.duelPhraseByGame = {};
    var m = memo[id];
    if (m && m.k === key && typeof m.i === 'number' && list[m.i]) return list[m.i];
    var text = pickRotatingPhrase('duel_' + key, list), i = list.indexOf(text);
    if (i < 0) return fallback();
    memo[id] = { k: key, i: i };
    var ids = Object.keys(memo);
    for (var j = 0; j < ids.length - KEEP_GAMES; j++) delete memo[ids[j]];
    try { if (typeof saveStore === 'function') saveStore(); } catch (e) {}
    return text;
  }
  // 2.3: a veces la frase lleva el nombre del RIVAL (bolsas aparte en named-phrases.js, poco frecuentes). La decisión se toma UNA vez por
  // partida y se recuerda con el texto ya hecho (memo.t), para que no cambie al repintar. Sin nombre válido, todo igual que siempre.
  var NAMED_GROUP = { victoria_1: 'victoria_ajustada', victoria_2_3: 'victoria_ajustada', victoria_clara: 'victoria_clara', victoria_aplastante: 'victoria_clara',
    derrota_1: 'derrota_ajustada', derrota_2_3: 'derrota_ajustada', derrota_clara: 'derrota_clara', derrota_aplastante: 'derrota_clara', empate: 'empate' };
  function namedForGame(key, rivalName, seedId) {
    try {
      if (!rivalName || seedId == null || seedId === '' || typeof store !== 'object' || !store) return null;
      var id = String(seedId), memo = store.duelPhraseByGame;
      if (!memo || typeof memo !== 'object' || Array.isArray(memo)) memo = store.duelPhraseByGame = {};
      var m = memo[id];
      if (m) return (m.t && typeof m.t === 'string') ? m.t : null;          // ya decidido: con nombre (m.t) o sin él
      if (!window.SEQNamed || !NAMED_GROUP[key]) return null;
      var t = SEQNamed.tryPick('duel_' + NAMED_GROUP[key], { name: rivalName });
      if (!t) return null;
      memo[id] = { k: 'named', t: t };
      var ids = Object.keys(memo);
      for (var j = 0; j < ids.length - KEEP_GAMES; j++) delete memo[ids[j]];
      try { if (typeof saveStore === 'function') saveStore(); } catch (e) {}
      return t;
    } catch (e) { return null; }
  }
  function pickRotating(result, margin, seedId, rivalName) {
    var key = poolKey(result, Math.abs(Number(margin) || 0)), list = PHRASES[key];
    if (!list || !list.length) return '';
    var named = namedForGame(key, rivalName, seedId);
    if (named) return named;
    return memoPick(key, list, seedId, function () { return pick(result, margin, seedId); });
  }

  // Duelos que terminan sin jugarse hasta el final (abandono o plazo vencido): una bolsa por situación. {nombre} es el del rival.
  var FORFEIT = {
    yo_abandono: ['Retirarse a tiempo también es una estrategia; esta no lo fue.', 'Abandonaste, y el duelo siguió sin ti. Con una naturalidad sospechosa.', 'Retirada aceptada. Dejaré el motivo en blanco; la imaginación hará el resto.', 'Sir Edwards no concede prórrogas.', 'Cerrar la puerta a mitad del duelo no es elegante, pero sí rápido.'],
    rival_abandono: ['Victoria por abandono: la más cómoda y la menos épica.', '{nombre} ha abandonado el duelo. Tal vez el suspense le resultaba excesivo.', '{nombre} ha dejado la partida sin terminar. Tú, al menos, has tenido la cortesía de llegar al final.', '{nombre} ha preferido no conocer el resultado. Tú sí, y es favorable.', '{nombre} ha cedido antes del final. La victoria es tuya; la cortesía de ocultar la sonrisa, también.', '{nombre} ha desertado. Tomaremos su ausencia por un cumplido.'],
    yo_no_jugue: ['El reto caducó contigo dentro, lo que tiene su mérito.', 'La puntualidad no es negociable, aunque tú lo hayas intentado.', 'El reto ha caducado. Tu puntualidad sigue siendo una obra de ficción.', 'El reloj no esperó, y yo tampoco.', 'Plazo agotado. Algunos retos no se pierden: se dejan morir con paciencia.'],
    rival_no_jugo: ['Ganas por incomparecencia. Cuenta, aunque la épica haya tomado el día libre.', '{nombre} dejó caducar el reto. Victoria de oficio, sin aplausos.', 'El rival no se ha presentado. Celebra con discreción: has vencido a una ausencia.', 'Hay duelos que terminan antes de empezar. Este ha sido uno de ellos.', '{nombre} no ha respondido a tiempo. Victoria por silencio administrativo.', 'El reto ha vencido sin que {nombre} aparezca. Tu rival ha perdido contra el calendario.']
  };
  function forfeitFallback(list, seedId) {
    var s = String(seedId == null ? '' : seedId), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return list[(h >>> 0) % list.length];
  }
  function pickForfeit(situation, name, seedId) {
    var list = FORFEIT[situation];
    if (!list) return '';
    var t = memoPick('forfeit_' + situation, list, seedId, function () { return forfeitFallback(list, seedId); });
    return String(t || '').replace(/\{nombre\}/g, name || 'Tu rival');
  }

  // Veredicto de cada pregunta del Duelo (se lee unas 20 veces por duelo): estable por pregunta (mismo texto al repintar).
  var VERDICT_OK = ['Punto para ti. Anótalo en un sitio visible: no abundan.', 'Anotado. Sin aspavientos.', 'Correcto. Procura que no se te suba.', 'Acierto. Aprovecha, que no se repetirá a menudo.', 'Este te lo concedo.', 'Punto tuyo. La suerte, de momento, te sonríe con cautela.'];
  var VERDICT_BAD = ['Esta se te escapa, qué sorpresa. Era: ', 'Fallo, como cabía esperar. Era: ', 'Esa no. Era: ', 'Una lástima, aunque no para mí. Era: ', 'Eso no puntúa. Era: ', 'Otro más para la colección. Era: ', 'Ni de casualidad. Era: ', 'Un error de manual. Era: ', 'Cuesta equivocarse con tanto aplomo. Era: '];
  function verdict(ok, seed) {
    var list = ok ? VERDICT_OK : VERDICT_BAD;
    return forfeitFallback(list, String(seed == null ? '' : seed) + (ok ? '+' : '-'));
  }

  window.SEQDuelPhrases = { PHRASES: PHRASES, FORFEIT: FORFEIT, VERDICT_OK: VERDICT_OK, VERDICT_BAD: VERDICT_BAD, pick: pick, pickRotating: pickRotating, pickForfeit: pickForfeit, verdict: verdict, poolKey: poolKey };
})();
