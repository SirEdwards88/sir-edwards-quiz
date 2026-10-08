// 2.2 — Frases con nombre del jugador ({nombre}). Pocas y a propósito: viven en bolsas APARTE de las normales
// (las normales no se tocan) y solo salen con la probabilidad y los topes de src/utils/named-phrases.js.
// Reglas de redacción: neutras en género (un nombre no lo determina), nada que critique al jugador (solo el resultado),
// el nombre va como pausa tras la primera idea corta o al arrancar; nunca al final, que suena a regañina.
// Las claves son las de pickRotatingPhrase()/SEQSirEvents (poolKey). Las de eventos van entre «».
const NAMED_PHRASES = {
  end_perfecto: [
    '20 de 20, {nombre}. Me has dejado sin argumentos y detesto esa sensación.',
    'Impecable, {nombre}. Guardaré este momento para cuando vuelvas a ser tú.',
    'Pleno. Enhorabuena, {nombre}. Algo tan limpio casi parece trabajo honrado.',
    'Perfecto, {nombre}. Debo reconocerlo: has sido irritantemente competente.'
  ],
  survival_win: [
    'Cuarenta preguntas. Has sobrevivido, {nombre}. Habrá que revisar tu utilidad al alza. Ligeramente.',
    'Has llegado al final, {nombre}. Qué inesperada demostración de resistencia intelectual.',
    'Victoria, {nombre}. Después de todo, quizá no seas completamente inútil.'
  ],
  sudden_win: [
    'Has completado el modo extremo, {nombre}. Añádelo al currículum: nadie te lo preguntará, pero constará.',
    'Sin red y sin tropiezos, {nombre}. Me veo obligado a tomarte en serio. Brevemente.'
  ],
  lucidez_perfecto: [
    '30/30, {nombre}. Ninguna duda, ningún tropiezo y, por desgracia, ningún pretexto para criticarte.',
    '30/30, {nombre}. La mente ha hablado. Y esta vez tenía razón.',
    'Perfecto, {nombre}. Empiezo a echar de menos tus errores.'
  ],
  encargos_4: [
    'Los cuatro, {nombre}. Por fin puedo fingir que estaba orgulloso de ti.',
    'Semana saldada, {nombre}. Suficiente, que en tu caso ya es mucho decir.',
    'Cuatro de cuatro, {nombre}. Mi opinión sobre ti acaba de subir un peldaño. Uno.'
  ],
  comeback: [
    '«Vaya, {nombre}. Había empezado a archivar tu expediente.»',
    '«{nombre}. Ha pasado tiempo. No preguntaré dónde estabas. Lo adivino.»',
    '«Así que sigues por aquí, {nombre}. Qué detalle avisar.»'
  ],
  day: [
    '«Buenos días, {nombre}. Veamos qué estás tramando.»',
    '«Madrugando, {nombre}. Inquietante, pero encomiable.»',
    '«Una mañana prometedora, {nombre}. Procura no estropearla.»'
  ],
  streak_30: [
    '«Treinta, {nombre}. Empiezo a sospechar que sabes lo que haces.»',
    '«Treinta seguidas, {nombre}. Me incomoda decirlo, pero estoy impresionado.»'
  ]
};

// Cuándo puede salir cada bolsa: p = probabilidad cuando toca; cap = tope adicional ('semana' | 'dia').
// Además, siempre: como mucho UNA frase con nombre por sesión (por carga de la página).
const NAMED_RULES = {
  end_perfecto:     { p: 1 / 3 },
  survival_win:     { p: 1 / 3 },
  sudden_win:       { p: 1 / 3 },
  lucidez_perfecto: { p: 1 / 2 },
  encargos_4:       { p: 1 / 2, cap: 'semana' },
  comeback:         { p: 1 / 2 },
  day:              { p: 1 / 3, cap: 'dia' },
  streak_30:        { p: 1 / 2 }
};
