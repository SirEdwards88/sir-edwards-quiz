// Contrarreloj: las preguntas jugadas hace poco (store.recentQuestionIds, últimas ~60) pasan al final de la cola.
// La cola de Contrarreloj se construye de golpe con todo el banco (bolsa «full», ver pickDiverseFromBag), y la ventana
// de 6 candidatas de esa función se atasca de recientes hacia la pregunta ~30. Aquí se reordena la cola ya hecha:
// primero las que NO son recientes (en el mismo orden, así se conserva su variedad de categorías) y después las
// recientes. No quita ni duplica ninguna pregunta: solo cambia el orden, y las recientes siguen disponibles si hicieran falta.
// Script clásico (scope global), sin dependencias.
function freshFirst(queue, recentIds) {
  var recent = {};
  (recentIds || []).forEach(function (id) { recent[id] = true; });
  var fresh = [], old = [];
  (queue || []).forEach(function (q) { (recent[q.n] ? old : fresh).push(q); });
  return fresh.concat(old);
}
