// SirEdwards Quiz 2.5 — Preguntas de Sir Edwards: la interrupción (pantalla) y su estado.
// Una vez cada 3 partidas, entre dos preguntas, Sir Edwards interrumpe con una pregunta extra. NO cuenta en precisión, rachas, XP, vidas ni
// logros de aciertos: solo suma a dos contadores propios (store.sirAnswered / store.sirCorrect) que alimentan sus dos logros.
// Nunca penaliza. Solo en Estándar, Supervivencia, Muerte Súbita y Repaso (reglas y azar en src/utils/sir-interrupt.js).
// Usa por nombre, en tiempo de ejecución: SIR_QUESTIONS, SEQSirInterruptCore, store, saveStore. Script clásico.
// El estado (bloque de 3 partidas y bolsa de preguntas) vive en su propia clave local: no se sincroniza ni toca el progreso.

const SEQSirInterrupt = (function () {
  'use strict';
  var KEY = 'siredwards_quiz_v2_5_sirq';
  var ART = 'assets/character/event_siredwards_visit.webp';
  var WAIT_MS = 700;    // los toques no cuentan justo al aparecer: el dedo aún venía de «Siguiente»
  var planned = null;   // { game, at }: la partida en curso y ante qué pregunta interrumpe
  var el = null, onDone = null, waitT = null, current = null, openGame = null, guardT = null;
  // Avisos que, vistos o a punto de salir, hacen que la interrupción ceda (se aplaza a la pregunta siguiente; si no queda, se pierde sin penalizar).
  var BUSY_SEL = '.sir-hito, .fx-lastlife-banner, .fx-streak-banner, .encargos-toast.show, .mode-unlock-toast.show, .reward-toast.show, .info-toast.show, .inbox-banner.show, .lucidez-unlock-overlay, #sir-event.show';

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object' && Array.isArray(s.bag)) return s; } catch (e) {}
    return SEQSirInterruptCore.newState();
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  // Al empezar una partida (index.html, startModeImpl, ya con su cola montada).
  function plan(game) {
    planned = null;
    try {
      if (!game || !SEQSirInterruptCore.eligible(game.mode, game.isDuel)) return;
      var r = SEQSirInterruptCore.startGame(load(), { mode: game.mode, isDuel: game.isDuel, total: (game.queue || []).length }, Math.random);
      save(r.state);
      if (r.at !== null) planned = { game: game, at: r.at };
    } catch (e) {}
  }

  function isOpen() { return !!el && el.style.display !== 'none' && !!current; }

  // ¿Hay algo a la vista o a punto de salir? (evento de Sir Edwards, hito, aviso de vida/racha, Encargo, logro, modal...)
  function busy(game) {
    try {
      var d = document;
      if (d.querySelector(BUSY_SEL)) return true;
      if (typeof SEQSirEventsUI !== 'undefined' && SEQSirEventsUI.isVisible()) return true;
      if (typeof sirEventsPending === 'function' && sirEventsPending()) return true;               // evento con su espera de 450 ms en marcha
      if (typeof SEQRewardToast !== 'undefined' && SEQRewardToast.busy && SEQRewardToast.busy()) return true;
      if (typeof SEQEncargosUI !== 'undefined' && SEQEncargosUI.busy && SEQEncargosUI.busy()) return true;
      if (typeof SEQLucidezUnlock !== 'undefined' && SEQLucidezUnlock.active && SEQLucidezUnlock.active()) return true;
      // La pregunta que viene lleva hito de Sir Edwards o aviso de «última pregunta»: la interrupción no se le pone delante.
      if (typeof SEQHitos !== 'undefined' && SEQHitos.hitoFor && SEQHitos.hitoFor(game.mode, game.currentIdx)) return true;
      var total = Number(game.totalQuestionsToPlay) || (game.queue || []).length;
      if ((game.mode === 'survival' || game.mode === 'sudden_death') && total > 1 && game.currentIdx + 1 === total) return true;
      var res = d.getElementById('results-card');
      if (res && res.style.display === 'block') return true;
      var ms = d.querySelectorAll('.modal-overlay');
      for (var i = 0; i < ms.length; i++) { if (ms[i] !== el && ms[i].style.display !== 'none' && getComputedStyle(ms[i]).display !== 'none') return true; }
    } catch (e) {}
    return false;
  }

  // Mientras la tarjeta está abierta, Intro / Espacio no llegan a la partida de detrás (la respuesta de texto, «Siguiente»...).
  function trapKeys(e) {
    if (!isOpen() || (e.key !== 'Enter' && e.key !== ' ')) return;
    if (el.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
  }
  // Si el jugador sale de la partida con la tarjeta abierta (atrás, menú), se cierra sin continuar.
  function guard() {
    var alive = typeof currentGame !== 'undefined' && currentGame === openGame;
    var view = document.getElementById('view-game');
    if (alive && view && getComputedStyle(view).display !== 'none') return;
    abandon();
  }
  function abandon() {
    clearInterval(guardT); guardT = null; clearTimeout(waitT);
    document.removeEventListener('keydown', trapKeys, true);
    if (el) el.style.display = 'none';
    onDone = null; current = null; openGame = null;
  }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function ensure() {
    if (el && document.body.contains(el)) return el;
    el = document.createElement('div');
    el.id = 'sir-interrupt';
    el.className = 'modal-overlay sir-int';
    el.style.display = 'none';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'sir-int-label');
    el.innerHTML =
      '<div class="modal-card seq-modal-card sir-int-card" tabindex="-1">' +
        '<div class="sir-int-head"><img class="sir-int-img" src="' + ART + '" alt="" width="64" height="80" decoding="async" draggable="false">' +
        '<div class="sir-int-label" id="sir-int-label">Sir Edwards interrumpe</div></div>' +
        '<p class="sir-int-q" id="sir-int-q"></p>' +
        '<div class="sir-int-opts" id="sir-int-opts" role="group" aria-labelledby="sir-int-q"></div>' +
        '<div class="sir-int-react" id="sir-int-react" aria-live="polite"></div>' +
        '<button type="button" class="btn btn-primary sir-int-go" id="sir-int-go" hidden>Continuar</button>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('#sir-int-go').addEventListener('click', close);
    try { if (typeof SEQA11y !== 'undefined' && SEQA11y.watch) SEQA11y.watch(el); } catch (e) {}   // foco dentro, Tab atrapado y foco devuelto (src/ui/a11y.js)
    return el;
  }

  function show(q, cont, game) {
    var node = ensure();
    current = q; onDone = cont; openGame = game || null;
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    document.addEventListener('keydown', trapKeys, true);
    clearInterval(guardT); guardT = setInterval(guard, 400);
    var order = SEQSirInterruptCore.order(q, Math.random);
    node.querySelector('#sir-int-q').textContent = q.q;
    var opts = node.querySelector('#sir-int-opts');
    opts.innerHTML = order.map(function (orig, pos) {
      return '<button type="button" class="sir-int-opt" data-i="' + orig + '"><span class="sir-int-key" aria-hidden="true">' + String.fromCharCode(65 + pos) + '</span><span class="sir-int-txt">' + esc(q.options[orig]) + '</span></button>';
    }).join('');
    node.querySelector('#sir-int-react').textContent = '';
    node.querySelector('#sir-int-react').className = 'sir-int-react';
    node.querySelector('#sir-int-go').hidden = true;
    opts.classList.add('is-wait');
    clearTimeout(waitT);
    waitT = setTimeout(function () { opts.classList.remove('is-wait'); }, WAIT_MS);
    Array.prototype.forEach.call(opts.querySelectorAll('.sir-int-opt'), function (b) {
      b.addEventListener('click', function () { answer(Number(b.getAttribute('data-i'))); });
    });
    node.style.display = 'flex';
    try { if (typeof playSirEventSound === 'function') playSirEventSound(); } catch (e) {}
  }

  function answer(idx) {
    var node = el, opts = node && node.querySelector('#sir-int-opts');
    if (!opts || opts.classList.contains('is-wait') || opts.classList.contains('is-done') || !current) return;
    var g = SEQSirInterruptCore.grade(current, idx);
    if (!g) return;
    opts.classList.add('is-done');
    Array.prototype.forEach.call(opts.querySelectorAll('.sir-int-opt'), function (b) {
      var i = Number(b.getAttribute('data-i'));
      b.disabled = true;
      if (i === idx) b.classList.add('is-picked');
      if (current.kind === 'trap') { if (i === current.correct) b.classList.add('is-right'); else if (i === idx) b.classList.add('is-wrong'); }
    });
    var r = node.querySelector('#sir-int-react');
    r.textContent = g.reaction;
    r.className = 'sir-int-react is-shown' + (g.correct === true ? ' is-right' : g.correct === false ? ' is-wrong' : '');
    try {
      store.sirAnswered = (Number(store.sirAnswered) || 0) + 1;
      if (g.correct === true) store.sirCorrect = (Number(store.sirCorrect) || 0) + 1;
      saveStore();
    } catch (e) {}
    var go = node.querySelector('#sir-int-go');
    go.hidden = false;
    try { go.focus({ preventScroll: true }); } catch (e) {}
  }

  function close() {
    clearTimeout(waitT); clearInterval(guardT); guardT = null;
    document.removeEventListener('keydown', trapKeys, true);
    if (el) el.style.display = 'none';
    var cb = onDone; onDone = null; current = null; openGame = null;
    if (cb) { try { cb(); } catch (e) {} }
  }

  // Desde nextQuestion(): true si interrumpe (entonces `cont` se llamará al cerrar); false si no toca.
  // Si hay algo a la vista o pendiente, cede: se aplaza a la pregunta siguiente y, si ya no queda ninguna, se pierde (sin penalizar).
  function maybe(game, cont) {
    try {
      if (!planned || planned.game !== game || game.currentIdx !== planned.at || typeof SIR_QUESTIONS === 'undefined') return false;
      if (isOpen()) return false;
      if (busy(game)) {
        if (planned.at + 1 < (game.queue || []).length) planned.at++; else planned = null;
        return false;
      }
      planned = null;
      var s = SEQSirInterruptCore.markShown(load());
      var p = SEQSirInterruptCore.pick(s, SIR_QUESTIONS, Math.random);
      save(p.state);
      show(p.question, cont, game);
      return true;
    } catch (e) { return false; }
  }

  return { plan: plan, maybe: maybe, isOpen: isOpen, busy: busy };
})();
