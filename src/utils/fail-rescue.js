// SirEdwards Quiz — Rescate tras fallos seguidos y apertura fácil (partidas en solitario).
//
// Dos reglas pequeñas para que el jugador normal no encadene fallos:
//   · openWithEasy: las primeras preguntas de la cola de Estándar son siempre fáciles. Solo intercambia posiciones,
//     así que los totales por dificultad no cambian.
//   · rescue: tras 2 fallos seguidos, si la siguiente pregunta no es fácil, se cambia de sitio con la próxima fácil de la cola.
//     La pregunta desplazada no se pierde, pasa más adelante; en las partidas que acaban antes (vidas, reloj) puede no llegar a salir.
//     Nunca deja 3 difíciles seguidas. El contador de fallos se reinicia al usarse.
// Solo aplica a Estándar, Supervivencia (menos el tramo «derrame», que no tiene fáciles) y Contrarreloj, y nunca a Duelo/Retos.
// Muerte Súbita (acaba al primer fallo), Lucidez Mental (curva compartida con el Worker) y Repaso quedan fuera.
// Script clásico (scope global), sin dependencias. No tiene copia en el Worker.

const SEQFailRescue = (function () {
  'use strict';

  var RUN = 2;          // fallos seguidos que activan el rescate
  var OPENING_EASY = 3; // preguntas iniciales fáciles en Estándar

  function eligible(game) {
    if (!game || game.isDuel) return false;
    if (game.mode === 'play' || game.mode === 'timetrial') return true;
    if (game.mode === 'survival') return game.survivalTier !== 'derrame';
    return false;
  }

  // Se llama al responder: cuenta los fallos seguidos de la partida.
  function record(game, correct) {
    if (!eligible(game)) return;
    game.wrongRun = correct ? 0 : (game.wrongRun || 0) + 1;
  }

  function hardRun(queue, from, step) {
    var n = 0;
    for (var k = from; k >= 0 && k < queue.length && queue[k] && queue[k].dif === 'dificil'; k += step) n++;
    return n;
  }

  // Colocar `item` en la posición j dejaría 3 difíciles seguidas?
  function makesThreeHard(queue, j, item) {
    if (!item || item.dif !== 'dificil') return false;
    return hardRun(queue, j - 1, -1) + 1 + hardRun(queue, j + 1, 1) > 2;
  }

  // Se llama al pasar a la pregunta siguiente (game.currentIdx ya apunta a ella). Devuelve true si cambió el orden.
  function rescue(game) {
    if (!eligible(game) || (game.wrongRun || 0) < RUN) return false;
    var queue = game.queue, i = game.currentIdx;
    if (!Array.isArray(queue) || i < 0 || i >= queue.length) return false;
    if (queue[i] && queue[i].dif === 'facil') { game.wrongRun = 0; return false; }
    var prevCat = i > 0 && queue[i - 1] ? queue[i - 1].cat : null;
    var best = -1;
    for (var j = i + 1; j < queue.length; j++) {
      var c = queue[j];
      if (!c || c.dif !== 'facil') continue;
      if (makesThreeHard(queue, j, queue[i])) continue;
      if (best === -1) best = j;
      if (c.cat !== prevCat) { best = j; break; } // preferimos otra categoría que la anterior
    }
    if (best === -1) return false;
    var t = queue[i]; queue[i] = queue[best]; queue[best] = t;
    game.wrongRun = 0;
    return true;
  }

  // ¿La pregunta que viene tras la actual será fácil si se aplica el rescate? (lo usa el evento de ánimo de Sir Edwards para
  // insinuarlo solo cuando es verdad: hay alguna fácil por delante). Se llama con game.currentIdx apuntando a la pregunta ya respondida.
  function willGiveEasy(game) {
    if (!eligible(game) || !Array.isArray(game.queue)) return false;
    for (var k = (game.currentIdx || 0) + 1; k < game.queue.length; k++) if (game.queue[k] && game.queue[k].dif === 'facil') return true;
    return false;
  }

  // Cola de Estándar: las `n` primeras, fáciles. Intercambia cada no fácil inicial con la fácil más cercana de más adelante.
  function openWithEasy(queue, n) {
    if (!Array.isArray(queue)) return queue;
    var limit = Math.min(n == null ? OPENING_EASY : n, queue.length);
    for (var i = 0; i < limit; i++) {
      if (queue[i] && queue[i].dif === 'facil') continue;
      for (var j = limit; j < queue.length; j++) {
        if (queue[j] && queue[j].dif === 'facil' && !makesThreeHard(queue, j, queue[i])) {
          var t = queue[i]; queue[i] = queue[j]; queue[j] = t;
          break;
        }
      }
    }
    return queue;
  }

  return { eligible: eligible, record: record, rescue: rescue, willGiveEasy: willGiveEasy, openWithEasy: openWithEasy, RUN: RUN, OPENING_EASY: OPENING_EASY };
})();
