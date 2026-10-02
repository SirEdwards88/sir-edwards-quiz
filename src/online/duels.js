// SirEdwards Quiz v1.5 — Amigos, Duelo Online y Retos (interfaz).
//
// Principios:
//  - El SERVIDOR decide todo: qué pregunta toca, si la respuesta es correcta,
//    el tiempo, la puntuación y el ganador. Esta capa solo envía
//    {indice, respuesta} y pinta lo que el servidor devuelve. El temporizador
//    que se ve es solo visual (reloj del servidor estimado con un offset).
//  - Aislado del juego local: NO usa el motor de partida de index.html
//    (currentGame, XP, rachas, medallas locales). Un fallo aquí no puede
//    afectar a Jugar/Estándar/Contrarreloj/Supervivencia.
//  - Solo se muestra si hay sesión y el servidor activa `classic_duel` o
//    `async_challenges`. Si no están activas, la pestaña Duelo lo dice y no ofrece nada más.
//  - Seguridad de pintado (mismas reglas que online.js; ver
//    test/duels-ui-audit.test.mjs): todo texto del servidor pasa por esc(),
//    todo número por num(), los avatares por la lista cerrada, y los IDs que
//    se incrustan en atributos onclick se validan con ID_RE.
//
// Usa por nombre, en tiempo de ejecución: SEQOnline, TEST_QUESTIONS,
// mulberry32, seededShuffle, escapeHtml, closeDuelPanels.

(function () {
  'use strict';

  var ID_RE = /^[0-9A-Z]{10}$/;
  // Prompt 3 — Fase C/D: catálogo de avatares, validación y render movidos a
  // src/data/avatars.js (window.SEQAvatars), compartida con src/online/online.js
  // — antes cada archivo mantenía su propia copia (ver avatar() más abajo).
  // Fase D sustituyó el conjunto de valores válidos (antes 12 glifos-emoji
  // idénticos al de test/duels-ui-audit.test.mjs; ahora 6 ids de emblema
  // ilustrado) — ver nota de contrato de backend en avatars.js.
  var AVATARS = window.SEQAvatars ? window.SEQAvatars.GLYPHS : ['sombrero', 'libro', 'reloj', 'lupa', 'mascara', 'pluma'];
  var POLL_ACTIVE_MS = 3000;   // partida en curso o sala de espera
  var POLL_WAIT_MS = 5000;     // esperando a que el rival acepte
  var POLL_RETO_MS = 6000;     // red de seguridad durante la partida de un reto

  var S = {
    screen: null, id: null, data: null, lists: {}, pickKind: null,
    search: { q: '', results: null }, msg: '', msgBad: false,
    offset: 0, pollT: null, tickT: null, busy: false, sending: false,
    lastIdx: -1,           // duelo: índice de la ventana en curso según el reloj
    shown: null,           // pregunta PINTADA ahora mismo: {idx, qn}. Las respuestas van contra ESTA.
    reqSeq: 0, gotSeq: 0,  // descarta respuestas de load() que lleguen desordenadas
    streak: 0,             // partida: aciertos seguidos del propio jugador (solo para el sonido, como en la partida normal)
    shownAnswered: false,  // partida: la pregunta pintada ya está respondida (no hay tic-tac)
    lastSummary: 0,        // último refresco de los contadores de pendientes (sin sondeo continuo)
  };
  var SUMMARY_MIN_MS = 30000; // al abrir/volver a la app, como mucho un refresco (3 peticiones) cada 30 s

  // ---- Utilidades seguras --------------------------------------------------
  function num(v) { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; }
  function esc(s) {
    if (typeof s !== 'string') s = s == null ? '' : String(s);
    return typeof escapeHtml === 'function' ? escapeHtml(s) : s.replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function avatar(a) { return window.SEQAvatars ? window.SEQAvatars.avatarHTML(a) : (AVATARS.indexOf(a) >= 0 ? a : AVATARS[0]); }
  function safeId(id) { return typeof id === 'string' && ID_RE.test(id) ? id : ''; }
  function $(id) { return document.getElementById(id); }
  function session() { try { return window.SEQOnline && window.SEQOnline.session ? window.SEQOnline.session() : null; } catch (e) { return null; } }
  function features() { var s = session(); return s ? s.features : {}; }
  function active() { var f = features(); return !!(session() && (f.classic_duel || f.async_challenges)); }
  function call(method, path, body) { return window.SEQOnline.api(method, path, body); }
  function serverNow() { return Date.now() + S.offset; }
  function player(p) { p = p || {}; return { name: esc(p.display_name || 'Jugador'), avatar: avatar(p.avatar), id: safeId(p.id) }; }
  function secs(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
  function left(ms) {
    if (ms <= 0) return 'ya';
    var m = Math.floor(ms / 60000);
    if (m >= 60 * 24) return Math.floor(m / 1440) + ' d ' + Math.floor((m % 1440) / 60) + ' h';
    if (m >= 60) return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
    if (m >= 1) return m + ' min';
    return secs(ms) + ' s';
  }

  // Preguntas: el cliente ya tiene TEST_QUESTIONS (texto y opciones). El
  // servidor solo le dice QUÉ pregunta (por su número) y cuándo.
  var QMAP = null;
  function question(n) {
    if (!QMAP) { QMAP = {}; try { TEST_QUESTIONS.forEach(function (q) { QMAP[q.n] = q; }); } catch (e) {} }
    return QMAP[num(n)] || null;
  }
  // ---- Retos por modo (2.0) --------------------------------------------------------
  // Nombre, icono y reglas de cada modo. Las reglas las APLICA el servidor; aquí solo se explican.
  var RETO_MODE_UI = {
    estandar: { nombre: 'Estándar', icono: 'estandar', reglas: '20 preguntas · 10 s cada una' },
    supervivencia: { nombre: 'Supervivencia', icono: 'supervivencia', reglas: 'Hasta 40 preguntas · 3 vidas · 10 s cada una' },
    muerte_subita: { nombre: 'Muerte Súbita', icono: 'muerte-subita', reglas: '25 preguntas cada vez más difíciles · un fallo y fuera' },
    contrarreloj: { nombre: 'Contrarreloj', icono: 'contrarreloj', reglas: '60 s · +3 s por acierto, −3 s por fallo' },
    calculo_mental: { nombre: 'Cálculo Mental', icono: 'calculo', reglas: '60 s de operaciones · +2 s por acierto, −3 s por fallo' },
    lucidez: { nombre: 'Lucidez Mental', icono: 'secreto', reglas: 'Tres fases y un enigma final, con respuestas escritas' }
  };
  var NIVEL_UI = { ameba: 'Nivel Ameba', humano: 'Humano Promedio', derrame: 'Derrame Cerebral' };
  var FASE_UI = { 1: 'FASE I', 2: 'FASE II', 3: 'FASE III', 4: 'ENIGMA' };
  function retoMode(d) { return RETO_MODE_UI[d && d.modo] || RETO_MODE_UI.estandar; }
  function retoModeName(d) { return retoMode(d).nombre + (d && NIVEL_UI[d.nivel] ? ' · ' + NIVEL_UI[d.nivel] : ''); }
  function modeIco(m) { return '<img class="seq-ico seq-d-mode-ico" src="assets/modes/suelto/' + m.icono + '.webp" alt="" draggable="false">'; }
  // Un elemento de la partida (lo que manda el servidor) → texto, solución (si ya se puede ver) y forma de responder.
  var LMAP = null;
  function lucidezQ(n) {
    if (!LMAP) { LMAP = {}; try { QUESTIONS.forEach(function (q) { LMAP[q.n] = q; }); } catch (e) {} }
    return LMAP[num(n)] || null;
  }
  function itemInfo(it) {
    if (typeof it === 'number' || typeof it === 'string') {
      var q = question(it); return q ? { q: q.q, a: q.a, options: q.options, key: 'T' + num(it), qn: num(it) } : null;
    }
    if (!it || typeof it !== 'object') return null;
    if (it.tipo === 'calculo') return { q: String(it.texto || '').slice(0, 60), a: it.respuesta != null ? String(it.respuesta) : null, numeric: true, key: 'C' + String(it.texto || '').slice(0, 60) };
    if (it.tipo === 'lucidez') {
      var l = lucidezQ(it.n); return l ? { q: l.q, a: l.a, options: l.options && l.options.length ? l.options : null, key: 'L' + num(it.n) } : null;
    }
    if (it.tipo === 'enigma') {
      var r = null; try { r = LUCIDEZ_RIDDLES[num(it.i)]; } catch (e) {}
      return r ? { q: r.q, a: r.a, key: 'R' + num(it.i) } : null;
    }
    return null;
  }

  // Orden de las opciones: determinista por partida y pregunta, así una
  // recarga o una segunda pestaña muestran los botones en el mismo sitio.
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function optionsFor(scope, idx, q) {
    try { return seededShuffle(q.options.slice(), mulberry32(hash(scope + ':' + idx))); } catch (e) { return q.options.slice(); }
  }

  // ---- Efectos de la partida normal (sonidos y tic-tac) ----------------------
  // Son las funciones de index.html; respetan el ajuste de sonido del jugador.
  // Solo se llaman desde un EVENTO (la respuesta del servidor a /answer) o desde
  // el reloj único (tick); nunca desde render(), que se repinta cada pocos segundos.
  function sfx(ok) {
    try {
      if (ok && typeof playCorrectSound === 'function') playCorrectSound(S.streak);
      else if (!ok && typeof playSound === 'function') playSound('bad');
    } catch (e) {}
  }
  function urgency(ms) { try { if (typeof updateUrgencySound === 'function') updateUrgencySound(ms / 1000); } catch (e) {} }
  function urgencyStop() { try { if (typeof stopUrgencySound === 'function') stopUrgencySound(); } catch (e) {} }

  // ---- Mensajes (siempre textContent) ---------------------------------------
  function say(text, bad) { S.msg = text || ''; S.msgBad = !!bad; paintMsg(); }
  function paintMsg() { var el = $('seq-d-msg'); if (!el) return; el.textContent = S.msg; el.className = 'feedback ' + (S.msgBad ? 'bad' : 'good'); el.style.display = S.msg ? 'block' : 'none'; }
  function errText(e) {
    var c = e && e.code;
    var map = {
      network: 'Sin conexión. Inténtalo de nuevo.', no_session: 'Inicia sesión para usar esta función.',
      not_friends: 'Solo puedes retar a tus amigos.', player_busy: 'Tú o tu amigo ya tenéis un duelo online en marcha.',
      reto_already_active: 'Ya tenéis un reto abierto entre vosotros.', question_closed: 'Se acabó el tiempo de esa pregunta.',
      question_not_open: 'Esa pregunta aún no está abierta.', already_answered: 'Ya respondiste esa pregunta.',
      invalid_state: 'Ya no se puede hacer eso (el estado ha cambiado).', feature_disabled: 'Esta función no está activada.',
      rate_limited: 'Demasiadas peticiones. Espera unos segundos.', reto_expired: 'El plazo del reto ha terminado.',
    };
    if (e && e.network) return map.network;
    return map[c] || (e && e.message) || 'Algo ha fallado.';
  }

  // ---- Tarjetas en el inicio de Duelo ---------------------------------------
  // ---- Hub de Duelos -----------------------------------------------------------
  // Mismo lenguaje que las tarjetas de Jugar (.mode-card + .mode-card-icon +
  // .mode-subtitle), con variantes de color propias y acotadas (.seq-d-v-*,
  // styles/online.css): no se tocan las clases base de los modos individuales.
  // Todo el texto de las tarjetas es fijo; lo único dinámico son los contadores,
  // que pasan por num().
  function pending(n, one, many) {
    n = num(n);
    return n > 0 ? '<p class="mode-subtitle seq-d-pending">● ' + n + ' ' + (n === 1 ? one : many) + '</p>' : '';
  }
  function hubCard(variant, icon, title, desc, action, status) {
    return '<div class="mode-card seq-d-card seq-d-v-' + variant + '" role="button" tabindex="0" onclick="' + action + '" onkeydown="if(event.key===\'Enter\')' + action + '">' +
      '<div class="mode-card-icon' + (icon.indexOf('mode-img') !== -1 ? ' has-img' : '') + '" aria-hidden="true">' + icon + '</div><h3>' + title + '</h3><p>' + desc + '</p>' + (status || '') + '</div>';
  }
  function renderCards() {
    var slot = $('seq-duel-cards');
    if (!slot) return;
    var home = $('duel-home');
    var on = !!(window.SEQOnline && window.SEQOnline.enabled);
    if (!on || !active()) { if (home) home.classList.remove('seq-d-hub-on'); }
    if (!on) { slot.innerHTML = ''; return; }
    if (!session()) {
      slot.innerHTML = '<div class="mode-card seq-d-card" onclick="SEQOnline.goToAccount()"><div class="seq-d-card-icon"><img class="mode-img" src="assets/modes/amigos.webp" alt="" draggable="false"></div><div class="duel-action-text"><h3>Duelos con amigos</h3><p>Inicia sesión para retar a tus amigos online.</p></div></div>';
      return;
    }
    if (!active()) { slot.innerHTML = '<p class="stats-section-sub">Los duelos y los retos estarán disponibles muy pronto.</p>'; return; }
    if (home) home.classList.add('seq-d-hub-on');
    var f = features(), L = S.lists;
    var fr = L.friends ? num(L.friends.incoming.length) : 0;
    var du = L.duels ? L.duels.filter(function (d) { return (d.estado === 'pendiente' && d.soy === 'rival') || d.estado === 'aceptado' || d.estado === 'en_curso'; }).length : 0;
    var re = L.retos ? L.retos.filter(function (r) { return (r.estado === 'pendiente' && r.soy === 'rival') || (r.estado === 'aceptado' && !r.yo.terminado); }).length : 0;
    // Duelo en directo en marcha (p. ej. tras recargar): aviso arriba del todo, porque a los 60 s sin volver se pierde.
    var live = L.duels ? L.duels.filter(function (d) { return d.estado === 'en_curso'; })[0] : null;
    var h = live ? '<div class="mode-card seq-d-card seq-d-live" role="button" tabindex="0" onclick="SEQDuels.open(\'duel\',\'' + safeId(live.id) + '\')"><div class="duel-action-text"><h3>Un duelo te espera</h3><p>Sir Edwards no tiene todo el día. Vuelve antes de que te declaren desertor.</p><p class="mode-subtitle seq-d-pending">● VOLVER AL DUELO</p></div></div>' : '';
    h += navigator.onLine === false ? '<p class="stats-section-sub seq-d-offline">' + ico('nube') + 'Sin conexión: los duelos y los retos necesitan Internet.</p>' : '';
    if (f.classic_duel) h += hubCard('duel', '<img class="mode-img" src="assets/modes/duelo.webp" alt="" draggable="false">', 'Duelo online', 'Juega un duelo en directo contra un amigo.', "SEQDuels.open('duels')", pending(du, 'PENDIENTE', 'PENDIENTES'));
    if (f.async_challenges) h += hubCard('retos', '<img class="mode-img" src="assets/modes/retos.webp" alt="" draggable="false">', 'Retos', 'Elige el modo y reta a un amigo; cada uno juega cuando pueda.', "SEQDuels.open('retos')", pending(re, 'PENDIENTE', 'PENDIENTES'));
    h += hubCard('amigos', '<img class="mode-img" src="assets/modes/amigos.webp" alt="" draggable="false">', 'Amigos', 'Añade amigos y rétalos desde tu lista.', "SEQDuels.open('friends')", pending(fr, 'SOLICITUD', 'SOLICITUDES'));
    // Ranking: solo la entrada visual. Todavía no existe un ranking de duelos
    // (el ranking global por XP es otra cosa y está desactivado), así que la
    // tarjeta está bloqueada, sin navegación y sin datos.
    h += '<div class="mode-card locked seq-d-card seq-d-v-rank" aria-disabled="true"><span class="mode-lock-badge" aria-hidden="true"></span>' +
      '<div class="mode-card-icon has-img" aria-hidden="true"><img class="mode-img" src="assets/modes/ranking.webp" alt="" draggable="false"></div><h3>Ranking</h3><p>La clasificación de duelos entre amigos.</p><p class="mode-subtitle seq-d-soon">PRÓXIMAMENTE</p></div>';
    slot.innerHTML = h;
  }
  // El aviso «sin conexión» del hub se actualiza en cuanto cambia la red.
  window.addEventListener('online', function () { renderCards(); });
  window.addEventListener('offline', function () { renderCards(); });
  // Cabecera del hub (la usa también closeDuelPanels() en index.html). Solo se
  // aplica si el hub está a la vista: nunca pisa el título de un submenú abierto.
  function syncHubTopbar() {
    if (typeof setDuelTopbar !== 'function') return;
    var home = $('duel-home');
    if (S.screen || (home && home.style.display === 'none')) return;
    setDuelTopbar();
  }
  // Contadores al abrir la app y al volver a ella (sin sondeo continuo):
  // como mucho un refresco cada SUMMARY_MIN_MS.
  function summarySoon() {
    if (!active() || Date.now() - S.lastSummary < SUMMARY_MIN_MS) return;
    refreshSummary();
  }
  // Un solo toast por duelo en marcha cuando el jugador no está dentro de él (recarga, vuelta a la app).
  function notifyLiveDuel() {
    var l = S.lists.duels || [], d = l.filter(function (x) { return x.estado === 'en_curso'; })[0];
    if (!d || (S.screen === 'duel' && S.id === safeId(d.id)) || S.liveWarned === d.id) return;
    S.liveWarned = d.id;
    if (typeof showInfoToast === 'function') showInfoToast('Tienes un duelo en marcha: vuelve antes de 60 s o pierdes.', '⚔️');
  }
  function refreshSummary() {
    if (!active()) { renderCards(); return Promise.resolve(); }
    S.lastSummary = Date.now();
    var f = features();
    return Promise.all([
      call('GET', '/friends').then(function (d) { S.lists.friends = d; }).catch(function () {}),
      f.classic_duel ? call('GET', '/duels').then(function (d) {
        S.lists.duels = d.duels || [];
        notifyLiveDuel();
        recordFromList(S.lists.duels, 'duel'); // solo los que este dispositivo vio en juego: nunca se recuentan antiguos
      }).catch(function () {}) : null,
      f.async_challenges ? call('GET', '/challenges').then(function (d) { S.lists.retos = d.challenges || []; recordFromList(S.lists.retos, 'reto'); }).catch(function () {}) : null,
    ]).then(function () { renderCards(); if (S.screen && S.screen !== 'duel' && S.screen !== 'reto') render(); });
  }

  // ---- Navegación ------------------------------------------------------------
  function stopTimers() { clearTimeout(S.pollT); S.pollT = null; clearInterval(S.tickT); S.tickT = null; urgencyStop(); }
  function open(screen, id) {
    if (!active()) return;
    stopTimers();
    try { if (typeof closeDuelPanels === 'function') closeDuelPanels(); } catch (e) {}
    S.screen = screen; S.id = id ? safeId(id) : null; S.data = null; S.msg = ''; S.lastIdx = -1; S.shown = null; S.streak = 0; S.showReview = false;
    var home = $('duel-home'); if (home) home.style.display = 'none';
    var root = $('seq-duel-root'); if (root) root.style.display = 'block';
    render();
    if (screen === 'duel' || screen === 'reto') load();
    else if (screen === 'logros') loadLogros();
    else refreshSummary();
  }
  function loadLogros() {
    S.lists.logros = null;
    return call('GET', '/me/duel-achievements').then(function (d) { S.lists.logros = d; if (S.screen === 'logros') render(); })
      .catch(function (e) { if (S.screen === 'logros') say(errText(e), true); });
  }
  function back() {
    stopTimers();
    S.screen = null; S.id = null; S.data = null; S.shown = null;
    var root = $('seq-duel-root'); if (root) { root.style.display = 'none'; root.innerHTML = ''; root.classList.remove('seq-d-playing'); }
    var home = $('duel-home'); if (home) home.style.display = '';
    syncHubTopbar();
    refreshSummary();
  }

  // ---- Carga y sondeo de una partida -------------------------------------------
  function path() { return (S.screen === 'duel' ? '/duels/' : '/challenges/') + S.id; }
  // Cada load() lleva un número de secuencia: si llegan respuestas
  // desordenadas (dos peticiones en vuelo), solo se aplica la más reciente.
  // Sin esto, un estado viejo podía pintarse encima de uno nuevo.
  function load() {
    if (!S.id) return Promise.resolve();
    var screen = S.screen, id = S.id, seq = ++S.reqSeq;
    return call('GET', path()).then(function (d) {
      if (S.screen !== screen || S.id !== id || seq < S.gotSeq) return;
      S.gotSeq = seq;
      S.offset = num(d.server_now) - Date.now();
      S.data = d;
      recordResult(d);
      render();
      schedule();
    }).catch(function (e) {
      if (S.screen !== screen || S.id !== id || seq < S.gotSeq) return;
      say(errText(e), true);
      schedule(true);
    });
  }
  // Al ver un Duelo online o un Reto completado se avisa a index.html (una sola vez por partida, lo controla
  // registerOnlineDuelResult) con el ID estable del rival y el marcador, para las estadísticas y los logros
  // de Duelo. 2.0: los Retos también cuentan (los dos son duelos contra alguien); las victorias por
  // abandono o «no jugado», no; la derrota de quien abandona, sí.
  function recordResult(d) {
    if (!d || (S.screen !== 'duel' && S.screen !== 'reto')) return;
    var kind = S.screen;
    if (kind === 'duel' && d.estado === 'en_curso') markPlaying(kind, S.id);
    if (kind === 'reto' && d.estado === 'aceptado' && d.yo && d.yo.empezado) markPlaying(kind, S.id);
    if (d.estado === 'completado') { recordDuel(d, S.id, kind); forgetPlaying(kind, S.id); }
  }
  // Partidas que este dispositivo ha visto «en juego» (lo guarda index.html: duels.js no toca el almacenamiento).
  // Clave: el id del duelo, o «reto:<id>» para los retos.
  function playKey(kind, id) { id = safeId(id); return id ? (kind === 'reto' ? 'reto:' + id : id) : ''; }
  function playingIds() { try { return typeof onlineDuelsPlaying === 'function' ? onlineDuelsPlaying() : []; } catch (e) { return []; } }
  function markPlaying(kind, id) { var k = playKey(kind, id); if (k && typeof markOnlineDuelPlaying === 'function') markOnlineDuelPlaying(k); }
  function forgetPlaying(kind, id) { var k = playKey(kind, id); if (k && typeof forgetOnlineDuelPlaying === 'function') forgetOnlineDuelPlaying(k); }
  // También desde las listas (al abrir el hub): así cuenta una partida terminada aunque el jugador saliera antes
  // que el rival y no la haya vuelto a abrir. registerOnlineDuelResult evita contarla dos veces.
  function recordFromList(list, kind) {
    var playing = playingIds();
    (list || []).forEach(function (x) {
      if (x && x.estado === 'completado' && playing.indexOf(playKey(kind, x.id)) >= 0) { recordDuel(x, x.id, kind); forgetPlaying(kind, x.id); }
    });
  }
  function recordDuel(d, duelId, kind) {
    try {
      if (!d || d.estado !== 'completado' || !d.resultado) return;
      var r = d.resultado, rid = safeId(d.rival && d.rival.id), id = playKey(kind, duelId), g = r.ganador;
      var draw = r.empate === true || (g == null && num(r.mi_puntuacion) === num(r.puntuacion_rival));
      var res = g === 'yo' ? 'win' : g === 'rival' ? 'loss' : (draw ? 'draw' : null);
      if (!rid || !id || !res || typeof registerOnlineDuelResult !== 'function') return;
      registerOnlineDuelResult({ duelId: id, rivalId: rid, result: res, myScore: num(r.mi_puntuacion), opponentScore: num(r.puntuacion_rival), forfeit: d.motivo_fin === 'abandono' || d.motivo_fin === 'no_jugado', abandoned: d.motivo_fin === 'abandono' });
    } catch (e) {}
  }
  // Solo se sondea cuando hace falta y nunca con la pestaña oculta.
  function schedule(afterError) {
    clearTimeout(S.pollT);
    var d = S.data;
    if (!d || document.visibilityState === 'hidden') return;
    var wait = null;
    if (S.screen === 'duel') {
      if (d.estado === 'en_curso' || d.estado === 'aceptado') wait = POLL_ACTIVE_MS;
      else if (d.estado === 'pendiente') wait = POLL_WAIT_MS;
    } else if (d.estado === 'pendiente' && d.soy === 'creador') wait = POLL_WAIT_MS * 3;
    else if (d.estado === 'aceptado' && d.yo && d.yo.empezado && !d.yo.terminado) wait = POLL_RETO_MS; // red de seguridad
    if (afterError && wait) wait = Math.max(wait, 5000);
    if (wait) S.pollT = setTimeout(load, wait);
    startTicker();
  }
  function startTicker() {
    clearInterval(S.tickT);
    S.tickT = setInterval(tick, 250);
  }
  // Actualiza cuentas atrás y barras con textContent/style; nunca repinta HTML.
  function tick() {
    var d = S.data; if (!d) return;
    var now = serverNow();
    if (S.screen === 'duel' && d.estado === 'en_curso') {
      var dur = num(d.duracion_pregunta_ms) || 10000, t0 = num(d.t0);
      if (now < t0) { setCount(String(secs(t0 - now))); return; }
      var k = Math.floor((now - t0) / dur);
      if (k !== S.lastIdx) {
        // Cambió la ventana: los botones que se ven son de la pregunta
        // anterior. Se bloquean YA (un toque ahora no puede caer en otra
        // pregunta) y se pide al servidor la nueva.
        S.lastIdx = k;
        lockChoices();
        load();
        return;
      }
      var rem = t0 + (k + 1) * dur - now;
      setBar('seq-d-bar', rem / dur); setText('seq-d-time', String(secs(rem)));
      if (S.shown && S.shown.idx === k && !S.shownAnswered) urgency(rem);
    } else if (S.screen === 'duel' && (d.estado === 'aceptado' || d.estado === 'pendiente')) {
      var lim = d.estado === 'aceptado' ? num(d.listos_expira_at) : num(d.invitacion_expira_at);
      setText('seq-d-count', String(secs(lim - now)));
    } else if (S.screen === 'reto' && d.estado === 'aceptado' && d.yo.actual) {
      var limit = num(d.yo.actual.limite_at), dd = num(d.yo.actual.total_ms) || num(d.duracion_pregunta_ms) || 10000;
      setBar('seq-d-bar', (limit - now) / dd); setText('seq-d-time', String(secs(limit - now)));
      if (S.shown && S.shown.idx === d.yo.actual.indice && !S.shownAnswered && now <= limit) urgency(limit - now);
      if (now > limit && S.shown && S.shown.idx === d.yo.actual.indice) { lockChoices(); var ai = $('seq-d-ans'); if (ai) ai.disabled = true; }
      if (now > limit + 2500 && !S.sending && S.shown && S.shown.idx === d.yo.actual.indice) { S.shown = null; load(); } // venció: el servidor ya abrió la siguiente
    }
  }
  function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
  // Cuenta atrás de salida («Empieza en 3, 2, 1…»): cada número nuevo entra con un pequeño golpe visual.
  // Solo presentación: el número es el mismo que ya se pintaba.
  function setCount(t) {
    var el = $('seq-d-count'); if (!el || el.textContent === t) return;
    el.textContent = t;
    el.classList.remove('seq-d-pop'); void el.offsetWidth; el.classList.add('seq-d-pop');
  }
  function setBar(id, frac) { var el = $(id); if (el) el.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%'; }
  function lockChoices() {
    var box = $('seq-d-choices'); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.choice-btn'), function (b) { b.disabled = true; });
  }

  // ---- Acciones ----------------------------------------------------------------
  function act(method, p, body, then) {
    if (S.busy) return;
    S.busy = true; say('');
    call(method, p, body).then(function (d) { S.busy = false; then && then(d); }).catch(function (e) { S.busy = false; say(errText(e), true); });
  }
  function duelAction(action) {
    if (!S.id) return;
    act('POST', '/duels/' + S.id + '/' + action, undefined, function (d) {
      if (action === 'rematch') { open('duel', d.id); return; }
      S.gotSeq = ++S.reqSeq;
      S.offset = num(d.server_now) - Date.now(); S.data = d; render(); schedule();
    });
  }
  function retoAction(action) {
    if (!S.id) return;
    act('POST', '/challenges/' + S.id + '/' + action, undefined, function (d) {
      if (action === 'rematch') { open('reto', d.id); return; }
      S.gotSeq = ++S.reqSeq;
      S.offset = num(d.server_now) - Date.now(); S.data = d; render(); schedule();
    });
  }
  function listAction(kind, id, action) {
    id = safeId(id); if (!id) return;
    var base = kind === 'duel' ? '/duels/' : '/challenges/';
    act('POST', base + id + '/' + action, undefined, function (d) {
      if (action === 'accept') open(kind === 'duel' ? 'duel' : 'reto', d.id);
      else refreshSummary();
    });
  }
  function create(rivalId) {
    rivalId = safeId(rivalId); if (!rivalId) return;
    var kind = S.pickKind;
    if (kind !== 'duel') { pickMode(rivalId); return; } // un reto se crea después de elegir el modo
    act('POST', '/duels', { rival: rivalId }, function (d) { open('duel', d.id); });
  }
  // Retos: elegir el modo (solo los que los dos tenéis desbloqueados; lo decide el servidor).
  function pickMode(rivalId) {
    rivalId = safeId(rivalId); if (!rivalId) return;
    stopTimers();
    S.pickKind = 'reto'; S.pickRival = rivalId; S.screen = 'retomode'; S.id = null; S.data = null; S.shown = null; S.lists.retoModes = null; S.pickSurvival = false;
    var home = $('duel-home'); if (home) home.style.display = 'none';
    var root = $('seq-duel-root'); if (root) root.style.display = 'block';
    render();
    call('GET', '/challenges/modes?rival=' + encodeURIComponent(rivalId)).then(function (d) {
      S.lists.retoModes = (d && d.modos) || [];
      if (S.screen === 'retomode') render();
    }).catch(function (e) { say(errText(e), true); });
  }
  function createReto(modo, nivel) {
    var rivalId = safeId(S.pickRival); if (!rivalId || !RETO_MODE_UI[modo]) return;
    if (modo === 'supervivencia' && !NIVEL_UI[nivel]) { S.pickSurvival = true; render(); return; }
    act('POST', '/challenges', { rival: rivalId, modo: modo, nivel: NIVEL_UI[nivel] ? nivel : undefined }, function (d) { open('reto', d.id); });
  }
  function pick(kind) { S.pickKind = kind === 'duel' ? 'duel' : 'reto'; S.screen = 'pick'; render(); refreshSummary(); }

  // Respuesta: se envía el TEXTO de la opción elegida, contra la pregunta que
  // está PINTADA (S.shown), no contra la que "debería" tocar según el reloj.
  // El servidor corrige y, si la ventana ya se cerró, lo rechaza.
  function answer(optIdx) {
    var d = S.data, sh = S.shown;
    if (!d || !sh || S.sending || !sh.info || !sh.info.options) return;
    var opts = optionsFor(d.id, sh.idx, sh.info);
    var chosen = opts[num(optIdx)]; if (chosen == null) return;
    S.sending = true; S.shownAnswered = true; urgencyStop();
    markButtons(opts, chosen, null);
    call('POST', path() + '/answer', { indice: sh.idx, respuesta: chosen }).then(function (r) {
      S.sending = false;
      if (S.shown === sh) {
        markButtons(opts, chosen, r.respuesta_correcta);
        S.streak = r.es_correcta ? S.streak + 1 : 0;
        setVerdict(!!r.es_correcta, r.respuesta_correcta);
        sfx(!!r.es_correcta);
      }
      setTimeout(load, S.screen === 'reto' ? 700 : 300);
    }).catch(function (e) { S.sending = false; say(errText(e), true); setTimeout(load, 600); });
  }
  // Respuesta escrita (Retos por modo): se envía el texto tal cual; corrige el servidor.
  function answerText() {
    var d = S.data, sh = S.shown, inp = $('seq-d-ans');
    if (!d || !sh || S.sending || !inp || inp.disabled) return;
    var val = String(inp.value || '').trim().slice(0, 120); if (!val) { inp.focus(); return; }
    S.sending = true; S.shownAnswered = true; urgencyStop();
    inp.disabled = true; var btn = $('seq-d-send'); if (btn) btn.disabled = true;
    call('POST', path() + '/answer', { indice: sh.idx, respuesta: val }).then(function (r) {
      S.sending = false;
      if (S.shown === sh) {
        S.streak = r.es_correcta ? S.streak + 1 : 0;
        setVerdict(!!r.es_correcta, r.respuesta_correcta);
        sfx(!!r.es_correcta);
      }
      setTimeout(load, 900);
    }).catch(function (e) { S.sending = false; say(errText(e), true); setTimeout(load, 600); });
  }
  // Acierto / fallo con el mismo componente que la partida normal (.feedback.ok /
  // .feedback.bad), con texto propio de duelo. Se construye con textContent.
  var VERDICT_OK = '¡Punto para ti!';
  var VERDICT_BAD = 'Esta se te escapa. Era: ';
  // 2.0: ilustración (HTML fijo, sin datos del servidor) delante del texto.
  function ico(n) { return window.seqIco ? window.seqIco(n) : ''; }
  function setVerdict(ok, correct) {
    var el = $('seq-d-verdict'); if (!el) return;
    el.className = 'feedback seq-d-feedback ' + (ok ? 'ok' : 'bad');
    el.textContent = ok ? VERDICT_OK : VERDICT_BAD;
    if (window.SEQIcons) {
      var im = document.createElement('img'); im.className = 'seq-ico'; im.alt = ''; im.draggable = false;
      im.src = window.SEQIcons.src(ok ? 'correcto' : 'incorrecto'); el.insertBefore(im, el.firstChild);
    }
    if (!ok && correct != null) { var b = document.createElement('b'); b.textContent = String(correct); el.appendChild(b); }
    el.style.display = 'block';
  }
  function markButtons(opts, chosen, correct) {
    var box = $('seq-d-choices'); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.choice-btn'), function (b, i) {
      b.disabled = true;
      if (opts[i] === chosen) b.classList.add('selected');
      if (correct != null) { if (opts[i] === correct) b.classList.add('correct'); else if (opts[i] === chosen) b.classList.add('incorrect'); }
    });
  }

  function doSearch() {
    var el = $('seq-d-q'); var q = el ? String(el.value || '').trim().slice(0, 24) : '';
    S.search.q = q;
    if (!q) { S.search.results = null; render(); return; }
    act('GET', '/players/search?q=' + encodeURIComponent(q), undefined, function (d) { S.search.results = d.players || []; render(); });
  }
  function friendAdd(id) { id = safeId(id); if (!id) return; act('POST', '/friends/requests', { to: id }, function () { S.search.results = null; refreshSummary(); say('Solicitud enviada.'); }); }
  function friendResp(fid, action) { fid = safeId(fid); if (!fid) return; act('POST', '/friends/requests/' + fid + '/' + action, undefined, function () { refreshSummary(); }); }

  // ---- Pintado ---------------------------------------------------------------
  var ESTADO = { pendiente: 'Pendiente', aceptado: 'Aceptado', en_curso: 'En juego', completado: 'Terminado', rechazado: 'Rechazado', expirado: 'Caducado', cancelado: 'Cancelado' };
  // Pantallas del hub (Amigos, listas, elegir rival, logros): su título va en la
  // cabecera común de Duelo (.section-topbar, setDuelTopbar en index.html), no en
  // un .submenu-header propio. title/sub son siempre texto fijo (textContent).
  function topbarShown(on) { var bar = $('duel-section-topbar'); if (bar) bar.style.display = on ? '' : 'none'; }
  function header(title, sub, backFn) {
    if (typeof setDuelTopbar === 'function') setDuelTopbar(title, sub, backFn);
    topbarShown(true);
    return '<div id="seq-d-msg" class="feedback" style="display:none;"></div>';
  }
  // Partida de duelo / reto: su cabecera NO cambia en esta fase (se rediseña
  // junto con la pantalla de pregunta). Se oculta la cabecera común para no
  // mostrar dos cabeceras a la vez.
  function gameHeader(title, backFn) {
    topbarShown(false);
    return '<div class="submenu-header"><button class="btn btn-secondary" onclick="' + backFn + '">← Volver</button><h2 style="margin:0;">' + title + '</h2></div><div id="seq-d-msg" class="feedback" style="display:none;"></div>';
  }
  // Salir de un duelo en marcha cuesta la partida (60 s sin latido = abandono): se avisa antes.
  function leaveDuel() {
    var d = S.data, live = !!(d && d.estado === 'en_curso' && !(d.yo && d.yo.completado));
    if (live && typeof showAppConfirm === 'function') {
      showAppConfirm({ title: 'Duelo en marcha', message: 'Si sales del duelo, a los 60 s sin volver pierdes por abandono.', confirmLabel: 'Salir igualmente', onConfirm: function () { open('duels'); } });
      return;
    }
    open('duels');
  }
  function backToList() { open(S.pickKind === 'duel' ? 'duels' : 'retos'); }
  function resultLine(r) {
    if (!r) return '';
    if (r.ganador === 'yo') return 'Ganaste ' + num(r.mi_puntuacion) + '–' + num(r.puntuacion_rival);
    if (r.ganador === 'rival') return 'Perdiste ' + num(r.mi_puntuacion) + '–' + num(r.puntuacion_rival);
    return 'Empate ' + num(r.mi_puntuacion) + '–' + num(r.puntuacion_rival);
  }
  function resultIco(r) { return !r ? '' : ico(r.ganador === 'yo' ? 'copa' : r.ganador === 'rival' ? 'bandera' : 'amigos'); }
  // Logros de duelo online: insignia ilustrada por id (el servidor sigue mandando su emoji, que queda de reserva).
  var ONLINE_ACH_IMG = {
    online_primer_duelo: 'assets/modes/suelto/duelo.webp', online_primera_victoria: 'assets/logros/duel_victoria_inaugural.webp',
    online_cinco_victorias: 'assets/logros/games_50.webp', online_perfecto: 'assets/logros/lucidez_absoluta.webp',
    reto_primero: 'assets/modes/suelto/retos.webp', duelo_empate: 'assets/modes/amigos.webp'
  };
  function achIcon(a) {
    var src = a && Object.prototype.hasOwnProperty.call(ONLINE_ACH_IMG, a.id) ? ONLINE_ACH_IMG[a.id] : '';
    return src ? '<img class="seq-d-ach-img" src="' + src + '" alt="" draggable="false">' : esc(a && a.icon);
  }
  function rowFor(kind, x) {
    var p = player(x.rival), id = safeId(x.id);
    var sub = ESTADO[x.estado] || '';
    var btns = '';
    if (x.estado === 'pendiente' && x.soy === 'rival') {
      btns = '<button class="btn btn-primary seq-d-sm" onclick="event.stopPropagation();SEQDuels.listAction(\'' + kind + '\',\'' + id + '\',\'accept\')">Aceptar</button> <button class="btn btn-secondary seq-d-sm" onclick="event.stopPropagation();SEQDuels.listAction(\'' + kind + '\',\'' + id + '\',\'reject\')">Rechazar</button>';
      sub = kind === 'duel' ? '¡Te ha retado!' : 'Te ha retado · caduca en ' + left(num(x.expira_at) - Date.now());
    } else if (x.estado === 'pendiente') sub = 'Esperando respuesta';
    else if (x.estado === 'completado') sub = resultLine(x.resultado);
    else if (kind === 'reto' && x.estado === 'aceptado') sub = x.yo.terminado ? 'Esperando a tu amigo' : '¡Te toca jugar!';
    if (kind === 'reto' && x.modo) sub = retoModeName(x) + ' · ' + sub;
    return '<div class="history-item seq-d-row" onclick="SEQDuels.open(\'' + (kind === 'duel' ? 'duel' : 'reto') + '\',\'' + id + '\')"><div><div class="history-item-info">' + p.avatar + ' ' + p.name + '</div><div class="history-item-sub">' + esc(sub) + '</div></div><div>' + btns + '</div></div>';
  }
  function renderList(kind) {
    var list = kind === 'duel' ? S.lists.duels : S.lists.retos;
    var h = kind === 'duel' ? header('Duelo online', 'En directo contra un amigo', back) : header('Retos', 'Cada uno juega cuando puede', back);
    h += '<button class="btn btn-primary" style="width:100%;margin:10px 0;" onclick="SEQDuels.pick(\'' + kind + '\')">' + (kind === 'duel' ? ico('duelo') + 'Retar a un amigo ahora' : ico('retos') + 'Crear reto') + '</button>';
    if (!list) return h + '<p class="stats-section-sub">Cargando…</p>';
    var act_ = list.filter(function (x) { return ['pendiente', 'aceptado', 'en_curso'].indexOf(x.estado) >= 0; });
    var hist = list.filter(function (x) { return act_.indexOf(x) < 0; });
    h += '<h3 class="seq-d-h3">Activos</h3>' + (act_.length ? '<div class="history-list">' + act_.map(function (x) { return rowFor(kind, x); }).join('') + '</div>' : '<p class="stats-section-sub">No tienes ninguno activo.</p>');
    h += '<h3 class="seq-d-h3">Historial</h3>' + (hist.length ? '<div class="history-list">' + hist.map(function (x) { return rowFor(kind, x); }).join('') + '</div>' : '<p class="stats-section-sub">Todavía no hay historial.</p>');
    return h;
  }
  function renderPick() {
    var fl = S.lists.friends;
    var h = header('Elige a quién retar', S.pickKind === 'duel' ? 'Duelo online' : 'Reto', backToList);
    if (S.pickKind === 'duel') h += '<p class="stats-section-sub">Tu amigo tendrá 60 s para aceptar. Luego los dos pulsáis «Listo» y empieza.</p>';
    else h += '<p class="stats-section-sub">Tu amigo tiene 3 días para aceptar y jugar. Cada uno juega cuando pueda. Después eliges el modo.</p>';
    if (!fl) return h + '<p class="stats-section-sub">Cargando…</p>';
    if (!fl.friends.length) return h + '<p class="stats-section-sub">Aún no tienes amigos.</p><button class="btn btn-secondary" onclick="SEQDuels.open(\'friends\')">' + ico('amigos') + 'Añadir amigos</button>';
    return h + '<div class="history-list">' + fl.friends.map(function (f) {
      var p = player(f.player);
      return '<div class="history-item seq-d-row" onclick="SEQDuels.create(\'' + p.id + '\')"><div class="history-item-info">' + p.avatar + ' ' + p.name + '</div><div class="history-item-score">Retar ›</div></div>';
    }).join('') + '</div>';
  }
  function renderFriends() {
    var fl = S.lists.friends, me = session() || {}, f = features();
    var h = header('Amigos', 'Añade amigos y rétalos', back);
    h += '<p class="stats-section-sub">Tu ID para que te encuentren: <b>' + esc(safeId(me.id)) + '</b></p>';
    h += '<div class="seq-d-search"><input type="text" id="seq-d-q" maxlength="24" autocomplete="off" placeholder="Nombre o ID de tu amigo" onkeydown="if(event.key===\'Enter\')SEQDuels.doSearch()" /><button class="btn btn-primary" onclick="SEQDuels.doSearch()">Buscar</button></div>';
    if (S.search.results) {
      h += S.search.results.length ? '<div class="history-list">' + S.search.results.map(function (x) {
        var p = player(x);
        return '<div class="history-item"><div class="history-item-info">' + p.avatar + ' ' + p.name + ' <span class="history-item-sub">' + p.id + '</span></div><button class="btn btn-primary seq-d-sm" onclick="SEQDuels.friendAdd(\'' + p.id + '\')">Añadir</button></div>';
      }).join('') + '</div>' : '<p class="stats-section-sub">No se ha encontrado a nadie.</p>';
    }
    if (!fl) return h + '<p class="stats-section-sub">Cargando…</p>';
    if (fl.incoming.length) {
      h += '<h3 class="seq-d-h3">Solicitudes recibidas</h3><div class="history-list">' + fl.incoming.map(function (x) {
        var p = player(x.player), fid = safeId(x.friendship_id);
        return '<div class="history-item"><div class="history-item-info">' + p.avatar + ' ' + p.name + '</div><div><button class="btn btn-primary seq-d-sm" onclick="SEQDuels.friendResp(\'' + fid + '\',\'accept\')">Aceptar</button> <button class="btn btn-secondary seq-d-sm" onclick="SEQDuels.friendResp(\'' + fid + '\',\'reject\')">Rechazar</button></div></div>';
      }).join('') + '</div>';
    }
    if (fl.outgoing.length) {
      h += '<h3 class="seq-d-h3">Solicitudes enviadas</h3><div class="history-list">' + fl.outgoing.map(function (x) {
        var p = player(x.player), fid = safeId(x.friendship_id);
        return '<div class="history-item"><div class="history-item-info">' + p.avatar + ' ' + p.name + ' <span class="history-item-sub">pendiente</span></div><button class="btn btn-secondary seq-d-sm" onclick="SEQDuels.friendResp(\'' + fid + '\',\'cancel\')">Cancelar</button></div>';
      }).join('') + '</div>';
    }
    h += '<h3 class="seq-d-h3">Mis amigos</h3>';
    if (!fl.friends.length) return h + '<p class="stats-section-sub">Busca a un amigo por su nombre o su ID para empezar.</p>';
    return h + '<div class="history-list">' + fl.friends.map(function (x) {
      var p = player(x.player), b = '';
      if (f.classic_duel) b += '<button class="btn btn-primary seq-d-sm" title="Duelo online" aria-label="Duelo online" onclick="SEQDuels.quick(\'duel\',\'' + p.id + '\')">' + ico('duelo') + '</button> ';
      if (f.async_challenges) b += '<button class="btn btn-secondary seq-d-sm" title="Reto" aria-label="Reto" onclick="SEQDuels.quick(\'reto\',\'' + p.id + '\')">' + ico('retos') + '</button>';
      return '<div class="history-item"><div class="history-item-info">' + p.avatar + ' ' + p.name + '</div><div>' + b + '</div></div>';
    }).join('') + '</div>';
  }
  function renderLogros() {
    var d = S.lists.logros;
    var h = header('Logros de duelo', 'Verificados por el servidor', back);
    h += '<p class="stats-section-sub">Se calculan en el servidor a partir de tus duelos y retos terminados. Los logros de Duelo están en la pestaña Logros.</p>';
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    var st = d.stats || { online: {}, retos: {} };
    h += '<p class="history-item-sub seq-d-rival">Duelos online: ' + num(st.online.jugados) + ' jugados · ' + num(st.online.ganados) + ' ganados · Retos: ' + num(st.retos.jugados) + ' jugados · ' + num(st.retos.ganados) + ' ganados</p>';
    return h + '<div class="history-list">' + (d.achievements || []).map(function (a) {
      var goal = num(a.goal) || 1, prog = Math.min(num(a.progress), goal);
      return '<div class="history-item seq-d-ach' + (a.unlocked === true ? ' seq-d-ach-on' : '') + '"><div class="seq-d-ach-icon">' + achIcon(a) + '</div><div class="seq-d-ach-body"><div class="history-item-info">' + esc(a.title) + '</div><div class="history-item-sub">' + esc(a.desc) + '</div>' +
        (goal > 1 && a.unlocked !== true ? '<div class="progress-bar seq-d-ach-bar"><div class="bar-fill" style="width:' + Math.round(prog / goal * 100) + '%"></div></div>' : '') +
        '</div><div class="history-item-score">' + (a.unlocked === true ? ico('correcto') : prog + '/' + goal) + '</div></div>';
    }).join('') + '</div>';
  }
  function quick(kind, id) { S.pickKind = kind === 'duel' ? 'duel' : 'reto'; create(id); }
  function renderRetoMode() {
    var rid = safeId(S.pickRival), fl = S.lists.friends, name = 'tu amigo';
    (fl && fl.friends || []).forEach(function (f) { var p = player(f.player); if (p.id === rid) name = p.name; });
    var h = header('Elige el modo', 'Reto a ' + name, backToList);
    h += '<p class="stats-section-sub">Los dos jugaréis exactamente la misma partida. Solo aparecen los modos que los dos tenéis desbloqueados.</p>';
    var list = S.lists.retoModes;
    if (!list) return h + '<p class="stats-section-sub">Cargando…</p>';
    return h + '<div class="history-list seq-d-modes">' + list.map(function (m) {
      // Solo ids conocidos (RETO_MODE_UI): nunca se pega en el onclick un texto arbitrario del servidor.
      var mid = m && Object.prototype.hasOwnProperty.call(RETO_MODE_UI, m.id) ? m.id : null, ui = mid ? RETO_MODE_UI[mid] : null; if (!ui) return '';
      var row = '<div class="seq-d-mode-icon">' + modeIco(ui) + '</div><div class="seq-d-mode-body"><div class="history-item-info">' + esc(ui.nombre) + '</div>';
      if (mid === 'supervivencia') {
        if (!S.pickSurvival) return '<div class="history-item seq-d-row seq-d-mode" onclick="SEQDuels.createReto(\'supervivencia\')">' + row + '</div><div class="history-item-score">Elegir ›</div></div>';
        return '<div class="history-item seq-d-mode">' + row + '<div class="seq-d-levels">' + ['ameba', 'humano', 'derrame'].map(function (lv) {
          return '<button type="button" class="btn btn-secondary seq-d-sm" onclick="SEQDuels.createReto(\'supervivencia\',\'' + lv + '\')">' + esc(NIVEL_UI[lv]) + '</button>';
        }).join(' ') + '</div></div></div>';
      }
      return '<div class="history-item seq-d-row seq-d-mode" onclick="SEQDuels.createReto(\'' + mid + '\')">' + row + '</div><div class="history-item-score">Retar ›</div></div>';
    }).join('') + '</div>';
  }

  // ---- Partida: la misma de un jugador + una capa discreta de duelo ---------------
  // Mismo esquema que #view-game (botón de salida, HUD .mode-header.game-hud con el
  // icono del modo a la izquierda, barra de progreso, .q-box, .choice-btn y
  // .feedback), pero con ids propios (seq-d-*): nunca los del motor local.
  // Deliberadamente NO se pinta nada del rival salvo su nombre y avatar: ni
  // aciertos, ni respuestas, ni si ya ha terminado. El resultado es sorpresa.
  function playScreen(kind, d, idx, qn, mine) {
    var p = player(d.rival);
    topbarShown(false);
    var h = '<div class="seq-d-toprow">' + (kind === 'duel' ? '<button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.leaveDuel()">← Duelo online</button>'
      : '<button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.open(\'retos\')">← Retos</button>') + '</div>';
    h += '<div id="seq-d-msg" class="feedback" style="display:none;"></div>';
    var lbl, extra = '', est = (d.yo && d.yo.estado) || {};
    if (kind === 'duel') lbl = 'DUELO<span class="seq-d-long"> ONLINE</span> · ' + (num(idx) + 1) + '/20';
    else {
      var m = retoMode(d), clock = d.modo === 'contrarreloj' || d.modo === 'calculo_mental';
      // Cabecera: el modo y, según el modo, por qué pregunta vas (x/total), la fase (Lucidez) o los aciertos (modos con reloj).
      // El icono del modo hace de título (el nombre ya no cabe en un móvil junto al reloj y las vidas).
      lbl = '<span class="seq-d-hud-mode" title="' + esc(m.nombre) + '">' + modeIco(m) + '</span>';
      if (d.modo === 'lucidez') lbl += (FASE_UI[num(est.fase)] || '');
      else if (clock) lbl += ico('correcto') + num(d.yo && d.yo.aciertos);
      else lbl += (num(idx) + 1) + '/' + num(d.n_preguntas || 20);
      if (est.vidas_max) {
        var hearts = '';
        for (var v = 0; v < num(est.vidas_max); v++) hearts += '<img class="seq-ico seq-d-heart' + (v < num(est.vidas) ? '' : ' seq-d-heart-off') + '" src="assets/modes/suelto/supervivencia.webp" alt="" draggable="false">';
        extra = ' <span class="seq-d-lives" aria-label="Vidas: ' + num(est.vidas) + '">' + hearts + '</span>';
      }
    }
    // Izquierda: los datos de la partida (progreso, segundos y vidas). Derecha: el rival.
    h += '<div class="mode-header game-hud seq-d-hud' + (kind === 'reto' ? ' seq-d-hud-reto' : '') + '"><span class="seq-d-hud-lbl">' + lbl + ' · </span>' +
      '<span class="seq-d-hud-right"><span class="seq-d-hud-time">' + ico('tiempo') + '<span id="seq-d-time"></span>s</span>' + extra + '</span>' +
      // El rival, en la misma línea: con el icono del modo en lugar de su nombre, cabe todo (progreso, segundos y rival).
      '<span class="seq-d-vs-chip" title="Tu rival">' + p.avatar + '<span class="seq-d-rival-name">' + p.name + '</span></span></div>';
    h += '<div class="progress-bar"><div id="seq-d-bar" class="bar-fill"></div></div>';
    return h + questionBlock(d.id, idx, qn, mine, kind === 'reto' && d.modo === 'lucidez' && num(est.fase) === 2);
  }
  // `it` es lo que manda el servidor: el número de una pregunta tipo test (Duelo y Reto clásico) o, en los Retos
  // por modo, un cálculo, una pregunta de Lucidez o el enigma. `fade`: Fase II de Lucidez (el texto se esconde a los 3 s).
  function questionBlock(scope, idx, it, mine, fade) {
    var info = itemInfo(it);
    if (!info) { S.shown = null; return '<p class="stats-section-sub">Cargando pregunta…</p>'; }
    if (!S.shown || S.shown.idx !== num(idx) || S.shown.key !== info.key) { S.shownAnswered = false; S.shownAt = Date.now(); }
    S.shown = { idx: num(idx), key: info.key, info: info, qn: info.qn };
    if (mine) S.shownAnswered = true;
    var fadeStyle = '';
    if (fade && !mine) fadeStyle = ' style="animation-delay:' + Math.max(0, 3000 - (Date.now() - (S.shownAt || Date.now()))) + 'ms"';
    var h = '<div class="q-box seq-d-qbox' + (fade && !mine ? ' seq-d-fade' : '') + '"><span' + fadeStyle + '>' + esc(info.q) + '</span></div>';
    if (info.options) {
      var opts = optionsFor(scope, idx, info);
      h += '<div id="seq-d-choices" class="seq-d-choices" role="group" aria-label="Opciones de respuesta" data-idx="' + num(idx) + '"' + (info.qn ? ' data-qn="' + num(info.qn) + '"' : '') + '>';
      h += opts.map(function (o, i) {
        var cls = 'choice-btn';
        if (mine) { if (o === mine.respuesta) cls += ' selected'; if (o === info.a) cls += ' correct'; else if (o === mine.respuesta) cls += ' incorrect'; }
        return '<button type="button" class="' + cls + '"' + (mine ? ' disabled' : '') + ' onclick="SEQDuels.answer(' + i + ')">' + esc(String(o)) + '</button>';
      }).join('');
      h += '</div>';
    } else {
      // Respuesta escrita (cálculos, Lucidez y enigma). El valor que se está escribiendo sobrevive a los repintados (render()).
      h += '<div class="seq-d-write" data-idx="' + num(idx) + '"><input type="text" id="seq-d-ans" class="seq-d-ans" maxlength="120" autocomplete="off" autocapitalize="off" spellcheck="false"' +
        (info.numeric ? ' inputmode="numeric" pattern="[0-9]*"' : '') + ' placeholder="' + (info.numeric ? 'Resultado' : 'Tu respuesta') + '"' +
        (mine ? ' disabled value="' + esc(String(mine.respuesta || '')) + '"' : ' onkeydown="if(event.key===\'Enter\')SEQDuels.answerText()"') + '>' +
        '<button type="button" class="btn btn-primary" id="seq-d-send"' + (mine ? ' disabled' : '') + ' onclick="SEQDuels.answerText()">Responder</button></div>';
    }
    // Veredicto ya conocido (al volver a pintar una pregunta respondida): mismo
    // .feedback que la partida normal, sin volver a sonar.
    var sol = info.a != null ? info.a : (mine && mine.pregunta && mine.pregunta.respuesta);
    if (mine) h += '<div id="seq-d-verdict" class="feedback seq-d-feedback ' + (mine.es_correcta ? 'ok' : 'bad') + '" aria-live="polite" style="display:block;">' +
      (mine.es_correcta ? ico('correcto') + esc(VERDICT_OK) : ico('incorrecto') + esc(VERDICT_BAD) + (sol != null ? '<b>' + esc(String(sol)) + '</b>' : '')) + '</div>';
    else h += '<div id="seq-d-verdict" class="feedback seq-d-feedback" aria-live="polite" style="display:none;"></div>';
    return h;
  }
  // Frase de Sir Edwards para el final de la partida (solo si se jugó entera: no en abandonos ni «no jugado»).
  // Estable para la misma partida (se elige por id), así que no cambia al repintar la pantalla.
  function resultPhrase(d, r) {
    if (!r || (d.motivo_fin && d.motivo_fin !== 'normal') || !window.SEQDuelPhrases) return '';
    var res = r.ganador === 'yo' ? 'win' : r.ganador === 'rival' ? 'loss' : 'draw';
    return SEQDuelPhrases.pick(res, num(r.mi_puntuacion) - num(r.puntuacion_rival), S.id || d.id);
  }
  // Marca de cada respuesta en el repaso del duelo: acierto, fallo o sin responder (iconos ilustrados).
  // Segundos por pregunta del propio reto (los creados antes de la 2.0 tienen 15 s).
  function secsPerQ(d) { return Math.round((num(d && d.duracion_pregunta_ms) || 10000) / 1000); }
  function mark(a) { return a ? ico(a.es_correcta ? 'correcto' : 'incorrecto') : ico('tiempo'); }
  // 2.0: XP que concede el servidor por esta partida (10 por acierto; Cálculo Mental no da; nivel máximo no suma).
  function xpFor(kind, d, aciertos) {
    try {
      if (kind === 'reto' && d.modo === 'calculo_mental') return 0;
      if (window.SEQStreakXp && SEQStreakXp.atMaxLevel()) return 0;
    } catch (e) {}
    return 10 * Math.max(0, num(aciertos));
  }
  // Una sola vez por partida: pide una sincronización para traer a este dispositivo la XP recién concedida.
  var xpSynced = {};
  function syncXpOnce(kind, d, xp) {
    var k = kind + ':' + (d && d.id);
    if (!xp || xpSynced[k]) return;
    xpSynced[k] = true;
    try { if (window.SEQOnline && SEQOnline.syncSoon) SEQOnline.syncSoon(); } catch (e) {}
  }
  function xpChipHtml(xp) {
    return xp > 0 ? '<span class="result-chip"><span class="result-chip-value">+' + xp + '</span><span class="result-chip-label">XP</span></span>' : '';
  }
  function resultBlock(d, kind) {
    var r = d.resultado, p = player(d.rival);
    if (!r) {
      var why = { rechazado: 'Tu amigo rechazó el reto.', expirado: 'Se acabó el plazo sin que se jugara.', cancelado: d.motivo_fin === 'sin_listos' ? 'No os marcasteis «Listo» a tiempo.' : 'Se canceló.' }[d.estado] || '';
      return '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + esc(ESTADO[d.estado] || '') + '</div><p class="duel-result-hint">' + esc(why) + '</p></div>';
    }
    var res = r.ganador === 'yo' ? 'win' : r.ganador === 'rival' ? 'loss' : 'draw';
    var cls = res === 'win' ? 'duel-result-win' : res === 'loss' ? 'duel-result-loss' : 'duel-result-draw';
    var note = d.motivo_fin === 'abandono' ? (d.yo && d.yo.abandonado ? 'Perdiste por abandono (más de 60 s sin conexión).' : p.name + ' abandonó la partida.')
      : d.motivo_fin === 'no_jugado' ? (res === 'win' ? p.name + ' no jugó a tiempo.' : 'No jugaste a tiempo.') : '';
    var phrase = resultPhrase(d, r), me = session() || {};
    // 2.0: la misma tarjeta final que una partida en solitario (mismas piezas y estilos que #results-card):
    // Sir Edwards, el nombre del modo, el marcador Tú / rival en las dos casillas, el icono, el desenlace y su
    // frase, la pastilla de la diferencia y el sello final.
    var mine = num(r.mi_puntuacion), his = num(r.puntuacion_rival), diff = Math.abs(mine - his);
    var forfeit = d.motivo_fin === 'abandono' || d.motivo_fin === 'no_jugado';
    var big = !forfeit && diff >= 8, close = !forfeit && diff <= 2;
    var cat = res === 'draw' ? 'Empate técnico'
      : forfeit ? (res === 'win' ? 'Victoria por incomparecencia' : 'Derrota por incomparecencia')
      : res === 'win' ? (big ? 'Victoria aplastante' : close ? 'Victoria por la mínima' : 'Victoria clara')
      : (big ? 'Derrota sin paliativos' : close ? 'Derrota por la mínima' : 'Derrota clara');
    var moodSrc = res === 'draw' ? 'assets/modes/amigos.webp'
      : res === 'win' ? (big ? 'assets/ui/sombrero-laurel.webp' : 'assets/ui/copa.webp')
      : (big ? 'assets/ui/sombrero-aplastado.webp' : 'assets/ui/bandera-blanca.webp');
    var charKey = res === 'win' ? 'victory' : res === 'loss' ? 'defeat' : 'victory';
    var title = kind === 'duel' ? 'Duelo online' : 'Reto · ' + retoModeName(d);
    var unit = kind === 'reto' && d.modo && d.modo !== 'estandar' && d.modo !== 'muerte_subita' ? '' : ' / ' + num(d.n_preguntas || (d.modo === 'muerte_subita' ? 25 : 20));
    var diffWord = d.modo === 'muerte_subita' ? (diff === 1 ? 'pregunta de diferencia' : 'preguntas de diferencia') : (diff === 1 ? 'acierto de diferencia' : 'aciertos de diferencia');
    var side = function (av, name, val, cls) {
      return '<div class="metric-box seq-d-mbox ' + cls + '"><div class="seq-d-mbox-av">' + av + '</div><div class="metric-value">' + val + '<small>' + esc(unit) + '</small></div><div class="metric-label">' + esc(name) + '</div></div>';
    };
    var xpGain = xpFor(kind, d, mine); syncXpOnce(kind, d, xpGain);
    var chips = '<div class="results-mode-chips show">' + (res === 'draw' ? '' : '<span class="result-chip"><span class="result-chip-icon">' + ico(res === 'win' ? 'copa' : 'duelo') + '</span><span class="result-chip-value">' + (res === 'win' ? '+' : '−') + diff + '</span><span class="result-chip-label">' + diffWord + '</span></span>') + xpChipHtml(xpGain) + '</div>';
    var stamp = ({ win: ['VICTORIA', 'gold'], loss: ['DERROTA', 'fail'], draw: ['EMPATE', 'ok'] })[res];
    var h = '<div class="results-card seq-d-results seq-d-final duel-result-box ' + cls + '">' +
      '<div class="results-character show char-' + (res === 'draw' ? 'neutral' : charKey) + '" aria-hidden="true"><picture><source srcset="assets/character/' + charKey + '.webp" type="image/webp"><img src="assets/character/' + charKey + '.webp" alt="" draggable="false"></picture></div>' +
      '<h3 class="seq-d-res-title">' + esc(title) + '</h3>' +
      '<div class="results-metrics-grid">' + side(avatar(me.avatar), 'Tú', mine, 'seq-d-mbox-me') + side(p.avatar, p.name, his, 'seq-d-mbox-rival') + '</div>' +
      '<div class="results-phrase-container ' + (res === 'win' ? 'tone-win' : res === 'loss' ? 'tone-fail' : 'tone-bien') + '">' +
      '<div class="results-mood-icon has-img"><img class="mood-img" src="' + moodSrc + '" alt="" draggable="false"></div>' +
      '<div class="results-category-title">' + esc(cat) + '</div>' +
      (phrase ? '<div class="results-phrase duel-result-phrase">' + esc(phrase) + '</div>' : '') +
      (note ? '<p class="duel-result-hint">' + esc(note) + '</p>' : '') + '</div>' +
      chips +
      '<div class="results-lucidez-stamp show"><span class="stamp-badge tone-' + stamp[1] + '">' + stamp[0] + '</span></div>';
    var hEnd = '</div>';
    if (d.estado === 'completado') {
      h += '<div class="results-actions"><button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="SEQDuels.' + (kind === 'duel' ? 'duelAction' : 'retoAction') + '(\'rematch\')">' + ico('revancha') + 'Revancha</button>';
      // «Compartir» discreto, como en solitario; gana presencia cuando hay algo que presumir (una victoria).
      h += '<button class="btn btn-share' + (res === 'win' ? '' : ' btn-share-quiet') + '" onclick="SEQDuels.shareResult()">' + ico('compartir') + 'Compartir resultado</button></div>';
    }
    // El repaso de preguntas, plegado: quien quiera curiosear, lo abre.
    h += '<button type="button" class="seq-link seq-d-review-toggle" onclick="SEQDuels.toggleReview()">' + (S.showReview ? 'Ocultar las preguntas' : 'Ver las preguntas') + '</button>' + hEnd;
    if (!S.showReview) return h;
    var ids = kind === 'duel' ? d.preguntas : r.preguntas;
    var myAns = {}, hisAns = {};
    (d.yo.respuestas || []).forEach(function (a) { myAns[num(a.indice)] = a; });
    (r.respuestas_rival || []).forEach(function (a) { hisAns[num(a.indice)] = a; });
    var byMode = kind === 'reto' && d.modo && d.modo !== 'estandar';
    h += '<div class="history-list seq-d-review">' + (ids || []).map(function (qn, i) {
      var a = myAns[i], b = hisAns[i];
      if (byMode && !a && !b) return ''; // en los modos con vidas o reloj, solo lo que llegó a jugar alguno
      var q = itemInfo(qn); if (!q) return '';
      return '<div class="history-item"><div><div class="history-item-info">' + (i + 1) + '. ' + esc(q.q) + '</div><div class="history-item-sub">Respuesta: ' + esc(q.a) + (a && !a.es_correcta ? ' · tú: ' + esc(a.respuesta) : '') + '</div></div><div class="seq-d-marks" title="Tú · rival">' + mark(a) + ' ' + mark(b) + '</div></div>';
    }).join('') + '</div>';
    return h;
  }
  function renderDuel() {
    var d = S.data;
    var h = gameHeader(ico('duelo') + 'Duelo online', 'SEQDuels.leaveDuel()');
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    var p = player(d.rival), now = serverNow();
    h += '<p class="stats-section-sub seq-d-vs">Tú contra ' + p.avatar + ' ' + p.name + '</p>';
    if (d.estado === 'pendiente') {
      if (d.soy === 'rival') return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + p.name + ' te reta a un duelo</div><p class="duel-result-hint">Caduca en <span id="seq-d-count"></span> s</p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.duelAction(\'accept\')">Aceptar</button> <button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.duelAction(\'reject\')">Rechazar</button></div>';
      return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Esperando a que ' + p.name + ' acepte…</div><p class="duel-result-hint">Le quedan <span id="seq-d-count"></span> s. Lo verá al abrir el juego.</p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.duelAction(\'cancel\')">Cancelar</button></div>';
    }
    if (d.estado === 'aceptado') {
      return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Sala de espera</div><p class="duel-result-hint">Tú: ' + (d.yo.listo ? ico('correcto') + 'listo' : ico('mediocre')) + ' · ' + p.name + ': ' + (d.rival_estado.listo ? ico('correcto') + 'listo' : ico('mediocre')) + '</p><p class="duel-result-hint">Quedan <span id="seq-d-count"></span> s para que los dos estéis listos.</p><p class="duel-result-hint seq-d-stay">Durante la partida no salgas de la app ni bloquees el móvil: a los 60 s sin conexión se pierde por abandono.</p>' + (d.yo.listo ? '' : '<button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.duelAction(\'ready\')">✅ ¡Listo!</button>') + '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.duelAction(\'cancel\')">Salir</button></div>';
    }
    if (d.estado === 'en_curso') {
      var t0 = num(d.t0), dur = num(d.duracion_pregunta_ms) || 10000;
      if (now < t0) { S.shown = null; return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Empieza en <span id="seq-d-count"></span>…</div></div>'; }
      var k = Math.min(19, Math.floor((now - t0) / dur)); S.lastIdx = k;
      if (d.yo.completado) { S.shown = null; return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">¡Has terminado!</div><p class="duel-result-hint">Esperando a que acabe ' + p.name + '…</p></div>'; }
      // Si el servidor aún no ha revelado la pregunta k (los datos son de
      // antes de que se abriera), no se pinta nada respondible: se espera.
      if (!d.preguntas || d.preguntas.length <= k) { S.shown = null; return h + '<p class="stats-section-sub">Cargando pregunta…</p>'; }
      var mine = null; (d.yo.respuestas || []).forEach(function (a) { if (num(a.indice) === k) mine = a; });
      return playScreen('duel', d, k, d.preguntas[k], mine) + (mine ? '<p class="stats-section-sub seq-d-next">Siguiente pregunta en cuanto acabe el tiempo.</p>' : '');
    }
    S.shown = null;
    return h + resultBlock(d, 'duel');
  }
  function renderReto() {
    var d = S.data;
    var h = gameHeader(ico('retos') + 'Reto', "SEQDuels.open('retos')");
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    var p = player(d.rival), now = serverNow();
    h += '<p class="stats-section-sub seq-d-vs">Tú contra ' + p.avatar + ' ' + p.name + '</p>';
    if (d.estado !== 'completado') h += '<p class="seq-d-mode-line">' + modeIco(retoMode(d)) + '<b>' + esc(retoModeName(d)) + '</b></p>';
    S.shown = null;
    if (d.estado === 'pendiente') {
      var cad = left(num(d.expira_at) - now);
      if (d.soy === 'rival') return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + p.name + ' te ha retado</div><p class="duel-result-hint">Caduca en ' + esc(cad) + '.</p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.retoAction(\'accept\')">Aceptar</button> <button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.retoAction(\'reject\')">Rechazar</button></div>';
      return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Esperando a que ' + p.name + ' acepte</div><p class="duel-result-hint">Lo verá cuando abra el juego. Caduca en ' + esc(cad) + '.</p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.retoAction(\'cancel\')">Cancelar reto</button></div>';
    }
    if (d.estado === 'aceptado') {
      var y = d.yo, rv = d.rival_estado;
      var rs = '<p class="history-item-sub seq-d-rival">' + p.avatar + ' ' + p.name + ': ' + (rv.terminado ? 'ya ha jugado (verás su marca al terminar tú)' : rv.empezado ? 'jugando…' : 'aún no ha jugado') + '</p>';
      if (y.terminado) { syncXpOnce('reto', d, xpFor('reto', d, y.aciertos)); return h + rs + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Tu parte está hecha: ' + num(y.aciertos) + (d.modo && d.modo !== 'estandar' ? (num(y.aciertos) === 1 ? ' acierto' : ' aciertos') : '/' + num(d.n_preguntas || 20)) + '</div><p class="duel-result-hint">' + (xpFor('reto', d, y.aciertos) ? '+' + xpFor('reto', d, y.aciertos) + ' XP ya en tu cuenta. ' : '') + 'Cuando ' + p.name + ' juegue verás el resultado. Plazo: ' + esc(left(num(d.expira_at) - now)) + '.</p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.reload()">Actualizar</button></div>' }
      if (!y.empezado) return h + rs + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">¿Preparado?</div><p class="duel-result-hint">Una vez empieces el reloj no se detiene. Plazo: ' + esc(left(num(d.expira_at) - now)) + '.</p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.retoAction(\'start\')">▶ Jugar mi parte</button></div>';
      if (!y.actual) return h + '<p class="stats-section-sub">Cargando…</p>';
      return playScreen('reto', d, y.actual.indice, y.actual.pregunta, null);
    }
    return h + resultBlock(d, 'reto');
  }

  function render() {
    var root = $('seq-duel-root');
    if (!root || !S.screen) return;
    var h = '';
    try {
      if (S.screen === 'friends') h = renderFriends();
      else if (S.screen === 'duels') h = renderList('duel');
      else if (S.screen === 'retos') h = renderList('reto');
      else if (S.screen === 'pick') h = renderPick();
      else if (S.screen === 'retomode') h = renderRetoMode();
      else if (S.screen === 'duel') h = renderDuel();
      else if (S.screen === 'reto') h = renderReto();
      else if (S.screen === 'logros') h = renderLogros();
    } catch (e) { S.shown = null; h = header('Duelos', '', back) + '<p class="stats-section-sub">No se pudo mostrar esta pantalla.</p>'; }
    // Un repintado (al llegar datos del servidor) no debe borrar lo que el
    // usuario está escribiendo en la búsqueda ni quitarle el foco.
    var d = S.data, playing = !!(d && ((S.screen === 'duel' && d.estado === 'en_curso' && !(d.yo && d.yo.completado)) ||
      (S.screen === 'reto' && d.estado === 'aceptado' && d.yo && d.yo.empezado && !d.yo.terminado)));
    root.classList.toggle('seq-d-playing', playing);
    // El final de un Duelo o un Reto lleva el mismo marco de color que la partida (como las tarjetas finales de cada modo).
    root.classList.toggle('seq-d-final-on', !!(d && (S.screen === 'duel' || S.screen === 'reto') && d.estado === 'completado'));
    // Color de la sección: cobre para el Duelo online, cian para los Retos.
    root.classList.toggle('seq-d-k-reto', S.screen === 'reto' || S.screen === 'retos' || S.screen === 'retomode' || (S.screen === 'pick' && S.pickKind === 'reto'));
    if (!playing) urgencyStop();
    var qEl = $('seq-d-q'), hadFocus = qEl && document.activeElement === qEl;
    if (qEl) S.search.q = String(qEl.value || '').slice(0, 24);
    // Lo que se está escribiendo en una respuesta tampoco se pierde (misma pregunta).
    var aEl = $('seq-d-ans'), aWrap = aEl && aEl.parentNode, aKeep = aEl && !aEl.disabled ? { v: String(aEl.value || ''), idx: aWrap && aWrap.getAttribute('data-idx'), focus: document.activeElement === aEl } : null;
    // Un sondeo que devuelve lo mismo no repinta: así no se reinician las animaciones de la tarjeta final.
    if (h !== S.lastHtml || !root.firstChild) { root.innerHTML = h; S.lastHtml = h; }
    var a2 = $('seq-d-ans');
    if (a2 && !a2.disabled) {
      if (aKeep && a2.parentNode.getAttribute('data-idx') === aKeep.idx) a2.value = aKeep.v;
      if (!aKeep || aKeep.focus || a2.parentNode.getAttribute('data-idx') !== aKeep.idx) { try { a2.focus({ preventScroll: true }); } catch (e) {} }
    }
    var q2 = $('seq-d-q');
    if (q2) { q2.value = S.search.q; if (hadFocus) { q2.focus(); try { q2.setSelectionRange(q2.value.length, q2.value.length); } catch (e) {} } }
    paintMsg();
    tick();
    celebrate(d);
  }
  // Victoria en un Duelo o un Reto: confeti una sola vez por partida y sesión (el resultado lo decide el
  // servidor; aquí solo se celebra lo que ya se muestra).
  function celebrate(d) {
    try {
      if (!d || d.estado !== 'completado' || !d.resultado || d.resultado.ganador !== 'yo') return;
      var key = S.screen + ':' + S.id;
      if (!S.celebrated) S.celebrated = {};
      if (S.celebrated[key]) return;
      S.celebrated[key] = true;
      if (window.SEQFx && typeof window.SEQFx.confetti === 'function') setTimeout(window.SEQFx.confetti, 350);
    } catch (e) {}
  }

  // ---- Integración -------------------------------------------------------------
  function onAccountChange() {
    if (!active() && S.screen) back();
    renderCards();
    syncHubTopbar();
    // Al abrir la app (o al iniciar sesión): primer refresco de los contadores.
    if (active() && !S.lastSummary) summarySoon();
  }
  function onShow() {
    if (!S.screen) {
      // Entrar en Duelo siempre muestra el hub principal.
      renderCards(); syncHubTopbar();
      refreshSummary();
      return;
    }
    // Al volver a la pestaña con una pantalla abierta (Amigos, listas…),
    // closeDuelPanels() ha vuelto a mostrar el hub: se oculta y se repinta
    // la pantalla, con su cabecera.
    var home = $('duel-home'); if (home) home.style.display = 'none';
    render();
    if (S.screen === 'duel' || S.screen === 'reto') load();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && (S.screen === 'duel' || S.screen === 'reto')) load();
    // Al volver a la app: refresco de los contadores (acotado por SUMMARY_MIN_MS).
    else if (document.visibilityState === 'visible' && !S.screen) summarySoon();
    if (document.visibilityState === 'hidden') clearTimeout(S.pollT);
  });

  // Prompt 5: comparte la tarjeta del resultado que YA se está mostrando (mismos
  // marcadores y ganador que decidió el servidor). Reutiliza el pipeline de
  // compartir de index.html; sin Web Share con archivos cae al texto.
  function shareResultCard() {
    try {
      var d = S.data, r = d && d.resultado;
      if (!r || d.estado !== 'completado' || typeof shareResultImage !== 'function') return;
      var res = r.ganador === 'yo' ? 'win' : r.ganador === 'rival' ? 'loss' : 'draw';
      var rv = d.rival || {}, sess = session(), kind = S.screen === 'duel' ? 'duel' : 'reto';
      var me = num(r.mi_puntuacion), them = num(r.puntuacion_rival);
      var text = SEQShareCard.shareText({ online: { kind: kind, result: res, me: me, them: them } });
      var input = {
        online: { kind: kind, result: res, myScore: me, opponentScore: them, modeLabel: kind === 'reto' ? retoModeName(d) : '',
                  rival: { name: rv.display_name || 'Jugador', avatar: rv.avatar }, phrase: resultPhrase(d, r) },
        player: sess ? { name: sess.display_name, avatar: sess.avatar } : null
      };
      shareResultImage({ input: input, text: text }).then(function (handled) {
        if (!handled && typeof shareResultAsText === 'function') shareResultAsText(text);
      });
    } catch (e) {}
  }

  window.SEQDuels = {
    shareResult: shareResultCard, leaveDuel: leaveDuel, toggleReview: function () { S.showReview = !S.showReview; render(); }, answerText: answerText, createReto: createReto, pickMode: pickMode,
    open: open, back: back, pick: pick, create: create, quick: quick,
    duelAction: duelAction, retoAction: retoAction, listAction: listAction, answer: answer,
    doSearch: doSearch, friendAdd: friendAdd, friendResp: friendResp, reload: load,
    onAccountChange: onAccountChange, onShow: onShow,
    syncHubTopbar: syncHubTopbar,
    _state: function () { return S; },
  };
})();
