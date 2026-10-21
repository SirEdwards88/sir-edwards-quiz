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
      'Vaya, vaya. Parece que tenemos a alguien con potencial.',
      'Aceptable. No permitas que la palabra te impresione.',
      'Mejor de lo que cabía esperar. Y yo esperaba poco.',
      'No ha estado mal. Detesto decirlo, pero ahí queda.',
      'Una buena actuación. No arruines la estadística intentando repetirla.',
      'Un resultado respetable. Lo diré una sola vez, para que conserve su valor.',
      'Interesante. Casi creo que sabes lo que haces. Casi.'
    ],
    normal: [
      'Hay material. No digo cuál, ni de qué calidad.',
      'Digamos que ha sido… instructiva.',
      'Correcta. Que es, a veces, el insulto más educado.',
      'Hay tanto por corregir que prefiero empezar por el principio. No quisiera abrumarte.',
      'Ha tenido sus momentos. Pocos, pero ha tenido.',
      'Has cumplido. No es una ovación, pero tampoco una llamada al servicio técnico.',
      'Ni brilla ni ofende. Mediocridad con cierto estilo.'
    ],
    mala: [
      'Hum. Mucho por mejorar. Casi todo.',
      'Prefiero no comentar. Lo cual, viniendo de mí, es un comentario.',
      'Lo he visto todo. Incluso lo que habría preferido no ver.',
      'No te preocupes: hay espacio de sobra en tu expediente.',
      'Ha sido memorable. No necesariamente por las razones que convendría.',
      'He visto comienzos peores. No recuerdo ninguno que merezca ser citado.',
      'Un debut que conviene no enseñar a nadie.'
    ],
    victoria: [
      'Has ganado. Tomo nota de tu crueldad.',
      'Has ganado. Tu rival confiaba en ti para mantener cierta compostura.',
      'Has ganado. Te ruego que no lo celebres delante del vencido.',
      'Victoria. No quisiera que confundieras un buen estreno con una tradición.',
      'Has ganado. Diré que fue mérito tuyo y no descuido ajeno.',
      'Has ganado. Lo registro con una ceja ligeramente alzada.'
    ],
    derrota: [
      'Has perdido. Lo he anotado, con la discreción debida.',
      'Derrota. Hay quien aprende a la primera y quien da más trabajo. Aún es pronto para saber cuál eres.',
      'Has perdido. Un estreno así deja material para meses. Qué generoso por tu parte.',
      'Derrota. Al menos ya sabes qué resultado conviene evitar.',
      'Has perdido. Sucede en las mejores familias y en los peores momentos.',
      'Has perdido. Y yo que esperaba una sorpresa.'
    ],
    empate: [
      'Un empate. Dos personas igual de convincentes. Es decir, nada.',
      'Empate. Dos voluntades y ninguna razón para levantar la copa.',
      'Tablas. Nadie se lleva el mérito y nadie la culpa. Muy práctico.',
      'A la par. Con la sensación de haber visto media función.',
      'Empate: el único resultado que obliga a repetir para saber algo.'
    ],
    neutra: [
      'Lo he anotado. Lo anoto todo; no lo tomes como un cumplido.',
      'Sin comentarios. Que no es lo mismo que sin opinión.',
      'Ha habido una partida. No quisiera comprometerme más allá de los hechos.',
      'Ni gloria ni vergüenza. El día sigue su curso.',
      'Dato recibido. Mi veredicto sigue en paradero reservado.',
      'Nada que celebrar y nada que lamentar. Un resultado de sobremesa.'
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
        'La semana pasada no me dejaste nada que reprochar. Qué descortesía.',
        'Tu semana pasada cierra sin una sola mancha. Tendré que buscarlas en otra parte.',
        'Hiciste todo lo que te pedí. Todo. Aún me estoy recuperando.',
        'La semana cerró sin deudas. El libro de cuentas parece decepcionado.',
        'Cuatro de cuatro. He revisado el calendario por si era festivo.',
        'Hiciste todo lo que se te pidió. Hay quien lo llama deber; tú, aparentemente, afición.'
      ],
      reproche: [
        'He revisado tu expediente semanal. No mejora con una segunda lectura.',
        'Tus encargos anteriores quedaron sin saldar. Ya han echado raíces.',
        'Tu semana tiene más asuntos pendientes que una novela por entregas.',
        'Tu semana quedó a medias. La otra mitad, por lo visto, tenía otros planes.',
        'No lo cumpliste todo, y yo me entero de todo. Una combinación incómoda.',
        'La semana quedó incompleta. La he archivado bajo «previsible».',
        'Sobre tu semana pasada, tengo opiniones. Ninguna favorable.'
      ],
      // Primera carta tras la semana de incorporación (que no se evalúa): ni aprobación ni reproche.
      incorporacion: [
        'La semana pasada fue un ensayo. Se perdona; es lo que tiene empezar.',
        'Lo de la semana pasada fue una presentación, no un examen. Disfrútalo mientras dure.',
        'La semana pasada contó como bienvenida. Nadie evaluó nada, ni yo.',
        'Tu primera semana quedó fuera de la evaluación, por cortesía de la casa.',
        'Aquella primera semana fue un paseo por las instalaciones. Sin nota.'
      ],
      // Regreso tras varias semanas sin abrir Inicio: no se juzga una semana concreta, se recibe al que vuelve.
      ausencia: [
        'Vaya. Has vuelto. Empezaba a imaginarte en otro continente.',
        'Semanas sin noticias tuyas. Empezaba a acostumbrarme al silencio.',
        'Tu expediente ha acumulado polvo. He estado a punto de catalogarlo como antigüedad.',
        'Qué ausencia tan notable. Es lo más notable que has hecho últimamente.',
        'Cuánto tiempo. No he contado las semanas. Bueno, sí las he contado.',
        'Reaparece quien ya figuraba en mi archivo de casos perdidos.'
      ]
    },
    // 2) Comentario de Sir Edwards.
    comment: {
      aprobacion: [
        'Esta semana volveré a comprobarlo. Soy un hombre de costumbres inquisitivas.',
        'Impecable. Respetarte me resulta laborioso.',
        'Veamos si fue disciplina o simple suerte.',
        'Lo hiciste a propósito, ¿verdad? Detesto esa clase de ambición.',
        'Me cuesta encontrarte defectos. Dame tiempo; suelo lograrlo.',
        'Que no se te suba a la cabeza: hay sombreros que no admiten más volumen.',
        'No esperes aplausos. El mejor elogio que doy es seguir vigilándote.'
      ],
      reproche: [
        'Digamos que esta semana tendrás ocasión de mejorar mi opinión. Más abajo ya no puede estar.',
        'Yo no olvido nada. Es mi principal defecto y mi única virtud.',
        'No me sorprende. Tampoco me ha hecho gracia.',
        'Otra semana, otra oportunidad. Sería agradable que esta tuviera un desenlace distinto.',
        'Prefiero pensar que fue falta de tiempo. La alternativa te deja peor.',
        'Podría fingir que lo entiendo, pero entonces ambos estaríamos mintiendo.',
        'No te lo reprocho. Bueno, sí. Es lo que mejor se me da.',
        'No estoy enfadado. El enfado pasa; las anotaciones permanecen.',
        'Te concedo el beneficio de la duda. Con intereses.',
        'Dicen que los errores enseñan. Confío en que alguno de los tuyos tome la iniciativa.',
        'Podría ser peor. Siempre puede serlo; esa es la gracia de evaluarte.'
      ],
      incorporacion: [
        'A partir de hoy, tu expediente cuenta de verdad.',
        'Se acabó el periodo de cortesía. Empieza el de observación.',
        'Hasta hoy eras invitado. Desde hoy eres de la casa y respondes como tal.',
        'Esta semana tendré por fin resultados que comentar. Espero que me facilites el trabajo.',
        'La benevolencia inicial se agotó. La exigencia, en cambio, es hereditaria.'
      ],
      ausencia: [
        'Los encargos de las semanas perdidas han caducado, como las promesas de volver pronto.',
        'No te preguntaré dónde estabas. La agenda, por fortuna, no exige explicaciones.',
        'Borrón y cuenta nueva. El borrón es mío; la cuenta, naturalmente, tuya.',
        'Considera esto una segunda oportunidad. Las terceras no existen.',
        'Ni un reproche. Hoy. Guárdalo como se guarda un eclipse.',
        'De vuelta, entonces. La casa recupera una de sus costumbres menos fiables.'
      ]
    },
    // 3) Cierre, común a las tres variantes: la semana que empieza.
    close: [
      'La semana está lista. Caduca el domingo; mi paciencia, antes.',
      'Cada semana, todos prometen ser mejores. Veamos cuánto dura contigo.',
      'Tres encargos y un Gran Encargo. La semana no se administrará sola.',
      'Ha llegado tu nueva tanda de obligaciones. De nada.',
      'Tengo trabajo para ti, y tú, por desgracia, tiempo libre.',
      'Tus encargos están preparados. He dejado las excusas fuera, para ahorrar espacio.',
      'Siete días por delante. Hay quien los aprovecha; hay quien los comenta.',
      'La semana empieza limpia. Tú decides cuánto tardas en mancharla.',
      'Las semanas empiezan con propósitos y terminan con explicaciones.',
      'Una semana entera para demostrar algo. Elige qué.',
      'Te seguiré de cerca. La discreción es una virtud que no siempre puedo permitirme.',
      'Los buenos propósitos son encantadores. Lástima que no cuenten como encargos.',
      'El reloj ya corre. A mí no me preocupa; a ti debería.',
      'Hay una página en blanco con tu nombre. Procura que valga la tinta.',
      'Que nadie diga que no te avisé: tienes hasta el domingo.',
      'Los encargos no se completan solos. Lo he intentado, por si acaso.',
      'Cuando gustes. Aunque, de ser posible, antes de que tenga que volver a pedirlo.'
    ]
  }
};
