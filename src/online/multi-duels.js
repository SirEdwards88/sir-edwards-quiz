// SirEdwards Quiz 2.4 — Duelo online MÚLTIPLE (3 a 4 jugadores, en directo).
//
// Módulo aparte para no engordar duels.js: este archivo solo PINTA y manda acciones. El servidor (/multi-duels) es la única
// autoridad de preguntas, tiempos, corrección, puntos y clasificación; aquí no se calcula nada de eso.
// Se apoya en duels.js (estado S, sondeo, reloj, respuesta, bloque de pregunta) a través de los ayudantes `H` que éste le pasa:
// pantallas 'pickkind' (1 contra 1 / Múltiple), 'multipick' (elegir 2 o 3 amigos) y 'multi' (sala, partida y final).
// No cuenta para ELO, estadísticas ni logros del Duelo 1 contra 1 (no se llama a registerOnlineDuelResult).
// Todo texto que viene del servidor pasa por H.esc() / H.player() y los números por H.num().
//
// La parte pura (ordinal, frases, estado de cada jugador, recuento de pendientes) se prueba en test/multi-duels.test.mjs.

(function () {
  'use strict';

  var MIN_PLAYERS = 3, MAX_PLAYERS = 4;      // los valida el servidor; aquí solo se explica y se activa el botón
  var STAKES_READY = true;

  // ---- Lógica pura ----------------------------------------------------------------------------
  function ordinal(n) { n = Math.floor(Number(n)); return n > 0 ? n + '.º' : ''; }

  // Texto fijo del estado de cada jugador en la sala.
  function playerStatus(j, estadoSala) {
    if (!j) return '';
    if (j.estado === 'rechazado') return 'Ha rechazado';
    if (j.estado === 'fuera') return 'Se ha ido';
    if (estadoSala === 'aceptado') return j.listo ? 'Listo' : 'Aún no está listo';
    if (j.es_creador) return 'Anfitrión';
    return j.estado === 'aceptado' ? 'Ha aceptado' : 'Sin responder';
  }

  // Salas que le piden algo al jugador: invitación sin responder, o sala de espera / partida en la que está dentro.
  function pendingCount(list) {
    var n = 0;
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (!x) return;
      if (x.estado === 'pendiente' && x.mi_estado === 'invitado') n++;
      else if ((x.estado === 'aceptado' || x.estado === 'en_curso') && x.mi_estado === 'aceptado') n++;
    });
    return n;
  }

  // Resultado del jugador en la clasificación final: el primero gana (empate si comparte el primer puesto) y todos los demás pierden.
  // `margin` es la ventaja sobre el segundo (si ganas) o la distancia al ganador (si pierdes); decide la bolsa de frases.
  function outcome(r, abandoned) {
    var list = (r && r.clasificacion) || [], pos = Math.floor(Number(r && r.mi_posicion)) || 0, mine = Math.floor(Number(r && r.mi_puntuacion)) || 0;
    if (abandoned) return { res: 'gone', margin: 0, pos: pos, winner: '' };
    var top = list.filter(function (x) { return x && x.posicion === 1; }), best = top.length ? Math.floor(Number(top[0].puntuacion)) || 0 : mine;
    if (pos === 1) {
      if (top.length > 1) return { res: 'draw', margin: 0, pos: pos, winner: '' };
      var second = list.filter(function (x) { return x && x.posicion > 1; }).map(function (x) { return Math.floor(Number(x.puntuacion)) || 0; });
      return { res: 'win', margin: second.length ? Math.max(0, mine - Math.max.apply(null, second)) : 0, pos: pos, winner: '' };
    }
    var w = top.filter(function (x) { return !x.es_yo; })[0];
    return { res: 'loss', margin: Math.max(0, best - mine), pos: pos, winner: w ? String(w.display_name || '') : '' };
  }
  // Título de la categoría, igual que en el 1 contra 1: aplastante (8 o más), por la mínima (2 o menos) o clara.
  function categoryTitle(o) {
    if (o.res === 'gone') return 'Retirada';
    if (o.res === 'draw') return 'Empate en cabeza';
    var big = o.margin >= 8, close = o.margin <= 2;
    if (o.res === 'win') return big ? 'Victoria aplastante' : close ? 'Victoria por la mínima' : 'Victoria clara';
    return big ? 'Derrota sin paliativos' : close ? 'Derrota por la mínima' : 'Derrota clara';
  }
  // Frase de Sir Edwards (las mismas bolsas que el Duelo 1 contra 1, estables por sala).
  function phraseFor(o, seedId) {
    var P = typeof window !== 'undefined' ? window.SEQDuelPhrases : null;
    if (!P) return '';
    if (o.res === 'gone') return P.pickForfeit('yo_abandono', '', seedId);
    return P.pickRotating(o.res, o.margin, seedId, o.winner);
  }

  // ---- Pintado --------------------------------------------------------------------------------
  var H = null;
  function esc(s) { return H.esc(s); }
  function num(v) { return H.num(v); }
  function S() { return H.S; }

  function sel() { var s = S(); if (!s.multiSel) s.multiSel = []; return s.multiSel; }

  function renderKind() {
    var stakes = S().pickModo === 'stakes';
    var back = H.backToList;
    var h = H.header(stakes ? 'Duelo por apuestas' : 'Duelo clásico', 'Elige cómo jugar', back);
    var one = '<div class="history-item seq-d-row seq-m-opt" role="button" tabindex="0" onclick="SEQMulti.one()" onkeydown="if(event.key===\'Enter\')SEQMulti.one()"><div class="seq-m-opt-body"><div class="history-item-info">1 contra 1</div><div class="history-item-sub">Un amigo, cara a cara.</div></div><div class="history-item-score">›</div></div>';
    var multi;
    if (stakes && !STAKES_READY) {
      multi = '<div class="history-item seq-d-row seq-m-opt seq-d-off" aria-disabled="true"><div class="seq-m-opt-body"><div class="history-item-info">Múltiple</div><div class="history-item-sub">Muy pronto. Sir Edwards aún afila las apuestas.</div></div></div>';
    } else {
      multi = '<div class="history-item seq-d-row seq-m-opt" role="button" tabindex="0" onclick="SEQMulti.startPick()" onkeydown="if(event.key===\'Enter\')SEQMulti.startPick()"><div class="seq-m-opt-body"><div class="history-item-info">Múltiple</div><div class="history-item-sub">De ' + MIN_PLAYERS + ' a ' + MAX_PLAYERS + ' jugadores. Clasificación final.</div></div><div class="history-item-score">›</div></div>';
    }
    return h + '<div class="history-list seq-m-opts">' + one + multi + '</div>';
  }

  function renderPickPlayers() {
    var s = S(), fl = s.lists.friends, chosen = sel();
    var h = H.header('Elige a tus rivales', (S().pickModo === 'stakes' ? 'Duelo por apuestas' : 'Duelo clásico') + ' · múltiple', function () { s.screen = 'pickkind'; H.render(); });
    h += '<p class="stats-section-sub">Elige a ' + (MIN_PLAYERS - 1) + ' o ' + (MAX_PLAYERS - 1) + ' amigos en línea. Tienen 3 min para aceptar.</p>';
    if (!fl) return h + '<p class="stats-section-sub">Cargando…</p>';
    if (!fl.friends.length) return h + H.emptyState('vacio-amigos', 'Aún no tienes amigos', 'Añádelos para poder retarlos.', '<button class="btn btn-primary" onclick="SEQDuels.open(\'friends\')">Añadir amigos</button>');
    var on = fl.friends.filter(H.isOnline), off = fl.friends.filter(function (f) { return !H.isOnline(f); });
    h += '<h3 class="seq-d-h3">En línea (' + num(on.length) + ')</h3>';
    h += on.length ? '<div class="history-list">' + on.map(function (f) {
      var p = H.player(f.player), picked = chosen.indexOf(p.id) >= 0, full = !picked && chosen.length >= MAX_PLAYERS - 1;
      return '<div class="history-item seq-d-row seq-pl-row seq-m-friend' + (picked ? ' seq-m-on' : '') + (full ? ' seq-d-off' : '') + '" role="checkbox" aria-checked="' + (picked ? 'true' : 'false') + '"' + (full ? ' aria-disabled="true"' : ' tabindex="0" onclick="SEQMulti.toggle(\'' + p.id + '\')" onkeydown="if(event.key===\'Enter\')SEQMulti.toggle(\'' + p.id + '\')"') + '>' +
        H.who(p, '<span class="seq-d-on">● En línea</span>') + '<div class="history-item-score seq-m-check">' + (picked ? H.ico('correcto') : '') + '</div></div>';
    }).join('') + '</div>' : '<p class="stats-section-sub">Nadie está en línea ahora mismo. Un duelo en directo necesita a todos a la vez.</p>';
    if (off.length) h += '<h3 class="seq-d-h3">Sin conexión (' + num(off.length) + ')</h3><div class="history-list">' + off.map(function (f) {
      return '<div class="history-item seq-d-row seq-pl-row seq-d-off" aria-disabled="true">' + H.who(H.player(f.player), 'Sin conexión') + '</div>';
    }).join('') + '</div>';
    var ok = chosen.length >= MIN_PLAYERS - 1 && chosen.length <= MAX_PLAYERS - 1;
    h += '<div class="seq-m-bar"><button class="btn btn-primary" style="width:100%;"' + (ok ? '' : ' disabled') + ' onclick="SEQMulti.create()">' + (ok ? 'Crear sala · ' + (chosen.length + 1) + ' jugadores' : 'Elige al menos ' + (MIN_PLAYERS - 1) + ' amigos') + '</button></div>';
    return h;
  }

  // Marcador compacto de todos durante la partida: puesto, avatar, nombre corto y puntos.
  function chips(d) {
    var m = d.marcador; if (!m || !m.jugadores) return '';
    var by = {}; (d.jugadores || []).forEach(function (j) { by[j.id] = j; });
    var rows = m.jugadores.slice().sort(function (a, b) { return (num(a.posicion) || 9) - (num(b.posicion) || 9); });
    return '<div class="seq-m-board" aria-label="Marcador">' + rows.map(function (r) {
      var j = by[r.id]; if (!j) return '';
      var p = H.player(j);
      return '<div class="seq-m-chip' + (j.es_yo ? ' me' : '') + (r.abandonado ? ' gone' : '') + '"><span class="seq-m-pos">' + esc(ordinal(r.posicion)) + '</span><span class="seq-m-av">' + p.avatar + '</span><span class="seq-m-nm">' + (j.es_yo ? 'Tú' : p.name) + '</span><b class="seq-m-pts">' + (r.puntos == null ? '·' : num(r.puntos)) + '</b></div>';
    }).join('') + '</div>';
  }

  function playersList(d) {
    return '<div class="history-list seq-m-players">' + (d.jugadores || []).map(function (j) {
      var st = playerStatus(j, d.estado), good = j.estado === 'aceptado' && (d.estado === 'pendiente' || j.listo);
      return '<div class="history-item seq-pl-row">' + H.who(H.player(j), (j.es_yo ? 'Tú · ' : '') + (good ? H.ico('correcto') : j.estado === 'rechazado' || j.estado === 'fuera' ? H.ico('incorrecto') : H.ico('mediocre')) + esc(st)) + '</div>';
    }).join('') + '</div>';
  }

  function accepted(d) { return (d.jugadores || []).filter(function (j) { return j.estado === 'aceptado'; }).length; }

  function renderRoom(d) {
    var h = H.gameHeader(H.ico('duelo') + 'Duelo múltiple', 'SEQDuels.leaveDuel()');
    var s = S(), now = H.serverNow();
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    var mine = d.yo || {}, creator = d.soy === 'creador';
    h += '<p class="stats-section-sub seq-d-vs">' + (d.modo === 'stakes' ? 'Duelo por apuestas' : 'Duelo clásico') + ' · ' + num((d.jugadores || []).length) + ' jugadores</p>';

    if (d.estado === 'pendiente') {
      s.shown = null;
      var box = '<div class="duel-result-box duel-result-neutral">';
      if (creator) {
        var n = accepted(d), can = n >= MIN_PLAYERS;
        h += box + '<div class="duel-result-title">Esperando a tus invitados…</div><p class="duel-result-hint">Caduca en <span id="seq-d-count"></span></p>' + playersList(d) +
          '<button class="btn btn-primary" style="width:100%;"' + (can ? '' : ' disabled') + ' onclick="SEQMulti.action(\'start\')">' + (can ? 'Empezar con ' + n : 'Hacen falta ' + MIN_PLAYERS + ' jugadores') + '</button>' +
          '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQMulti.action(\'cancel\')">Cancelar sala</button></div>';
        return h;
      }
      if (mine.estado === 'invitado') {
        return h + box + '<div class="duel-result-title">Te invitan a un duelo múltiple</div><p class="duel-result-hint">Caduca en <span id="seq-d-count"></span></p>' + playersList(d) +
          '<button class="btn btn-primary" style="width:100%;" onclick="SEQMulti.action(\'accept\')">Aceptar</button>' +
          '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQMulti.action(\'reject\')">Rechazar</button></div>';
      }
      if (mine.estado === 'aceptado') {
        return h + box + '<div class="duel-result-title">Estás dentro. Paciencia.</div><p class="duel-result-hint">El anfitrión empezará cuando estén todos. Caduca en <span id="seq-d-count"></span></p>' + playersList(d) +
          '<button class="btn btn-secondary" style="width:100%;" onclick="SEQMulti.action(\'reject\')">Salir de la sala</button></div>';
      }
      return h + box + '<div class="duel-result-title">Ya no estás en esta sala</div><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.open(\'duels\')">Volver a Duelos</button></div>';
    }

    if (d.estado === 'aceptado') {
      s.shown = null;
      if (mine.estado !== 'aceptado') return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Ya no estás en esta sala</div><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.open(\'duels\')">Volver a Duelos</button></div>';
      return h + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Sala de espera</div><p class="duel-result-hint">Listos en <span id="seq-d-count"></span> s</p>' + playersList(d) +
        (mine.listo ? '' : '<button class="btn btn-primary" style="width:100%;" onclick="SEQMulti.action(\'ready\')">¡Listo!</button>') +
        (creator && mine.listo ? '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQMulti.action(\'start\')">Empezar ya con los listos</button>' : '') +
        (creator ? '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQMulti.action(\'cancel\')">Cancelar sala</button>' : '<button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQMulti.action(\'reject\')">Salir de la sala</button>') + '</div>';
    }

    if (d.estado === 'en_curso') return renderPlay(d, h, now);
    s.shown = null;
    return renderEnd(d);
  }

  function renderPlay(d, head, now) {
    var s = S(), t0 = num(d.t0), mine = d.yo || {};
    if (mine.estado !== 'aceptado') { s.shown = null; return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Ya no estás en esta sala</div><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.open(\'duels\')">Volver a Duelos</button></div>'; }
    if (now < t0) { s.shown = null; return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Empieza en <span id="seq-d-count"></span>…</div>' + playersList(d) + '</div>'; }
    try { SEQLevelUp.markKey('multi:' + d.id); } catch (e) {}
    if (mine.abandonado) { s.shown = null; return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Has salido de la partida</div><p class="duel-result-hint">Quedas el último. Los demás siguen sin ti.</p></div>'; }
    if (d.modo === 'stakes' && window.SEQMultiStakes && !mine.completado) { s.shown = null; return SEQMultiStakes.play(d, H, chips); }
    var k = H.classicWin(d, now).k; s.lastIdx = k;
    if (mine.completado) { s.shown = null; return head + chips(d) + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Has terminado. Nadie ha aplaudido.</div><p class="duel-result-hint">Esperando a los demás…</p></div>'; }
    if (!d.preguntas || d.preguntas.length <= k) { s.shown = null; return head + '<p class="stats-section-sub">Cargando pregunta…</p>'; }
    var rs = null; (mine.respuestas || []).forEach(function (a) { if (num(a.indice) === k) rs = a; });
    H.topbarShown(false);
    var h = '<div class="seq-d-toprow"><button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.leaveDuel()">← Duelo múltiple</button></div>' +
      '<div id="seq-d-msg" class="feedback" style="display:none;"></div>' +
      '<div class="mode-header game-hud seq-d-hud seq-d-hud-reto"><span class="seq-d-hud-lbl"><span class="seq-d-hud-mode" title="Duelo múltiple"><img class="seq-ico seq-d-mode-ico" src="assets/modes/emblema/duelo-clasico.webp" alt="" draggable="false"></span>' + (k + 1) + '/' + num(d.n_preguntas || 20) + ' · </span>' +
      '<span class="seq-d-hud-right"><span class="seq-d-hud-time">' + H.ico('tiempo') + '<span id="seq-d-time"></span>s</span></span></div>' +
      chips(d) + '<div class="progress-bar"><div id="seq-d-bar" class="bar-fill"></div></div>' +
      H.questionBlock(d.id, k, d.preguntas[k], rs, false);
    return h + (rs ? '<p class="stats-section-sub seq-d-next">Siguiente pregunta en cuanto respondan todos o acabe el tiempo.</p>' : '');
  }

  // Tarjeta final: misma familia que la de Duelo (.results-card / .seq-d-final), con la clasificación completa.
  function renderEnd(d) {
    H.topbarShown(false);
    var head = H.gameHeader(H.ico('duelo') + 'Duelo múltiple', "SEQDuels.open('duels')");
    var r = d.resultado;
    if (!r) {
      var why = { cancelado: d.motivo_fin === 'sin_listos' ? 'Nadie llegó a tiempo a la sala de espera. Mucha ilusión, poca puntualidad.' : d.motivo_fin === 'sin_jugadores' ? 'Se fueron los jugadores. Sir Edwards guarda las copas.' : 'Sala cancelada. Aquí no ha pasado nada.', expirado: 'Las invitaciones caducaron sin suficientes valientes.' }[d.estado] || 'Sala cerrada.';
      return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + (d.estado === 'expirado' ? 'Caducada' : 'Cancelada') + '</div><p class="duel-result-hint">' + esc(why) + '</p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.open(\'duels\')">Volver a Duelos</button></div>';
    }
    var mine = d.yo || {};
    var o = outcome(r, !!mine.abandonado);
    var res = o.res === 'win' ? 'win' : o.res === 'draw' ? 'draw' : 'loss';
    H.resultSoundOnce('multi', d, res);
    var charKey = res === 'win' ? 'victory' : res === 'loss' ? 'defeat' : 'empate';
    var moodSrc = res === 'win' ? 'assets/ui/copa.webp' : res === 'loss' ? 'assets/ui/bandera-blanca.webp' : 'assets/modes/amigos.webp';
    var cat = categoryTitle(o);
    var xp = H.xpFor('duel', d, mine.aciertos); H.syncXpOnce('multi', d, xp);
    var tone = res === 'win' ? 'tone-win' : res === 'loss' ? 'tone-fail' : 'tone-bien';
    var rows = (r.clasificacion || []).map(function (x) {
      var p = H.player(x);
      return '<div class="seq-m-row' + (x.es_yo ? ' me' : '') + (x.posicion === 1 ? ' first' : '') + (x.abandonado ? ' gone' : '') + '"><span class="seq-m-rpos">' + esc(ordinal(x.posicion)) + '</span><span class="seq-m-av">' + p.avatar + '</span><span class="seq-m-rname">' + (x.es_yo ? 'Tú' : p.name) + (x.abandonado ? ' <i>(se fue)</i>' : '') + '</span><b class="seq-m-pts">' + num(x.puntuacion) + '</b></div>';
    }).join('');
    var chipsXp = xp > 0 ? '<div class="results-mode-chips show">' + H.xpChipHtml(xp) + '</div>' : '';
    var stamp = ({ win: ['VICTORIA', 'gold'], loss: ['DERROTA', 'fail'], draw: ['EMPATE', 'ok'] })[res];
    var h = '<div class="results-card seq-d-results seq-d-final seq-m-final duel-result-box ' + (res === 'win' ? 'duel-result-win' : res === 'loss' ? 'duel-result-loss' : 'duel-result-draw') + '" data-tier="' + (res === 'win' ? 'oro' : res === 'loss' ? 'derrota' : 'azul') + '">' +
      '<div class="results-character show char-' + (res === 'draw' ? 'neutral' : charKey) + '" aria-hidden="true"><picture><source srcset="assets/character/' + charKey + '.webp" type="image/webp"><img src="assets/character/' + charKey + '.webp" alt="" draggable="false"></picture></div>' +
      '<h3 class="seq-d-res-title">Duelo múltiple · ' + (d.modo === 'stakes' ? 'por apuestas' : 'clásico') + '</h3>' +
      ((xp > 0 && window.SEQLevelUp) ? SEQLevelUp.htmlFor('multi:' + d.id) : '') +
      '<div class="seq-m-rank" role="list">' + rows + '</div>' +
      '<div class="results-phrase-container ' + tone + '"><div class="results-mood-icon has-img"><img class="mood-img" src="' + moodSrc + '" alt="" draggable="false"></div>' +
      '<div class="results-category-title">' + esc(cat) + '</div>' +
      '<div class="results-phrase duel-result-phrase">' + esc(phraseFor(o, d.id)) + '</div></div>' + chipsXp +
      '<div class="results-lucidez-stamp show"><span class="stamp-badge tone-' + stamp[1] + '">' + stamp[0] + '</span></div>' +
      '<div class="results-actions">' +
      (d.soy === 'creador' ? '<button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="SEQMulti.action(\'rematch\')">' + H.ico('revancha') + 'Revancha</button>' : '') +
      '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.open(\'duels\')">Volver a Duelos</button></div></div>';
    return head + h;
  }

  // Fila de la lista de Duelo online.
  function row(x, helpers) {
    var HH = helpers || H; H = HH;
    var js = (x.jugadores || []).filter(function (j) { return !j.es_yo; });
    var p = H.player(js[0] || {}), id = H.safeId(x.id), n = (x.jugadores || []).length;
    var name = { name: p.name + (js.length > 1 ? ' +' + (js.length - 1) : ''), avatar: p.avatar, id: p.id };
    var sub = 'Múltiple · ' + n + ' jugadores', btns = '';
    if (x.estado === 'pendiente' && x.mi_estado === 'invitado') {
      sub = '¡Te invitan a un duelo múltiple!';
      btns = '<button class="btn btn-primary seq-d-sm" onclick="event.stopPropagation();SEQMulti.listAction(\'' + id + '\',\'accept\')">Aceptar</button> <button class="btn btn-secondary seq-d-sm" onclick="event.stopPropagation();SEQMulti.listAction(\'' + id + '\',\'reject\')">Rechazar</button>';
    } else if (x.estado === 'pendiente') sub = 'Múltiple · esperando invitados';
    else if (x.estado === 'aceptado') sub = 'Múltiple · sala de espera';
    else if (x.estado === 'en_curso') sub = 'Múltiple · en juego';
    else if (x.estado === 'completado' && x.resultado) sub = 'Múltiple · ' + ordinal(x.resultado.mi_posicion) + ' de ' + num(x.resultado.n_jugadores) + ' · ' + num(x.resultado.mi_puntuacion) + (x.modo === 'stakes' ? ' puntos' : ' aciertos');
    else if (x.estado === 'cancelado') sub = 'Múltiple · cancelado';
    else if (x.estado === 'expirado') sub = 'Múltiple · caducado';
    return '<div class="history-item seq-d-row seq-pl-row" onclick="SEQDuels.open(\'multi\',\'' + id + '\')">' + H.who({ name: name.name, avatar: name.avatar, id: name.id }, esc(sub)) + (btns ? '<div class="seq-pl-act seq-pl-act-full">' + btns + '</div>' : '') + '</div>';
  }

  function render(screen, helpers) {
    H = helpers;
    if (screen === 'pickkind') return renderKind();
    if (screen === 'multipick') return renderPickPlayers();
    return renderRoom(S().data);
  }

  // ---- Acciones --------------------------------------------------------------------------------
  function ready() { return !!(window.SEQDuels && SEQDuels._h); }
  function hh() { H = SEQDuels._h; return H; }
  function startPick() {
    if (!ready()) return; hh();
    var s = S(); s.multiSel = []; s.screen = 'multipick'; H.render(); H.refresh();
  }
  function toggle(id) {
    if (!ready()) return; hh();
    id = H.safeId(id); if (!id) return;
    var c = sel(), i = c.indexOf(id);
    if (i >= 0) c.splice(i, 1); else if (c.length < MAX_PLAYERS - 1) c.push(id);
    H.render();
  }
  function create() {
    if (!ready()) return; hh();
    var c = sel().slice();
    if (c.length < MIN_PLAYERS - 1 || c.length > MAX_PLAYERS - 1) return;
    H.act('POST', '/multi-duels', { rivales: c, modo: S().pickModo === 'stakes' ? 'stakes' : 'classic' }, function (d) { S().multiSel = []; H.open('multi', d.id); });
  }
  function action(name) {
    if (!ready()) return; hh();
    var s = S(); if (!s.id || ['accept', 'reject', 'cancel', 'ready', 'start', 'rematch'].indexOf(name) < 0) return;
    H.act('POST', '/multi-duels/' + s.id + '/' + name, undefined, function (d) {
      if (name === 'rematch') { H.open('multi', d.id); return; }
      H.apply(d);
    });
  }
  function listAction(id, name) {
    if (!ready()) return; hh();
    id = H.safeId(id); if (!id || ['accept', 'reject'].indexOf(name) < 0) return;
    H.act('POST', '/multi-duels/' + id + '/' + name, undefined, function (d) { if (name === 'accept') H.open('multi', d.id); else H.refresh(); });
  }
  function one() { if (!ready()) return; hh(); H.pick1v1(S().pickModo); }

  window.SEQMulti = {
    render: render, row: row, pendingCount: pendingCount,
    startPick: startPick, toggle: toggle, create: create, action: action, listAction: listAction, one: one,
    core: { ordinal: ordinal, playerStatus: playerStatus, pendingCount: pendingCount, outcome: outcome, categoryTitle: categoryTitle, phraseFor: phraseFor, MIN_PLAYERS: MIN_PLAYERS, MAX_PLAYERS: MAX_PLAYERS }
  };
})();
