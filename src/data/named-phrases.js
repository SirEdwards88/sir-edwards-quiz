// 2.2 — Frases con nombre del jugador ({nombre}). Pocas y a propósito: viven en bolsas APARTE de las normales
// (las normales no se tocan) y solo salen con la probabilidad y los topes de src/utils/named-phrases.js.
// Reglas de redacción: neutras en género (un nombre no lo determina), nada que critique al jugador (solo el resultado),
// el nombre va como pausa tras la primera idea corta o al arrancar; nunca al final, que suena a regañina.
// Las claves son las de pickRotatingPhrase()/SEQSirEvents (poolKey). Las de eventos van entre «».
const NAMED_PHRASES = {
  end_perfecto: [
    '20 de 20, {nombre}. Me has dejado sin argumentos y detesto esa sensación.',
    'Impecable, {nombre}. Qué inconveniente tener que darte la razón.',
    'Pleno. Enhorabuena, {nombre}. Cuesta encontrar algo que objetar.',
    'Perfecto, {nombre}. Debo reconocerlo: has sido irritantemente competente.'
  ],
  survival_win: [
    'Cuarenta preguntas, {nombre}. Has llegado al final y el expediente lo agradece.',
    'Has llegado al final, {nombre}. Admito que la resistencia ha sido notable.',
    'Victoria, {nombre}. Hoy el marcador me deja poco margen para discutir.'
  ],
  sudden_win: [
    'Modo extremo, {nombre}. Una sola oportunidad y ninguna necesidad de repetirla.',
    'Sin red y sin tropiezos, {nombre}. Me veo obligado a tomarte en serio. Brevemente.'
  ],
  lucidez_perfecto: [
    '30/30, {nombre}. Hoy la mente no ha dejado ni una rendija.',
    '30/30, {nombre}. Tendré que concederte una victoria sin matices.',
    'Perfecto, {nombre}. Hoy no queda ni un «casi» al que agarrarme.'
  ],
  encargos_4: [
    'Los cuatro, {nombre}. Debo admitir que el expediente luce mejor.',
    'Semana saldada, {nombre}. El expediente puede descansar hasta el lunes.',
    'Cuatro de cuatro, {nombre}. Una línea en tinta discreta debería bastar.'
  ],
  comeback: [
    '«Vaya, {nombre}. Había empezado a archivar tu expediente.»',
    '«{nombre}. Ha pasado tiempo. No preguntaré dónde estabas. Lo adivino.»',
    '«Así que sigues por aquí, {nombre}. Mi libreta no te esperaba.»'
  ],
  day: [
    '«Buenos días, {nombre}. Hoy tu cerebro ha llegado a tiempo.»',
    '«Madrugando, {nombre}. Inquietante, pero encomiable.»',
    '«Una mañana prometedora, {nombre}. Veamos qué haces con ella.»'
  ],
  streak_20: [
    '«Veinte seguidas, {nombre}. Ahora sí puedo llamarlo racha sin reservas.»',
    '«Veinte, {nombre}. Me veo obligado a anotarlo en tinta fuerte.»'
  ],
  night_early: ['«Medianoche, {nombre}. Veamos qué clase de lucidez trae esta hora.»'],
  night_late: ['«Madrugada, {nombre}. A estas horas, hasta acertar tiene cierto mérito.»'],
  streak_30: [
    '«Treinta, {nombre}. Ya no puedo fingir que esto es casualidad.»',
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
  streak_20:        { p: 1 / 2 },
  streak_30:        { p: 1 / 2 },
  night_early:      { p: 1 / 3, cap: 'dia' },
  night_late:       { p: 1 / 3, cap: 'dia' }
};
