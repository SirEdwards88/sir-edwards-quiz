// SirEdwards Quiz — «Última vida» y «Última pregunta» (solo presentación).
//
// NO cambia vidas, puntuación, preguntas ni resultados: lee el estado que ya existe (modo, vidas,
// índice y total) y solo decide qué texto/aviso mostrar.
//   - Supervivencia: al quedar con 1 vida aparece el aviso «ÚLTIMA VIDA» y el marcador se tiñe;
//     el primer acierto después muestra «¡Sigues con vida!» (una sola vez).
//   - Supervivencia y Muerte Súbita: en la última pregunta el contador pasa a «ÚLTIMA PREGUNTA»
//     y sale un aviso breve. Con una vida y última pregunta, un solo aviso con ambas cosas.
// Script clásico, sin dependencias. La parte pura (counter / isLastLife / isLastQuestion) se prueba en test/.

(function (root) {
  'use strict';

  function isLastLife(mode, lives) {
    return mode === 'survival' && Number(lives) === 1;
  }
  function isLastQuestion(mode, idx, total) {
    return (mode === 'survival' || mode === 'sudden_death') && total > 1 && idx + 1 === total;
  }
  // Texto del contador de la cabecera: «12/50» o «ÚLTIMA» (corto: la cabecera comparte fila con la píldora de racha).
  function counter(mode, idx, total) {
    return isLastQuestion(mode, idx, total) ? 'ÚLTIMA' : (idx + 1) + '/' + total;
  }

  // ---- Parte con DOM ---------------------------------------------------------------------------
  var armed = false;      // true tras quedar en última vida: el siguiente acierto muestra «Sigues con vida»
  var lastKey = '';       // evita repetir el aviso de última pregunta si se vuelve a pintar la misma
  var timer = 0;

  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function banner(title, sub, tone) {
    var host = root.document && root.document.getElementById('view-game');
    if (!host) return;
    var old = host.querySelector('.fx-lastlife-banner'); if (old) old.remove();
    clearTimeout(timer);
    var b = root.document.createElement('div');
    b.className = 'fx-lastlife-banner' + (tone ? ' ' + tone : '');
    b.setAttribute('aria-hidden', 'true');
    var t = root.document.createElement('span'); t.className = 'fx-lastlife-title'; t.textContent = title;
    b.appendChild(t);
    if (sub) { var s = root.document.createElement('span'); s.className = 'fx-lastlife-sub'; s.textContent = sub; b.appendChild(s); }
    // Sobre la cabecera (modo · contador), como el aviso de racha, y no sobre el enunciado.
    var anchor = root.document.getElementById('game-progress-lbl');
    if (anchor && anchor.getBoundingClientRect) {
      var ar = anchor.getBoundingClientRect(), top = ar.top + ar.height / 2 - host.getBoundingClientRect().top;
      if (isFinite(top) && top > 0) b.style.top = Math.max(34, Math.round(top)) + 'px';
    }
    host.appendChild(b);
    timer = setTimeout(function () { b.remove(); }, 1600);
  }

  // Se llama cada vez que se pinta la cabecera de una pregunta (cualquier modo).
  function decorate(game) {
    var doc = root.document; if (!doc || !game) return;
    var lbl = doc.getElementById('game-progress-lbl');
    var last = isLastLife(game.mode, game.lives);
    if (lbl) lbl.classList.toggle('last-life', last);
    if (game.mode !== 'survival') armed = false;
    var total = game.totalQuestionsToPlay;
    if (!isLastQuestion(game.mode, game.currentIdx, total)) { lastKey = ''; return; }
    var key = game.mode + ':' + game.currentIdx;
    if (key === lastKey || reduced()) { lastKey = key; return; }
    lastKey = key;
    if (last) banner('Última vida · Última pregunta', '', 'is-life');
    else banner('Última pregunta', game.mode === 'sudden_death' ? 'Aquí se decide todo.' : 'Ya casi. No lo estropees.', 'is-last');
  }

  // Tras restar una vida en Supervivencia.
  function onLifeLost(game) {
    if (!game || !isLastLife(game.mode, game.lives)) return;
    armed = true;
    var lbl = root.document && root.document.getElementById('game-progress-lbl');
    if (lbl) lbl.classList.add('last-life');
    if (!reduced() && !isLastQuestion(game.mode, game.currentIdx, game.totalQuestionsToPlay)) {
      banner('❤️ Última vida', 'Ahora sí importa.', 'is-life');
    }
  }

  // Tras un acierto en Supervivencia.
  function onCorrect(game) {
    if (!game || !armed || !isLastLife(game.mode, game.lives)) return;
    armed = false;
    if (!reduced() && !isLastQuestion(game.mode, game.currentIdx, game.totalQuestionsToPlay)) banner('¡Sigues con vida!', '', 'is-ok');
  }

  function reset() { armed = false; lastKey = ''; }

  root.SEQLastLife = { isLastLife: isLastLife, isLastQuestion: isLastQuestion, counter: counter, decorate: decorate, onLifeLost: onLifeLost, onCorrect: onCorrect, reset: reset };
})(typeof window !== 'undefined' ? window : globalThis);
