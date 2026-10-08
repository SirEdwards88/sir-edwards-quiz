// SirEdwards Quiz v2.2 — orden de entrada: bienvenida (solo la primera vez, nada más abrir) → cuenta; o novedades (al actualizar, tras la cuenta).
//
// Antes la bienvenida salía nada más cargar, encima de la pantalla de cuenta. Ahora index.html avisa aquí
// (SEQIntro.afterGate) cuando la pantalla de cuenta se cierra o no hace falta, y se decide UNA vez por carga:
//   - Primera visita en este navegador (sin progreso guardado al abrir) y bienvenida no vista → bienvenida.
//     Se marca también la versión actual como vista: quien acaba de llegar no necesita «novedades».
//   - Jugador que ya tenía progreso → aviso de novedades si esta versión no la ha visto (maybeShowUpdateModal,
//     que lee el propio historial de versiones de Ajustes: una sola fuente de texto) y, si se saltó versiones,
//     un resumen de lo que se perdió (addRecap, con el data-recap de cada entrada del historial).
// Mismas claves de localStorage de siempre (bienvenida y novedades); no toca el progreso.
// Script clásico: usa por nombre, en tiempo de ejecución, APP_VERSION y maybeShowUpdateModal de index.html.

(function () {
  'use strict';

  var WELCOME_KEY = 'siredwards_quiz_v1_1_welcome_seen';
  var UPDATE_KEY = 'siredwards_quiz_v1_3_update_seen';
  var decided = false;
  // Aviso de quien vuelve con su cuenta en un dispositivo nuevo (una vez por dispositivo: se elige al azar).
  var RETURN_LINES = ['Vaya, de vuelta. Tu progreso te esperaba. Tus excusas, también.',
    'Vaya, de vuelta. Qué persistencia tan difícil de justificar.',
    'Has regresado. Debo admitir que esperaba que al menos fingieras tener otras aficiones.',
    'Otra vez tú. Al menos eres constante.',
    'De vuelta. Tus errores estaban empezando a aburrirse sin ti.'];

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Bienvenida en dos viñetas: 1) saludo y qué te espera; 2) «no habrá tutorial». Se marca como vista solo al terminar la 2.
  function welcomeStep(n) {
    var s1 = document.getElementById('welcome-step-1'), s2 = document.getElementById('welcome-step-2'), m = document.getElementById('welcome-modal');
    if (!s1 || !s2) return;
    s1.hidden = n !== 1; s2.hidden = n !== 2;
    if (m) m.setAttribute('aria-labelledby', n === 1 ? 'welcome-title' : 'welcome-title-2');
    var card = m && m.querySelector('.welcome-card'); if (card) card.scrollTop = 0;
    var btn = (n === 1 ? s1 : s2).querySelector('.welcome-btn'); if (btn && n === 2) { try { btn.focus(); } catch (e) {} }
  }
  window.welcomeNext = function () { welcomeStep(2); };

  // Primera visita en este navegador: Sir Edwards se presenta nada más abrir, ANTES de la pantalla de cuenta
  // (y avisa de que no habrá tutorial). Se marca como vista al terminar la segunda viñeta.
  function showWelcomeFirst() {
    try {
      if (window.__seqFirstVisit !== true || get(WELCOME_KEY) === '1') return;
      var qc = document.getElementById('welcome-q-count');
      try { if (qc && typeof TEST_QUESTIONS !== 'undefined' && TEST_QUESTIONS.length) qc.textContent = TEST_QUESTIONS.length; } catch (e) {}
      var modal = document.getElementById('welcome-modal');
      if (!modal) return;
      welcomeStep(1);
      modal.style.display = 'flex';
    } catch (e) { /* nunca debe impedir jugar */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showWelcomeFirst); else showWelcomeFirst();

  function decide() {
    var version = typeof APP_VERSION === 'string' ? APP_VERSION : '';
    if (window.__seqFirstVisit === true) {
      if (version) set(UPDATE_KEY, version);
      // La bienvenida ya salió al abrir (antes de la cuenta). Jugador con progreso en su cuenta que estrena
      // dispositivo: no es un «nuevo aspirante», así que además de la bienvenida se le saluda de vuelta.
      try {
        if (window.SEQOnline && SEQOnline.accountHadProgress && SEQOnline.accountHadProgress()) {
          set(WELCOME_KEY, '1');
          if (typeof showInfoToast === 'function') showInfoToast(RETURN_LINES[Math.floor(Math.random() * RETURN_LINES.length)], 'sombrero');
        }
      } catch (e) {}
      askName(null);
      return;
    }
    // Novedades (al actualizar), pero antes, si sigue con el nombre genérico, se le pregunta cómo llamarle.
    askName(function () {
      var seenBefore = get(UPDATE_KEY);
      if (typeof maybeShowUpdateModal === 'function') maybeShowUpdateModal();
      var upd = document.getElementById('update-modal');
      if (upd && upd.style.display === 'flex') addRecap(seenBefore, version);
    });
  }

  // Pregunta del nombre (src/ui/name-prompt.js): solo si hay cuenta y el nombre es el genérico. Siempre continúa con `next`.
  function askName(next) {
    try { if (window.SEQNamePrompt) { SEQNamePrompt.maybeAsk(next); return; } } catch (e) {}
    if (typeof next === 'function') next();
  }

  // Quien se salta varias versiones (p. ej. jugó en la 1.1 y vuelve en la 2.0) ve, además de las novedades de la
  // versión actual, una línea por cada versión intermedia (las 3 más recientes, en orden cronológico), con el texto corto
  // «data-recap» de su entrada del historial. Sin clave de «visto» (versiones anteriores a la 1.3) cuenta como muy antigua.
  var MAX_RECAP = 3;
  function num(v) { return String(v || '0').replace(/^v/, '').split('.').map(function (x) { return parseInt(x, 10) || 0; }); }
  function cmp(a, b) { var x = num(a), y = num(b); for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; }
  function addRecap(seen, current) {
    var list = document.getElementById('update-modal-list');
    if (!list || document.getElementById('update-modal-recap')) return;
    var missed = [];
    var entries = document.querySelectorAll('.settings-changelog-entry[data-recap]');
    for (var i = 0; i < entries.length; i++) {
      var lbl = entries[i].querySelector('.settings-changelog-entry-version');
      var v = lbl ? lbl.textContent.trim() : '';
      if (v && cmp(v, seen || '0') > 0 && cmp(v, current) < 0) missed.push({ v: v, t: entries[i].getAttribute('data-recap') });
    }
    if (!missed.length) return;
    // Las 3 más recientes, mostradas en orden cronológico (la más antigua arriba), como el historial.
    missed.sort(function (a, b) { return cmp(a.v, b.v); });
    missed = missed.slice(-MAX_RECAP);
    var box = document.createElement('div');
    box.id = 'update-modal-recap';
    box.className = 'update-recap';
    var h = document.createElement('p');
    h.className = 'update-recap-lead';
    h.textContent = 'Primero, lo que te perdiste por no pasarte antes:';
    box.appendChild(h);
    var ul = document.createElement('ul');
    missed.forEach(function (m) {
      var li = document.createElement('li');
      var tag = document.createElement('span'); tag.className = 'update-recap-v'; tag.textContent = m.v;
      li.appendChild(tag); li.appendChild(document.createTextNode(' ' + m.t));
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var now = document.createElement('p');
    now.className = 'update-recap-now';
    now.textContent = 'Y ahora, en la v' + current + ':';
    list.parentNode.insertBefore(box, list);
    list.parentNode.insertBefore(now, list);
    var card = list.closest('.modal-card'); if (card) card.classList.add('has-recap');
  }

  function afterGate() {
    if (decided) return;
    decided = true;
    // Un respiro tras cerrar la pantalla de cuenta para que el mensaje no «pise» la transición.
    setTimeout(function () { try { decide(); } catch (e) { /* nunca debe impedir jugar */ } }, 350);
  }

  window.SEQIntro = { afterGate: afterGate };
})();
