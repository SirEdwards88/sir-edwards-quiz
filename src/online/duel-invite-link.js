// SirEdwards Quiz — invitación a duelo por ENLACE (cliente). Script clásico: expone window.SEQDuelLink.
//
// Quien crea el enlace (nivel 7) lo comparte; quien lo abre decide si acepta. No hay amistad automática: pueden ser desconocidos.
// Reglas (las aplica el SERVIDOR, aquí solo se explican y se muestran): 10 minutos desde la creación, un solo uso, cancelable,
// y al canjearlo ambos tienen 2 minutos en la sala de espera. Tras el duelo se puede ofrecer «Añadir como amigo».
//
// El token viaja en la parte # de la URL (#duelo=TOKEN): no llega al servidor web ni a las vistas previas. Se guarda en local solo
// hasta poder usarlo (iniciar sesión, nivel 7) y como mucho 10 minutos; en cuanto se lee, se quita de la barra de direcciones.
// Todo texto del servidor se pinta con textContent / esc(): nada de innerHTML con datos ajenos.

window.SEQDuelLink = (function () {
  'use strict';

  var TOKEN_RE = /^[A-HJ-NP-Z2-9]{24}$/;
  var KEY = 'siredwards_quiz_duel_link_pending';
  var OWN = 'siredwards_quiz_duel_link_own';   // mi enlace abierto, para recuperarlo si salgo de la pantalla
  // El enlace SIEMPRE apunta a la dirección pública, aunque la app se abra desde otro sitio (pruebas locales, otra copia).
  var PUBLIC_BASE = 'https://siredwards88.github.io/sir-edwards-quiz/';
  var TTL_MS = 10 * 60 * 1000;
  var POLL_MS = 3000;
  var H = null;                 // utilidades de duels.js (HELPERS), solo mientras se pinta
  var L = null;                 // enlace propio abierto: {token, modo, endsAt, estado}
  var pollT = null, tickT = null;
  var asked = {};               // solicitudes de amistad ya enviadas desde la pantalla de resultados
  var redeeming = false;

  function lsGet() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function lsSet(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function lsDel() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function toast(msg) { try { if (typeof showInfoToast === 'function') showInfoToast(msg); } catch (e) {} }
  function call(method, path, body) { return window.SEQOnline.api(method, path, body); }
  function session() { try { return window.SEQOnline && window.SEQOnline.session ? window.SEQOnline.session() : null; } catch (e) { return null; } }
  // Los enlaces solo existen si el SERVIDOR lo declara (features.duel_links). Con un Worker antiguo o la bandera apagada, la
  // interfaz entera queda oculta: así publicar la PWA antes de tiempo no enseña nada que no funcione.
  function active() { var s = session(); return !!(s && s.features && s.features.classic_duel && s.features.duel_links); }
  function enabled() { return active(); }
  function ownGet() {
    try {
      var o = JSON.parse(localStorage.getItem(OWN));
      if (o && TOKEN_RE.test(String(o.token)) && Number(o.endsAt) > Date.now()) return { token: o.token, modo: o.modo === 'stakes' ? 'stakes' : 'classic', endsAt: Number(o.endsAt), estado: 'abierto' };
    } catch (e) {}
    ownDel(); return null;
  }
  function ownSet(l) { try { localStorage.setItem(OWN, JSON.stringify({ token: l.token, modo: l.modo, endsAt: l.endsAt })); } catch (e) {} }
  function ownDel() { try { localStorage.removeItem(OWN); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clock(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function modeName(m) { return m === 'stakes' ? 'por apuestas' : 'clásico'; }

  var TEXT = {
    network: 'Sin conexión. Inténtalo de nuevo.',
    no_session: 'Inicia sesión para usar esta función.',
    level_required: 'Los duelos se abren al nivel 7.',
    player_busy: 'Ya hay un duelo o una sala en marcha. Termina primero ese.',
    link_not_found: 'Este enlace no existe. Pide uno nuevo.',
    link_used: 'Este enlace ya se ha usado. Pide uno nuevo.',
    link_expired: 'Este enlace ha caducado. Pide uno nuevo.',
    link_cancelled: 'Este enlace se ha cancelado. Pide uno nuevo.',
    cannot_redeem_own_link: 'Este enlace es tuyo: compártelo con otra persona.',
    too_many_links: 'Has creado muchos enlaces seguidos. Espera un poco.',
    rate_limited: 'Demasiadas peticiones. Espera unos segundos.',
    link_open: 'Ya tienes una invitación activa.',
    feature_disabled: 'Esta función no está activada todavía.'
  };
  function errText(e) { if (e && e.network) return TEXT.network; return TEXT[e && e.code] || 'Algo ha fallado. Inténtalo de nuevo en un momento.'; }

  // ---- URL ------------------------------------------------------------------
  function urlFor(token) {
    return PUBLIC_BASE + '#duelo=' + token;
  }
  function tokenFromHash(h) { var m = /^#duelo=([A-Za-z0-9]{1,64})$/.exec(String(h || '')); return m && TOKEN_RE.test(m[1]) ? m[1] : null; }

  // ---- Recibir un enlace -----------------------------------------------------
  // Lee el hash, guarda el token pendiente y lo quita de la barra de direcciones.
  function capture() {
    var t = tokenFromHash(location.hash);
    if (!t) return false;
    lsSet({ token: t, at: Date.now() });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    return true;
  }
  function pending() {
    var p = lsGet();
    if (!p || !TOKEN_RE.test(String(p.token)) || !(Date.now() - Number(p.at) < TTL_MS)) { if (p) lsDel(); return null; }
    return p.token;
  }
  function levelOpen() { try { var g = window.SEQDuelIntro && SEQDuelIntro.gate(typeof store === 'object' ? store : null); return !g || g.open; } catch (e) { return true; } }

  // Se llama al abrir la app, al iniciar sesión y cuando cambia el hash. Si hay un enlace pendiente y todo está listo, pregunta.
  function resume() {
    var token = pending();
    if (!token || redeeming) return;
    if (!session()) return;                         // sin sesión: se conserva y se retoma al iniciar sesión
    if (!active()) { lsDel(); toast(TEXT.feature_disabled); return; }
    if (!levelOpen()) { lsDel(); toast('Los duelos se abren al nivel 7. Cuando llegues, pide el enlace otra vez.'); return; }
    redeeming = true;
    call('GET', '/duel-links/' + token).then(function (d) {
      redeeming = false;
      lsDel();
      if (d.estado !== 'abierto') { toast(TEXT['link_' + (d.estado === 'canjeado' ? 'used' : d.estado === 'cancelado' ? 'cancelled' : 'expired')]); return; }
      var who = d.creador && d.creador.display_name ? String(d.creador.display_name) : 'Un jugador';
      var go = function () { redeem(token); };
      if (typeof showAppConfirm === 'function') {
        showAppConfirm({ title: 'Invitación a duelo', message: who + ' te invita a un duelo ' + modeName(d.modo) + '. Os prepararéis en una sala de 2 minutos. ¿Aceptas?', confirmLabel: 'Aceptar', onConfirm: go });
      } else go();
    }).catch(function (e) { redeeming = false; if (e && e.network) return; lsDel(); toast(errText(e)); });
  }
  function redeem(token) {
    call('POST', '/duel-links/' + token + '/redeem').then(function (d) {
      try { switchTab('duelo'); } catch (e) {}
      if (window.SEQDuels && d && d.id) SEQDuels.open('duel', d.id);
    }).catch(function (e) { toast(errText(e)); });
  }

  // ---- Crear y esperar -----------------------------------------------------------
  function pickButton() {
    if (!enabled()) return '';
    var own = ownGet();
    if (own) {
      return '<div class="seq-link-pick"><button type="button" class="btn btn-secondary" style="width:100%;" onclick="SEQDuelLink.recover()">Ver mi invitación activa</button>' +
        '<p class="stats-section-sub">Tu enlace sigue abierto durante ' + esc(clock(own.endsAt - Date.now())) + '. Puedes volver a compartirlo o cancelarlo.</p></div>';
    }
    return '<div class="seq-link-pick"><button type="button" class="btn btn-secondary" style="width:100%;" onclick="SEQDuelLink.create()">Compartir invitación</button>' +
      '<p class="stats-section-sub">Un enlace para jugar con quien quieras, aunque no sea amigo tuyo. Vale 10 minutos y una sola vez.</p></div>';
  }
  // Recupera mi enlace abierto (sin crear nada nuevo).
  function recover() {
    var own = ownGet();
    if (!own || !window.SEQDuels) return create();
    L = own; SEQDuels.open('invite');
  }
  function create(replace) {
    if (!window.SEQDuels || !enabled()) return;
    var own = ownGet();
    if (own && replace !== true) return recover();          // ya hay uno: se recupera, no se crea otro a escondidas
    var st = SEQDuels._state ? SEQDuels._state() : {};
    var modo = st.pickModo === 'stakes' ? 'stakes' : 'classic';
    var body = { modo: modo }; if (replace === true) body.replace = true;
    call('POST', '/duel-links', body).then(function (d) {
      L = { token: d.token, modo: d.modo, endsAt: Date.now() + Number(d.restante_ms), estado: 'abierto' };
      ownSet(L);
      SEQDuels.open('invite');
    }).catch(function (e) {
      if (e && e.code === 'link_open') return confirmReplace();   // existe uno que este dispositivo no conoce (otro dispositivo)
      try { SEQDuels._h.say(errText(e), true); } catch (x) {} toast(errText(e));
    });
  }
  function confirmReplace() {
    var go = function () { ownDel(); create(true); };
    if (typeof showAppConfirm === 'function') {
      showAppConfirm({ title: 'Ya tienes una invitación activa', message: 'Si creas otra, la anterior dejará de funcionar. ¿Quieres crear una nueva?', confirmLabel: 'Crear otra', onConfirm: go });
    } else toast(TEXT.link_open);
  }
  function stop() { clearTimeout(pollT); pollT = null; clearInterval(tickT); tickT = null; }
  // Llamado por duels.js al abrir la pantalla «invite»: arranca sondeo y cuenta atrás.
  function begin() {
    stop();
    if (!L) return;
    poll();
    tickT = setInterval(tick, 1000);
  }
  function tick() {
    if (!L || L.estado !== 'abierto') return;
    var left = L.endsAt - Date.now();
    var el = $('seq-link-left'); if (el) el.textContent = clock(left);
    if (left <= 0) poll();
  }
  function poll() {
    clearTimeout(pollT);
    if (!L || L.estado !== 'abierto') return;
    var token = L.token;
    call('GET', '/duel-links/' + token).then(function (d) {
      if (!L || L.token !== token) return;
      if (d.estado === 'canjeado' && d.duelo_id) { stop(); ownDel(); var id = d.duelo_id; L = null; SEQDuels.open('duel', id); return; }
      if (d.estado !== 'abierto') { L.estado = d.estado; ownDel(); stop(); paint(); return; }
      L.endsAt = Date.now() + Number(d.restante_ms); ownSet(L);
      pollT = setTimeout(poll, POLL_MS);
    }).catch(function (e) { if (L && L.token === token) pollT = setTimeout(poll, POLL_MS * 2); });
  }
  function paint() { if (window.SEQDuels && SEQDuels.rerender) SEQDuels.rerender(); }

  function render(helpers) {
    H = helpers;
    var h = H.header('Invitación lista', L ? 'Duelo ' + modeName(L.modo) : '', function () { leave(); });
    if (!L) return h + '<p class="stats-section-sub">Esta invitación ya no está activa.</p><button class="btn btn-secondary" onclick="SEQDuels.open(\'pick\')">Volver</button>';
    if (L.estado !== 'abierto') {
      var why = L.estado === 'cancelado' ? 'La invitación se ha cancelado.' : 'La invitación ha caducado sin que nadie la aceptara.';
      return h + '<div class="seq-link-box"><p class="stats-section-sub">' + why + '</p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuelLink.again()">Crear otra invitación</button>' +
        '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuelLink.leave()">Volver</button></div>';
    }
    var url = urlFor(L.token);
    return h + '<div class="seq-link-box">' +
      '<p class="stats-section-sub">Comparte este enlace. Quien lo abra podrá aceptar el duelo, aunque no sea amigo tuyo. Sirve una sola vez.</p>' +
      '<div class="seq-link-url" id="seq-link-url" tabindex="0" role="textbox" aria-readonly="true" aria-label="Enlace de invitación">' + esc(url) + '</div>' +
      '<div class="seq-link-actions"><button type="button" class="btn btn-primary" onclick="SEQDuelLink.share()">Compartir enlace</button>' +
      '<button type="button" class="btn btn-secondary" onclick="SEQDuelLink.copy()">Copiar enlace</button></div>' +
      '<p class="seq-link-count" role="timer" aria-live="off">Caduca en <b id="seq-link-left">' + esc(clock(L.endsAt - Date.now())) + '</b></p>' +
      '<p class="stats-section-sub">Si alguien la acepta, tendréis 2 minutos para marcaros listos. Si sales de esta pantalla, la invitación sigue activa hasta que caduque o la canceles.</p>' +
      '<button type="button" class="btn btn-secondary" style="width:100%;" onclick="SEQDuelLink.cancel()">Cancelar invitación</button></div>';
  }

  function share() {
    if (!L) return;
    var url = urlFor(L.token);
    if (navigator.share) { navigator.share({ title: 'Duelo en SirEdwards Quiz', text: 'Te reto a un duelo. El enlace vale 10 minutos.', url: url }).catch(function () {}); return; }
    copy();
  }
  function copy() {
    if (!L) return;
    var url = urlFor(L.token), done = function () { toast('Enlace copiado.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(); });
    else fallbackCopy();
  }
  function fallbackCopy() {
    var el = $('seq-link-url'); if (!el) return;
    try {
      var r = document.createRange(); r.selectNodeContents(el);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      if (document.execCommand && document.execCommand('copy')) { toast('Enlace copiado.'); return; }
    } catch (e) {}
    toast('Mantén pulsado el enlace para copiarlo.');
  }
  // Cancela en el servidor (si seguía abierto) y vuelve a elegir rival.
  function cancel() {
    var l = L; stop(); L = null; ownDel();
    if (l && l.estado === 'abierto') call('POST', '/duel-links/' + l.token + '/cancel').catch(function () {});
    if (window.SEQDuels) SEQDuels.open('pick');
  }
  function leave() { stop(); L = null; if (window.SEQDuels) SEQDuels.open('pick'); }
  function again() { stop(); L = null; ownDel(); create(); }

  // ---- Después del duelo ------------------------------------------------------------
  // «Añadir como amigo» en los resultados, solo si el rival aún no lo es. Usa la solicitud normal de amistad.
  function friendButton(d) {
    try {
      var fl = window.SEQDuels && SEQDuels._state().lists.friends;
      var id = d && d.rival && d.rival.id;
      if (!fl || !fl.friends || !id || !/^[0-9A-Z]{10}$/.test(id)) return '';
      if (fl.friends.some(function (f) { return f.player && f.player.id === id; })) return '';
      if (asked[id]) return '<p class="stats-section-sub" style="text-align:center;">Solicitud de amistad enviada.</p>';
      return '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuelLink.addFriend(\'' + id + '\')">Añadir como amigo</button>';
    } catch (e) { return ''; }
  }
  function addFriend(id) {
    if (!/^[0-9A-Z]{10}$/.test(String(id))) return;
    asked[id] = true;
    call('POST', '/friends/requests', { to: id }).then(function () { toast('Solicitud enviada.'); paint(); }).catch(function (e) {
      delete asked[id];
      toast(e && e.network ? TEXT.network : 'No se pudo enviar la solicitud. Inténtalo más tarde.');
      paint();
    });
  }

  // ---- Arranque -----------------------------------------------------------------------
  capture();
  window.addEventListener('hashchange', function () { if (capture()) resume(); });

  return {
    capture: capture, resume: resume, enabled: enabled, recover: recover, pending: pending, create: create, begin: begin, stop: stop, render: render, share: share, copy: copy,
    cancel: cancel, leave: leave, again: again, pickButton: pickButton, friendButton: friendButton, addFriend: addFriend,
    _urlFor: urlFor, _tokenFromHash: tokenFromHash, TOKEN_RE: TOKEN_RE
  };
})();
