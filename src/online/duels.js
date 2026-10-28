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
  // Tarjeta de jugador (amigos, rival, listas): avatar grande con marco dorado + nombre + detalle opcional.
  // `sub` ya llega escapado por quien llama. Estilos: .seq-pl* en styles/online.css.
  function who(p, sub) { return '<div class="seq-pl"><span class="seq-pl-av">' + p.avatar + '</span><div class="seq-pl-body"><div class="seq-pl-name">' + p.name + '</div>' + (sub ? '<div class="seq-pl-sub">' + sub + '</div>' : '') + '</div></div>'; }
  // Presencia: `online` lo informa el servidor (true/false). Sin dato (servidor sin la columna) no se bloquea a nadie.
  function isOnline(f) { return !(f && f.online === false); }
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
    if (!QMAP) { QMAP = {};
      // Las retiradas (2.2) siguen resolviéndose por ID para terminar los duelos y retos creados antes; el banco vivo manda.
      try { RETIRED_TEST_QUESTIONS.forEach(function (q) { QMAP[q.n] = q; }); } catch (e) {}
      try { TEST_QUESTIONS.forEach(function (q) { QMAP[q.n] = q; }); } catch (e) {} }
    return QMAP[num(n)] || null;
  }
  // ---- Retos por modo (2.0) --------------------------------------------------------
  // Nombre, icono y reglas de cada modo. Las reglas las APLICA el servidor; aquí solo se explican.
  var RETO_MODE_UI = {
    estandar: { nombre: 'Estándar', icono: 'estandar', reglas: '20 preguntas · 20 s cada una' },
    supervivencia: { nombre: 'Supervivencia', icono: 'supervivencia', reglas: 'Hasta 40 preguntas · 4 vidas · 20 s cada una' },
    muerte_subita: { nombre: 'Muerte Súbita', icono: 'muerte-subita', reglas: '25 preguntas cada vez más difíciles · un fallo y fuera' },
    contrarreloj: { nombre: 'Contrarreloj', icono: 'contrarreloj', reglas: '60 s · +3 s por acierto, −3 s por fallo' },
    calculo_mental: { nombre: 'Cálculo Turbo', icono: 'calculo-turbo', reglas: '60 s de operaciones · +4 s por acierto, −3 s por fallo' },
    // 2.3: Fondo. El servidor lleva las vidas (est.vidas / est.vidas_max) y el tiempo de cada operación (limite_at / total_ms).
    calculo_fondo: { nombre: 'Cálculo de Fondo', icono: 'calculo-clasico', reglas: '1 vida · 20 s por operación · vida extra con rachas de 8, 16 y 24' },
    lucidez: { nombre: 'Lucidez Mental', icono: 'secreto', reglas: 'Tres fases y un enigma final, con respuestas escritas' }
  };
  var NIVEL_UI = { ameba: 'Nivel Ameba', humano: 'Humano Promedio', derrame: 'Derrame Cerebral' };
  var FASE_UI = { 1: 'FASE I', 2: 'FASE II', 3: 'FASE III', 4: 'ENIGMA' };
  // El modo secreto no se nombra hasta tener los Fragmentos de Mente necesarios (como en player-profile.js).
  function lucOk() { try { return typeof getFragmentCount === 'function' && getFragmentCount(getStore()) >= FRAGMENT_TARGET; } catch (e) { return false; } }
  function retoMode(d) {
    var m = RETO_MODE_UI[d && d.modo] || RETO_MODE_UI.estandar;
    if (m === RETO_MODE_UI.lucidez && !lucOk()) return { nombre: 'Modo secreto', icono: m.icono, reglas: 'Un modo secreto' };
    return m;
  }
  function retoModeName(d) { return retoMode(d).nombre + (d && NIVEL_UI[d.nivel] ? ' · ' + NIVEL_UI[d.nivel] : ''); }
  // Emblema (sin aro ni disco) para la cabecera de la partida; modeIco, con su medallón, para listas y tarjetas.
  function modeEmblem(m) { return '<img class="seq-ico seq-d-mode-ico" src="assets/modes/emblema/' + m.icono + '.webp" alt="" draggable="false">'; }
  function modeIco(m) { return '<img class="seq-ico seq-d-mode-ico" src="assets/modes/suelto/' + m.icono + '.webp" alt="" draggable="false">'; }
  // Un elemento de la partida (lo que manda el servidor) → texto, solución (si ya se puede ver) y forma de responder.
  var LMAP = null;
  function lucidezQ(n) {
    if (!LMAP) { LMAP = {};
      try { RETIRED_QUESTIONS.forEach(function (q) { LMAP[q.n] = q; }); } catch (e) {}
      try { QUESTIONS.forEach(function (q) { LMAP[q.n] = q; }); } catch (e) {} }
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
      invalid_state: 'Ya no se puede hacer eso (el estado ha cambiado).',
      not_enough_players: 'Hacen falta al menos 3 jugadores.', not_enough_ready: 'Hacen falta al menos 3 jugadores listos.', invalid_players: 'Elige a 2 o 3 amigos.',
      modo_no_disponible: 'Ese modo aún no está disponible para varios jugadores.', participation_closed: 'Tu participación en este duelo ya terminó.', duel_not_active: 'Este duelo no está en juego.', feature_disabled: 'Esta función no está activada.',
      rate_limited: 'Demasiadas peticiones. Espera unos segundos.', reto_expired: 'El plazo del reto ha terminado.',
    };
    if (e && e.network) return map.network;
    return map[c] || 'Algo ha fallado. Inténtalo de nuevo en un momento.';
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
    du += window.SEQMulti ? SEQMulti.pendingCount(L.multis) : 0;
    var re = L.retos ? L.retos.filter(function (r) { return (r.estado === 'pendiente' && r.soy === 'rival') || (r.estado === 'aceptado' && !r.yo.terminado); }).length : 0;
    re += window.SEQMulti ? SEQMulti.pendingCountMReto(L.mretos) : 0;
    // Duelo en directo en marcha (p. ej. tras recargar): aviso arriba del todo, porque a los 60 s sin volver se pierde.
    var live = L.duels ? L.duels.filter(function (d) { return d.estado === 'en_curso'; })[0] : null;
    var liveM = !live && L.multis ? L.multis.filter(function (d) { return d.estado === 'en_curso' && d.mi_estado === 'aceptado'; })[0] : null;
    if (liveM) live = liveM;
    var h = live ? '<div class="mode-card seq-d-card seq-d-live" role="button" tabindex="0" onclick="SEQDuels.open(\'' + (live.tipo === 'duelo_multi' ? 'multi' : 'duel') + '\',\'' + safeId(live.id) + '\')"><div class="duel-action-text"><h3>Un duelo te espera</h3><p>Sir Edwards no tiene todo el día. Vuelve antes de que te declaren desertor.</p><p class="mode-subtitle seq-d-pending">● VOLVER AL DUELO</p></div></div>' : '';
    h += navigator.onLine === false ? emptyImg('sin-conexion') + '<p class="stats-section-sub seq-d-offline">' + ico('nube') + 'Sin conexión: los duelos y los retos necesitan Internet.</p>' : '';
    if (f.classic_duel) h += hubCard('duel', '<img class="mode-img" src="assets/modes/duelo-online.webp" alt="" draggable="false">', 'Duelo online', 'Veinte preguntas, o apuestas en secreto. Tú eliges cuánto arriesgas.', "SEQDuels.open('duels')", pending(du, 'PENDIENTE', 'PENDIENTES'));
    if (f.async_challenges) h += hubCard('retos', '<img class="mode-img" src="assets/modes/retos.webp" alt="" draggable="false">', 'Retos', 'Elige el modo y reta a un amigo. Cada uno juega cuando pueda.', "SEQDuels.open('retos')", pending(re, 'PENDIENTE', 'PENDIENTES'));
    h += hubCard('amigos', '<img class="mode-img" src="assets/modes/amigos.webp" alt="" draggable="false">', 'Amigos', 'Añade amigos y rétalos desde tu lista.', "SEQDuels.open('friends')", pending(fr, 'SOLICITUD', 'SOLICITUDES'));
    // 2.1: Rankings (PvP, Cálculo Mental y Contrarreloj; entre amigos o global). Pantalla propia, en src/online/duels-v21.js.
    h += hubCard('rank', '<img class="mode-img" src="assets/modes/ranking.webp" alt="" draggable="false">', 'Rankings', 'PvP, Contrarreloj y Cálculo. Entre amigos o global.', "SEQDuels.open('rankings')", '');
    slot.innerHTML = h;
  }
  // El aviso «sin conexión» del hub se actualiza en cuanto cambia la red.
  window.addEventListener('online', function () { renderCards(); if (S.id && !S.data && (S.screen === 'duel' || S.screen === 'multi' || S.screen === 'reto')) load(); });
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
    if (typeof showInfoToast === 'function') showInfoToast('Tu duelo sigue activo. Regresa antes de 60 s o perderás por abandono.', 'sir-reto');
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
      f.multi_duel ? call('GET', '/multi-duels').then(function (d) { S.lists.multis = d.duels || []; recordMultiFromList(S.lists.multis); }).catch(function () {}) : null,
      f.multi_reto ? call('GET', '/multi-challenges').then(function (d) { S.lists.mretos = d.retos || []; }).catch(function () {}) : null,
      f.async_challenges ? call('GET', '/challenges').then(function (d) { S.lists.retos = d.challenges || []; recordFromList(S.lists.retos, 'reto'); }).catch(function () {}) : null,
    ]).then(function () { renderCards(); if (S.screen && S.screen !== 'duel' && S.screen !== 'reto' && S.screen !== 'multi') render(); });
  }

  // ---- Navegación ------------------------------------------------------------
  function stopTimers() { clearTimeout(S.presT); S.presT = null; clearTimeout(S.pollT); S.pollT = null; clearInterval(S.tickT); S.tickT = null; urgencyStop(); }
  function open(screen, id) {
    if (!active() || !screen) return;     // sin pantalla no se oculta el hub (quedaba una vista en blanco)
    stopTimers();
    try { if (typeof closeDuelPanels === 'function') closeDuelPanels(); } catch (e) {}
    // 2.5: «mreto» = Reto todos contra todos; se comporta como un Reto (mismo reloj, sondeo y partida) con otra ruta y otras pantallas.
    S.isMulti = screen === 'mreto'; if (S.isMulti) screen = 'reto';
    S.screen = screen; S.id = id ? safeId(id) : null; S.data = null; S.msg = ''; S.lastIdx = -1; S.shown = null; S.streak = 0;
    try { if (window.SEQDuels21) SEQDuels21.resetStreak(); if (window.SEQMultiStakes) SEQMultiStakes.resetStreak(); } catch (e) {}   // auditoría 4 (37): la racha de aciertos no pasa de una partida a otra
    var home = $('duel-home'); if (home) home.style.display = 'none';
    var root = $('seq-duel-root'); if (root) root.style.display = 'block';
    render();
    if (screen === 'duel' || screen === 'reto' || screen === 'multi') load();
    else if (screen === 'logros') loadLogros();
    else if (screen === 'rankings') { if (window.SEQDuels21) SEQDuels21.loadRankings(); }
    else if (screen === 'profile') { if (window.SEQProfile) SEQProfile.load(); }
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
  function path() { return (S.screen === 'duel' ? '/duels/' : S.screen === 'multi' ? '/multi-duels/' : S.isMulti ? '/multi-challenges/' : '/challenges/') + S.id; }
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
      if (d.estado === 'completado' && S.screen === 'duel' && window.SEQDuels21 && S.invalidated !== d.id) { S.invalidated = d.id; SEQDuels21.invalidate(); }
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
  // 2.3: nivel con el que se entra a la partida, para avisar de la subida en la tarjeta final (src/ui/level-up.js).
  function markLevel(kind, id) { try { SEQLevelUp.markKey(kind + ':' + id); } catch (e) {} }
  function recordResult(d) {
    if (d && S.screen === 'multi') { recordMulti(d); return; }
    if (!d || (S.screen !== 'duel' && S.screen !== 'reto')) return;
    var kind = S.screen;
    // 2.5: el Reto todos contra todos no cuenta para estadísticas ni logros de Duelo (solo XP, que da el servidor); sí avisa de la subida de nivel.
    if (S.isMulti) { if (d.estado === 'aceptado' && d.yo && d.yo.empezado) markLevel('mreto', S.id); return; }
    if (kind === 'duel' && d.estado === 'en_curso') { markPlaying(kind, S.id); markLevel(kind, S.id); }
    if (kind === 'reto' && d.estado === 'aceptado' && d.yo && d.yo.empezado) { markPlaying(kind, S.id); markLevel(kind, S.id); }
    if (d.estado === 'completado') { recordDuel(d, S.id, kind); forgetPlaying(kind, S.id); }
  }
  // 2.4 Duelo todos contra todos: sus logros (medallas) salen de resultado.hitos, que calcula el servidor. Una sola vez por sala
  // (src/state/multi-result.js lo controla). No cuenta para el ELO ni las estadísticas del 1 vs 1.
  function recordMulti(d) {
    try {
      if (d.estado === 'en_curso') { markPlaying('multi', d.id); }
      if (d.estado !== 'completado' || !d.resultado || !d.resultado.hitos || !window.SEQMultiResult) return;
      var out = SEQMultiResult.register({ duelId: safeId(d.id), hitos: d.resultado.hitos });
      if (out && out.medals && out.medals.length) { S.newMedals = S.newMedals || {}; S.newMedals['multi:' + d.id] = out.medals.map(function (m) { return m.id; }); }
      forgetPlaying('multi', d.id);
    } catch (e) {}
  }
  // Salas múltiples que este dispositivo vio en juego y ya terminaron (aunque no se reabrieran): se piden y se registran.
  function recordMultiFromList(list) {
    var playing = playingIds();
    (list || []).forEach(function (x) {
      if (!x || x.estado !== 'completado' || playing.indexOf(playKey('multi', x.id)) < 0) return;
      call('GET', '/multi-duels/' + safeId(x.id)).then(function (d) { recordMulti(d); }).catch(function () {});
    });
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
      if (!x || x.estado !== 'completado' || playing.indexOf(playKey(kind, x.id)) < 0) return;
      // La lista no trae los hitos (solo el detalle): se pide el detalle para no perderlos. Si falla, se reintentará al abrir el hub.
      call('GET', (kind === 'reto' ? '/challenges/' : '/duels/') + safeId(x.id)).then(function (d) { recordDuel(d, x.id, kind); forgetPlaying(kind, x.id); }).catch(function () {});
    });
  }
  function recordDuel(d, duelId, kind) {
    try {
      if (!d || d.estado !== 'completado' || !d.resultado) return;
      var r = d.resultado, rid = safeId(d.rival && d.rival.id), id = playKey(kind, duelId), g = r.ganador;
      var draw = r.empate === true || (g == null && num(r.mi_puntuacion) === num(r.puntuacion_rival));
      var res = g === 'yo' ? 'win' : g === 'rival' ? 'loss' : (draw ? 'draw' : null);
      if (!rid || !id || !res || typeof registerOnlineDuelResult !== 'function') return;
      var out = registerOnlineDuelResult({ duelId: id, rivalId: rid, result: res, myScore: num(r.mi_puntuacion), opponentScore: num(r.puntuacion_rival), forfeit: d.motivo_fin === 'abandono' || d.motivo_fin === 'no_jugado', abandoned: d.motivo_fin === 'abandono', hitos: kind === 'duel' && r.hitos && typeof r.hitos === 'object' ? r.hitos : null, stakes: kind === 'duel' && d.modo === 'stakes', marginOk: (kind === 'duel' && d.modo !== 'stakes') || (kind === 'reto' && (!d.modo || d.modo === 'estandar')) });
      if (out && out.medals && out.medals.length) { S.newMedals = S.newMedals || {}; S.newMedals[id] = out.medals.map(function (m) { return m.id; }); }
    } catch (e) {}
  }
  // Solo se sondea cuando hace falta y nunca con la pestaña oculta.
  function schedule(afterError) {
    clearTimeout(S.pollT);
    var d = S.data;
    if (document.visibilityState === 'hidden') return;
    if (!d) {   // auditoría 4 (15): la primera carga falló y no hay datos: se reintenta sola en vez de quedarse en «Cargando…»
      if (afterError && S.id && (S.screen === 'duel' || S.screen === 'multi' || S.screen === 'reto')) S.pollT = setTimeout(load, 3000);
      return;
    }
    var wait = null;
    if (S.screen === 'duel') {
      if (d.estado === 'en_curso' || d.estado === 'aceptado') wait = POLL_ACTIVE_MS;
        // Ya has respondido o bloqueado y esperas al rival: se sondea cada segundo para pasar al instante cuando él también lo haga.
        if (d.estado === 'en_curso') {
          var rn = d.ronda, esperando = d.modo === 'stakes' ? !!(rn && ((rn.fase === 'apuesta' && rn.mi_apuesta) || (rn.fase === 'pregunta' && rn.yo_respondi))) : !!S.shownAnswered;
          if (esperando) wait = 1000;
        }
      else if (d.estado === 'pendiente') wait = POLL_WAIT_MS;
    } else if (S.screen === 'multi') {
      // 2.4 Duelo todos contra todos: mismo ritmo que el clásico; ya respondida la pregunta en curso, cada segundo para pasar al instante.
      var rm = d.ronda, espM = d.modo === 'stakes' ? !!(rm && ((rm.fase === 'apuesta' && rm.mi_apuesta) || (rm.fase === 'pregunta' && rm.yo_respondi))) : !!S.shownAnswered;
      if (d.estado === 'en_curso' || d.estado === 'aceptado') wait = d.estado === 'en_curso' && espM ? 1000 : POLL_ACTIVE_MS;
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
  // Duelo clásico con calendario dinámico (2.3): el servidor manda `inicios` (n + 1 instantes). La pregunta que toca es la
  // última ya abierta; acaba cuando abre la siguiente (antes de tiempo si respondieron los dos). Sin `inicios` (servidor
  // antiguo) se usa el horario fijo de siempre.
  function classicWin(d, now) {
    var dur = num(d.duracion_pregunta_ms) || 20000, t0 = num(d.t0), n = num(d.n_preguntas) || 20, ini = d.inicios;
    if (ini && ini.length > n) {
      var k = 0; while (k < n - 1 && num(ini[k + 1]) <= now) k++;
      return { k: k, end: num(ini[k + 1]), dur: dur };
    }
    var kk = Math.min(n - 1, Math.floor((now - t0) / dur));
    return { k: kk, end: t0 + (kk + 1) * dur, dur: dur };
  }
  // Actualiza cuentas atrás y barras con textContent/style; nunca repinta HTML.
  function tick() {
    var d = S.data; if (!d) return;
    var now = serverNow();
    if (S.screen === 'duel' && d.estado === 'en_curso' && d.modo === 'stakes') {
      if (window.SEQMultiStakes && window.SEQMulti) SEQMultiStakes.tickDuel(d, now);
      else if (window.SEQDuels21) SEQDuels21.tick(d, now);
    } else if (S.screen === 'multi' && d.estado === 'en_curso' && d.modo === 'stakes' && window.SEQMultiStakes) {
      SEQMultiStakes.tick(d, now);
    } else if ((S.screen === 'duel' || S.screen === 'multi') && d.estado === 'en_curso') {
      var t0 = num(d.t0);
      if (now < t0) { setCount(String(secs(t0 - now))); return; }
      var win = classicWin(d, now), k = win.k, dur = win.dur;
      if (k !== S.lastIdx) {
        // Cambió la ventana: los botones que se ven son de la pregunta
        // anterior. Se bloquean YA (un toque ahora no puede caer en otra
        // pregunta) y se pide al servidor la nueva.
        S.lastIdx = k;
        lockChoices();
        load();
        return;
      }
      var rem = win.end - now;
      setBar('seq-d-bar', rem / dur); setText('seq-d-time', String(secs(rem)));
      if (S.shown && S.shown.idx === k && !S.shownAnswered) urgency(rem);
    } else if ((S.screen === 'duel' || S.screen === 'multi') && (d.estado === 'aceptado' || d.estado === 'pendiente')) {
      var lim = d.estado === 'aceptado' ? num(d.listos_expira_at) : num(d.invitacion_expira_at);
      setText('seq-d-count', d.estado === 'aceptado' ? String(secs(lim - now)) : clock(secs(lim - now)));
    } else if (S.screen === 'reto' && d.estado === 'aceptado' && d.yo.actual) {
      var limit = num(d.yo.actual.limite_at), dd = num(d.yo.actual.total_ms) || num(d.duracion_pregunta_ms) || 10000;
      setBar('seq-d-bar', (limit - now) / dd); setText('seq-d-time', String(secs(limit - now)));
      if (S.shown && S.shown.idx === d.yo.actual.indice && !S.shownAnswered && now <= limit) urgency(limit - now);
      if (now > limit && S.shown && S.shown.idx === d.yo.actual.indice) { lockChoices(); var ai = $('seq-d-ans'); if (ai) ai.disabled = true; }
      if (now > limit + 2500 && !S.sending && S.shown && S.shown.idx === d.yo.actual.indice) { S.shown = null; load(); } // venció: el servidor ya abrió la siguiente
    }
  }
  // 3:00, 2:59… (la invitación dura minutos; la sala de espera, segundos)
  function clock(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
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
    call(method, p, body).then(function (d) { S.busy = false; then && then(d); }).catch(function (e) {
      S.busy = false;
      var msg = errText(e), c = e && e.code;
      say(msg, true);
      // Resultado dudoso (se cortó la red) o estado que ya cambió (plazo vencido, otro dispositivo lo hizo antes):
      // se consulta el estado real para no dejar un botón que parece válido. El aviso se mantiene.
      if ((e && e.network) || c === 'invalid_state' || c === 'reto_expired') {
        (S.id ? load() : refreshSummary()).then(function () { say(msg, true); }, function () {});
      }
    });
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
    act('POST', path() + '/' + action, undefined, function (d) {
      if (action === 'rematch') { open('reto', d.id); return; }
      S.gotSeq = ++S.reqSeq;
      S.offset = num(d.server_now) - Date.now(); S.data = d; render(); schedule();
    });
  }
  function listAction(kind, id, action) {
    id = safeId(id); if (!id) return;
    var base = kind === 'duel' ? '/duels/' : '/challenges/';
    if (kind === 'mreto') base = '/multi-challenges/';
    act('POST', base + id + '/' + action, undefined, function (d) {
      if (action === 'accept') open(kind === 'duel' ? 'duel' : kind === 'mreto' ? 'mreto' : 'reto', d.id);
      else refreshSummary();
    });
  }
  function create(rivalId) {
    rivalId = safeId(rivalId); if (!rivalId) return;
    var kind = S.pickKind;
    if (kind !== 'duel') { pickMode(rivalId); return; } // un reto se crea después de elegir el modo
    act('POST', '/duels', { rival: rivalId, modo: S.pickModo === 'stakes' ? 'stakes' : 'classic' }, function (d) { open('duel', d.id); });
  }
  // Retos: elegir el modo (solo los que los dos tenéis desbloqueados; lo decide el servidor).
  function pickMode(rivalId) {
    rivalId = safeId(rivalId); if (!rivalId) return;
    stopTimers();
    S.pickRivals = null; S.pickKind = 'reto'; S.pickRival = rivalId; S.screen = 'retomode'; S.id = null; S.data = null; S.shown = null; S.lists.retoModes = null; S.pickSurvival = false;
    var home = $('duel-home'); if (home) home.style.display = 'none';
    var root = $('seq-duel-root'); if (root) root.style.display = 'block';
    render();
    call('GET', '/challenges/modes?rival=' + encodeURIComponent(rivalId)).then(function (d) {
      S.lists.retoModes = (d && d.modos) || [];
      if (S.screen === 'retomode') render();
    }).catch(function (e) { say(errText(e), true); });
  }
  // 2.5: Reto todos contra todos: tras elegir a los amigos (src/online/multi-duels.js), se elige el modo entre los que TODOS tienen desbloqueados.
  function pickModeMulti(ids) {
    ids = (ids || []).map(safeId).filter(Boolean); if (ids.length < 2) return;
    stopTimers();
    S.pickKind = 'reto'; S.pickRival = null; S.pickRivals = ids; S.screen = 'retomode'; S.id = null; S.data = null; S.shown = null; S.lists.retoModes = null; S.pickSurvival = false;
    render();
    call('GET', '/multi-challenges/modes?rivales=' + ids.map(encodeURIComponent).join(',')).then(function (d) {
      S.lists.retoModes = (d && d.modos) || [];
      if (S.screen === 'retomode') render();
    }).catch(function (e) { say(errText(e), true); });
  }
  function createReto(modo, nivel) {
    var rivalId = safeId(S.pickRival);
    if (S.pickRivals && S.pickRivals.length && RETO_MODE_UI[modo]) {
      if (modo === 'supervivencia' && !NIVEL_UI[nivel]) { S.pickSurvival = true; render(); return; }
      act('POST', '/multi-challenges', { rivales: S.pickRivals, modo: modo, nivel: NIVEL_UI[nivel] ? nivel : undefined }, function (d) { S.pickRivals = null; open('mreto', d.id); });
      return;
    }
    if (!rivalId || !RETO_MODE_UI[modo]) return;
    if (modo === 'supervivencia' && !NIVEL_UI[nivel]) { S.pickSurvival = true; render(); return; }
    act('POST', '/challenges', { rival: rivalId, modo: modo, nivel: NIVEL_UI[nivel] ? nivel : undefined }, function (d) { open('reto', d.id); });
  }
  // 2.1: en Duelo online se elige antes el modo (clásico o apuestas); el servidor lo valida.
  function pick(kind, modo) {
    // 2.4: tras elegir clásico o apuestas se elige «1 vs 1» o «Todos contra todos» (si el servidor aún no lo tiene, «Todos contra todos» sale apagado).
    if (kind === 'duel' && window.SEQMulti) { S.pickKind = 'duel'; S.pickModo = modo === 'stakes' ? 'stakes' : 'classic'; S.screen = 'pickkind'; render(); refreshSummary(); return; }
    if (kind === 'reto' && window.SEQMulti) { S.pickKind = 'reto'; S.pickModo = 'classic'; S.screen = 'pickkind'; render(); refreshSummary(); return; }
    pick1v1(kind, modo);
  }
  function pick1v1(kind, modo) { S.pickRivals = null; S.pickKind = kind === 'duel' ? 'duel' : 'reto'; S.pickModo = modo === 'stakes' ? 'stakes' : 'classic'; S.screen = 'pick'; render(); refreshSummary(); watchPresence(); }
  // En la lista de a quién retar a un duelo en directo, la presencia se refresca cada 15 s (solo mientras esa pantalla está abierta y visible).
  var PRESENCE_MS = 15000;
  function watchPresence() {
    clearTimeout(S.presT); S.presT = null;
    if (S.screen !== 'pick' || S.pickKind !== 'duel') return;
    S.presT = setTimeout(function () {
      if (S.screen !== 'pick' || S.pickKind !== 'duel') return;
      var go = document.visibilityState === 'hidden' ? Promise.resolve() : call('GET', '/friends').then(function (d) { S.lists.friends = d; if (S.screen === 'pick') render(); }).catch(function () {});
      go.then(watchPresence);
    }, PRESENCE_MS);
  }

  // Auditoría 4 (11): si el envío falla por red se reintenta el MISMO cuerpo (el servidor es idempotente) hasta 3 veces;
  // si no hay manera, se libera el DOM (S.lastHtml = null fuerza el repintado) para que los botones no queden muertos.
  function postAnswer(sh, body, onOk, onSettled) {
    function send(n) {
      call('POST', path() + '/answer', body).then(function (r) { onOk(r); }).catch(function (e) {
        if (e && e.network && n < 3 && S.shown === sh && S.id) { setTimeout(function () { if (S.shown === sh) send(n + 1); else S.sending = false; }, 1500); return; }
        S.sending = false; S.shownAnswered = false; S.lastHtml = null;
        say(errText(e), true); setTimeout(load, 600);
        if (onSettled) onSettled();
      });
    }
    send(1);
  }
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
    postAnswer(sh, { indice: sh.idx, respuesta: chosen }, function (r) {
      S.sending = false;
      if (S.shown === sh) {
        markButtons(opts, chosen, r.respuesta_correcta);
        S.streak = r.es_correcta ? S.streak + 1 : 0;
        setVerdict(!!r.es_correcta, r.respuesta_correcta);
        sfx(!!r.es_correcta);
        retoFx(!!r.es_correcta);
      }
      // Reto de Supervivencia: tras un fallo se deja más tiempo para leer la respuesta correcta (2 s) y un toque en el aviso
      // salta la espera, como en la Supervivencia de Jugar. Ojo: la pregunta siguiente cuenta sus 20 s desde que el servidor
      // recibe la respuesta, así que esa espera sale del tiempo de la siguiente.
      var slowFail = S.screen === 'reto' && d.modo === 'supervivencia' && !r.es_correcta && S.shown === sh;
      var waitT = setTimeout(load, slowFail ? 2000 : (S.screen === 'reto' ? 700 : 300));
      if (slowFail) {
        var vEl = $('seq-d-verdict');
        if (vEl) { vEl.style.cursor = 'pointer'; vEl.onclick = function () { vEl.onclick = null; clearTimeout(waitT); load(); }; }
      }
    });
  }
  // Respuesta escrita (Retos por modo): se envía el texto tal cual; corrige el servidor.
  function answerText() {
    var d = S.data, sh = S.shown, inp = $('seq-d-ans');
    if (!d || !sh || S.sending || !inp || inp.disabled) return;
    var val = String(inp.value || '').trim().slice(0, 120); if (!val) { inp.focus(); return; }
    S.sending = true; S.shownAnswered = true; urgencyStop();
    inp.disabled = true; var btn = $('seq-d-send'); if (btn) btn.disabled = true;
    postAnswer(sh, { indice: sh.idx, respuesta: val }, function (r) {
      S.sending = false;
      if (S.shown === sh) {
        S.streak = r.es_correcta ? S.streak + 1 : 0;
        setVerdict(!!r.es_correcta, r.respuesta_correcta);
        sfx(!!r.es_correcta);
        retoFx(!!r.es_correcta);
      }
      setTimeout(load, 900);
    }, function () { var i2 = $('seq-d-ans'); if (i2) i2.disabled = false; var b2 = $('seq-d-send'); if (b2) b2.disabled = false; });
  }
  // Retos con reloj: aviso «±N SEGUNDOS» (src/online/reto-fx.js).
  function retoFx(ok) { try { if (S.screen === 'reto' && S.data && window.SEQRetoFX) SEQRetoFX.timeChange(S.data.modo, ok); } catch (e) {} }
  // Acierto / fallo con el mismo componente que la partida normal (.feedback.ok /
  // .feedback.bad), con texto propio de duelo. Se construye con textContent.
  // 2.2: el texto lo rota SEQDuelPhrases.verdict (estable por pregunta); estos son los de reserva.
  var VERDICT_OK = 'Punto para ti.';
  var VERDICT_BAD = 'Esta se te escapa. Era: ';
  function verdictText(ok, seed) { try { return window.SEQDuelPhrases ? SEQDuelPhrases.verdict(ok, seed) : (ok ? VERDICT_OK : VERDICT_BAD); } catch (e) { return ok ? VERDICT_OK : VERDICT_BAD; } }
  // 2.0: ilustración (HTML fijo, sin datos del servidor) delante del texto.
  function ico(n) { return window.seqIco ? window.seqIco(n) : ''; }
  function setVerdict(ok, correct) {
    var el = $('seq-d-verdict'); if (!el) return;
    el.className = 'feedback seq-d-feedback ' + (ok ? 'ok' : 'bad');
    el.textContent = verdictText(ok, (S.id || '') + ':' + String(correct));
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
    act('GET', '/players/search?q=' + encodeURIComponent(q), undefined, function (d) {
      // Quien ya es amigo no sale entre los resultados a añadir.
      var mine = {}; ((S.lists.friends && S.lists.friends.friends) || []).forEach(function (x) { if (x && x.player) mine[x.player.id] = 1; });
      var all = d.players || [];
      S.search.results = all.filter(function (x) { return !(x && mine[x.id]); });
      S.search.hidden = all.length - S.search.results.length;
      render();
    });
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
    return '<div class="submenu-header"><button class="btn btn-secondary" onclick="' + backFn + '">← Volver</button>' + (title ? '<h2 style="margin:0;">' + title + '</h2>' : '') + '</div><div id="seq-d-msg" class="feedback" style="display:none;"></div>';
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
    online_perfecto: 'assets/logros/lucidez_absoluta.webp',
    reto_primero: 'assets/modes/suelto/retos.webp', duelo_empate: 'assets/modes/amigos.webp',
    // Duelo todos contra todos (2.4): un archivo propio por logro; se sustituyen soltando uno con el mismo nombre.
    multi_mesa_completa: 'assets/logros/multi_mesa_completa.webp', multi_contra_la_corriente: 'assets/logros/multi_contra_la_corriente.webp',
    multi_entre_la_niebla: 'assets/logros/multi_entre_la_niebla.webp', multi_alguien_tenia_que_perder: 'assets/logros/multi_alguien_tenia_que_perder.webp',
    multi_costumbre_preocupante: 'assets/logros/multi_costumbre_preocupante.webp'
  };
  function achIcon(a) {
    var src = a && Object.prototype.hasOwnProperty.call(ONLINE_ACH_IMG, a.id) ? ONLINE_ACH_IMG[a.id] : '';
    return src ? '<img class="seq-d-ach-img" src="' + src + '" alt="" draggable="false">' : '';
  }
  function rowFor(kind, x) {
    if (x && x.tipo === 'duelo_multi' && window.SEQMulti) return SEQMulti.row(x, HELPERS);
    if (x && x.tipo === 'reto_multi' && window.SEQMulti) return SEQMulti.rowReto(x, HELPERS);
    var p = player(x.rival), id = safeId(x.id);
    var sub = ESTADO[x.estado] || '';
    var btns = '';
    if (x.estado === 'pendiente' && x.soy === 'rival') {
      btns = '<button class="btn btn-primary seq-d-sm" onclick="event.stopPropagation();SEQDuels.listAction(\'' + kind + '\',\'' + id + '\',\'accept\')">Aceptar</button> <button class="btn btn-secondary seq-d-sm" onclick="event.stopPropagation();SEQDuels.listAction(\'' + kind + '\',\'' + id + '\',\'reject\')">Rechazar</button>';
      sub = kind === 'duel' ? '¡Te ha retado!' : 'Te ha retado · caduca en ' + left(num(x.expira_at) - serverNow());
    } else if (x.estado === 'pendiente') sub = 'Esperando respuesta';
    else if (x.estado === 'completado') sub = resultLine(x.resultado);
    else if (kind === 'reto' && x.estado === 'aceptado') sub = x.yo.terminado ? 'Esperando a tu amigo' : '¡Te toca jugar! · quedan ' + left(num(x.expira_at) - serverNow());
    if (kind === 'reto' && x.modo) sub = retoModeName(x) + ' · ' + sub;
    if (kind === 'duel' && x.modo === 'stakes') sub = 'Apuestas · ' + sub;
    if (kind === 'duel' && x.estado === 'completado' && x.elo) { var ec = Number(x.elo.cambio) || 0; sub += ' · ' + (ec > 0 ? '+' : ec < 0 ? '−' : '±') + Math.abs(ec) + ' ELO'; }
    return '<div class="history-item seq-d-row seq-pl-row" onclick="SEQDuels.open(\'' + (kind === 'duel' ? 'duel' : 'reto') + '\',\'' + id + '\')">' + who(p, esc(sub)) + (btns ? '<div class="seq-pl-act seq-pl-act-full">' + btns + '</div>' : '') + '</div>';
  }
  // «Te toca a ti»: invitación recibida o Reto aceptado en el que aún no has jugado tu parte. Va primero y resaltado en Activos.
  function needsMe(x, kind) {
    if (!x || x.tipo) return false;
    return (x.estado === 'pendiente' && x.soy === 'rival') || (kind === 'reto' && x.estado === 'aceptado' && !!x.yo && !x.yo.terminado);
  }
  function renderList(kind) {
    var list = kind === 'duel' ? S.lists.duels : S.lists.retos;
    var h = kind === 'duel' ? header('Duelo online', 'En directo contra un amigo', back) : header('Retos', 'Cada uno juega cuando puede', back);
    if (kind === 'duel' && window.SEQDuels21) h += SEQDuels21.modeButtons();
    else h += '<button class="btn btn-primary" style="width:100%;margin:10px 0;" onclick="SEQDuels.pick(\'' + kind + '\')">' + (kind === 'duel' ? ico('duelo') + 'Retar a un amigo ahora' : ico('retos') + 'Crear reto') + '</button>';
    if (!list) return h + '<p class="stats-section-sub">Cargando…</p>';
    // 2.4: las salas todos contra todos comparten lista con los duelos 1 vs 1 (cada una con su fila), por fecha.
    if (kind === 'duel' && window.SEQMulti && S.lists.multis && S.lists.multis.length) list = list.concat(S.lists.multis).sort(function (a, b) { return num(b.creado_at) - num(a.creado_at); });
    if (kind === 'reto' && window.SEQMulti && S.lists.mretos && S.lists.mretos.length) list = list.concat(S.lists.mretos).sort(function (a, b) { return num(b.creado_at) - num(a.creado_at); });
    var act_ = list.filter(function (x) { return ['pendiente', 'aceptado', 'en_curso'].indexOf(x.estado) >= 0; });
    var hist = list.filter(function (x) { return act_.indexOf(x) < 0; });
    act_ = act_.filter(function (x) { return needsMe(x, kind); }).concat(act_.filter(function (x) { return !needsMe(x, kind); }));
    if (!act_.length && !hist.length) return h + (kind === 'duel' ? emptyState('vacio-general', 'Aún no hay duelos', 'Cuando juegues, aparecerán aquí.') : emptyState('vacio-general', 'Aún no hay retos', 'Cuando retes o te reten, aparecerán aquí.'));
    h += act_.length
      ? '<div class="seq-d-active"><h3 class="seq-d-h3 seq-d-h3-act">Activos<span class="seq-d-count">' + num(act_.length) + '</span></h3><div class="history-list">' + act_.map(function (x) { var r = rowFor(kind, x); return needsMe(x, kind) ? r.replace('class="history-item ', 'class="history-item seq-d-turn ') : r; }).join('') + '</div></div>'
      : '<h3 class="seq-d-h3">Activos</h3><p class="stats-section-sub">No tienes ninguno activo.</p>';
    h += '<h3 class="seq-d-h3 seq-d-h3-hist">Historial</h3>' + (hist.length ? '<div class="history-list">' + hist.map(function (x) { return rowFor(kind, x); }).join('') + '</div>' : '<p class="stats-section-sub">Todavía no hay historial.</p>');
    return h;
  }
  // Ilustración de estado vacío (2.3): objetos recortados, sin marco.
  function emptyImg(n) { return '<img class="seq-empty-img" src="assets/ui/escenas/' + n + '.webp" alt="" draggable="false">'; }
  // Estado vacío de las pantallas de Duelos (2.3): ilustración pequeña centrada, título, una frase y, si procede, un botón.
  function emptyState(img, title, sub, btn) {
    return '<div class="seq-ev">' + emptyImg(img) + '<div class="seq-ev-t">' + title + '</div><div class="seq-ev-s">' + sub + '</div>' + (btn || '') + '</div>';
  }
  function renderPick() {
    var fl = S.lists.friends;
    var h = header('Elige a quién retar', S.pickKind === 'duel' ? (S.pickModo === 'stakes' ? 'Duelo por apuestas' : 'Duelo clásico') : 'Reto', backToList);
    if (fl && !fl.friends.length) { /* sin amigos: no hay nada que explicar todavía */ }
    else if (S.pickKind !== 'duel') h += '<p class="stats-section-sub">Tu amigo tiene 3 días para jugar.</p>';
    if (!fl) return h + '<p class="stats-section-sub">Cargando…</p>';
    if (!fl.friends.length) return h + emptyState('vacio-amigos', 'Aún no tienes amigos', 'Añádelos para poder retarlos.', '<button class="btn btn-primary" onclick="SEQDuels.open(\'friends\')">Añadir amigos</button>');
    if (S.pickKind === 'duel') {
      // Duelo en directo: los dos tienen que estar a la vez. Solo se puede retar a quien está en línea ahora mismo.
      var on = fl.friends.filter(isOnline), off = fl.friends.filter(function (f) { return !isOnline(f); });
      h += '<h3 class="seq-d-h3">En línea (' + num(on.length) + ')</h3>';
      h += on.length ? '<div class="history-list">' + on.map(function (f) {
        var p = player(f.player);
        return '<div class="history-item seq-d-row seq-pl-row" onclick="SEQDuels.create(\'' + p.id + '\')">' + who(p, '<span class="seq-d-on">● En línea</span>') + '<div class="history-item-score">Retar ›</div></div>';
      }).join('') + '</div>' : '<p class="stats-section-sub">No tienes amigos en línea. Prueba con un Reto.</p><button class="btn btn-secondary" onclick="SEQDuels.open(\'retos\')">' + ico('retos') + 'Ir a Retos</button>';
      if (off.length) h += '<h3 class="seq-d-h3">Sin conexión (' + num(off.length) + ')</h3><div class="history-list">' + off.map(function (f) {
        return '<div class="history-item seq-d-row seq-pl-row seq-d-off" aria-disabled="true">' + who(player(f.player), 'Sin conexión') + '</div>';
      }).join('') + '</div>';
      return h;
    }
    return h + '<div class="history-list">' + fl.friends.map(function (f) {
      var p = player(f.player);
      return '<div class="history-item seq-d-row seq-pl-row" onclick="SEQDuels.create(\'' + p.id + '\')">' + who(p) + '<div class="history-item-score">Retar ›</div></div>';
    }).join('') + '</div>';
  }
  function renderFriends() {
    var fl = S.lists.friends, me = session() || {}, f = features();
    var h = header('Amigos', 'Añade amigos y rétalos', back);
    h += '<div class="seq-d-search"><input type="text" id="seq-d-q" maxlength="24" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" placeholder="Nombre o ID de tu amigo" onkeydown="if(event.key===\'Enter\')SEQDuels.doSearch()" /><button class="btn btn-primary" onclick="SEQDuels.doSearch()">Buscar</button></div>';
    if (S.search.results) {
      h += S.search.results.length ? '<div class="history-list">' + S.search.results.map(function (x) {
        var p = player(x);
        return '<div class="history-item seq-pl-row">' + '<div class="seq-pl-tap" onclick="SEQProfile.open(\'' + p.id + '\')">' + who(p, p.id) + '</div>' + '<div class="seq-pl-act"><button class="btn btn-primary seq-d-sm" onclick="SEQDuels.friendAdd(\'' + p.id + '\')">Añadir</button></div></div>';
      }).join('') + '</div>' : '<p class="stats-section-sub">' + (S.search.hidden ? 'Ya es tu amigo. Sir Edwards aprueba la elección.' : 'No se ha encontrado a nadie.') + '</p>';
    }
    if (!fl) return h + '<p class="stats-section-sub">Cargando…</p>';
    if (fl.incoming.length) {
      h += '<h3 class="seq-d-h3">Solicitudes recibidas</h3><div class="history-list">' + fl.incoming.map(function (x) {
        var p = player(x.player), fid = safeId(x.friendship_id);
        return '<div class="history-item seq-pl-row">' + '<div class="seq-pl-tap" onclick="SEQProfile.open(\'' + p.id + '\')">' + who(p) + '</div>' + '<div class="seq-pl-act seq-pl-act-full"><button class="btn btn-primary seq-d-sm" onclick="SEQDuels.friendResp(\'' + fid + '\',\'accept\')">Aceptar</button> <button class="btn btn-secondary seq-d-sm" onclick="SEQDuels.friendResp(\'' + fid + '\',\'reject\')">Rechazar</button></div></div>';
      }).join('') + '</div>';
    }
    if (fl.outgoing.length) {
      h += '<h3 class="seq-d-h3">Solicitudes enviadas</h3><div class="history-list">' + fl.outgoing.map(function (x) {
        var p = player(x.player), fid = safeId(x.friendship_id);
        return '<div class="history-item seq-pl-row">' + '<div class="seq-pl-tap" onclick="SEQProfile.open(\'' + p.id + '\')">' + who(p, 'pendiente') + '</div>' + '<div class="seq-pl-act"><button class="btn btn-secondary seq-d-sm" onclick="SEQDuels.friendResp(\'' + fid + '\',\'cancel\')">Cancelar</button></div></div>';
      }).join('') + '</div>';
    }
    if (!fl.friends.length) return h + emptyState('vacio-amigos', 'Sin amigos todavía', 'Búscalos por su nombre o ID.');
    h += '<h3 class="seq-d-h3">Mis amigos</h3>';
    return h + '<div class="history-list">' + fl.friends.map(function (x) {
      var p = player(x.player), b = '', on = isOnline(x);
      if (f.classic_duel) b += on ? '<button class="btn btn-primary seq-d-sm" title="Duelo online" aria-label="Duelo online" onclick="SEQDuels.quick(\'duel\',\'' + p.id + '\')">' + ico('duelo') + '</button> '
        : '<button class="btn btn-primary seq-d-sm" disabled title="Sin conexión: solo puedes retar a duelo a quien esté en línea" aria-label="Duelo online (sin conexión)">' + ico('duelo') + '</button> ';
      if (f.async_challenges) b += '<button class="btn btn-secondary seq-d-sm" title="Reto" aria-label="Reto" onclick="SEQDuels.quick(\'reto\',\'' + p.id + '\')">' + ico('retos') + '</button>';
      return '<div class="history-item seq-pl-row">' + '<div class="seq-pl-tap" onclick="SEQProfile.open(\'' + p.id + '\')">' + who(p, x.online === true ? '<span class="seq-d-on">● En línea</span>' : '') + '</div>' + '<div class="seq-pl-act">' + b + '</div></div>';
    }).join('') + '</div>';
  }
  function renderLogros() {
    var d = S.lists.logros;
    var h = header('Logros de duelo', 'Verificados por el servidor', back);
    h += '<p class="stats-section-sub">Se calculan en el servidor a partir de tus duelos y retos terminados. Los logros de Duelo están en la pestaña Logros.</p>';
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    var st = d.stats || { online: {}, retos: {} };
    h += '<p class="history-item-sub seq-d-rival">Duelo online: ' + num(st.online.jugados) + (num(st.online.jugados) === 1 ? ' jugado' : ' jugados') + ' · ' + num(st.online.ganados) + (num(st.online.ganados) === 1 ? ' ganado' : ' ganados') + '. Retos: ' + num(st.retos.jugados) + (num(st.retos.jugados) === 1 ? ' jugado' : ' jugados') + ' · ' + num(st.retos.ganados) + (num(st.retos.ganados) === 1 ? ' ganado' : ' ganados') + '.</p>';
    return h + '<div class="history-list">' + (d.achievements || []).map(function (a) {
      var goal = num(a.goal) || 1, prog = Math.min(num(a.progress), goal);
      return '<div class="history-item seq-d-ach' + (a.unlocked === true ? ' seq-d-ach-on' : '') + '"><div class="seq-d-ach-icon">' + achIcon(a) + '</div><div class="seq-d-ach-body"><div class="history-item-info">' + esc(a.title) + '</div><div class="history-item-sub">' + esc(a.desc) + '</div>' +
        (goal > 1 && a.unlocked !== true ? '<div class="progress-bar seq-d-ach-bar"><div class="bar-fill" style="width:' + Math.round(prog / goal * 100) + '%"></div></div>' : '') +
        '</div><div class="history-item-score">' + (a.unlocked === true ? ico('correcto') : prog + '/' + goal) + '</div></div>';
    }).join('') + '</div>';
  }
  function quick(kind, id) { S.pickKind = kind === 'duel' ? 'duel' : 'reto'; create(id); }
  function renderRetoMode() {
    var rid = safeId(S.pickRival), fl = S.lists.friends, name = 'tu amigo', multi = !!(S.pickRivals && S.pickRivals.length);
    (fl && fl.friends || []).forEach(function (f) { var p = player(f.player); if (p.id === rid) name = p.name; });
    var h = header('Elige el modo', multi ? 'Reto todos contra todos · ' + (S.pickRivals.length + 1) + ' jugadores' : 'Reto a ' + name, backToList);
    h += multi ? '<p class="stats-section-sub">Todos jugaréis exactamente la misma partida. Solo aparecen los modos que todos tenéis desbloqueados.</p>' : '<p class="stats-section-sub">Los dos jugaréis exactamente la misma partida. Solo aparecen los modos que los dos tenéis desbloqueados.</p>';
    var list = S.lists.retoModes;
    if (!list) return h + '<p class="stats-section-sub">Cargando…</p>';
    return h + '<div class="history-list seq-d-modes">' + list.map(function (m) {
      // Solo ids conocidos (RETO_MODE_UI): nunca se pega en el onclick un texto arbitrario del servidor.
      var mid = m && Object.prototype.hasOwnProperty.call(RETO_MODE_UI, m.id) ? m.id : null, ui = mid ? RETO_MODE_UI[mid] : null; if (!ui) return '';
      var row = '<div class="seq-d-mode-icon">' + modeIco(ui) + '</div><div class="seq-d-mode-body"><div class="history-item-info">' + esc(mid === 'lucidez' && !lucOk() ? 'Modo secreto' : ui.nombre) + '</div>';
      if (mid === 'supervivencia') {
        if (!S.pickSurvival) return '<div class="history-item seq-d-row seq-d-mode seq-d-m-' + mid + '" onclick="SEQDuels.createReto(\'supervivencia\')">' + row + '</div><div class="history-item-score">Elegir ›</div></div>';
        return '<div class="history-item seq-d-mode seq-d-m-' + mid + '">' + row + '<div class="seq-d-levels">' + ['ameba', 'humano', 'derrame'].map(function (lv) {
          return '<button type="button" class="btn btn-secondary seq-d-sm" onclick="SEQDuels.createReto(\'supervivencia\',\'' + lv + '\')">' + esc(NIVEL_UI[lv]) + '</button>';
        }).join(' ') + '</div></div></div>';
      }
      return '<div class="history-item seq-d-row seq-d-mode seq-d-m-' + mid + '" onclick="SEQDuels.createReto(\'' + mid + '\')">' + row + '</div><div class="history-item-score">Retar ›</div></div>';
    }).join('') + '</div>';
  }

  // ---- Partida: la misma de un jugador + una capa discreta de duelo ---------------
  // Mismo esquema que #view-game (botón de salida, HUD .mode-header.game-hud con el
  // icono del modo a la izquierda, barra de progreso, .q-box, .choice-btn y
  // .feedback), pero con ids propios (seq-d-*): nunca los del motor local.
  // Deliberadamente NO se pinta nada del rival salvo su nombre y avatar: ni
  // aciertos, ni respuestas, ni si ya ha terminado. El resultado es sorpresa.
  function playScreen(kind, d, idx, qn, mine) {
    var p = d.tipo === 'reto_multi' ? { avatar: '', name: num((d.jugadores || []).length) + ' jugadores' } : player(d.rival);
    topbarShown(false);
    var h = '<div class="seq-d-toprow">' + (kind === 'duel' ? '<button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.leaveDuel()">← Duelo online</button>'
      : '<button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.open(\'retos\')">← Retos</button>') + '</div>';
    h += '<div id="seq-d-msg" class="feedback" style="display:none;"></div>';
    var lbl, extra = '', est = (d.yo && d.yo.estado) || {};
    // El icono del modo hace de título (como en los Retos y en los modos normales): sin espadas ni texto.
    if (kind === 'duel') lbl = '<span class="seq-d-hud-mode" title="Duelo clásico"><img class="seq-ico seq-d-mode-ico" src="assets/modes/emblema/duelo-clasico.webp" alt="" draggable="false"></span>' + (num(idx) + 1) + '/20';
    else {
      var m = retoMode(d), clock = d.modo === 'contrarreloj' || d.modo === 'calculo_mental' || d.modo === 'calculo_fondo';
      // Cabecera: el modo y, según el modo, por qué pregunta vas (x/total), la fase (Lucidez) o los aciertos (modos con reloj).
      // El icono del modo hace de título (el nombre ya no cabe en un móvil junto al reloj y las vidas).
      lbl = '<span class="seq-d-hud-mode" title="' + esc(m.nombre) + '">' + modeEmblem(m) + '</span>';
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
    h += '<div class="mode-header game-hud seq-d-hud seq-d-hud-reto"><span class="seq-d-hud-lbl">' + lbl + ' · </span>' +
      '<span class="seq-d-hud-right"><span class="seq-d-hud-time">' + ico('tiempo') + '<span id="seq-d-time"></span>s</span>' + extra + '</span>' +
      // El rival, en la misma línea: con el icono del modo en lugar de su nombre, cabe todo (progreso, segundos y rival).
      '<span class="seq-d-vs-chip" title="Tu rival">' + p.avatar + '<span class="seq-d-rival-name">' + p.name + '</span></span></div>';
    // 2.1: marcador en vivo del duelo clásico («TÚ 7 — 6 RIVAL», «Pregunta 9 / 20»). Solo cuenta preguntas ya resueltas.
    if (kind === 'duel' && window.SEQDuels21 && d.marcador) h += SEQDuels21.scoreboard(d, idx);
    h += '<div class="progress-bar"><div id="seq-d-bar" class="bar-fill"></div></div>';
    return h + questionBlock(d.id, idx, qn, mine, kind === 'reto' && d.modo === 'lucidez' && num(est.fase) === 2);
  }
  function updateNeeded() {
    return '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Hace falta actualizar</div>'
      + '<p class="duel-result-hint">Sir Edwards ha traído una pregunta que tu versión todavía no conoce. Cierra y vuelve a abrir la aplicación para ponerte al día.</p>'
      + '<button type="button" class="btn btn-primary" style="width:100%;" onclick="location.reload()">Actualizar</button></div>';
  }
  // `it` es lo que manda el servidor: el número de una pregunta tipo test (Duelo y Reto clásico) o, en los Retos
  // por modo, un cálculo, una pregunta de Lucidez o el enigma. `fade`: Fase II de Lucidez (el texto se esconde a los 3 s).
  function questionBlock(scope, idx, it, mine, fade) {
    var info = itemInfo(it);
    // Con `it` presente pero sin resolver: el servidor mandó una pregunta que esta versión no tiene (Worker ya
    // desplegado, PWA aún sin actualizar). No se queda «cargando» para siempre: se pide actualizar.
    if (!info) { S.shown = null; return it == null ? '<p class="stats-section-sub">Cargando pregunta…</p>' : updateNeeded(); }
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
      h += '<div class="seq-d-write" data-idx="' + num(idx) + '"><input type="text" id="seq-d-ans" class="seq-d-ans" maxlength="120" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Tu respuesta"' +
        (info.numeric ? ' inputmode="numeric" pattern="[0-9]*"' : '') + ' placeholder="' + (info.numeric ? 'Resultado' : 'Tu respuesta') + '"' +
        (mine ? ' disabled value="' + esc(String(mine.respuesta || '')) + '"' : ' onkeydown="if(event.key===\'Enter\')SEQDuels.answerText()"') + '>' +
        '<button type="button" class="btn btn-primary" id="seq-d-send"' + (mine ? ' disabled' : '') + ' onclick="SEQDuels.answerText()">Responder</button></div>';
    }
    // Veredicto ya conocido (al volver a pintar una pregunta respondida): mismo
    // .feedback que la partida normal, sin volver a sonar.
    var sol = info.a != null ? info.a : (mine && mine.pregunta && mine.pregunta.respuesta);
    if (mine) h += '<div id="seq-d-verdict" class="feedback seq-d-feedback ' + (mine.es_correcta ? 'ok' : 'bad') + '" aria-live="polite" style="display:block;">' +
      (mine.es_correcta ? ico('correcto') + esc(verdictText(true, (S.id || '') + ':' + String(sol))) : ico('incorrecto') + esc(verdictText(false, (S.id || '') + ':' + String(sol))) + (sol != null ? '<b>' + esc(String(sol)) + '</b>' : '')) + '</div>';
    else h += '<div id="seq-d-verdict" class="feedback seq-d-feedback" aria-live="polite" style="display:none;"></div>';
    return h;
  }
  // Frase de Sir Edwards para el final de la partida (solo si se jugó entera: no en abandonos ni «no jugado»).
  // Rota con bolsa (no repite ninguna hasta agotar el grupo) y es estable para la misma partida: no cambia al repintar.
  function resultPhrase(d, r) {
    if (!r || !window.SEQDuelPhrases) return '';
    var res = r.ganador === 'yo' ? 'win' : r.ganador === 'rival' ? 'loss' : 'draw';
    // 2.2: los duelos que no se jugaron hasta el final también llevan su frase (una bolsa por situación).
    if (d.motivo_fin === 'abandono') return SEQDuelPhrases.pickForfeit(d.yo && d.yo.abandonado ? 'yo_abandono' : 'rival_abandono', player(d.rival).name, S.id || d.id);
    if (d.motivo_fin === 'no_jugado') return SEQDuelPhrases.pickForfeit(res === 'win' ? 'rival_no_jugo' : 'yo_no_jugue', player(d.rival).name, S.id || d.id);
    if (d.motivo_fin && d.motivo_fin !== 'normal') return '';
    // 2.5: si la serie contra este rival da pie (racha, revancha cobrada, igualados…), manda la frase con contexto.
    if (window.SEQRivalry) { var rp = SEQRivalry.phrase(r.serie, res, player(d.rival).name, d.id); if (rp) return rp; }
    return SEQDuelPhrases.pickRotating(res, num(r.mi_puntuacion) - num(r.puntuacion_rival), S.id || d.id, player(d.rival).name);
  }
  // Marca de cada respuesta en el repaso del duelo: acierto, fallo o sin responder (iconos ilustrados).
  // Segundos por pregunta del propio reto (los creados antes de la 2.0 tienen 15 s).
  function secsPerQ(d) { return Math.round((num(d && d.duracion_pregunta_ms) || 10000) / 1000); }
  function mark(a) { return a ? ico(a.es_correcta ? 'correcto' : 'incorrecto') : ico('tiempo'); }
  // 2.0: XP que concede el servidor por esta partida (10 por acierto; Cálculo Mental no da; nivel máximo no suma).
  function xpFor(kind, d, aciertos) {
    try {
      if (kind === 'reto' && (d.modo === 'calculo_mental' || d.modo === 'calculo_fondo')) return 0;
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
    // La XP llega a este dispositivo tras la sincronización: se repinta la tarjeta final por si ha subido el nivel.
    [4000, 9000].forEach(function (ms) { setTimeout(function () { if (S.screen === kind && S.id === (d && d.id) && S.data && S.data.estado === 'completado') render(); }, ms); });
  }
  // 2.3: jingle de victoria o derrota la PRIMERA vez que se ve el resultado de un duelo o reto (el empate no suena).
  // Se recuerdan los últimos resultados oídos para que reabrir uno viejo desde el historial no vuelva a sonar.
  function resultSoundOnce(kind, d, res) {
    try {
      if (res === 'draw' || !d || !d.id || typeof playSound !== 'function') return;
      if (window.SEQResultHeard && !SEQResultHeard.first(kind + ':' + d.id)) return;
      playSound(res === 'win' ? 'win' : 'lose');
    } catch (e) {}
  }
  function xpChipHtml(xp) {
    return xp > 0 ? '<span class="result-chip"><span class="result-chip-value">+' + xp + '</span><span class="result-chip-label">XP</span></span>' : '';
  }
  // Logros que ha desbloqueado ESTE duelo o reto: la misma lista que en la tarjeta final de Jugar. Los que dan
  // recompensa llevan además el aviso flotante (src/ui/reward-toast.js), que lo lanza registerOnlineDuelResult.
  function medalsBlock(key) {
    var ids = (S.newMedals && S.newMedals[key]) || [];
    if (!ids.length || typeof ALL_MEDALS === 'undefined') return '';
    var rows = ids.map(function (id) {
      var m = null; for (var i = 0; i < ALL_MEDALS.length; i++) if (ALL_MEDALS[i].id === id) { m = ALL_MEDALS[i]; break; }
      if (!m) return '';
      var icon = ''; try { icon = window.SEQAchievements ? SEQAchievements.iconHTML(m) : ''; } catch (e) {}
      var frag = false, av = false;
      try { frag = FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1; } catch (e) {}
      try { av = !!getMedalAvatar(m.id); } catch (e) {}
      return '<div class="session-medal-item"><div class="session-medal-icon' + (icon ? ' has-img' : '') + '">' + icon + '</div><div>' +
        '<div class="session-medal-info">' + esc(m.title) + '</div><div class="session-medal-desc">' + esc(m.desc) + '</div>' +
        (frag ? '<div class="session-medal-fragment">' + ico('fragmento') + '+1 Fragmento de Mente</div>' : '') +
        (av ? '<div class="session-medal-fragment">Avatar desbloqueado</div>' : '') + '</div></div>';
    }).join('');
    if (!rows) return '';
    return '<div class="session-medals-box" style="display:block;"><div class="session-medals-title">' + ico('copa') + (ids.length === 1 ? '¡Logro desbloqueado!' : '¡Logros desbloqueados!') + '</div><div class="session-medals-list">' + rows + '</div></div>';
  }
  // 2.5: marcador de la serie «Edu 2 – 4 Bruno» y las últimas partidas (V/D/E), solo desde el 2.º duelo entre los dos.
  function serieHtml(serie, rivalName) {
    var sm = window.SEQRivalry ? SEQRivalry.summary(serie) : null;
    if (!sm) return '';
    var me = (session() || {}).display_name || 'Tú';
    return window.SEQRivalry.html(sm, me, rivalName, esc);
  }
  function resultBlock(d, kind) {
    var r = d.resultado, p = player(d.rival);
    // Nombre en bruto: `p.name` ya viene escapado y los textos se escapan una sola vez al insertarlos.
    var rawName = String((d.rival && d.rival.display_name) || 'Jugador').slice(0, 24);
    var nk = kind === 'duel' ? 'duelo' : 'reto';
    if (!r) {
      var why = { rechazado: rawName + ' ha rechazado el ' + nk + '. Prudencia, dicen.', expirado: 'Se acabó el plazo y nadie jugó. Un ' + nk + ' muy pacífico.', cancelado: d.motivo_fin === 'sin_listos' ? 'Ninguno marcó «Listo» a tiempo. Dos valientes, cero iniciativa.' : (kind === 'duel' ? 'Duelo' : 'Reto') + ' cancelado. Aquí no ha pasado nada.' }[d.estado] || '';
      return '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + esc(ESTADO[d.estado] || '') + '</div><p class="duel-result-hint">' + esc(why) + '</p></div>';
    }
    var res = r.ganador === 'yo' ? 'win' : r.ganador === 'rival' ? 'loss' : 'draw';
    resultSoundOnce(kind, d, res);
    var cls = res === 'win' ? 'duel-result-win' : res === 'loss' ? 'duel-result-loss' : 'duel-result-draw';
    var note = d.motivo_fin === 'abandono' ? (d.yo && d.yo.abandonado ? 'Perdiste por abandono (más de 60 s sin conexión).' : rawName + ' abandonó la partida.')
      : d.motivo_fin === 'no_jugado' ? (res === 'win' ? rawName + ' no jugó a tiempo.' : 'No jugaste a tiempo.') : '';
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
    var charKey = res === 'win' ? 'victory' : res === 'loss' ? 'defeat' : 'empate';
    var stakes = kind === 'duel' && d.modo === 'stakes';
    var title = kind === 'duel' ? (stakes ? 'Duelo por apuestas' : 'Duelo clásico') : 'Reto · ' + retoModeName(d);
    var diffWord = d.modo === 'muerte_subita' ? (diff === 1 ? 'pregunta de diferencia' : 'preguntas de diferencia') : (diff === 1 ? 'acierto de diferencia' : 'aciertos de diferencia');
    // Marcador «cara a cara»: tu avatar, tu puntuación y tu nombre contra los del rival, con un VS en medio.
    // Gana el dorado quien ganó (los dos, si es empate); el otro queda algo más apagado.
    var side = function (av, name, val, cls, win) {
      return '<div class="seq-d-pv ' + cls + (win ? ' w' : ' l') + '"><div class="seq-d-pv-av">' + av + '</div><div class="seq-d-pv-num">' + val + '</div><div class="seq-d-pv-name">' + esc(name) + '</div></div>';
    };
    // La XP son 10 por ACIERTO (no por puntos): en apuestas se cuentan los aciertos reales, no el marcador.
    var hits = stakes ? (d.yo.respuestas || []).filter(function (a) { return a.es_correcta; }).length : mine;
    var xpGain = xpFor(kind, d, hits); syncXpOnce(kind, d, xpGain);
    var eloHtml = (kind === 'duel' || kind === 'reto') && r.elo && window.SEQDuels21 ? SEQDuels21.eloBlock(r.elo) : '';
    var chips = '<div class="results-mode-chips show">' + (res === 'draw' ? '' : '<span class="result-chip"><span class="result-chip-icon">' + ico(res === 'win' ? 'copa' : 'duelo') + '</span><span class="result-chip-value">' + (res === 'win' ? '+' : '−') + diff + '</span><span class="result-chip-label">' + diffWord + '</span></span>') + xpChipHtml(xpGain) + '</div>';
    var stamp = ({ win: ['VICTORIA', 'gold'], loss: ['DERROTA', 'fail'], draw: ['EMPATE', 'ok'] })[res];
    var h = '<div class="results-card seq-d-results seq-d-final duel-result-box ' + cls + '" data-tier="' + (res === 'win' ? 'oro' : res === 'loss' ? 'derrota' : 'azul') + '">' +
      '<div class="results-character show char-' + (res === 'draw' ? 'neutral' : charKey) + '" aria-hidden="true"><picture><source srcset="assets/character/' + charKey + '.webp" type="image/webp"><img src="assets/character/' + charKey + '.webp" alt="" draggable="false"></picture></div>' +
      '<h3 class="seq-d-res-title">' + esc(title) + '</h3>' +
      ((xpGain > 0 && window.SEQLevelUp) ? SEQLevelUp.htmlFor(kind + ':' + (S.id || d.id)) : '') +
      '<div class="seq-d-pv-grid">' + side(avatar(me.avatar), me.display_name || 'Tú', mine, 'seq-d-pv-me', res !== 'loss') + '<span class="seq-d-pv-vs">VS</span>' + side(p.avatar, (d.rival || {}).display_name || 'Jugador', his, 'seq-d-pv-rival', res !== 'win') + '</div>' +
      '<div class="results-phrase-container ' + (res === 'win' ? 'tone-win' : res === 'loss' ? 'tone-fail' : 'tone-bien') + '">' +
      '<div class="results-mood-icon has-img"><img class="mood-img" src="' + moodSrc + '" alt="" draggable="false"></div>' +
      '<div class="results-category-title">' + esc(cat) + '</div>' +
      (phrase ? '<div class="results-phrase duel-result-phrase">' + esc(phrase) + '</div>' : '') +
      (note ? '<p class="duel-result-hint">' + esc(note) + '</p>' : '') + serieHtml(r.serie, rawName) + '</div>' +
      (eloHtml || chips) +
      '<div class="results-lucidez-stamp show"><span class="stamp-badge tone-' + stamp[1] + '">' + stamp[0] + '</span></div>';
    var hEnd = '</div>';
    h += medalsBlock(playKey(kind, S.id || d.id));
    if (d.estado === 'completado') {
      h += '<div class="results-actions"><button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="SEQDuels.' + (kind === 'duel' ? 'duelAction' : 'retoAction') + '(\'rematch\')">' + ico('revancha') + 'Revancha</button>';
      // «Compartir» discreto, como en solitario; gana presencia cuando hay algo que presumir (una victoria).
      h += '<button class="btn btn-share' + (res === 'win' ? '' : ' btn-share-quiet') + '" onclick="SEQDuels.shareResult()">' + ico('compartir') + 'Compartir resultado</button>';
      h += '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.back()">' + (kind === 'duel' ? 'Volver a Duelos' : 'Volver a Retos') + '</button></div>';
    }
    return h + hEnd;
  }
  function renderDuel() {
    var d = S.data;
    var h = gameHeader('', 'SEQDuels.leaveDuel()');
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    var p = player(d.rival), now = serverNow();
    h += '<p class="stats-section-sub seq-d-vs">Tú contra ' + p.avatar + ' ' + p.name + '</p>';
    if (d.estado === 'pendiente') {
      if (d.soy === 'rival') return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + p.name + ' te reta a un duelo</div><p class="duel-result-hint">Caduca en <span id="seq-d-count"></span></p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.duelAction(\'accept\')">Aceptar</button> <button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.duelAction(\'reject\')">Rechazar</button></div>';
      return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Esperando a que ' + p.name + ' acepte…</div><p class="duel-result-hint">Caduca en <span id="seq-d-count"></span></p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.duelAction(\'cancel\')">Cancelar</button></div>';
    }
    if (d.estado === 'aceptado') {
      return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Sala de espera</div><p class="duel-result-hint">Tú: ' + (d.yo.listo ? ico('correcto') + 'listo' : ico('mediocre')) + ' · ' + p.name + ': ' + (d.rival_estado.listo ? ico('correcto') + 'listo' : ico('mediocre')) + '</p><p class="duel-result-hint">Listos en <span id="seq-d-count"></span> s</p>' + (d.yo.listo ? '' : '<button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.duelAction(\'ready\')">¡Listo!</button>') + '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.duelAction(\'cancel\')">Salir</button></div>';
    }
    if (d.estado === 'en_curso') {
      var t0 = num(d.t0);
      if (now < t0 && d.modo !== 'stakes') { S.shown = null; return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Empieza en <span id="seq-d-count"></span>…</div></div>'; }
      if (d.modo === 'stakes' && window.SEQMultiStakes && window.SEQMulti) { S.shown = null; return SEQMultiStakes.playDuel(d, HELPERS); }
      if (d.modo === 'stakes' && window.SEQDuels21) { S.shown = null; return SEQDuels21.play(d, HELPERS); }
      var k = classicWin(d, now).k; S.lastIdx = k;
      if (d.yo.completado && d.modo !== 'stakes') { S.shown = null; return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Has terminado. Nadie ha aplaudido.</div><p class="duel-result-hint">Esperando a que acabe ' + p.name + '…</p></div>'; }
      // Si el servidor aún no ha revelado la pregunta k (los datos son de
      // antes de que se abriera), no se pinta nada respondible: se espera.
      if (!d.preguntas || d.preguntas.length <= k) { S.shown = null; return h + '<p class="stats-section-sub">Cargando pregunta…</p>'; }
      var mine = null; (d.yo.respuestas || []).forEach(function (a) { if (num(a.indice) === k) mine = a; });
      return playScreen('duel', d, k, d.preguntas[k], mine) + (mine ? '<p class="stats-section-sub seq-d-next">Siguiente pregunta en cuanto responda ' + p.name + ' o acabe el tiempo.</p>' : '');
    }
    S.shown = null;
    return h + resultBlock(d, 'duel');
  }
  function renderReto() {
    var d = S.data;
    var h = gameHeader(ico('retos') + (S.isMulti ? 'Reto todos contra todos' : 'Reto'), "SEQDuels.open('retos')");
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    if (S.isMulti) {
      var mh = window.SEQMulti ? SEQMulti.renderMReto(d, HELPERS, h) : '';
      if (mh !== null) { S.shown = null; return mh; }
      return d.yo.actual ? playScreen('reto', d, d.yo.actual.indice, d.yo.actual.pregunta, null) : h + '<p class="stats-section-sub">Cargando…</p>';
    }
    var p = player(d.rival), now = serverNow();
    h += '<p class="stats-section-sub seq-d-vs">Tú contra ' + p.avatar + ' ' + p.name + '</p>';
    if (d.estado !== 'completado') h += '<p class="seq-d-mode-line">' + modeIco(retoMode(d)) + '<b>' + esc(retoModeName(d)) + '</b></p>';
    S.shown = null;
    if (d.estado === 'pendiente') {
      var cad = left(num(d.expira_at) - now);
      if (d.soy === 'rival') return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + p.name + ' te ha retado</div><p class="duel-result-hint">Caduca en ' + esc(cad) + '.</p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.retoAction(\'accept\')">Aceptar</button> <button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.retoAction(\'reject\')">Rechazar</button></div>';
      return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Esperando a que ' + p.name + ' acepte</div><p class="duel-result-hint">Caduca en ' + esc(cad) + '.</p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.retoAction(\'cancel\')">Cancelar reto</button></div>';
    }
    if (d.estado === 'aceptado') {
      var y = d.yo, rv = d.rival_estado;
      var rs = '<p class="history-item-sub seq-d-rival">' + p.avatar + ' ' + p.name + ': ' + (rv.terminado ? 'ya ha jugado (verás su marca al terminar tú)' : rv.empezado ? 'jugando…' : 'aún no ha jugado') + '</p>';
      if (y.terminado) { try { if (window.SEQRetoFX) SEQRetoFX.onFinished(d); } catch (e) {} syncXpOnce('reto', d, xpFor('reto', d, y.aciertos)); return h + rs + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Tu parte está hecha: ' + num(y.aciertos) + (d.modo && d.modo !== 'estandar' ? (num(y.aciertos) === 1 ? ' acierto' : ' aciertos') : '/' + num(d.n_preguntas || 20)) + '</div><p class="duel-result-hint">' + (xpFor('reto', d, y.aciertos) ? '+' + xpFor('reto', d, y.aciertos) + ' XP ya en tu cuenta. ' : '') + 'Cuando ' + p.name + ' juegue verás el resultado. Plazo: ' + esc(left(num(d.expira_at) - now)) + '.</p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.reload()">Actualizar</button></div>' }
      if (!y.empezado) return h + rs + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Tu turno, aspirante.</div><p class="duel-result-hint">Te quedan ' + esc(left(num(d.expira_at) - now)) + ' para jugar tu parte. Una vez empieces, no hay pausa.</p><button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.retoAction(\'start\')">Jugar mi parte</button></div>';
      if (!y.actual) return h + '<p class="stats-section-sub">Cargando…</p>';
      try { if (window.SEQRetoFX) SEQRetoFX.onQuestion(d); } catch (e) {}
      return playScreen('reto', d, y.actual.indice, y.actual.pregunta, null);
    }
    try { if (window.SEQRetoFX) SEQRetoFX.onFinished(d); } catch (e) {}
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
      else if (S.screen === 'pickkind' || S.screen === 'multipick' || S.screen === 'multi') h = window.SEQMulti ? SEQMulti.render(S.screen, HELPERS) : '';
      else if (S.screen === 'reto') h = renderReto();
      else if (S.screen === 'logros') h = renderLogros();
      else if (S.screen === 'rankings') h = window.SEQDuels21 ? SEQDuels21.renderRankings() : '';
      else if (S.screen === 'profile') h = window.SEQProfile ? SEQProfile.render() : '';
    } catch (e) { S.shown = null; h = header('Duelos', '', back) + emptyImg('error') + '<p class="stats-section-sub">No se pudo mostrar esta pantalla.</p>'; }
    // Un repintado (al llegar datos del servidor) no debe borrar lo que el
    // usuario está escribiendo en la búsqueda ni quitarle el foco.
    var d = S.data, playing = !!(d && (((S.screen === 'duel' || S.screen === 'multi') && d.estado === 'en_curso' && !(d.yo && d.yo.completado)) ||
      (S.screen === 'reto' && d.estado === 'aceptado' && d.yo && d.yo.empezado && !d.yo.terminado)));
    root.classList.toggle('seq-d-playing', playing);
    // El final de un Duelo o un Reto lleva el mismo marco de color que la partida (como las tarjetas finales de cada modo).
    root.classList.toggle('seq-d-final-on', !!(d && (S.screen === 'duel' || S.screen === 'reto' || S.screen === 'multi') && d.estado === 'completado'));
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
    if (S.screen === 'duel' || S.screen === 'reto' || S.screen === 'multi') load();
  }
  // Auditoría 4 (14): al salir de la pestaña Duelo o ocultar la app se paran sondeo, ticker y sonido de urgencia. Se retoman
  // con onShow()/visibilitychange (load() vuelve a programar todo). El servidor sigue contando el latido: 60 s fuera = ausencia.
  function onHide() { clearTimeout(S.pollT); S.pollT = null; clearInterval(S.tickT); S.tickT = null; urgencyStop(); }
  // ¿Hay una partida en directo a la vista o en marcha? (para no pisarla al abrir un aviso)
  function isLive() { var d = S.data; return !!(d && (S.screen === 'duel' || S.screen === 'multi') && (d.estado === 'en_curso' || d.estado === 'aceptado') && S.tickT); }
  // Auditoría 4 (17): abre Duelo y ejecuta fn solo si la pestaña se mostró de verdad (puede estar bloqueada por la intro) y, si hay un
  // duelo en directo, tras confirmarlo (abrir otra pantalla detiene su sondeo y latido y a los 60 s cuenta como abandono).
  function openGuarded(fn) {
    function go() {
      try { if (typeof switchTab === 'function') switchTab('duelo'); } catch (e) { return; }
      var v = document.getElementById('view-duelo');
      if (v && v.classList.contains('active')) fn();
    }
    if (isLive() && typeof showAppConfirm === 'function') {
      showAppConfirm({ title: 'Duelo en marcha', message: 'Tienes un duelo en directo. Si lo dejas ahora, puedes perderlo por abandono.', confirmLabel: 'Dejarlo', onConfirm: go });
      return;
    }
    go();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { clearInterval(S.tickT); S.tickT = null; urgencyStop(); }
    if (document.visibilityState === 'visible' && (S.screen === 'duel' || S.screen === 'reto' || S.screen === 'multi')) load();
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
      if ((S.screen === 'multi' || S.isMulti) && window.SEQMulti && r && d.estado === 'completado') { var mi = SEQMulti.shareInput(d, HELPERS), sess0 = session(), mt = SEQMulti.shareText(d);
        if (mi && typeof shareResultImage === 'function' && window.SEQShareCard) {
          shareResultImage({ input: { online: mi, player: sess0 ? { name: sess0.display_name, avatar: sess0.avatar } : null }, text: SEQShareCard.shareText({ online: mi }) }).then(function (ok) { if (!ok && mt && typeof shareResultAsText === 'function') shareResultAsText(mt); });
        } else if (mt && typeof shareResultAsText === 'function') shareResultAsText(mt);
        return; }
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

  // Para src/online/duels-v21.js: mismos helpers de pintado y cliente HTTP, sin duplicarlos.
  var HELPERS = {
    esc: esc, num: num, player: player, itemInfo: itemInfo, optionsFor: optionsFor, ico: ico, serverNow: serverNow,
    call: call, say: say, errText: errText, header: header, back: function () { back(); }, updateNeeded: updateNeeded,
    // 2.4 (src/online/multi-duels.js)
    S: S, safeId: safeId, who: who, isOnline: isOnline, left: left, clock: clock, features: features, session: session,
    avatar: avatar, questionBlock: questionBlock, classicWin: classicWin, gameHeader: gameHeader, topbarShown: topbarShown,
    emptyState: emptyState, open: function (a, b) { open(a, b); }, refresh: function () { return refreshSummary(); },
    resultSoundOnce: resultSoundOnce, xpFor: xpFor, syncXpOnce: syncXpOnce, xpChipHtml: xpChipHtml, medalsBlock: medalsBlock, act: act,
    modeLine: function (d) { return '<p class="seq-d-mode-line">' + modeIco(retoMode(d)) + '<b>' + esc(retoModeName(d)) + '</b></p>'; }, retoModeName: retoModeName,
    render: function () { render(); }, pick1v1: function (k, m) { if (m === undefined && k !== 'reto' && k !== 'duel') { m = k; k = 'duel'; } pick1v1(k || 'duel', m); }, pickModeMulti: pickModeMulti, backToList: backToList,
    apply: function (d) { S.gotSeq = ++S.reqSeq; S.offset = num(d.server_now) - Date.now(); S.data = d; render(); schedule(); }
  };
  window.SEQDuels = {
    shareResult: shareResultCard, leaveDuel: leaveDuel, answerText: answerText, createReto: createReto, pickMode: pickMode,
    open: open, back: back, refreshSummary: refreshSummary, pick: pick, pick1v1: function (m) { pick1v1('duel', m); }, pickModeMulti: pickModeMulti, create: create, quick: quick,
    duelAction: duelAction, retoAction: retoAction, listAction: listAction, answer: answer,
    doSearch: doSearch, friendAdd: friendAdd, friendResp: friendResp, reload: load,
    onAccountChange: onAccountChange, onShow: onShow, onHide: onHide, isLive: isLive, openGuarded: openGuarded,
    syncHubTopbar: syncHubTopbar,
    _state: function () { return S; }, _h: HELPERS, rerender: function () { render(); },
  };
})();
