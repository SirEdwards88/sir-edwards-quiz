// SirEdwards Quiz — frases de Sir Edwards según la SERIE entre dos jugadores (cara a cara en duelos 1 contra 1 y Retos).
// Solo texto; la lógica que decide cuándo toca cada bolsa está en src/utils/rivalry.js. {rival} es el nombre del rival.
// Varias frases por situación (nunca una sola: se rotan sin repetir hasta agotar la bolsa).
(function () {
  'use strict';

  var PHRASES = {
    // Ganas tras 2 o más derrotas seguidas contra él.
    win_remontada: [
      'Por fin. {rival} ya se estaba acostumbrando a ganarte.',
      'Primera victoria tras una racha negra frente a {rival}. La dignidad vuelve del exilio.',
      'Ha costado, pero {rival} ya no puede decir que contigo es coser y cantar.',
      '{rival} se había hecho a la idea de que perdías siempre. Detalle corregido.',
      'Se acabó la sequía contra {rival}. Celébralo con la discreción que te queda.',
      'Después de varias derrotas, una victoria. En contabilidad se llama ajuste.'
    ],
    // Ganas con 3 o más victorias seguidas contra él.
    win_racha: [
      'Otra victoria sobre {rival}. Esto ya no es un duelo, es una costumbre.',
      '{rival} sigue sin encontrar la manera de ganarte. Empiezo a compadecerlo.',
      'Racha contra {rival}. Le quedan pocas excusas y ninguna buena.',
      'Ya van varias seguidas a {rival}. Que pida la revancha o que cambie de pasatiempo.',
      '{rival} vuelve a caer. A estas alturas, el resultado es más tradición que noticia.',
      'Otra vez por delante de {rival}. Su paciencia merece una medalla; la tuya, de momento, no.'
    ],
    // Ganas justo después de haber perdido el duelo anterior contra él.
    win_revancha: [
      'Revancha cobrada. {rival} disfrutó de su victoria exactamente una partida.',
      'La derrota anterior queda saldada. Con intereses, cortesía de la casa.',
      '{rival} ganó el último duelo, pero este es tuyo. Cuentas en paz, por ahora.',
      'Cuentas saldadas con {rival}. Hasta que alguien vuelva a confiarse.',
      'Aquella derrota ante {rival} ya es historia. Esta victoria, también, y es tuya.'
    ],
    // Ganas y la serie queda igualada (con al menos 4 duelos jugados).
    win_igualados: [
      'Contra {rival} vais igualados. Es otra forma de decir que ninguno ha demostrado nada.',
      'Serie igualada con {rival}. La rivalidad empieza a ser interesante, para mi desgracia.',
      'Entre {rival} y tú, todo igual. Ahora a ver quién se pone nervioso primero.',
      'El historial contra {rival} está en tablas. Alguien tendrá que hacer algo al respecto.',
      'Igualados con {rival} en el cómputo total. Qué considerado por vuestra parte.'
    ],
    // Pierdes con 3 o más derrotas seguidas contra él.
    loss_racha: [
      '{rival} te gana otra vez. A estas alturas ya no es mala suerte, es una relación.',
      'Varias derrotas seguidas contra {rival}. Empiezo a pensar que te tiene aprendido.',
      '{rival} suma otra. Tu historial contra él ya se lee como un parte médico.',
      'Racha adversa frente a {rival}. Quizá convenga cambiar de táctica. O de rival.',
      'Otra derrota ante {rival}. Persistir es admirable; con resultados, ya sería un lujo.',
      '{rival} te gana con una comodidad que da pena ajena. La tuya.'
    ],
    // Pierdes tras llevar 2 o más victorias seguidas contra él.
    loss_cae_racha: [
      'Se acabó la racha contra {rival}. Duró lo que duran estas cosas.',
      '{rival} corta tus victorias seguidas. La suerte no es eterna, y tú tampoco.',
      'Tu racha frente a {rival} ha terminado. Fue bonito mientras la ignoraba.',
      '{rival} te corta la racha. Presume de las anteriores; esta la guardaré discretamente.',
      'Fin de la racha sobre {rival}. Que sirva de aviso para tu orgullo.'
    ],
    // Pierdes y la serie queda igualada (con al menos 4 duelos jugados).
    loss_igualados: [
      '{rival} empata la serie contigo. Era evidente que alguien tenía que arruinar la ventaja.',
      'Serie en tablas con {rival}. La ventaja era bonita mientras duró.',
      'Tras esta derrota, tú y {rival} estáis igualados. Aprovecha la humildad.',
      'La serie contra {rival} vuelve a estar igualada. Un empate que, para ti, sabe a derrota.',
      'Igualados otra vez con {rival}. Lo que se gana a plazos, se pierde de golpe.'
    ]
  };

  window.SEQRivalryPhrases = { PHRASES: PHRASES };
})();
