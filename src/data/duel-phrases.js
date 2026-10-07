// SirEdwards Quiz — frases de final de Duelo online y Retos (tono de Sir Edwards).
// Restauradas de la versión 1.x (las retiró por error la limpieza del Duelo por código).
// Script clásico: expone window.SEQDuelPhrases. Solo texto; no toca puntuaciones ni resultados.
(function () {
  'use strict';

  var PHRASES = {
  victoria_1: [
    "Un punto. Exactamente la distancia entre celebrar la victoria y tener que inventar una explicación.",
    "Victoria por un punto. El margen es microscópico. La diferencia, aparentemente, no.",
    "Un solo punto ha decidido el duelo. Qué poco hace falta para arruinarle el día a alguien.",
    "Has ganado por un punto. Técnicamente, victoria. Moralmente, dejémoslo en empate.",
    "Un punto de diferencia. Lo suficiente para ganar y demasiado poco para presumir sin hacer el ridículo.",
    "Victoria por un punto. La gloria es tuya. La dignidad del rival, sorprendentemente, sigue en paradero desconocido.",
    "Has ganado por un margen que permite al rival conservar algo de dignidad.",
    "Has ganado. El rival puede atribuirlo a la suerte si eso le ayuda a dormir."
  ],
  victoria_2_3: [
    "Victoria ajustada. Ha faltado poco para perder. Qué detalle tan incómodo.",
    "Victoria por la mínima. No ha sido una obra maestra, pero el marcador no exige tanto.",
    "Un duelo muy igualado. Durante unos minutos, ambos parecían saber lo que hacían.",
    "Hasta el último punto. Mucha tensión para descubrir, al final, quién se equivocó menos.",
    "Victoria ajustada. El rival estuvo cerca. Tú también estuviste cerca de perderla.",
    "Has ganado. Por poco. Pero no temas: la victoria sigue siendo legal.",
    "Victoria por la mínima. Presume con moderación; tu rival aún respira.",
    "Has ganado por muy poco. Es la victoria que más se parece a una prórroga de la derrota.",
    "Por dos o tres puntos. No es una paliza: es una advertencia amistosa.",
    "Ganar por tan poco tiene su mérito. Lástima que perder por tan poco también lo tenga.",
    "Una victoria raspada. Aun así, el trofeo no pregunta cómo llegó.",
    "Has ganado con un pie en el abismo. Se agradece el espectáculo."
  ],
  victoria_clara: [
    "Victoria clara. La diferencia ya no permite esconderse detrás de la suerte. Qué lástima.",
    "Dirán que fue un buen duelo. El marcador es menos diplomático.",
    "Victoria con autoridad. La derrota, al menos, ha quedado perfectamente documentada.",
    "Una diferencia considerable. Lo suficiente para convertir el “casi” en una excusa bastante pobre.",
    "Victoria sin demasiadas complicaciones. Qué poco duró la resistencia.",
    "El duelo parecía prometedor. El marcador decidió contar otra historia.",
    "Un resultado bastante contundente. Las explicaciones pueden esperar sentadas.",
    "Has ganado con claridad. El rival puede consolarse pensando que, al menos, participó.",
    "La diferencia empieza a ser incómoda. Para el rival, concretamente.",
    "Victoria convincente. Ya no ha sido cuestión de suerte. Qué mala noticia para quien ha perdido.",
    "Has ganado con suficiente margen para que el rival necesite una explicación.",
    "Una victoria cómoda. Qué poco deportivo de tu parte.",
    "Has dejado suficiente distancia entre ambos como para cobrar peaje.",
    "Victoria clara. El marcador parece bastante satisfecho contigo.",
    "El duelo estuvo cerca de ser interesante. Luego apareciste tú."
  ],
  victoria_aplastante: [
    "Esto no ha sido un duelo. Ha sido una demostración de por qué conviene elegir mejor las batallas.",
    "La batalla terminó mucho antes que la partida. El marcador solo tardó en hacerlo oficial.",
    "Victoria aplastante. A estas alturas, analizar los errores sería casi ensañamiento.",
    "No ha habido color. Tampoco demasiadas respuestas correctas al otro lado.",
    "Una diferencia de este tamaño merece respeto. Y quizá un pequeño periodo de reflexión.",
    "Esto ha sido menos duelo y más exhibición. La entrada era gratuita.",
    "Victoria aplastante. Hay derrotas que enseñan algo. Esta, de momento, solo enseña el marcador.",
    "La diferencia es tan grande que hasta presumir empieza a parecer innecesario.",
    "Una paliza intelectual. Elegante, limpia y completamente innecesaria.",
    "El duelo ha terminado. El orgullo del rival, según parece, necesita unos minutos más.",
    "El rival ha aprendido algo importante: elegir mejor a sus oponentes.",
    "Has ganado con tanta claridad que casi siento lástima. Casi.",
    "Una victoria tan cómoda que empieza a parecer de mala educación.",
    "Podría llamarlo duelo, pero sería generoso."
  ],
  derrota_1: [
    "Un punto. Exactamente lo que ha separado la victoria de una derrota bastante irritante.",
    "Derrota por un punto. El margen es mínimo. La molestia, considerable.",
    "Un solo punto ha decidido el duelo. Qué forma tan eficiente de arruinar una victoria.",
    "Has perdido por un punto. Enhorabuena: has encontrado la distancia exacta entre ganar y lamentarlo.",
    "Un punto. Nada. Absolutamente nada. Y, sin embargo, suficiente para perder.",
    "Derrota por un punto. La diferencia cabe en una línea. El orgullo, de momento, no.",
    "Te ha faltado un punto. Qué generosa ha sido la victoria al dejarte tan cerca.",
    "Has perdido por un margen incómodamente pequeño. Qué manera tan elegante de sufrir.",
    "Una derrota estrecha. Lo bastante pequeña para recordarla."
  ],
  derrota_2_3: [
    "Derrota ajustada. Ha faltado muy poco para ganar y exactamente lo suficiente para perder.",
    "Victoria rival por un margen ridículo. El orgullo tendrá que conformarse con eso.",
    "Derrota por la mínima. Lo bastante cerca para lamentarlo y demasiado lejos para negarlo.",
    "Un resultado muy ajustado. La victoria estuvo cerca, pero decidió no quedarse.",
    "Has estado cerca. Una expresión magnífica para describir a alguien que acaba de perder.",
    "Derrota ajustada. El rival no fue mucho mejor. Solo lo suficiente.",
    "Casi ganas. Una de las formas más elegantes de decir “perdiste”.",
    "La victoria estuvo cerca. El marcador, por desgracia, sabe contar.",
    "El rival ha ganado por poco. Lo suficiente para presumir, por desgracia.",
    "Has estado a un paso. Naturalmente, el paso era exactamente lo necesario."
  ],
  derrota_aplastante: [
    "Esto no ha sido un duelo. Ha sido un malentendido con consecuencias.",
    "La derrota ha sido tan amplia que tiene código postal propio.",
    "El marcador ha dejado de ser una cifra y se ha convertido en un comentario.",
    "Te han ganado con tal holgura que el rival ha podido merendar durante la partida.",
    "Una diferencia de este tamaño no se llora: se enmarca, para no repetirla.",
    "Has perdido con una claridad pedagógica. Alguien debería tomar apuntes.",
    "Te consuela saber que el próximo duelo no puede salir peor. Estadísticamente.",
    "El rival ha ganado con tanta ventaja que ni siquiera necesita presumir. Qué aburrimiento para todos."
  ],
  derrota_clara: [
    "Derrota clara. El marcador no parece dispuesto a aceptar negociaciones.",
    "No ha habido excusas que salvar. Simplemente se ha jugado peor.",
    "La diferencia es demasiado grande para culpar a la suerte. Qué inconveniente.",
    "Has perdido con claridad. El rival no necesita presumir; el marcador ya lo hace por él.",
    "Derrota contundente. Siempre queda la revancha, si el orgullo sobrevive hasta entonces.",
    "El duelo ha hablado con claridad. Y no precisamente a tu favor.",
    "Una diferencia considerable. Al menos ahora sabes exactamente cuánto te faltaba.",
    "No ha sido una tragedia. Solo has sido claramente peor. Mucho más fácil de diagnosticar."
  ],
  empate: [
    "Empate. Ninguno ha conseguido imponerse. Qué equilibrio tan poco satisfactorio.",
    "Empate. Dos rivales, cero vencedores y una cantidad preocupante de orgullo intacto.",
    "Mismo resultado para ambos. La mediocridad también puede ser democrática.",
    "Empate. Nadie gana, nadie pierde y nadie puede presumir demasiado. Qué final tan poco satisfactorio.",
    "Empate. Has dedicado exactamente el mismo esfuerzo que tu rival a no ganar.",
    "Empate. Dos mentes enfrentadas y ninguna considerada suficientemente convincente.",
    "Un empate. La solución perfecta cuando ninguno ha hecho méritos suficientes para celebrar.",
    "Igualdad absoluta. Qué alivio: así nadie tendrá que admitir que perdió.",
    "Empate. Ni siquiera el marcador ha querido tomar partido.",
    "Nadie ha ganado. Nadie ha perdido. Qué solución tan poco ambiciosa.",
    "Igualados hasta el final. Qué falta de consideración hacia el suspense.",
    "Empate. Una forma muy educada de no resolver nada.",
    "Dos rivales, un mismo resultado y ninguna excusa especialmente convincente."
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
  function pickRotating(result, margin, seedId) {
    var key = poolKey(result, Math.abs(Number(margin) || 0)), list = PHRASES[key];
    if (!list || !list.length) return '';
    return memoPick(key, list, seedId, function () { return pick(result, margin, seedId); });
  }

  // Duelos que terminan sin jugarse hasta el final (abandono o plazo vencido): una bolsa por situación. {nombre} es el del rival.
  var FORFEIT = {
    yo_abandono: ['Retirarse a tiempo también es una estrategia; esta no lo fue.', 'Abandonaste, y el duelo siguió sin ti. Qué humillante lo poco que se te echó de menos.', 'Sir Edwards no concede prórrogas.'],
    rival_abandono: ['Victoria por incomparecencia: la más cómoda y la menos épica.', '{nombre} ha desaparecido en pleno duelo. No te lo tomes como un cumplido.', '{nombre} se ha ido a medias. Tú has terminado. Anótate la diferencia.'],
    yo_no_jugue: ['El reto caducó contigo dentro, lo que tiene su mérito.', 'La puntualidad no es negociable, aunque tú lo hayas intentado.', 'El reloj no esperó, y yo tampoco.'],
    rival_no_jugo: ['Ganas por incomparecencia, que cuenta, pero no se presume.', '{nombre} dejó caducar el reto. Victoria de oficio, sin aplausos.', 'Hay rivales que se rinden antes de empezar; este no cumplió ni eso.']
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
  var VERDICT_OK = ['Punto para ti.', 'Anotado. Sin aspavientos.', 'Otro para ti. El rival, tomando nota.', 'Correcto. Procura que no se te suba.', 'Acierto. Así sí.', 'Este te lo concedo.'];
  var VERDICT_BAD = ['Esta se te escapa. Era: ', 'Fallo. Era: ', 'Esa no. Era: ', 'Lástima. Era: ', 'Casi. Y «casi» no puntúa. Era: ', 'Un clásico tuyo. Era: '];
  function verdict(ok, seed) {
    var list = ok ? VERDICT_OK : VERDICT_BAD;
    return forfeitFallback(list, String(seed == null ? '' : seed) + (ok ? '+' : '-'));
  }

  window.SEQDuelPhrases = { PHRASES: PHRASES, FORFEIT: FORFEIT, VERDICT_OK: VERDICT_OK, VERDICT_BAD: VERDICT_BAD, pick: pick, pickRotating: pickRotating, pickForfeit: pickForfeit, verdict: verdict, poolKey: poolKey };
})();
