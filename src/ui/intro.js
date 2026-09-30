// SirEdwards Quiz v2.0 — orden de entrada: cuenta → bienvenida (solo la primera vez) o novedades (al actualizar).
//
// Antes la bienvenida salía nada más cargar, encima de la pantalla de cuenta. Ahora index.html avisa aquí
// (SEQIntro.afterGate) cuando la pantalla de cuenta se cierra o no hace falta, y se decide UNA vez por carga:
//   - Primera visita en este navegador (sin progreso guardado al abrir) y bienvenida no vista → bienvenida.
//     Se marca también la versión actual como vista: quien acaba de llegar no necesita «novedades».
//   - Jugador que ya tenía progreso → aviso de novedades si esta versión no la ha visto (maybeShowUpdateModal,
//     que lee el propio historial de versiones de Ajustes: una sola fuente de texto).
// Mismas claves de localStorage de siempre (bienvenida y novedades); no toca el progreso.
// Script clásico: usa por nombre, en tiempo de ejecución, APP_VERSION y maybeShowUpdateModal de index.html.

(function () {
  'use strict';

  var WELCOME_KEY = 'siredwards_quiz_v1_1_welcome_seen';
  var UPDATE_KEY = 'siredwards_quiz_v1_3_update_seen';
  var decided = false;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function decide() {
    var version = typeof APP_VERSION === 'string' ? APP_VERSION : '';
    if (window.__seqFirstVisit === true) {
      if (version) set(UPDATE_KEY, version);
      if (get(WELCOME_KEY) === '1') return;
      var modal = document.getElementById('welcome-modal');
      if (modal) modal.style.display = 'flex';
      return;
    }
    if (typeof maybeShowUpdateModal === 'function') maybeShowUpdateModal();
  }

  function afterGate() {
    if (decided) return;
    decided = true;
    // Un respiro tras cerrar la pantalla de cuenta para que el mensaje no «pise» la transición.
    setTimeout(function () { try { decide(); } catch (e) { /* nunca debe impedir jugar */ } }, 350);
  }

  window.SEQIntro = { afterGate: afterGate };
})();
