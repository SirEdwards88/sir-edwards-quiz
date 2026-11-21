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
  // Invitaciones unificadas (1.0): amigo y enlace son métodos excluyentes en 1 contra 1; el Worker lo declara con este flag.
  function v2() { var s = session(); return !!(s && s.features && s.features.classic_duel && s.features.duel_invites_v2); }
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
    direct_invite_open: 'Ya has invitado a un amigo a este duelo.',
    invite_accepted: 'Tu amigo ya ha aceptado: la invitación no se puede cambiar.',
    regenerate_conflict: 'El enlace se acaba de renovar desde otro sitio. Vuelve a consultarlo.',
    invalid_state: 'Ya no se puede hacer eso (el estado ha cambiado).',
    feature_disabled: 'Esta función no está activada todavía.'
  };
  function errText(e) {
    if (e && e.network) return TEXT.network;
    if (e && e.code === 'level_required') { try { var lm = window.SEQDuelIntro && window.SEQDuelIntro.levelSyncMessage && window.SEQDuelIntro.levelSyncMessage(); if (lm) return lm; } catch (x) {} }
    return TEXT[e && e.code] || 'Algo ha fallado. Inténtalo de nuevo en un momento.'; }

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
  // Con las invitaciones unificadas (features.duel_invites_v2) el acceso vive en «Invitar jugadores» (src/online/duel-invites.js) y este
  // botón desaparece; sin esa bandera se conserva el de siempre.
  function pickButton() {
    if (!enabled() || v2()) return '';
    var own = ownGet();
    if (own) {
      return '<div class="seq-link-pick"><button type="button" class="btn btn-secondary" style="width:100%;" onclick="SEQDuelLink.recover()">Ver mi invitación activa</button>' +
        '<p class="stats-section-sub">Tu enlace sigue abierto durante ' + esc(clock(own.endsAt - Date.now())) + '. Puedes volver a compartirlo o cancelarlo.</p></div>';
    }
    return '<div class="seq-link-pick"><button type="button" class="btn btn-secondary" style="width:100%;" onclick="SEQDuelLink.create()">Compartir invitación</button>' +
      '<p class="stats-section-sub">Un enlace para jugar con quien quieras, aunque no sea amigo tuyo. Vale 10 minutos y una sola vez.</p></div>';
  }
  // Un único canal de error por pantalla: el aviso rojo si la pantalla lo tiene; si no, el aviso flotante. Nunca los dos a la vez.
  function report(e) {
    var msg = errText(e);
    try { if (SEQDuels._h && $('seq-d-msg')) { SEQDuels._h.say(msg, true); return; } } catch (x) {}
    toast(msg);
  }
  // Recupera mi enlace abierto (sin crear nada nuevo). El Worker manda: si este dispositivo no guarda el token (otro dispositivo,
  // almacenamiento borrado), el enlace sigue existiendo y se puede renovar.
  function recover() {
    var own = ownGet();
    if (own && window.SEQDuels) { L = own; SEQDuels.open('invite'); return; }
    if (!window.SEQDuels) return;
    if (!v2()) return create();
    call('GET', '/duel-links/mine').then(function (d) {
      if (d && d.enlace) { L = { token: null, modo: d.enlace.modo === 'stakes' ? 'stakes' : 'classic', endsAt: Date.now() + Number(d.enlace.restante_ms), estado: 'abierto' }; SEQDuels.open('invite'); }
      else create();
    }).catch(report);
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
      var c = e && e.code;
      if (v2() && (c === 'link_open' || c === 'direct_invite_open' || c === 'player_busy') && window.SEQInvites) {
        // Ya existe una invitación (quizá de otro dispositivo): se recupera la real en vez de repetir un error.
        window.SEQInvites.refresh().then(function (a) { if (a) window.SEQInvites.resume(); else report(e); }).catch(function () { report(e); });
        return;
      }
      if (c === 'link_open') return confirmReplace();   // Worker antiguo: existe uno que este dispositivo no conoce
      report(e);
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
    var ref = L, token = L.token;
    if (!token) { reconcile(); return; }
    call('GET', '/duel-links/' + token).then(function (d) {
      if (L !== ref) return;
      if (d.estado === 'canjeado' && d.duelo_id) { stop(); ownDel(); var id = d.duelo_id; L = null; SEQDuels.open('duel', id); return; }
      if (d.estado !== 'abierto') { L.estado = d.estado; ownDel(); stop(); paint(); return; }
      L.endsAt = Date.now() + Number(d.restante_ms); ownSet(L);
      pollT = setTimeout(poll, POLL_MS);
    }).catch(function (e) {
      if (L !== ref) return;
      // El enlace de este dispositivo ya no existe en el Worker: pudo renovarse desde otro dispositivo. Se reconcilia con el servidor.
      if (e && e.code === 'link_not_found' && v2()) { ownDel(); L.token = null; reconcile(); return; }
      pollT = setTimeout(poll, POLL_MS * 2);
    });
  }
  // Sin token válido en este dispositivo: la verdad la tiene el Worker (¿sigue abierta?, ¿la canjearon?, ¿caducó?).
  function reconcile() {
    var ref = L; if (!ref || !v2()) return;
    call('GET', '/duel-links/mine').then(function (m) {
      if (L !== ref) return;
      if (m && m.enlace) { L.endsAt = Date.now() + Number(m.enlace.restante_ms); paint(); pollT = setTimeout(poll, POLL_MS); return; }
      return call('GET', '/duels').then(function (r) {
        if (L !== ref) return;
        var d = ((r && r.duels) || []).filter(function (x) { return x.soy === 'creador' && (x.estado === 'aceptado' || x.estado === 'en_curso'); })[0];
        stop(); ownDel();
        if (d && d.id) { L = null; SEQDuels.open('duel', d.id); }
        else { L.estado = 'expirado'; paint(); }
      });
    }).catch(function () { if (L === ref) pollT = setTimeout(poll, POLL_MS * 2); });
  }
  function paint() { if (window.SEQDuels && SEQDuels.rerender) SEQDuels.rerender(); }

  function render(helpers) {
    H = helpers;
    var all = window.SEQInvites && window.SEQInvites.modeLabel ? window.SEQInvites.modeLabel(L && L.modo, 'one') : '';
    var h = H.header(v2() ? 'Invitar jugadores' : 'Invitación lista', L ? (v2() ? all : 'Duelo ' + modeName(L.modo)) : '', function () { leave(); });
    var back = v2() ? "SEQDuels.openInvites('one')" : "SEQDuels.open('pick')";
    if (!L) return h + '<p class="stats-section-sub">Esta invitación ya no está activa.</p><button class="btn btn-secondary" onclick="' + back + '">Volver</button>';
    if (L.estado !== 'abierto') {
      var why = L.estado === 'cancelado' ? 'La invitación se ha cancelado.' : 'La invitación ha caducado sin que nadie la aceptara.';
      return h + '<div class="seq-link-box"><p class="stats-section-sub">' + why + '</p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuelLink.again()">Crear otra invitación</button>' +
        '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuelLink.leave()">Volver</button></div>';
    }
    var me = H.player ? H.player(session() || {}) : { name: 'Tú', avatar: '' };
    var ghost = { name: 'Esperando a un rival', avatar: '<span class="seq-inv-qm" aria-hidden="true">?</span>', id: '' };
    var actions = L.token
      ? '<button type="button" class="btn btn-primary" onclick="SEQDuelLink.share()">Compartir enlace</button>' +
        '<button type="button" class="btn btn-secondary" onclick="SEQDuelLink.copy()">Copiar enlace</button>'
      : '<button type="button" class="btn btn-primary" onclick="SEQDuelLink.regenerate()">Obtener enlace nuevo</button>';
    actions += '<button type="button" class="btn btn-secondary seq-inv-cancel" onclick="SEQDuelLink.cancel()">Cancelar invitación</button>';
    var note = L.token ? '' : 'Tu enlace sigue activo, pero este dispositivo no lo tiene. Si pides uno nuevo, el anterior dejará de funcionar.';
    var box = window.SEQInvites && window.SEQInvites.roomBox ? window.SEQInvites.roomBox({
      title: 'Esperando jugadores', pill: all, timeHtml: 'Caduca en <b id="seq-link-left">' + esc(clock(L.endsAt - Date.now())) + '</b>', count: '1/2 jugadores',
      players: [{ p: me, sub: 'Anfitrión' }, { p: ghost, sub: 'Sin responder', ghost: true }], note: note, actions: actions, h: H
    }) : '';
    return h + box;
  }

  function share() {
    if (!L) return;
    if (!L.token) { toast('Obtén primero un enlace nuevo.'); return; }
    var url = urlFor(L.token);
    if (navigator.share) { navigator.share({ title: 'Duelo en SirEdwards Quiz', text: 'Te reto a un duelo. El enlace vale 10 minutos.', url: url }).catch(function () {}); return; }
    copy();
  }
  function copy() {
    if (!L) return;
    if (!L.token) { toast('Obtén primero un enlace nuevo.'); return; }
    var url = urlFor(L.token), done = function () { toast('Enlace copiado.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); });
    else fallbackCopy(url);
  }
  // Sin API de portapapeles: se copia desde un campo temporal fuera de pantalla (la dirección completa no se muestra en la interfaz).
  function fallbackCopy(url) {
    try {
      var ta = document.createElement('textarea');
      ta.value = url; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true'); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) { toast('Enlace copiado.'); return; }
    } catch (e) {}
    toast('No se pudo copiar. Usa «Compartir enlace».');
  }
  // Token nuevo de la MISMA invitación (el anterior deja de valer). Solo con el flag; pide confirmación.
  function regenerate() {
    if (!L || L.estado !== 'abierto' || !v2()) return;
    var go = function () {
      var ref = L;
      call('POST', '/duel-links/mine/regenerate').then(function (d) {
        if (L !== ref) return;
        L = { token: d.token, modo: d.modo === 'stakes' ? 'stakes' : 'classic', endsAt: Date.now() + Number(d.restante_ms), estado: 'abierto' };
        ownSet(L); paint(); toast('Enlace nuevo listo. El anterior ya no funciona.');
      }).catch(function (e) { report(e); if (e && e.code === 'regenerate_conflict') reconcile(); });
    };
    if (typeof showAppConfirm === 'function') showAppConfirm({ title: '¿Obtener un enlace nuevo?', message: 'El enlace anterior dejará de funcionar.', confirmLabel: 'Obtener enlace', cancelLabel: 'Mantener', onConfirm: go });
    else go();
  }
  // Cancelar pide confirmación y SOLO vuelve atrás si el Worker lo confirma. Si falla (red, estado distinto), se queda aquí y lo dice.
  function cancel() {
    var l = L;
    if (!l || l.estado !== 'abierto') { leave(); return; }
    var go = function () { doCancel(l); };
    if (typeof showAppConfirm === 'function') showAppConfirm({ title: '¿Cancelar invitación?', message: 'El enlace dejará de funcionar.', confirmLabel: 'Cancelar invitación', cancelLabel: 'Seguir esperando', onConfirm: go });
    else go();
  }
  function doCancel(l) {
    var finish = function () { stop(); ownDel(); L = null; if (window.SEQDuels) { if (v2()) SEQDuels.openInvites('one'); else SEQDuels.open('pick'); } };
    var req = l.token ? call('POST', '/duel-links/' + l.token + '/cancel') : call('POST', '/duel-links/mine/cancel');
    req.then(finish).catch(function (e) {
      if (e && e.code === 'link_not_found' && l.token && v2()) { call('POST', '/duel-links/mine/cancel').then(finish).catch(report); return; }
      report(e);
      if (e && (e.code === 'invalid_state' || e.network)) { if (L === l) { clearTimeout(pollT); pollT = setTimeout(poll, 500); } }
    });
  }
  function leave() { stop(); L = null; if (window.SEQDuels) { if (v2()) SEQDuels.openInvites('one'); else SEQDuels.open('pick'); } }   // salir NO cancela: la invitación sigue activa
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
    cancel: cancel, leave: leave, again: again, regenerate: regenerate, pickButton: pickButton, friendButton: friendButton, addFriend: addFriend,
    _urlFor: urlFor, _tokenFromHash: tokenFromHash, TOKEN_RE: TOKEN_RE
  };
})();
