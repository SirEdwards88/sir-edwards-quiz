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
  var SCOPES = { friends: '👥 Amigos', global: '🌍 Global' };

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
  function stakeIcon(k) { k = stakeKey(k); return k ? icon('apuestas', k, STAKES[k].emoji, 'seq-v21-ico-stake') : ''; }
  function rankIcon(r, cls) {
    var id = r && RANK_EMOJI[r.icono] ? r.icono : 'plebeyo_ilustrado';
    return icon('rangos', id, RANK_EMOJI[id], 'seq-v21-ico-rank ' + (cls || ''));
  }
  function rankName(r) { return r && typeof r.nombre === 'string' ? r.nombre : 'Plebeyo Ilustrado'; }
  function stakeLabel(k) { k = stakeKey(k); return k ? stakeIcon(k) + '<b>' + STAKES[k].nombre + '</b>' : '<b>—</b>'; }

  // ---- Elección de modo (dentro de «Duelo online») ----------------------------------------------
  // Exactamente dos modos. Devuelve el HTML de los dos botones; pick() lo gestiona duels.js.
  function modeButtons() {
    return '<div class="seq-v21-modes">' + ['classic', 'stakes'].map(function (m) {
      return '<button type="button" class="seq-v21-mode seq-v21-mode-' + m + '" onclick="SEQDuels.pick(\'duel\',\'' + m + '\')">' +
        modeIcon(m) + '<span class="seq-v21-mode-body"><span class="seq-v21-mode-name">' + MODES[m].nombre + '</span>' +
        '<span class="seq-v21-mode-desc">' + MODES[m].desc + '</span></span><span class="seq-v21-mode-go" aria-hidden="true">›</span></button>';
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
    out += '<div class="mode-header game-hud seq-d-hud seq-v21-hud"><span class="seq-d-hud-lbl">' + modeIcon('stakes') + 'APUESTAS</span>' +
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

  // ---- Rankings (pantalla propia dentro de Duelos) ----------------------------------------------
  function rankKey() { return S21.scope + ':' + S21.board; }
  function loadRankings() {
    var h = H(); if (!h) return Promise.resolve();
    var key = rankKey(), scope = S21.scope, board = S21.board;
    S21.rankErr = '';
    return h.call('GET', '/rankings?scope=' + scope + '&board=' + board).then(function (d) {
      S21.rankings[key] = d; if (window.SEQDuels._state().screen === 'rankings') window.SEQDuels.rerender();
    }).catch(function (e) {
      S21.rankErr = (e && e.status === 404) ? 'Este ranking todavía no está disponible.' : h.errText(e);
      if (window.SEQDuels._state().screen === 'rankings') window.SEQDuels.rerender();
    });
  }
  function setScope(s) { if (SCOPES[s]) { S21.scope = s; loadRankings(); window.SEQDuels.rerender(); } }
  function setBoard(b) { if (BOARDS[b]) { S21.board = b; loadRankings(); window.SEQDuels.rerender(); } }
  function seg(map, order, cur, fn) {
    return '<div class="seq-v21-seg" role="tablist">' + order.map(function (k) {
      var label = typeof map[k] === 'string' ? map[k] : map[k].emoji + ' ' + map[k].nombre;
      return '<button type="button" role="tab" aria-selected="' + (k === cur) + '" class="seq-v21-seg-btn' + (k === cur ? ' sel' : '') + '" onclick="SEQDuels21.' + fn + '(\'' + k + '\')">' + label + '</button>';
    }).join('') + '</div>';
  }
  function rankRow(r, board) {
    var pos = r.rank != null ? '#' + num(r.rank) : '—';
    var av = window.SEQAvatars ? window.SEQAvatars.avatarHTML(r.avatar) : '';
    var main = board === 'pvp' ? fmt(r.elo) + '<small> ELO</small>' : fmt(r.score);
    var sub = board === 'pvp' ? (r.en_colocacion ? 'En colocación' : esc(rankName(r.rango))) : '';
    return '<div class="history-item seq-v21-rk' + (r.is_me ? ' me' : '') + '"><span class="seq-v21-rk-pos">' + pos + '</span>' +
      '<span class="seq-v21-rk-av">' + av + '</span><span class="seq-v21-rk-name">' + esc(r.display_name) + (sub ? '<small>' + sub + '</small>' : '') + '</span>' +
      (board === 'pvp' && !r.en_colocacion ? rankIcon(r.rango) : '') + '<b class="seq-v21-rk-val">' + main + '</b></div>';
  }
  function renderRankings() {
    var h = H();
    var d = S21.rankings[rankKey()], b = S21.board;
    var out = h.header('Rankings', 'Compite y compárate', h.back) + seg(SCOPES, ['friends', 'global'], S21.scope, 'setScope') + seg(BOARDS, BOARD_ORDER, S21.board, 'setBoard');
    if (S21.rankErr) return out + '<p class="stats-section-sub">' + esc(S21.rankErr) + '</p>';
    if (!d) return out + '<p class="stats-section-sub">Cargando…</p>';
    out += '<p class="stats-section-sub seq-v21-rk-sub">' + esc(BOARDS[b].sub) + (d.validado === false ? ' · sin verificar por el servidor' : '') + '</p>';
    if (b === 'pvp' && d.me) {
      out += '<div class="seq-v21-me">' + rankIcon(d.me.rango) + '<div><b>' + fmt(d.me.elo) + ' ELO</b><small>' + esc(rankName(d.me.rango)) + (d.me.rank ? ' · #' + num(d.me.rank) : '') +
        (d.me.en_colocacion ? ' · colocación ' + num(d.me.partidas_colocacion) + '/' + num(d.me.colocacion_total) : '') + '</small></div></div>';
    }
    var rows = d.ranking || [];
    if (!rows.length) return out + '<p class="stats-section-sub">' + (b === 'pvp' ? 'Aún no hay duelos puntuados. Juega uno y aparecerás aquí.' : 'Todavía nadie tiene puntuación en este ranking.') + '</p>';
    return out + '<div class="history-list seq-v21-rklist">' + rows.map(function (r) { return rankRow(r, b); }).join('') + '</div>';
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
  function summaryHtml(s, withBtn, btnLabel, btnFn) {
    var e = s.elo || {}, c = s.competitivo || {};
    var pos = e.posicion_global ? ' · #' + num(e.posicion_global) : '';
    var line = e.en_colocacion
      ? 'En colocación · ' + num(e.partidas_colocacion) + '/' + (num(e.colocacion_total) || 5) + ' partidas'
      : num(c.partidas) + ' partidas · ' + num(c.victorias) + ' victorias';
    return '<div class="seq-v21-sum"><div class="seq-v21-sum-head">' + rankIcon(e.rango) + '<div><div class="seq-v21-sum-elo"><b>' + fmt(e.actual) + '</b> ELO' + pos + '</div>' +
      '<div class="seq-v21-sum-line">' + esc(rankName(e.rango)) + '</div><div class="seq-v21-sum-line">' + line + '</div></div></div>' +
      (withBtn ? '<button type="button" class="btn btn-secondary seq-v21-sum-btn" onclick="' + btnFn + '">' + btnLabel + '</button>' : '') + '</div>';
  }
  function statCell(label, value) { return '<div class="seq-v21-cell"><b>' + value + '</b><small>' + label + '</small></div>'; }
  function fullStatsHtml(s) {
    var e = s.elo || {}, c = s.competitivo || {}, out = '<div class="seq-v21-full" id="seq-v21-full">';
    out += '<h4 class="seq-v21-h">ELO</h4><div class="seq-v21-grid">' +
      statCell('ELO actual', fmt(e.actual)) + statCell('Rango', esc(rankName(e.rango))) + statCell('Posición global', e.posicion_global ? '#' + num(e.posicion_global) : '—') +
      statCell('Pico de ELO', fmt(e.peak)) + statCell('Colocación', num(e.partidas_colocacion) + '/' + (num(e.colocacion_total) || 5)) + statCell('Estado', e.en_colocacion ? 'En colocación' : 'Clasificado') + '</div>';
    out += '<h4 class="seq-v21-h">Historial competitivo</h4><div class="seq-v21-grid">' +
      statCell('Partidas', num(c.partidas)) + statCell('Victorias', num(c.victorias)) + statCell('Derrotas', num(c.derrotas)) + statCell('Empates', num(c.empates)) +
      statCell('% victorias', String(Number(c.porcentaje_victorias) || 0).replace('.', ',') + '%') + statCell('Racha actual', num(c.racha_actual)) + statCell('Mejor racha', num(c.mejor_racha)) + '</div>';
    var hist = s.historial || [];
    out += '<h4 class="seq-v21-h">Historial de duelos</h4>' + (hist.length ? '<div class="history-list">' + hist.map(function (x) {
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
  function toggleStats() { S21.statsOpen = !S21.statsOpen; renderStats(); }
  // Bloque de Duelos dentro de la pestaña Estadísticas: resumen + botón que despliega el detalle.
  function renderStats() {
    var host = $('seq-duel-stats'); if (!host) return;
    var on = false; try { on = !!(window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session() && (window.SEQOnline.session().features || {}).classic_duel); } catch (e) {}
    if (!on) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = '';
    var s = S21.stats, out = '<div class="stats-section seq-v21-stats"><h3 class="stats-h">' + modeIcon('classic') + 'Duelos</h3>';
    if (!s) out += S21.statsErr ? '<p class="stats-section-sub">' + esc(S21.statsErr) + '</p>' : '<p class="stats-section-sub">Cargando…</p>';
    else {
      out += summaryHtml(s, true, S21.statsOpen ? 'Ocultar estadísticas completas ↑' : 'Ver estadísticas completas →', 'SEQDuels21.toggleStats()');
      if (S21.statsOpen) out += fullStatsHtml(s);
    }
    out += '</div>';
    host.innerHTML = out;
  }
  // Perfil: solo identidad/resumen. El botón lleva a Estadísticas con el bloque de Duelos desplegado.
  function profileSummaryHtml() {
    var on = false; try { on = !!(window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session() && (window.SEQOnline.session().features || {}).classic_duel); } catch (e) {}
    if (!on) return '';
    if (!S21.stats) { loadStats(); return ''; }
    return '<div class="seq-v21-profile"><h4 class="seq-v21-h">' + modeIcon('classic') + 'Duelos</h4>' + summaryHtml(S21.stats, true, 'Ver estadísticas →', 'SEQDuels21.openStats()') + '</div>';
  }
  function openStats() {
    S21.statsOpen = true;
    try { if (typeof switchTab === 'function') switchTab('stats'); } catch (e) {}
    renderStats(); loadStats(true);
    setTimeout(function () { var el = $('seq-duel-stats'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }
  function onStatsShown() { renderStats(); loadStats(true); }
  // Un duelo terminado cambia el ELO: la próxima vez que se mire, se vuelve a pedir.
  function invalidate() { S21.stats = null; S21.statsAt = 0; S21.rankings = {}; }

  window.SEQDuels21 = {
    STAKES: STAKES, MODES: MODES, RANK_EMOJI: RANK_EMOJI, BOARDS: BOARDS,
    modeButtons: modeButtons, modeBadge: modeBadge, scoreboard: scoreboard, modeIcon: modeIcon, rankIcon: rankIcon, eloBlock: eloBlock,
    play: play, tick: tick, stake: stake, answer: answer,
    renderRankings: renderRankings, loadRankings: loadRankings, setScope: setScope, setBoard: setBoard,
    renderStats: renderStats, loadStats: loadStats, toggleStats: toggleStats, openStats: openStats, onStatsShown: onStatsShown,
    profileSummaryHtml: profileSummaryHtml, invalidate: invalidate,
    _pure: { signed: signed, fmt: fmt, stakeKey: stakeKey, modeKey: modeKey, scoreboard: scoreboard, eloBlock: eloBlock, summaryHtml: summaryHtml, fullStatsHtml: fullStatsHtml }
  };
})();
