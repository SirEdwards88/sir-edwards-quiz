// SirEdwards Quiz 1.0 — Invitaciones unificadas de Duelos (cliente). Script clásico: expone window.SEQInvites.
//
// Una sola pantalla «Invitar jugadores» para 1 contra 1 y Todos contra todos, con los dos métodos dentro: «Invitar por enlace» e
// «Invitar a un amigo».
//   · 1 contra 1: los métodos son ALTERNATIVOS. Solo existe una invitación activa; cambiar de método pide confirmación y lo hace el
//     Worker en una sola transacción (replace). Aquí nunca se cancela una invitación y se crea la otra en dos peticiones.
//   · Todos contra todos: se combinan dentro de UNA sala (amigos invitados + enlace), con una lista única de participantes.
// La fuente de verdad es el Worker: antes de decidir se consulta su estado (/duel-links/mine, /duels, /multi-duels). Solo existe
// con features.duel_invites_v2; sin esa bandera la PWA conserva el comportamiento anterior.
// Todo texto del servidor pasa por H.esc() / H.player(); los textos de este archivo son fijos.
// La parte pura (qué invitación hay activa, textos, plazas) se prueba en test/duel-invites.test.mjs.

window.SEQInvites = (function () {
  'use strict';

  var MIN = 3, MAX = 4;
  var H = null;                       // utilidades de duels.js (HELPERS), solo mientras se pinta
  var I = { link: null, loaded: false, busy: false, picker: false, replacing: false, verified: {} };

  // ---- Utilidades --------------------------------------------------------------------------------
  function session() { try { return window.SEQOnline && window.SEQOnline.session ? window.SEQOnline.session() : null; } catch (e) { return null; } }
  function feat() { var s = session(); return (s && s.features) || {}; }
  function on() { var f = feat(); return !!(f.classic_duel && f.duel_invites_v2); }
  function api(m, p, b) { return window.SEQOnline.api(m, p, b); }
  function toast(msg) { try { if (typeof showInfoToast === 'function') showInfoToast(msg); } catch (e) {} }
  function st() { return window.SEQDuels && window.SEQDuels._state ? window.SEQDuels._state() : { lists: {} }; }
  function hh() { if (window.SEQDuels && window.SEQDuels._h) H = window.SEQDuels._h; return H; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function confirmBox(o) {
    if (typeof showAppConfirm === 'function') showAppConfirm(o); else if (o && o.onConfirm) o.onConfirm();
  }
  // Un único canal de error: el aviso rojo de la pantalla (si existe); si no, el aviso flotante. Nunca los dos a la vez.
  function fail(e) {
    var msg = hh() && H.errText ? H.errText(e) : 'Algo ha fallado. Inténtalo de nuevo en un momento.';
    if (document.getElementById('seq-d-msg') && H && H.say) H.say(msg, true); else toast(msg);
  }

  // ---- Lógica pura -------------------------------------------------------------------------------
  function modeLabel(modo, kind) { return (modo === 'stakes' ? 'Apuestas' : 'Clásico') + ' · ' + (kind === 'all' ? 'Todos contra todos' : '1 contra 1'); }
  // Qué invitación mía hay activa, a partir de las listas del servidor y del estado de mi enlace 1 contra 1.
  // Prioridad: sala múltiple > duelo directo > enlace. Solo cuentan las que YO he creado y aún no han empezado.
  function activeFrom(lists, link) {
    lists = lists || {};
    var room = (lists.multis || []).filter(function (x) { return x && x.soy === 'creador' && (x.estado === 'pendiente' || x.estado === 'aceptado'); })[0];
    if (room) return { tipo: 'multi', id: room.id, estado: room.estado, modo: room.modo };
    var duel = (lists.duels || []).filter(function (x) { return x && x.soy === 'creador' && (x.estado === 'pendiente' || x.estado === 'aceptado'); })[0];
    if (duel) return { tipo: 'duel', id: duel.id, estado: duel.estado, modo: duel.modo };
    if (link && link.estado === 'abierto') return { tipo: 'enlace', modo: link.modo };
    return null;
  }
  function active() { return activeFrom(st().lists, I.link); }
  function seats(d) { return (d && d.jugadores ? d.jugadores : []).filter(function (j) { return j && (j.estado === 'aceptado' || j.estado === 'invitado'); }).length; }
  function accepted(d) { return (d && d.jugadores ? d.jugadores : []).filter(function (j) { return j && j.estado === 'aceptado'; }).length; }
  function startHint(n) { return n >= MIN ? '' : 'Podrás empezar cuando seáis al menos ' + MIN + '.'; }

  // ---- Consulta al Worker ------------------------------------------------------------------------
  function refresh() {
    if (!on()) return Promise.resolve(null);
    var f = feat();
    return Promise.all([
      f.duel_links ? api('GET', '/duel-links/mine').then(function (d) { I.link = (d && d.enlace) || null; st().lists.link = I.link; }) : Promise.resolve(),
      api('GET', '/duels').then(function (d) { st().lists.duels = d.duels || []; }),
      f.multi_duel ? api('GET', '/multi-duels').then(function (d) { st().lists.multis = d.duels || []; }) : Promise.resolve()
    ]).then(function () { I.loaded = true; return active(); });
  }
  function repaint() { try { var s = st(); if (s.screen === 'invites' || s.screen === 'pickkind') window.SEQDuels.rerender(); } catch (e) {} }

  // ---- Navegación --------------------------------------------------------------------------------
  // Desde «Elige cómo jugar»: kind = 'one' | 'all'.
  function go(kind) {
    if (!window.SEQDuels || !SEQDuels.openInvites) return;
    I.picker = false; I.replacing = false; I.loaded = false;
    SEQDuels.openInvites(kind === 'all' ? 'all' : 'one');   // al abrirse, openInvites() pide el estado real al Worker (onKind)
  }
  function back() { I.picker = false; I.replacing = false; try { var s = st(); s.screen = 'pickkind'; SEQDuels.rerender(); } catch (e) {} }
  // Al abrir «Elige cómo jugar»: se recupera el estado real para mostrar la invitación activa (sin crear nada).
  // Al abrir «Elige cómo jugar» o «Invitar jugadores»: se reutiliza el refresco del inicio de Duelos (duels, salas y mi enlace; una sola
  // tanda de peticiones de lectura, sin repetirlas: el Worker limita las peticiones por minuto). Las decisiones (crear, cambiar de método)
  // vuelven a leer el estado con refresh() justo antes de actuar.
  function onKind() {
    if (!on() || !window.SEQDuels) return;
    SEQDuels.refreshSummary().then(function () { I.link = st().lists.link || null; I.loaded = true; repaint(); }).catch(function () {});
  }

  // Aviso en «Elige cómo jugar» cuando ya hay una invitación activa: se recupera, no se crea otra a escondidas.
  function banner() {
    var a = on() && I.loaded ? active() : null;
    if (!a) return '';
    var txt = a.tipo === 'multi' ? 'Tienes una sala esperando jugadores.' : a.tipo === 'duel' ? (a.estado === 'aceptado' ? 'Tu duelo está en la sala de espera.' : 'Tu amigo aún no ha respondido.') : 'Tu enlace de invitación sigue abierto.';
    return '<div class="seq-inv-banner" role="status"><span>' + txt + '</span><button type="button" class="btn btn-primary seq-d-sm" onclick="SEQInvites.resume()">Ver invitación</button></div>';
  }
  function resume() {
    var a = active(); if (!a || !hh()) return;
    if (a.tipo === 'multi') H.open('multi', a.id);
    else if (a.tipo === 'duel') H.open('duel', a.id);
    else if (window.SEQDuelLink) SEQDuelLink.recover();
  }

  // ---- Pantalla «Invitar jugadores» ---------------------------------------------------------------
  function optCard(ic, title, sub, act, badge) {
    return '<div class="seq-m-opt seq-inv-opt' + (badge ? ' seq-inv-active' : '') + '" role="button" tabindex="0" onclick="' + act + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + act + '}">' +
      '<span class="seq-m-opt-ic seq-inv-ic" aria-hidden="true">' + ic + '</span>' +
      '<div class="seq-m-opt-body"><div class="seq-m-opt-title">' + title + (badge ? ' <span class="seq-inv-badge">' + badge + '</span>' : '') + '</div><div class="seq-m-opt-sub">' + sub + '</div></div>' +
      '<span class="seq-m-opt-go" aria-hidden="true">›</span></div>';
  }
  function render(helpers) {
    H = helpers;
    var s = H.S, all = s.invKind === 'all', f = feat(), a = I.loaded ? active() : null;
    var h = H.header('Invitar jugadores', modeLabel(s.pickModo, all ? 'all' : 'one'), back);
    h += '<p class="seq-inv-rule"><span class="seq-inv-pill">' + (all ? 'Puedes combinar ambos' : 'Elige un método') + '</span></p>';
    var linkOn = all ? !!f.multi_duel_links : !!f.duel_links;
    var linkBadge = !all && a && a.tipo === 'enlace' ? 'Activo' : '';
    var friendBadge = !all && a && a.tipo === 'duel' ? 'Activa' : '';
    h += '<div class="seq-m-opts seq-inv-opts">';
    if (linkOn) h += optCard(H.ico('compartir'), 'Invitar por enlace', 'Comparte una invitación con quien quieras.', 'SEQInvites.' + (all ? "room('link')" : 'link()'), linkBadge);
    h += optCard(H.ico('amigos'), 'Invitar a un amigo', 'Selecciona un amigo disponible.', 'SEQInvites.' + (all ? "room('friend')" : 'friend()'), friendBadge);
    h += '</div>';
    if (!I.loaded) h += '<p class="stats-section-sub seq-inv-load">Comprobando tus invitaciones…</p>';
    return h;
  }

  // ---- 1 contra 1: elegir método -----------------------------------------------------------------------
  function guard(fn) {
    if (I.busy) return;
    I.busy = true;
    var done = function () { I.busy = false; };
    refresh().then(function (a) { done(); fn(a); }).catch(function (e) { done(); fail(e); });
  }
  function link() {
    guard(function (a) {
      hh();
      if (a && a.tipo === 'multi') { toast('Ya tienes una sala activa.'); H.open('multi', a.id); return; }
      if (a && a.tipo === 'duel') {
        if (a.estado !== 'pendiente') { H.open('duel', a.id); return; }
        switchBox('Se cancelará tu invitación al amigo y se creará un enlace.', function () { SEQDuelLink.create(true); });
        return;
      }
      if (a && a.tipo === 'enlace') { SEQDuelLink.recover(); return; }
      SEQDuelLink.create();
    });
  }
  function friend() {
    guard(function (a) {
      hh();
      if (a && a.tipo === 'multi') { toast('Ya tienes una sala activa.'); H.open('multi', a.id); return; }
      if (a && a.tipo === 'duel') { H.open('duel', a.id); return; }
      if (a && a.tipo === 'enlace') {
        switchBox('Se cancelará tu enlace en cuanto invites a un amigo.', function () { I.replacing = true; H.pick1v1('duel', st().pickModo); });
        return;
      }
      I.replacing = false; H.pick1v1('duel', st().pickModo);
    });
  }
  function switchBox(message, onConfirm) {
    confirmBox({ title: '¿Cambiar de método?', message: message, confirmLabel: 'Cambiar', cancelLabel: 'Mantenerla', onConfirm: onConfirm });
  }
  // Para el selector de amigos 1 contra 1 y la creación directa (duels.js).
  function replaceFlag() { return on() && I.replacing; }
  function replaceDone() { I.replacing = false; }

  // ---- Todos contra todos: UNA sala, métodos combinables ---------------------------------------------------
  function room(method) {
    guard(function (a) {
      hh();
      if (a && a.tipo === 'multi') { I.picker = method === 'friend'; H.open('multi', a.id); return; }
      if (a && a.tipo === 'duel') { toast('Ya tienes una invitación activa.'); H.open('duel', a.id); return; }
      var make = function () {
        if (feat().multi_duel_links && window.SEQMultiLink) { I.picker = method === 'friend'; SEQMultiLink.create(); }
        else if (window.SEQMulti) SEQMulti.startPick();   // sin enlaces de sala: el flujo anterior (elegir 2 o 3 amigos)
      };
      if (a && a.tipo === 'enlace') {
        confirmBox({ title: '¿Cambiar de invitación?', message: 'Tienes un enlace de 1 contra 1 abierto. Se cancelará al crear la sala.', confirmLabel: 'Crear sala', cancelLabel: 'Mantenerla',
          onConfirm: function () { api('POST', '/duel-links/mine/cancel').then(function () { I.link = null; make(); }).catch(fail); } });
        return;
      }
      make();
    });
  }

  // ---- Sala de espera (HTML común a 1 contra 1 y Todos contra todos) ------------------------------------------------
  // o: { title, pill, timeHtml, count, players:[{p, sub, good}], body, note, actions }. Todo `p` ya pasó por H.player().
  function roomBox(o) {
    if (o.h) H = o.h; else hh();
    var rows = (o.players || []).map(function (x) {
      return '<div class="history-item seq-pl-row' + (x.ghost ? ' seq-inv-ghost' : '') + '">' + H.who(x.p, x.sub) + '</div>';
    }).join('');
    return '<div class="duel-result-box duel-result-neutral seq-inv-room">' +
      '<div class="duel-result-title">' + o.title + '</div>' +
      '<div class="seq-inv-meta"><span class="seq-inv-pill">' + esc(o.pill) + '</span><span class="seq-inv-time">' + o.timeHtml + '</span></div>' +
      '<div class="seq-inv-count" aria-live="polite">' + esc(o.count) + '</div>' +
      '<div class="history-list seq-m-players">' + rows + '</div>' +
      (o.body || '') +
      (o.note ? '<p class="seq-inv-need">' + esc(o.note) + '</p>' : '') +
      '<div class="seq-inv-actions">' + (o.actions || '') + '</div></div>';
  }

  // Sala de Todos contra todos pendiente, vista del ANFITRIÓN. `listHtml` lo pinta multi-duels.js (lista única de participantes).
  function multiWaiting(d, helpers, listHtml) {
    H = helpers;
    var n = accepted(d), occupied = seats(d), can = n >= MIN, free = occupied < MAX, v2 = on(), link = d.enlace || null;
    var linkHtml = window.SEQMultiLink ? SEQMultiLink.roomPanel(d, v2) : '';
    // Desplegable «Invitar amigos»: la lista va DEBAJO del botón, así el botón no se mueve al abrirla.
    var invite = '';
    if (v2 && free) {
      invite = '<div class="seq-inv-dd"><button type="button" id="seq-inv-drop" class="btn btn-secondary seq-inv-drop" aria-expanded="' + (I.picker ? 'true' : 'false') + '"' +
        (I.picker ? ' aria-controls="seq-inv-panel"' : '') + ' onclick="SEQInvites.togglePicker()">Invitar amigos<span class="seq-inv-caret" aria-hidden="true"></span></button>' +
        (I.picker ? '<div id="seq-inv-panel">' + friendPicker(d) + '</div>' : '') + '</div>';
    }
    var actions = '';
    if (can) actions += '<button type="button" class="btn btn-primary" onclick="SEQMulti.action(\'start\')">Empezar duelo</button>';
    actions += '<button type="button" class="btn btn-secondary seq-inv-cancel" onclick="SEQInvites.cancelRoom()">Cancelar sala</button>';
    // El hueco del aviso se conserva (vacío) cuando ya se puede empezar, para que las plazas no den un salto.
    var need = can ? '<p class="seq-inv-need" aria-hidden="true">&nbsp;</p>' : '<p class="seq-inv-need">' + esc(startHint(n)) + '</p>';
    return '<div class="duel-result-box duel-result-neutral seq-inv-room seq-inv-multi">' +
      '<div class="duel-result-title">Sala de espera</div>' +
      '<div class="seq-inv-meta"><span class="seq-inv-pill">' + esc(modeLabel(d.modo, 'all')) + '</span><span class="seq-inv-time">Caduca en <b id="seq-d-count"></b></span></div>' +
      '<div class="seq-inv-head"><div class="seq-inv-count" aria-live="polite">' + occupied + '/' + MAX + ' jugadores</div>' + need + '</div>' +
      listHtml + linkHtml + invite +
      '<div class="seq-inv-actions">' + actions + '</div></div>';
  }
  function friendPicker(d) {
    var fl = H.S.lists.friends, inRoom = {};
    (d.jugadores || []).forEach(function (j) { if (j.estado === 'aceptado' || j.estado === 'invitado') inRoom[j.id] = 1; });
    if (!fl) { loadFriends(); return '<p class="stats-section-sub">Cargando amigos…</p>'; }
    var list = (fl.friends || []).filter(function (f) { return f && f.player && !inRoom[f.player.id]; });
    if (!list.length) return '<p class="stats-section-sub seq-inv-empty">No te quedan amigos por invitar.</p>';
    return '<div class="seq-inv-friends" role="group" aria-label="Amigos a los que invitar"><div class="history-list">' + list.map(function (f) {
      var p = H.player(f.player), online = H.isOnline(f);
      return '<div class="history-item seq-pl-row seq-inv-friend' + (online ? '' : ' seq-d-off') + '">' + H.who(p, online ? '<span class="seq-d-on">● En línea</span>' : 'Sin conexión') +
        '<div class="seq-pl-act"><button type="button" class="btn btn-primary seq-d-sm"' + (online ? ' onclick="SEQInvites.invite(\'' + p.id + '\')"' : ' disabled') + '>Invitar</button></div></div>';
    }).join('') + '</div></div>';
  }
  var askedFriends = false;
  function loadFriends() {
    if (askedFriends) return;
    askedFriends = true;
    api('GET', '/friends').then(function (d) { st().lists.friends = d; askedFriends = false; try { SEQDuels.rerender(); } catch (e) {} }).catch(function () { askedFriends = false; });
  }
  function togglePicker() {
    I.picker = !I.picker;
    try { SEQDuels.rerender(); focusDrop(); if (I.picker) SEQDuels.refreshSummary(); } catch (e) {}
  }
  // El repintado sustituye el botón: se le devuelve el foco (teclado y lector de pantalla) sin mover la pantalla.
  function focusDrop() { var b = document.getElementById('seq-inv-drop'); if (b && b.focus) b.focus({ preventScroll: true }); }
  function invite(id) {
    hh();
    id = H.safeId(id); var s = H.S;
    if (!id || !s.id || I.busy) return;
    I.busy = true; H.say('');
    api('POST', '/multi-duels/' + s.id + '/invite', { rivales: [id] }).then(function (d) { I.busy = false; H.apply(d); })
      .catch(function (e) { I.busy = false; H.say(H.errText(e), true); try { SEQDuels.reload(); } catch (x) {} });
  }
  function consumePicker() { return I.picker; }
  function cancelRoom() {
    confirmBox({ title: '¿Cancelar sala?', message: 'Los participantes tendrán que salir de esta sala.', confirmLabel: 'Cancelar sala', cancelLabel: 'Seguir esperando',
      onConfirm: function () { I.picker = false; if (window.SEQMulti) SEQMulti.action('cancel'); } });
  }

  // ---- 1 contra 1 con invitación directa a un amigo (sin enlace) -----------------------------------------------
  function directWaiting(d, helpers, p) {
    H = helpers;
    var me = H.player(session() || {});
    return roomBox({
      title: 'Esperando jugadores', pill: modeLabel(d.modo, 'one'), timeHtml: 'Caduca en <b id="seq-d-count"></b>', count: '1/2 jugadores',
      players: [{ p: me, sub: 'Anfitrión' }, { p: p, sub: 'Invitación enviada', ghost: true }],
      actions: '<button type="button" class="btn btn-secondary seq-inv-cancel" onclick="SEQInvites.cancelDuel()">Cancelar invitación</button>'
    });
  }
  function cancelDuel() {
    confirmBox({ title: '¿Cancelar invitación?', message: 'Tu amigo ya no podrá aceptarla.', confirmLabel: 'Cancelar invitación', cancelLabel: 'Seguir esperando',
      onConfirm: function () { if (window.SEQDuels) SEQDuels.duelAction('cancel'); } });
  }

  return {
    on: on, go: go, back: back, onKind: onKind, banner: banner, resume: resume, render: render, refresh: refresh,
    link: link, friend: friend, room: room, replaceFlag: replaceFlag, replaceDone: replaceDone,
    roomBox: roomBox, multiWaiting: multiWaiting, togglePicker: togglePicker, invite: invite, cancelRoom: cancelRoom, consumePicker: consumePicker,
    directWaiting: directWaiting, cancelDuel: cancelDuel, confirmBox: confirmBox, modeLabel: modeLabel, active: active, _I: I,
    core: { activeFrom: activeFrom, modeLabel: modeLabel, startHint: startHint, seats: seats, accepted: accepted, MIN: MIN, MAX: MAX }
  };
})();
