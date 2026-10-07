// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const END_PHRASES = {
  desastre: { 
    title: "Desastre absoluto", 
    phrases: [
      "El entusiasmo ha sido ejemplar. Los conocimientos, en cambio, no han podido asistir.",
      "Tienes la cultura general justa para no pedir las cosas señalando con la mano y emitiendo gruñidos.",
      "Tu resultado demuestra que saber poco también requiere constancia.",
      "Un resultado verdaderamente lamentable. Has conseguido convertir el desconocimiento en una disciplina.",
      "He visto piedras con más cultura general. Al menos ellas tienen el tacto de no opinar.",
      "Tu resultado demuestra que la confianza puede sobrevivir incluso a la ausencia de conocimientos.",
      "Has fallado con una consistencia admirable. Casi parece entrenamiento.",
      "No esperaba mucho. Aun así has conseguido negociar con mis expectativas a la baja.",
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
      "El resultado perfecto para pasar completamente desapercibido en cualquier sitio.",
      "Estás justo en ese tramo donde la gente te escucha por educación, no por interés.",
      "Has reunido el saber justo para pasar por persona informada. Enhorabuena, supongo.",
      "Has conseguido exactamente lo necesario para no destacar. Un talento poco frecuente.",
      "Un resultado perfectamente mediocre. Ni siquiera has tenido la cortesía de fracasar con estilo.",
      "No está mal. Tampoco está bien. Has encontrado el punto exacto donde nadie espera nada de ti.",
      "Suficiente para aprobar, insuficiente para tener una opinión interesante.",
      "Has demostrado conocimientos básicos y una alarmante falta de ambición.",
      "Un resultado digno. Si por digno entendemos completamente olvidable.",
      "Suficiente para demostrar que no estabas completamente ausente. Qué alivio.",
      "No ha sido brillante. Tampoco ha sido una catástrofe. Qué territorio tan gris has elegido.",
      "Has respondido lo suficiente para conservar tu dignidad. Por poco.",
      "La mediocridad te sienta sorprendentemente bien.",
      "Un resultado correcto. Tu mayor logro ha sido no estropearlo más."
    ] 
  },
  bien: { 
    title: "Bastante bien", 
    phrases: [
      "Bastante bien. Lástima que en las cenas nadie reparta puntos por esto.",
      "Mucha cultura general, pero apuesto a que tardas tres intentos en adivinar por dónde se abre una puerta corredera.",
      "Sabiendo tanto, es un misterio cómo consigues tomar decisiones tan malas en tu día a día.",
      "A un paso de la perfección, que es exactamente la distancia a la que te quedas siempre de todo.",
      "Has conseguido que pensar parezca una habilidad. Qué sorpresa.",
      "Bastante bien. Lo suficiente para que empiecen a creerte inteligente. No te emociones.",
      "Buen resultado. Ahora, con tu permiso, seguiré siendo yo el listo de la sala.",
      "Has demostrado que sabes bastante. Una pena que la vida no funcione con preguntas tipo test.",
      "Notable. El tipo de resultado que te permite presumir sin que nadie pueda comprobarlo.",
      "Muy buen resultado. Y sin público: por una vez, la modestia te sale gratis.",
      "Sabes más de lo que aparentas. Tampoco era un listón especialmente alto.",
      "Has estado sorprendentemente bien. Las preguntas debían de ser fáciles; no veo otra explicación.",
      "Bastante bien. Casi parece que tienes conocimientos de los que no me habías informado.",
      "Un resultado respetable. «Respetable» es lo que se dice cuando no se puede decir «brillante».",
      "Has estado bien. Perfecto habría sido otra cosa, y no pienso hacerme ilusiones.",
      "Una actuación competente. Qué desagradablemente poco habitual.",
      "Has demostrado que, ocasionalmente, sabes de lo que hablas.",
      "Bien hecho. Puedes disfrutar de estos diez segundos de superioridad intelectual.",
      "Notable. Ahora intenta no convertirlo en tu personalidad.",
      "Has conseguido impresionar ligeramente a un hombre muy difícil de impresionar."
    ] 
  },
  casi_perfecto: { 
    title: "Rozando la perfección", 
    phrases: [
      "Muy cerca de la excelencia. La historia, por desgracia, no puntúa los «casi».",
      "Rozar la gloria y ahogarse en la orilla. Tiene su elegancia, siempre que le pase a otro.",
      "Tan cerca del pleno que hasta duele. Una lástima que el mérito no se pueda enmarcar.",
      "Te ha faltado un suspiro para la perfección. Yo, por si acaso, lo habría contenido.",
      "Casi perfecto. «Casi»: la palabra que mejor te define, me temo.",
      "Has rozado la perfección con tanta elegancia que casi parece que lo haces a propósito.",
      "Has estado a un paso del pleno. Qué lástima que ese paso fuera precisamente el que no diste.",
      "Has jugado a nivel de excelencia. Lástima que la excelencia no redondee resultados.",
      "Un resultado extraordinario. El 100% estaba ahí, mirándote. Tú decidiste dejarlo escapar.",
      "Un resultado excelente arruinado por una pequeña muestra de humanidad.",
      "Has rozado la perfección. Naturalmente, la perfección se ha apartado.",
      "Tan cerca de ser perfecto que resulta casi ofensivo."
    ] 
  },
  perfecto: { 
    title: "Pleno perfecto", 
    phrases: [
      "Un pleno absoluto. La parte mala es que has malgastado lo mejor de tu vida acumulando datos inútiles.",
      "Felicidades por el 100%. Ahora sal a la calle a ver si encuentras a alguien a quien le importe.",
      "Victoria absoluta. Eres el rey indiscutible de un castillo hecho de datos totalmente inservibles.",
      "Felicidades. Ahora mismo eres la persona más informada de una habitación vacía.",
      "Pleno. Exijo que revisen las preguntas: algo tan limpio no puede ser trabajo honrado.",
      "20 de 20. Magnífico. Me has dejado sin argumentos y detesto esa sensación.",
      "Pleno absoluto. Qué desagradable tener que admitir que has sido excelente.",
      "20 de 20. Puedes presumir durante exactamente treinta segundos.",
      "Impecable. Guardaré este momento para cuando vuelvas a ser tú.",
      "Perfecto. Hoy, al parecer, has venido con los deberes hechos.",
      "Un pleno. Debo reconocerlo: has sido irritantemente competente.",
      "20 de 20. Incluso yo tendría dificultades para encontrar una crítica razonable."
    ] 
  }
};;

const SURVIVAL_FAIL_PHRASES = {
  desastre: [
    "Tienes el nivel cultural justo para cruzar la calle sin ayuda. Y hoy lo he dudado.",
    "Si hicieran un documental de tu capacidad intelectual, iría directo al género de comedia de terror.",
    "Tu cerebro está tan vacío que, al pensar, se oye el eco.",
    "Has demostrado que la evolución a veces da marcha atrás.",
    "Tu cerebro decidió hacer huelga general justo en el peor momento posible.",
    "La caída ha sido tan estrepitosa que hasta las neuronas supervivientes han pedido el traslado.",
    "Si la ignorancia diera calambre, ahora mismo estarías iluminando todo el país.",
    "Si cobrases por neurona activa, hoy habrías salido debiendo.",
    "Ni la selección natural se explica cómo has conseguido llegar con vida hasta el día de hoy.",
    "Cuarenta preguntas eran demasiadas. También lo eran tus posibilidades, aparentemente.",
    "Tu supervivencia terminó exactamente donde empezó a faltar el conocimiento.",
    "Derrota completa. La esperanza, por cierto, era tuya; yo nunca la tuve.",
    "Tu resultado tiene una virtud: deja muy poco espacio para la interpretación.",
    "Tu capacidad para permanecer en el error durante tanto tiempo merece, al menos, un estudio.",
    "El problema no era la última pregunta. El problema era todo lo anterior.",
    "Has perdido. Si buscas consuelo, te recomiendo no mirar el marcador."
  ],
  regular: [
    "Fin del juego. Has dado lo mejor de ti; lamento que fuera esto.",
    "Tan cerca de la gloria y tan lejos del sentido común. Vuelve a intentarlo cuando evoluciones un poco.",
    "Fin del trayecto. Breve, trágico y, lamentablemente, presenciado por mí.",
    "Un esfuerzo encomiable para un intelecto tan tristemente modesto.",
    "Te has estampado contra el muro de la incompetencia. Y lo peor es que ibas sin casco.",
    "Te has acercado a la victoria por pura estadística, como un chimpancé tecleando al azar.",
    "Has rozado la victoria con la misma delicadeza con que rozas el entendimiento humano.",
    "No has caído por falta de oportunidades. Has caído por insistir en respuestas absurdas.",
    "Estabas cerca de sobrevivir. Qué lástima que cerca no cuente.",
    "Has aguantado hasta el final para morir exactamente donde se esperaba.",
    "Una derrota digna. Lo cual, en este modo, ya es casi un cumplido.",
    "Has caído con cierta dignidad. No mucha, pero suficiente para mencionarla.",
    "Has perdido con honor. Procura no arruinarlo intentando explicarlo.",
    "Te faltó muy poco. Lo justo para que cuente como fracaso.",
    "Has estado a punto de conseguirlo. «A punto» empieza a ser tu expresión favorita.",
    "No ha sido una mala actuación. Solo ha terminado mal, que es un detalle bastante importante.",
    "Has caído cerca de la meta. Qué manera tan elegante de seguir perdiendo."
  ]
};;

const SUDDEN_FAIL_PHRASES = {
  desastre: [
    "Una oportunidad era todo lo que tenías. Decidiste desperdiciarla.",
    "Has sido eliminado antes de que tu cerebro pudiera presentar alegaciones.",
    "No ha sido una derrota. Ha sido una ejecución académica.",
    "La muerte fue súbita. El fracaso, bastante más lento.",
    "Una sola oportunidad. Y conseguiste hacerla parecer demasiadas.",
    "Eliminado. Ni siquiera el juego ha considerado necesario pedir una segunda opinión.",
    "La muerte súbita ha hecho exactamente lo que prometía. Tú, en cambio, no.",
    "Una sola oportunidad era suficiente. Para alguien, al menos.",
    "El margen de error era cero. Tu resultado ha sido extraordinariamente fiel al concepto.",
    "Una vida. Un error. Una conclusión bastante previsible."
  ],
  regular: [
    "Estabas a una buena respuesta de seguir vivo. Elegiste la otra.",
    "Has muerto en la orilla. Técnicamente, seguías nadando.",
    "La eliminación estaba cerca. Tú te acercaste voluntariamente.",
    "Varias opciones, una correcta. Has demostrado un olfato admirable para evitarla.",
    "No te faltó mucho. Te sobró una respuesta equivocada.",
    "Una pregunta más y quizá habría sido distinto. Qué pena que no haya una.",
    "Eliminado por una sola respuesta. Con tantas disponibles, hay que tener criterio para escoger esa.",
    "Has gastado tu única vida en una respuesta que claramente no la merecía.",
    "Has sido eliminado. La muerte súbita no suele aceptar reclamaciones.",
    "La partida terminó en cuanto decidiste confiar en esa respuesta."
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
    "60 segundos. Suficientes para demostrar que pensar rápido no era tu especialidad.",
    "El tiempo corría. Tú estabas ocupado intentando recordar.",
    "Has perdido contra un instrumento diseñado para medir segundos. Reflexiona sobre eso.",
    "El cronómetro ha terminado su trabajo. Tú no llegaste a empezar el tuyo.",
    "El tiempo se agotó. Tu inspiración, por lo visto, tenía otro compromiso.",
    "El reloj tenía razón. Tú eras el problema.",
    "El cronómetro ha sido impecable. Conviene empezar por ahí.",
    "Todo ese tiempo para pensar y, aun así, tanta distancia hasta la respuesta.",
    "El reloj no se equivocó ni una vez. No puedo decir lo mismo de ti.",
    "El tiempo corría. Tú parecías estar negociando.",
    "El cronómetro te dio una oportunidad. Decidiste gastarla."
  ],
  normal: [
    "El reloj ha hecho su trabajo. Tú, más o menos.",
    "No había tiempo para pensar. Por suerte, tampoco lo has hecho.",
    "El tiempo no perdona. Las malas respuestas tampoco.",
    "60 segundos. Y todavía no sabemos qué ha pasado.",
    "Has sobrevivido al reloj. Por poco.",
    "No has dominado el reloj, pero al menos no has pedido que se detenga.",
    "Ritmo aceptable. Conocimiento discutible. Resultado sorprendentemente digno.",
    "Has ido rápido. No siempre en la dirección correcta.",
    "No ha sido brillante, pero al menos el reloj no se ha reído.",
    "Has mantenido el ritmo. Nadie ha gritado, y en esta casa eso ya es un éxito.",
    "Un ritmo respetable. Nada que obligue al cronómetro a preocuparse.",
    "Has mantenido el tipo. El reloj puede volver a dormir.",
    "Ni brillante ni desastroso. El tiempo ha seguido a lo suyo, que es no fijarse en ti.",
    "El reloj ha terminado. Tu dignidad, por los pelos, también.",
    "Un ritmo competente. La palabra “competente” tendrá que bastar por hoy.",
    "Has llegado con el reloj a un acuerdo razonable. Él ha cedido poco; tú, menos."
  ],
  bien: [
    "El tiempo corría, pero tú más.",
    "El reloj ha perdido. Tú no.",
    "No sé qué has hecho, pero el reloj está ofendido.",
    "Bastante bien. Has conseguido que el tiempo parezca lento.",
    "¿Quién necesita tiempo cuando tiene conocimientos?",
    "Has ido tan rápido que casi parecía que sabías las respuestas.",
    "El tiempo se ha acabado. Las excusas también.",
    "Una demostración impecable de velocidad y conocimiento. O al menos de una de las dos.",
    "El cronómetro marcaba segundos. Tú marcabas diferencias.",
    "Has convertido sesenta segundos en una demostración de superioridad.",
    "El reloj corría contra ti. Mala elección por su parte.",
    "Velocidad, precisión y conocimiento. Qué combinación tan poco habitual.",
    "Has terminado antes que el tiempo. Por supuesto.",
    "El cronómetro quería presión. Tú le diste espectáculo.",
    "Has respondido tan rápido que por un momento el tiempo parecía estar de tu lado.",
    "Has hecho que el cronómetro pareciera innecesario. Qué poco considerado.",
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
    "Tu relación con los números necesita intervención profesional.",
    "Has visto una operación matemática y has decidido confiar en la intuición. Valiente.",
    "Eran números pequeños. El desastre, en cambio, ha sido de talla grande.",
    "La operación tenía una respuesta. Tú encontraste otra.",
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
    "Los números han intentado hundirte. Has negociado una tregua.",
    "No ha sido bonito, pero matemáticamente sigue siendo defendible.",
    "Tu cerebro ha trabajado. Exige vacaciones.",
    "Resultado aceptable. Las matemáticas han decidido no presentar una queja.",
    "No ha sido elegante, pero ha sido correcto. Una combinación respetable.",
    "La cuenta te ha puesto a prueba. Has sobrevivido al interrogatorio.",
    "Tu relación con la aritmética es civilizada. Fría, pero civilizada."
  ],
  bien: [
    "Tu cerebro todavía funciona. De momento.",
    "Los números te esperaban con malas intenciones. Se han ido con las manos vacías.",
    "Operación completada con éxito. Sorprendentemente.",
    "Has hecho matemáticas voluntariamente. Deberíamos preocuparnos.",
    "Cálculo mental sin una gota de sudor. Casi parece que lo disfrutas.",
    "Las matemáticas te han dejado pasar. Esta vez.",
    "Resultado exacto. Tan exacto que roza la mala educación.",
    "Has convertido las operaciones en trámite.",
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
    'Había una respuesta correcta. Tú elegiste defender otra con admirable convicción.',
    'Tu confianza era de 10/10. El resultado decidió ser más realista.',
    'El cerebro es un órgano fascinante. El tuyo acaba de demostrarlo.',
    'La lucidez pasó por aquí. Dejó una nota diciendo que no te esperaba.',
    'Has llegado hasta el límite. El límite te ha mirado con cierta lástima.',
    'Has llegado muy lejos para caer tan cerca. Es un talento, aunque no el que buscábamos.',
    'La respuesta estaba al alcance. La lucidez, no.',
    'El conocimiento te trajo hasta aquí. La sensatez, convocada tarde, no ha comparecido.',
    'La presión ha hecho su trabajo. Tú, el tuyo, al revés.',
    'No era falta de conocimiento. Era falta de lucidez en el momento exacto.',
    'La mente duda una vez. A veces basta con una.',
    'Has llegado al umbral. Y has decidido admirarlo desde fuera.',
    'La lucidez ha abandonado la sala. No ha dejado explicación.',
    'Tu confianza llegó hasta el final. Tus respuestas, no.',
    'Todo iba perfectamente. Entonces empezaste a responder.',
    'Tenías un plan. La pregunta tenía otro.',
    'La mente pidió cinco segundos más. El juego decidió que no.',
    'Sabías la respuesta. El problema fue conseguir que tu cerebro se dignara a entregártela.',
    'Tu conocimiento estaba presente. Qué pena que decidiera no colaborar.',
    'La mente entendió la pregunta. La respuesta decidió independizarse.',
    'La lucidez llegó tarde. Muy tarde. Casi después de la partida.'
  ],
  victoria: [
    'Lucidez Mental completada. La humildad puede esperar cinco minutos.',
    'Enhorabuena. Hoy hasta tus respuestas parecen inteligentes.',
    'Impecable. Cuesta no sentir cierta antipatía.',
    'Brillante. Casi empieza a ser incómodo.',
    'La lucidez es tuya. Por ahora.',
    'Excelente. Parece que hoy sí había alguien al volante.',
    'Has demostrado que puedes pensar bajo presión. El resto de tu vida ya es asunto tuyo.',
    'Perfecto. Ya tienes permiso para decir "te lo dije".',
    'Has atravesado el límite. Intenta no mirar atrás: queda feo presumir.',
    'La mente no cedió. Tú tampoco.',
    'Has llegado hasta el final manteniendo la cabeza fría.',
    'Tres fases. Un último juicio. Ninguna duda.',
    'La presión aumentó. Tu lucidez también.',
    'Pensar cuando importa es raro. Hacerlo sin sudar, casi indecente.',
    'No era solo conocimiento. Era sangre fría, que es más raro y menos agradecido.',
    'Has demostrado que saber no basta. También hay que saber pensar.',
    'La prueba ha terminado. La mente permanece intacta.',
    'El último obstáculo ha caído. La corona es de cartón, pero luce.',
    'Has visto qué pasa cuando la mente no cede: el resto se queda mirando.',
    'Has llegado donde pocos se atreven a pisar. Los demás tienen más sentido común.',
    'La puerta estaba cerrada. La respuesta era la llave. Lo difícil era recordar que la llevabas.',
    'Has pensado bajo presión. Una habilidad bastante más útil que presumir de memoria.',
    'Lucidez demostrada. Ahora procura no volverte insoportable.',
    'Has conseguido pensar mientras todo te decía que entraras en pánico. Admirable.'
  ]
};;

const LUCIDEZ_PERFECT_PHRASES = [
  '30/30. Por fin una prueba de que todo ese tiempo jugando al quiz servía para algo.',
  '30/30. Ahora sí puedes decir que has visto el otro lado.',
  '30/30. Esto ya no es lucidez: es una ofensa estadística.',
  '30/30. No ha quedado ninguna duda. Tampoco ninguna pregunta.',
  '30/30. Ni un solo desvío. Me pregunto de dónde sacas la brújula.',
  '30/30. No hay nada que corregir. Esto empieza a resultar personalmente ofensivo.',
  '30/30. Has procesado más datos que el servidor que aloja este juego. Descansa.',
  '30/30. Alguien debería vigilarte; la gente normal no hace esto.',
  '30/30. Hoy no has encontrado las respuestas. Las has construido desde cero.',
  '30/30. Ninguna duda, ningún tropiezo y, por desgracia, ningún pretexto para criticarte.',
  '30/30. La cúspide mental es tuya. Cuidado con la altura: se respira mal y se habla de más.',
  '30/30. Has dejado a la mente humana en muy buen lugar. A mí, en uno peor.',
  '30/30. La mente ha hablado. Y esta vez tenía razón.',
  '30/30. No queda ninguna pregunta pendiente. Solo la duda de qué haces con tanto conocimiento.',
  '30/30. Se me han acabado las exigencias. Lo digo con enorme resentimiento.',
  '30/30. Perfecto. Por una vez, no hay un \'casi\' que añadir.',
  '30/30. No queda nada que discutir. Qué inconveniente.',
  'Perfecto. Empiezo a echar de menos tus errores.',
  'Treinta respuestas impecables. Voy a tener que actualizar mi opinión sobre ti.',
  'Perfecto. Por una vez, incluso yo tendré que limitarme a asentir.'
];;

const SURVIVAL_WIN_PHRASES = [
  "Has ganado. Felicidades: ahora eres oficialmente el más listo de los desocupados. ¿Y ahora qué?",
  "Victoria magistral. Un despliegue de intelecto que, con suerte, nunca tendrás que usar en la vida real.",
  "Victoria total. En algún lugar, un trofeo se pregunta si de verdad quiere que lo tengas tú.",
  "Lo has conseguido. Ahora toca decidir a quién le vas a aburrir contándoselo.",
  "Enhorabuena. El mundo real sigue sin enterarse, y yo diría que sin ganas.",
  "Has sobrevivido. No sé cómo, y prefiero no investigarlo.",
  "La prueba exigía conocimientos. Tú aportaste resistencia. Técnicamente, funcionó.",
  "Sobrevivir no significa que lo hayas hecho bien. Solo significa que sigues aquí.",
  "Has llegado al final con vida. Las respuestas correctas, en cambio, han sido bastante más escasas.",
  "El combate ha terminado. Descansa; mañana volverás a creerte infalible.",
  "Has sobrevivido. Contra todo pronóstico, incluido el mío.",
  "Cuarenta preguntas. Has sobrevivido. Habrá que revisar tu utilidad al alza. Ligeramente.",
  "Has llegado al final. Qué inesperada demostración de resistencia intelectual.",
  "Victoria. Después de todo, quizá no seas completamente inútil.",
  "Has sobrevivido. No necesariamente con elegancia, pero sí con resultados.",
  "Una victoria merecida. Procura no convertirla en una leyenda personal.",
  "Has aguantado hasta el final. Admito que esperaba menos.",
  "Victoria. Por una vez, tus decisiones parecen haber seguido un plan."
];;

const SUDDEN_WIN_PHRASES = [
  "Un logro impecable, construido sobre cientos de horas que nunca vas a recuperar.",
  "Has completado el modo extremo. Añádelo al currículum: nadie te lo preguntará, pero constará.",
  "Has completado la prueba más dura. Impresionante despliegue de talento inútil; ya puedes ir a presumir ante nadie.",
  "Una oportunidad. Cero errores. Así es como se sobrevive a la muerte súbita.",
  "No había margen para fallar. Por algún motivo, tampoco lo necesitaste.",
  "La siguiente pregunta podía eliminarte. Decidiste eliminarla tú primero.",
  "Has llegado al final sin pestañear. El resto ya puede volver a intentarlo.",
  "Muerte súbita. Para alguien más.",
  "Una sola vida. Una sola oportunidad. Una victoria bastante incómoda para los demás.",
  "No has sobrevivido al límite. Has hecho que el límite parezca ridículo.",
  "Eliminación evitada. Humillación ajena confirmada.",
  "No has tenido una segunda oportunidad. Has decidido que tampoco hacía falta.",
  "Una vida. Cero errores. Por fin una relación saludable con las consecuencias.",
  "Has llegado al final sin regalarle una oportunidad al error.",
  "La muerte súbita esperaba algo más de dramatismo. Se va a casa sin su espectáculo.",
  "Veinticinco preguntas. Una vida. Y aquí sigues. Molestamente competente."
];;

const REVIEW_END_PHRASES = {
  progreso: {
    title: 'Los errores caen',
    phrases: [
      "Los errores de ayer son las respuestas de hoy. Qué forma tan elegante de reciclar.",
      "Una pregunta fallada, una pregunta aprendida. Por fin cobras algo de tus fracasos.",
      "No has venido a acertar. Has venido a enmendarte, que es más humilde y más útil.",
      "Cada error corregido es una pregunta menos que volverá a pillarte.",
      "El conocimiento también se construye con escombros. Y tú aportas material de sobra.",
      "Lo que ayer fallaste, hoy ya no te vuelve a engañar.",
      "Tus errores están empezando a quedarse sin sitio donde esconderse.",
      "Lo que ayer te venció, hoy ya no.",
      "Tus tropiezos de antaño empiezan a dar fruto. Qué cosecha tan peculiar.",
      "Cada acierto recuperado te hace un poco más difícil de derrotar.",
      "Tu memoria ha vuelto al trabajo. Sin disculpas, pero ha vuelto.",
      "Repasar sirve exactamente para esto: para que el pasado no duela.",
      "Hoy no has borrado errores. Los has convertido en respuestas.",
      "Parece que tus antiguos tropiezos ya no recuerdan cómo ganarte.",
      "Volviste a por las preguntas que te derrotaron. Mala idea para ellas.",
      "Segunda oportunidad para ti. Última para ellas.",
      "Has vuelto al lugar de tus errores. Esta vez sabías dónde mirar.",
      "Lo que antes era un error ahora empieza a parecer conocimiento.",
      "Has vuelto con los deberes hechos. Tus errores, aparentemente, no.",
      "Las preguntas que te derrotaron empiezan a quedarse sin argumentos.",
      "Hoy has venido a cobrar viejas deudas.",
      "El pasado acaba de perder otra batalla.",
      "Repasar no es repetir. Es vengarse con conocimiento.",
      "Tus errores de antes ya no intimidan. Casi les tengo lástima.",
      "Has aprendido exactamente de aquello que antes te hacía fallar.",
      "Has vuelto sobre tus errores y, esta vez, ellos eran los que tenían motivos para preocuparse.",
      "Has vuelto con la lección aprendida. Las preguntas no lo esperaban.",
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
      "Nada grave. Para esto se inventó el Repaso: para gente exactamente como tú.",
      "Hoy no las has dominado. Tampoco ellas a ti. Empate técnico.",
      "Hay preguntas que todavía te conocen demasiado bien.",
      "El error ha sobrevivido. La próxima vez, no debería hacerlo.",
      "Tus errores han pedido una revancha. No tardes en dársela.",
      "Algunas preguntas siguen teniendo tu número.",
      "Has vuelto a por tus errores. Ellos ya te estaban esperando.",
      "El pasado ha demostrado tener mejor memoria que tú.",
      "Hay errores que necesitan otra conversación.",
      "Hay cuentas pendientes. Yo, por cierto, llevo la contabilidad.",
      "No has perdido: has localizado exactamente lo que no sabes. Es un comienzo.",
      "Tus errores no han desaparecido. Solo han tomado posiciones.",
      "La revancha queda pendiente.",
      "Algunas preguntas siguen sin estar dispuestas a perdonarte.",
      "Entre tú y tu memoria hay asuntos sin resolver. Yo, de testigo.",
      "El repaso ha revelado un pequeño problema. Bueno, varios.",
      "Algunas respuestas todavía necesitan que les presentes tus respetos."
    ]
  }
};;

