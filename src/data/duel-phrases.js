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
    "Victoria por un punto. La gloria es tuya. La dignidad del rival, sorprendentemente, sigue en paradero desconocido."
  ],
  victoria_2_3: [
    "Victoria ajustada. Ha faltado poco para perder. Qué detalle tan incómodo.",
    "Victoria por la mínima. No ha sido una obra maestra, pero el marcador no exige tanto.",
    "Un duelo muy igualado. Durante unos minutos casi pareció que sabíais lo que estabais haciendo.",
    "Hasta el último punto. Mucha tensión para descubrir, al final, quién se equivocó menos.",
    "Victoria ajustada. El rival estuvo cerca. Tú también estuviste cerca de perderla.",
    "Has ganado. Por poco. Pero tranquilo: la victoria sigue siendo legal."
  ],
  victoria_clara: [
    "Victoria clara. La diferencia ya no permite esconderse detrás de la suerte. Qué lástima.",
    "Buen duelo. Aunque el marcador parece tener una opinión bastante distinta.",
    "Victoria con autoridad. La derrota, al menos, ha quedado perfectamente documentada.",
    "Una diferencia considerable. Lo suficiente para convertir el “casi” en una excusa bastante pobre.",
    "Victoria sin demasiadas complicaciones. Qué poco duró la resistencia.",
    "El duelo parecía prometedor. El marcador decidió contar otra historia.",
    "Un resultado bastante contundente. Las explicaciones pueden esperar sentadas.",
    "Has ganado con claridad. El rival puede consolarse pensando que, al menos, participó.",
    "La diferencia empieza a ser incómoda. Para el rival, concretamente.",
    "Victoria convincente. Ya no ha sido cuestión de suerte. Qué mala noticia para quien ha perdido."
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
    "El duelo ha terminado. El orgullo del rival, según parece, necesita unos minutos más."
  ],
  derrota_1: [
    "Un punto. Exactamente lo que ha separado la victoria de una derrota bastante irritante.",
    "Derrota por un punto. El margen es mínimo. La molestia, considerable.",
    "Un solo punto ha decidido el duelo. Qué forma tan eficiente de arruinar una victoria.",
    "Has perdido por un punto. Enhorabuena: has encontrado la distancia exacta entre ganar y lamentarlo.",
    "Un punto. Nada. Absolutamente nada. Y, sin embargo, suficiente para perder.",
    "Derrota por un punto. La diferencia cabe en una línea. El orgullo, de momento, no.",
    "Te ha faltado un punto. Qué generosa ha sido la victoria al dejarte tan cerca."
  ],
  derrota_2_3: [
    "Derrota ajustada. Ha faltado muy poco para ganar y exactamente lo suficiente para perder.",
    "Victoria rival por un margen ridículo. El orgullo tendrá que conformarse con eso.",
    "Derrota por la mínima. Lo bastante cerca para lamentarlo y demasiado lejos para negarlo.",
    "Un resultado muy ajustado. La victoria estuvo cerca, pero decidió no quedarse.",
    "Has estado cerca. Una expresión magnífica para describir a alguien que acaba de perder.",
    "Derrota ajustada. El rival no fue mucho mejor. Solo lo suficiente.",
    "Casi ganas. Una de las formas más elegantes de decir “perdiste”."
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
    "Empate. Ninguno ha conseguido imponerse. Qué decepción tan perfectamente equilibrada.",
    "Empate. Dos rivales, cero vencedores y una cantidad preocupante de orgullo intacto.",
    "Mismo resultado para ambos. La mediocridad también puede ser democrática.",
    "Empate. Nadie gana, nadie pierde y nadie puede presumir demasiado. Qué final tan poco satisfactorio.",
    "Empate. Habéis conseguido dedicar el mismo esfuerzo a no ganar.",
    "Empate. Dos mentes enfrentadas y ninguna considerada suficientemente convincente.",
    "Un empate. La solución perfecta cuando ninguno ha hecho méritos suficientes para celebrar.",
    "Igualdad absoluta. Qué alivio: así nadie tendrá que admitir que perdió."
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
    return 'derrota_clara';
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
  function pickRotating(result, margin, seedId) {
    var key = poolKey(result, Math.abs(Number(margin) || 0)), list = PHRASES[key];
    if (!list || !list.length) return '';
    var ok = typeof pickRotatingPhrase === 'function' && typeof store === 'object' && store && seedId != null && seedId !== '';
    if (!ok) return pick(result, margin, seedId);
    var id = String(seedId), memo = store.duelPhraseByGame;
    if (!memo || typeof memo !== 'object' || Array.isArray(memo)) memo = store.duelPhraseByGame = {};
    var m = memo[id];
    if (m && m.k === key && typeof m.i === 'number' && list[m.i]) return list[m.i];
    var text = pickRotatingPhrase('duel_' + key, list), i = list.indexOf(text);
    if (i < 0) return pick(result, margin, seedId);
    memo[id] = { k: key, i: i };
    var ids = Object.keys(memo);
    for (var j = 0; j < ids.length - KEEP_GAMES; j++) delete memo[ids[j]];
    try { if (typeof saveStore === 'function') saveStore(); } catch (e) {}
    return text;
  }

  window.SEQDuelPhrases = { PHRASES: PHRASES, pick: pick, pickRotating: pickRotating, poolKey: poolKey };
})();
