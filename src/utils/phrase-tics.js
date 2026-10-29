// 2.5 — Muletillas de Sir Edwards: evita que dos frases seguidas (de cualquier grupo) compartan la misma expresión de carácter
// («por una vez», «expediente», «excusas», «procura»…). Solo reordena la bolsa rotativa: mira las últimas candidatas y adelanta
// la primera que no repita una muletilla de las dos frases anteriores. Cada frase sigue saliendo una vez por vuelta de bolsa.
// Memoria solo de la sesión (no toca el almacén ni la sincronización). Si falla algo, la bolsa funciona como siempre.
var SEQTics = (function () {
  'use strict';
  var TICS = [
    /por una vez/, /por desgracia/, /por lo visto/, /aparentemente/, /expediente/, /excusa/, /procura/, /l[aá]stima/,
    /orgullo/, /dignidad/, /sospech/, /admirable/, /marcador/, /cortes[ií]a/, /paciencia/, /suerte/, /al menos/, /\bcasi\b/
  ];
  var LOOK = 4, KEEP = 2, recent = [];

  function ticsOf(text) {
    var t = String(text == null ? '' : text).toLowerCase(), out = [];
    for (var i = 0; i < TICS.length; i++) if (TICS[i].test(t)) out.push(i);
    return out;
  }
  function clash(ids) {
    for (var r = 0; r < recent.length; r++) for (var k = 0; k < ids.length; k++) if (recent[r].indexOf(ids[k]) >= 0) return true;
    return false;
  }
  // `bag` se vacía con pop(): las siguientes están al final. `avoid` = índice que salió justo antes en este grupo.
  function prefer(bag, list, avoid) {
    if (!Array.isArray(bag) || bag.length < 2 || !recent.length) return bag;
    var last = bag.length - 1;
    if (!clash(ticsOf(list[bag[last]]))) return bag;
    for (var k = last - 1; k >= 0 && k >= last - (LOOK - 1); k--) {
      if (bag[k] === avoid) continue;
      if (!clash(ticsOf(list[bag[k]]))) { var tmp = bag[k]; bag[k] = bag[last]; bag[last] = tmp; break; }
    }
    return bag;
  }
  function note(text) { recent.push(ticsOf(text)); if (recent.length > KEEP) recent.shift(); }
  function reset() { recent = []; }

  return { ticsOf: ticsOf, prefer: prefer, note: note, reset: reset };
})();
if (typeof window !== 'undefined') window.SEQTics = SEQTics;
