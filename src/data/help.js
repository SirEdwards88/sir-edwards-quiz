// SirEdwards Quiz — contenido de la Ayuda (solo datos). Lo pinta src/ui/help.js.
//
// Fuente única de las reglas de Duelos y Retos explicadas al jugador. Cada cifra sale del Worker (duel-constants.js, friends.js,
// challenges.js, multi-duel.js, multi-reto.js, duel-elo.js): si cambia allí, hay que cambiarla aquí. test/help.test.mjs la contrasta
// con el backend cuando está al lado.
//
// Formato: cada tema lleva `blocks`; un bloque es un párrafo (cadena) o una lista (array de cadenas). **Así** marca negrita.
// Tono: claro y en «tú». Sir Edwards se permite alguna ironía, pero cada frase explica algo.
// Script clásico: expone window.SEQHelpData.

(function () {
  'use strict';

  var topics = [
    { id: 'empezar', title: 'Cómo empezar', blocks: [
      'Los Duelos se abren al nivel 7. Después, entra en **Duelos** desde Inicio. Ahí tienes cuatro puertas: **Duelo online**, **Retos**, **Amigos** y **Ranking**.',
      { on: 'Hay tres maneras de jugar:', off: 'Hay dos maneras de jugar:' },
      [
        '**Duelo directo** contra un amigo que está conectado.',
        '@enlace **Duelo por enlace** compartido, incluso con quien no es amigo tuyo.',
        '**Reto**, que se juega a plazos y no exige coincidir.'
      ],
      { on: 'Los amigos facilitan encontrar y desafiar rivales, pero no son el único camino. Para añadirlos, entra en **Amigos**.', off: 'Para añadir amigos, entra en **Amigos**.' }
    ] },
    { id: 'amigos', title: 'Amigos', blocks: [
      'En **Amigos** busca a un jugador por su nombre o por su **ID de jugador**: son 10 caracteres y cada uno ve el suyo en su cuenta, en Ajustes. Después, envía la solicitud.',
      [
        'Cuando acepta, podéis encontraros y desafiaros con más facilidad.',
        'Puedes tener hasta **20 solicitudes enviadas** pendientes a la vez.',
        'Si alguien rechaza tu solicitud o te quita de sus amigos, tendrás que esperar **7 días** para volver a pedírsela.',
        'Quitar a un amigo cancela los Retos 1 vs 1 que aún no se hubieran aceptado. Un duelo en curso sigue su camino.'
      ],
      '**En línea** significa que ese amigo ha abierto el juego hace un momento. El duelo directo se juega a la vez, así que solo puedes retar a un amigo que está en línea. Los Retos no lo exigen.'
    ] },
    { id: 'directo', title: 'Duelo online: Clásico y Apuestas', blocks: [
      { on: 'Jugáis a la vez y en directo, con las mismas preguntas. Se desafía a un amigo conectado o a quien abra tu enlace. Hay dos modos.', off: 'Jugáis a la vez y en directo, con las mismas preguntas. Se desafía a un amigo conectado. Hay dos modos.' },
      [
        '**Clásico.** 20 preguntas, con hasta 20 segundos cada una. Cada acierto vale 1 punto y gana quien más sume. Si responden los dos antes de tiempo, la ronda avanza. Un empate es un empate: no hay desempate.',
        '**Apuestas.** 12 rondas. Antes de cada pregunta tienes 10 segundos para elegir en secreto cuánto te fías de ti: **Cuerdo** (±1), **Osado** (±2) o **Insensato** (±3). Si aciertas, sumas esa cifra. Si fallas, la restas, sin bajar de 0. Si no eliges a tiempo, se aplica Cuerdo.',
        'En Apuestas, las **dos últimas rondas valen el doble** y hay niebla: dejas de ver los puntos de los rivales y solo ves las posiciones.'
      ],
      'Solo puedes tener **un duelo o una sala activos a la vez**. Si tú o tu rival estáis ocupados, la invitación no se envía.',
      { on: 'Al terminar puedes pedir la **revancha**: es una invitación nueva, con las mismas reglas, y tu rival debe aceptarla. Si jugasteis por enlace y no sois amigos, la revancha solo está disponible justo después del duelo; luego, para volver a jugar, añádelo como amigo o usad otro enlace.', off: 'Al terminar puedes pedir la **revancha**: es una invitación nueva, con las mismas reglas, y tu rival debe aceptarla.' }
    ] },
    { id: 'invitaciones', title: 'Invitaciones y sala de espera', blocks: [
      'Retar a un amigo conectado es enviarle una invitación. Así funciona:',
      [
        'Tu rival tiene **3 minutos** para aceptar o rechazar. Si no responde, la invitación caduca.',
        'Cuando acepta, empieza la **sala de espera**. Los dos tenéis **2 minutos** para pulsar «¡Listo!».',
        'En cuanto el segundo pulsa, hay una cuenta atrás de 3 segundos y empieza el duelo.',
        'Si alguien no llega a tiempo, el duelo se cancela. No hay ELO ni penalización.'
      ],
      'Puedes cancelar tu invitación mientras nadie la haya aceptado. Ya en la sala, cualquiera de los dos puede cancelar. Una vez empezado, irse cuenta como abandono.',
      '@enlace **Invitación por enlace.** En **Duelo online** pulsa «Compartir invitación». Compartes un enlace y quien lo abra puede jugar contigo aunque no seáis amigos. Dura **10 minutos**, se usa **una sola vez** y puedes cancelarlo. No crea ninguna amistad. Una vez canjeado, la sala de espera es la misma: 2 minutos para marcarse listo.'
    ] },
    { id: 'retos', title: 'Retos', blocks: [
      'Un Reto es un duelo a plazos. Cada uno juega su parte **por separado**, cuando le venga bien. No hace falta coincidir ni estar en línea.',
      [
        '**Quién elige el modo.** Quien reta, entre los modos que **todos** los participantes tengan desbloqueados.',
        '**Plazo.** 3 días desde que se crea el reto, no desde que se acepta.',
        '**Uno por pareja.** Solo puede haber un Reto 1 vs 1 activo con cada amigo.',
        '**Quién gana.** Quien más aciertos consiga. Si vence el plazo y solo uno ha jugado, gana ese. Si nadie ha jugado, el reto caduca.',
        '**Cancelar.** Solo puede hacerlo quien retó, mientras el rival no haya aceptado.'
      ],
      'Puedes retar a **un amigo** (1 vs 1) o a **dos o tres a la vez** (Todos contra todos). En Todos contra todos puedes tener hasta 5 retos abiertos, y no se ven las puntuaciones ajenas hasta que el reto se cierra.'
    ] },
    { id: 'todos', title: 'Todos contra todos', blocks: [
      'Es un duelo o un reto de **3 o 4 jugadores**: tú invitas a dos o tres amigos.',
      [
        'En el duelo en directo, las invitaciones duran 3 minutos y la sala de espera, 2.',
        'Empieza cuando todos están listos, cuando quien lo creó pulsa «Empezar» o cuando se agota la sala, siempre con al menos 3 listos. Quien no esté listo queda fuera, sin penalización.',
        'Se ordena por puntos y, si empatan, por el menor tiempo total en los aciertos. Si empatan en todo, comparten puesto.',
        'Quien abandona queda último y los demás continúan.'
      ],
      'Todos contra todos **no mueve el ELO**. Tiene sus propias estadísticas, logros y ranking, solo entre amigos.'
    ] },
    { id: 'ranking', title: 'Ranking, ELO y rangos', blocks: [
      '**ELO.** El **ELO** mide tu nivel en los duelos. Empiezas con **1000**.',
      [
        'Cuentan los duelos online 1 vs 1 (Clásico y Apuestas) y los Retos 1 vs 1 que se juegan hasta el final.',
        'Ganar lo sube, perder lo baja y un empate cuenta como medio punto de victoria. Vencer a alguien mejor que tú sube más. Perder contra alguien peor te cuesta más.',
        'Es de suma cero: lo que gana uno lo pierde el otro.',
        'No cuentan los duelos cancelados, rechazados o caducados, ni Todos contra todos.'
      ],
      { t: '**Colocación.** Tus primeras **5 partidas** te colocan. Hasta entonces apareces después de los jugadores ya colocados y sin posición.', sep: true },
      { t: '**Rangos.** Según tu ELO:', sep: true },
      [
        '**Plebeyo Ilustrado**: desde 0.',
        '**Caballero del Dato**: desde 1050.',
        '**Erudito de Salón**: desde 1150.',
        '**Lord Sabelotodo**: desde 1250.',
        '**Sir Edwards**: desde 1400. Sí, hay un rango con el nombre de Sir Edwards. Aspira a él con humildad.'
      ],
      { t: 'El **Ranking** de Duelos ordena a los jugadores colocados por ELO. Puedes verlo entre tus amigos o a nivel global.', sep: true }
    ] },
    { id: 'abandonos', title: 'Abandonos y caducidades', blocks: [
      [
        '**Abandono.** En un duelo en directo, si pasas **60 segundos sin conexión** o fuera de la partida, pierdes por abandono. Quien ya ha respondido todo no puede abandonar.',
        '**Si abandona tu rival**, ganas el duelo y tu ELO sube. Esa victoria suma a tus victorias totales, pero no desbloquea logros ni hitos que exigen una victoria completada.',
        '**Si abandonas tú**, pierdes y tu ELO baja.',
        '**Si abandonan los dos**, no cuenta para el ELO.',
        { on: '**Invitación directa.** Caduca a los 3 minutos sin respuesta. La de enlace, a los 10.', off: '**Invitación directa.** Caduca a los 3 minutos sin respuesta.' },
        '**Sala de espera.** Se cancela a los 2 minutos si alguien no se marca listo. No hay ELO ni penalización.',
        '**Reto.** Caduca a los 3 días. Si solo uno ha jugado, gana ese, pero no mueve el ELO.'
      ],
      'Consejo de Sir Edwards: si empiezas un duelo, acábalo.'
    ] },
    { id: 'recompensas', title: 'Recompensas', blocks: [
      [
        '**XP.** Cada acierto en un duelo o reto te da 10 XP, ganes o pierdas. Se concede una sola vez por partida. Los modos de cálculo no dan XP en los Retos.',
        '**Logros.** Hay logros propios de Duelo (un duelo perfecto, remontadas, empates, apuestas audaces) y de Todos contra todos. Los encuentras en **Logros**.',
        '**ELO y rango.** Son el premio de los duelos y retos 1 vs 1 competitivos.'
      ]
    ] }
  ];

  window.SEQHelpData = {
    title: 'Ayuda',
    lead: 'Sir Edwards lo ha dejado todo por escrito. Léelo una vez; después, no valen excusas.',
    tutorialLabel: 'Ver el tutorial de Duelos',
    topics: topics
  };
})();
