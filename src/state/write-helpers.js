// Fase 4C — Helpers de escritura minimos: pushCapped y resetStreak.
//
// pushCapped: abstrae UNICAMENTE el patron real duplicado de
// store.gameHistory (unshift + recorte a un tope), tal cual existia en
// finishLucidezMode() y finishGame(). No se usa para duelHistory (un solo
// sitio, sin duplicacion que resolver) ni para duelPlayedCodes (direccion
// push+shift distinta -- unificarla cambiaria el orden interno del
// array). Ver CHANGELOG_FASE4C.md para el analisis completo.
//
// resetStreak: encapsula UNICAMENTE las dos asignaciones que aparecian,
// identicas, en los 5 puntos de arranque de modo. No toca
// updateAnswerStreak() ni ningun record (bestStreak, etc.) -- esos siguen
// gestionados donde ya estaban.
//
// Cargado como script clasico (no ES Module), en el mismo scope global
// compartido que el script principal, donde se declaran `let answerStreak`
// y `let store`.

function pushCapped(array, item, maxLen) {
  array.unshift(item);
  if (array.length > maxLen) array.pop();
}

function resetStreak() {
  answerStreak = 0;
  store.currentStreak = 0;
}

// Fase 4D — grantXp() y recordWrongAnswer(q): los 2 unicos bloques
// duplicados, caracter a caracter, dentro de checkAnswer() (29 escrituras
// en total en esa funcion, ver Fase 4A). NO se tocan checkLucidezAnswer,
// checkMentalCalcAnswer ni ninguna otra funcion hermana con el mismo
// patron de XP/fallo -- ese alcance quedo explicitamente descartado en el
// analisis. Ver CHANGELOG_FASE4D.md.
//
// grantXp: replica exacta de las 2 apariciones dentro de checkAnswer
// (idénticas caracter a caracter). No toca currentGame.answered ni nada
// mas alla de xp/sessionXpGained.
function grantXp() {
  if (getLevelData(store.xp) < 30) { store.xp += 10; currentGame.sessionXpGained = (currentGame.sessionXpGained || 0) + 10; }
}

// recordWrongAnswer(q): replica funcional de las 2 apariciones dentro de
// checkAnswer (formato ligeramente distinto entre ellas -- una ya envuelta
// en `if (!isDuelGame) { ... }`, la otra igual -- mismo comportamiento).
// La guarda de Duelo, que en el original era `if (!isDuelGame) { ... }`
// alrededor del bloque, se reescribe aqui como early return equivalente.
// No toca currentGame.
function recordWrongAnswer(q) {
  if (currentGame.isDuel) return;
  store.totalWrong++;
  store.questionStreaks[q.n] = 0;
  if (!store.failedQuestions.includes(q.n)) store.failedQuestions.push(q.n);
}

// Fase 4F — markQuestionSeen(q): el unico bloque duplicado, byte a byte,
// encontrado en el analisis estructural de la 4F (4 apariciones / 3
// funciones: renderLucidezQuestion Fase I y Fase III,
// renderLucidezPhase2Question, renderQuestion). Mismo array
// (store.seenQuestionIds) y misma clave (q.n) en los 4 sitios, sin ninguna
// rama por modo/Duelo -- a diferencia de recordWrongAnswer, aqui no hay
// ambiguedad de claves. Ver CHANGELOG_FASE4F.md.
//
// La guarda `q && q.n != null` que envolvia el bloque en los 4 sitios se
// incorpora aqui como early return equivalente: si la condicion original
// era falsa, el bloque no se ejecutaba: con early return, la funcion
// simplemente no hace nada -- mismo resultado observable. No toca
// currentGame, no llama a saveStore().
function markQuestionSeen(q) {
  if (!q || q.n == null) return;
  if (!Array.isArray(store.seenQuestionIds)) store.seenQuestionIds = [];
  if (!store.seenQuestionIds.includes(q.n)) store.seenQuestionIds.push(q.n);
}

// Fase 4G — recordQuestionStat(key, correct): el bloque de 3-4 lineas de
// store.questionStats, duplicado (misma logica, distinta clave) en 3
// sitios: checkAnswer (clave q.n), checkLucidezAnswer y
// checkLucidezPhase2QuestionAnswer (clave statKey = 'L'+q.n). A
// diferencia de recordWrongAnswer (Fase 4D/4E, clave fija a q.n, no
// reutilizable en Lucidez sin cambiar su contrato), aqui la clave se
// recibe como parametro desde el principio -- evita ese mismo error de
// diseño. Ver CHANGELOG_FASE4G.md.
//
// No toca currentGame, no llama a saveStore(), no altera el orden de los
// efectos circundantes. Preserva la semantica exacta de los 3 sitios,
// incluidos los casos limite de clave 0 o cadena vacia: ninguno de los 3
// originales comprobaba la clave de ningun modo especial (a diferencia de
// markQuestionSeen, que sí validaba q.n != null) -- por eso este helper
// tampoco añade ninguna validacion de la clave.
function recordQuestionStat(key, correct) {
  if (!store.questionStats) store.questionStats = {};
  if (!store.questionStats[key]) store.questionStats[key] = { correct: 0, wrong: 0 };
  if (correct) store.questionStats[key].correct++; else store.questionStats[key].wrong++;
}
