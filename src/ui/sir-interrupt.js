// SirEdwards Quiz 2.5 — Preguntas de Sir Edwards: la interrupción (pantalla) y su estado.
// Una vez cada 3 partidas, entre dos preguntas, Sir Edwards interrumpe con una pregunta extra. NO cuenta en precisión, rachas, XP, vidas ni
// logros de aciertos: solo suma a dos contadores propios (store.sirAnswered / store.sirCorrect) que alimentan sus dos logros.
// Nunca penaliza. Solo en Estándar, Supervivencia y Muerte Súbita (reglas y azar en src/utils/sir-interrupt.js).
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
    unfit(); resetStage();
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
        '<div class="sir-int-head"><img class="sir-int-img" src="' + ART + '" alt="" width="160" height="200" decoding="async" draggable="false">' +
        '<div class="sir-int-label" id="sir-int-label">Sir Edwards interrumpe</div></div>' +
        '<p class="sir-int-q" id="sir-int-q"></p>' +
        '<div class="sir-int-opts" id="sir-int-opts" role="group" aria-labelledby="sir-int-q"></div>' +
        '<form class="sir-int-form" id="sir-int-form" autocomplete="off" novalidate hidden>' +
          '<input type="text" class="sir-int-input" id="sir-int-input" placeholder="Escribe tu respuesta" aria-label="Tu respuesta" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" maxlength="80">' +
          '<button type="submit" class="btn btn-primary sir-int-send" id="sir-int-send" disabled>Responder</button>' +
        '</form>' +
      '</div>' +
      '<div class="sir-int-stage" id="sir-int-stage" hidden>' +
        '<div class="sir-int-stage-fig"><img class="sir-int-stage-img" src="' + ART + '" alt="" width="300" height="375" decoding="async" draggable="false"></div>' +
        '<div class="sir-int-seal" id="sir-int-verdict" aria-hidden="true"></div>' +
        '<p class="sir-int-say" id="sir-int-say" aria-hidden="true"></p>' +
        '<p class="sr-only" id="sir-int-react" aria-live="polite"></p>' +
        '<button type="button" class="btn btn-primary sir-int-go" id="sir-int-go" hidden>Continuar</button>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('#sir-int-go').addEventListener('click', close);
    el.querySelector('#sir-int-stage').addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#sir-int-go')) return; skipTyping(); });
    var inp = el.querySelector('#sir-int-input'), card = el.querySelector('.sir-int-card');
    inp.addEventListener('input', function () { el.querySelector('#sir-int-send').disabled = !inp.value.trim(); });
    inp.addEventListener('focus', function () { card.classList.add('typing'); });
    inp.addEventListener('blur', function () { card.classList.remove('typing'); });
    el.querySelector('#sir-int-form').addEventListener('submit', function (e) { e.preventDefault(); answerText(); });
    try { if (typeof SEQA11y !== 'undefined' && SEQA11y.watch) SEQA11y.watch(el); } catch (e) {}   // foco dentro, Tab atrapado y foco devuelto (src/ui/a11y.js)
    return el;
  }

  // Con el teclado abierto (móvil) la pantalla visible es más baja que la ventana: la tarjeta se centra y limita a lo visible
  // para que el campo y «Responder» no queden bajo el teclado.
  function fit() {
    try {
      if (!el) return;
      var vv = window.visualViewport, card = el.querySelector('.sir-int-card');
      if (!vv) return;
      el.style.height = vv.height + 'px'; el.style.top = vv.offsetTop + 'px';
      if (card) card.style.maxHeight = Math.floor(vv.height * 0.96) + 'px';
    } catch (e) {}
  }
  function unfit() {
    try {
      if (!el) return;
      el.style.height = ''; el.style.top = '';
      var card = el.querySelector('.sir-int-card'); if (card) card.style.maxHeight = '';
    } catch (e) {}
    try { if (window.visualViewport) { window.visualViewport.removeEventListener('resize', fit); window.visualViewport.removeEventListener('scroll', fit); } } catch (e) {}
  }

  function show(q, cont, game) {
    var node = ensure();
    current = q; onDone = cont; openGame = game || null;
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    document.addEventListener('keydown', trapKeys, true);
    clearInterval(guardT); guardT = setInterval(guard, 400);
    var typed = q.kind === 'trap';   // las trampas se escriben (como en Lucidez Mental): con opciones a la vista se huelen
    var order = typed ? [] : SEQSirInterruptCore.order(q, Math.random);
    node.querySelector('#sir-int-q').textContent = q.q;
    var opts = node.querySelector('#sir-int-opts');
    opts.hidden = typed;
    var form = node.querySelector('#sir-int-form'), inp = node.querySelector('#sir-int-input');
    form.hidden = !typed; form.classList.remove('is-done');
    inp.value = ''; inp.disabled = false; inp.className = 'sir-int-input';
    node.querySelector('#sir-int-send').disabled = true;
    opts.innerHTML = order.map(function (orig, pos) {
      return '<button type="button" class="sir-int-opt" data-i="' + orig + '"><span class="sir-int-key" aria-hidden="true">' + String.fromCharCode(65 + pos) + '</span><span class="sir-int-txt">' + esc(q.options[orig]) + '</span></button>';
    }).join('');
    resetStage(node);
    opts.classList.add('is-wait');
    clearTimeout(waitT);
    waitT = setTimeout(function () { opts.classList.remove('is-wait'); }, WAIT_MS);
    Array.prototype.forEach.call(opts.querySelectorAll('.sir-int-opt'), function (b) {
      b.addEventListener('click', function () { answer(Number(b.getAttribute('data-i'))); });
    });
    node.style.display = 'flex';
    try { if (window.visualViewport) { window.visualViewport.addEventListener('resize', fit); window.visualViewport.addEventListener('scroll', fit); } } catch (e) {}
    fit();
    if (typed) {   // enfoca el campo solo (en móvil abre el teclado; la tarjeta se compacta mientras se escribe)
      setTimeout(function () { try { if (current === q && !inp.disabled) inp.focus({ preventScroll: true }); } catch (e) {} }, WAIT_MS + 50);
    }
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
    });
    finish(g);
  }

  // Trampa: respuesta escrita, corregida con el mismo motor que Lucidez Mental (isMatchWithAlias).
  function answerText() {
    var node = el, form = node && node.querySelector('#sir-int-form'), inp = node && node.querySelector('#sir-int-input');
    if (!form || form.hidden || form.classList.contains('is-done') || !current || typeof isMatchWithAlias !== 'function') return;
    var wait = node.querySelector('#sir-int-opts');
    if (wait && wait.classList.contains('is-wait')) return;
    var extra = []; try { if (store && store.playerName) extra.push(String(store.playerName)); } catch (e) {}
    var g = SEQSirInterruptCore.gradeText(current, inp.value, isMatchWithAlias, extra);
    if (!g) return;
    form.classList.add('is-done');
    inp.disabled = true; node.querySelector('#sir-int-send').disabled = true;
    inp.classList.add(g.correct ? 'is-right' : 'is-wrong');
    try { inp.blur(); } catch (e) {}
    finish(g);
  }

  // ---- Desenlace (2.5): primero se marca la respuesta (verde/rojo + sonido); un instante después la tarjeta cae, la pantalla se oscurece
  // en foco y Sir Edwards entra en grande: sello con el veredicto y su frase escrita a pluma.
  var stageT = null, typeT = null, typing = null;
  function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function resetStage(node) {
    clearTimeout(stageT); clearInterval(typeT); stageT = typeT = typing = null;
    try { if (typeof stopQuillSound === 'function') stopQuillSound(); } catch (e) {}
    node = node || el; if (!node) return;
    node.classList.remove('stage-on');
    var card = node.querySelector('.sir-int-card'); if (card) card.classList.remove('fx-right', 'fx-wrong', 'is-out');
    var st = node.querySelector('#sir-int-stage'); if (st) { st.hidden = true; st.className = 'sir-int-stage'; }
    ['#sir-int-verdict'].forEach(function (id) { var x = node.querySelector(id); if (x) x.textContent = ''; });
    var sy = node.querySelector('#sir-int-say'); if (sy) sy.innerHTML = '';
    var r = node.querySelector('#sir-int-react'); if (r) r.textContent = '';
    var go = node.querySelector('#sir-int-go'); if (go) go.hidden = true;
  }
  function endTyping() {
    clearInterval(typeT); typeT = null;
    try { if (typeof stopQuillSound === 'function') stopQuillSound(); } catch (e) {}   // frase completa (o tocada para saltarla): la pluma calla
    if (typing) { var say = el && el.querySelector('#sir-int-say'); if (say) say.innerHTML = sayHTML(typing.text, typing.text.length, typing.range); typing = null; }
    var node = el; if (!node) return;
    var st = node.querySelector('#sir-int-stage'); if (st) st.classList.add('is-done');
    var go = node.querySelector('#sir-int-go');
    if (go && go.hidden) { go.hidden = false; try { go.focus({ preventScroll: true }); } catch (e) {} }
  }
  // Frase de Sir Edwards con la respuesta resaltada: `range` = [inicio, fin) dentro del texto; `upto` = cuántos caracteres se ven ya.
  function hlRange(q, text) {
    var low = String(text).toLowerCase();
    for (var i = 0; q && q.hl && i < q.hl.length; i++) {
      var at = low.indexOf(String(q.hl[i]).toLowerCase());
      if (at >= 0) return [at, at + q.hl[i].length];
    }
    return null;
  }
  function sayHTML(text, upto, range) {
    var t = String(text).slice(0, upto);
    if (!range || range[0] >= t.length) return esc(t);
    var e = Math.min(range[1], t.length);
    return esc(t.slice(0, range[0])) + '<mark class="sir-int-hl">' + esc(t.slice(range[0], e)) + '</mark>' + esc(t.slice(e));
  }
  function skipTyping() { if (typing) endTyping(); }

  function showStage(g) {
    var node = el; if (!node || !current) return;
    var kind = g.correct === true ? 'right' : g.correct === false ? 'wrong' : 'note';
    var st = node.querySelector('#sir-int-stage');
    node.classList.add('stage-on');
    node.querySelector('.sir-int-card').classList.add('is-out');
    st.className = 'sir-int-stage is-' + kind; st.hidden = false;
    node.querySelector('#sir-int-verdict').textContent = g.correct === true ? 'Correcto' : g.correct === false ? 'Incorrecto' : 'Anotado';
    node.querySelector('#sir-int-react').textContent = g.reaction;       // lectores de pantalla: la frase entera al momento
    try { if (typeof playSirVerdictSound === 'function') playSirVerdictSound(g.correct === true ? 'ok' : g.correct === false ? 'bad' : 'note'); } catch (e) {}
    try { if (g.correct === false && navigator.vibrate) navigator.vibrate([40, 40, 80]); } catch (e) {}
    var say = node.querySelector('#sir-int-say'), text = String(g.reaction || '');
    var range = g.correct === null ? null : hlRange(current, text);
    if (reduced()) { say.innerHTML = sayHTML(text, text.length, range); st.classList.add('is-done'); var go = node.querySelector('#sir-int-go'); go.hidden = false; try { go.focus({ preventScroll: true }); } catch (e) {} return; }
    typing = { text: text, i: 0, range: range };
    var step = Math.max(14, Math.min(30, Math.floor(1500 / Math.max(1, text.length))));
    stageT = setTimeout(function () {                // el sello cae primero; después empieza a escribir
      try { if (typeof startQuillSound === 'function') startQuillSound(step * text.length / 1000 + 0.1); } catch (e) {}
      typeT = setInterval(function () {
        if (!typing) return;
        typing.i++; say.innerHTML = sayHTML(typing.text, typing.i, typing.range);
        if (typing.i >= typing.text.length) endTyping();
      }, step);
    }, 650);
  }

  function finish(g) {
    var node = el;
    var card = node.querySelector('.sir-int-card');
    card.classList.remove('fx-right', 'fx-wrong'); void card.offsetWidth;
    // Al responder solo se marca (verde/rojo, sin sonido): el sonido es uno solo y suena con la entrada de Sir Edwards (showStage).
    if (g.correct === true) card.classList.add('fx-right'); else if (g.correct === false) card.classList.add('fx-wrong');
    try {
      store.sirAnswered = (Number(store.sirAnswered) || 0) + 1;
      if (g.correct === true) store.sirCorrect = (Number(store.sirCorrect) || 0) + 1;
      saveStore();
    } catch (e) {}
    clearTimeout(stageT);
    stageT = setTimeout(function () { showStage(g); }, g.correct === null ? 700 : 1100);
  }

  function close() {
    unfit(); resetStage();
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
