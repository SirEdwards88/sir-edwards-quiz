// SirEdwards Quiz 1.0 — Tutorial interactivo de Duelos (ocho viñetas). Script clásico: expone window.SEQDuelTour.
//
// Qué hace: una capa a pantalla completa que resalta elementos reales de la pantalla de Duelos (o una demostración aislada con datos
// ficticios) y una tarjeta de Sir Edwards colocada según el espacio. Atrás / Continuar, progreso «n de 8» y una despedida final.
// Textos y pasos: src/data/duel-tour-steps.js (definitivos).
//
// Reglas de seguridad (ver test/duel-tour.test.mjs):
//   · NUNCA llama al Worker ni a SEQOnline.api: no crea invitaciones ni salas, no escribe nada en el servidor.
//   · NUNCA toca el estado de las partidas (SEQDuels): solo lee el estado para saber si es seguro abrirse. Las demostraciones son HTML
//     estático inerte (sin onclick, sin ids, aria-hidden), así que no hay controles falsos que envíen nada.
//   · Su única marca es siredwards_quiz_duel_tour_seen. No lee ni escribe K_HELP, K_INTRO, K_UNLOCKED, claves de progreso,
//     de novedades ni de migración de versiones: ver o no ver el recorrido no cambia el desbloqueo de Duelos.
//   · La primera visualización no se puede omitir (sin «Salir», y Escape no la cierra). Repetirla desde el «?» sí se puede cerrar con «Salir del tutorial» (fuera de la tarjeta).
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
  // Factor de escala de una demostración para que quepa en el hueco que deja la tarjeta (nunca más del 100 % ni menos de `min`, 55 % por defecto).
  function demoScale(natH, availH, min) { if (!(natH > 0) || !(availH > 0)) return 1; return Math.max(min || 0.55, Math.min(1, availH / natH)); }
  // Demostración y tarjeta como un solo grupo: se centra (algo por encima del centro) en la altura libre, entre las áreas seguras. La demostración
  // solo se reduce hasta el 85 %; si aun así no cabe, el grupo empieza arriba y la capa se desplaza (`scroll`) en vez de cortar nada.
  function placeGroup(natH, cardH, vh, safeTop, safeBottom, margin, gap) {
    margin = margin == null ? 12 : margin; gap = gap == null ? 10 : gap; safeTop = safeTop || 0; safeBottom = safeBottom || 0;
    var avail = vh - safeTop - safeBottom - margin * 2, SAFE = 14;   // SAFE: margen de seguridad que se reserva antes de reducir o desplazar
    var s = demoScale(natH, avail - SAFE - gap - cardH, 0.85), demoH = Math.round(natH * s), groupH = demoH + gap + cardH;
    var scroll = groupH > avail - SAFE, off = scroll ? 0 : Math.round((avail - SAFE - groupH) * 0.4), demoTop = safeTop + margin + off;
    var cardTop = demoTop + demoH + gap;
    return { scale: s, demoTop: demoTop, cardTop: cardTop, scroll: scroll, extent: cardTop + cardH + margin + safeBottom };
  }
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
      return '<div class="dtour-opts">' +
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
        '<div class="dtour-btns"><span class="dtour-btn dtour-btn-sec" data-t="compartir">Compartir enlace</span><span class="dtour-btn dtour-btn-sec" data-t="copiar">Copiar enlace</span></div>' +
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
    var sir = el('img', 'dtour-sir'); sir.alt = ''; sir.draggable = false; sir.setAttribute('aria-hidden', 'true'); sir.addEventListener('load', schedule); root.appendChild(sir);   // Sir Edwards grande (mismo asset de la viñeta)
    var ex = el('button', 'dtour-exit'); ex.type = 'button'; ex.textContent = (D.labels && D.labels.close) || 'Salir del tutorial'; ex.addEventListener('click', close); root.appendChild(ex);
    var pad = el('div', 'dtour-pad'); pad.setAttribute('aria-hidden', 'true'); root.appendChild(pad);   // marca el final del contenido cuando la capa se desplaza
    document.body.appendChild(root);
  }
  function q(sel) { return root ? root.querySelector(sel) : null; }

  function paintCard() {
    var card = q('.dtour-card'); if (!card) return;
    while (card.firstChild) card.removeChild(card.firstChild);
    var L = D.labels || {}, n = total(), step = D.steps[st.i], fw = st.farewell;
    var data = fw ? D.farewell : step;
    // Cabecera: columna de texto («n de 7», título y filete de progreso) y, arriba a la derecha, Sir Edwards dentro de la tarjeta (retrato recortado por el
    // borde redondeado, con fundido; tamaño normal o compacto por CSS). La × de la repetición va flotando sobre su esquina. En la despedida lo pinta .dtour-sir.
    var head = el('div', 'dtour-head');
    var med = el('span', 'dtour-med'); var img = el('img'); img.src = data.img; img.alt = ''; img.draggable = false; img.decoding = 'async'; med.appendChild(img); head.appendChild(med);
    var meta = el('div', 'dtour-meta2');
    txt(meta, 'span', 'dtour-step', L.progress ? L.progress(fw ? n : st.i + 1, n) : (fw ? n : st.i + 1) + ' de ' + n);
    var h = txt(meta, 'h2', 'dtour-title', data.title); h.id = 'dtour-title';
    var prog = el('span', 'dtour-prog'); prog.setAttribute('aria-hidden', 'true');
    for (var k = 0; k < n; k++) { var dot = el('i'); if (fw || k <= st.i) dot.className = 'on'; prog.appendChild(dot); }
    meta.appendChild(prog);
    head.appendChild(meta);
    var exitBtn = q('.dtour-exit'); if (exitBtn) exitBtn.style.display = st.replay ? 'block' : 'none';   // salida solo al repetir, fuera de la tarjeta
    card.appendChild(head);
    txt(card, 'p', 'dtour-body', data.body);
    var sirImg = q('.dtour-sir'); if (sirImg && sirImg.getAttribute('src') !== data.img) sirImg.src = data.img;
    var act = el('div', 'dtour-actions');
    var first = st.i === 0 && !fw;   // en la primera viñeta no hay «Atrás» (ni su hueco)
    var back = el('button', 'btn btn-secondary dtour-back'); back.type = 'button'; back.textContent = L.back || 'Atrás';
    back.addEventListener('click', prev);
    var next = el('button', 'btn btn-primary dtour-next'); next.type = 'button'; next.textContent = fw ? (D.farewell.button || 'Empezar a jugar') : (L.next || 'Continuar');
    next.addEventListener('click', advance);
    if (!first) act.appendChild(back); act.appendChild(next); card.appendChild(act);
    try { next.focus({ preventScroll: true }); } catch (e) {}
    card.scrollTop = 0;
  }

  // ---- Colocación: resalte + tarjeta + demostración ------------------------------------------------------------------------------
  function viewport() {
    var vv = window.visualViewport;
    return { w: Math.round((vv && vv.width) || window.innerWidth || 360), h: Math.round((vv && vv.height) || window.innerHeight || 640) };
  }
  // Áreas seguras (muesca, barra de gestos): la capa lleva padding env(safe-area-inset-*); se leen ya resueltas.
  function insets() {
    try { var cs = getComputedStyle(root); return { t: (parseFloat(cs.paddingTop) || 0) + (st.replay ? 34 : 0) /* hueco para «Salir del tutorial» */, b: parseFloat(cs.paddingBottom) || 0 }; } catch (e) { return { t: 0, b: 0 }; }
  }
  function visibleRect(e) {
    if (!e) return null;
    try { var r = e.getBoundingClientRect(); if (r.width > 4 && r.height > 4 && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed')) return r; } catch (x) {}
    return null;
  }
  function layout() {
    raf = 0;
    if (!root) return;
    var vp = viewport(), card = q('.dtour-card'), spot = q('.dtour-spot'), demo = q('.dtour-demo'), pad = q('.dtour-pad'), ins = insets();
    var fw = st.farewell, step = D.steps[st.i], hero = fw || st.i === 0, rect = null, demoName = !fw && step.target === 'demo' ? step.demo : null, scroll = false, extent = 0, sirOn = false;
    var sir = q('.dtour-sir'), asp = sir && sir.naturalWidth > 0 && sir.naturalHeight > 0 ? sir.naturalWidth / sir.naturalHeight : 0.87;
    // Despedida: la ilustración completa va sobre la tarjeta y la solapa solo por su borde difuminado; la tarjeta deja hueco arriba para ella.
    var fsw = Math.round(Math.min(vp.w * 0.52, 210)), fsh = Math.round(fsw / asp), fov = Math.round(fsh * 0.14);
    card.style.paddingTop = hero ? (fov + 8) + 'px' : '';   // hero: despedida y bienvenida (viñeta 1), con la ilustración completa sobre la tarjeta
    root.classList.remove('dtour-tight');   // se vuelve a decidir en cada medición
    var cardH = card.offsetHeight || 220;
    root.classList.toggle('dtour-has-demo', !!demoName);
    root.classList.toggle('dtour-fw', hero);
    root.classList.toggle('dtour-welcome', hero && !fw);
    // Los selectores reales son alternativas por orden: vale el primero que se ve y se puede medir. Si ninguno, no se señala nada.
    var findTarget = function (sels) { for (var i = 0; i < (sels || []).length; i++) { var cand = document.querySelector(sels[i]); if (visibleRect(cand)) return cand; } return null; };
    if (demoName) {
      // Demostración y tarjeta, un solo grupo centrado en la altura libre (entre áreas seguras); la demostración solo se reduce hasta el 85 %
      // y, si aun así no cabe, la capa se desplaza en vez de cortar nada.
      var natH = demo.getAttribute('data-natural') ? Number(demo.getAttribute('data-natural')) : demo.scrollHeight;
      if (!demo.getAttribute('data-natural')) demo.setAttribute('data-natural', String(natH));
      var g = placeGroup(natH, cardH, vp.h, ins.t, ins.b, 12, 10);
      demo.style.transform = 'scale(' + g.scale + ')'; demo.style.height = Math.round(natH) + 'px';
      demo.style.top = g.demoTop + 'px';
      card.style.top = g.cardTop + 'px'; card.style.bottom = 'auto';
      scroll = g.scroll; extent = g.extent;
      var parts = step.selectors.map(function (sel) { return visibleRect(demo.querySelector(sel)); });
      rect = clampRect(unionRect(parts), vp.w, vp.h, 4);
    } else if (!hero) {
      var target = findTarget(step.selectors);
      // Se acerca lo resaltado al centro la primera vez (la pantalla de Duelos es desplazable) y se vuelve a medir.
      if (target && !root.getAttribute('data-scrolled-' + st.i)) { root.setAttribute('data-scrolled-' + st.i, '1'); try { target.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (x) {} }
      rect = clampRect(target ? visibleRect(target) : null, vp.w, vp.h, 4);
      var place = placeCard(rect, vp.h - ins.b, cardH, 8, 10);
      // Si no cabe ni debajo ni encima del resalte (p. ej. «Rankings» en 360×640), la banda de Sir Edwards pasa a su versión ajustada (≈100 px) en vez de tapar el resalte.
      if (rect && place.mode === 'bottom') { root.classList.add('dtour-tight'); cardH = card.offsetHeight || cardH; place = placeCard(rect, vp.h - ins.b, cardH, 8, 10); }
      if (place.mode === 'bottom') { card.style.top = 'auto'; card.style.bottom = (12 + ins.b) + 'px'; }
      else { card.style.top = place.top + 'px'; card.style.bottom = 'auto'; }
    } else {
      // Presentaciones especiales (bienvenida y despedida): Sir Edwards completo, grande y centrado sobre la tarjeta (todo el grupo centrado en la altura
      // libre); sin resalte: la pantalla de Duelos queda atenuada de fondo.
      var gH = fsh - fov + cardH, sTop = Math.max(12 + ins.t, Math.round((vp.h - ins.b - gH) / 2));
      card.style.top = (sTop + fsh - fov) + 'px'; card.style.bottom = 'auto';
      sir.style.display = 'block'; sir.style.width = fsw + 'px'; sir.style.height = fsh + 'px'; sir.style.top = sTop + 'px'; sir.style.bottom = 'auto'; sir.style.right = 'auto';
      sir.style.left = Math.round((vp.w - fsw) / 2) + 'px';
      sirOn = true;
    }
    if (!sirOn) sir.style.display = 'none';   // la figura grande solo existe en la despedida
    root.classList.toggle('dtour-scroll', scroll);
    pad.style.top = scroll ? Math.max(0, Math.round(extent - 1)) + 'px' : '0px';
    if (!scroll) root.scrollTop = 0;
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
    paintDemo(); paintCard(); root.scrollTop = 0;
    // Las demostraciones traen imágenes: se mide ya y otra vez al cargar para que el resalte no quede desfasado.
    layout();
    var imgs = root.querySelectorAll('.dtour-demo img'); Array.prototype.forEach.call(imgs, function (im) { if (!im.complete) im.addEventListener('load', schedule, { once: true }); });
    setTimeout(schedule, 120); setTimeout(schedule, 450);
  }

  // ---- Navegación -------------------------------------------------------------------------------------------------------------------------
  function advance() {
    if (st.farewell) { finish(); return; }
    if (st.i < total() - 1) { st.i++; render(); return; }
    st.farewell = true; render();      // tras la octava viñeta, la despedida (no es una novena viñeta)
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
    // El aro de foco grueso solo se pinta si se navega con teclado (Tab, flechas, Intro, espacio); al tocar o pulsar con ratón desaparece.
    if (/^(Tab|Enter| |Spacebar|Arrow\w+)$/.test(e.key || '')) root.classList.add('dtour-kb');
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      if (st.replay) close();            // la primera visualización no se puede omitir
      return;
    }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(root.querySelectorAll('button:not([disabled])'), function (b) { return !(b.style && b.style.display === 'none'); }); if (!f.length) return;
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
    if (!D.steps || D.steps.length !== 8) return false;
    opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    st = { i: 0, farewell: false, replay: !!replay };
    build(); bind(); render();
    var noKb = function () { if (root) root.classList.remove('dtour-kb'); };
    root.addEventListener('pointerdown', noKb); root.addEventListener('touchstart', noKb);
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
    // Coordinación de diálogos: el recorrido señala elementos reales de Duelos, así que solo se abre con Duelos a la vista. Si se pide desde otra
    // pestaña (p. ej. la Ayuda de Ajustes) se pasa a Duelos; si Duelos sigue bloqueado, ahí ya sale su propio aviso y el recorrido no se apila encima.
    if (!duelTabVisible()) { try { if (typeof window.switchTab === 'function') window.switchTab('duelo'); } catch (e) {} if (!duelTabVisible()) return false; }
    if (modalOpen()) return false;
    var s = duelState();
    if (busyNow()) { try { if (typeof showInfoToast === 'function') showInfoToast('Termina primero tu duelo o tu invitación activos para ver el tutorial.'); } catch (e) {} return false; }
    // Si se pide desde una pantalla interior (Amigos, Rankings…), se vuelve al inicio de Duelos para señalar elementos reales.
    try { if (s && s.screen && window.SEQDuels && window.SEQDuels.back) window.SEQDuels.back(); } catch (e) {}
    return open(true);
  }

  return {
    startIfNeeded: startIfNeeded, replay: replay, seen: seen, isOpen: function () { return !!root; },
    KEY: D.key, STEPS: D.steps,
    _pure: { unionRect: unionRect, clampRect: clampRect, placeCard: placeCard, demoScale: demoScale, placeGroup: placeGroup, isBusy: isBusy, listsKnown: listsKnown }
  };
})();
