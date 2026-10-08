// SirEdwards Quiz — Frases de Sir Edwards según el estado de los Encargos (2.2). Script clásico (scope global).
//
// Varias por estado (mínimo cinco): encargos_N = N de los 4 encargos de la rotación ACTUAL cobrados (3 semanales + el Gran Encargo).
// Se eligen con pickRotatingPhrase('encargos_N', lista): rotan sin repetirse hasta agotarlas todas y vuelven a empezar.
const ENCARGOS_PHRASES = {
  encargos_0: [
    '¿Aún no has empezado? Qué conmovedora confianza en el futuro.',
    'Cero encargos. Al menos eres constante en algo.',
    'Veo que has optado por contemplar los encargos antes de afrontarlos.',
    'Todavía ninguno. No quisiera presionarte, pero la semana sí lo hará.',
    'Cuatro encargos te esperan. Tú, mientras tanto, esperas que se hagan solos.',
    'La semana avanza. Tus encargos, aparentemente, no.',
    'Los encargos siguen ahí. Son pacientes. Yo no tanto.',
    'Cero de cuatro. Una cifra pequeña, pero muy expresiva.',
    'Ni uno todavía. La semana es larga; mi memoria, más.',
    'Cero encargos. Si esto es una estrategia, es muy discreta.'
  ],

  encargos_1: [
    'Uno de cuatro. Extraordinario. La civilización avanza lentamente.',
    'Un encargo saldado. Procura no agotarte con semejante hazaña.',
    'Ya llevas uno. Empezaba a preguntarme si llegarías a hacerlo.',
    'Uno menos. A este ritmo, quizá llegues a terminar la semana.',
    'Un encargo hecho. Qué agradable verte cooperar por una vez.',
    'Uno hecho. Ya podemos hablar de progreso sin sonrojarnos demasiado.',
    'Un encargo menos. La lista empieza a mostrar signos de vida.',
    'Has cumplido una obligación. Procura no convertirlo en un acontecimiento.',
    'Uno saldado. Retiro, con lentitud, una de mis muchas dudas.',
    'Un encargo menos y tres por convencerte. Vamos bien.'
  ],

  encargos_2: [
    'Dos de cuatro. Empiezas a parecer razonablemente constante.',
    'La mitad está hecha. Intenta no confundirlo con una victoria.',
    'Dos encargos saldados. Voy a tener que tratarte con cierto respeto. Provisional.',
    'Vas por la mitad. La otra mitad separa a quien persevera de quien solo promete.',
    'Dos de cuatro. Incluso tú deberías reconocer el progreso.',
    'Dos de cuatro. A partir de aquí, las excusas pagan recargo.',
    'Dos menos. Debo admitir que la situación mejora.',
    'Mitad y mitad. Como todo lo tuyo, perfectamente equilibrado.',
    'Dos de cuatro. Ni te felicito ni te regaño: te observo.'
  ],

  encargos_3: [
    'Tres de cuatro. Sería una lástima estropearlo ahora.',
    'Solo queda uno. Una última tarea y el expediente respira.',
    'Tres saldados. Esto empieza a resultar incómodamente competente.',
    'Falta uno. Haz el favor de no convertir la recta final en tragedia.',
    'Tres de cuatro. Ya huele a aprobación. Procura que no sea un espejismo.',
    'Tres. Solo queda una oportunidad de arruinar una buena impresión.',
    'Tres de cuatro. Ahora sería elegante terminarlo.',
    'Tres saldados. Empiezo a tener motivos para dar la semana por buena.',
    'Tres de cuatro. Pena que siempre quede uno que se hace el difícil.',
    'Falta uno. Lo dejo a tu criterio, que es una forma de decir a tu riesgo.'
  ],

  encargos_4: [
    'Los cuatro. Magnífico. Por fin puedo fingir que estaba orgulloso de ti.',
    'Semana saldada. Suficiente, que en este expediente ya es mucho decir.',
    'Los cuatro completados. Anótalo: esta semana has cumplido con tus obligaciones.',
    'Todo hecho. Debo reconocerlo: has sido sorprendentemente útil.',
    'Cuatro de cuatro. Excelente. Ahora intenta no esperar un aplauso.',
    'Encargos completados. Hoy no queda nada que reclamarte.',
    'Cuatro de cuatro. Mi opinión sobre ti acaba de subir un peldaño. Uno.',
    'Todo saldado. Disfruta del descanso: dura hasta el lunes.'
  ]
};
