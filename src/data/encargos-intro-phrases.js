// SirEdwards Quiz — Presentación de los Encargos: frases de Sir Edwards. Script clásico (global ENCARGOS_INTRO).
// Todas rotan con pickRotatingPhrase (bolsa persistente: no se repite ninguna hasta haberlas visto todas).
//   · result: la línea que sigue a «Una partida terminada.» según cómo fue la PRIMERA partida (o Duelo/Reto) del jugador.
//   · monday: la carta semanal (sale la primera vez que se abre Inicio en una semana nueva; abre «Es lunes.» si es lunes, «Nueva semana.» si no;
//     luego veredicto y comentario según la semana pasada (aprobación / reproche / incorporación) o según una ausencia de 3 semanas o más
//     (ausencia), y un cierre común: tres bolsas rotativas
//     independientes. «Cuatro de cuatro» solo aparece en el veredicto de aprobación.
// Sin emojis. Las claves de result coinciden con SEQEncargosIntroCore.classify().

const ENCARGOS_INTRO = {
  result: {
    buena: [
      'Sorprendentemente decente.',
      'Mejor de lo que cabía esperar. Y yo esperaba poco.',
      'No ha estado mal. Detesto decirlo, pero ahí queda.',
      'Una buena actuación. No arruines la estadística intentando repetirla.',
      'Un resultado respetable. Lo pronuncio con cautela y sin testigos.',
      'Interesante. Casi creo que sabes lo que haces. Casi.'
    ],
    normal: [
      'Digamos que ha sido… instructiva.',
      'Correcta. Que es, a veces, el insulto más educado.',
      'Un comienzo. Hay tanto que corregir que elegir por dónde será tu primer acierto.',
      'Ha tenido sus momentos. Pocos, pero ha tenido.',
      'Has cumplido. No es una ovación, pero tampoco una llamada al servicio técnico.',
      'Ni lo uno ni lo otro. Una mediocridad con cierto estilo.'
    ],
    mala: [
      'Prefiero no comentar. Lo cual, viniendo de mí, es un comentario.',
      'Lo he anotado todo. Con detalle. Con mucho detalle.',
      'No te preocupes: hay espacio de sobra en tu expediente.',
      'Ha sido memorable, a su manera.',
      'He visto comienzos peores. No muchos, y ninguno que recuerde con agrado.',
      'Un debut que conviene no enseñar a nadie.'
    ],
    victoria: [
      'Has ganado. Tomo nota de tu crueldad.',
      'Has ganado. Qué desconsiderado con tu rival.',
      'Has ganado. Un debut así invita a tomar precauciones.',
      'Victoria. El debut ha empezado con demasiada soltura.',
      'Has ganado. Lo dejaré constar como una excepción razonable.',
      'Has ganado. Lo registro con una ceja ligeramente alzada.'
    ],
    derrota: [
      'Has perdido. Lo he anotado, con la discreción debida.',
      'Derrota. Hay quien nace para aprender y quien, para servir de ejemplo. Tú vas por lo segundo.',
      'Has perdido. Un estreno así deja material para meses. Qué generoso por tu parte.',
      'Derrota. Empezar con margen de mejora es empezar con futuro. O con deudas.',
      'Has perdido. Sucede en las mejores familias y en los peores momentos.',
      'Has perdido. Y yo que esperaba una sorpresa.'
    ],
    empate: [
      'Un empate. Dos personas igual de convincentes. Es decir, nada.',
      'Empate. Dos voluntades y ninguna razón para levantar la copa.',
      'Tablas. Nadie se lleva el mérito y nadie la culpa. Muy práctico.',
      'A la par. Con la sensación de haber visto media película.',
      'Empate: el único resultado que obliga a repetir para saber algo.',
      'Ni victoria ni derrota. Un equilibrio impecable y bastante inútil.'
    ],
    neutra: [
      'Lo he anotado. Lo anoto todo; no lo tomes como un cumplido.',
      'Sin comentarios. Que no es lo mismo que sin opinión.',
      'Ha sido una partida. Es cuanto puedo certificar con honestidad.',
      'Ni aplauso ni reproche. Una partida más para el registro.',
      'Dato recibido. Mi opinión queda en suspenso, cosa que me ocurre poco.',
      'Registrada. Aún hace falta más material para formarme una idea.'
    ]
  },
  // La carta son cuatro líneas: apertura fija («Es lunes.»), VEREDICTO sobre la semana pasada, COMENTARIO de Sir Edwards y CIERRE
  // sobre la semana que empieza. Veredicto, comentario y cierre salen cada uno de su propia bolsa (sin repetir hasta agotarla),
  // así que las combinaciones son miles y ninguna línea se repite semana tras semana.
  // Reglas para añadir frases: el veredicto habla de la semana pasada; el comentario reacciona sin repetir el veredicto (nada de
  // «cuatro de cuatro» ni «cumpliste» fuera del veredicto); el cierre es común a las tres variantes y no nombra ni el lunes ni
  // el resultado. Ninguna se repite entre bolsas.
  monday: {
    open: 'Es lunes.',          // si la carta sale otro día de la semana: openOther
    openOther: 'Nueva semana.',
    // 1) Veredicto sobre la semana pasada.
    verdict: {
      aprobacion: [
        'Cuatro de cuatro la semana pasada.',
        'Repasé la semana pasada: los cuatro encargos, saldados.',
        'La semana pasada no me dejaste nada que reprochar. Qué descortesía.',
        'Tres encargos y el Gran Encargo, todos cobrados. Lo he comprobado dos veces.',
        'Tu semana pasada cierra sin una sola mancha. Tendré que buscarlas en otra parte.',
        'Hiciste todo lo que te pedí. Todo. Aún me estoy recuperando.',
        'No quedó ni un encargo pendiente. Busqué con lupa y todo.',
        'Cuatro encargos entregados y ni una excusa. Qué desagradable de presenciar.',
        'La semana pasada cerró sin deudas. Hasta el tintero está desconcertado.',
        'Semana pasada: completa. Recibido con una mueca discreta.'
      ],
      reproche: [
        'He revisado tu expediente de la semana pasada. Y lo he releído, por si acaso.',
        'La semana pasada me debes unos cuantos encargos. Hoy empiezo a llevar la cuenta.',
        'Tus encargos anteriores quedaron sin saldar. Ya han echado raíces.',
        'Tu semana pasada tiene huecos. Muchos, y elegantemente distribuidos.',
        'Algunos encargos de la semana pasada quedaron pendientes. Yo no los terminaré por ti.',
        'Tu semana pasada se quedó a medias. O a menos.',
        'Dejaste encargos por el camino. Allí se han quedado.',
        'No lo cumpliste todo, y yo me entero de todo. Una combinación incómoda.',
        'La semana pasada quedó incompleta. La he sellado igualmente, por costumbre.',
        'Sobre tu semana pasada, tengo opiniones. Ninguna favorable.'
      ],
      // Primera carta tras la semana de incorporación (que no se evalúa): ni aprobación ni reproche.
      incorporacion: [
        'Tu primera semana fue de prueba. No cuenta, de momento.',
        'La semana pasada fue un ensayo. Se perdona; es lo que tiene empezar.',
        'Lo de la semana pasada fue una presentación, no un examen. Disfrútalo mientras dure.',
        'La semana pasada contó como bienvenida. Nadie evaluó nada, ni yo.',
        'Tu primera semana quedó fuera de la evaluación, por cortesía de la casa.',
        'La primera semana no se puntúa. Considérala un préstamo.',
        'Aquella primera semana fue un paseo por las instalaciones. Sin nota.'
      ],
      // Regreso tras varias semanas sin abrir Inicio: no se juzga una semana concreta, se recibe al que vuelve.
      ausencia: [
        'Vaya. Has vuelto. Empezaba a imaginarte en otro continente.',
        'Semanas sin noticias tuyas. Empezaba a acostumbrarme al silencio.',
        'Tu expediente ha acumulado polvo. Es lo único que ha acumulado.',
        'Qué ausencia tan notable. Es lo más notable que has hecho últimamente.',
        'Cuánto tiempo. No he contado las semanas. Bueno, sí las he contado.',
        'Reaparece quien ya figuraba en mi archivo de casos perdidos.'
      ]
    },
    // 2) Comentario de Sir Edwards.
    comment: {
      aprobacion: [
        'Esta semana volveré a comprobarlo. Soy un hombre de costumbres inquisitivas.',
        'Impecable. Qué incómodo, tener que respetarte.',
        'Veamos si fue disciplina o simple suerte.',
        'Lo hiciste a propósito, ¿verdad? Detesto esa clase de ambición.',
        'Me cuesta encontrarte defectos. Dame tiempo; suelo lograrlo.',
        'Ha sido competente. Sigo buscando la letra pequeña.',
        'Que no se te suba a la cabeza: hay sombreros que no admiten más volumen.',
        'Te concedo un mérito. Uno. Del tamaño de una miga.',
        'No esperes aplausos. El mejor elogio que doy es seguir vigilándote.',
        'Esta semana subo el listón, por si acaso te lo habías creído.'
      ],
      reproche: [
        'Digamos que esta semana tendrás ocasión de mejorar mi opinión. Más abajo ya no puede estar.',
        'Yo no olvido nada. Es mi principal defecto y mi única virtud.',
        'No me sorprende. Tampoco me ha hecho gracia.',
        'Otra semana, otra oportunidad. Intenta que esta no quede en el mismo cajón.',
        'Prefiero pensar que fue falta de tiempo. La alternativa te deja peor.',
        'Podría fingir que lo entiendo, pero entonces ambos estaríamos mintiendo.',
        'No te lo reprocho. Bueno, sí. Es lo que mejor se me da.',
        'El enfado es vulgar. Lo mío es algo más fino y más duradero, y lo practico con esmero.',
        'Te concedo el beneficio de la duda. Con intereses.',
        'Hay quien aprende de sus errores. Me consta que existen.',
        'Podría ser peor. Siempre puede serlo; esa es la gracia de evaluarte.'
      ],
      incorporacion: [
        'A partir de hoy, tu expediente cuenta de verdad.',
        'Se acabó el periodo de cortesía. Empieza el de observación.',
        'Desde hoy cada encargo cuenta. Y cada excusa también.',
        'Esta semana, por fin, hay algo que juzgar. Procuraré ser elocuente.',
        'La benevolencia inicial se agotó. La exigencia, en cambio, viene de serie.',
        'Desde ahora los resultados se leen con lupa. Es pequeña, pero firme.'
      ],
      ausencia: [
        'Los encargos de las semanas perdidas han caducado, como las promesas de volver pronto.',
        'No te preguntaré dónde estabas. Lo imagino, y no me convence.',
        'Borrón y cuenta nueva. Solo esta vez, y solo porque me aburría.',
        'Considera esto una segunda oportunidad. Las terceras no existen.',
        'Ni un reproche. Hoy. Guárdalo como se guarda un eclipse.',
        'De vuelta, entonces. Lo digo con la misma sinceridad con que me despedí.'
      ]
    },
    // 3) Cierre, común a las tres variantes: la semana que empieza.
    close: [
      'La semana está lista. Caduca el domingo; mi paciencia, antes.',
      'Nuevos encargos. Procura no estrenarlos con excusas.',
      'Cada semana, todos prometen ser mejores. Veamos cuánto dura contigo.',
      'Tres encargos y un Gran Encargo. Ya sabes cómo funciona esto.',
      'Ha llegado tu nueva tanda de obligaciones. De nada.',
      'Tengo trabajo para ti, y tú, por desgracia, tiempo libre.',
      'Tus encargos ya están donde siempre. Yo, mientras tanto, afilaré el lápiz.',
      'Siete días por delante. Hay quien los aprovecha; hay quien los comenta.',
      'La semana empieza limpia. Tú decides cuánto tardas en mancharla.',
      'Hay encargos nuevos esperando. No tienen prisa; yo, en cambio, sí.',
      'Las semanas empiezan con propósitos y terminan con explicaciones.',
      'Una semana entera para demostrar algo. Elige qué.',
      'Te observaré, como siempre. Con un interés estrictamente profesional.',
      'Los encargos exigen algo más que buenas intenciones. Qué contrariedad.',
      'El reloj ya corre. A mí no me preocupa; a ti debería.',
      'Hay una página en blanco con tu nombre. Procura que valga la tinta.',
      'Que nadie diga que no te avisé: tienes hasta el domingo.',
      'Los encargos no se completan solos. Lo he intentado, por si acaso.',
      'Cuando quieras. Es decir, cuanto antes.'
    ]
  }
};
