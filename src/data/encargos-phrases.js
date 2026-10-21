// SirEdwards Quiz — Frases de Sir Edwards según el estado de los Encargos (2.2). Script clásico (scope global).
//
// Varias por estado (mínimo cinco): encargos_N = N de los 4 encargos de la rotación ACTUAL cobrados (3 semanales + el Gran Encargo).
// Se eligen con pickRotatingPhrase('encargos_N', lista): rotan sin repetirse hasta agotarlas todas y vuelven a empezar.
const ENCARGOS_PHRASES = {
  encargos_0: [
    '¿Aún no has empezado? Qué conmovedora confianza en el futuro.',
    'Cero encargos. Al menos eres constante en algo.',
    'Los encargos no requieren contemplación. Aunque admito que es una forma cómoda de evitarlos.',
    'Todavía ninguno. No quisiera presionarte, pero la semana sí lo hará.',
    'Cuatro encargos te esperan. Tú, mientras tanto, esperas que se hagan solos.',
    'La semana avanza. Tus encargos, aparentemente, no.',
    'Cero de cuatro. Una cifra pequeña, pero muy expresiva.',
    'Ni uno todavía. No te preocupes: aún no he empezado a sacar conclusiones.',
    'Cero encargos. Una estrategia impecable para no correr el riesgo de terminarlos.',
    'Cuatro encargos pendientes. Tu cautela empieza a parecer una política de Estado.',
    'Si tu plan es ignorar los encargos hasta que se rindan, te informo: son bastante tercos.'
  ],

  encargos_1: [
    'Uno de cuatro. Extraordinario. La civilización avanza lentamente.',
    'Un encargo saldado. Procura no agotarte con semejante hazaña.',
    'Ya llevas uno. Retiro la hipótesis de que la lista fuera puramente decorativa.',
    'Uno menos. A este ritmo, quizá llegues a terminar la semana.',
    'Un encargo hecho. Qué agradable verte cooperar por una vez.',
    'Uno hecho. Ya podemos hablar de progreso sin sonrojarnos demasiado.',
    'Un encargo menos. La lista empieza a mostrar signos de vida.',
    'Has cumplido una obligación. Procura no convertirlo en un acontecimiento.',
    'Uno saldado. Mi confianza en ti sigue siendo una inversión de alto riesgo.',
    'Un encargo menos. Tres más, y no me hago ilusiones.'
  ],

  encargos_2: [
    'Dos de cuatro. Empiezas a parecer constante. Lo apunto a lápiz, por si acaso.',
    'La mitad está hecha. Intenta no confundirlo con una victoria.',
    'Dos encargos saldados. Voy a tener que tratarte con cierto respeto. Provisional.',
    'Vas por la mitad. El desenlace decidirá si debo felicitarte o archivar el caso.',
    'Dos de cuatro. No es motivo de celebración, pero tampoco de investigación.',
    'Dos de cuatro. A partir de aquí, las excusas pagan recargo.',
    'Dos menos. Admito que la situación mejora. No me hagas arrepentirme.',
    'Mitad cumplida. La otra mitad decidirá si esto era progreso o decoración.',
    'Dos de cuatro. Ni te felicito ni te regaño: te observo.'
  ],

  encargos_3: [
    'Tres de cuatro. Sería una lástima estropearlo ahora.',
    'Tres saldados. Esto empieza a resultar incómodamente competente.',
    'Tres de cuatro. Ya huele a aprobación. Procura que no sea un espejismo.',
    'Tres. Solo queda una oportunidad de arruinar una buena impresión.',
    'Tres de cuatro. Empezar es de entusiastas; terminar, de caballeros.',
    'Tres saldados. Casi doy la semana por buena. Casi.',
    'Tres de cuatro. Pena que siempre quede uno que se hace el difícil.',
    'Falta uno. Confío en tu criterio; así podré atribuirte el resultado.'
  ],

  encargos_4: [
    'Los cuatro. Magnífico. Por fin puedo fingir que estaba orgulloso de ti.',
    'Semana saldada. Por una vez, las cuentas cuadran sin intervención mía.',
    'Los cuatro completados. Un fenómeno raro; convendría disecarlo antes de que escape.',
    'Todo hecho. Debo reconocerlo: has sido sorprendentemente útil.',
    'Cuatro de cuatro. Excelente. Ahora intenta no esperar un aplauso.',
    'Encargos completados. Sin nada que reprocharte, me quedo sin oficio.',
    'Cuatro de cuatro. Mi opinión sobre ti acaba de subir un peldaño. Uno.',
    'Todo saldado. Disfruta del descanso: dura hasta el lunes.'
  ]
};
