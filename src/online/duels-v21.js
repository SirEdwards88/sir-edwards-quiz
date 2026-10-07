// SirEdwards Quiz 2.1 — Duelos: Duelo por apuestas, ELO PvP, Rankings y estadísticas de Duelos.
//
// SOLO PRESENTACIÓN. El servidor decide preguntas, tiempos, apuestas, aciertos, puntuación, ELO y
// ganador; este archivo pinta lo que el servidor ya ha decidido y envía ENTRADAS (la clave de la
// apuesta y la respuesta elegida), nunca resultados. Lo que el servidor aún no debe revelar (la
// apuesta del rival, el acierto del rival, el resultado de la ronda en curso) ni llega en la
// respuesta: no hay nada que esconder aquí.
//
// Mismas reglas de pintado que src/online/duels.js: todo texto del servidor pasa por esc(), todo
// número por num(), y los ids/claves que van en atributos son siempre constantes de este archivo.
//
// Usa, en tiempo de ejecución: window.SEQDuels (helpers vía SEQDuels._h), SEQOnline, SEQAvatars.
// Los iconos son assets independientes (ver ICON_DIR); si falta el archivo se muestra el emoji.

(function () {
  'use strict';

  // ---- Catálogo (nombres EXACTOS y definitivos) -------------------------------------------------
  var STAKES = {
    cuerdo: { nombre: 'Cuerdo', valor: 1, emoji: '🧠' },
    osado: { nombre: 'Osado', valor: 2, emoji: '🎩' },
    insensato: { nombre: 'Insensato', valor: 3, emoji: '💀' }
  };
  var STAKE_ORDER = ['cuerdo', 'osado', 'insensato'];
  var MODES = {
    classic: { nombre: 'Duelo clásico', emoji: '⚔️', desc: '20 preguntas · 10 s cada una' },
    stakes: { nombre: 'Duelo por apuestas', emoji: '🎲', desc: '12 rondas · apuesta en secreto antes de cada pregunta' }
  };
  var RANK_EMOJI = { plebeyo_ilustrado: '🥉', caballero_del_dato: '🥈', erudito_de_salon: '🥇', lord_sabelotodo: '💎', sir_edwards: '👑' };
  // Cada icono es un archivo propio: assets/duelos/<grupo>/<id>.webp
  var ICON_DIR = 'assets/duelos/';
  var BOARDS = {
    pvp: { nombre: 'PvP', emoji: '⚔️', sub: 'Por ELO' },
    mental: { nombre: 'Cálculo Mental', emoji: '🧠', sub: 'Mejor puntuación' },
    timetrial: { nombre: 'Contrarreloj', emoji: '⏱️', sub: 'Mejor puntuación' }
  };
  var BOARD_ORDER = ['pvp', 'mental', 'timetrial'];
  var SCOPES = { friends: 'Amigos', global: 'Global' };

  var S21 = {
    scope: 'friends', board: 'pvp', rankings: {}, rankErr: '',
    stats: null, statsErr: '', statsAt: 0, statsOpen: false, statsLoading: false,
    sent: {},        // «<duelo>:<ronda>» → respuesta enviada (solo para marcarla en pantalla; no es un resultado)
    fetchedKey: ''   // evita pedir dos veces la misma frontera de tiempo
  };

  // ---- Utilidades -------------------------------------------------------------------------------
  function H() { return (window.SEQDuels && window.SEQDuels._h) || null; }
  function esc(s) { var h = H(); return h ? h.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v) { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; }
  function snum(v) { v = Math.round(Number(v)); return isFinite(v) ? v : 0; }
  function $(id) { return document.getElementById(id); }
  function secs(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
  function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
  function setBar(id, frac) { var el = $(id); if (el) el.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%'; }
  function fmt(n) { n = snum(n); return String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function signed(n) { n = snum(n); return (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(n === 0 ? 0 : n); }
  function stakeKey(k) { return Object.prototype.hasOwnProperty.call(STAKES, k) ? k : null; }
  function modeKey(m) { return m === 'stakes' ? 'stakes' : 'classic'; }

  // Icono ilustrado con emoji de respaldo si el archivo aún no existe.
  function icon(group, id, emoji, cls) {
    var e = String(emoji).replace(/[^\u0000-\uFFFF]|[<>"'&]/g, function (c) { return c; });
    return '<span class="seq-v21-ico ' + (cls || '') + '" aria-hidden="true"><img src="' + ICON_DIR + group + '/' + id + '.webp" alt="" draggable="false" ' +
      'onerror="this.parentNode.textContent=\'' + e + '\'"></span>';
  }
  function modeIcon(m) { m = modeKey(m); return icon('modos', m, MODES[m].emoji, 'seq-v21-ico-mode'); }
  // Medallón de «estadísticas de duelos» (libro de cuentas con pluma): assets/duelos/estadisticas.webp. Si falta, el del Duelo clásico.
  function statsIcon() {
    return '<span class="seq-v21-ico seq-v21-ico-stats" aria-hidden="true"><img src="' + ICON_DIR + 'estadisticas.webp" alt="" draggable="false" ' +
      'onerror="this.onerror=null;this.src=\'' + ICON_DIR + 'modos/classic.webp\'"></span>';
  }
  function stakeIcon(k) { k = stakeKey(k); return k ? icon('apuestas', k, STAKES[k].emoji, 'seq-v21-ico-stake') : ''; }
  function rankIcon(r, cls) {
    var id = r && RANK_EMOJI[r.icono] ? r.icono : 'plebeyo_ilustrado';
    return icon('rangos', id, RANK_EMOJI[id], 'seq-v21-ico-rank ' + (cls || ''));
  }
  function rankName(r) { return r && typeof r.nombre === 'string' ? r.nombre : 'Plebeyo Ilustrado'; }
  function stakeLabel(k) { k = stakeKey(k); return k ? stakeIcon(k) + '<b>' + STAKES[k].nombre + '</b>' : '<b>—</b>'; }

  // ---- Elección de modo (dentro de «Duelo online») ----------------------------------------------
  // Exactamente dos modos. Devuelve el HTML de las dos tarjetas (misma estructura que las de los modos normales:
  // .mode-card + .mode-card-icon.has-img + h3 + p, con el medallón grande); pick() lo gestiona duels.js.
  function modeButtons() {
    return '<div class="seq-v21-modes">' + ['classic', 'stakes'].map(function (m) {
      return '<div class="mode-card seq-v21-modecard seq-v21-modecard-' + m + '" role="button" tabindex="0" onclick="SEQDuels.pick(\'duel\',\'' + m + '\')" onkeydown="if(event.key===\'Enter\')SEQDuels.pick(\'duel\',\'' + m + '\')">' +
        '<div class="mode-card-icon has-img seq-v21-modecard-ico" aria-hidden="true"><img class="mode-img" src="' + ICON_DIR + 'modos/' + m + '.webp" alt="" draggable="false" onerror="this.parentNode.textContent=\'' + MODES[m].emoji + '\'"></div>' +
        '<div class="seq-v21-modecard-body"><h3>' + MODES[m].nombre + '</h3><p>' + MODES[m].desc + '</p></div></div>';
    }).join('') + '</div>';
  }
  function modeBadge(m) { m = modeKey(m); return '<span class="seq-v21-badge seq-v21-badge-' + m + '">' + modeIcon(m) + '<span>' + (m === 'stakes' ? 'Apuestas' : 'Clásico') + '</span></span>'; }

  // ---- Marcador y carta final -------------------------------------------------------------------
  // `idx` (opcional): índice de la pregunta que se está jugando (clásico); en apuestas lo da la ronda.
  function scoreboard(d, idx) {
    var m = d.marcador || {}, total = num(m.total) || num(d.n_preguntas);
    var isS = modeKey(d.modo) === 'stakes';
    var cur = Math.min(total, (d.ronda ? num(d.ronda.indice) : idx != null ? num(idx) : num(m.resueltas)) + 1);
    return '<div class="seq-v21-score" aria-live="polite"><span class="seq-v21-score-me"><small>TÚ</small><b>' + num(m.yo) + '</b></span>' +
      '<span class="seq-v21-score-sep">—</span><span class="seq-v21-score-rv"><b>' + num(m.rival) + '</b><small>RIVAL</small></span></div>' +
      '<div class="seq-v21-round">' + (isS ? 'Ronda ' : 'Pregunta ') + cur + ' / ' + total + '</div>';
  }
  // Carta final: SOLO el ELO antes → después, el cambio y el rango. Nada de apuestas ni rondas.
  function eloBlock(elo) {
    if (!elo) return '';
    var ch = snum(elo.cambio), cls = ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat';
    var h = '<div class="seq-v21-elo seq-v21-elo-' + cls + '"><div class="seq-v21-elo-label">ELO</div>' +
      '<div class="seq-v21-elo-line"><span>' + fmt(elo.antes) + '</span><span class="seq-v21-elo-arrow" aria-hidden="true">→</span><b>' + fmt(elo.despues) + '</b></div>' +
      '<div class="seq-v21-elo-change">' + signed(ch) + ' ELO</div>' +
      '<div class="seq-v21-elo-rank">' + rankIcon(elo.rango) + '<span>' + esc(rankName(elo.rango)) + '</span></div>';
    if (elo.en_colocacion) {
      var total = num(elo.colocacion_total) || 5;
      h += '<div class="seq-v21-place">En colocación · ' + Math.min(total, num(elo.partidas_colocacion)) + '/' + total + '</div>';
    }
    return h + '</div>';
  }

  // ---- Partida por apuestas ---------------------------------------------------------------------
  // `h` = helpers de duels.js (esc, player, itemInfo, optionsFor, ico, serverNow…).
  function stakeButtons(d, locked) {
    var mine = d.ronda && stakeKey(d.ronda.mi_apuesta);
    return '<div class="seq-v21-stakes" role="group" aria-label="Elige tu apuesta">' + STAKE_ORDER.map(function (k) {
      var st = STAKES[k], sel = mine === k;
      return '<button type="button" class="seq-v21-stake seq-v21-stake-' + k + (sel ? ' sel' : '') + '"' + (locked ? ' disabled' : '') + ' onclick="SEQDuels21.stake(\'' + k + '\')">' +
        stakeIcon(k) + '<span class="seq-v21-stake-name">' + st.nombre + '</span>' +
        '<span class="seq-v21-stake-val"><i>+' + st.valor + '</i><i>−' + st.valor + '</i></span></button>';
    }).join('') + '</div>';
  }
  function vsStakes(d) {
    var r = d.ronda || {}, me = stakeKey(r.mi_apuesta), rv = stakeKey(r.apuesta_rival);
    return '<div class="seq-v21-reveal"><div class="seq-v21-reveal-side"><small>Tú</small>' + stakeLabel(me) + '</div><span class="seq-v21-reveal-vs">vs</span>' +
      '<div class="seq-v21-reveal-side"><small>Rival</small>' + stakeLabel(rv) + '</div></div>';
  }
  // Resumen de la ronda ya resuelta (revelado de aciertos y apuestas de los dos).
  function resolvedLine(d) {
    var list = d.rondas_resueltas || [], r = list[list.length - 1];
    if (!r) return '';
    var okMe = !!r.mi_correcta, okRv = !!r.rival_correcta, h = H();
    var ico = function (ok) { return h ? h.ico(ok ? 'correcto' : 'incorrecto') : (ok ? '✓' : '✗'); };
    return '<div class="seq-v21-resolved"><div class="seq-v21-res-row ' + (okMe ? 'ok' : 'bad') + '"><span>Tú</span>' + ico(okMe) + stakeLabel(stakeKey(r.mi_apuesta)) +
      '<b>' + (okMe ? '+' : '−') + (STAKES[stakeKey(r.mi_apuesta) || 'cuerdo'].valor) + '</b></div>' +
      '<div class="seq-v21-res-row ' + (okRv ? 'ok' : 'bad') + '"><span>Rival</span>' + ico(okRv) + stakeLabel(stakeKey(r.apuesta_rival)) +
      '<b>' + (okRv ? '+' : '−') + (STAKES[stakeKey(r.apuesta_rival) || 'cuerdo'].valor) + '</b></div></div>';
  }
  function questionHtml(d, h) {
    var r = d.ronda, idx = num(r.indice), qn = (d.preguntas || [])[idx];
    var info = qn != null ? h.itemInfo(qn) : null;
    if (!info || !info.options) return '<p class="stats-section-sub">Cargando pregunta…</p>';
    var sent = S21.sent[d.id + ':' + idx], answered = !!(r.yo_respondi || sent != null);
    var opts = h.optionsFor(d.id, idx, info);
    var out = '<div class="q-box seq-d-qbox"><span>' + h.esc(info.q) + '</span></div><div id="seq-v21-choices" class="seq-d-choices" role="group" aria-label="Opciones de respuesta" data-idx="' + idx + '">';
    out += opts.map(function (o, i) {
      var cls = 'choice-btn' + (sent != null && o === sent ? ' selected' : '');
      return '<button type="button" class="' + cls + '"' + (answered ? ' disabled' : '') + ' onclick="SEQDuels21.answer(' + i + ')">' + h.esc(String(o)) + '</button>';
    }).join('') + '</div>';
    // Sin veredicto: el resultado de la ronda se revela cuando se resuelve, no al responder.
    out += answered ? '<p class="stats-section-sub seq-v21-wait">Respuesta enviada. Esperando a que se resuelva la ronda…</p>' : '';
    return out;
  }
  function play(d, h) {
    h = h || H();
    var p = h.player(d.rival), r = d.ronda || null, fase = r ? r.fase : 'cuenta_atras';
    var out = '<div class="seq-d-toprow"><button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.leaveDuel()">← Duelo online</button></div>';
    out += '<div id="seq-d-msg" class="feedback" style="display:none;"></div>';
    out += '<div class="mode-header game-hud seq-d-hud seq-d-hud-reto seq-v21-hud"><span class="seq-d-hud-lbl"><span class="seq-d-hud-mode" title="Duelo por apuestas">' + modeIcon('stakes') + '</span></span>' +
      '<span class="seq-d-hud-right"><span class="seq-d-hud-time">' + h.ico('tiempo') + '<span id="seq-v21-time"></span>s</span></span>' +
      '<span class="seq-d-vs-chip" title="Tu rival">' + p.avatar + '<span class="seq-d-rival-name">' + p.name + '</span></span></div>';
    out += scoreboard(d);
    out += '<div class="progress-bar"><div id="seq-v21-bar" class="bar-fill"></div></div>';
    if (fase === 'cuenta_atras' || (!r && num(d.t0) > h.serverNow())) {
      return out + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Empieza en <span id="seq-v21-count"></span>…</div></div>';
    }
    if (fase === 'apuesta') {
      var locked = !!r.mi_apuesta;
      out += '<div class="seq-v21-prompt">' + (locked ? 'Apuesta bloqueada' : 'Elige tu apuesta en secreto') + '</div>' + stakeButtons(d, locked);
      out += locked ? '<p class="stats-section-sub seq-v21-wait">' + (r.rival_bloqueada ? 'Tu rival ya ha apostado. Revelando…' : 'Esperando la apuesta de tu rival…') + '</p>' + (r.mi_apuesta_auto ? '<p class="stats-section-sub">Se acabó el tiempo: Cuerdo, por prudencia.</p>' : '') : '';
      return out;
    }
    if (fase === 'revelando') {
      return out + '<div class="seq-v21-prompt">Las apuestas, sobre la mesa</div>' + vsStakes(d) + '<p class="stats-section-sub seq-v21-wait">La pregunta llega en <span id="seq-v21-count"></span>…</p>';
    }
    if (fase === 'pregunta') return out + vsStakes(d) + questionHtml(d, h);
    // resolución entre rondas: se revela quién acertó y con qué apuesta
    return out + '<div class="seq-v21-prompt">Resultado de la ronda</div>' + resolvedLine(d);
  }

  // Reloj de la partida por apuestas. Llamado cada 250 ms por duels.js; solo toca textContent/style.
  // Al cruzar cada frontera de tiempo pide el estado al servidor UNA vez (el servidor decide qué toca).
  function tick(d, now) {
    var r = d.ronda, boundary = null, total = 1, left = 0;
    if (!r) {
      if (num(d.t0) > now) { setText('seq-v21-count', String(secs(num(d.t0) - now))); }
      return;
    }
    if (r.fase === 'apuesta') { boundary = num(r.apuesta_cierra_at); total = 8000; left = boundary - now; setText('seq-v21-time', String(secs(left))); setBar('seq-v21-bar', left / total); }
    else if (r.fase === 'revelando') { boundary = num(r.pregunta_abre_at); setText('seq-v21-count', String(secs(boundary - now))); setBar('seq-v21-bar', 1); }
    else if (r.fase === 'pregunta') { boundary = num(r.pregunta_cierra_at) + 1100; total = 10000; left = num(r.pregunta_cierra_at) - now; setText('seq-v21-time', String(secs(left))); setBar('seq-v21-bar', left / total); }
    else { boundary = num(r.apuesta_abre_at); setBar('seq-v21-bar', 0); }
    if (boundary && now >= boundary) {
      var key = d.id + ':' + r.indice + ':' + r.fase;
      if (S21.fetchedKey !== key) { S21.fetchedKey = key; if (window.SEQDuels) window.SEQDuels.reload(); }
    }
  }

  function stake(key) {
    key = stakeKey(key); var h = H(), st = window.SEQDuels && window.SEQDuels._state();
    if (!key || !h || !st || !st.data || !st.data.ronda || st.data.ronda.fase !== 'apuesta' || st.data.ronda.mi_apuesta || st.sending) return;
    var d = st.data, idx = num(d.ronda.indice);
    st.sending = true;
    h.call('POST', '/duels/' + st.id + '/stake', { indice: idx, apuesta: key }).then(function () {
      st.sending = false; window.SEQDuels.reload();
    }).catch(function (e) { st.sending = false; h.say(h.errText(e), true); window.SEQDuels.reload(); });
  }
  function answer(optIdx) {
    var h = H(), st = window.SEQDuels && window.SEQDuels._state();
    if (!h || !st || !st.data || !st.data.ronda || st.data.ronda.fase !== 'pregunta' || st.sending) return;
    var d = st.data, idx = num(d.ronda.indice), info = h.itemInfo((d.preguntas || [])[idx]);
    if (!info || !info.options) return;
    var chosen = h.optionsFor(d.id, idx, info)[num(optIdx)]; if (chosen == null) return;
    var k = d.id + ':' + idx;
    if (S21.sent[k] != null) return;
    st.sending = true; S21.sent[k] = chosen;
    h.call('POST', '/duels/' + st.id + '/answer', { indice: idx, respuesta: chosen }).then(function () {
      st.sending = false; window.SEQDuels.reload();
    }).catch(function (e) { st.sending = false; delete S21.sent[k]; h.say(h.errText(e), true); window.SEQDuels.reload(); });
  }

  // ---- Rankings (pantalla propia dentro de Duelos): «el Salón de la Fama» ------------------------
  // Estructura: ámbito (Amigos | Global, selector de texto) → los tres rankings (medallones de una misma colección,
  // assets/duelos/rankings/<id>.webp: se sustituyen soltando un archivo con el mismo nombre) → «Tu posición» →
  // podio con los tres primeros (medallas de oro, plata y bronce) → resto de la clasificación.
  // Solo presentación: el orden, las posiciones y las puntuaciones vienen tal cual del servidor.
  var RK_ICON = { pvp: { id: 'pvp', emoji: '⚔️' }, mental: { id: 'mental', emoji: '🧠' }, timetrial: { id: 'timetrial', emoji: '⏱️' } };
  var PODIUM_MEDAL = { 1: 'oro', 2: 'plata', 3: 'bronce' };
  function rkIcon(k, cls) { var r = RK_ICON[k]; return r ? icon('rankings', r.id, r.emoji, 'seq-v21-ico-rk ' + (cls || '')) : ''; }
  function rankKey() { return S21.scope + ':' + S21.board; }
  function loadRankings() {
    var h = H(); if (!h) return Promise.resolve();
    var key = rankKey(), scope = S21.scope, board = S21.board;
    S21.rankErr = '';
    return h.call('GET', '/rankings?scope=' + scope + '&board=' + board).then(function (d) {
      S21.rankings[key] = d; if (window.SEQDuels._state().screen === 'rankings') window.SEQDuels.rerender();
    }).catch(function (e) {
      S21.rankErr = (e && e.status === 404) ? (scope === 'global' ? 'El ranking global todavía no está abierto. Mientras tanto, compite con tus amigos.' : 'Este ranking todavía no está disponible.') : h.errText(e);
      if (window.SEQDuels._state().screen === 'rankings') window.SEQDuels.rerender();
    });
  }
  function setScope(s) { if (SCOPES[s]) { S21.scope = s; loadRankings(); window.SEQDuels.rerender(); } }
  function setBoard(b) { if (BOARDS[b]) { S21.board = b; loadRankings(); window.SEQDuels.rerender(); } }
  // Ámbito: selector de dos posiciones, solo texto (los iconos los llevan los rankings; aquí serían ruido).
  function scopeTabs() {
    return '<div class="seq-v21-scope" role="tablist" aria-label="Ámbito">' + ['friends', 'global'].map(function (k) {
      var sel = k === S21.scope;
      return '<button type="button" role="tab" aria-selected="' + sel + '" class="seq-v21-scope-btn' + (sel ? ' sel' : '') + '" onclick="SEQDuels21.setScope(\'' + k + '\')">' + SCOPES[k] + '</button>';
    }).join('') + '</div>';
  }
  // Tipo de ranking: tres medallones (PvP / Cálculo Mental / Contrarreloj).
  function boardTabs() {
    return '<div class="seq-v21-boards" role="tablist" aria-label="Ranking">' + BOARD_ORDER.map(function (k) {
      var sel = k === S21.board;
      return '<button type="button" role="tab" aria-selected="' + sel + '" class="seq-v21-board-btn' + (sel ? ' sel' : '') + '" onclick="SEQDuels21.setBoard(\'' + k + '\')">' +
        rkIcon(k) + '<span>' + esc(BOARDS[k].nombre) + '</span></button>';
    }).join('') + '</div>';
  }
  function isPvp(b) { return b === 'pvp'; }
  // Posición «oficial» de una fila: en PvP, quien está en colocación todavía no tiene puesto.
  function placeOf(r, b) { return isPvp(b) && r.en_colocacion ? null : (r.rank != null ? num(r.rank) : null); }
  function valueHtml(r, b) { return isPvp(b) ? fmt(r.elo) + '<small>ELO</small>' : fmt(r.score) + '<small>pts</small>'; }
  function subOf(r, b) { return isPvp(b) ? (r.en_colocacion ? 'En colocación' : esc(rankName(r.rango))) : ''; }
  function avatarOf(r) { return window.SEQAvatars ? window.SEQAvatars.avatarHTML(r.avatar) : ''; }
  function medalImg(n, cls) {
    return PODIUM_MEDAL[n] ? '<img class="' + cls + '" src="assets/ui/' + PODIUM_MEDAL[n] + '.webp" alt="" draggable="false" onerror="this.remove()">' : '';
  }
  // Podio: los tres primeros puestos, en el orden visual 2 · 1 · 3.
  function podium(top, b) {
    return '<div class="seq-v21-podium" aria-label="Podio">' + [2, 1, 3].map(function (n) {
      var r = top[n];
      var sub = subOf(r, b);
      return '<div class="seq-v21-pod seq-v21-pod-' + n + (r.is_me ? ' me' : '') + '"><div class="seq-v21-pod-av"><span class="seq-avatar seq-v21-pod-ring">' + avatarOf(r) + '</span>' +
        medalImg(n, 'seq-v21-pod-medal') + '</div><b class="seq-v21-pod-name">' + esc(r.display_name) + '</b>' + (sub ? '<small class="seq-v21-pod-sub">' + sub + '</small>' : '') +
        '<span class="seq-v21-pod-val">' + valueHtml(r, b) + '</span><div class="seq-v21-pod-step"><span>' + n + '</span></div></div>';
    }).join('') + '</div>';
  }
  // Posición en la lista: los tres primeros llevan su medalla (cuando no hay podio); el resto, el número.
  function posBadge(place) {
    if (place == null) return '<span class="seq-v21-pos none">—</span>';
    if (PODIUM_MEDAL[place]) return '<span class="seq-v21-pos medal">' + medalImg(place, 'seq-v21-pos-medal') + '<i class="seq-v21-pos-n">' + place + '</i></span>';
    return '<span class="seq-v21-pos">' + place + '</span>';
  }
  // Fila (del 4.º puesto en adelante y quienes están en colocación): posición → jugador → insignia → puntuación.
  // PvP lleva la insignia de su rango; Cálculo Mental y Contrarreloj no tienen rangos y no se inventan.
  function rankRow(r, b) {
    var sub = subOf(r, b), ranked = isPvp(b) && !r.en_colocacion;
    return '<div class="seq-v21-rk' + (r.is_me ? ' me' : '') + '">' + posBadge(placeOf(r, b)) +
      '<span class="seq-avatar seq-v21-rk-av">' + avatarOf(r) + '</span>' +
      '<span class="seq-v21-rk-name"><b>' + esc(r.display_name) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>' +
      (ranked ? rankIcon(r.rango, 'seq-v21-rk-badge') : '') +
      '<span class="seq-v21-rk-val">' + valueHtml(r, b) + '</span></div>';
  }
  // «Tu posición»: puesto grande a la izquierda; valor y detalle en medio; en PvP, la insignia del rango a la derecha.
  function meCard(d, b) {
    var me = d.me; if (!me) return '';
    var pvp = isPvp(b);
    if (!pvp && me.score == null) return '';
    var place = pvp && me.en_colocacion ? null : (me.rank ? num(me.rank) : null);
    var detail = pvp
      ? esc(rankName(me.rango)) + (me.en_colocacion ? ' · colocación ' + num(me.partidas_colocacion) + '/' + (num(me.colocacion_total) || 5) : '')
      : esc(BOARDS[b].sub);
    return '<div class="seq-v21-me"><span class="seq-v21-me-pos' + (place ? '' : ' none') + '">' + (place ? '<small>#</small>' + place : '—') + '</span>' +
      '<div class="seq-v21-me-txt"><span class="seq-v21-me-lbl">Tu posición</span><b>' + (pvp ? fmt(me.elo) + ' ELO' : fmt(me.score) + ' pts') + '</b><small>' + detail + '</small></div>' +
      (pvp ? rankIcon(me.rango, 'seq-v21-me-badge') : '') + '</div>';
  }
  function rkNote(text) { return '<div class="seq-v21-rk-note"><p>' + esc(text) + '</p></div>'; }
  function renderRankings() {
    var h = H();
    var d = S21.rankings[rankKey()], b = S21.board;
    var out = h.header('Rankings', 'El Salón de la Fama', h.back) + '<div class="seq-v21-rkscreen">' + scopeTabs() + boardTabs();
    if (S21.rankErr) return out + rkNote(S21.rankErr) + '</div>';
    if (!d) return out + '<p class="seq-v21-rk-loading">Cargando…</p></div>';
    out += '<p class="seq-v21-rk-sub"><span>' + esc(BOARDS[b].sub) + '</span></p>' + meCard(d, b);
    var rows = d.ranking || [];
    if (!rows.length) return out + rkNote(isPvp(b) ? 'Aún no hay duelos puntuados. Juega uno y aparecerás aquí.' : 'Todavía nadie tiene puntuación en este ranking.') + '</div>';
    // Podio: puestos 1, 2 y 3 tal como los da el servidor; el resto (y quien está en colocación) va en la lista.
    var top = {}, rest = [];
    rows.forEach(function (r) { var p = placeOf(r, b); if (p && p <= 3 && !top[p]) top[p] = r; else rest.push(r); });
    if (top[1] && top[2] && top[3]) out += podium(top, b);   // con menos de tres jugadores no hay podio: solo la lista
    else rest = rows;
    if (rest.length) out += '<div class="seq-v21-rklist">' + rest.map(function (r) { return rankRow(r, b); }).join('') + '</div>';
    return out + '</div>';
  }

  // ---- Estadísticas de Duelos (viven en «Estadísticas», no en el hub) ---------------------------
  function loadStats(force) {
    var h = H(); if (!h || !window.SEQOnline || !window.SEQOnline.session || !window.SEQOnline.session()) return Promise.resolve();
    var f = window.SEQOnline.session().features || {}; if (!f.classic_duel) return Promise.resolve();
    if (S21.statsLoading || (!force && S21.stats && Date.now() - S21.statsAt < 20000)) return Promise.resolve();
    S21.statsLoading = true;
    return h.call('GET', '/me/duel-stats').then(function (d) {
      S21.stats = d; S21.statsAt = Date.now(); S21.statsErr = ''; S21.statsLoading = false; refreshViews();
    }).catch(function (e) { S21.statsLoading = false; S21.statsErr = h.errText(e); refreshViews(); });
  }
  function refreshViews() { renderStats(); try { if (window.SEQOnline && window.SEQOnline.rerenderAccount) window.SEQOnline.rerenderAccount(); } catch (e) {} }
  function statCell(label, value) { return '<div class="seq-v21-cell"><b>' + value + '</b><small>' + label + '</small></div>'; }
  // Detalle de Duelos (solo datos del SERVIDOR, que no están ya en «Historial de duelos»: las partidas, victorias,
  // derrotas, empates y la mejor racha de arriba son las del jugador y no se repiten aquí).
  // Cabecera: insignia de rango + ELO + rango + estado; debajo, tres datos: pico, posición global y duelos con ELO.
  function fullStatsHtml(s) {
    var e = s.elo || {}, c = s.competitivo || {}, out = '<div class="seq-v21-full" id="seq-v21-full">';
    var total = num(e.colocacion_total) || 5;
    var state = e.en_colocacion ? 'En colocación · ' + Math.min(total, num(e.partidas_colocacion)) + '/' + total : 'Clasificado';
    out += '<div class="seq-v21-elocard">' + rankIcon(e.rango, 'seq-v21-elocard-ico') + '<div class="seq-v21-elocard-txt">' +
      '<span class="seq-v21-elocard-elo"><b>' + fmt(e.actual) + '</b> ELO</span><span class="seq-v21-elocard-rank">' + esc(rankName(e.rango)) + '</span>' +
      '<span class="seq-v21-elocard-state">' + state + '</span></div></div>';
    out += '<div class="seq-v21-grid">' + statCell('Pico de ELO', fmt(e.peak)) + statCell('Posición global', e.posicion_global ? '#' + num(e.posicion_global) : '—') +
      statCell('Duelos con ELO', num(c.partidas)) + '</div>';
    var hist = s.historial || [];
    out += '<h4 class="seq-v21-h">Últimos duelos con ELO</h4>' + (hist.length ? '<div class="history-list">' + hist.map(function (x) {
      var res = x.resultado === 'win' ? 'Victoria' : x.resultado === 'loss' ? 'Derrota' : 'Empate';
      var date = ''; try { date = new Date(num(x.fecha)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); } catch (er) {}
      var rv = x.rival || {};
      return '<div class="history-item seq-v21-hrow ' + (x.resultado === 'win' ? 'w' : x.resultado === 'loss' ? 'l' : 'd') + '">' + modeIcon(x.modo) +
        '<span class="seq-v21-hrow-body"><span class="seq-v21-hrow-top">' + esc(rv.display_name || 'Jugador') + ' · ' + res + ' ' + num(x.mi_puntuacion) + '—' + num(x.puntuacion_rival) + '</span>' +
        '<small>' + (modeKey(x.modo) === 'stakes' ? 'Apuestas' : 'Clásico') + ' · ' + fmt(x.elo_antes) + ' → ' + fmt(x.elo_despues) + ' · ' + esc(date) + '</small></span>' +
        '<b class="seq-v21-hrow-elo">' + signed(x.elo_cambio) + '</b></div>';
    }).join('') + '</div>' : '<p class="stats-section-sub">Todavía no has jugado ningún duelo puntuado.</p>');
    var h2h = s.head_to_head || [];
    if (h2h.length) {
      out += '<h4 class="seq-v21-h">Cara a cara</h4><div class="history-list">' + h2h.map(function (x) {
        return '<div class="history-item seq-v21-h2h"><span>' + esc((x.rival || {}).display_name || 'Jugador') + '</span><small>' + num(x.partidas) + ' partidas · ' + num(x.victorias) + 'V · ' + num(x.derrotas) + 'D · ' + num(x.empates) + 'E</small></div>';
      }).join('') + '</div>';
    }
    return out + '</div>';
  }
  function toggleStats() {
    S21.statsOpen = !S21.statsOpen; renderStats();
    if (S21.statsOpen) loadStats(true);
  }
  // Acceso a las estadísticas completas de Duelos. Vive DENTRO de «Estadísticas → Historial de duelos»:
  // un botón y, al abrirlo, el detalle (ELO, rango, historial, cara a cara). No hay bloque arriba ni acceso desde Ajustes.
  function renderStats() {
    var host = $('seq-duel-stats'); if (!host) return;
    var on = false; try { on = !!(window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session() && (window.SEQOnline.session().features || {}).classic_duel); } catch (e) {}
    if (!on) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = '';
    var open = !!S21.statsOpen, s = S21.stats;
    var out = '<button type="button" class="seq-v21-statsbtn' + (open ? ' open' : '') + '" onclick="SEQDuels21.toggleStats()" aria-expanded="' + open + '" aria-controls="seq-v21-full">' +
      statsIcon() + '<span class="seq-v21-statsbtn-txt">' + (open ? 'Ocultar estadísticas' : 'Ver estadísticas de duelos') + '</span><span class="seq-v21-statsbtn-chev" aria-hidden="true">›</span></button>';
    if (open) {
      if (!s) out += S21.statsErr ? '<p class="stats-section-sub">' + esc(S21.statsErr) + '</p>' : '<p class="stats-section-sub">Cargando…</p>';
      else out += fullStatsHtml(s);
    }
    host.innerHTML = out;
  }
  function onStatsShown() { renderStats(); if (S21.statsOpen) loadStats(true); }
  // Un duelo terminado cambia el ELO: la próxima vez que se mire, se vuelve a pedir.
  function invalidate() { S21.stats = null; S21.statsAt = 0; S21.rankings = {}; }

  window.SEQDuels21 = {
    STAKES: STAKES, MODES: MODES, RANK_EMOJI: RANK_EMOJI, BOARDS: BOARDS,
    modeButtons: modeButtons, modeBadge: modeBadge, scoreboard: scoreboard, modeIcon: modeIcon, rankIcon: rankIcon, eloBlock: eloBlock,
    play: play, tick: tick, stake: stake, answer: answer,
    renderRankings: renderRankings, rkIcon: rkIcon, loadRankings: loadRankings, setScope: setScope, setBoard: setBoard,
    renderStats: renderStats, loadStats: loadStats, toggleStats: toggleStats, onStatsShown: onStatsShown,
    invalidate: invalidate,
    _pure: { signed: signed, fmt: fmt, stakeKey: stakeKey, modeKey: modeKey, scoreboard: scoreboard, eloBlock: eloBlock, fullStatsHtml: fullStatsHtml }
  };
})();
