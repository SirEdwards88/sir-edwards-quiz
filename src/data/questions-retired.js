// Preguntas RETIRADAS del banco jugable en la 2.2 (sustituidas por versiones mejoradas).
// Siguen siendo resolvibles por ID para que los Duelos y Retos creados antes de la 2.2 (plazo de 3 días)
// puedan terminarse, pero NO entran en ninguna cola nueva ni cuentan en los porcentajes.
// Sustituciones: 90 → 383 (canal de Suez), 91 → 381 (Kazajistán), 197 → 414 (Tolstói).
// Los IDs no se reutilizan nunca. El backend tiene copia generada (scripts/gen-questions.mjs y gen-lucidez.mjs).

const RETIRED_TEST_QUESTIONS = [
  {"n": 90, "q": "¿Qué canal artificial conecta el mar Mediterráneo con el mar Rojo?", "options": ["El canal de Panamá", "El canal de Kiel", "El canal de Corinto", "El canal de Suez"], "a": "El canal de Suez", "cat": "geografia", "dif": "medio", "sabias": "Se inauguró en 1869 y evitó que los barcos entre Europa y Asia tuvieran que rodear África por el cabo de Buena Esperanza."},
  {"n": 91, "q": "¿Cuál es el país sin litoral más grande del mundo por superficie?", "options": ["Kazajistán", "Mongolia", "Chad", "Níger"], "a": "Kazajistán", "cat": "geografia", "dif": "medio"},
  {"n": 197, "q": "¿Qué escritor ruso escribió Guerra y paz?", "options": ["Fiódor Dostoyevski", "Antón Chéjov", "Iván Turguénev", "León Tolstói"], "a": "León Tolstói", "cat": "arte_literatura", "dif": "medio"}
];

const RETIRED_QUESTIONS = [
  {"n": 90, "q": "¿Qué canal artificial conecta el mar Mediterráneo con el mar Rojo?", "a": "El canal de Suez", "cat": "geografia", "dif": "medio", "sabias": "Se inauguró en 1869 y evitó que los barcos entre Europa y Asia tuvieran que rodear África por el cabo de Buena Esperanza."},
  {"n": 91, "q": "¿Cuál es el país sin litoral más grande del mundo por superficie?", "a": "Kazajistán", "cat": "geografia", "dif": "medio"},
  {"n": 197, "q": "¿Qué escritor ruso escribió Guerra y paz?", "a": "León Tolstói", "cat": "arte_literatura", "dif": "medio"}
];
