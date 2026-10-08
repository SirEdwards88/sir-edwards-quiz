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
  var SHOW_MS = 9000, SHOW_COMPACT_MS = 6000;
  var ID_RE = /^[0-9A-Z]{10}$/;
  var TIMED_MODES = ['timetrial', 'mental_calc'];

  var timer = null, busy = false, lastCheck = 0, fails = 0, hideT = null, deferT = null;
  var queue = [];               // avisos pendientes de enseñar (si no era buen momento)

  // ---- Lógica pura ------------------------------------------------------------------------
  // Desafíos que te esperan: invitaciones recibidas (duelo y reto). → [{ kind, id, name, avatar }]
  function pendingFrom(duels, retos) {
    var out = [];
    (Array.isArray(duels) ? duels : []).forEach(function (d) { if (d && d.estado === 'pendiente' && d.soy === 'rival' && ID_RE.test(String(d.id))) out.push(item('duel', d)); });
    (Array.isArray(retos) ? retos : []).forEach(function (r) { if (r && r.estado === 'pendiente' && r.soy === 'rival' && ID_RE.test(String(r.id))) out.push(item('reto', r)); });
    return out;
  }
  function item(kind, x) { var p = x.rival || {}; return { kind: kind, id: String(x.id), name: String(p.display_name || 'Un amigo').slice(0, 24), avatar: p.avatar }; }
  // Lo que te toca jugar y aún no has hecho (para el punto del menú): invitaciones recibidas + retos aceptados sin terminar.
  function dotCount(duels, retos) {
    var n = pendingFrom(duels, retos).length;
    (Array.isArray(retos) ? retos : []).forEach(function (r) { if (r && r.estado === 'aceptado' && r.yo && !r.yo.terminado) n++; });
    return n;
  }
  function unseen(items, seen) { var s = Array.isArray(seen) ? seen : []; return items.filter(function (i) { return s.indexOf(i.kind + ':' + i.id) < 0; }); }

  // Texto del aviso (tono de Sir Edwards, neutro en género). El título es fijo y claro; el subtítulo rota sin repetir el último.
  // Reto: calma (hay 3 días de plazo). Duelo: prisa (la invitación caduca en 60 s). Varios: más seco.
  var SUBS = {
    reto: ['Toca para verlo. Ya habrá tiempo para excusas.', 'Toca para verlo. Tres días deberían bastar.', 'Un reto así merece, al menos, una mirada.', 'El reto ha llegado. Qué oportuno.'],
    duel: ['Toca para responder. El reloj corre.', 'Toca para responder. El tiempo tiene otros planes.', 'Toca para responder. Sesenta segundos, ni uno más.', 'El duelo no piensa esperar demasiado.', 'Toca para responder. La puntualidad importa.'],
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
      return i.kind === 'duel'
        ? { title: i.name + ' te reta a un duelo', sub: pickSub('duel', rnd) }
        : { title: i.name + ' te ha retado', sub: pickSub('reto', rnd) };
    }
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
      '<button type="button" class="inbox-x" aria-label="Cerrar aviso">×</button>';
    document.body.appendChild(b);
    b.querySelector('.inbox-x').addEventListener('click', function () { hide(); });
    return b;
  }
  function hide() { var b = document.getElementById('inbox-banner'); if (b) b.classList.remove('show'); clearTimeout(hideT); hideT = null; }
  function go(list) {
    hide();
    try {
      if (typeof switchTab === 'function') switchTab('duelo');
      if (!window.SEQDuels || !SEQDuels.open) return;
      if (list.length === 1) SEQDuels.open(list[0].kind, list[0].id);
      else SEQDuels.open(list.every(function (i) { return i.kind === 'reto'; }) ? 'retos' : list.every(function (i) { return i.kind === 'duel'; }) ? 'duels' : null);
    } catch (e) {}
  }
  function show(list) {
    var b = banner(), t = textFor(list);
    b.querySelector('.inbox-title').textContent = t.title;
    b.querySelector('.inbox-sub').textContent = t.sub;
    var av = b.querySelector('.inbox-av');
    try { av.innerHTML = list.length === 1 && window.SEQAvatars ? SEQAvatars.avatarHTML(list[0].avatar) : ''; } catch (e) { av.innerHTML = ''; }
    av.hidden = !av.innerHTML;
    b.classList.toggle('compact', compact());
    var body = b.querySelector('.inbox-body'), fresh = body.cloneNode(true);
    body.parentNode.replaceChild(fresh, body);                         // sin manejadores viejos
    fresh.addEventListener('click', function () { go(list); });
    void b.offsetWidth; b.classList.add('show');
    clearTimeout(hideT); hideT = setTimeout(hide, compact() ? SHOW_COMPACT_MS : SHOW_MS);
    markSeen(list);
  }
  function flush() {
    clearTimeout(deferT); deferT = null;
    if (!queue.length) return;
    if (!goodMoment()) { deferT = setTimeout(flush, 5000); return; }          // no es buen momento: se reintenta en 5 s
    var list = queue; queue = [];
    show(list);
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

  // ---- Sondeo ----------------------------------------------------------------------------
  function session() { try { return window.SEQOnline && SEQOnline.session ? SEQOnline.session() : null; } catch (e) { return null; } }
  function check(force) {
    var s = session(), f = s && s.features || {};
    if (busy || !s || !(f.classic_duel || f.async_challenges) || document.visibilityState === 'hidden' || navigator.onLine === false) return Promise.resolve();
    if (force !== true && Date.now() - lastCheck < MIN_GAP_MS) return Promise.resolve();
    busy = true; lastCheck = Date.now();
    var got = { duels: null, retos: null }, failed = false;
    return Promise.all([
      f.classic_duel ? SEQOnline.api('GET', '/duels').then(function (d) { got.duels = d && d.duels; }).catch(function () { failed = true; }) : null,
      f.async_challenges ? SEQOnline.api('GET', '/challenges').then(function (d) { got.retos = d && d.challenges; }).catch(function () { failed = true; }) : null
    ]).then(function () {
      busy = false; fails = failed ? Math.min(fails + 1, 6) : 0;
      if (failed && !got.duels && !got.retos) return;
      paintDot(dotCount(got.duels, got.retos));
      var fresh = unseen(pendingFrom(got.duels, got.retos), readSeen());
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

  window.SEQInbox = { core: { pendingFrom: pendingFrom, dotCount: dotCount, unseen: unseen, textFor: textFor, SUBS: SUBS }, check: check };
})();
