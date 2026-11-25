// SirEdwards Quiz 1.0 — Tutorial interactivo de Duelos: ocho viñetas y la despedida (solo datos). Lo pinta src/ui/duel-tour.js.
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
      body: 'Dije que no habría tutorial. Mentí.\nPero lo hago por tu bien. Sería una lástima que perdieras un duelo por no saber siquiera cómo empezarlo.',
      target: 'real', selectors: ['#seq-duel-cards', '#duel-home'] },
    { id: 'amigos', title: 'Las amistades también cuentan', img: 'assets/character/sir-edwards-duelos-amigos.webp',
      body: 'Busca jugadores por su nombre o ID, añádelos como amigos y comprueba quién está conectado. Conviene tener amigos. Sobre todo si piensas derrotarlos.',
      target: 'real', selectors: ['.seq-d-v-amigos'] },
    { id: 'modalidades', title: 'Dos formas de competir', img: 'assets/character/sir-edwards-duelos-reloj.webp',
      body: 'Clásico pone a prueba tus conocimientos. Apuestas añade estrategia: tú decides cuánto arriesgar en cada ronda. Confío en que sepas distinguir valentía de temeridad.',
      target: 'demo', demo: 'modos', selectors: ['[data-t="clasico"]', '[data-t="apuestas"]'] },
    { id: 'rivales', title: 'Elige a tus rivales', img: 'assets/character/presentacion-expediente.webp',
      body: 'Enfréntate a un jugador o participa en un todos contra todos de tres o cuatro jugadores. Cuantos más rivales, más posibilidades de quedar en evidencia.',
      target: 'demo', demo: 'rivales', selectors: ['[data-t="uno"]', '[data-t="todos"]'] },
    { id: 'invitar', title: 'Invita a quien quieras', img: 'assets/character/presentacion-mirada.webp',
      body: 'Invita a tus amigos o comparte un enlace con otros jugadores. Incluso puedes combinar ambas opciones en Todos contra todos. No seré yo quien limite tu lista de adversarios.',
      target: 'demo', demo: 'invitar', selectors: ['[data-t="amigo"]', '[data-t="enlace"]'] },
    { id: 'sala', title: 'Todo listo para empezar', img: 'assets/character/sir-edwards-duelos-sala.webp',
      body: 'La sala muestra quién ha aceptado. Comparte o copia el enlace y empieza cuando seáis al menos tres. No es necesario esperar al cuarto invitado.',
      target: 'demo', demo: 'sala', selectors: ['[data-t="participantes"]', '[data-t="compartir"]', '[data-t="copiar"]', '[data-t="empezar"]', '[data-t="cancelar"]'] },
    { id: 'retos', title: '¿No coincidís?', img: 'assets/character/sir-edwards-retos-sobre.webp',
      body: 'Elige un modo y envía un Reto a uno o varios amigos. Cada uno juega cuando puede. Hasta la rivalidad merece cierta flexibilidad.',
      target: 'real', selectors: ['.seq-d-v-retos'] },
    { id: 'honor', title: 'El honor está en juego', img: 'assets/character/event_siredwards_record.webp',
      body: 'Tus duelos 1 contra 1 determinan tu ELO, la puntuación que marca tu posición en el ranking. Todos contra todos tiene sus propias estadísticas y no afecta a tu ELO.',
      target: 'real', selectors: ['.seq-d-v-rank'] }
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
    labels: { back: 'Atrás', next: 'Continuar', close: 'Salir del tutorial', progress: function (n, t) { return n + ' de ' + t; } }
  };
})();
