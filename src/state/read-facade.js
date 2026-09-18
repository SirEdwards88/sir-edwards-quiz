// Fase 4B — Fachada de Estado de Solo Lectura.
//
// Dos funciones, nada mas. Cada una resuelve el identificador (`store` /
// `currentGame`) en el momento en que se LLAMA, no en el momento en que
// este fichero se carga -- por eso son funciones y no un objeto con la
// referencia copiada de antemano. Ver CHANGELOG_FASE4B.md para la
// justificacion completa y el riesgo que esto evita.
//
// Cargado como script clasico (no ES Module), en el mismo scope global
// compartido que el script principal donde se declaran `let store` y
// `let currentGame`. No copia, no transforma, no cachea, no congela.

function getStore() {
  return store;
}

function getCurrentGame() {
  return currentGame;
}
