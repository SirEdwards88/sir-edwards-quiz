// SirEdwards Quiz — Avisos de presentación de los Retos por modo (script clásico, solo pinta; no cambia nada de la partida).
//
// Los Retos dibujan su propia cabecera (src/online/duels.js) y no tienen los avisos de la partida normal. Aquí viven:
//   - «+3 / +4 / −3 SEGUNDOS» al acertar o fallar en Contrarreloj y Cálculo Turbo (misma pieza que la partida normal: .timetrial-change),
//   - «Última vida» al quedarse con una sola vida en Supervivencia,
//   - «Has sobrevivido» al terminar Supervivencia con vida.
// Los hitos de Sir Edwards (src/ui/hitos.js) no se usan en los Retos, así que no interrumpen sus 20 s por pregunta.
(function (root) {
  'use strict';

  var BONUS = { contrarreloj: 3, calculo_mental: 4 };
  var LOSS = 3;
  var chTimer = 0, flashTimer = 0, bannerTimer = 0, shownKeys = {};

  function isClock(modo) { return !!BONUS[modo]; }

  // Aviso flotante de segundos + destello del número del reloj. `gain`: true si acertó.
  function timeChange(modo, gain) {
    if (!isClock(modo) || !root.document) return;
    var doc = root.document, el = doc.getElementById('seq-reto-change');
    if (!el) { el = doc.createElement('div'); el.id = 'seq-reto-change'; el.className = 'timetrial-change'; el.setAttribute('aria-hidden', 'true'); doc.body.appendChild(el); }
    el.textContent = gain ? '+' + BONUS[modo] + ' SEGUNDOS' : '−' + LOSS + ' SEGUNDOS';
    el.classList.remove('show', 'tt-gain', 'tt-loss');
    void el.offsetWidth;
    el.classList.add('show', gain ? 'tt-gain' : 'tt-loss');
    clearTimeout(chTimer);
    chTimer = setTimeout(function () { el.classList.remove('show', 'tt-gain', 'tt-loss'); }, 850);
    var num = doc.getElementById('seq-d-time');
    if (num) {
      num.classList.remove('tt-timer-flash-up', 'tt-timer-flash-down');
      void num.offsetWidth;
      num.classList.add(gain ? 'tt-timer-flash-up' : 'tt-timer-flash-down');
      clearTimeout(flashTimer);
      flashTimer = setTimeout(function () { num.classList.remove('tt-timer-flash-up', 'tt-timer-flash-down'); }, 850);
    }
  }

  function banner(title, sub, tone) {
    var doc = root.document; if (!doc || !doc.body) return; // con «reducir movimiento» sale igual, sin animación (CSS)
    var old = doc.querySelector('.fx-lastlife-banner'); if (old) old.remove();
    clearTimeout(bannerTimer);
    var b = doc.createElement('div');
    b.className = 'fx-lastlife-banner' + (tone ? ' ' + tone : '');
    b.setAttribute('aria-hidden', 'true');
    var t = doc.createElement('span'); t.className = 'fx-lastlife-title'; t.textContent = title; b.appendChild(t);
    if (sub) { var s = doc.createElement('span'); s.className = 'fx-lastlife-sub'; s.textContent = sub; b.appendChild(s); }
    doc.body.appendChild(b);
    bannerTimer = setTimeout(function () { b.remove(); }, 2200);
  }

  function once(key) { if (shownKeys[key]) return false; shownKeys[key] = true; return true; }

  // Al pintar una pregunta de un Reto: «Última vida» (una vez por reto y pregunta).
  function onQuestion(d) {
    try {
      var est = (d && d.yo && d.yo.estado) || {};
      if (d.modo === 'supervivencia' && Number(est.vidas_max) > 1 && Number(est.vidas) === 1 && d.yo.actual && once('life:' + d.id + ':' + d.yo.actual.indice)) {
        banner('Última vida', 'Ahora sí importa. Qué lástima que no importaran las anteriores.', 'is-life');
      }
      shownKeys['played:' + d.id] = true;
    } catch (e) {}
  }
  // Al ver tu parte terminada: «Has sobrevivido» solo si acabas de jugarla aquí (no al reabrirla desde el historial).
  function onFinished(d) {
    try {
      var est = (d && d.yo && d.yo.estado) || {};
      if (d.modo === 'supervivencia' && Number(est.vidas) > 0 && shownKeys['played:' + d.id] && once('survived:' + d.id)) {
        banner('Has sobrevivido', 'Con vida, que no es poco.', 'is-ok');
      }
    } catch (e) {}
  }

  root.SEQRetoFX = { timeChange: timeChange, onQuestion: onQuestion, onFinished: onFinished, isClock: isClock };
})(window);
