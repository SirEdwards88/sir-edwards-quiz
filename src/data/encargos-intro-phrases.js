// SirEdwards Quiz — Presentación de los Encargos: frases de Sir Edwards. Script clásico (global ENCARGOS_INTRO).
// Todas rotan con pickRotatingPhrase (bolsa persistente: no se repite ninguna hasta haberlas visto todas).
//   · result: la línea que sigue a «Una partida terminada.» según cómo fue la PRIMERA partida (o Duelo/Reto) del jugador.
//   · monday: la carta semanal (sale la primera vez que se abre Inicio en una semana nueva; abre «Es lunes.» si es lunes, «Nueva semana.» si no; luego dos líneas fijas según la semana pasada y una tercera
//     rotativa (comunes + las propias de cada variante). «Cuatro de cuatro» solo aparece en la variante de aprobación.
// Sin emojis. Las claves de result coinciden con SEQEncargosIntroCore.classify().

const ENCARGOS_INTRO = {
  result: {
    buena: [
      'Sorprendentemente decente.',
      'Mejor de lo que cabía esperar. Y yo esperaba poco.',
      'No ha estado mal. Detesto decirlo, pero ahí queda.',
      'Una actuación digna de mención. Procura que no sea casualidad.',
      'Interesante. Casi parece que sabes lo que haces.'
    ],
    normal: [
      'Digamos que ha sido… instructiva.',
      'Correcta. Que es, a veces, el insulto más educado.',
      'Un comienzo. Queda mucho margen, y es un margen generoso.',
      'Ha tenido sus momentos. Pocos, pero ha tenido.',
      'Ni lo uno ni lo otro. Una mediocridad con cierto estilo.'
    ],
    mala: [
      'He tenido la cortesía de tomar nota.',
      'Lo he anotado todo. Con detalle. Con mucho detalle.',
      'No te preocupes: mi libreta tiene páginas de sobra.',
      'Ha sido memorable, a su manera.',
      'Un debut que conviene no enseñar a nadie.'
    ],
    victoria: [
      'Has ganado. Tomo nota de tu crueldad.',
      'Has ganado. Qué desconsiderado con tu rival.'
    ],
    derrota: [
      'Has perdido. Lo he anotado, con una discreción que no mereces.',
      'Derrota. Hay quien nace para aprender; tú vas por buen camino.'
    ],
    empate: [
      'Un empate. Dos personas igual de convincentes. Es decir, nada.'
    ],
    neutra: [
      'Lo he anotado. Lo anoto todo; no lo tomes como un cumplido.',
      'He tomado nota. Siempre la tomo, aunque no haya nada digno de ella.'
    ]
  },
  monday: {
    open: 'Es lunes.',          // si la carta sale otro día de la semana: openOther
    openOther: 'Nueva semana.',
    aprobacion: ['Cuatro de cuatro la semana pasada.', 'No te acostumbres. Esta semana volveremos a comprobarlo.'],
    // Primera carta tras la semana de incorporación (que no se evalúa): ni aprobación ni reproche.
    incorporacion: ['Tu primera semana fue de prueba. No cuenta, de momento.', 'A partir de hoy, tu expediente cuenta de verdad.'],
    reproche: ['He revisado tu expediente.', 'Digamos que esta semana tendrás ocasión de mejorar mi opinión.'],
    // Tercera línea rotativa: comunes (cualquier variante)…
    base: [
      'El expediente de esta semana está listo. Caduca el domingo; mi paciencia, antes.',
      'Nuevos encargos. Procura no estrenarlos con excusas.',
      'Cada semana, todos prometen ser mejores. Veamos cuánto dura contigo.',
      'Tres encargos y un Gran Encargo. Ya sabes cómo funciona esto.',
      'Ha llegado tu nueva tanda de obligaciones. De nada.',
      'Tengo trabajo para ti, y tú, por desgracia, tiempo libre.'
    ],
    // …y las propias de cada variante.
    extraAprobacion: [
      'La semana pasada cumpliste. Lo recuerdo, aunque preferiría no hacerlo.',
      'Cuatro de cuatro. Veamos si fue disciplina o simple suerte.',
      'Un expediente impecable. Qué incómodo, tener que respetarte.',
      'Cumpliste. Esta semana subo el listón, por si acaso te lo habías creído.'
    ],
    extraReproche: [
      'La semana pasada me debes unos cuantos encargos. Hoy empiezo a llevar la cuenta.',
      'Tus encargos anteriores siguen sin saldar. Mi libreta no olvida.',
      'Otra semana, otra oportunidad. Intenta que esta no quede en el mismo cajón.',
      'No cumpliste. No me sorprende. Tampoco me ha hecho gracia.'
    ]
  },
  // Primer evento sorpresa tras la presentación (réplica de «Te estaré observando.»).
  callback: '¿Me echabas de menos? Solo observaba.'
};
