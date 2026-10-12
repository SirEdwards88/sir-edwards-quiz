// SirEdwards Quiz — Contrarreloj: memoria de preguntas vistas (bolsa persistente, como la de Lucidez).
//
// La cola de Contrarreloj se construye de golpe con todo el banco (bolsa «full» de pickDiverseFromBag, que se vacía entera
// en cada partida), así que esa bolsa por sí sola no recuerda nada entre partidas. Aquí se guarda, en
// store.questionBags['timetrial_vistas'], qué preguntas se han MOSTRADO ya en Contrarreloj en esta vuelta del banco:
//   · al empezar, la cola se reordena: primero las no vistas (y dentro de ellas las que no se han jugado hace poco en otros
//     modos), después las vistas. No quita ni duplica ninguna;
//   · al mostrarse una pregunta, se anota como vista;
//   · cuando ya no queda ninguna sin ver, empieza otra vuelta (se olvida todo).
// Así no se repite una pregunta hasta haber visto el banco entero, sea cual sea el número de partidas.
// Script clásico (scope global). `order` es pura (sin `store`) para poder probarla; el resto usa el global store.
const SEQTimetrialBag = (function () {
  'use strict';
  var KEY = 'timetrial_vistas';

  // queue: preguntas ya barajadas; seen: ids vistos; recent: ids jugados hace poco en cualquier modo (opcional).
  // Devuelve { queue, seen }: la cola reordenada y la lista de vistas que debe quedar guardada (vacía si empieza otra vuelta).
  function order(queue, seen, recent) {
    var ids = {}; (queue || []).forEach(function (q) { ids[q.n] = true; });
    var seenSet = {}; (Array.isArray(seen) ? seen : []).forEach(function (id) { if (ids[id]) seenSet[id] = true; });
    var left = (queue || []).filter(function (q) { return !seenSet[q.n]; });
    if (!left.length) { seenSet = {}; left = (queue || []).slice(); } // vuelta completa: otra vuelta
    var recentSet = {}; (recent || []).forEach(function (id) { recentSet[id] = true; });
    var fresh = [], recentUnseen = [], old = [];
    (queue || []).forEach(function (q) {
      if (seenSet[q.n]) old.push(q); else if (recentSet[q.n]) recentUnseen.push(q); else fresh.push(q);
    });
    return { queue: fresh.concat(recentUnseen, old), seen: Object.keys(seenSet).map(Number) };
  }

  function arrange(queue) {
    if (!store.questionBags) store.questionBags = {};
    var r = order(queue, store.questionBags[KEY], store.recentQuestionIds);
    store.questionBags[KEY] = r.seen;
    return r.queue;
  }

  function markSeen(q) {
    if (!q || q.n == null) return;
    if (!store.questionBags) store.questionBags = {};
    var s = Array.isArray(store.questionBags[KEY]) ? store.questionBags[KEY] : [];
    if (s.indexOf(q.n) === -1) s.push(q.n);
    store.questionBags[KEY] = s;
  }

  return { order: order, arrange: arrange, markSeen: markSeen, KEY: KEY };
})();
