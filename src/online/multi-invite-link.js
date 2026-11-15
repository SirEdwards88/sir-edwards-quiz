// Enlace reutilizable para Todos contra todos. Solo aparece si el Worker anuncia multi_duel_links.
window.SEQMultiLink = (function () {
  'use strict';
  var TOKEN_RE = /^[A-HJ-NP-Z2-9]{24}$/;
  var BASE = 'https://siredwards88.github.io/sir-edwards-quiz/';
  var KEY = 'seq_multi_link_own', PENDING = 'seq_multi_link_pending';
  var checking = false;
  function api(m, p, b) { return window.SEQOnline.api(m, p, b); }
  function session() { return window.SEQOnline && SEQOnline.session && SEQOnline.session(); }
  function enabled() { var s = session(); return !!(s && s.features && s.features.multi_duel_links); }
  function notice(s) { if (typeof showInfoToast === 'function') showInfoToast(s); }
  function own() {
    try { var x = JSON.parse(localStorage.getItem(KEY)); return x && TOKEN_RE.test(x.token) && x.duelo_id && x.expira_at > Date.now() ? x : null; } catch (_) { return null; }
  }
  function url(token) { return BASE + '#duelo-multi=' + token; }
  function capture() {
    var m = /^#duelo-multi=([A-Za-z0-9]{1,64})$/.exec(location.hash || '');
    if (!m || !TOKEN_RE.test(m[1])) return;
    try { localStorage.setItem(PENDING, JSON.stringify({ token: m[1], at: Date.now() })); history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    resume();
  }
  function resume() {
    if (checking || !session()) return;
    var p;
    try { p = JSON.parse(localStorage.getItem(PENDING)); } catch (_) { return; }
    if (!p || !TOKEN_RE.test(p.token) || Date.now() - p.at > 600000) { localStorage.removeItem(PENDING); return; }
    if (!enabled()) { localStorage.removeItem(PENDING); notice('Las invitaciones múltiples por enlace aún no están disponibles.'); return; }
    checking = true;
    api('GET', '/multi-duel-links/' + p.token).then(function (d) {
      checking = false;
      localStorage.removeItem(PENDING);
      if (d.soy === 'creador' || d.soy === 'participante') return join(p.token);
      if (d.estado !== 'abierto') { notice('Este enlace ya no admite jugadores.'); return; }
      var who = d.creador && d.creador.display_name || 'Un jugador';
      var msg = who + ' te invita a Todos contra todos. Hay ' + d.plazas_ocupadas + ' de 4 plazas ocupadas. ¿Quieres unirte?';
      if (typeof showAppConfirm === 'function') showAppConfirm({ title: 'Invitación a duelo múltiple', message: msg, confirmLabel: 'Unirme', onConfirm: function () { join(p.token); } });
      else if (confirm(msg)) join(p.token);
    }).catch(function (e) { checking = false; if (e && e.network) return; localStorage.removeItem(PENDING); notice(e && e.message || 'No se pudo consultar la invitación.'); });
  }
  function openRoom(d) {
    if (!d || !d.id) return;
    try { if (typeof switchTab === 'function') switchTab('duelo'); } catch (_) {}
    if (window.SEQDuels) SEQDuels.open('multi', d.id);
  }
  function join(token) {
    api('POST', '/multi-duel-links/' + token + '/redeem').then(openRoom).catch(function (e) { notice(e && e.message || 'No se pudo entrar en la sala.'); });
  }
  function create() {
    if (!enabled()) return;
    var modo = window.SEQDuels && SEQDuels._state ? SEQDuels._state().pickModo : 'classic';
    api('POST', '/multi-duel-links', { modo: modo === 'stakes' ? 'stakes' : 'classic' }).then(function (d) {
      localStorage.setItem(KEY, JSON.stringify(d));
      openRoom({ id: d.duelo_id });
    }).catch(function (e) { notice(e && e.message || 'No se pudo crear la sala.'); });
  }
  function share() {
    var x = own(); if (!x) { notice('El enlace ha caducado.'); return; }
    var link = url(x.token);
    if (navigator.share) navigator.share({ title: 'Sir Edwards Quiz', text: 'Únete a mi duelo Todos contra todos (3–4 jugadores).', url: link }).catch(function () {});
    else copy();
  }
  function copy() {
    var x = own(); if (!x) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url(x.token)).then(function () { notice('Enlace copiado.'); }).catch(function () { notice('No se pudo copiar el enlace.'); });
  }
  function roomButtons(id) {
    var x = own();
    if (!enabled() || !x || x.duelo_id !== id) return '';
    return '<div class="seq-link-actions"><button class="btn btn-primary" onclick="SEQMultiLink.share()">Compartir enlace</button><button class="btn btn-secondary" onclick="SEQMultiLink.copy()">Copiar enlace</button></div>';
  }
  window.addEventListener('hashchange', capture);
  capture();
  // Esperar al inicio de sesión, sin acoplarse a la implementación de Google Login.
  var retries = 0, wait = setInterval(function () {
    resume();
    if (++retries > 300 || !localStorage.getItem(PENDING)) clearInterval(wait);
  }, 2000);
  return { enabled: enabled, create: create, share: share, copy: copy, roomButtons: roomButtons, capture: capture, resume: resume };
})();
