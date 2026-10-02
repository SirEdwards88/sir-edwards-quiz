// SirEdwards Quiz — «Momento Sir Edwards»: hitos con frase en Supervivencia y Muerte Súbita.
//
// Solo presentación: NO cambia preguntas, vidas, puntuación ni resultados. Al llegar a ciertas preguntas
// (Supervivencia 10/25/40 de 50, Muerte Súbita 15/25 de 30) aparece Sir Edwards en persona, de medio cuerpo,
// con una frase al azar entre tres. Se cierra al tocar o a los pocos segundos; la pregunta ya está debajo.
// Estos dos modos no tienen cronómetro, así que la pausa no cuesta nada al jugador.
// Una vez por hito y partida. Si en ese momento hay un aviso de racha o de última vida, espera a que acabe.
// Script clásico, sin dependencias. La parte pura (hitoFor / pickPhrase) se prueba en test/hitos.test.mjs.

(function (root) {
  'use strict';

  var IMG = 'assets/character/hito-';
  var HITOS = {
    survival: {
      total: 50,
      at: {
        10: { img: 'barbilla', phrases: [
          'Diez. Empiezo a sospechar que esto podría acabar bien. Qué preocupación.',
          'Diez preguntas y ni una ambulancia. Seguiré mirando.',
          'Diez. Una hazaña modesta, pero no pienso arruinártela. Todavía.'
        ] },
        25: { img: 'monoculo', phrases: [
          'La mitad. Si llegas a cincuenta, fingiré que siempre confié en ti.',
          'Veinticinco. Esto empieza a parecer talento. O una casualidad extraordinaria.',
          'La mitad del camino. Ahora llega la parte en la que empiezas a dudar de todo.'
        ] },
        40: { img: 'manos', phrases: [
          'Cuarenta. Si vas a cometer un error, te agradecería que esperases diez preguntas.',
          'Cuarenta. Ya casi eres digno de celebrarlo. Casi.',
          'Cuarenta. La meta está a la vista. Procura no tropezar con ella.'
        ] }
      }
    },
    sudden_death: {
      total: 30,
      at: {
        15: { img: 'monoculo', phrases: [
          'Quince. Sigues vivo. No te acostumbres.',
          'La mitad. Ahora empieza la parte divertida. Para mí.',
          'Quince y ningún error. Esto empieza a resultar sospechoso.'
        ] },
        25: { img: 'manos', phrases: [
          'Veinticinco. La gloria está cerca. La muerte también.',
          'Cinco preguntas. Has llegado demasiado lejos para morir de forma tan vulgar.',
          'Veinticinco. No arruines mi apuesta.'
        ] }
      }
    }
  };

  // Hito que toca al pintar la pregunta de índice `idx` (0-based): tras responder `idx` preguntas.
  function hitoFor(mode, idx) {
    var m = HITOS[mode];
    var h = m && m.at[idx];
    if (!h) return null;
    return { mode: mode, n: idx, total: m.total, img: IMG + h.img + '.webp', phrases: h.phrases.slice() };
  }

  // Frase al azar, evitando repetir la última que salió en ese mismo hito.
  function pickPhrase(phrases, lastIdx, rnd) {
    var r = typeof rnd === 'function' ? rnd : Math.random;
    if (phrases.length < 2) return 0;
    if (!(lastIdx >= 0)) return Math.min(Math.floor(r() * phrases.length), phrases.length - 1);
    var i = Math.floor(r() * (phrases.length - 1));
    if (lastIdx >= 0 && i >= lastIdx) i++;
    return Math.min(i, phrases.length - 1);
  }

  // ---- Parte con DOM ---------------------------------------------------------------------------
  var LAST_KEY = 'siredwards_quiz_v2_hitos_last';
  var SHOW_MS = 5200;   // la línea dorada del bocadillo dura lo mismo (styles/main.css)
  // Hitos ya mostrados, por partida (la partida es el objeto currentGame; no se le añade nada).
  var shownByGame = typeof WeakMap === 'function' ? new WeakMap() : null;
  var shownFallback = {};
  var openEl = null, closeTimer = 0, waitTimer = 0;

  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function readLast() { try { return JSON.parse(root.localStorage.getItem(LAST_KEY)) || {}; } catch (e) { return {}; } }
  function writeLast(o) { try { root.localStorage.setItem(LAST_KEY, JSON.stringify(o)); } catch (e) {} }

  function close() {
    clearTimeout(closeTimer);
    var el = openEl; openEl = null;
    root.document.removeEventListener('keydown', onKey, true);
    if (!el) return;
    if (reduced()) { el.remove(); return; }
    el.classList.add('is-leaving');
    setTimeout(function () { el.remove(); }, 260);
  }
  function onKey(e) {
    if (!openEl) return;
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); close(); }
  }

  function show(h) {
    var doc = root.document;
    if (!doc || !doc.body) return;
    if (openEl) close();
    var memo = readLast(), key = h.mode + ':' + h.n;
    var pi = pickPhrase(h.phrases, typeof memo[key] === 'number' ? memo[key] : -1);
    memo[key] = pi; writeLast(memo);

    var el = doc.createElement('div');
    el.className = 'sir-hito' + (h.mode === 'sudden_death' ? ' is-sudden' : '');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    // En el centro de la pantalla, donde el jugador tiene la vista: el busto se apoya sobre el bocadillo.
    el.innerHTML =
      '<div class="sir-hito-stage">' +
        '<img class="sir-hito-img" alt="" draggable="false">' +
        '<div class="sir-hito-bubble"><p class="sir-hito-text"></p><span class="sir-hito-sign">— Sir Edwards</span>' +
          '<span class="sir-hito-timer" aria-hidden="true"></span></div>' +
      '</div>';
    el.querySelector('.sir-hito-text').textContent = '«' + h.phrases[pi] + '»';
    var img = el.querySelector('.sir-hito-img');
    img.src = h.img;
    el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); close(); });
    doc.body.appendChild(el);
    openEl = el;
    doc.addEventListener('keydown', onKey, true);
    closeTimer = setTimeout(close, SHOW_MS);
  }

  // Se llama al pintar cada pregunta (cualquier modo); solo actúa en los hitos.
  function check(game) {
    if (!game || game.isDuel) return;
    var h = hitoFor(game.mode, game.currentIdx);
    if (!h) return;
    var key = h.mode + ':' + h.n;
    var shown = shownFallback;
    if (shownByGame) { shown = shownByGame.get(game); if (!shown) { shown = {}; shownByGame.set(game, shown); } }
    if (shown[key]) return;
    shown[key] = true;
    clearTimeout(waitTimer);
    var doc = root.document;
    var busy = doc && doc.querySelector('.fx-streak-banner, .fx-lastlife-banner');
    waitTimer = setTimeout(function () {
      // Si entretanto el jugador salió de la partida, no se muestra.
      var view = doc && doc.getElementById('view-game');
      if (view && view.offsetParent === null && getComputedStyle(view).display === 'none') return;
      show(h);
    }, busy ? 800 : 120);
  }

  // Al empezar una partida: cierra un aviso abierto y precarga las imágenes de ese modo.
  function reset(mode) {
    shownFallback = {};
    clearTimeout(waitTimer);
    if (openEl) close();
    var m = HITOS[mode];
    if (!m || typeof root.Image !== 'function') return;
    Object.keys(m.at).forEach(function (k) { var i = new root.Image(); i.src = IMG + m.at[k].img + '.webp'; });
  }

  root.SEQHitos = { HITOS: HITOS, hitoFor: hitoFor, pickPhrase: pickPhrase, check: check, reset: reset, close: close };
})(typeof window !== 'undefined' ? window : globalThis);
