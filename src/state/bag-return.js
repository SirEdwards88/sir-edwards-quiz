// SirEdwards Quiz — devolución a la bolsa de las preguntas que no se llegaron a mostrar.
//
// Estándar, Supervivencia y Muerte Súbita sacan TODAS las preguntas de la partida de las bolsas por dificultad al empezar
// (ver pickDiverseFromBag en index.html). Si el jugador pierde en la sexta, las demás quedaban gastadas sin haberse visto
// y la bolsa de cada dificultad se agotaba antes de tiempo (sobre todo la difícil, que es la más pequeña).
// Al terminar o descartar la partida, las no mostradas vuelven a su bolsa para salir las primeras en la siguiente,
// y se quitan de la lista de «recientes» (no se han visto, así que no deben quedar relegadas).
// Script clásico (scope global). `unplayed` y `giveBack` no tocan el DOM; `giveBack` recibe el store.
const SEQBagReturn = (function () {
  'use strict';
  var MODES = { play: true, survival: true, sudden_death: true };
  var DIFS = { facil: true, medio: true, dificil: true };

  // Preguntas de la cola que no llegaron a mostrarse: todas las posteriores a la actual (la actual ya se enseñó).
  // Vacío si el modo no usa las bolsas por dificultad (Contrarreloj, Repaso, Lucidez, Cálculo, Duelo/Retos).
  function unplayed(game) {
    if (!game || !MODES[game.mode] || game.isDuel || !Array.isArray(game.queue)) return [];
    var idx = Number(game.currentIdx);
    if (!isFinite(idx) || idx < 0) idx = 0;
    return game.queue.slice(idx + 1).filter(function (q) { return q && q.n != null && DIFS[q.dif]; });
  }

  // Devuelve las no mostradas a store.questionBags[dificultad] (al final: es de donde se extrae primero) y las quita de
  // store.recentQuestionIds. Idempotente por partida (game.bagReturned). Devuelve cuántas volvieron.
  function giveBack(game, store) {
    if (!game || !store || game.bagReturned) return 0;
    var list = unplayed(game);
    game.bagReturned = true;
    if (!list.length) return 0;
    if (!store.questionBags) store.questionBags = {};
    var returned = {};
    var count = 0;
    list.forEach(function (q) {
      var bag = store.questionBags[q.dif];
      if (!Array.isArray(bag)) bag = [];
      if (bag.indexOf(q.n) !== -1) return;   // ya está (la bolsa se rebarajó a mitad de la partida)
      bag.push(q.n);
      store.questionBags[q.dif] = bag;
      returned[q.n] = true;
      count++;
    });
    if (Array.isArray(store.recentQuestionIds)) {
      store.recentQuestionIds = store.recentQuestionIds.filter(function (id) { return !returned[id]; });
    }
    return count;
  }

  return { unplayed: unplayed, giveBack: giveBack };
})();
