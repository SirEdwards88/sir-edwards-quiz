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
    too_many_links: 'Has creado muchos enlaces seguidos. Espera un poco.',
    rate_limited: 'Demasiadas peticiones. Espera unos segundos.',
    feature_disabled: 'Esta función no está activada todavía.'
  };
  function errText(e) { if (e && e.network) return TEXT.network; return TEXT[e && e.code] || 'Algo ha fallado. Inténtalo de nuevo en un momento.'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function toast(s) { try { if (typeof showInfoToast === 'function') showInfoToast(s); } catch (e) {} }
  function api(m, p, b) { return window.SEQOnline.api(m, p, b); }
  function session() { try { return window.SEQOnline && SEQOnline.session ? SEQOnline.session() : null; } catch (e) { return null; } }
  function enabled() { var s = session(); return !!(s && s.features && s.features.multi_duel_links); }
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
    if (!enabled()) return '';
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
    }).catch(function (e) { creating = false; toast(errText(e)); });
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
  function fallbackCopy() {
    var el = document.getElementById('seq-mlink-url'); if (!el) return;
    try {
      var r = document.createRange(); r.selectNodeContents(el);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      if (document.execCommand && document.execCommand('copy')) { toast('Enlace copiado.'); return; }
    } catch (e) {}
    toast('Mantén pulsado el enlace para copiarlo.');
  }
  // Bloque de la sala de espera del anfitrión. Vacío si el enlace no es de este dispositivo o ya caducó.
  function roomButtons(id) {
    var x = own();
    if (!enabled() || !x || x.duelo_id !== id) return '';
    return '<div class="seq-link-box"><p class="stats-section-sub">Comparte este enlace. Entran por orden de llegada, sean amigos o no, hasta completar 4 jugadores. Con 3 ya puedes empezar.</p>' +
      '<div class="seq-link-url" id="seq-mlink-url" tabindex="0" role="textbox" aria-readonly="true" aria-label="Enlace de la sala">' + esc(url(x.token)) + '</div>' +
      '<div class="seq-link-actions"><button type="button" class="btn btn-primary" onclick="SEQMultiLink.share()">Compartir enlace</button>' +
      '<button type="button" class="btn btn-secondary" onclick="SEQMultiLink.copy()">Copiar enlace</button></div></div>';
  }

  // ---- Arranque -----------------------------------------------------------------------
  if (capture()) wait();
  else if (pending()) wait();
  window.addEventListener('hashchange', function () { if (capture()) { resume(); wait(); } });

  return {
    enabled: enabled, create: create, share: share, copy: copy, pickButton: pickButton, roomButtons: roomButtons,
    capture: capture, resume: resume, pending: pending, _url: url, TOKEN_RE: TOKEN_RE
  };
})();
