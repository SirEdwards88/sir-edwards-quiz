// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const END_PHRASES = {
  desastre: { 
    title: "Desastre absoluto", 
    phrases: [
      "El entusiasmo ha sido ejemplar. Los conocimientos, en cambio, no han podido asistir.",
      "Hoy tu cultura general ha optado por comunicarse con gruñidos.",
      "Tu resultado demuestra que saber poco también requiere constancia.",
      "Has conseguido convertir el desconocimiento en una disciplina.",
      "Hoy tu cultura general ha ofrecido un silencio casi mineral.",
      "Tu resultado demuestra que la confianza puede sobrevivir incluso a la ausencia de conocimientos.",
      "Has fallado con una consistencia admirable. Empieza a parecer deliberado.",
      "No esperaba mucho. Has logrado que esperase aún menos.",
      "Hay días malos. Luego están los días en los que decides jugar a esto.",
      "Tu cultura general acaba de solicitar asistencia profesional.",
      "Has demostrado que equivocarse también puede hacerse con absoluta convicción."
    ] 
  },
  mediocre: { 
    title: "Mediocridad con modales", 
    phrases: [
      "Ni fu ni fa. Un resultado ideal para opinar con aplomo sin que nadie pida pruebas.",
      "El triunfo de la mediocridad: saber lo justo para no asustar y callar lo justo para no molestar.",
      "Estás justo en ese tramo donde la gente te escucha por educación, no por interés.",
      "Has reunido el saber justo para pasar por persona informada. Enhorabuena, supongo.",
      "Has conseguido exactamente lo necesario para no destacar. Un talento poco frecuente.",
      "Un resultado perfectamente mediocre. Ni siquiera has tenido la cortesía de fracasar con estilo.",
      "No está mal. Tampoco está bien. Has encontrado un punto curiosamente estable.",
      "Suficiente para aprobar, insuficiente para convertirlo en una hazaña.",
      "Has demostrado conocimientos básicos. El resultado, prudentemente, no ha pedido más.",
      "Un resultado digno. Si por digno entendemos completamente olvidable.",
      "Suficiente para demostrar que no estabas completamente ausente. Ya es algo.",
      "No ha sido brillante. Tampoco ha sido una catástrofe. Qué territorio tan gris has elegido.",
      "Has respondido lo suficiente para salir con cierta elegancia. Por poco.",
      "La mediocridad te sienta sorprendentemente bien.",
      "Correcto. Tu mayor mérito ha sido no complicarlo.",
      "Lo justo para aprobar y lo justo para olvidarlo. Una economía admirable.",
      "Hay quien aspira a la excelencia. Tú has apuntado al centro, y con puntería.",
      "Un resultado de esos que se cuentan con la palabra «bueno» y poco más.",
      "Has acertado lo bastante para defenderte y fallado lo bastante para que yo disfrute.",
      "Ni una cosa ni la otra. Tu resultado es una respuesta de «depende».",
      "Un resultado que sirve tanto para presumir como para disculparse. Tú sabrás cuál toca.",
      "No has hecho nada que merezca una crítica seria. Tampoco nada que la evite."
    ] 
  },
  bien: { 
    title: "Bastante bien", 
    phrases: [
      "Bastante bien. Lástima que en las cenas nadie reparta puntos por esto.",
      "Mucha cultura general. Lástima que no sirva para abrir una puerta corredera a la primera.",
      "Sabes mucho. Queda por ver si sabes qué hacer con ello.",
      "Bien, sin más. La perfección queda a una distancia prudente.",
      "Has conseguido que pensar parezca una habilidad. No estaba en mis previsiones.",
      "Bastante bien. Lo suficiente para que empiecen a creerte inteligente. No te emociones.",
      "Buen resultado. Ahora, con tu permiso, seguiré siendo yo el listo de la sala.",
      "Sabes bastante. Una pena que la vida no funcione con preguntas tipo test.",
      "Notable. El tipo de resultado que suena mejor cuanto menos se examina.",
      "Muy buen resultado. Una rareza estadística que procuraré vigilar de cerca.",
      "Sabes más de lo que aparentas. Tampoco era un listón especialmente alto.",
      "Has estado sorprendentemente bien. Las preguntas debían de ser fáciles; no veo otra explicación.",
      "Bastante bien. Empiezo a sospechar que ocultabas conocimientos.",
      "Un resultado respetable. «Respetable» es lo que se dice cuando no se puede decir «brillante».",
      "Has estado bien. Perfecto habría sido otra cosa, y no pienso hacerme ilusiones.",
      "Una actuación competente. Tendré que acostumbrarme.",
      "Has demostrado que, ocasionalmente, sabes de lo que hablas.",
      "Bien hecho. Puedes disfrutar de estos diez segundos de superioridad intelectual.",
      "Notable. Ahora intenta no convertirlo en tu personalidad.",
      "Has conseguido impresionar ligeramente a un hombre muy difícil de impresionar."
    ] 
  },
  casi_perfecto: { 
    title: "Rozando la perfección", 
    phrases: [
      "Muy cerca de la excelencia. La historia, por desgracia, solo recuerda el pleno.",
      "Rozar la gloria y ahogarse en la orilla. Tiene su elegancia, siempre que le pase a otro.",
      "Tan cerca del pleno que hasta duele. El «casi», por desgracia, no se enmarca.",
      "Te ha faltado un suspiro para la perfección. Yo, por si acaso, lo habría contenido.",
      "Casi perfecto. «Casi», esa palabra tan pequeña y tan injusta.",
      "Has rozado la perfección con tanta elegancia que casi parece que lo haces a propósito.",
      "Has estado a un paso del pleno. Qué lástima que ese paso fuera precisamente el que no diste.",
      "Nivel de excelencia. El pleno, en cambio, ha decidido no acompañarte.",
      "Un resultado extraordinario. El 100% estaba ahí, mirándote. Tú miraste hacia otro lado un segundo.",
      "Un resultado excelente arruinado por una pequeña muestra de humanidad.",
      "Has rozado la perfección. Naturalmente, la perfección se ha apartado.",
      "Tan cerca de la perfección que resulta casi ofensivo."
    ] 
  },
  perfecto: { 
    title: "Pleno perfecto", 
    phrases: [
      "Un pleno absoluto. Lo malo es que ahora no tengo nada que reprocharte, y vivo de eso.",
      "Felicidades por el 100%. Falta por ver a quién se lo cuentas sin que cambie de tema.",
      "Victoria absoluta. Autoridad indiscutible sobre un castillo de datos que nadie te había pedido.",
      "Felicidades. Ahora mismo eres la persona más informada de una habitación vacía.",
      "Pleno. Exijo que revisen las preguntas: algo tan limpio no puede ser trabajo honrado.",
      "20 de 20. Magnífico. Me has dejado sin argumentos y detesto esa sensación.",
      "Pleno absoluto. Qué desagradable tener que admitir que has sido excelente.",
      "20 de 20. Puedes presumir durante exactamente treinta segundos.",
      "Impecable. Tendré que reconocerlo, aunque no mejore mi jornada.",
      "Perfecto. Hoy, al parecer, has venido con los deberes hechos.",
      "Un pleno. Debo reconocerlo: has sido irritantemente competente.",
      "20 de 20. Incluso yo tendría dificultades para encontrar una crítica razonable."
    ] 
  }
};;

const SURVIVAL_FAIL_PHRASES = {
  desastre: [
    "Con este resultado, hasta llegar a la pregunta diez parecía un objetivo ambicioso.",
    "Si hicieran un documental de esta partida, iría directo al género de comedia de terror.",
    "Tus respuestas de hoy sonaban a habitación vacía. Con eco incluido.",
    "Hoy el progreso intelectual ha hecho una pausa. Larga.",
    "Tu cerebro ha elegido hoy una jornada de huelga. El momento, desde luego, es impecable.",
    "La caída ha sido tan estrepitosa que hasta las neuronas supervivientes han pedido el traslado.",
    "Si la ignorancia diera calambre, ahora mismo estarías iluminando todo el país.",
    "Ni la selección natural se atreve a comentar esta partida.",
    "Cuarenta preguntas y pocas posibilidades desde el principio. Una eficiencia admirable.",
    "Tu supervivencia terminó exactamente donde empezó a faltar el conocimiento.",
    "Derrota completa. La esperanza, por cierto, era tuya; yo nunca la tuve.",
    "Tu resultado tiene una virtud: deja muy poco espacio para la interpretación.",
    "Una racha de errores tan constante merece, al menos, un estudio.",
    "El problema no era la última pregunta. El problema era todo lo anterior.",
    "Has perdido. Si buscas consuelo, quizá hoy no sea el mejor día para buscarlo."
  ],
  regular: [
    "Fin del juego. Has dado lo mejor de ti; lamento que fuera esto.",
    "Tan cerca de la gloria y tan lejos del acierto. Vuelve a intentarlo; aquí seguiré, mirando.",
    "Fin del trayecto. Largo, trágico y, lamentablemente, presenciado por mí.",
    "Un esfuerzo encomiable para un resultado tan tristemente modesto.",
    "Te has estampado contra el último muro. Y lo peor es que ibas sin casco.",
    "Has visto la victoria desde tan cerca que podrías describirla de memoria. Tocarla ya es otra cosa.",
    "Has rozado la victoria con una delicadeza admirable. Un roce, lamentablemente, no puntúa.",
    "No has caído por falta de oportunidades, sino por aprovechar mal la última.",
    "Estabas cerca de sobrevivir. Qué lástima que cerca no cuente.",
    "Has aguantado prácticamente hasta el final. El resultado, sin embargo, no negocia.",
    "Una derrota digna. En este modo, eso ya cuenta como cumplido.",
    "Has caído con cierta elegancia. No demasiada, pero suficiente para mencionarla.",
    "Has perdido con honor. Procura no arruinarlo intentando explicarlo.",
    "Te faltó muy poco. Lo justo para que cuente como fracaso.",
    "Has estado a punto de conseguirlo. «A punto» empieza a ser tu expresión favorita.",
    "No ha sido una mala actuación. Solo ha terminado mal, que es un detalle bastante importante."
  ]
};;

const SUDDEN_FAIL_PHRASES = {
  desastre: [
    "Una oportunidad era todo lo que tenías. Y no ha sobrevivido a la experiencia.",
    "La eliminación ha llegado antes de que hubiera tiempo para presentar alegaciones.",
    "No ha sido una derrota. Ha sido una ejecución académica.",
    "La muerte fue súbita. El fracaso, en cambio, llevaba tiempo preparándose.",
    "Una sola oportunidad. Y conseguiste hacerla parecer demasiadas.",
    "Eliminación inmediata. Ni siquiera el juego ha pedido una segunda opinión.",
    "Una sola oportunidad era suficiente. Para alguien, al menos.",
    "El margen de error era cero. Y tú has comprobado que lo decían en serio.",
    "Una vida. Un error. Una conclusión bastante previsible."
  ],
  regular: [
    "Estabas a una buena respuesta de seguir en pie. Elegiste la otra.",
    "Has caído en la orilla. Técnicamente, seguías nadando.",
    "La eliminación estaba esperando. No hacía falta ir a buscarla.",
    "Varias opciones, una correcta. Has demostrado un olfato admirable para evitarla.",
    "No te faltó mucho. Te sobró una respuesta equivocada.",
    "Una respuesta distinta y esta frase sería otra. Yo, por mi parte, ya la tenía escrita.",
    "Una sola respuesta te ha eliminado. Entre tantas, hay que tener criterio para escoger esa.",
    "Has gastado tu única vida en una respuesta que claramente no la merecía.",
    "La eliminación es firme. La muerte súbita no suele aceptar reclamaciones.",
    "La partida terminó en cuanto pusiste toda tu fe en esa respuesta."
  ]
};;

const TIMETRIAL_END_PHRASES = {
  mal: [
    "El tiempo se ha acabado antes de que llegara la inspiración.",
    "La próxima vez, convendría mirar el reloj. Es el que tiene los números.",
    "Has perdido contra un reloj. Piénsalo.",
    "El reloj tenía un plan. Tú no.",
    "Mucho tiempo al principio. Muy poco conocimiento al final.",
    "El reloj no te ha ganado. Tú simplemente le has dado demasiado tiempo.",
    "60 segundos. Suficientes para comprobar que hoy el pensamiento iba a otro ritmo.",
    "El tiempo corría. Tú estabas intentando recordar.",
    "El cronómetro ha terminado su trabajo. Tú no has llegado a empezar el tuyo.",
    "El reloj tenía razón. Y no estaba de humor para negociar.",
    "El cronómetro ha sido impecable. El resto, en fin.",
    "Todo ese tiempo para pensar y, aun así, tanta distancia hasta la respuesta.",
    "El reloj no se equivocó ni una vez. No puedo decir lo mismo de ti.",
    "El tiempo no esperaba. Tú, aparentemente, sí.",
    "El cronómetro te dio una oportunidad. El tiempo se encargó del resto."
  ],
  normal: [
    "El reloj ha hecho su trabajo. Tú, más o menos.",
    "No había tiempo para pensar y has actuado en consecuencia. Con resultados proporcionales.",
    "El tiempo no perdona. Las malas respuestas tampoco.",
    "Has sobrevivido al reloj. Por poco.",
    "No has dominado el reloj, pero al menos no has pedido que se detenga.",
    "Ritmo aceptable. Conocimiento discutible. Resultado razonablemente sólido.",
    "Has ido rápido. No siempre en la dirección correcta.",
    "No ha sido brillante, pero al menos el reloj no se ha reído.",
    "Has mantenido el ritmo. Nadie ha gritado, y en esta casa eso ya es un éxito.",
    "Has mantenido el tipo. El reloj puede volver a dormir.",
    "Ni brillante ni desastroso. El tiempo ha seguido a lo suyo, que es no fijarse en ti.",
    "El reloj ha terminado. Tu dignidad, por los pelos, también.",
    "Un ritmo competente. La palabra «competente» tendrá que bastar por hoy.",
    "Has llegado con el reloj a un acuerdo razonable. Él ha cedido poco; tú, menos."
  ],
  bien: [
    "El tiempo corría, pero tú más.",
    "El reloj ha perdido. Tú no.",
    "No sé qué has hecho, pero el reloj está ofendido.",
    "Bastante bien. Has conseguido que el tiempo parezca lento.",
    "Cuando hay conocimiento, el reloj empieza a parecer un detalle administrativo.",
    "Has ido tan rápido que por momentos parecía que conocías las respuestas.",
    "El tiempo se ha acabado. Las excusas también.",
    "Una demostración impecable de velocidad y conocimiento. O al menos de una de las dos.",
    "El cronómetro marcaba segundos. Tú marcabas diferencias.",
    "Has convertido el límite de tiempo en una demostración de eficacia.",
    "El reloj corría contra ti. Mala elección por su parte.",
    "Velocidad, precisión y conocimiento. Una combinación bastante eficaz.",
    "Has terminado antes que el tiempo. Por supuesto.",
    "El cronómetro quería presión. Tú le diste espectáculo.",
    "Has respondido tan rápido que por un momento el tiempo parecía estar de tu lado.",
    "Has tratado al cronómetro como una formalidad. No era esa la idea.",
    "Has convertido la presión en una ventaja. Empiezo a preocuparme.",
    "Has respondido antes de que el tiempo pudiera empezar a insultarte.",
    "Un ritmo excelente. El cronómetro está reconsiderando sus opciones."
  ]
};;

const MENTAL_CALC_END_PHRASES = {
  mal: [
    "Las matemáticas han ganado.",
    "Quizá la calculadora no era tan mala idea.",
    "El resultado es incorrecto. El esfuerzo también.",
    "Había números. Tú estabas allí. No fue suficiente.",
    "Tu cerebro ha pedido una excedencia.",
    "Los números siguen ahí. El conocimiento, no tanto.",
    "La cuenta daba un resultado. Tú has preferido otro, por originalidad.",
    "La aritmética ha ganado por una diferencia preocupante.",
    "Entre tú y los números hoy ha hecho falta mediación. Sin éxito.",
    "Una operación matemática y la intuición han formado hoy una alianza peculiar.",
    "Eran números, no enigmas. El desastre, en cambio, ha sido de talla grande.",
    "La suma ha pedido explicaciones. Te recomiendo no dárselas.",
    "La calculadora no habría aceptado esa respuesta. Y tiene muy poca personalidad.",
    "La aritmética ha sobrevivido. Tu reputación, menos."
  ],
  normal: [
    "Sumar, restar y sobrevivir. Un éxito completo.",
    "No sé cómo lo has calculado, pero legalmente cuenta.",
    "Tu cerebro ha hecho horas extra. No se lo cuentes a nadie.",
    "No ha sido cálculo mental. Ha sido negociación con los números.",
    "La calculadora humana todavía está en fase beta.",
    "No has derrotado a las matemáticas, pero has conseguido que te toleren.",
    "Cálculo mental aprobado. Con reservas.",
    "No ha sido bonito, pero matemáticamente sigue siendo defendible.",
    "Resultado aceptable. Las matemáticas, por una vez, no presentarán una queja.",
    "La cuenta te ha puesto a prueba. Has sobrevivido al interrogatorio.",
    "Tu relación con la aritmética es civilizada. Fría, pero civilizada."
  ],
  bien: [
    "Tu cerebro todavía funciona. De momento.",
    "Los números te esperaban con malas intenciones. Se han ido con las manos vacías.",
    "Operación completada con éxito. Sorprendentemente.",
    "Has hecho matemáticas voluntariamente. Deberíamos preocuparnos.",
    "Cálculo mental sin una gota de sudor. Empiezo a sospechar que lo disfrutas.",
    "Las matemáticas te han dejado pasar. Esta vez.",
    "Resultado exacto. Tan exacto que roza la mala educación.",
    "Has convertido las operaciones en un simple trámite.",
    "Los números han dejado de discutir contigo.",
    "No necesitas calculadora. La calculadora te necesita a ti.",
    "Cálculo mental impecable. Ahora intenta hacerlo sin presumir.",
    "Las matemáticas te han visto venir y han decidido no complicarse.",
    "Has hecho las cuentas de cabeza. La calculadora puede empezar a buscar trabajo.",
    "Los números han cooperado. No suelen tener ese detalle.",
    "Precisión admirable. Incluso los decimales parecen haberse rendido.",
    "Has resuelto las cuentas antes de que pudieran convertirse en un problema.",
    "Has hecho que la aritmética parezca sencilla. Qué arrogancia tan justificada.",
    "Una respuesta correcta y además rápida. Esto empieza a resultar ofensivo."
  ]
};;

const LUCIDEZ_END_PHRASES = {
  derrota: [
    'La lucidez estaba cerca. Tú decidiste pasar de largo.',
    'El conocimiento estaba ahí. La respuesta, aparentemente, estaba de vacaciones.',
    'Lucidez mental: temporalmente fuera de servicio.',
    'El umbral estaba delante de ti. Al parecer, también había una pared.',
    'Tu cerebro tenía un plan. Lamentablemente, no era este.',
    'La respuesta correcta existía. Tú y ella decidisteis no conoceros.',
    'Has demostrado una gran capacidad para generar respuestas alternativas.',
    'Tu confianza era de 10/10. El resultado decidió ser más realista.',
    'El cerebro es un órgano fascinante. Hoy, sobre todo, por lo que se ha negado a hacer.',
    'La lucidez pasó por aquí. Dejó una nota diciendo que no te esperaba.',
    'Has llegado hasta el límite. El límite te ha mirado con cierta lástima.',
    'Has llegado muy lejos para caer justo al final. Un talento peculiar.',
    'La respuesta estaba al alcance. La lucidez, no.',
    'El conocimiento te trajo hasta aquí. La sensatez, convocada tarde, no ha comparecido.',
    'La presión ha hecho su trabajo. El tuyo, lamentablemente, quedó pendiente.',
    'No era falta de conocimiento. Era falta de lucidez en el momento exacto.',
    'La mente duda una vez. A veces basta con una.',
    'Has llegado al umbral. Y has decidido admirarlo desde fuera.',
    'Tu confianza llegó hasta el final. Tus respuestas, no.',
    'Todo iba perfectamente. Entonces empezaste a responder.',
    'La mente pidió cinco segundos más. El juego decidió que no.',
    'La respuesta estaba en algún rincón de tu cabeza. Falló el camino de vuelta.',
    'La mente entendió la pregunta. La respuesta decidió independizarse.',
    'La lucidez llegó tarde. Muy tarde para resultar útil.'
  ],
  victoria: [
    'Lucidez Mental completada. La humildad puede esperar cinco minutos.',
    'Enhorabuena. Hoy hasta las respuestas difíciles te han tratado con respeto.',
    'Impecable. Cuesta no sentir cierta antipatía.',
    'Brillante. Empieza a resultar incómodo.',
    'La lucidez es tuya. Por ahora.',
    'Excelente. Ni un volantazo en todo el trayecto.',
    'Has demostrado que puedes pensar bajo presión. El resto de tu vida ya es asunto tuyo.',
    'Superado. Ya puedes decir «lo sabía» con cierta legitimidad.',
    'Has atravesado el límite. Intenta no mirar atrás: queda feo presumir.',
    'La mente no cedió. Tú tampoco.',
    'Has llegado hasta el final manteniendo la cabeza fría.',
    'Tres fases y un último juicio. Esta vez, la duda perdió.',
    'La presión aumentó. Tu lucidez también.',
    'Pensar cuando importa es raro. Hacerlo sin sudar resulta sospechoso.',
    'No era solo conocimiento. Era sangre fría, que es más raro y menos agradecido.',
    'Saber no basta. También hay que saber pensar.',
    'El último obstáculo ha caído. La corona es de cartón, pero luce.',
    'Has visto qué pasa cuando la mente no cede: el resto se queda mirando.',
    'Has llegado donde pocos se atreven a pisar. El resto mira desde abajo.',
    'La puerta estaba cerrada. La respuesta era la llave. Lo difícil era recordar que la llevabas.',
    'Lucidez demostrada. Ahora procura no volverte insoportable.',
    'Has conseguido pensar mientras todo te decía que entraras en pánico. Admirable.'
  ]
};;

const LUCIDEZ_PERFECT_PHRASES = [
  '30/30. Queda probado que todo ese tiempo jugando al quiz servía de algo.',
  '30/30. Esto ya no es lucidez: es una ofensa estadística.',
  '30/30. No ha quedado ninguna duda. Tampoco ninguna pregunta.',
  '30/30. Ni un solo desvío. Me pregunto de dónde sacas la brújula.',
  '30/30. Tu cabeza ha trabajado más que todo el archivo de Sir Edwards. Procura que descanse.',
  '30/30. Sospecho de este resultado: lo normal es fallar, aunque sea por cortesía.',
  '30/30. Hoy no has encontrado las respuestas. Las has construido desde cero.',
  '30/30. Ninguna duda, ningún tropiezo y, por desgracia, ningún pretexto para criticarte.',
  '30/30. La cúspide mental es tuya. Cuidado con la altura: se respira mal y se habla de más.',
  '30/30. Has dejado a la mente humana en muy buen lugar. A mí, en uno peor.',
  '30/30. La mente ha hablado. Y esta vez tenía razón.',
  '30/30. No queda ninguna pregunta pendiente. Solo la duda de qué haces con tanto conocimiento.',
  '30/30. Se me han acabado las exigencias. Lo digo con enorme resentimiento.',
  '30/30. Por una vez, no hay un «casi» que añadir.',
  'Perfecto. Empiezo a echar de menos tus errores.',
  'Treinta respuestas impecables. Voy a tener que actualizar mi opinión sobre ti.',
  'Perfecto. Por una vez, incluso yo tendré que limitarme a asentir.'
];;

const SURVIVAL_WIN_PHRASES = [
  "Has ganado. Oficialmente, nadie puede discutirte nada hasta la próxima partida. ¿Y ahora qué?",
  "Victoria magistral. Un despliegue de intelecto que, con suerte, nunca tendrás que usar en la vida real.",
  "Victoria total. En algún lugar, un trofeo imaginario ensaya su discurso de bienvenida.",
  "Lo has conseguido. Ahora queda encontrar a alguien dispuesto a escucharlo.",
  "Enhorabuena. El mundo real sigue sin enterarse, y yo diría que sin ganas.",
  "La prueba exigía conocimientos. Tú aportaste resistencia. Técnicamente, funcionó.",
  "Sobrevivir no es lo mismo que brillar, pero tampoco es poco.",
  "Has llegado al final con vida. La estadística, que esperaba otra cosa, ha tomado nota.",
  "El combate ha terminado. Descansa; mañana te esperan otras cuarenta.",
  "Has sobrevivido. Contra todo pronóstico, incluido el mío.",
  "Sigues en pie al final de la lista. Un golpe duro para mis predicciones.",
  "Has llegado al final. Una demostración de resistencia bastante inesperada.",
  "Victoria. Voy a tener que retirar un par de comentarios.",
  "Has sobrevivido. No necesariamente con elegancia, pero sí con resultados.",
  "Una victoria merecida. Procura no convertirla en una leyenda personal.",
  "Has aguantado hasta el final. Mis previsiones eran bastante menos optimistas.",
  "Victoria. Y, por lo visto, con plan. Eso sí que no lo esperaba."
];;

const SUDDEN_WIN_PHRASES = [
  "Un logro impecable, de los que no sirven para nada salvo para presumir. Úsalo con moderación.",
  "Has completado el modo extremo. Añádelo al currículum: nadie te lo preguntará, pero constará.",
  "Prueba superada. Un talento sin utilidad práctica, pero impecable.",
  "Una oportunidad. Cero errores. Así es como se sobrevive a la muerte súbita.",
  "No había margen para fallar. Por algún motivo, tampoco lo necesitaste.",
  "La siguiente pregunta podía eliminarte. Decidiste eliminarla tú primero.",
  "Has llegado al final sin pestañear. La muerte súbita tendrá que esperar.",
  "Muerte súbita. Para alguien más.",
  "Una sola vida. Una sola oportunidad. Una victoria bastante incómoda para los demás.",
  "No te has limitado a sobrevivir al límite: lo has dejado en ridículo.",
  "Eliminación evitada. El suspense, por desgracia, también ha sobrevivido.",
  "No has tenido una segunda oportunidad. Por suerte, tampoco la has necesitado.",
  "Una vida y todas las preguntas contestadas. Por fin, una relación sana con las consecuencias.",
  "Has llegado al final sin regalarle una oportunidad al error.",
  "La muerte súbita esperaba algo más de dramatismo. Se va a casa sin su espectáculo.",
  "Veinticinco preguntas. Una vida. Y aquí sigues. Molestamente competente."
];;

const REVIEW_END_PHRASES = {
  progreso: {
    title: 'Los errores caen',
    phrases: [
      "Los errores de ayer son las respuestas de hoy. Una forma bastante elegante de reciclar.",
      "Una pregunta fallada, una pregunta aprendida. Por fin cobras algo de tus fracasos.",
      "No has venido a acertar. Has venido a enmendarte, que es más humilde y más útil.",
      "Cada error corregido es una pregunta menos que volverá a pillarte.",
      "El conocimiento también se construye con escombros. Hoy hay material de sobra.",
      "Lo que ayer fallaste, hoy ya no te vuelve a engañar.",
      "Tus errores están empezando a quedarse sin sitio donde esconderse.",
      "Tus tropiezos de antaño empiezan a dar fruto. Una cosecha bastante peculiar.",
      "Cada acierto recuperado te hace un poco más difícil de derrotar.",
      "Tu memoria ha vuelto al trabajo. Sin disculpas, pero ha vuelto.",
      "Repasar sirve exactamente para esto: para que el pasado no duela.",
      "Hoy no has borrado errores. Los has convertido en respuestas.",
      "Parece que tus antiguos tropiezos ya no recuerdan cómo ganarte.",
      "Volviste a por las preguntas que te derrotaron. Mala idea para ellas.",
      "Segunda oportunidad para ti. Última para ellas.",
      "Has vuelto al lugar de tus errores. Esta vez sabías dónde mirar.",
      "Has vuelto con los deberes hechos. Tus errores, aparentemente, no.",
      "Las preguntas que te derrotaron empiezan a quedarse sin argumentos.",
      "Hoy has venido a cobrar viejas deudas.",
      "El pasado acaba de perder otra batalla.",
      "Repasar no es repetir. Es vengarse con conocimiento.",
      "Tus errores de antes ya no intimidan. Empiezo a tenerles lástima.",
      "Has aprendido exactamente de aquello que antes te hacía fallar.",
      "Has vuelto sobre tus errores y, esta vez, ellos eran los que tenían motivos para preocuparse.",
      "Has corregido el pasado con bastante elegancia.",
      "Las preguntas recordaban tu antiguo rendimiento. Error suyo.",
      "El conocimiento también sabe vengarse. Hoy has tenido la cortesía de demostrarlo."
    ]
  },
  insuficiente: {
    title: 'Los errores resisten',
    phrases: [
      "Todavía hay errores que no quieren rendirse.",
      "Algunas preguntas siguen sabiendo exactamente dónde hacerte daño.",
      "Todavía quedan fallos por convertir en respuestas.",
      "Nada grave. Para esto se inventó el Repaso: para volver sobre lo que se resiste.",
      "Hoy no las has dominado. Tampoco ellas a ti. Empate técnico.",
      "Hay preguntas que todavía te conocen demasiado bien.",
      "El error ha sobrevivido. La próxima vez, no debería hacerlo.",
      "Tus errores han pedido una revancha. No tardes en dársela.",
      "Has vuelto a por tus errores. Ellos ya te estaban esperando.",
      "El pasado ha demostrado tener mejor memoria que tú.",
      "Hay errores que necesitan otra conversación.",
      "Hay cuentas pendientes. Yo, por cierto, llevo la contabilidad.",
      "No has perdido: has localizado exactamente lo que no sabes. Es un comienzo.",
      "Tus errores no han desaparecido. Solo han tomado posiciones.",
      "Entre tú y tu memoria hay asuntos sin resolver. Yo, de testigo.",
      "El repaso ha revelado un pequeño problema. Bueno, varios.",
      "Algunas respuestas todavía necesitan que les presentes tus respetos."
    ]
  }
};;

