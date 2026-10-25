// SirEdwards Quiz — frases de Sir Edwards según la SERIE entre dos jugadores (cara a cara en duelos 1 contra 1 y Retos).
// Solo texto; la lógica que decide cuándo toca cada bolsa está en src/utils/rivalry.js. {rival} es el nombre del rival.
// Varias frases por situación (nunca una sola: se rotan sin repetir hasta agotar la bolsa).
(function () {
  'use strict';

  var PHRASES = {
    // Ganas tras 2 o más derrotas seguidas contra él.
    win_remontada: [
      'Por fin. {rival} ya se estaba acostumbrando a ganarte.',
      '{rival} te tenía en el bolsillo. Hoy el bolsillo tenía un agujero.',
      'Ha costado, pero {rival} ya no puede decir que contigo es coser y cantar.',
      '{rival} ya daba por hecho que perdías. Detalle corregido.',
      'Contra {rival} el viento por fin sopla a tu favor. Sujétate el sombrero.',
      'Tras las últimas derrotas, una victoria. En contabilidad se llama ajuste.'
    ],
    // Ganas con 3 o más victorias seguidas contra él.
    win_racha: [
      'Esto contra {rival} ya no es un duelo, es una costumbre.',
      '{rival} sigue sin encontrar la manera de ganarte. Mi más sentido pésame.',
      'Contra {rival} ya no compites, ejerces. Es casi una profesión.',
      'Si {rival} busca la receta para ganarte, que no la pida aquí.',
      'Una más al marcador. {rival} no debería tomárselo a mal: es estadística.',
      '{rival} merece una medalla por su paciencia. Tú, de momento, solo un aplauso discreto.'
    ],
    // Ganas justo después de haber perdido el duelo anterior contra él (de los últimos 7 días).
    win_revancha: [
      'Revancha cobrada. {rival} disfrutó de su victoria exactamente un duelo.',
      'El orgullo herido es un gran entrenador. {rival} acaba de comprobarlo.',
      '{rival} ganó el último duelo, pero este es tuyo. Cuentas en paz, por ahora.',
      'Un tropiezo con {rival} y a la siguiente, corregido. Se llama aprender.',
      'La derrota ante {rival} ya es historia. Archívala entre las anécdotas.',
      '{rival} apenas tuvo tiempo de presumir. Qué eficiencia la tuya.'
    ],
    // Ganas y la serie queda igualada (con al menos 4 duelos jugados).
    win_igualados: [
      'Con {rival} la balanza está en el centro. El siguiente duelo pesa más de lo que parece.',
      'Serie igualada con {rival}. Por fin esto tiene argumento.',
      'Entre {rival} y tú, empate a victorias. A ver quién se pone nervioso primero.',
      'El historial contra {rival} está en tablas. Alguien tendrá que hacer algo al respecto.',
      'Cómputo total con {rival}: empate. Qué considerado por vuestra parte.',
      '{rival} y tú, mano a mano. Alguien debería ir preparando el discurso de victoria.'
    ],
    // Pierdes con 3 o más derrotas seguidas contra él.
    loss_racha: [
      '{rival} te dedica otra victoria. Qué detalle por su parte.',
      'Varias derrotas seguidas contra {rival}. Empiezo a pensar que te tiene calado.',
      '{rival} suma otra. Tu historial ya se lee como una tragedia en varios actos.',
      'Racha adversa frente a {rival}. Quizá convenga cambiar de táctica. O de rival.',
      'A {rival} le salen las cosas y a ti, de momento, solo las excusas.',
      'Ganarte se le ha vuelto a {rival} un acto reflejo.'
    ],
    // Pierdes tras llevar 2 o más victorias seguidas contra él.
    loss_cae_racha: [
      'Se acabó la racha contra {rival}. Duró lo que duran estas cosas.',
      'Las rachas, como los helados, se derriten. La tuya con {rival} acaba de hacerlo.',
      'Tu racha frente a {rival} ha terminado. Guarda los discursos de victoria.',
      '{rival} te corta la racha. Presume de las anteriores; esta me la callo.',
      'Fin de la racha sobre {rival}. Que sirva de aviso para tu orgullo.',
      'La racha contra {rival} ha pasado a mejor vida. Un minuto de silencio.'
    ],
    // Pierdes y la serie queda igualada (con al menos 4 duelos jugados).
    loss_igualados: [
      '{rival} empata la serie contigo. Era evidente que alguien tenía que arruinar la ventaja.',
      'Serie en tablas con {rival}. La ventaja era bonita mientras duró.',
      'Con {rival} se acabaron los privilegios. El equilibrio es una cosa muy incómoda.',
      'La serie contra {rival} queda igualada. Un empate que, para ti, sabe a derrota.',
      'Igualados con {rival}. Lo que se gana a plazos, se pierde de golpe.',
      'Con {rival} estáis a la par. La ventaja era un préstamo, y toca devolverlo.'
    ]
  };

  window.SEQRivalryPhrases = { PHRASES: PHRASES };
})();
