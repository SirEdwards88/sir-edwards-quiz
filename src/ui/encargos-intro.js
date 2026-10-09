// SirEdwards Quiz — Presentación de Sir Edwards (Encargos): escena de entrada, carta de los lunes y estado local. Script clásico.
//
//   · La tira de Encargos de Inicio permanece OCULTA hasta que esta presentación se ha visto EN ESTE DISPOSITIVO (marca local en
//     localStorage; no va al store, no se sincroniza y no toca el Worker). El progreso de Encargos se sigue contando mientras tanto.
//   · Escena grande: tras terminar una partida (cualquiera salvo Repaso, incluidos Duelo y Reto), al volver a Inicio, si no hay
//     modal ni partida a la vista. Si algo estorba, no se marca nada y se reintenta en la siguiente visita a Inicio.
//   · Carta de los lunes: una vez por lunes, la primera vez que se abre Inicio (y nunca el día de la gran presentación).
// Necesita: encargos-intro-core.js, encargos-intro-phrases.js, encargos-core.js (semana); usa en ejecución switchTab, store y
// pickRotatingPhrase de index.html. Solo animaciones de opacidad/transformación; con «reducir movimiento» solo fundidos.

const SEQEncargosIntro = (function () {
  'use strict';

  var K_SEEN = 'siredwards_quiz_encargos_intro_seen';        // valor: día local AAAA-MM-DD en que se vio
  var K_MONDAY = 'siredwards_quiz_encargos_monday_week';      // valor: semana (AAAA-Www) cuya carta ya salió
  var mem = {};                                                // respaldo si localStorage no está disponible
  var pendingResult = null;                                    // resultado de la última partida terminada (solo en memoria)
  var active = null;                                           // escena o carta en curso
  var lastFocus = null;

  var IMG = {
    evaluador: 'assets/character/presentacion-evaluador.webp',
    expediente: 'assets/character/presentacion-expediente.webp',
    mirada: 'assets/character/presentacion-mirada.webp',
    aprobacion: 'assets/character/lunes-aprobacion.webp',
    reproche: 'assets/character/lunes-reproche.webp',
    incorporacion: 'assets/character/presentacion-expediente.webp',
    ausencia: 'assets/character/presentacion-mirada.webp'
  };

  function get(k) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} return mem[k] == null ? null : mem[k]; }
  function set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function core() { return typeof SEQEncargosIntroCore !== 'undefined' ? SEQEncargosIntroCore : null; }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pick(pool, list) {
    try { if (typeof pickRotatingPhrase === 'function' && typeof store === 'object' && store) return pickRotatingPhrase(pool, list); } catch (e) {}
    return list[Math.floor(Math.random() * list.length)];
  }

  function seen() { return !!get(K_SEEN); }
  // Quien recupera el progreso de su cuenta (con partidas jugadas) no es nuevo: se da la presentación por vista en este dispositivo.
  function markSeen() { if (!seen()) set(K_SEEN, dayKey(new Date())); }

  // ¿Algo que no se debe tapar? Modales, la escena en curso, una partida, otra pantalla distinta de Inicio, o app en segundo plano.
  function blocked() {
    try {
      if (active || document.hidden) return true;
      var ov = document.querySelectorAll('.modal-overlay');
      for (var i = 0; i < ov.length; i++) if (getComputedStyle(ov[i]).display !== 'none') return true;
    } catch (e) { return true; }
    return false;
  }
  function viewActive(id) { var v = document.getElementById(id); return !!(v && v.classList.contains('active')); }
  function onHomeNow() { return viewActive('view-home'); }
  // «Volver al Menú principal» de la tarjeta de resultados lleva a la pantalla de modos (view-modes): ahí también vale para presentarse.
  function onMenuNow() { return viewActive('view-home') || viewActive('view-modes'); }
  function inGameNow() { return document.body.classList.contains('in-game'); }

  // ---- enganches con las partidas (los llama index.html) -----------------------------------------------------------
  function noteGame(info) { if (!seen() && core()) pendingResult = core().classify(info); }
  function noteDuel(result) { if (!seen() && core()) pendingResult = core().classify({ kind: 'duel', result: result }); }

  function playerName() {
    try { var s = window.SEQOnline && SEQOnline.session && SEQOnline.session(); return core().cleanName(s && s.display_name); } catch (e) { return null; }
  }

  function introWeekId() {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(get(K_SEEN) || '');
    if (!m) return null;
    try { return SEQEncargos.weekIdOf(SEQEncargos.weekIndexAt(new Date(+m[1], +m[2] - 1, +m[3], 12).getTime())); } catch (e) { return null; }
  }

  // Semanas desde la última carta vista o, si no hay ninguna, desde la presentación (la más reciente de las dos).
  function awayWeeks(idx, introWeek) {
    var last = null;
    [get(K_MONDAY), introWeek].forEach(function (id) {
      var i = id ? SEQEncargos.weekIndexOfId(id) : null;
      if (typeof i === 'number' && (last === null || i > last)) last = i;
    });
    return last === null ? 0 : core().weeksAway(idx, last);
  }

  // Al llegar a Inicio (switchTab) y, una vez, al arrancar. Se espera un instante a que Inicio se asiente y se vuelve a comprobar.
  function onHome() {
    if (!core() || typeof ENCARGOS_INTRO === 'undefined') return;
    setTimeout(function () {
      try {
        var base = { onHome: onHomeNow(), inGame: inGameNow(), blocked: blocked() };
        if (!seen()) {
          if (core().shouldShowIntro({ seen: false, hasResult: pendingResult !== null, onHome: onMenuNow(), inGame: base.inGame, blocked: base.blocked })) startScene();
          return;
        }
        var now = new Date(), idx = SEQEncargos.weekIndexAt(now.getTime()), weekId = SEQEncargos.weekIdOf(idx);
        // Semana de incorporación: la de la gran presentación (sale de su fecha). No se evalúa ni recibe carta.
        var introWeek = introWeekId();
        if (core().shouldShowMonday({ seen: true, introWeek: introWeek, weekId: weekId, lastShown: get(K_MONDAY),
          onHome: base.onHome, inGame: base.inGame, blocked: base.blocked })) startMonday(weekId, SEQEncargos.weekIdOf(idx - 1), introWeek, now.getDay() === 1, awayWeeks(idx, introWeek));
      } catch (e) { /* nunca debe impedir jugar */ }
    }, 700);
  }

  // ---- pieza común --------------------------------------------------------------------------------------------------
  function preload(urls, done) {
    var left = urls.length, finished = false;
    function end() { if (!finished) { finished = true; done(); } }
    var t = setTimeout(end, 1800);
    urls.forEach(function (u) {
      var im = new Image();
      im.onload = im.onerror = function () { if (--left <= 0) { clearTimeout(t); end(); } };
      im.src = u;
    });
  }
  function trapKeys(root, onEsc) {
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onEsc(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(root.querySelectorAll('button'), function (b) { return b.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', key, true);
    return function () { document.removeEventListener('keydown', key, true); };
  }
  function mount(cls) {
    var el = document.createElement('div');
    el.className = 'enc-intro ' + cls + (reduced() ? ' is-reduced' : '');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    lastFocus = document.activeElement;
    document.body.appendChild(el);
    return el;
  }
  function unmount(el, off) {
    el.classList.remove('is-on'); el.classList.add('is-out');
    if (off) off();
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, reduced() ? 120 : 480);
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
  }

  // ---- escena grande ------------------------------------------------------------------------------------------------
  // La música de menús se retiene mientras dura la presentación grande y se suelta al cerrarla (audio.js: SEQMusic).
  function menuMusic(hold) { try { if (window.SEQMusic) { if (hold) SEQMusic.hold(); else SEQMusic.release(); } } catch (e) {} }

  var sessionShown = false;     // ¿se ha enseñado la presentación o la carta semanal en esta sesión? (los eventos de partida lo consultan)
  function startScene(preview) {
    sessionShown = true;
    var C = core(), R = ENCARGOS_INTRO.result;
    var key = (preview ? 'normal' : pendingResult) || 'neutra';
    var name = playerName();
    var steps = [
      { beat: 1, text: (name ? 'Ah, ' + name + '. Una partida terminada.' : 'Ah. Una partida terminada.'), ms: 2400 },
      { beat: 1, text: pick('encintro_' + key, R[key] && R[key].length ? R[key] : R.neutra), ms: 2900 },
      { beat: 1, text: 'Permíteme presentarme: soy Sir Edwards. Evaluador oficial de tu lucidez.', ms: 3300, title: true },
      { beat: 1, text: 'Nadie me lo pidió. Me nombré yo mismo.', ms: 2600, title: true },
      { beat: 2, text: 'Y como todo talento necesita supervisión…', ms: 2600 },
      { beat: 2, text: 'Cada semana tendrás tres encargos.', ms: 2300 },
      { beat: 2, text: 'Y un Gran Encargo… para quien tenga ambición.', ms: 2900 },
      { beat: 3, text: 'Cumplirlos mejorará tu expediente. Mi opinión de ti, ya veremos.', ms: 2600 },
      { beat: 3, text: 'Ignorarlos…', ms: 1900 },
      { beat: 3, text: 'me dará material.', ms: 2100 },
      { beat: 3, text: 'Te estaré observando.', ms: 2700, blink: true },
      { beat: 4, final: true, ms: 5000 }
    ];

    var el = mount('enc-intro--scene');
    el.setAttribute('aria-label', 'Presentación de Sir Edwards');
    el.innerHTML =
      '<div class="enc-intro-spot"></div><div class="enc-intro-vig"></div><div class="enc-intro-dim"></div>' +
      '<div class="enc-intro-stage"><div class="enc-intro-fig" aria-hidden="true">' +
        '<img class="enc-intro-img" alt="" draggable="false" decoding="async">' +
        '<img class="enc-intro-sil" alt="" draggable="false" decoding="async"></div></div>' +
      '<div class="enc-intro-paper"></div><div class="enc-intro-blink"></div>' +
      '<div class="enc-intro-title" aria-hidden="true"><div class="t1">SIR EDWARDS</div><div class="t2">Evaluador oficial de tu lucidez</div></div>' +
      '<p class="enc-intro-caption" aria-live="polite"></p>' +
      '<div class="enc-intro-hint" aria-hidden="true">Toca para continuar</div>' +
      '<div class="enc-intro-final"><div class="enc-intro-dossier"><div class="k">ENCARGOS</div><div class="m">Tu expediente ha sido abierto.</div>' +
        '<div class="seal" aria-hidden="true"><span>SE</span></div></div>' +
        '<button type="button" class="enc-intro-go">Ver mis encargos</button></div>';
    var img = el.querySelector('.enc-intro-img'), sil = el.querySelector('.enc-intro-sil'), cap = el.querySelector('.enc-intro-caption');
    var fig = el.querySelector('.enc-intro-fig'), go = el.querySelector('.enc-intro-go');
    el.tabIndex = -1;
    var timers = [], idx = -1, ended = false, curBeat = 0, lastTap = 0;
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); }
    function clearAll() { timers.forEach(clearTimeout); timers = []; }

    // Cambio de pose: fundido cruzado (la imagen nueva aparece sobre la anterior, que se retira cuando termina; nunca un corte).
    function setBeat(b) {
      if (b === curBeat) return;
      var first = !curBeat;
      curBeat = b;
      var src = b === 1 ? IMG.evaluador : b === 2 ? IMG.expediente : IMG.mirada;
      el.setAttribute('data-beat', String(b));
      sil.src = src;
      if (first) img.src = src;
      else {
        var old = img, nw = old.cloneNode(false);
        nw.className = 'enc-intro-img is-fade-in'; nw.src = src;
        old.classList.add('is-fade-out');
        old.parentNode.insertBefore(nw, old.nextSibling);
        img = nw;
        setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, reduced() ? 700 : 1500);
      }
      fig.classList.remove('is-b1', 'is-b2', 'is-b3', 'is-restart');
      void fig.offsetWidth;
      fig.classList.add('is-b' + b);
      if (b === 2) { el.classList.remove('do-paper'); void el.offsetWidth; el.classList.add('do-paper'); }
    }
    function say(text) {
      cap.classList.remove('in'); el.classList.remove('show-hint');
      later(function () { cap.textContent = text; void cap.offsetWidth; cap.classList.add('in'); }, cap.textContent ? 180 : 0);
      later(function () { el.classList.add('show-hint'); }, 1600);   // pista de «toca», sin prisa
    }
    function show(i) {
      if (ended) return;
      clearAll();
      idx = i;
      var s = steps[i];
      if (!s) { finish(false); return; }
      if (s.final) { showFinal(); return; }
      setBeat(s.beat);
      el.classList.toggle('show-title', !!s.title);
      if (s.blink) {
        el.classList.remove('do-blink'); void el.offsetWidth; el.classList.add('do-blink');
        cap.classList.remove('in'); el.classList.remove('show-hint');
        later(function () { cap.textContent = s.text; void cap.offsetWidth; cap.classList.add('in'); }, 340);
        later(function () { el.classList.add('show-hint'); }, 2000);
      } else say(s.text);
      // Nada avanza solo: cada paso espera al toque del jugador, que lee a su ritmo.
    }
    function showFinal() {
      el.classList.add('is-final'); el.classList.remove('show-hint');
      cap.classList.remove('in');
      later(function () { try { if (!reduced() && navigator.vibrate) navigator.vibrate(35); } catch (e) {} }, 900);
      // El cierre se queda hasta que el jugador pulse «Ver mis encargos» .
    }
    function finish(toEncargos) {
      if (ended) return;
      ended = true; clearAll(); menuMusic(false);
      document.removeEventListener('keydown', onKey, true);
      if (!preview) { set(K_SEEN, dayKey(new Date())); pendingResult = null; }
      unmount(el, offKeys);
      active = null;
      try {
        if (toEncargos && typeof switchTab === 'function') switchTab('encargos');
        else { if (viewActive('view-modes') && typeof switchTab === 'function') switchTab('home'); revealStrip(); }
      } catch (e) {}
    }
    var offKeys = trapKeys(el, function () { finish(false); });
    function next() {
      if (ended || el.classList.contains('is-final')) return;
      var now = Date.now(); if (now - lastTap < 350) return;   // un doble toque sin querer no se come una frase
      lastTap = now; show(idx + 1);
    }
    function onKey(e) {
      if (e.target && e.target.tagName === 'BUTTON') return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
    }
    document.addEventListener('keydown', onKey, true);
    el.addEventListener('click', function (e) {
      if (e.target === go) { finish(true); return; }
      next();    // toque = siguiente
    });
    active = { el: el };
    menuMusic(true);
    preload([IMG.evaluador, IMG.expediente, IMG.mirada], function () {
      if (ended) return;
      void el.offsetWidth;
      el.classList.add('is-on');
      el.focus({ preventScroll: true });
      show(0);
    });
  }

  // La tira aparece con un destello dorado (solo opacidad; sin destello con «reducir movimiento»).
  function revealStrip() {
    try { if (typeof SEQEncargosUI !== 'undefined') SEQEncargosUI.renderHome(); } catch (e) {}
    var s = document.getElementById('home-encargos');
    if (!s || s.hidden || reduced()) return;
    s.classList.remove('is-reveal'); void s.offsetWidth; s.classList.add('is-reveal');
    setTimeout(function () { s.classList.remove('is-reveal'); }, 1400);
  }

  // ---- carta de los lunes -------------------------------------------------------------------------------------------
  function startMonday(weekId, lastWeekId, introWeek, isMonday, away) {
    sessionShown = true;
    var C = core(), M = ENCARGOS_INTRO.monday;
    var claimed = (typeof store === 'object' && store && store.encargosClaimed) || [];
    var kind = C.mondayKind(claimed, lastWeekId, introWeek, away);
    var lines = [
      C.mondayOpen(M, isMonday),
      pick('lunes_v_' + kind, C.mondayVerdictPool(M, kind)),
      pick('lunes_c_' + kind, C.mondayCommentPool(M, kind)),
      pick('lunes_z', C.mondayClosePool(M))
    ];
    set(K_MONDAY, weekId);
    var el = mount('enc-intro--monday is-' + kind);
    el.setAttribute('aria-label', 'Sir Edwards, nueva semana');
    el.innerHTML =
      '<div class="enc-intro-vig"></div>' +
      '<div class="enc-monday-card">' +
        '<img class="enc-monday-img" src="' + IMG[kind] + '" alt="" draggable="false" decoding="async">' +
        '<div class="enc-monday-lines" aria-live="polite">' + lines.map(function (l, i) { return '<p class="enc-monday-line' + (i === 0 ? ' is-open' : '') + '">' + esc(l) + '</p>'; }).join('') + '</div>' +
        '<div class="enc-monday-actions"><button type="button" class="enc-monday-go">Ver mis encargos</button><button type="button" class="enc-monday-close">Cerrar</button></div>' +
      '</div>';
    var ps = el.querySelectorAll('.enc-monday-line'), go = el.querySelector('.enc-monday-go'), close = el.querySelector('.enc-monday-close');
    var offsets = [0, 1100, 2300, 3800], timers = [], all = false, ended = false;
    var stay = C.readMs(lines);   // tiempo de lectura proporcional al texto; ver SEQEncargosIntroCore.readMs
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function revealAll() { all = true; timers.forEach(clearTimeout); timers = []; for (var i = 0; i < ps.length; i++) ps[i].classList.add('in'); later(function () { end(false); }, stay); }
    function end(toEncargos) {
      if (ended) return;
      ended = true; timers.forEach(clearTimeout);
      unmount(el, offKeys); active = null;
      if (toEncargos) { try { switchTab('encargos'); } catch (e) {} }
    }
    var offKeys = trapKeys(el, function () { end(false); });
    el.addEventListener('click', function (e) {
      if (e.target === close) { end(false); return; }
      if (e.target === go) { end(true); return; }
      if (e.target.closest && e.target.closest('.enc-monday-card')) { if (all) end(true); else revealAll(); return; }
      end(false);   // toque fuera de la carta: cerrar
    });
    active = { el: el };
    preload([IMG[kind]], function () {
      if (ended) return;
      void el.offsetWidth; el.classList.add('is-on');
      go.focus({ preventScroll: true });
      for (var i = 0; i < ps.length; i++) (function (i) { later(function () { ps[i].classList.add('in'); }, offsets[i]); })(i);
      later(function () { all = true; later(function () { end(false); }, stay); }, offsets[offsets.length - 1] + 400);
    });
  }

  // Vista previa: abrir la app con «?presentacion» en la dirección repite la escena grande sin marcar nada (ni «vista»): sirve para revisarla las veces que haga falta. Espera a que no haya modales, cuenta ni partida delante.
  function replay() {
    var tries = 0;
    (function wait() {
      if (!active && !blocked() && !inGameNow()) startScene(true);
      else if (tries++ < 80) setTimeout(wait, 500);
    })();
  }

  return { seen: seen, markSeen: markSeen, replay: replay, noteGame: noteGame, noteDuel: noteDuel, onHome: onHome, shownThisSession: function () { return sessionShown; }, isActive: function () { return !!active; } };
})();

// Un lunes con la app ya abierta: se comprueba una vez al arrancar (si hay modales o cuenta, se deja para la siguiente visita a Inicio).
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    var preview = false;
    try { preview = /[?&]presentacion(=|&|$)/.test(location.search); } catch (e) {}
    // La tira de Inicio se pinta ya al abrir la app (Inicio es la vista activa sin pasar por switchTab).
    try { SEQEncargosUI.renderHome(); } catch (e) {}
    setTimeout(function () { try { preview ? SEQEncargosIntro.replay() : SEQEncargosIntro.onHome(); } catch (e) {} }, 3500);
  });
}
