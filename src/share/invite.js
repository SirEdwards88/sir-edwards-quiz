// SirEdwards Quiz — «Invitar a un amigo» (Ajustes).
//
// Abre el menú de compartir del móvil con un texto corto de Sir Edwards y el enlace del juego.
// Sin menú de compartir (ordenador, algunos navegadores) copia el mensaje al portapapeles.
// Script clásico: expone window.SEQInvite. No guarda nada ni toca el progreso.

(function () {
  'use strict';

  // Lleva a la página de instalación (instalar.html): botón de instalar en Android y los tres pasos en iPhone.
  var URL_JUEGO = 'https://siredwards88.github.io/sir-edwards-quiz/instalar.html';
  var TEXTO = 'Sir Edwards ha decidido concederte una oportunidad. Demuestra que estás a la altura.';

  function message() { return TEXTO + '\n' + URL_JUEGO; }

  function feedback(text) {
    var note = document.getElementById('invite-note');
    if (!note) return;
    note.textContent = text;
    note.style.display = 'block';
    clearTimeout(feedback.t);
    feedback.t = setTimeout(function () { note.style.display = 'none'; }, 2600);
  }

  function copy() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(message()).then(
        function () { feedback('Mensaje copiado. Pégalo donde quieras.'); },
        function () { feedback('No he podido copiarlo. El enlace es ' + URL_JUEGO); }
      );
    }
    feedback('El enlace es ' + URL_JUEGO);
    return Promise.resolve();
  }

  function share() {
    if (navigator.share) {
      return navigator.share({ title: 'SirEdwards Quiz', text: TEXTO, url: URL_JUEGO })
        .catch(function (e) { if (!e || e.name !== 'AbortError') return copy(); });
    }
    return copy();
  }

  window.SEQInvite = { share: share, message: message, URL: URL_JUEGO, TEXT: TEXTO };
})();
