// SirEdwards Quiz 1.0 — Tutorial interactivo de Duelos (siete viñetas). Script clásico: expone window.SEQDuelTour.
//
// Qué hace: una capa a pantalla completa que resalta elementos reales de la pantalla de Duelos (o una demostración aislada con datos
// ficticios) y una tarjeta de Sir Edwards colocada según el espacio. Atrás / Continuar, progreso «n de 7» y una despedida final.
// Textos y pasos: src/data/duel-tour-steps.js (definitivos).
//
// Reglas de seguridad (ver test/duel-tour.test.mjs):
//   · NUNCA llama al Worker ni a SEQOnline.api: no crea invitaciones ni salas, no escribe nada en el servidor.
//   · NUNCA toca el estado de las partidas (SEQDuels): solo lee el estado para saber si es seguro abrirse. Las demostraciones son HTML
//     estático inerte (sin onclick, sin ids, aria-hidden), así que no hay controles falsos que envíen nada.
//   · Su única marca es siredwards_quiz_duel_tour_seen. No lee ni escribe K_HELP, K_INTRO, K_UNLOCKED, claves de progreso,
//     de novedades ni de migración de versiones: ver o no ver el recorrido no cambia el desbloqueo de Duelos.
//   · La primera visualización no se puede omitir (sin «Saltar», y Escape no la cierra). Repetirla desde el «?» sí se puede cerrar.
//   · No se abre sobre una partida, invitación o sala activas: se aplaza hasta que sea seguro.
// Con «reducir movimiento» no hay animaciones.

window.SEQDuelTour = (function () {
  'use strict';

  var D = window.SEQDuelTourData || { key: 'siredwards_quiz_duel_tour_seen', steps: [], farewell: {}, labels: {} };
  var mem = {};
  var root = null, st = { i: 0, farewell: false, replay: false }, opener = null, raf = 0, io = null, waitT = null, waitN = 0;

  // ---- Almacenamiento (una sola clave, con copia en memoria si el navegador no deja guardar) -----------------------------------
  function get() { try { var v = localStorage.getItem(D.key); if (v !== null) return v; } catch (e) {} return mem[D.key] == null ? null : mem[D.key]; }
  function set() { mem[D.key] = '1'; try { localStorage.setItem(D.key, '1'); } catch (e) {} }
  function seen() { return get() === '1'; }

  // ---- Lógica pura (probada sin DOM) ---------------------------------------------------------------------------------------------
  // Rectángulo que engloba varios; ignora los no medibles.
  function unionRect(rects) {
    var ok = (rects || []).filter(function (r) { return r && r.width > 4 && r.height > 4; });
    if (!ok.length) return null;
    var l = Math.min.apply(null, ok.map(function (r) { return r.left; })), t = Math.min.apply(null, ok.map(function (r) { return r.top; }));
    var rr = Math.max.apply(null, ok.map(function (r) { return r.left + r.width; })), b = Math.max.apply(null, ok.map(function (r) { return r.top + r.height; }));
    return { left: l, top: t, width: rr - l, height: b - t };
  }
  // Recorta el rectángulo al área visible (con margen) para que el resalte nunca se salga de la pantalla.
  function clampRect(r, vw, vh, pad) {
    if (!r) return null;
    var l = Math.max(pad, r.left), t = Math.max(pad, r.top), rr = Math.min(vw - pad, r.left + r.width), b = Math.min(vh - pad, r.top + r.height);
    if (rr - l < 4 || b - t < 4) return null;
    return { left: l, top: t, width: rr - l, height: b - t };
  }
  // Dónde va la tarjeta: debajo de lo resaltado, encima, o al pie si no cabe ni arriba ni abajo; sin diana, centrada.
  function placeCard(rect, vh, cardH, margin, gap) {
    margin = margin == null ? 12 : margin; gap = gap == null ? 14 : gap;
    if (!rect) return { mode: 'center', top: Math.max(margin, Math.round((vh - cardH) / 2)) };
    var below = vh - (rect.top + rect.height) - margin, above = rect.top - margin;
    if (below >= cardH + gap) return { mode: 'below', top: Math.round(rect.top + rect.height + gap) };
    if (above >= cardH + gap) return { mode: 'above', top: Math.round(rect.top - gap - cardH) };
    return { mode: 'bottom', top: Math.max(margin, Math.round(vh - cardH - margin)) };
  }
  // Factor de escala de una demostración para que quepa en el hueco que deja la tarjeta (nunca más del 100 % ni menos del 55 %).
  function demoScale(natH, availH) { if (!(natH > 0) || !(availH > 0)) return 1; return Math.max(0.55, Math.min(1, availH / natH)); }
  // ¿Es seguro abrir el recorrido? Pantallas de partida/invitación/sala, partidas o invitaciones activas del servidor y enlaces
  // propios guardados bloquean. `s`: estado de SEQDuels (screen, lists); `own`: ¿hay un enlace propio abierto en este dispositivo?
  var BUSY_SCREENS = ['duel', 'multi', 'reto', 'invite', 'invites', 'pick', 'pickkind', 'multipick', 'retomode'];
  function isBusy(s, own) {
    s = s || {};
    if (own) return true;
    if (BUSY_SCREENS.indexOf(s.screen) >= 0) return true;
    var L = s.lists || {};
    var live = function (x) { return x && (x.estado === 'pendiente' || x.estado === 'aceptado' || x.estado === 'en_curso'); };
    if ((L.duels || []).some(live)) return true;
    if ((L.multis || []).some(function (x) { return live(x) && (x.mi_estado === 'invitado' || x.mi_estado === 'aceptado'); })) return true;
    if ((L.retos || []).some(function (x) { return x && x.estado === 'aceptado' && x.yo && x.yo.empezado && !x.yo.terminado; })) return true;
    if (L.link && L.link.estado === 'abierto') return true;   // enlace 1 contra 1 abierto, también el de otro dispositivo (lo declara el Worker)
    return false;
  }
  // ¿Ya se sabe qué hay activo? Con las invitaciones unificadas también hace falta el estado de mi enlace.
  function listsKnown(s, v2) { var L = (s && s.lists) || {}; return L.duels !== undefined && (!v2 || L.link !== undefined); }

  // ---- Estado del entorno (solo lectura) ---------------------------------------------------------------------------------------
  function duelState() { try { return window.SEQDuels && window.SEQDuels._state ? window.SEQDuels._state() : null; } catch (e) { return null; } }
  function v2On() { try { var s = window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session(); return !!(s && s.features && s.features.classic_duel && s.features.duel_links && s.features.duel_invites_v2); } catch (e) { return false; } }
  function sessionOn() { try { var s = window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session(); return !!(s && s.features && (s.features.classic_duel || s.features.async_challenges)); } catch (e) { return false; } }
  function ownLinkLocal() {
    var now = Date.now();
    var chk = function (k) { try { var o = JSON.parse(localStorage.getItem(k)); return !!(o && Number(o.endsAt) > now); } catch (e) { return false; } };
    return chk('siredwards_quiz_duel_link_own') || chk('siredwards_quiz_multi_link_own');
  }
  function duelTabVisible() { try { var v = document.getElementById('view-duelo'); return !!(v && v.classList.contains('active')); } catch (e) { return false; } }
  // Otro diálogo abierto (nombre, confirmaciones, Ayuda…): no se apila encima; se espera a que se cierre.
  function modalOpen() {
    try {
      var l = document.querySelectorAll('.modal-overlay');
      for (var i = 0; i < l.length; i++) { if (l[i].getClientRects().length > 0) return true; }
    } catch (e) {}
    return false;
  }
  function busyNow() { return isBusy(duelState(), ownLinkLocal()); }

  // ---- Demostraciones aisladas (HTML estático con datos ficticios, sin ids, sin eventos, aria-hidden) ----------------------------------
  function ini(n) { return '<span class="dtour-av" aria-hidden="true">' + n.charAt(0) + '</span>'; }
  // img: ruta de una imagen fija, o «ico:nombre» para un icono ilustrado del juego (los mismos de la pantalla real).
  function icoHtml(img) {
    if (!img) return '';
    if (img.indexOf('ico:') === 0) { try { return window.seqIco ? window.seqIco(img.slice(4)) : ''; } catch (e) { return ''; } }
    return '<img src="' + img + '" alt="" draggable="false" onerror="this.remove()">';
  }
  function opt(t, img, title, sub) {
    return '<div class="dtour-opt" data-t="' + t + '"><span class="dtour-opt-ic">' + icoHtml(img) + '</span>' +
      '<span class="dtour-opt-body"><b>' + title + '</b><i>' + sub + '</i></span><span class="dtour-opt-go">›</span></div>';
  }
  function row(n, sub, host) { return '<div class="dtour-row">' + ini(n) + '<span class="dtour-row-t"><b>' + n + (host ? ' · Tú' : '') + '</b><i>' + sub + '</i></span></div>'; }
  var DEMOS = {
    modos: function () {
      return '<div class="dtour-h">Duelo online</div><div class="dtour-opts">' +
        opt('clasico', 'assets/duelos/modos/classic.webp', 'Clásico', 'Veinte preguntas contra el reloj.') +
        opt('apuestas', 'assets/duelos/modos/stakes.webp', 'Apuestas', 'Tú eliges cuánto arriesgas.') + '</div>';
    },
    rivales: function () {
      return '<div class="dtour-h">Duelo clásico</div><div class="dtour-opts">' +
        opt('uno', 'assets/duelos/formato/uno-contra-uno.webp', '1 contra 1', 'Reta a otro jugador.') +
        opt('todos', 'assets/duelos/formato/multiple.webp', 'Todos contra todos', 'De 3 a 4 jugadores.') + '</div>';
    },
    invitar: function () {
      return '<div class="dtour-h">Invitar jugadores</div><div class="dtour-pillrow"><span class="dtour-pill">Todos contra todos · Puedes combinar ambos</span></div><div class="dtour-opts">' +
        opt('enlace', 'ico:compartir', 'Invitar por enlace', 'Comparte una invitación con quien quieras.') +
        opt('amigo', 'ico:amigos', 'Invitar a un amigo', 'Selecciona un amigo disponible.') + '</div>';
    },
    sala: function () {
      return '<div class="dtour-room"><div class="dtour-h">Esperando jugadores</div>' +
        '<div class="dtour-meta"><span class="dtour-pill">Clásico · Todos contra todos</span><span class="dtour-time">Caduca en 8:42</span></div>' +
        '<div class="dtour-count">3/4 jugadores</div>' +
        '<div class="dtour-rows" data-t="participantes">' + row('Edu', 'Anfitrión', true) + row('Clara', 'Ha aceptado') + row('Dani', 'Ha aceptado') + '</div>' +
        '<div class="dtour-btns"><span class="dtour-btn dtour-btn-sec" data-t="compartir">Compartir enlace</span><span class="dtour-btn dtour-btn-sec">Copiar enlace</span></div>' +
        '<div class="dtour-btns"><span class="dtour-btn dtour-btn-pri" data-t="empezar">Empezar duelo</span><span class="dtour-btn dtour-btn-sec" data-t="cancelar">Cancelar sala</span></div></div>';
    }
  };

  // ---- Construcción de la capa ------------------------------------------------------------------------------------------------------
  function total() { return D.steps.length; }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function txt(parent, tag, cls, text) { var e = el(tag, cls); e.textContent = text; parent.appendChild(e); return e; }

  function build() {
    root = el('div', 'dtour');
    root.id = 'duel-tour';
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'dtour-title');
    var spot = el('div', 'dtour-spot'); spot.setAttribute('aria-hidden', 'true'); root.appendChild(spot);
    var demo = el('div', 'dtour-demo'); demo.setAttribute('aria-hidden', 'true'); try { demo.inert = true; } catch (e) {} root.appendChild(demo);
    var card = el('div', 'dtour-card'); card.tabIndex = -1; root.appendChild(card);
    document.body.appendChild(root);
  }
  function q(sel) { return root ? root.querySelector(sel) : null; }

  function paintCard() {
    var card = q('.dtour-card'); if (!card) return;
    while (card.firstChild) card.removeChild(card.firstChild);
    var L = D.labels || {}, n = total(), step = D.steps[st.i], fw = st.farewell;
    var data = fw ? D.farewell : step;
    var head = el('div', 'dtour-head');
    var med = el('span', 'dtour-med'); var img = el('img'); img.src = data.img; img.alt = ''; img.draggable = false; img.decoding = 'async'; med.appendChild(img); head.appendChild(med);
    var meta = el('div', 'dtour-meta2');
    txt(meta, 'span', 'dtour-step', L.progress ? L.progress(fw ? n : st.i + 1, n) : (fw ? n : st.i + 1) + ' de ' + n);
    var prog = el('span', 'dtour-prog'); prog.setAttribute('aria-hidden', 'true');
    for (var k = 0; k < n; k++) { var dot = el('i'); if (fw || k <= st.i) dot.className = 'on'; prog.appendChild(dot); }
    meta.appendChild(prog); head.appendChild(meta);
    if (st.replay) { var x = el('button', 'dtour-x'); x.type = 'button'; x.setAttribute('aria-label', L.close || 'Cerrar'); x.textContent = '×'; x.addEventListener('click', close); head.appendChild(x); }
    card.appendChild(head);
    var h = txt(card, 'h2', 'dtour-title', data.title); h.id = 'dtour-title';
    txt(card, 'p', 'dtour-body', data.body);
    var act = el('div', 'dtour-actions');
    var back = el('button', 'btn btn-secondary dtour-back'); back.type = 'button'; back.textContent = L.back || 'Atrás';
    if (st.i === 0 && !fw) back.disabled = true;
    back.addEventListener('click', prev);
    var next = el('button', 'btn btn-primary dtour-next'); next.type = 'button'; next.textContent = fw ? (D.farewell.button || 'Empezar a jugar') : (L.next || 'Continuar');
    next.addEventListener('click', advance);
    act.appendChild(back); act.appendChild(next); card.appendChild(act);
    try { next.focus({ preventScroll: true }); } catch (e) {}
    card.scrollTop = 0;
  }

  // ---- Colocación: resalte + tarjeta + demostración ------------------------------------------------------------------------------
  function viewport() {
    var vv = window.visualViewport;
    return { w: Math.round((vv && vv.width) || window.innerWidth || 360), h: Math.round((vv && vv.height) || window.innerHeight || 640) };
  }
  function visibleRect(e) {
    if (!e) return null;
    try { var r = e.getBoundingClientRect(); if (r.width > 4 && r.height > 4 && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed')) return r; } catch (x) {}
    return null;
  }
  function layout() {
    raf = 0;
    if (!root) return;
    var vp = viewport(), card = q('.dtour-card'), spot = q('.dtour-spot'), demo = q('.dtour-demo');
    var fw = st.farewell, step = D.steps[st.i], rect = null, demoName = !fw && step.target === 'demo' ? step.demo : null;
    var cardH = card.offsetHeight || 220;
    root.classList.toggle('dtour-has-demo', !!demoName);
    if (demoName) {
      // Demostración arriba, tarjeta al pie; la demostración se encoge si no cabe (nunca se sale de la pantalla).
      var natH = demo.getAttribute('data-natural') ? Number(demo.getAttribute('data-natural')) : demo.scrollHeight;
      if (!demo.getAttribute('data-natural')) demo.setAttribute('data-natural', String(natH));
      var avail = vp.h - cardH - 12 - 12 - 14, s = demoScale(natH, avail);
      demo.style.transform = 'scale(' + s + ')'; demo.style.height = Math.round(natH) + 'px';
      demo.style.top = '12px';
      var parts = step.selectors.map(function (sel) { return visibleRect(demo.querySelector(sel)); });
      rect = clampRect(unionRect(parts), vp.w, vp.h, 4);
      card.style.top = 'auto'; card.style.bottom = '12px';
    } else if (!fw) {
      // Los selectores reales son alternativas por orden: vale el primero que se ve y se puede medir. Si ninguno, no se señala nada.
      var target = null;
      for (var i = 0; i < step.selectors.length && !target; i++) { var cand = document.querySelector(step.selectors[i]); if (visibleRect(cand)) target = cand; }
      // Se acerca lo resaltado al centro la primera vez (la pantalla de Duelos es desplazable) y se vuelve a medir.
      if (target && !root.getAttribute('data-scrolled-' + st.i)) { root.setAttribute('data-scrolled-' + st.i, '1'); try { target.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (x) {} }
      rect = clampRect(target ? visibleRect(target) : null, vp.w, vp.h, 4);
      var place = placeCard(rect, vp.h, cardH, 12, 14);
      if (place.mode === 'bottom') { card.style.top = 'auto'; card.style.bottom = '12px'; }
      else { card.style.top = place.top + 'px'; card.style.bottom = 'auto'; }
    } else { card.style.top = Math.max(12, Math.round((vp.h - cardH) / 2)) + 'px'; card.style.bottom = 'auto'; }
    root.classList.toggle('dtour-nodemo', !demoName);
    if (rect) {
      var pad = 6;
      spot.style.display = 'block';
      spot.style.left = Math.max(0, Math.round(rect.left - pad)) + 'px'; spot.style.top = Math.max(0, Math.round(rect.top - pad)) + 'px';
      spot.style.width = Math.round(rect.width + pad * 2) + 'px'; spot.style.height = Math.round(rect.height + pad * 2) + 'px';
      root.classList.remove('dtour-nospot');
    } else { spot.style.display = 'none'; root.classList.add('dtour-nospot'); }   // sin diana medible: texto sin señalar nada
  }
  function schedule() { if (!raf) raf = (window.requestAnimationFrame || function (f) { return setTimeout(f, 16); })(layout); }

  function paintDemo() {
    var demo = q('.dtour-demo'); if (!demo) return;
    var step = D.steps[st.i];
    demo.removeAttribute('data-natural'); demo.style.transform = ''; demo.style.height = ''; demo.style.marginBottom = '';
    demo.innerHTML = !st.farewell && step.target === 'demo' && DEMOS[step.demo] ? DEMOS[step.demo]() : '';   // HTML fijo de este archivo: ningún dato externo
  }
  function render() {
    paintDemo(); paintCard();
    // Las demostraciones traen imágenes: se mide ya y otra vez al cargar para que el resalte no quede desfasado.
    layout();
    var imgs = root.querySelectorAll('.dtour-demo img'); Array.prototype.forEach.call(imgs, function (im) { if (!im.complete) im.addEventListener('load', schedule, { once: true }); });
    setTimeout(schedule, 120); setTimeout(schedule, 450);
  }

  // ---- Navegación -------------------------------------------------------------------------------------------------------------------------
  function advance() {
    if (st.farewell) { finish(); return; }
    if (st.i < total() - 1) { st.i++; render(); return; }
    st.farewell = true; render();      // tras la séptima viñeta, la despedida (no es una octava viñeta)
  }
  function prev() {
    if (st.farewell) { st.farewell = false; render(); return; }
    if (st.i > 0) { st.i--; render(); }
  }
  function finish() { if (!st.replay) set(); close(); }
  function close() {
    unbind();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    var back = opener; opener = null;
    if (back && document.contains && document.contains(back)) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  }

  function onKey(e) {
    if (!root) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (st.replay) close();            // la primera visualización no se puede omitir
      return;
    }
    if (e.key !== 'Tab') return;
    var f = root.querySelectorAll('button:not([disabled])'); if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!root.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function bind() {
    window.addEventListener('resize', schedule); window.addEventListener('orientationchange', schedule);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', schedule, true);
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', schedule); window.visualViewport.addEventListener('scroll', schedule); }
    try { if (window.ResizeObserver) { io = new ResizeObserver(schedule); io.observe(root.querySelector('.dtour-card')); } } catch (e) {}
  }
  function unbind() {
    try { window.removeEventListener('resize', schedule); window.removeEventListener('orientationchange', schedule); document.removeEventListener('keydown', onKey, true); document.removeEventListener('scroll', schedule, true); } catch (e) {}
    try { if (window.visualViewport) { window.visualViewport.removeEventListener('resize', schedule); window.visualViewport.removeEventListener('scroll', schedule); } } catch (e) {}
    try { if (io) io.disconnect(); } catch (e) {} io = null;
    clearTimeout(waitT); waitT = null;
  }

  function open(replay) {
    if (root) return true;
    if (!D.steps || D.steps.length !== 7) return false;
    opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    st = { i: 0, farewell: false, replay: !!replay };
    build(); bind(); render();
    return true;
  }

  // ---- Puntos de entrada ----------------------------------------------------------------------------------------------------------------------
  // Primera visualización: al entrar en Duelos, una sola vez, y solo cuando es seguro. Si todavía no se sabe qué hay activo (las listas del
  // Worker se están cargando) se espera un poco; si hay algo activo, se aplaza y se vuelve a intentar en la siguiente entrada a Duelos.
  function startIfNeeded() {
    if (seen()) return false;
    if (root) return true;
    clearTimeout(waitT); waitN = 0;
    var attempt = function () {
      waitT = null;
      if (root || seen()) return;
      if (!duelTabVisible()) return;                       // el jugador se fue: se reintentará cuando vuelva
      // Publicación escalonada: el recorrido habla de las invitaciones unificadas. Sin la bandera del Worker no se muestra (ni se marca como visto).
      if (!v2On()) { if (!sessionOn() && waitN++ < 12) waitT = setTimeout(attempt, 700); return; }
      var s = duelState();
      if (sessionOn() && s && !listsKnown(s, v2On()) && waitN++ < 12) { waitT = setTimeout(attempt, 700); return; }
      // Aplazado si hay una partida, invitación o sala activas. Los datos pueden ser de la visita anterior (el refresco del Worker aún no
      // ha llegado): se vuelve a mirar un par de veces antes de darlo por aplazado; si sigue activo, se reintenta en la próxima entrada.
      if (busyNow()) { if (waitN++ < 4) waitT = setTimeout(attempt, 1500); return; }
      if (modalOpen() && waitN++ < 60) { waitT = setTimeout(attempt, 1000); return; }   // otro diálogo abierto: se espera a que se cierre
      open(false);
    };
    attempt();
    return true;
  }
  // Desde el «?» de Duelos: se puede repetir siempre (sin cambiar ninguna marca), también cerrar con × o Escape, salvo sobre una partida,
  // invitación o sala activas, donde se avisa y no se abre.
  function replay() {
    if (root) return true;
    if (!v2On()) { try { if (typeof showInfoToast === 'function') showInfoToast('El tutorial de Duelos estará disponible con las nuevas invitaciones.'); } catch (e) {} return false; }
    var s = duelState();
    if (busyNow()) { try { if (typeof showInfoToast === 'function') showInfoToast('Termina primero tu duelo o tu invitación activos para ver el tutorial.'); } catch (e) {} return false; }
    // Si se pide desde una pantalla interior (Amigos, Rankings…), se vuelve al inicio de Duelos para señalar elementos reales.
    try { if (s && s.screen && window.SEQDuels && window.SEQDuels.back) window.SEQDuels.back(); } catch (e) {}
    return open(true);
  }

  return {
    startIfNeeded: startIfNeeded, replay: replay, seen: seen, isOpen: function () { return !!root; },
    KEY: D.key, STEPS: D.steps,
    _pure: { unionRect: unionRect, clampRect: clampRect, placeCard: placeCard, demoScale: demoScale, isBusy: isBusy, listsKnown: listsKnown }
  };
})();
