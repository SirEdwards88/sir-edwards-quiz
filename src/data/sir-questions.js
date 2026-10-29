// SirEdwards Quiz 2.5 — Preguntas de Sir Edwards: interrupciones ocasionales entre pregunta y pregunta.
// NO son parte del banco (questions.js): no cuentan en precisión, rachas, XP, vidas ni logros de aciertos, y el Worker no las conoce.
// Solo alimentan dos contadores propios (sirAnswered, sirCorrect) para sus dos logros.
//
// Dos clases:
//  · kind 'trap'    → se contestan ESCRITAS (mismo corrector que Lucidez Mental: matching.js + answer-alias.js, sin tildes ni
//                     mayúsculas). `a` es la respuesta, `alias` otras formas válidas, `rj` las respuestas-cebo que NO valen.
//                     `right` / `wrong` es su reacción.
//  · kind 'opinion' → no hay respuesta mala: `reactions[i]` es su pulla a `options[i]`.
// Voz de Sir Edwards: elegante y sarcástico, de «tú», frases cortas (caben en pantalla de móvil).
// Cada `id` es único y estable (la bolsa de repetición se guarda por id): no renumerar al retirar una.
const SIR_QUESTIONS = [
  { id: 'sq01', kind: 'trap', q: '¿Cuántos meses tienen 28 días?', a: 'Doce',
    alias: ['12', 'Todos', 'Los doce', 'Todos los meses', 'Los 12'],
    rj: ['Solo febrero', 'Febrero', 'Ninguno', 'Cuatro', 'Uno', '4'],
    right: 'Doce. Todos tienen al menos 28. Qué atención.', wrong: 'Doce: todos. Febrero se lleva la fama, nada más.' },
  { id: 'sq02', kind: 'trap', q: 'Un avión se estrella entre España y Francia. ¿Dónde entierran a los supervivientes?', a: 'En ninguna parte',
    alias: ['En ningún sitio', 'En ningún lado', 'Ninguna parte', 'En ninguna', 'No se entierran', 'No se entierra', 'No los entierran', 'Nadie los entierra', 'Nadie', 'Siguen vivos', 'Están vivos', 'A los vivos no se les entierra', 'No se entierra a los vivos'],
    rj: ['En España', 'En Francia', 'En la frontera', 'España', 'Francia', 'La frontera'],
    right: 'A los vivos no se les entierra. Un detalle.', wrong: 'Siguen vivos, por eso son supervivientes. Nadie los entierra.' },
  { id: 'sq03', kind: 'trap', q: '¿Cuántos animales de cada especie metió Moisés en el arca?', a: 'Ninguno',
    alias: ['Ninguna', 'Cero', '0', 'Ningún animal'],
    rj: ['Dos', 'Siete', 'Uno', '2', '7', '1', 'Noé', 'Fue Noé'],
    right: 'Ninguno. Fue Noé. Bien visto.', wrong: 'Fue Noé, no Moisés. Moisés andaba con el mar.' },
  { id: 'sq07', kind: 'trap', q: 'Un gallo pone un huevo en lo alto de un tejado. ¿Hacia qué lado cae?', a: 'Los gallos no ponen huevos',
    alias: ['No ponen huevos', 'Los gallos no ponen', 'Un gallo no pone huevos', 'Un gallo no puede poner huevos', 'No pone huevos', 'Los gallos no los ponen', 'Los ponen las gallinas', 'Las gallinas ponen huevos no los gallos', 'No cae', 'Ninguno', 'Es imposible'],
    rj: ['A la izquierda', 'A la derecha', 'Rueda hasta el suelo', 'Izquierda', 'Derecha'],
    right: 'Los gallos no ponen huevos. Biología básica.', wrong: 'Los gallos no ponen huevos. Sí, es tan simple.' },
  { id: 'sq10', kind: 'trap', q: '¿Cuántas letras tiene «el alfabeto»?', a: 'Diez',
    alias: ['10', '10 letras', 'Diez letras'],
    rj: ['27', '8', '12', 'Veintisiete', 'Ocho', 'Doce'],
    right: 'Diez. Esquivaste la trampa. Anotado.', wrong: 'Cuéntalas: «el alfabeto» son diez. No las 27 que esperabas.' },

  { id: 'sq21', kind: 'trap', q: '¿Cuántos huevos puedes comerte en ayunas?', a: 'Uno',
    alias: ['1', 'Un huevo', 'Solo uno', 'Uno solo', 'Solo un huevo', 'Solo 1'],
    rj: ['Dos', 'Tres', 'Los que quieras', '2', '3'],
    right: 'Uno. Después ya no estás en ayunas. Qué rigor.', wrong: 'Uno: tras el primero ya no estás en ayunas. Los detalles.' },
  { id: 'sq22', kind: 'trap', q: 'La madre de Juan tiene tres hijos: Pedro, Pablo y… ¿cómo se llama el tercero?', a: 'Juan',
    alias: ['Se llama Juan', 'Es Juan', 'El tercero es Juan', 'El tercero se llama Juan'],
    rj: ['Santiago', 'Mateo', 'No se sabe'],
    right: 'Juan. Estaba en el enunciado. Bien leído.', wrong: 'Juan. La madre de Juan, ¿recuerdas? Lo tenías delante.' },
  { id: 'sq23', kind: 'trap', q: 'Un tren eléctrico va hacia el norte. ¿Hacia dónde sopla su humo?', a: 'No echa humo',
    alias: ['No echa', 'No tiene humo', 'No hay humo', 'A ninguna parte', 'A ninguno', 'Hacia ninguna parte', 'No sopla', 'No suelta humo', 'No produce humo', 'No emite humo', 'No expulsa humo', 'No echan humo', 'Es eléctrico', 'Los eléctricos no echan humo', 'Los trenes eléctricos no echan humo', 'Ninguna', 'Humo no hay'],
    rj: ['Al norte', 'Al sur', 'Al este', 'Al oeste', 'Norte', 'Sur', 'Este', 'Oeste'],
    right: 'Es eléctrico: no echa humo. Ojo clínico.', wrong: 'Es eléctrico: no echa humo. Había que fijarse.' },
  { id: 'sq24', kind: 'trap', q: 'Conduces un autobús con 20 pasajeros; bajan 5 y suben 3. ¿Cómo se llama el conductor?', a: 'Como tú',
    alias: ['Como tu', 'Como yo', 'Yo', 'Tú', 'Se llama como tú', 'Se llama como yo', 'Me llamo como yo', 'Igual que tú', 'Soy yo', 'El conductor soy yo', 'Tu nombre', 'Mi nombre', 'Mi mismo nombre'],
    rj: ['Pedro', 'Sir Edwards', 'Se ignora', 'Se desconoce', 'No se sabe', 'Nadie lo sabe'],
    right: 'Como tú. Eres el conductor. Impecable.', wrong: 'Conduces tú, así que se llama como tú. Elemental.' },
  { id: 'sq25', kind: 'trap', q: '¿Qué palabra se escribe «mal» en todos los diccionarios?', a: 'Mal',
    alias: ['La palabra mal', 'Se escribe mal', 'Mal escrito', 'Mal escrita', '«mal»'],
    rj: ['Equivocación', 'Ortografía', 'Ninguna'],
    right: 'Mal. Literalmente. Bien jugado.', wrong: 'Mal: así se escribe, «mal». Ya está.' },
  { id: 'sq26', kind: 'trap', q: 'Un caracol sube 3 m de día y baja 2 de noche. ¿En cuántos días sale de un pozo de 10 m?', a: 'Ocho',
    alias: ['8', '8 días', 'Ocho días', 'En ocho días', 'En 8 días', 'Al octavo día'],
    rj: ['Siete', 'Diez', 'Cinco', '7', '10', '5'],
    right: 'Ocho. Al octavo día sale sin resbalar. Cuenta hecha.', wrong: 'Ocho: el último día sale y ya no resbala. Haz la cuenta.' },

  { id: 'sq29', kind: 'trap', q: '¿Qué hay en medio de Madrid?', a: 'La letra «d»',
    alias: ['La d', 'D', 'Una d', 'Una letra d', 'La letra D', 'Letra d', 'La d de Madrid', 'La letra d de Madrid'],
    rj: ['El Retiro', 'La Puerta del Sol', 'Un oso y un madroño', 'El oso y el madroño', 'Puerta del Sol', 'Retiro'],
    right: 'La «d»: Ma-d-rid. Qué agudeza.', wrong: 'La «d»: Ma-d-rid. Miraste el mapa en vez de la palabra.' },

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
    reactions: ['Modestia falsa. Muy elegante.', 'Por fin, humildad bien dirigida.', 'Matices. Siempre matices.'] },
  { id: 'sq28', kind: 'opinion', q: '¿Me echarías de menos si dejara de interrumpirte?', options: ['Muchísimo', 'Un poco', 'Ni lo notaría'],
    reactions: ['Lo sé. Es un don.', 'Un poco. Con eso me basta.', 'Qué cruel. Lo recordaré.'] }
];
