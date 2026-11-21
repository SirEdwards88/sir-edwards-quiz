// SirEdwards Quiz — enlace de Todos contra todos (cliente). Script clásico: expone window.SEQMultiLink.
//
// Distinto del enlace 1 contra 1 (un solo uso): este admite jugadores por orden de llegada hasta completar 4, hasta que el anfitrión
// empieza (con 3 o más) o hasta que pasan 10 minutos. No hace falta ser amigos y no crea amistades. Todas las reglas las aplica el
// SERVIDOR; aquí solo se muestran. Solo existe si el Worker declara features.multi_duel_links.
//
// El token viaja en la parte # de la URL (#duelo-multi=TOKEN): no llega al servidor web ni a las vistas previas. Se guarda en local
// solo hasta poder usarlo (iniciar sesión, nivel 7) y como mucho 10 minutos; en cuanto se lee, se quita de la barra de direcciones.

window.SEQMultiLink = (function () {
  'use strict';

  var TOKEN_RE = /^[A-HJ-NP-Z2-9]{24}$/;
  // El enlace SIEMPRE apunta a la dirección pública, aunque la app se abra desde otro sitio (pruebas locales, otra copia).
  var BASE = 'https://siredwards88.github.io/sir-edwards-quiz/';
  var KEY = 'siredwards_quiz_multi_link_own';           // mi enlace abierto: {token, duelo_id, endsAt}
  var PENDING = 'siredwards_quiz_multi_link_pending';   // enlace recibido, a la espera de sesión
  var TTL_MS = 10 * 60 * 1000;
  var checking = false, creating = false, waitT = null;

  var TEXT = {
    network: 'Sin conexión. Inténtalo de nuevo.',
    level_required: 'Los duelos se abren al nivel 7.',
    player_busy: 'Ya hay un duelo o una sala en marcha. Termina primero ese.',
    link_not_found: 'Este enlace no existe. Pide uno nuevo.',
    link_expired: 'Este enlace ya no admite jugadores. Pide uno nuevo.',
    room_full: 'La sala ya está completa.',
    link_open: 'Ya tienes una invitación activa.',
    regenerate_conflict: 'El enlace se acaba de renovar desde otro sitio. Vuelve a consultarlo.',
    invalid_state: 'Ya no se puede hacer eso (el estado ha cambiado).',
    too_many_links: 'Has creado muchos enlaces seguidos. Espera un poco.',
    rate_limited: 'Demasiadas peticiones. Espera unos segundos.',
    feature_disabled: 'Esta función no está activada todavía.'
  };
  function errText(e) {
    if (e && e.network) return TEXT.network;
    if (e && e.code === 'level_required') { try { var lm = window.SEQDuelIntro && window.SEQDuelIntro.levelSyncMessage && window.SEQDuelIntro.levelSyncMessage(); if (lm) return lm; } catch (x) {} }
    return TEXT[e && e.code] || 'Algo ha fallado. Inténtalo de nuevo en un momento.'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function toast(s) { try { if (typeof showInfoToast === 'function') showInfoToast(s); } catch (e) {} }
  function api(m, p, b) { return window.SEQOnline.api(m, p, b); }
  function session() { try { return window.SEQOnline && SEQOnline.session ? SEQOnline.session() : null; } catch (e) { return null; } }
  function enabled() { var s = session(); return !!(s && s.features && s.features.multi_duel_links); }
  // Invitaciones unificadas (1.0): el acceso vive en «Invitar jugadores» y el anfitrión puede renovar el enlace desde otro dispositivo.
  function v2() { var s = session(); return !!(s && s.features && s.features.classic_duel && s.features.duel_invites_v2); }
  function levelOpen() { try { var g = window.SEQDuelIntro && SEQDuelIntro.gate(typeof store === 'object' ? store : null); return !g || g.open; } catch (e) { return true; } }
  function modeName(m) { return m === 'stakes' ? 'por apuestas' : 'clásico'; }

  function own() {
    var x = lsGet(KEY);
    if (x && TOKEN_RE.test(String(x.token)) && x.duelo_id && Number(x.endsAt) > Date.now()) return x;
    if (x) lsDel(KEY);
    return null;
  }
  function url(token) { return BASE + '#duelo-multi=' + token; }

  // ---- Recibir un enlace -----------------------------------------------------
  function capture() {
    var m = /^#duelo-multi=([A-Za-z0-9]{1,64})$/.exec(location.hash || '');
    if (!m || !TOKEN_RE.test(m[1])) return false;
    lsSet(PENDING, { token: m[1], at: Date.now() });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    return true;
  }
  function pending() {
    var p = lsGet(PENDING);
    if (!p || !TOKEN_RE.test(String(p.token)) || !(Date.now() - Number(p.at) < TTL_MS)) { if (p) lsDel(PENDING); return null; }
    return p.token;
  }
  // Sin sesión el enlace se conserva; se reintenta cada pocos segundos hasta iniciar sesión (como mucho 10 minutos).
  function wait() {
    if (waitT) return;
    var n = 0;
    waitT = setInterval(function () {
      resume();
      if (++n > 300 || !pending()) { clearInterval(waitT); waitT = null; }
    }, 2000);
  }
  function resume() {
    var token = pending();
    if (!token || checking) return;
    if (!session()) return;
    if (!enabled()) { lsDel(PENDING); toast(TEXT.feature_disabled); return; }
    if (!levelOpen()) { lsDel(PENDING); toast('Los duelos se abren al nivel 7. Cuando llegues, pide el enlace otra vez.'); return; }
    checking = true;
    api('GET', '/multi-duel-links/' + token).then(function (d) {
      checking = false;
      lsDel(PENDING);
      if (d.soy === 'creador' || d.soy === 'participante') return join(token);
      if (d.estado === 'completo') { toast(TEXT.room_full); return; }
      if (d.estado !== 'abierto') { toast(TEXT.link_expired); return; }
      var who = d.creador && d.creador.display_name ? String(d.creador.display_name) : 'Un jugador';
      var msg = who + ' te invita a Todos contra todos ' + modeName(d.modo) + '. Hay ' + d.plazas_ocupadas + ' de ' + d.plazas_totales + ' plazas ocupadas. No hace falta ser amigos. ¿Quieres entrar?';
      if (typeof showAppConfirm === 'function') showAppConfirm({ title: 'Invitación a Todos contra todos', message: msg, confirmLabel: 'Entrar', onConfirm: function () { join(token); } });
      else join(token);
    }).catch(function (e) { checking = false; if (e && e.network) return; lsDel(PENDING); toast(errText(e)); });
  }
  function openRoom(d) {
    if (!d || !d.id) return;
    try { switchTab('duelo'); } catch (e) {}
    if (window.SEQDuels) SEQDuels.open('multi', d.id);
  }
  function join(token) {
    api('POST', '/multi-duel-links/' + token + '/redeem').then(openRoom).catch(function (e) { toast(errText(e)); });
  }

  // ---- Crear y compartir -----------------------------------------------------
  // Botón de la pantalla «Elige cómo jugar» (solo Duelo, no Retos).
  function pickButton() {
    if (!enabled() || v2()) return '';
    return '<div class="seq-link-pick"><button type="button" class="btn btn-secondary" style="width:100%;" onclick="SEQMultiLink.create()">Crear sala por enlace</button>' +
      '<p class="stats-section-sub">Todos contra todos con un enlace para compartir: de 3 a 4 jugadores, aunque no sean amigos tuyos. Vale 10 minutos.</p></div>';
  }
  function create() {
    if (!enabled() || creating) return;
    creating = true;
    var st = window.SEQDuels && SEQDuels._state ? SEQDuels._state() : {};
    api('POST', '/multi-duel-links', { modo: st.pickModo === 'stakes' ? 'stakes' : 'classic' }).then(function (d) {
      creating = false;
      lsSet(KEY, { token: d.token, duelo_id: d.duelo_id, endsAt: Date.now() + Number(d.restante_ms) });
      openRoom({ id: d.duelo_id });
    }).catch(function (e) {
      creating = false;
      if (v2() && (e && (e.code === 'player_busy' || e.code === 'link_open')) && window.SEQInvites) {
        window.SEQInvites.refresh().then(function (a) { if (a) window.SEQInvites.resume(); else report(e); }).catch(function () { report(e); });
        return;
      }
      report(e);
    });
  }
  // Un único canal de error por pantalla: el aviso rojo si la pantalla lo tiene; si no, el aviso flotante. Nunca los dos a la vez.
  function report(e) {
    var msg = errText(e);
    try { if (window.SEQDuels && SEQDuels._h && document.getElementById('seq-d-msg')) { SEQDuels._h.say(msg, true); return; } } catch (x) {}
    toast(msg);
  }
  function share() {
    var x = own(); if (!x) { toast('El enlace ha caducado.'); return; }
    if (navigator.share) { navigator.share({ title: 'Sir Edwards Quiz', text: 'Únete a mi duelo Todos contra todos. El enlace vale 10 minutos.', url: url(x.token) }).catch(function () {}); return; }
    copy();
  }
  function copy() {
    var x = own(); if (!x) { toast('El enlace ha caducado.'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url(x.token)).then(function () { toast('Enlace copiado.'); }, fallbackCopy);
    else fallbackCopy();
  }
  // Sin API de portapapeles: se copia desde un campo temporal fuera de pantalla (la dirección completa no se muestra en la interfaz).
  function fallbackCopy() {
    var x = own(); if (!x) return;
    try {
      var ta = document.createElement('textarea');
      ta.value = url(x.token); ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true'); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) { toast('Enlace copiado.'); return; }
    } catch (e) {}
    toast('No se pudo copiar. Usa «Compartir enlace».');
  }
  // Bloque de la sala de espera del anfitrión. Vacío si el enlace no es de este dispositivo o ya caducó.
  function roomButtons(id) {
    var x = own();
    if (!enabled() || !x || x.duelo_id !== id) return '';
    return '<div class="seq-link-box"><div class="seq-link-actions"><button type="button" class="btn btn-primary" onclick="SEQMultiLink.share()">Compartir enlace</button>' +
      '<button type="button" class="btn btn-secondary" onclick="SEQMultiLink.copy()">Copiar enlace</button></div></div>';
  }
  // Panel del enlace en la sala de espera del anfitrión. `d.enlace` (solo con el flag) es el estado REAL del enlace en el Worker.
  //  · Este dispositivo tiene el token y el enlace sigue abierto → compartir/copiar (se reutiliza el token original: recuperar la sala no
  //    invalida nada). Se comprueba una vez que el Worker aún lo reconoce (pudo renovarse desde otro dispositivo).
  //  · El enlace está abierto pero este dispositivo no tiene el token → se puede obtener uno nuevo (el anterior deja de valer).
  function roomPanel(d, v2on) {
    if (!enabled() || !d) return '';
    var x = own(), mine = !!(x && x.duelo_id === d.id), link = d.enlace || null;
    if (mine && (!link || link.estado === 'abierto')) { verify(d.id); return roomButtons(d.id); }
    if (link && link.estado === 'abierto' && v2on) {
      return '<div class="seq-link-box"><p class="seq-inv-need">El enlace sigue activo, pero este dispositivo no lo tiene.</p>' +
        '<button type="button" class="btn btn-primary" onclick="SEQMultiLink.regenerate()">Obtener enlace nuevo</button></div>';
    }
    return '';
  }
  var verified = {};   // duelo_id -> instante de la última comprobación (como mucho una cada 20 s mientras el anfitrión espera)
  function verify(duelId) {
    if (!v2() || (verified[duelId] && Date.now() - verified[duelId] < 20000)) return;
    verified[duelId] = Date.now();
    var x = own(); if (!x) return;
    api('GET', '/multi-duel-links/' + x.token).catch(function (e) {
      if (e && e.code === 'link_not_found') { lsDel(KEY); try { SEQDuels.rerender(); } catch (z) {} }
    });
  }
  // Renueva el token de la MISMA sala: participantes y plazas se conservan, el enlace anterior deja de valer y la caducidad no cambia.
  function regenerate() {
    var st = window.SEQDuels && SEQDuels._state ? SEQDuels._state() : {}, id = st.id;
    if (!id || !v2()) return;
    var go = function () {
      api('POST', '/multi-duels/' + id + '/link/regenerate').then(function (d) {
        lsSet(KEY, { token: d.token, duelo_id: d.duelo_id, endsAt: Date.now() + Number(d.restante_ms) });
        verified[id] = Date.now();
        try { SEQDuels.rerender(); SEQDuels.reload(); } catch (e) {}
        toast('Enlace nuevo listo. El anterior ya no funciona.');
      }).catch(function (e) { report(e); if (e && e.code === 'regenerate_conflict') { try { SEQDuels.reload(); } catch (z) {} } });
    };
    if (typeof showAppConfirm === 'function') showAppConfirm({ title: '¿Obtener un enlace nuevo?', message: 'El enlace anterior dejará de funcionar. Los jugadores que ya están en la sala se quedan.', confirmLabel: 'Obtener enlace', cancelLabel: 'Mantener', onConfirm: go });
    else go();
  }

  // ---- Arranque -----------------------------------------------------------------------
  if (capture()) wait();
  else if (pending()) wait();
  window.addEventListener('hashchange', function () { if (capture()) { resume(); wait(); } });

  return {
    enabled: enabled, create: create, share: share, copy: copy, pickButton: pickButton, roomButtons: roomButtons, roomPanel: roomPanel, regenerate: regenerate,
    capture: capture, resume: resume, pending: pending, _url: url, TOKEN_RE: TOKEN_RE
  };
})();
