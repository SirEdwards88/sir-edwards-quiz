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
    { id: 'amigos', title: 'Amigos', blocks: [
      'Busca jugadores por su **nombre o ID** y envíales una solicitud. Encontrarás tu ID en Ajustes.',
      'Puedes tener hasta **20 solicitudes pendientes**. Si alguien rechaza tu solicitud o te elimina, deberás esperar **7 días** para volver a enviársela. Quitar a un amigo cancela los Retos 1 contra 1 que aún no se hubieran aceptado.',
      'Los amigos **en línea** pueden recibir duelos directos. Los Retos no requieren estar conectados al mismo tiempo.'
    ] },
    { id: 'directo', title: 'Duelo online: Clásico y Apuestas', blocks: [
      'Jugáis al mismo tiempo, con las mismas preguntas.',
      '**Clásico.** 20 preguntas de hasta 20 segundos. Cada acierto suma 1 punto. Gana quien más consiga; un empate es un empate.',
      '**Apuestas.** 12 rondas. Antes de cada pregunta tienes 10 segundos para elegir cuánto arriesgar: **Cuerdo (±1)**, **Osado (±2)** o **Insensato (±3)**. Los fallos restan, sin bajar de 0. Si no eliges, se aplica Cuerdo.',
      'Las **dos últimas rondas valen el doble** y ocultan los puntos de los rivales: solo ves las posiciones.',
      { on: 'Al terminar puedes pedir una **revancha**, que tu rival deberá aceptar. Si no sois amigos, solo está disponible justo después del duelo.', off: 'Al terminar puedes pedir una **revancha**, que tu rival deberá aceptar.' }
    ] },
    { id: 'invitaciones', title: 'Invitaciones y sala de espera', blocks: [
      'Solo puedes tener **un duelo o una sala activos a la vez**.',
      '**Invitación directa.** Tu amigo tiene **3 minutos** para aceptarla.',
      '@enlace **Enlace compartido.** Se crea con «Compartir invitación» en **Duelo online**. Dura **10 minutos**, sirve **una sola vez** y permite jugar aunque no seáis amigos. No crea ninguna amistad. Puedes cancelarlo.',
      '**Sala de espera.** Ambos tenéis **2 minutos** para marcaros listos. Cuando lo estéis los dos, empieza una cuenta atrás de 3 segundos.',
      'Si no llegáis a tiempo, el duelo se cancela sin ELO ni penalización.'
    ] },
    { id: 'retos', title: 'Retos', blocks: [
      'Cada jugador participa **cuando quiera**, sin necesidad de coincidir ni estar en línea. Quien reta elige el modo, entre los que **todos** tengan desbloqueados.',
      'El Reto dura **3 días desde su creación**, no desde que se acepta. Gana quien consiga más aciertos. Si solo uno juega dentro del plazo, gana ese jugador; si nadie juega, caduca.',
      'Solo puedes tener **un Reto 1 contra 1 activo por pareja**. Solo quien retó puede cancelarlo, y solo mientras el rival no lo haya aceptado.',
      'También puedes crear Retos de **3 o 4 jugadores**, con un máximo de **5 retos múltiples abiertos**. No se ven las puntuaciones ajenas hasta que el reto se cierra.'
    ] },
    { id: 'todos', title: 'Todos contra todos', blocks: [
      'Participan **3 o 4 jugadores**, en directo o mediante Retos.',
      'En directo, la invitación dura **3 minutos** y la sala de espera, **2 minutos**. La partida puede empezar con al menos **3 jugadores listos**; quien no lo esté queda fuera, sin penalización.',
      'Gana quien obtiene más puntos. En caso de empate, decide el menor tiempo total en los aciertos; si persiste, se comparte puesto. Quien abandona queda último y los demás continúan.',
      '**No afecta al ELO.** Tiene estadísticas, logros y ranking propios, solo entre amigos.'
    ] },
    { id: 'ranking', title: 'Ranking, ELO y rangos', blocks: [
      '**ELO.** Empiezas con **1000 puntos**. Ganar los aumenta y perder los reduce. Vencer a un rival mejor clasificado da más puntos, y un empate vale media victoria.',
      'Cuentan los duelos individuales y los Retos 1 contra 1 completados. Los duelos múltiples no afectan al ELO.',
      '**Colocación.** Tus primeras **5 partidas** sirven para situarte en el ranking.',
      { t: '**Rangos.**', sep: true },
      [
        '**Plebeyo Ilustrado:** desde 0.',
        '**Caballero del Dato:** desde 1050.',
        '**Erudito de Salón:** desde 1150.',
        '**Lord Sabelotodo:** desde 1250.',
        '**Sir Edwards:** desde 1400.'
      ],
      { t: 'Puedes consultar el ranking de amigos o el global.', sep: true }
    ] },
    { id: 'abandonos', title: 'Abandonos y caducidades', blocks: [
      'Si abandonas un duelo o pasas **60 segundos desconectado**, pierdes y baja tu ELO. Si abandona tu rival, ganas y sube tu ELO, aunque esa victoria no desbloquea logros ni hitos que exigen una victoria completada.',
      'Si ambos abandonáis, el resultado no afecta al ELO. Cancelar antes de que empiece el duelo no penaliza.',
      'Los Retos caducan a los **3 días**. Si solo uno ha jugado, gana sin modificar el ELO.',
      '«Si empiezas un duelo, acábalo. La dignidad también cuenta.»'
    ] },
    { id: 'recompensas', title: 'Recompensas', blocks: [
      '**XP.** Cada acierto en un duelo o reto compatible concede **10 XP**, ganes o pierdas. Los modos de cálculo no dan XP en Retos.',
      '**Logros.** Puedes conseguirlos por duelos perfectos, remontadas, apuestas y partidas múltiples. Consúltalos en **Logros**.'
    ] }
  ];

  window.SEQHelpData = {
    title: 'Ayuda',
    lead: 'Sir Edwards lo ha dejado todo por escrito. Léelo una vez; después, no valen excusas.',
    tutorialLabel: 'Ver el tutorial de Duelos',
    topics: topics
  };
})();
