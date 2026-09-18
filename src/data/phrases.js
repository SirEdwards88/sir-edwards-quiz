// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const END_PHRASES = {
  desastre: { 
    title: "Desastre absoluto", 
    phrases: [
      "Se nota que le has puesto ganas, lástima que la inteligencia no se solucione solo con buena voluntad.",
      "Tienes la cultura general justa para no pedir las cosas señalando con la mano y emitiendo gruñidos.",
      "Tu resultado demuestra que saber poco también requiere constancia."
    ] 
  },
  mediocre: { 
    title: "Mediocridad neutra", 
    phrases: [
      "Ni fu ni fa: perfectamente preparado para ver la tele de noche y tragar propaganda sin protestar.",
      "El triunfo de la absoluta mediocridad: ni tan tonto como para asustar, ni tan listo como para molestar.",
      "El resultado perfecto para pasar completamente desapercibido en cualquier sitio.",
      "Estás justo en ese tramo donde la gente te escucha por educación, no por interés.",
      "Has cumplido con el expediente mínimo para no parecer un analfabeto funcional. Enhorabuena, supongo.",
      "Has conseguido exactamente lo necesario para no destacar. Un talento poco frecuente.",
      "Un resultado perfectamente mediocre. Ni siquiera has tenido la cortesía de decepcionar.",
      "No está mal. Tampoco está bien. Has encontrado el punto exacto donde nadie espera nada de ti.",
      "Suficiente para aprobar, insuficiente para tener una opinión interesante.",
      "Has demostrado conocimientos básicos y una alarmante falta de ambición.",
      "Un resultado digno. Si por digno entendemos completamente olvidable."
    ] 
  },
  bien: { 
    title: "Bastante bien", 
    phrases: [
      "Bastante bien. Se nota que pasas demasiado tiempo solo y que nadie te invita a salir de fiesta.",
      "Mucha cultura general, pero apuesto a que tardas tres intentos en adivinar por dónde se abre una puerta corredera.",
      "Sabiendo tanto, es un misterio cómo consigues tomar decisiones tan malas en tu día a día.",
      "A un paso de la perfección, que es exactamente la distancia a la que te quedas siempre de todo.",
      "Has conseguido que pensar parezca una habilidad. Qué sorpresa.",
      "Bastante bien. Lo suficiente para que empiecen a creerte inteligente. No te emociones.",
      "Buen resultado. Ahora solo falta conseguir que ese conocimiento te sirva para algo.",
      "Has demostrado que sabes bastante. Una pena que la vida no funcione con preguntas tipo test.",
      "Notable. El tipo de resultado que te permite presumir sin que nadie pueda comprobarlo.",
      "Muy buen resultado. Lástima que el sentido común no estuviera entre las preguntas.",
      "Sabes más de lo que aparentas. Tampoco era un listón especialmente alto.",
      "Has estado sorprendentemente bien. Sospecho que las preguntas eran demasiado fáciles."
    ] 
  },
  casi_perfecto: { 
    title: "Rozando la perfección", 
    phrases: [
      "Muy cerca de la excelencia, pero la historia solo se acuerda de los que llegan al final.",
      "Rozar la gloria y ahogarte en la orilla: una metáfora perfecta de toda tu trayectoria.",
      "Tan cerca del pleno que hasta duele. Una lástima que el mérito no se pueda enmarcar.",
      "Te ha faltado un suspiro para la perfección, justo el mismo suspiro que te falta para todo lo demás en la vida.",
      "Casi perfecto. 'Casi' es la palabra que mejor te define, la verdad.",
      "Has rozado la perfección con tanta elegancia que casi parece que lo haces a propósito.",
      "Has estado a un paso del pleno. Qué lástima que ese paso fuera precisamente el que no diste.",
      "Has jugado a nivel de excelencia. Lástima que la excelencia no redondee resultados.",
      "Un resultado extraordinario. El 100% estaba ahí, mirándote. Tú decidiste dejarlo escapar."
    ] 
  },
  perfecto: { 
    title: "Pleno perfecto", 
    phrases: [
      "Un pleno absoluto. La parte mala es que has malgastado lo mejor de tu vida acumulando datos inútiles.",
      "Felicidades por el 100%. Ahora sal a la calle a ver si encuentras a alguien a quien le importe.",
      "Victoria absoluta. Eres el rey indiscutible de un castillo hecho de datos totalmente inservibles.",
      "Felicidades por saber tanto de todo y, aun así, seguir sin aportarle nada relevante al mundo.",
      "100%. Enhorabuena. Has demostrado que el conocimiento inútil también puede alcanzar la excelencia."
    ] 
  }
};;

const SURVIVAL_FAIL_PHRASES = {
  desastre: [
    "Tienes el nivel cultural justo para no mearte encima por la calle, y a veces hasta lo dudo.",
    "Si hicieran un documental de tu capacidad intelectual, iría directo al género de comedia de terror.",
    "Tu cerebro está tan vacío que si soplas fuerte por una oreja te silba la otra.",
    "Has demostrado que la evolución a veces da marcha atrás.",
    "Tu cerebro decidió hacer huelga general justo en el peor momento posible.",
    "La caída ha sido tan estrepitosa que hasta las neuronas supervivientes han pedido el traslado.",
    "Si la ignorancia diera calambre, ahora mismo estarías iluminando todo el país.",
    "Si te dieran un euro por cada neurona activa, te faltaría dinero para pagar el autobús.",
    "Ni la selección natural se explica cómo has conseguido llegar con vida hasta el día de hoy."
  ],
  regular: [
    "Fin del juego. Tu cerebro acaba de solicitar la baja voluntaria por estrés ante tanta exigencia.",
    "Tan cerca de la gloria y tan lejos del sentido común. Vuelve a intentarlo cuando evoluciones un poco.",
    "Fin del trayecto. Tu paso por este modo ha sido tan breve como memorable por lo trágico.",
    "Un esfuerzo encomiable para un intelecto tan tristemente modesto.",
    "Te has estampado contra el muro de la incompetencia. Y lo peor es que ibas sin casco.",
    "Te has acercado a la victoria por pura estadística, como un chimpancé tecleando al azar.",
    "Estás rozando la victoria, igual que rozas el entendimiento humano en tu día a día.",
    "No has caído por falta de oportunidades. Has caído por insistir en respuestas absurdas.",
    "Estabas cerca de sobrevivir. Qué lástima que cerca no cuente.",
    "Has aguantado hasta el final para morir exactamente donde se esperaba.",
    "Una derrota digna. Lo cual, en este modo, ya es casi un cumplido."
  ]
};;

const SUDDEN_FAIL_PHRASES = {
  desastre: [
    "Una oportunidad era todo lo que tenías. Decidiste desperdiciarla.",
    "Has sido eliminado antes de que tu cerebro pudiera presentar alegaciones.",
    "No ha sido una derrota. Ha sido una ejecución académica.",
    "La muerte fue súbita. El fracaso, bastante más lento.",
    "Una sola oportunidad. Y conseguiste hacerla parecer demasiadas.",
    "Eliminado. Ni siquiera el juego ha considerado necesario pedir una segunda opinión."
  ],
  regular: [
    "Estabas a una buena respuesta de seguir vivo. Elegiste la otra.",
    "Has muerto en la orilla. Técnicamente, seguías nadando.",
    "La eliminación estaba cerca. Tú te acercaste voluntariamente.",
    "Tenías opciones. El problema es que escogiste las incorrectas.",
    "No te faltó mucho. Te sobró una respuesta equivocada.",
    "Una pregunta más y quizá habría sido distinto. Qué pena que no haya una.",
    "Una vida. Una oportunidad. Y has conseguido gastar ambas en la misma pregunta."
  ]
};;

const TIMETRIAL_END_PHRASES = {
  mal: [
    "El tiempo se ha acabado antes de que llegara la inspiración.",
    "Quizá la próxima vez deberías mirar el reloj.",
    "Has perdido contra un reloj. Piénsalo.",
    "El reloj tenía un plan. Tú no.",
    "Mucho tiempo al principio. Muy poco conocimiento al final.",
    "El reloj no te ha ganado. Tú simplemente le has dado demasiado tiempo.",
    "60 segundos. Suficientes para demostrar que pensar rápido no era tu especialidad.",
    "El tiempo corría. Tú estabas ocupado intentando recordar.",
    "Has perdido contra un instrumento diseñado para medir segundos. Reflexiona sobre eso.",
    "El cronómetro ha terminado su trabajo. Tú no llegaste a empezar el tuyo.",
    "El tiempo se agotó. La inspiración sigue en paradero desconocido."
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
    "Has conseguido mantener el ritmo. El mérito está en no entrar en pánico."
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
    "Has respondido tan rápido que por un momento el tiempo parecía estar de tu lado."
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
    "Los números han hablado. Tú no tenías argumentos.",
    "La aritmética ha ganado por una diferencia preocupante.",
    "Tu relación con los números necesita intervención profesional.",
    "Has visto una operación matemática y has decidido confiar en la intuición. Valiente.",
    "Los números eran sencillos. La tragedia no."
  ],
  normal: [
    "Sumar, restar y sobrevivir. Un éxito completo.",
    "No sabemos cómo lo has calculado, pero legalmente cuenta.",
    "Tu cerebro ha hecho horas extra. No se lo cuentes a nadie.",
    "No ha sido cálculo mental. Ha sido negociación con los números.",
    "La calculadora humana todavía está en fase beta.",
    "No has derrotado a las matemáticas, pero al menos habéis llegado a un acuerdo.",
    "Cálculo mental aprobado. Con reservas.",
    "Los números han intentado hundirte. Has negociado una tregua.",
    "No ha sido bonito, pero matemáticamente sigue siendo defendible.",
    "Tu cerebro ha trabajado. Exige vacaciones."
  ],
  bien: [
    "Tu cerebro todavía funciona. De momento.",
    "Los números no han podido contigo.",
    "Operación completada con éxito. Sorprendentemente.",
    "Has hecho matemáticas voluntariamente. Deberíamos preocuparnos.",
    "Quién necesita una calculadora cuando tiene… esto.",
    "Las matemáticas te han dejado pasar. Esta vez.",
    "Resultado exacto. Sospechosamente exacto.",
    "Has convertido las operaciones en trámite.",
    "Los números han dejado de discutir contigo.",
    "No necesitas calculadora. La calculadora te necesita a ti.",
    "Cálculo mental impecable. Ahora intenta hacerlo sin presumir.",
    "Las matemáticas te han visto venir y han decidido no complicarse.",
    "Has hecho las cuentas de cabeza. La calculadora puede empezar a buscar trabajo."
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
    'La lucidez estaba cerca. Pero no era suficiente.',
    'La mente llegó hasta el límite. Y el límite ganó.',
    'Has llegado demasiado lejos para caer tan cerca.',
    'La respuesta estaba al alcance. La lucidez, no.',
    'El conocimiento te trajo hasta aquí. Esta vez no pudo llevarte más lejos.',
    'La presión terminó haciendo su trabajo.',
    'No era falta de conocimiento. Era falta de lucidez en el momento exacto.',
    'La mente duda una vez. Esta vez fue suficiente.',
    'Llegaste al umbral. No conseguiste cruzarlo.',
    'La lucidez ha abandonado la sala. No ha dejado explicación.',
    'Tu confianza llegó hasta el final. Tus respuestas, no.',
    'Todo iba perfectamente. Entonces empezaste a responder.',
    'Tenías un plan. La pregunta tenía otro.',
    'La mente pidió cinco segundos más. El juego decidió que no.'
  ],
  victoria: [
    'Lucidez Mental completada. La humildad puede esperar cinco minutos.',
    'Enhorabuena. Hoy hasta tus respuestas parecen inteligentes.',
    'Impecable. Sospechosamente impecable.',
    'Brillante. Casi empieza a ser incómodo.',
    'La lucidez es tuya. Por ahora.',
    'Excelente. Parece que hoy sí había alguien al volante.',
    'Has demostrado que puedes pensar bajo presión. El resto de tu vida ya es asunto tuyo.',
    'Perfecto. Ya tienes permiso para decir "te lo dije".',
    'Has atravesado el límite. La lucidez es tuya.',
    'La mente no cedió. Tú tampoco.',
    'Has llegado hasta el final manteniendo la cabeza fría.',
    'Tres fases. Un último juicio. Ninguna duda.',
    'La presión aumentó. Tu lucidez también.',
    'Has demostrado que puedes pensar cuando pensar importa.',
    'No era solo conocimiento. Era lucidez pura.',
    'Has demostrado que saber no basta. También hay que saber pensar.',
    'La prueba ha terminado. La mente permanece intacta.',
    'El último obstáculo ha caído. La lucidez te corona.',
    'Has visto lo que ocurre cuando la mente no cede.',
    'Has llegado donde pocos se atreven a pisar.',
    'La puerta estaba cerrada. La respuesta era la llave maestra.'
  ]
};;

const LUCIDEZ_PERFECT_PHRASES = [
  '30/30. Por fin una prueba de que todo ese tiempo jugando al quiz servía para algo.',
  '30/30. Ahora sí puedes decir que has visto el otro lado.',
  '30/30. La lucidez absoluta no se encuentra; se demuestra golpe a golpe.',
  '30/30. No ha quedado ninguna duda. Tampoco ninguna pregunta.',
  '30/30. Has llegado hasta el final sin perder el norte en ningún momento.',
  '30/30. No hay nada que corregir. Esto empieza a resultar personalmente ofensivo.',
  '30/30. Has procesado más datos que el servidor que aloja este juego. Descansa.',
  '30/30. Alguien debería vigilarte; la gente normal no hace esto.',
  '30/30. Hoy no has encontrado las respuestas. Las has construido desde cero.',
  '30/30. Ninguna duda. Ningún tropiezo. Ningún límite.',
  '30/30. La prueba ha terminado. La cúspide mental es tuya.',
  '30/30. Has demostrado que la mente humana puede ir mucho más lejos.',
  '30/30. La mente ha hablado. Y esta vez tenía razón.',
  '30/30. No queda ninguna pregunta pendiente. Solo la duda de qué haces con tanto conocimiento.',
  '30/30. Has llevado la lucidez hasta donde el juego ya no puede exigirte más.',
  '30/30. Perfecto. Por una vez, no hay un \'casi\' que añadir.'
];;

const SURVIVAL_WIN_PHRASES = [
  "Has ganado. Felicidades: ahora eres oficialmente el más listo de los desocupados. ¿Y ahora qué?",
  "¡Victoria magistral! Un despliegue de intelecto tan brutal que seguro no te servirá absolutamente para nada en tu vida real.",
  "Victoria total. En algún lugar, un trofeo se pregunta si de verdad quiere que lo tengas tú.",
  "Lo has conseguido. Ahora toca decidir a quién le vas a aburrir contándoselo.",
  "Enhorabuena, campeón. El mundo real sigue sin enterarse ni le importa.",
  "Has sobrevivido. No sabemos cómo, pero tampoco queremos investigar demasiado.",
  "La prueba exigía conocimientos. Tú aportaste resistencia. Técnicamente, funcionó.",
  "Sobrevivir no significa que lo hayas hecho bien. Solo significa que sigues aquí.",
  "Has llegado al final con vida. Las respuestas correctas, en cambio, han sido bastante más escasas.",
  "El combate ha terminado. Las neuronas que quedan pueden descansar.",
  "Has sobrevivido. Contra todo pronóstico, incluido el nuestro."
];;

const SUDDEN_WIN_PHRASES = [
  "Un logro impecable, construido sobre cientos de horas que nunca vas a recuperar.",
  "Has completado el modo extremo. Guárdate esta victoria en el currículum, seguro que a tus amigos les da igual.",
  "Has completado la prueba más dura. Impresionante despliegue de talento inútil; ya puedes ir a presumir ante nadie.",
  "Una oportunidad. Cero errores. Así es como se sobrevive a la muerte súbita.",
  "No había margen para fallar. Por algún motivo, tampoco lo necesitaste.",
  "La siguiente pregunta podía eliminarte. Decidiste eliminarla tú primero.",
  "Has llegado al final sin pestañear. El resto ya puede volver a intentarlo.",
  "Muerte súbita. Para alguien más.",
  "Una sola vida. Una sola oportunidad. Una victoria bastante incómoda para los demás.",
  "No has sobrevivido al límite. Has hecho que el límite parezca ridículo.",
  "Eliminación evitada. Humillación ajena confirmada.",
  "No has tenido una segunda oportunidad. Has decidido que tampoco hacía falta."
];;

const REVIEW_END_PHRASES = {
  progreso: {
    title: 'Los errores caen',
    phrases: [
      "Los errores de ayer son las respuestas de hoy.",
      "Una pregunta fallada. Una pregunta aprendida.",
      "No has venido a acertar. Has venido a aprender.",
      "Cada error corregido es una pregunta menos que volverá a pillarte.",
      "El conocimiento se construye también desde los fallos.",
      "Lo que ayer fallaste, hoy ya no te vuelve a engañar.",
      "Tus errores están empezando a quedarse sin sitio donde esconderse.",
      "Lo que ayer te venció, hoy ya no.",
      "Los tropiezos del pasado ya empiezan a dar frutos.",
      "Cada acierto recuperado te hace un poco más difícil de derrotar.",
      "Tu memoria está haciendo su trabajo.",
      "Repasar sirve exactamente para esto: para que el pasado no duela.",
      "Hoy no has borrado errores. Los has convertido en respuestas.",
      "Parece que tus antiguos tropiezos ya no recuerdan cómo ganarte.",
      "Volviste a por las preguntas que te derrotaron. Mala idea para ellas.",
      "Segunda oportunidad para las preguntas. Última oportunidad para ellas.",
      "Has vuelto al lugar de tus errores. Esta vez sabías dónde mirar.",
      "Lo que antes era un error ahora empieza a parecer conocimiento.",
      "Has vuelto preparado. Tus errores, aparentemente, no.",
      "Las preguntas que te derrotaron empiezan a quedarse sin argumentos.",
      "Hoy has venido a cobrar viejas deudas.",
      "El pasado acaba de perder otra batalla.",
      "Repasar no es repetir. Es vengarse con conocimiento.",
      "Tus antiguos errores ya no tienen el mismo poder.",
      "Has aprendido exactamente de aquello que antes te hacía fallar.",
      "Has vuelto sobre tus errores y, esta vez, ellos eran los que tenían motivos para preocuparse."
    ]
  },
  insuficiente: {
    title: 'Los errores resisten',
    phrases: [
      "Todavía hay errores que no quieren rendirse.",
      "Algunas preguntas siguen sabiendo exactamente dónde hacerte daño.",
      "Todavía quedan fallos por convertir en respuestas.",
      "No pasa nada. Precisamente por esto existe el modo Repaso.",
      "Hoy no las has dominado. Pero ahora sabes cuáles son sus trucos.",
      "Hay preguntas que todavía te conocen demasiado bien.",
      "El error ha sobrevivido. La próxima vez, no debería hacerlo.",
      "Tus errores han pedido una revancha. No tardes en dársela.",
      "Algunas preguntas siguen teniendo tu número.",
      "Has vuelto a por tus errores. Ellos ya te estaban esperando.",
      "El pasado ha demostrado tener mejor memoria que tú.",
      "Hay errores que necesitan otra conversación.",
      "Todavía quedan cuentas pendientes.",
      "No has perdido. Has identificado qué necesitas volver a machacar.",
      "Tus errores no han desaparecido. Solo han tomado posiciones.",
      "La revancha queda pendiente."
    ]
  }
};;

