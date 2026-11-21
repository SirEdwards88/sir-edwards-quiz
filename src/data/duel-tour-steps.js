// SirEdwards Quiz 1.0 — Tutorial interactivo de Duelos: siete viñetas y la despedida (solo datos). Lo pinta src/ui/duel-tour.js.
//
// Los textos son DEFINITIVOS (decisión del propietario): no se modifican sin consultar. Sir Edwards es un caballero elegante,
// inteligente y sarcástico; no es un mayordomo.
//   · `target`: qué se resalta. 'real' = elementos reales de la pantalla de Duelos (selectores, se miden en el momento);
//               'demo' = una pantalla de demostración AISLADA con datos ficticios (nada de lo que se ve es real ni se puede pulsar).
//   · Si un elemento real no es visible o medible, el recorrido muestra el texto sin señalar ninguna posición.
//   · El 4 habla de combinar amigos y enlaces SOLO en Todos contra todos: en 1 contra 1 los métodos son excluyentes.
// Script clásico: expone window.SEQDuelTourData.

(function () {
  'use strict';

  var steps = [
    { id: 'bienvenida', title: 'Bienvenido a Duelos', img: 'assets/character/presentacion-evaluador.webp',
      body: 'Ha llegado la hora de enfrentarte a otros jugadores. Espero que tus conocimientos estén a la altura de tu entusiasmo.',
      target: 'real', selectors: ['#seq-duel-cards', '#duel-home'] },
    { id: 'modalidades', title: 'Dos formas de competir', img: 'assets/character/sir-edwards-duelos-reloj.webp',
      body: 'Clásico pone a prueba tus conocimientos. Apuestas añade una decisión delicada: cuánto arriesgar. Confío en que sepas distinguir valentía de temeridad.',
      target: 'demo', demo: 'modos', selectors: ['[data-t="clasico"]', '[data-t="apuestas"]'] },
    { id: 'rivales', title: 'Elige a tus rivales', img: 'assets/character/presentacion-expediente.webp',
      body: 'Enfréntate a un jugador o participa en un todos contra todos de tres o cuatro jugadores. Cuantos más rivales, más posibilidades de quedar en evidencia.',
      target: 'demo', demo: 'rivales', selectors: ['[data-t="uno"]', '[data-t="todos"]'] },
    { id: 'invitar', title: 'Invita a quien quieras', img: 'assets/character/presentacion-mirada.webp',
      body: 'Invita a tus amigos o comparte un enlace con quien quieras. En Todos contra todos puedes combinar ambas opciones. El talento no exige estar en tu lista de contactos.',
      target: 'demo', demo: 'invitar', selectors: ['[data-t="amigo"]', '[data-t="enlace"]'] },
    { id: 'sala', title: 'Todo listo para empezar', img: 'assets/character/presentacion-expediente.webp',
      body: 'La sala muestra quién ha llegado y quién falta. Comparte el enlace, inicia el duelo cuando estéis listos o cancela la invitación si cambias de opinión.',
      target: 'demo', demo: 'sala', selectors: ['[data-t="participantes"]', '[data-t="compartir"]', '[data-t="empezar"]', '[data-t="cancelar"]'] },
    { id: 'honor', title: 'El honor está en juego', img: 'assets/character/event_siredwards_record.webp',
      body: 'Cada duelo 1 contra 1 puede hacerte subir o bajar en el ranking. Todos contra todos tiene sus propias estadísticas, sin afectar a tu ELO.',
      target: 'real', selectors: ['.seq-d-v-rank'] },
    { id: 'retos', title: '¿No coincidís?', img: 'assets/character/sir-edwards-retos-sobre.webp',
      body: 'Para eso están los Retos: envía uno y deja que tu rival juegue cuando pueda. Hasta la rivalidad merece cierta flexibilidad.',
      target: 'real', selectors: ['.seq-d-v-retos'] }
  ];

  window.SEQDuelTourData = {
    // Clave propia e independiente: NO es K_HELP, K_INTRO ni K_UNLOCKED, así que ver (o no ver) el recorrido nunca cambia el desbloqueo.
    key: 'siredwards_quiz_duel_tour_seen',
    steps: steps,
    farewell: {
      title: 'Todo preparado', img: 'assets/character/presentacion-mirada.webp',
      body: 'El escenario está preparado y tus rivales te esperan. Procura que la primera impresión no sea la última.',
      button: 'Empezar a jugar'
    },
    labels: { back: 'Atrás', next: 'Continuar', close: 'Cerrar', progress: function (n, t) { return n + ' de ' + t; } }
  };
})();
