// SirEdwards Quiz — Frases de Sir Edwards según el estado de los Encargos (2.2). Script clásico (scope global).
//
// Varias por estado (mínimo cinco): encargos_N = N de los 4 encargos de la rotación ACTUAL cobrados (3 semanales + el Gran Encargo).
// Se eligen con pickRotatingPhrase('encargos_N', lista): rotan sin repetirse hasta agotarlas todas y vuelven a empezar.
const ENCARGOS_PHRASES = {
  encargos_0: [
    '¿Aún no has empezado? Qué conmovedora confianza en el futuro.',
    'Cero encargos. Al menos eres constante en algo.',
    'Veo que has decidido contemplar los encargos antes de afrontarlos.',
    'Todavía ninguno. No quisiera presionarte, pero la semana sí lo hará.',
    'Cuatro encargos te esperan. Naturalmente, tú también puedes esperar.',
    'La semana avanza. Tus encargos, aparentemente, no.',
    'Los encargos siguen ahí. Son pacientes. Yo no tanto.',
    'Cero de cuatro. Una cifra pequeña, pero muy expresiva.'
  ],

  encargos_1: [
    'Uno de cuatro. Extraordinario. La civilización avanza lentamente.',
    'Un encargo saldado. Procura no agotarte con semejante hazaña.',
    'Ya llevas uno. Admito que empezaba a perder la fe.',
    'Uno menos. A este ritmo, quizá llegues a terminar la semana.',
    'Un encargo hecho. Qué agradable verte cooperar por una vez.',
    'Uno hecho. Ya podemos hablar de progreso sin sonrojarnos demasiado.',
    'Un encargo menos. Tu expediente empieza a mostrar signos de vida.',
    'Has cumplido una obligación. Procura no convertirlo en un acontecimiento.',
    'Uno saldado. Empiezo a retirar lentamente mis dudas.'
  ],

  encargos_2: [
    'Dos de cuatro. Ya casi pareces una persona responsable.',
    'La mitad está hecha. Intenta no confundirlo con una victoria.',
    'Dos encargos saldados. Empiezo a sospechar que puedes hacerlo.',
    'Vas por la mitad. No te emociones, todavía queda trabajo.',
    'Dos de cuatro. Incluso tú deberías reconocer el progreso.',
    'Dos de cuatro. La mitad ya no admite demasiadas excusas.',
    'La semana está a medio resolver. Igual que tu expediente.',
    'Dos menos. Debo admitir que la situación mejora.'
  ],

  encargos_3: [
    'Tres de cuatro. Sería una lástima estropearlo ahora.',
    'Solo queda uno. Hasta tú puedes completar una última tarea.',
    'Tres saldados. Admito que esto empieza a resultar incómodamente competente.',
    'Falta uno. Haz el favor de no convertir la recta final en tragedia.',
    'Tres de cuatro. Ya puedes oler la aprobación. No te acostumbres.',
    'Tres. Solo queda una oportunidad de arruinar una buena impresión.',
    'Tres de cuatro. Ahora sería casi elegante terminarlo.',
    'Tres cumplidos. Estoy peligrosamente cerca de felicitarte.'
  ],

  encargos_4: [
    'Los cuatro. Magnífico. Por fin puedo fingir que estaba orgulloso de ti.',
    'Semana saldada. No ha sido brillante, pero ha sido suficiente.',
    'Los cuatro completados. Anótalo: hoy has cumplido con tus obligaciones.',
    'Todo hecho. Debo reconocerlo: has sido sorprendentemente útil.',
    'Cuatro de cuatro. Excelente. Ahora intenta no esperar un aplauso.',
    'Cuatro de cuatro. Bien. Ya puedo cerrar el expediente.',
    'Encargos completados. Por una vez, no queda nada que reclamarte.'
  ]
};
