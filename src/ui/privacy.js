// SirEdwards Quiz — Política de privacidad (pantalla dentro de la app, también sin conexión).
// El texto vive aquí (no en index.html). El contenedor #privacy-modal sí está en index.html para que src/ui/a11y.js
// gestione su foco y su cierre con Escape como el resto de diálogos. Todo se pinta con textContent: nada de innerHTML.
// Si cambia lo que la app o el Worker guardan (datos nuevos, analíticas, anuncios…), hay que actualizar este texto.
// Script clásico (scope global).
var SEQPrivacy = (function () {
  'use strict';
  var UPDATED = '15 de octubre de 2026';
  var CONTACT = 'eduardmartinez88@gmail.com';

  // Cada sección: h = título; b = bloques. Un bloque es un párrafo (cadena) o una lista (array de cadenas).
  // En el texto, **así** marca negrita.
  var SECTIONS = [
    { h: 'Quién es el responsable', b: [
      'SirEdwards Quiz lo desarrolla y mantiene **Sir Edwards**. Contacto para cualquier cuestión sobre tus datos: **' + CONTACT + '**.'
    ] },
    { h: 'Lo esencial', b: [
      'Sir Edwards guarda lo mínimo. Puedes jugar sin cuenta: en ese caso tu progreso se queda en tu dispositivo y no se envía a ningún servidor. La cuenta es opcional para el progreso, pero necesaria para las funciones online (Duelos, Retos, Amigos y Ranking).'
    ] },
    { h: 'Qué datos se guardan', b: [
      '**En tu dispositivo (siempre).** Tu progreso: XP, nivel, partidas, aciertos y fallos, récords, logros, estadísticas por pregunta, historial reciente y ajustes (sonido, tema…). Vive en el almacenamiento local del navegador. Borrarlo o cambiar de navegador lo elimina.',
      '**En nuestros servidores (solo si creas una cuenta).**',
      [
        'Un identificador interno de jugador y el identificador que Google nos da para tu cuenta. **No recibimos ni guardamos tu correo ni tu nombre real**: tu nombre inicial es genérico («Jugador-xxxx») y lo eliges tú.',
        'Tu nombre visible y tu avatar (de una lista cerrada).',
        'Tu progreso, para sincronizarlo entre dispositivos: totales de XP, partidas y aciertos, logros, estadísticas por pregunta, preguntas falladas y vistas, historial reciente y ajustes.',
        'Tu actividad online: amistades, Duelos y Retos (resultados, respuestas, puntuación y valoración competitiva) y tu posición en el Ranking.',
        'Si activas los avisos (Retos y solicitudes de amistad): los datos técnicos de la suscripción de tu navegador (necesarios para enviarte el aviso) y tu zona horaria. No hay horario de silencio propio: para no recibir avisos de noche, usa «No molestar» de tu móvil.'
      ],
      '**Lo que ven otros jugadores.** Tu nombre visible, tu avatar y tus resultados de Duelo y Retos son visibles para tus amigos y rivales; tu posición y tu progreso, en el Ranking. El Ranking **no está verificado**: las cifras las declara cada dispositivo.'
    ] },
    { h: 'Para qué se usan', b: [
      'Solo para el funcionamiento del juego: identificarte, sincronizar tu progreso, hacer funcionar Duelos, Retos, Amigos y Ranking, y enviarte los avisos de Retos y de amistad que hayas activado. No hay publicidad, ni perfiles con fines comerciales, ni venta de datos, ni análisis de uso de terceros.'
    ] },
    { h: 'Base legal', b: [
      'Prestar el servicio que has pedido al crear la cuenta (ejecución del contrato) y la seguridad básica del servicio, con un límite de peticiones frente a abusos (interés legítimo). Los avisos se basan en tu consentimiento: los activas tú y puedes desactivarlos cuando quieras.'
    ] },
    { h: 'Con quién se comparten', b: [
      [
        '**Google** (inicio de sesión con Google): confirma que eres tú. Se rige por su propia política.',
        '**Cloudflare** (Workers y base de datos D1): aloja el servidor y guarda los datos de la cuenta. Como proveedor de infraestructura puede tratar datos técnicos de conexión, como la dirección IP.',
        '**GitHub Pages**: sirve la aplicación (los archivos del juego). Puede tratar datos técnicos de conexión.',
        '**Servicios de avisos de tu navegador** (el de Google, Apple o Mozilla, según el navegador): entregan las notificaciones si las activas.'
      ],
      'No cedemos datos a ningún otro tercero.'
    ] },
    { h: 'Cuánto tiempo se conservan', b: [
      'Mientras exista tu cuenta. Si la eliminas, se borran de nuestros servidores tus datos de jugador, progreso, logros, amistades, valoración competitiva y suscripciones de avisos. Las copias que quedan en tus dispositivos son tuyas y se borran con «Reiniciar progreso» en Ajustes.'
    ] },
    { h: 'Tus derechos y cómo ejercerlos', b: [
      'Puedes acceder a tus datos, corregirlos, borrarlos, oponerte o pedir su portabilidad.',
      [
        '**Borrar tu cuenta online:** Ajustes → «Eliminar mi cuenta online».',
        '**Copia de tu progreso:** Ajustes → «Descargar copia de seguridad» (archivo .json).',
        '**Cambiar tu nombre o avatar:** desde tu perfil.',
        '**Cualquier otra petición:** escribe a **' + CONTACT + '**.'
      ],
      'Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).'
    ] },
    { h: 'Cambios', b: [
      'Si esta política cambia, se actualizará la fecha de arriba y, si el cambio es relevante, se avisará dentro del juego.'
    ] }
  ];

  function inline(parent, text) {
    String(text).split('**').forEach(function (part, i) {
      if (!part) return;
      if (i % 2) { var s = document.createElement('strong'); s.textContent = part; parent.appendChild(s); }
      else parent.appendChild(document.createTextNode(part));
    });
  }
  function build() {
    var body = document.getElementById('privacy-modal-body');
    if (!body || body.childNodes.length) return;
    var date = document.createElement('p'); date.className = 'privacy-date'; date.textContent = 'Última actualización: ' + UPDATED; body.appendChild(date);
    SECTIONS.forEach(function (sec) {
      var h = document.createElement('h3'); h.textContent = sec.h; body.appendChild(h);
      sec.b.forEach(function (blk) {
        if (Array.isArray(blk)) {
          var ul = document.createElement('ul');
          blk.forEach(function (t) { var li = document.createElement('li'); inline(li, t); ul.appendChild(li); });
          body.appendChild(ul);
        } else { var p = document.createElement('p'); inline(p, blk); body.appendChild(p); }
      });
    });
  }
  function open() {
    var m = document.getElementById('privacy-modal'); if (!m) return;
    build();
    m.style.display = 'flex';
    var card = m.querySelector('.modal-card'); if (card) card.scrollTop = 0;
  }
  function close() { var m = document.getElementById('privacy-modal'); if (m) m.style.display = 'none'; }
  return { open: open, close: close, sections: SECTIONS, contact: CONTACT, updated: UPDATED };
})();
