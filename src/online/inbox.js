// SirEdwards Quiz 2.2 — Avisos de Duelos y Retos dentro del juego (aviso flotante + punto en Duelo).
//
// Con la app abierta y con sesión, mira cada ~40 s si alguien te ha retado (usa las mismas peticiones que ya hace Duelo:
// GET /duels y GET /challenges; el servidor no cambia). Si hay algo nuevo, sale un aviso arriba, tocable, que lleva al duelo o reto.
//  · Nunca interrumpe: no sale dentro de una partida de Duelo/Reto en marcha ni durante Contrarreloj o Cálculo Mental
//    (espera a que acabes); en el resto de partidas sale compacto y sin pausar nada.
//  · Cada desafío avisa UNA sola vez (los ya avisados se recuerdan en este dispositivo).
//  · Con la app cerrada no puede avisar: eso es notificación push (otra fase, con cambios en el servidor).
// La parte pura (pendingFrom / unseen) se prueba en test/inbox.test.mjs.

(function () {
  'use strict';

  var POLL_MS = 40000;          // sondeo con la app visible
  var MIN_GAP_MS = 15000;       // y como mucho una comprobación cada 15 s (p. ej. al volver a la app)
  var MAX_BACKOFF_MS = 300000;  // si falla la red, se espacia hasta 5 min
  var SEEN_KEY = 'siredwards_quiz_inbox_seen_v1';
  var MAX_SEEN = 80;
  var SHOW_MS = 9000, SHOW_COMPACT_MS = 6000, SHOW_FRIEND_MS = 20000;   // la solicitud de amistad se queda más: hay que pulsar
  var ID_RE = /^[0-9A-Z]{10}$/;
  var TIMED_MODES = ['timetrial', 'mental_calc'];

  var timer = null, busy = false, lastCheck = 0, fails = 0, hideT = null, deferT = null;
  var reminded = false, cycle = 0, lastRequests = [];
  var queue = [];               // avisos pendientes de enseñar (si no era buen momento)

  // ---- Lógica pura ------------------------------------------------------------------------
  // Desafíos que te esperan: invitaciones recibidas (duelo y reto). → [{ kind, id, name, avatar }]
  function pendingFrom(duels, retos, multis, mretos, requests) {
    var out = [];
    // Solicitudes de amistad recibidas (aceptarlas no exige tener Duelo desbloqueado).
    (Array.isArray(requests) ? requests : []).forEach(function (q) {
      var p = q && q.player || {};
      if (q && ID_RE.test(String(q.friendship_id)) && ID_RE.test(String(p.id))) out.push({ kind: 'friend', id: String(q.friendship_id), name: String(p.display_name || 'Alguien').slice(0, 24), avatar: p.avatar });
    });
    (Array.isArray(duels) ? duels : []).forEach(function (d) { if (d && d.estado === 'pendiente' && d.soy === 'rival' && ID_RE.test(String(d.id))) out.push(item('duel', d)); });
    (Array.isArray(retos) ? retos : []).forEach(function (r) { if (r && r.estado === 'pendiente' && r.soy === 'rival' && ID_RE.test(String(r.id))) out.push(item('reto', r)); });
    // 2.4: invitaciones a un duelo todos contra todos (el anfitrión es el primero de la lista que no soy yo).
    (Array.isArray(multis) ? multis : []).forEach(function (m) {
      if (!m || m.estado !== 'pendiente' || m.mi_estado !== 'invitado' || !ID_RE.test(String(m.id))) return;
      var host = (Array.isArray(m.jugadores) ? m.jugadores : []).filter(function (j) { return j && !j.es_yo; })[0] || {};
      out.push({ kind: 'multi', id: String(m.id), name: String(host.display_name || 'Un amigo').slice(0, 24), avatar: host.avatar });
    });
    // 2.5: invitaciones a un reto todos contra todos (mientras el reto siga abierto).
    (Array.isArray(mretos) ? mretos : []).forEach(function (m) {
      if (!m || (m.estado !== 'pendiente' && m.estado !== 'aceptado') || m.mi_estado !== 'invitado' || !ID_RE.test(String(m.id))) return;
      var host = (Array.isArray(m.jugadores) ? m.jugadores : []).filter(function (j) { return j && !j.es_yo; })[0] || {};
      out.push({ kind: 'mreto', id: String(m.id), name: String(host.display_name || 'Un amigo').slice(0, 24), avatar: host.avatar });
    });
    return out;
  }
  function item(kind, x) { var p = x.rival || {}; return { kind: kind, id: String(x.id), name: String(p.display_name || 'Un amigo').slice(0, 24), avatar: p.avatar }; }
  // Lo que te toca jugar y aún no has hecho (para el punto del menú): invitaciones recibidas + retos aceptados sin terminar.
  function dotCount(duels, retos, multis, mretos, requests) {
    var n = pendingFrom(duels, retos, multis, mretos, requests).length;
    (Array.isArray(mretos) ? mretos : []).forEach(function (r) { if (r && r.estado === 'aceptado' && r.mi_estado === 'aceptado' && r.yo && !r.yo.terminado) n++; });
    (Array.isArray(retos) ? retos : []).forEach(function (r) { if (r && r.estado === 'aceptado' && r.yo && !r.yo.terminado) n++; });
    return n;
  }
  // Retos que ya aceptaste (o te esperan) y aún no has jugado: se recuerdan UNA vez al abrir el juego, aunque ya los hubieras visto.
  function waitingFrom(retos, mretos) {
    var out = [];
    (Array.isArray(retos) ? retos : []).forEach(function (r) { if (r && r.estado === 'aceptado' && r.yo && !r.yo.terminado && ID_RE.test(String(r.id))) { var i = item('reto', r); i.waiting = true; out.push(i); } });
    (Array.isArray(mretos) ? mretos : []).forEach(function (m) {
      if (!m || m.estado !== 'aceptado' || m.mi_estado !== 'aceptado' || !m.yo || m.yo.terminado || !ID_RE.test(String(m.id))) return;
      var host = (Array.isArray(m.jugadores) ? m.jugadores : []).filter(function (j) { return j && !j.es_yo; })[0] || {};
      out.push({ kind: 'mreto', id: String(m.id), name: String(host.display_name || 'Un amigo').slice(0, 24), avatar: host.avatar, waiting: true });
    });
    return out;
  }
  function unseen(items, seen) { var s = Array.isArray(seen) ? seen : []; return items.filter(function (i) { return s.indexOf(i.kind + ':' + i.id) < 0; }); }

  // Texto del aviso (tono de Sir Edwards, neutro en género). El título es fijo y claro; el subtítulo rota sin repetir el último.
  // Reto: calma (hay 3 días de plazo). Duelo: prisa (la invitación caduca en 60 s). Varios: más seco.
  var SUBS = {
    reto: ['Toca para verlo. Ya habrá tiempo para excusas.', 'Toca para verlo. Tres días deberían bastar.', 'Un reto así merece, al menos, una mirada.', 'El reto ha llegado. Qué oportuno.'],
    duel: ['Toca para responder. El reloj corre.', 'Toca para responder. El tiempo tiene otros planes.', 'Toca para responder. Tres minutos, ni uno más.', 'El duelo no piensa esperar demasiado.', 'Toca para responder. La puntualidad importa.'],
    mreto: ['Toca para verlo. Tres o cuatro, cada uno a su hora.', 'Toca para responder. El plazo corre, la vergüenza también.', 'Más de un rival, un solo ganador. Sir Edwards aprueba.'],
    multi: ['Toca para verlo. Tres o cuatro, y un solo ganador.', 'Toca para responder. La sala no espera eternamente.', 'Más de un rival a la vez. Sir Edwards aprueba.'],
    friend: ['Aceptar es gratis. Rechazar, también.', 'Una amistad nueva. Sir Edwards no promete que dure.', 'Tú decides. Sir Edwards solo toma nota.'],
    waiting: ['Toca para jugarlo. El plazo no es infinito.', 'Sigue sin jugar. Sir Edwards lo ha notado.', 'Tu reto espera. Con paciencia, pero espera.'],
    many: ['Toca para verlos. Sir Edwards espera.', 'Hay asuntos pendientes. Naturalmente.', 'Toca para verlos. Se han acumulado.']
  };
  var lastSub = {};
  function pickSub(kind, rnd) {
    var list = SUBS[kind], n = list.length, i = Math.floor((rnd || Math.random)() * n) % n;
    if (n > 1 && i === lastSub[kind]) i = (i + 1) % n;
    lastSub[kind] = i;
    return list[i];
  }
  function textFor(list, rnd) {
    if (list.length === 1) {
      var i = list[0];
      if (i.kind === 'friend') return { title: i.name + ' quiere ser tu amigo', sub: pickSub('friend', rnd) };
      if (i.waiting) return { title: 'Tienes un reto pendiente', sub: pickSub('waiting', rnd) };
      if (i.kind === 'mreto') return { title: i.name + ' te invita a un reto todos contra todos', sub: pickSub('mreto', rnd) };
      if (i.kind === 'multi') return { title: i.name + ' te invita a un duelo todos contra todos', sub: pickSub('multi', rnd) };
      return i.kind === 'duel'
        ? { title: i.name + ' te reta a un duelo', sub: pickSub('duel', rnd) }
        : { title: i.name + ' te ha retado', sub: pickSub('reto', rnd) };
    }
    if (list.every(function (i) { return i.kind === 'friend'; })) return { title: 'Tienes ' + list.length + ' solicitudes de amistad', sub: pickSub('friend', rnd) };
    if (list.every(function (i) { return i.waiting; })) return { title: 'Tienes ' + list.length + ' retos pendientes', sub: pickSub('many', rnd) };
    return { title: 'Tienes ' + list.length + ' desafíos nuevos', sub: pickSub('many', rnd) };
  }

  // ---- Estado en este dispositivo --------------------------------------------------------
  function readSeen() { try { var a = JSON.parse(localStorage.getItem(SEEN_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function markSeen(items) {
    try { var a = readSeen(); items.forEach(function (i) { var k = i.kind + ':' + i.id; if (a.indexOf(k) < 0) a.push(k); }); localStorage.setItem(SEEN_KEY, JSON.stringify(a.slice(-MAX_SEEN))); } catch (e) {}
  }

  // ---- Cuándo es buen momento ------------------------------------------------------------
  function inMatch() { var r = document.getElementById('seq-duel-root'); return !!(r && r.classList.contains('seq-d-playing')); }
  function inTimedGame() {
    try { return document.body.classList.contains('in-game') && typeof currentGame !== 'undefined' && TIMED_MODES.indexOf(currentGame.mode) >= 0; } catch (e) { return false; }
  }
  function compact() { return document.body.classList.contains('in-game'); }
  function goodMoment() { return document.visibilityState !== 'hidden' && !inMatch() && !inTimedGame(); }

  // ---- Aviso en pantalla ------------------------------------------------------------------
  function banner() {
    var b = document.getElementById('inbox-banner');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'inbox-banner'; b.className = 'inbox-banner'; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
    b.innerHTML = '<button type="button" class="inbox-body"><span class="inbox-av" aria-hidden="true"></span><span class="inbox-text"><b class="inbox-title"></b><i class="inbox-sub"></i></span></button>' +
      '<span class="inbox-acts" hidden><button type="button" class="inbox-yes">Aceptar</button><button type="button" class="inbox-no">Rechazar</button></span>' +
      '<button type="button" class="inbox-x" aria-label="Cerrar aviso">×</button>';
    document.body.appendChild(b);
    b.querySelector('.inbox-x').addEventListener('click', function () { hide(); });
    return b;
  }
  function hide() { var b = document.getElementById('inbox-banner'); if (b) b.classList.remove('show'); clearTimeout(hideT); hideT = null; }
  function go(list) {
    hide();
    if (list.length === 1 && list[0].kind === 'friend') return;     // la solicitud se responde en el propio aviso
    try {
      if (typeof switchTab === 'function') switchTab('duelo');
      if (!window.SEQDuels || !SEQDuels.open) return;
      if (list.length === 1) SEQDuels.open(list[0].kind, list[0].id);
      else SEQDuels.open(list.every(function (i) { return i.kind === 'reto' || i.kind === 'mreto'; }) ? 'retos' : list.every(function (i) { return i.kind === 'duel' || i.kind === 'multi'; }) ? 'duels' : null);
    } catch (e) {}
  }
  function answer(it, action) {
    hide();
    var O = window.SEQOnline;
    if (!O || !O.api) return;
    O.api('POST', '/friends/requests/' + it.id + '/' + action).then(function () {
      toast(action === 'accept' ? it.name + ' y tú ya sois amigos. Sir Edwards lo anota.' : 'Solicitud rechazada. Tus motivos, tuyos son.');
      try { if (window.SEQDuels && SEQDuels.refreshSummary) SEQDuels.refreshSummary(); } catch (e) {}
      lastCheck = 0; check(true);
    }, function () { toast('No se ha podido responder. Inténtalo de nuevo en un momento.'); });
  }
  function toast(msg) { try { if (typeof showInfoToast === 'function') showInfoToast(msg, 'copa'); } catch (e) {} }
  function show(list) {
    var b = banner(), t = textFor(list);
    b.querySelector('.inbox-title').textContent = t.title;
    b.querySelector('.inbox-sub').textContent = t.sub;
    var av = b.querySelector('.inbox-av');
    try { av.innerHTML = list.length === 1 && window.SEQAvatars ? SEQAvatars.avatarHTML(list[0].avatar) : ''; } catch (e) { av.innerHTML = ''; }
    // Varias invitaciones a la vez (sin un único remitente): la cara de Sir Edwards retador.
    if (!av.innerHTML && typeof seqIco === 'function') av.innerHTML = seqIco('sir-reto');
    av.hidden = !av.innerHTML;
    var fr = list.length === 1 && list[0].kind === 'friend';
    b.classList.toggle('compact', compact() && !fr);
    b.classList.toggle('friend', fr);
    var acts = b.querySelector('.inbox-acts');
    acts.hidden = !fr;
    if (fr) {
      var yes = acts.querySelector('.inbox-yes'), no = acts.querySelector('.inbox-no');
      var y2 = yes.cloneNode(true), n2 = no.cloneNode(true);
      yes.parentNode.replaceChild(y2, yes); no.parentNode.replaceChild(n2, no);
      y2.addEventListener('click', function () { answer(list[0], 'accept'); });
      n2.addEventListener('click', function () { answer(list[0], 'reject'); });
    }
    var body = b.querySelector('.inbox-body'), fresh = body.cloneNode(true);
    body.parentNode.replaceChild(fresh, body);                         // sin manejadores viejos
    fresh.addEventListener('click', function () { go(list); });
    void b.offsetWidth; b.classList.add('show');
    clearTimeout(hideT); hideT = setTimeout(hide, fr ? SHOW_FRIEND_MS : compact() ? SHOW_COMPACT_MS : SHOW_MS);
    markSeen(list);
  }
  function flush() {
    clearTimeout(deferT); deferT = null;
    if (!queue.length) return;
    if (!goodMoment()) { deferT = setTimeout(flush, 5000); return; }          // no es buen momento: se reintenta en 5 s
    var games = queue.filter(function (i) { return i.kind !== 'friend'; }), friends = queue.filter(function (i) { return i.kind === 'friend'; });
    if (games.length) { queue = friends; show(games); }
    else { queue = friends.slice(1); show(friends.slice(0, 1)); }
    if (queue.length) { clearTimeout(deferT); deferT = setTimeout(flush, SHOW_FRIEND_MS + 800); }
  }

  // ---- Punto en el menú ------------------------------------------------------------------
  function paintDot(n) {
    var hosts = [document.querySelector('.home-big-card.home-card-duelo'), document.querySelector('.tab-btn[onclick*="duelo"]')];
    hosts.forEach(function (h) {
      if (!h) return;
      var d = h.querySelector('.inbox-dot');
      if (!n) { if (d) d.remove(); return; }
      if (!d) { d = document.createElement('span'); d.className = 'inbox-dot'; d.setAttribute('aria-hidden', 'true'); h.appendChild(d); }
      d.textContent = n > 9 ? '9+' : String(n);
    });
  }

  // Aviso cuando alguien acepta una solicitud tuya: se recuerdan las enviadas y se compara con los amigos de ahora.
  var OUT_KEY = 'siredwards_quiz_inbox_out_v1';
  function noticeAccepted(d) {
    try {
      var prev; try { prev = JSON.parse(localStorage.getItem(OUT_KEY)); } catch (e) { prev = null; }
      var out = (d && d.outgoing || []).map(function (x) { return { id: x.player && x.player.id, name: x.player && x.player.display_name }; });
      var friends = (d && d.friends || []).map(function (x) { return x.player && x.player.id; });
      var done = (Array.isArray(prev) ? prev : []).filter(function (o) { return o && friends.indexOf(o.id) >= 0; });
      localStorage.setItem(OUT_KEY, JSON.stringify(out.concat((Array.isArray(prev) ? prev : []).filter(function (o) { return o && friends.indexOf(o.id) < 0 && !out.some(function (q) { return q.id === o.id; }); })).slice(0, 40)));
      if (done.length) toast(done.length === 1 ? String(done[0].name || 'Alguien').slice(0, 24) + ' ha aceptado tu solicitud. Ya sois amigos.' : done.length + ' personas han aceptado tu solicitud. Ya sois amigos.');
    } catch (e) {}
  }

  // ---- Sondeo ----------------------------------------------------------------------------
  function session() { try { return window.SEQOnline && SEQOnline.session ? SEQOnline.session() : null; } catch (e) { return null; } }
  function check(force) {
    var s = session(), f = s && s.features || {};
    if (busy || !s || !(f.classic_duel || f.async_challenges || f.multi_duel || f.multi_reto) || document.visibilityState === 'hidden' || navigator.onLine === false) return Promise.resolve();
    if (force !== true && Date.now() - lastCheck < MIN_GAP_MS) return Promise.resolve();
    busy = true; lastCheck = Date.now();
    var got = { duels: null, retos: null, multis: null, mretos: null, requests: null }, failed = false;
    cycle++;
    var wantFriends = (f.classic_duel || f.async_challenges) && (force === true || cycle % 3 === 1);
    return Promise.all([
      f.classic_duel ? SEQOnline.api('GET', '/duels').then(function (d) { got.duels = d && d.duels; }).catch(function () { failed = true; }) : null,
      f.multi_duel ? SEQOnline.api('GET', '/multi-duels').then(function (d) { got.multis = d && d.duels; }).catch(function () { failed = true; }) : null,
      f.multi_reto ? SEQOnline.api('GET', '/multi-challenges').then(function (d) { got.mretos = d && d.retos; }).catch(function () { failed = true; }) : null,
      wantFriends ? SEQOnline.api('GET', '/friends').then(function (d) { got.requests = d && d.incoming || []; noticeAccepted(d); }).catch(function () {}) : null,
      f.async_challenges ? SEQOnline.api('GET', '/challenges').then(function (d) { got.retos = d && d.challenges; }).catch(function () { failed = true; }) : null
    ]).then(function () {
      busy = false; fails = failed ? Math.min(fails + 1, 6) : 0;
      if (failed && !got.duels && !got.retos) return;
      if (got.requests) lastRequests = got.requests;
      paintDot(dotCount(got.duels, got.retos, got.multis, got.mretos, lastRequests));
      var fresh = unseen(pendingFrom(got.duels, got.retos, got.multis, got.mretos, got.requests), readSeen());
      if (!reminded && !failed) {      // al abrir el juego: recuerda los retos que aceptaste y no has jugado
        reminded = true;
        var already = fresh.map(function (i) { return i.kind + ':' + i.id; });
        fresh = fresh.concat(waitingFrom(got.retos, got.mretos).filter(function (i) { return already.indexOf(i.kind + ':' + i.id) < 0; }));
      }
      queue = unseen(queue.concat(fresh), []).filter(function (i, k, a) { return a.findIndex(function (j) { return j.kind === i.kind && j.id === i.id; }) === k; });
      flush();
    }).catch(function () { busy = false; });
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { check().then(schedule, schedule); }, Math.min(MAX_BACKOFF_MS, POLL_MS * Math.pow(2, fails)));
  }
  function start() {
    schedule();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
    setTimeout(check, 4000);       // primera comprobación al abrir (con la sesión ya cargada)
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  window.SEQInbox = { core: { pendingFrom: pendingFrom, waitingFrom: waitingFrom, dotCount: dotCount, unseen: unseen, textFor: textFor, SUBS: SUBS }, check: check };
})();
