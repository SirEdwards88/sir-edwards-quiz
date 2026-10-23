// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const END_PHRASES = {
  desastre: { 
    title: "Desastre absoluto", 
    phrases: [
      "El entusiasmo ha estado presente. Los conocimientos, por lo visto, tenían otros compromisos.",
      "Hoy tu cultura general ha optado por comunicarse con gruñidos.",
      "Has convertido un mal resultado en una obra de cierta ambición. No de la que conviene.",
      "Si los errores fueran piezas de museo, hoy necesitaríamos una sala nueva.",
      "Tu cultura general ha guardado un silencio tan solemne que casi parecía deliberado.",
      "Tu resultado demuestra que la confianza puede sobrevivir incluso a la ausencia de conocimientos.",
      "Has fallado con una consistencia admirable. Empieza a parecer deliberado.",
      "Tenía expectativas modestas. Has conseguido que parezcan una imprudencia.",
      "Hay partidas que conviene olvidar. Esta, al menos, ha facilitado la decisión.",
      "Tu cultura general ha solicitado ayuda. La respuesta ha sido una educada negativa.",
      "Has defendido tus errores con una seguridad que muchos reservan para sus aciertos.",
      "Lo admirable no es fallar. Es la seguridad con la que lo has defendido.",
      "El silencio habría sido una respuesta excelente. Lástima que no estuviera entre las opciones.",
      "No diré que haya faltado cultura general. Sería injusto con la palabra «general».",
      "Si los errores generasen intereses, hoy podrías vivir de las rentas.",
      "He visto adivinar con más criterio."
    ] 
  },
  mediocre: { 
    title: "Mediocridad con modales", 
    phrases: [
      "Término medio. Ideal para opinar con aplomo sin que nadie pida pruebas.",
      "El triunfo de la mediocridad: saber lo justo para no asustar y callar lo justo para no molestar.",
      "Estás justo en ese tramo donde la gente te escucha por educación, no por interés.",
      "Has reunido el saber justo para pasar por persona informada. Enhorabuena, supongo.",
      "Has conseguido exactamente lo necesario para no destacar. Un talento poco frecuente.",
      "Un resultado mediocre. Ni siquiera has conseguido decepcionarme con originalidad.",
      "Ni bien ni mal. Un resultado que no alteraría ni el orden de los muebles.",
      "Suficiente para aprobar, insuficiente para convertirlo en una hazaña.",
      "Conocimientos básicos, demostrados. Los avanzados siguen en paradero desconocido.",
      "Un resultado digno. Si por digno entendemos completamente olvidable.",
      "Presente, aunque apenas. Tu cerebro ha fichado y se ha ido a dormir.",
      "No ha sido una catástrofe. Tampoco algo que merezca interrumpir la conversación.",
      "Has salido sin ridículo. No era un objetivo ambicioso, y aun así ha sido por los pelos.",
      "La mediocridad te sienta sorprendentemente bien.",
      "Correcto. Tu mayor mérito ha sido no complicarlo.",
      "Lo justo para recordar que has jugado; no tanto como para recordar cómo.",
      "Hay quien aspira a la excelencia. Tú has apuntado al centro, y con puntería.",
      "Un resultado para describir con «bueno» y cambiar de tema. Sobre todo cambiar de tema.",
      "Has acertado lo bastante para defenderte y fallado lo bastante para que yo disfrute.",
      "Ni bien ni mal. Tu resultado es el encogimiento de hombros hecho puntuación.",
      "Un resultado que sirve tanto para presumir como para disculparse. Tú sabrás cuál toca.",
      "No has dado motivos para una reprimenda seria. No confundas eso con una absolución."
    ] 
  },
  bien: { 
    title: "Bastante bien", 
    phrases: [
      "Bastante bien. Lástima que en las cenas nadie reparta puntos por esto.",
      "Mucha cultura general. Lástima que no sirva para abrir una puerta corredera a la primera.",
      "Sabes mucho. Queda por ver si sabes qué hacer con ello.",
      "Bien. Como un cuadro bonito en una sala vacía: nadie dará la vuelta para mirarlo.",
      "Has pensado antes de responder. Confieso que el método tiene cierto porvenir.",
      "Bastante bien. Lo suficiente para que empiecen a creerte inteligente. No te emociones.",
      "Buen resultado. No temas: mi puesto sigue sin estar en peligro.",
      "Notable. El tipo de resultado que suena mejor cuanto menos se examina.",
      "Muy buen resultado. Una rareza estadística que procuraré vigilar de cerca.",
      "Sabes más de lo que creía. No te preocupes: aún queda margen para decepcionarme.",
      "Has estado sorprendentemente bien. Las preguntas debían de ser fáciles; no veo otra explicación.",
      "Empiezo a sospechar que tienes conocimientos que no figuran en tu expediente.",
      "Un resultado respetable. «Respetable» es lo que se dice cuando no se puede decir «brillante».",
      "Bien. No extraordinario, pero tampoco exigiría que lo devolvieran a cocina.",
      "Una actuación competente. Tendré que acostumbrarme.",
      "Has demostrado que, ocasionalmente, sabes de lo que hablas.",
      "Bien hecho. Te concedo el placer de tener razón hasta la próxima pregunta.",
      "Notable. Ahora procura no sacarlo en cada conversación.",
      "Has conseguido impresionar ligeramente a un hombre muy difícil de impresionar."
    ] 
  },
  casi_perfecto: { 
    title: "Rozando la perfección", 
    phrases: [
      "Muy cerca de la excelencia. La historia, por desgracia, solo recuerda el pleno.",
      "Tan cerca del pleno que hasta duele. El «casi», por desgracia, no se enmarca.",
      "Excelente. Que el pleno se te escape es, en el fondo, una cortesía a los demás.",
      "Has estado a un paso del pleno. Qué lástima que ese paso fuera precisamente el que no diste.",
      "Resultado excelente. La perfección, sin embargo, sigue exigiendo el último trámite.",
      "Extraordinario. El 100% estaba ahí, mirándote. Tú miraste a otra parte un segundo.",
      "Has rozado la perfección. Por lo visto, no estaba de humor para visitas.",
      "Tan cerca de la perfección que hasta ella tendrá que reconocer el esfuerzo."
    ] 
  },
  perfecto: { 
    title: "Pleno perfecto", 
    phrases: [
      "Un pleno absoluto. Lo malo es que ahora no tengo nada que reprocharte, y vivo de eso.",
      "Felicidades por el 100%. Falta por ver a quién se lo cuentas sin que cambie de tema.",
      "Pleno. Ya eres la máxima autoridad en cosas que nadie te preguntará jamás.",
      "Pleno absoluto. Disfrútalo; no todos los días puedo fingir que me has sorprendido.",
      "Pleno. Exijo que revisen las preguntas: algo tan limpio no puede ser trabajo honrado.",
      "Pleno absoluto. Qué desagradable tener que admitir que has sido excelente.",
      "Impecable. Tendré que reconocerlo, aunque no mejore mi jornada.",
      "Perfecto. Hoy, al parecer, has venido con los deberes hechos."
    ] 
  }
};;

const SURVIVAL_FAIL_PHRASES = {
  desastre: [
    "Con este resultado, hasta llegar a la pregunta diez parecía un objetivo ambicioso.",
    "Si hicieran un documental de esta partida, iría directo al género de comedia de terror.",
    "Tus respuestas han tenido una cualidad admirable: ninguna ha interrumpido el silencio con un acierto.",
    "Hoy el progreso intelectual ha hecho una pausa. Larga.",
    "Tu cerebro ha elegido hoy una jornada de huelga. Servicios mínimos: ninguno.",
    "La caída ha sido tan estrepitosa que hasta las neuronas supervivientes han pedido el traslado.",
    "Si la ignorancia diera calambre, ahora mismo estarías iluminando todo el país.",
    "Ni la selección natural encuentra una categoría adecuada para este resultado.",
    "Tu supervivencia terminó exactamente donde empezó a faltar el conocimiento.",
    "La esperanza era tuya. Yo me limité a no interferir en su caída.",
    "Tu resultado tiene una virtud: deja muy poco espacio para la interpretación.",
    "Una racha de errores tan constante merece, al menos, un estudio.",
    "El problema no era la última pregunta. El problema era todo lo anterior.",
    "Has perdido. Te recomendaría una reflexión, pero hoy prefiero no añadir tareas.",
    "Has durado lo que dura una ilusión: poco, y con final previsible.",
    "Has caído tan pronto que apenas he tenido tiempo de adoptar una expresión de preocupación.",
    "La supervivencia no era tu especialidad. Hoy tampoco has ampliado el repertorio."
  ],
  regular: [
    "Has dado lo mejor de ti. Procuraré no preguntar qué habría ocurrido con lo demás.",
    "Tan cerca de la gloria y tan lejos del acierto. Vuelve a intentarlo; aquí seguiré, mirando.",
    "Fin del trayecto. Largo, trágico y, lamentablemente, presenciado por mí.",
    "Un esfuerzo encomiable para un resultado tan tristemente modesto.",
    "Te has detenido ante el último muro. Una pena que no aceptara negociaciones.",
    "Has perdido con excelentes modales. El marcador, por desgracia, carece de educación.",
    "Tuviste oportunidades. La última, en particular, esperaba algo más de ti.",
    "Estabas cerca de sobrevivir. Qué lástima que cerca no cuente.",
    "Has resistido casi hasta el final. El casi, como siempre, tiene una política muy estricta.",
    "Una derrota digna. En este modo, eso ya cuenta como cumplido.",
    "Has caído con cierta elegancia. No demasiada, pero suficiente para mencionarla.",
    "Has perdido con honor. Procura no arruinarlo intentando explicarlo.",
    "Te faltó muy poco. Una distancia que el marcador se ha negado a considerar insignificante.",
    "Has estado a punto de conseguirlo. «A punto» empieza a ser tu expresión favorita.",
    "La actuación fue razonable. El desenlace ha decidido llevarse todo el protagonismo."
  ]
};;

const SUDDEN_FAIL_PHRASES = {
  desastre: [
    "La eliminación ha llegado antes de que hubiera tiempo para presentar alegaciones.",
    "No ha sido una derrota. Ha sido una ejecución académica.",
    "Una sola oportunidad. Has conseguido que parezca una cláusula abusiva.",
    "Eliminación inmediata. Ni siquiera el juego ha pedido una segunda opinión.",
    "El margen de error era cero. Y tú has comprobado que lo decían en serio.",
    "Una vida. Un error. Una conclusión bastante previsible.",
    "Breve. Concisa. Irrevocable. Has escrito el epitafio más corto de la casa.",
    "El juego prometía emoción. Tú has preferido el desenlace."
  ],
  regular: [
    "Estabas a una buena respuesta de seguir en pie. Elegiste la otra.",
    "Has caído en la orilla. La costa, por cortesía, no hará comentarios.",
    "La eliminación ya estaba preparada. Tú has tenido la amabilidad de llegar puntual.",
    "Había varias opciones. Has escogido la única que no deseaba ser elegida.",
    "No te faltó mucho. Te sobró una respuesta equivocada.",
    "Una respuesta distinta y esta frase sería otra. Yo, por mi parte, ya la tenía escrita.",
    "Has gastado tu única vida en esa respuesta. Espero que al menos te cayera simpática.",
    "La partida terminó cuando decidiste confiar en esa respuesta. La confianza, al menos, fue absoluta."
  ]
};;

const TIMETRIAL_END_PHRASES = {
  mal: [
    "El tiempo se ha acabado antes de que llegara la inspiración.",
    "Conviene mirar el reloj de vez en cuando. No es un adorno, aunque tenga cadena.",
    "El reloj tenía un plan. Tú no.",
    "Mucho tiempo al principio. Muy poco conocimiento al final.",
    "El reloj no te ha ganado. Se ha limitado a esperar a que te ganases tú.",
    "El tiempo corría con diligencia. Tus respuestas han preferido una jornada más relajada.",
    "El tiempo corría. Tú, intentando recordar algo que nunca supiste.",
    "El cronómetro ha terminado su trabajo. Tú no has llegado a empezar el tuyo.",
    "El cronómetro no admite objeciones. Tu resultado, por desgracia, tampoco las necesita.",
    "Con más tiempo quizá habrías terminado. No me atrevo a precisar en qué siglo.",
    "El reloj no se equivocó ni una vez. No puedo decir lo mismo de ti.",
    "El tiempo no esperaba. Tú, aparentemente, sí."
  ],
  normal: [
    "El reloj ha cumplido. Tú has presentado una versión abreviada del esfuerzo.",
    "No había tiempo para pensar y has actuado en consecuencia. Con resultados proporcionales.",
    "El tiempo no perdona. Las malas respuestas tampoco.",
    "Has sobrevivido al reloj. Por poco.",
    "No has dominado el reloj. Al menos, habéis terminado sin necesidad de mediación.",
    "Ritmo aceptable. Conocimiento discutible. Resultado razonablemente sólido.",
    "Has ido rápido. No siempre en la dirección correcta.",
    "No ha sido brillante, pero al menos el reloj no se ha reído.",
    "Has mantenido el ritmo. En esta casa, terminar sin alarmar al servicio ya es una cortesía.",
    "Ni brillante ni desastroso. El tipo de resultado que permite seguir con la conversación.",
    "El reloj ha terminado. Tu dignidad, por los pelos, también.",
    "Un ritmo competente. La palabra «competente» tendrá que bastar por hoy.",
    "Habéis llegado a un acuerdo: el reloj se queda con el tiempo y tú con las explicaciones."
  ],
  bien: [
    "El tiempo corría, pero tú más.",
    "El reloj ha perdido. Tú no.",
    "No sé qué has hecho, pero el reloj ha pedido que no se repita.",
    "Has ido tan deprisa que el tiempo ha tenido que comprobar sus propias cuentas.",
    "Has respondido tan deprisa que he tenido que revisar si las preguntas eran las mismas.",
    "Se acabó el tiempo. Por una vez, tú no has necesitado más.",
    "Velocidad y conocimiento, al parecer. No esperaba que ambos se presentaran juntos.",
    "El cronómetro marcaba segundos. Tú marcabas diferencias.",
    "Velocidad, precisión y conocimiento. Casi parece que hubieras leído las instrucciones.",
    "Has terminado antes que el tiempo. Por supuesto.",
    "Has tratado el cronómetro como un mero trámite. Me temo que empieza a tomárselo como algo personal.",
    "Has respondido antes de que el cronómetro pudiera formular una queja. Un detalle de cortesía.",
    "Un ritmo excelente. El cronómetro está reconsiderando sus opciones."
  ]
};;

const MENTAL_CALC_END_PHRASES = {
  mal: [
    "Las matemáticas han ganado. Para ser justos, no tenían rival.",
    "Quizá la calculadora no era tan mala idea.",
    "El resultado es incorrecto. La confianza con que lo has defendido merece estudio aparte.",
    "Había números. Tú estabas allí. No fue suficiente.",
    "Tu cerebro ha solicitado una excedencia. La aritmética, en cambio, sigue de servicio.",
    "Los números siguen ahí. Tu capacidad para entenderlos, ni rastro.",
    "La cuenta daba un resultado. Tú has preferido otro, por originalidad.",
    "Has calculado por intuición. Un método audaz, siempre que no se necesite el resultado correcto.",
    "Eran números, no jeroglíficos. Has complicado hasta lo obvio.",
    "La suma ha pedido explicaciones. Te recomiendo que respondas por escrito y con ayuda.",
    "La aritmética ha salido indemne. No puedo garantizar lo mismo de tu reputación como calculista."
  ],
  normal: [
    "No sé cómo has llegado a ese resultado, pero las matemáticas han decidido no recurrir.",
    "Tu cerebro ha hecho horas extra. Espero que haya negociado una remuneración decente.",
    "No has calculado: has abierto una negociación con los números y aceptado la primera oferta.",
    "No has derrotado a las matemáticas, pero has conseguido que te toleren.",
    "No ha sido bonito, pero el resultado puede defenderse sin llamar a un abogado.",
    "Tu relación con la aritmética es cordial. No os invitaría a compartir vacaciones.",
    "Algunas cuentas salieron. Otras salieron de paseo.",
    "Ni un desastre ni un cálculo digno de enmarcar. Las sumas, al menos, no se han quejado."
  ],
  bien: [
    "Has resuelto las cuentas. No habrá celebración oficial; procuraré que la noticia no se filtre.",
    "Los números te esperaban con malas intenciones. Se han ido con las manos vacías.",
    "Has hecho matemáticas por voluntad propia. No quisiera sacar conclusiones precipitadas, pero tomaré nota.",
    "Cálculo mental sin sudor. Si además lo has disfrutado, tendremos que revisar el reglamento.",
    "Las matemáticas te han dejado pasar. Ahora esperarán que vuelvas a hacerlo.",
    "Resultado exacto. La precisión tiene algo de insolencia cuando se ejerce sin esfuerzo.",
    "Has convertido las operaciones en un trámite. Procura no solicitar que te las sellen.",
    "Los números han dejado de discutir contigo. No descarto que estén preparando una apelación.",
    "No necesitas calculadora. La calculadora te necesita a ti.",
    "Cálculo mental impecable. Ahora intenta hacerlo sin presumir.",
    "Los números han cooperado. No pienso preguntar qué les has prometido.",
    "Precisión admirable. Hasta los números se han puesto firmes, y no es lo habitual contigo.",
    "Has resuelto las cuentas antes de que pudieran convertirse en un problema.",
    "Has hecho que la aritmética parezca sencilla. Qué arrogancia tan justificada.",
    "Correcto y rápido. Tendré que buscar otro defecto que señalar."
  ]
};;

const LUCIDEZ_END_PHRASES = {
  derrota: [
    'La lucidez llamó a la puerta. Tu respuesta consiguió que se marchara.',
    'El conocimiento estaba ahí. La respuesta, aparentemente, estaba de vacaciones.',
    'Lucidez mental: temporalmente fuera de servicio.',
    'El umbral estaba delante de ti. Al parecer, también había una pared.',
    'La respuesta correcta existía. Tú y ella decidisteis no conoceros.',
    'Has demostrado una gran capacidad para generar respuestas alternativas.',
    'Tu confianza era de 10/10. El resultado decidió ser más realista.',
    'El cerebro es un órgano fascinante. Hoy, sobre todo, por lo que se ha negado a hacer.',
    'La lucidez pasó por aquí. Dejó una nota diciendo que no te esperaba.',
    'Has llegado hasta el límite. El límite te ha mirado con cierta lástima.',
    'Has llegado muy lejos para caer justo al final. Un talento peculiar.',
    'La respuesta estaba al alcance. La lucidez, no.',
    'No ha sido falta de conocimiento. Ha sido falta de cabeza, que es bastante más difícil de arreglar.',
    'Una duda. Una sola. Y has demostrado con ella de qué material estás hecho.',
    'Has llegado al umbral. Y has decidido admirarlo desde fuera.',
    'Tu confianza llegó hasta el final. Tus respuestas, no.',
    'Todo iba perfectamente. Entonces empezaste a responder.',
    'La respuesta estaba en algún rincón de tu cabeza. El servicio de habitaciones no ha sabido localizarla.'
  ],
  victoria: [
    'Lucidez Mental completada. La humildad puede esperar cinco minutos.',
    'Enhorabuena. Hoy hasta las respuestas difíciles te han tratado con respeto.',
    'Impecable. Cuesta no sentir cierta antipatía.',
    'Brillante. Voy a procurar que no se note cuánto me cuesta admitirlo.',
    'La lucidez es tuya. Por ahora.',
    'Excelente. Ni un tropiezo. Empiezo a sospechar que conocías el recorrido.',
    'Has demostrado lucidez aquí. Por prudencia, limitaré el certificado a estas instalaciones.',
    'Superado. Ya puedes decir «lo sabía» con cierta legitimidad.',
    'Has atravesado el límite. Intenta no mirar atrás: queda feo presumir.',
    'La mente no cedió. Tú tampoco.',
    'Has llegado al final con la cabeza fría. Tendré que averiguar en qué nevera la guardas.',
    'Tres fases y un juicio final. La duda ha perdido; tu vanidad, de rebote, ha ganado.',
    'La presión aumentó. Tu lucidez también.',
    'Pensar bajo presión es poco habitual. Hacerlo bien y sin alboroto resulta casi descortés.',
    'No era solo conocimiento. Era sangre fría, que es más raro y menos agradecido.',
    'Has pensado antes de responder. No quisiera que el precedente sentara jurisprudencia.',
    'El último obstáculo ha caído. La corona es de cartón, pero luce.',
    'La puerta estaba cerrada. La respuesta era la llave. Lo difícil era recordar que la llevabas.',
    'Lucidez demostrada. Ahora procura no volverte insoportable.'
  ]
};;

const LUCIDEZ_PERFECT_PHRASES = [
  '30/30. Queda probado que todo ese tiempo jugando no ha sido en balde.',
  '30/30. Esto ya no es lucidez: es una ofensa estadística.',
  '30/30. Ninguna duda pendiente. Me temo que tendré que conformarme con felicitarte.',
  '30/30. Ni un solo desvío. Me pregunto de dónde sacas la brújula.',
  '30/30. Tu cabeza ha trabajado con una diligencia impropia de alguien a quien suelo supervisar.',
  '30/30. Un resultado tan limpio que mi instinto de sospecha se ha quedado sin ocupación.',
  '30/30. O has estudiado, o alguien ha estado suplantando tu criterio habitual.',
  '30/30. La cúspide mental es tuya. Cuidado con la altura: se respira mal y se habla de más.',
  '30/30. Has dejado a la mente humana en muy buen lugar. A mí, en uno peor.',
  '30/30. Tu mente ha hablado y, para colmo, tenía razón.',
  '30/30. No queda ninguna pregunta pendiente. Solo la duda de qué haces con tanto conocimiento.',
  '30/30. Se me han acabado las exigencias. Lo digo con enorme resentimiento.',
  '30/30. Por una vez, no hay un «casi» que añadir.',
  'Perfecto. Empiezo a echar de menos tus errores.',
  'Treinta respuestas impecables. Voy a tener que actualizar mi opinión sobre ti.',
  'Perfecto. Por una vez, incluso yo tendré que limitarme a asentir.'
];;

const SURVIVAL_WIN_PHRASES = [
  "Has ganado. Disfruta de tu autoridad provisional; caduca al comenzar la siguiente partida.",
  "Victoria magistral. Un despliegue de intelecto que, con suerte, nunca tendrás que usar en la vida real.",
  "Victoria total. En algún lugar, un trofeo imaginario ensaya su discurso de bienvenida.",
  "Lo has conseguido. Ahora queda encontrar a alguien dispuesto a escucharlo.",
  "La prueba exigía conocimientos. Tú aportaste resistencia. Técnicamente, funcionó.",
  "Has llegado al final. Que nadie confunda la supervivencia con el talento. Yo, el primero.",
  "Has llegado al final con vida. La estadística, que esperaba otra cosa, pide disculpas.",
  "Has sobrevivido. Descansa: mañana volverán las preguntas y fingirán no conocerte.",
  "Has sobrevivido. Contra todo pronóstico, incluido el mío.",
  "Victoria. Voy a tener que retirar un par de comentarios.",
  "Has sobrevivido. No necesariamente con elegancia, pero sí con resultados.",
  "Una victoria merecida. Procura no convertirla en una leyenda personal.",
  "Cuarenta preguntas y sigues en pie. Mis condolencias a quienes apostaron en contra."
];;

const SUDDEN_WIN_PHRASES = [
  "Un logro impecable. Procura lucirlo con discreción; la discreción también tiene sus admiradores.",
  "Has completado el modo extremo. Añádelo al currículum: nadie te lo preguntará, pero constará.",
  "Prueba superada. Un talento sin utilidad práctica, pero impecable.",
  "Cero errores. Has arruinado una ocasión excelente para darme la razón.",
  "No había margen para fallar. Has tenido la cortesía de no ponerlo a prueba.",
  "La siguiente pregunta podía eliminarte. Decidiste eliminarla tú primero.",
  "Has llegado al final sin pestañear. La muerte súbita tendrá que esperar.",
  "Muerte súbita. Para alguien más.",
  "No te has limitado a sobrevivir al límite: lo has dejado en ridículo.",
  "Eliminación evitada. El suspense tendrá que buscar otro empleo.",
  "Sin segunda oportunidad y sin necesitarla. Tanta eficiencia roza la mala educación.",
  "Una vida y todas las preguntas contestadas. Por fin, alguien que cuida lo que tiene.",
  "No has concedido al error ni una oportunidad. Empiezo a comprender por qué está tan resentido.",
  "La muerte súbita esperaba una escena memorable. Tendrá que conformarse con tu ausencia de errores."
];;

const REVIEW_END_PHRASES = {
  progreso: {
    title: 'Los errores caen',
    phrases: [
      "Los errores de ayer son los aciertos de hoy. Una rehabilitación que no requiere abogado.",
      "Una pregunta fallada, una pregunta aprendida. Por fin cobras algo de tus fracasos.",
      "Has vuelto a corregir tus errores. La memoria, al fin, recibe instrucciones.",
      "Cada error corregido reduce el material disponible para mis observaciones. Qué pérdida.",
      "El conocimiento también se construye con escombros. Hoy hay material de sobra.",
      "Ayer te vencieron. Hoy, al menos, has aprendido a reconocer al enemigo.",
      "Tus errores están empezando a quedarse sin sitio donde esconderse.",
      "Tus tropiezos de antaño empiezan a dar fruto. Una cosecha bastante peculiar.",
      "Tu memoria ha vuelto al trabajo. Sin disculpas, pero ha vuelto.",
      "Hoy no has borrado errores. Los has convertido en respuestas.",
      "Segunda oportunidad para ti. Última para ellas.",
      "Has vuelto al lugar de tus errores. Esta vez sabías dónde mirar.",
      "Has vuelto con los deberes hechos. Tus errores aún están intentando justificar la ausencia.",
      "Has venido a cobrar viejas deudas. Casi todas, por cierto, eran contigo mismo.",
      "El pasado acaba de perder otra batalla.",
      "Repasar no es repetir. Es vengarse con conocimiento.",
      "Tus errores de antes ya no intimidan. Empiezo a tenerles lástima.",
      "Has aprendido lo que antes ignorabas. Una proeza menor, pero sin precedentes.",
      "Has vuelto sobre tus errores. Hoy han sido ellos quienes han tenido que estudiar.",
      "Has corregido el pasado con bastante elegancia. La misma que te faltó al cometerlo.",
      "Las preguntas recordaban tu antiguo rendimiento. Error suyo."
    ]
  },
  insuficiente: {
    title: 'Los errores resisten',
    phrases: [
      "Hay errores que ni se inmutan cuando apareces. Tienen motivos.",
      "Quedan fallos por convertir en respuestas. Una cantidad que, por piedad, no voy a cuantificar.",
      "Nada grave: para esto se inventó el Repaso. Para los que no aprenden a la primera.",
      "Hoy no las has dominado. Tampoco ellas a ti. Tablas.",
      "Hay preguntas que te conocen demasiado bien. Te sugiero revisar qué les has contado.",
      "El error ha sobrevivido. Algún día os separaréis, pero no será hoy.",
      "Has vuelto a por tus errores. Ellos ya te estaban esperando.",
      "El pasado ha demostrado tener mejor memoria que tú.",
      "Hay errores que necesitan otra conversación. Y esta vez conviene que prestes atención.",
      "Hay cuentas pendientes. Qué tranquilidad saber que alguien lleva los libros.",
      "Ya sabes lo que ignoras. Ahora falta resolver el resto del inventario.",
      "Tus errores no han desaparecido. Solo han tomado posiciones.",
      "El Repaso ha hallado un problema. Ha pedido que no lo llamemos pequeño.",
      "Algunas respuestas todavía necesitan que les presentes tus respetos."
    ]
  }
};;

