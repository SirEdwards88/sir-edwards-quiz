// SirEdwards Quiz 2.5 — Preguntas de Sir Edwards: interrupciones ocasionales entre pregunta y pregunta.
// NO son parte del banco (questions.js): no cuentan en precisión, rachas, XP, vidas ni logros de aciertos, y el Worker no las conoce.
// Solo alimentan dos contadores propios (sirAnswered, sirCorrect) para sus dos logros.
//
// Dos clases:
//  · kind 'trap'    → tienen una opción correcta (`correct` = índice en `options`). `right` / `wrong` es su reacción.
//  · kind 'opinion' → no hay respuesta mala: `reactions[i]` es su pulla a `options[i]`.
// Voz de Sir Edwards: elegante y sarcástico, de «tú», frases cortas (caben en pantalla de móvil).
// Cada `id` es único y estable (la bolsa de repetición se guarda por id): no renumerar al retirar una.
const SIR_QUESTIONS = [
  { id: 'sq01', kind: 'trap', q: '¿Cuántos meses tienen 28 días?', options: ['Solo febrero', 'Doce', 'Ninguno', 'Cuatro'], correct: 1,
    right: 'Doce. Todos tienen al menos 28. Qué atención.', wrong: 'Doce: todos. Febrero se lleva la fama, nada más.' },
  { id: 'sq02', kind: 'trap', q: 'Un avión se estrella en la frontera entre España y Francia. ¿Dónde entierran a los supervivientes?', options: ['En España', 'En Francia', 'En la frontera', 'En ninguna parte'], correct: 3,
    right: 'A los vivos no se les entierra. Un detalle.', wrong: 'Siguen vivos: por eso son supervivientes. Despacio.' },
  { id: 'sq03', kind: 'trap', q: '¿Cuántos animales de cada especie metió Moisés en el arca?', options: ['Dos', 'Siete', 'Ninguno', 'Uno'], correct: 2,
    right: 'Ninguno. Fue Noé. Bien visto.', wrong: 'Fue Noé, no Moisés. Moisés andaba con el mar.' },
  { id: 'sq06', kind: 'trap', q: '¿Cuántas veces puedes restar 10 de 100?', options: ['Diez', 'Una', 'Ninguna', 'Las que quieras'], correct: 1,
    right: 'Una. Después ya no es 100. Impecable.', wrong: 'Una sola vez. Luego ya no tienes 100. Elemental.' },
  { id: 'sq07', kind: 'trap', q: 'Un gallo pone un huevo en lo alto de un tejado. ¿Hacia qué lado cae?', options: ['A la izquierda', 'A la derecha', 'Los gallos no ponen huevos', 'Rueda hasta el suelo'], correct: 2,
    right: 'Los gallos no ponen huevos. Biología básica.', wrong: 'Los gallos no ponen huevos. Sí, es tan simple.' },
  { id: 'sq10', kind: 'trap', q: '¿Cuántas letras tiene «el alfabeto»?', options: ['27', '10', '8', '12'], correct: 1,
    right: 'Diez. Esquivaste la trampa. Anotado.', wrong: 'Cuéntalas: «el alfabeto» son diez. No las 27 que esperabas.' },

  { id: 'sq21', kind: 'trap', q: '¿Cuántos huevos puedes comerte en ayunas?', options: ['Uno', 'Dos', 'Tres', 'Los que quieras'], correct: 0,
    right: 'Uno. Después ya no estás en ayunas. Qué rigor.', wrong: 'Uno: tras el primero ya no estás en ayunas. Los detalles.' },
  { id: 'sq22', kind: 'trap', q: 'La madre de Juan tiene tres hijos: Pedro, Pablo y… ¿cómo se llama el tercero?', options: ['Santiago', 'Mateo', 'Juan', 'No se sabe'], correct: 2,
    right: 'Juan. Estaba en el enunciado. Bien leído.', wrong: 'Juan. La madre de Juan, ¿recuerdas? Despacio.' },
  { id: 'sq23', kind: 'trap', q: 'Un tren eléctrico va hacia el norte. ¿Hacia dónde sopla su humo?', options: ['Al norte', 'Al sur', 'Al este', 'No echa humo'], correct: 3,
    right: 'Es eléctrico: no echa humo. Qué atención.', wrong: 'Es eléctrico: no echa humo. Había que fijarse.' },
  { id: 'sq24', kind: 'trap', q: 'Conduces un autobús con 20 pasajeros; bajan 5 y suben 3. ¿Cómo se llama el conductor?', options: ['Pedro', 'Sir Edwards', 'Como tú', 'Se ignora'], correct: 2,
    right: 'Como tú. Eres el conductor. Impecable.', wrong: 'Conduces tú. Se llama como tú. Fíjate.' },
  { id: 'sq25', kind: 'trap', q: '¿Qué palabra se escribe «mal» en todos los diccionarios?', options: ['Mal', 'Equivocación', 'Ortografía', 'Ninguna'], correct: 0,
    right: 'Mal. Literalmente. Bien jugado.', wrong: 'Mal: así se escribe, «mal». Ya está.' },
  { id: 'sq26', kind: 'trap', q: 'Un caracol sube 3 m de día y resbala 2 de noche en un pozo de 10 m. ¿Cuántos días tarda en salir?', options: ['Siete', 'Ocho', 'Diez', 'Cinco'], correct: 1,
    right: 'Ocho. Al octavo día sale sin resbalar. Cuenta hecha.', wrong: 'Ocho: el último día sale y ya no resbala. Haz la cuenta.' },

  { id: 'sq14', kind: 'opinion', q: '¿Te lo estás pasando bien?', options: ['Muchísimo', 'Más o menos', 'Es una tortura'],
    reactions: ['Lo sé. Mis preguntas son una delicia.', 'Anotado. Con tinta roja.', 'Música para mis oídos.'] },
  { id: 'sq15', kind: 'opinion', q: '¿Cuántas preguntas has fallado hoy?', options: ['Ninguna', 'Alguna', 'Prefiero no saberlo'],
    reactions: ['Mientes. Con elegancia, pero mientes.', '«Alguna». Qué optimismo.', 'Sabia decisión.'] },
  { id: 'sq16', kind: 'opinion', q: '¿Qué prefieres de mí: un halago falso o una verdad incómoda?', options: ['El halago', 'La verdad'],
    reactions: ['Lo pensaré. Y no.', 'Por fin, alguien con criterio.'] },
  { id: 'sq17', kind: 'opinion', q: 'Si fueras un sombrero, ¿cuál serías?', options: ['Una chistera', 'Una gorra', 'Un gorro de lana'],
    reactions: ['Pretencioso. Me gusta.', 'Comprensible. Imperdonable.', 'Lo tuyo es la comodidad.'] },
  { id: 'sq18', kind: 'opinion', q: '¿Has hecho trampas con el buscador?', options: ['Jamás', 'Una vez', 'Cada día'],
    reactions: ['Mientes, pero lo respeto.', '«Una vez». Claro.', 'Al menos eres sincero.'] },
  { id: 'sq20', kind: 'opinion', q: '¿A qué hora piensas dejar de jugar?', options: ['Ahora mismo', 'Una partida más', 'Nunca'],
    reactions: ['Qué bonita mentira.', 'La frase de todos los derrotados.', 'Eso sí me gusta.'] },
  { id: 'sq27', kind: 'opinion', q: '¿Quién crees que sabe más, tú o yo?', options: ['Tú', 'Sir Edwards', 'Los dos, con matices'],
    reactions: ['Modestia falsa. Me gusta.', 'Por fin, humildad bien dirigida.', 'Matices. Siempre matices.'] },
  { id: 'sq28', kind: 'opinion', q: '¿Me echarías de menos si dejara de interrumpirte?', options: ['Muchísimo', 'Un poco', 'Ni lo notaría'],
    reactions: ['Lo sé. Es un don.', 'Un poco. Con eso me basta.', 'Qué cruel. Lo recordaré.'] }
];
