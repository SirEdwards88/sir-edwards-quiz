// SirEdwards Quiz 2.4 — Duelo online MÚLTIPLE (3 a 4 jugadores, en directo).
//
// Módulo aparte para no engordar duels.js: este archivo solo PINTA y manda acciones. El servidor (/multi-duels) es la única
// autoridad de preguntas, tiempos, corrección, puntos y clasificación; aquí no se calcula nada de eso.
// Se apoya en duels.js (estado S, sondeo, reloj, respuesta, bloque de pregunta) a través de los ayudantes `H` que éste le pasa:
// pantallas 'pickkind' (1 vs 1 / Múltiple), 'multipick' (elegir 2 o 3 amigos) y 'multi' (sala, partida y final).
// No cuenta para ELO, estadísticas ni logros del Duelo 1 vs 1 (no se llama a registerOnlineDuelResult).
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
      return { res: 'win', margin: second.length ? Math.max(0, mine - Math.max.apply(null, second)) : 0, pos: pos, n: list.length, winner: '' };
    }
    var w = top.filter(function (x) { return !x.es_yo; })[0];
    return { res: 'loss', margin: Math.max(0, best - mine), pos: pos, n: list.length, winner: w ? String(w.display_name || '') : '' };
  }
  // Título de la categoría, igual que en el 1 vs 1: aplastante (8 o más), por la mínima (2 o menos) o clara.
  function categoryTitle(o) {
    if (o.res === 'gone') return 'Retirada';
    if (o.res === 'draw') return 'Empate en cabeza';
    var big = o.margin >= 8, close = o.margin <= 2;
    if (o.res === 'win') return big ? 'Victoria aplastante' : close ? 'Victoria por la mínima' : 'Victoria clara';
    return big ? 'Derrota sin paliativos' : close ? 'Derrota por la mínima' : 'Derrota clara';
  }
  // Frases de Sir Edwards para varios jugadores (las del 1 vs 1 hablan de «el rival», aquí hay una mesa entera).
  // Estables por sala y categoría: el mismo duelo siempre enseña la misma frase. {nombre} es el ganador.
  var PHRASES = {
    win_close: ['Victoria por la mínima. Los demás aún discuten el recuento.', 'Has ganado por un suspiro. Presume en voz baja.', 'La mesa estuvo a un paso de coronar a otro. Un paso muy corto.', 'Has ganado por un margen que desaconseja cualquier celebración prolongada.', 'Una victoria diminuta sigue siendo una victoria. Qué alivio.', 'Tu ventaja cabe en una servilleta. Los demás ya estudian reclamarla.', 'La victoria ha sido tuya por un margen poco decoroso.', 'La celebración puede ser privada. El resultado, por desgracia, no.', 'La victoria ha sido tuya. La diferencia recomienda no recrearse.'],
    win_clear: ['Victoria clara. La mesa tomará nota, aunque no de buena gana.', 'Has ganado con holgura. A los demás les queda el consuelo de la estadística.', 'La diferencia es respetable. Los comentarios de la mesa, previsiblemente, también.', 'Los demás han competido con entusiasmo. El resultado ha sido menos entusiasta.', 'Tu victoria no admite demasiadas interpretaciones. Qué inconveniente para algunos.', 'Has ganado con aplomo. La modestia queda a tu elección.', 'La seguridad con que han jugado los demás no ha encontrado respaldo suficiente.', 'Has puesto orden en la mesa. No te acostumbres a tanta obediencia.'],
    win_big: ['Una ventaja así roza la descortesía. Sir Edwards lo aprueba.', 'La mesa entera merece una disculpa. No pienses darla.', 'Has dejado la competición en un estado puramente decorativo.', 'Has convertido la competición en un trámite de cortesía.', 'Una diferencia así convierte el suspense en un recuerdo lejano.', 'Los demás han venido a jugar. Tú parecías tener otros planes.', 'Sir Edwards considera innecesario organizar una ceremonia de consolación.', 'La mesa entera ha recibido una clase magistral. La matrícula, por desgracia, era obligatoria.'],
    draw: ['Empate en cabeza. La gloria admite compañía; el mérito, discusiones.', 'Cabeza compartida. El trono se reparte, aunque nadie lo desea.', 'Sir Edwards no firma empates, pero hoy hará una excepción.', 'El primer puesto se comparte. La satisfacción, por lo visto, no.', 'Nadie reina hoy. La mesa puede dormir tranquila.', 'Mismo resultado, mérito compartido y vanidad sin privilegios.', 'La corona tiene varios dueños. Su convivencia promete ser interesante.', 'El empate es justo. Que resulte satisfactorio ya es otra cuestión.', 'Más de una persona en lo más alto. La diplomacia empieza ahora.'],
    // Según el puesto (solo en derrotas que no son aplastantes; se suman a las de la diferencia).
    pos2: ['Segundo puesto. El primero ya tiene el discurso preparado.', 'La gloria tenía sitio para uno. Hoy no te ha correspondido.', 'La plata tiene su mérito. El oro, curiosamente, tiene más.', 'Has llegado a la conversación importante. La última palabra la tiene otro.', 'Has sido el mejor de los que no han ganado.', 'Sir Edwards aprecia tu ambición. El marcador, algo menos.', 'La victoria se te ha escapado. Procura no perder también la ambición.', 'El segundo puesto tiene una ventaja: sabes exactamente a quién superar.'],
    pos3: ['Has subido al podio. La historia será menos generosa.', 'Tercer puesto. Una posición discretamente incómoda.', 'No has ganado, pero tampoco tendrás que dar explicaciones a todos.', 'Dos te han superado. Conviene recordar quiénes.', 'El bronce no se pule. Se tolera.', 'Hay motivos para celebrar. La discreción es uno de ellos.', 'Has quedado a medio camino entre la gloria y el olvido. Con buenas vistas.', 'Sir Edwards considera que aún hay margen para una actuación más memorable.', 'Has terminado entre los primeros. La precisión exige no exagerar.'],
    pos4: ['Alguien tenía que cerrar la clasificación. Has sido muy generoso.', 'Último puesto. La elegancia está en cómo se afronta.', 'La mesa ha quedado ordenada. Tú has puesto el punto final.', 'Ha sido memorable, aunque no por los motivos habituales.', 'Sir Edwards propone pasar página. Preferiblemente, de esta partida.', 'El marcador no admite reclamaciones. Ya lo he comprobado.', 'Has dejado el podio intacto. Un gesto de consideración.', 'Los puestos de honor ya tienen dueño. Has cedido el paso con generosidad.'],
    loss_close: ['Por muy poco. {nombre} se lleva la victoria; tú, una historia incómoda.', 'Derrota por la mínima. La diferencia ha sido pequeña; el desenlace, no.', '{nombre} ha celebrado primero. Tú todavía estás calculando dónde se escapó.', 'La victoria ha pasado cerca. No parece que tuviera intención de detenerse.', 'Un par de puntos más y hoy tendrías otra tarjeta.', 'Has estado a punto de cambiar el desenlace. El resultado no contempla los intentos.', 'La mesa recordará lo ajustado del resultado. Tú, probablemente, también.', 'Te ha faltado muy poco. Una cantidad extraordinariamente inoportuna.'],
    loss_clear: ['{nombre} ha ganado con claridad. Tú has participado, que también cuenta.', '{nombre} ha tomado la delantera. Tú has tenido ocasión de observarlo.', 'La distancia es apreciable. Se llama perspectiva y rara vez gusta.', 'Hoy no has marcado el ritmo. Al menos, has seguido la conversación.', 'Ya hay alguien a quien felicitar. Tu intervención puede ser breve.', '{nombre} ha resuelto mejor el examen. No hace falta levantar acta.', 'El resultado es claro. Tu siguiente actuación tendrá margen de mejora.', 'El resultado se ha pronunciado. {nombre} ha defendido mejor su candidatura.'],
    loss_big: ['{nombre} ha ganado con tanta ventaja que conviene no hacer cuentas.', 'Derrota sin paliativos. Sir Edwards sugiere cambiar de tema.', 'La distancia ha sido notable. Procura que la revancha resulte más interesante.', 'Hoy has aprendido mucho. Principalmente, cuánto te queda por aprender.', 'La diferencia habla por sí sola. No necesita una segunda declaración.', 'No ha sido tu mejor partida. Compartirla queda a tu criterio.', '{nombre} ha ganado sin esfuerzo aparente. Tú has aportado contexto.', 'Una revisión del temario sería prudente antes de la próxima convocatoria.'],
    gone: ['Te has ido a medias. Quedas el último, como manda la lógica.', 'La partida ha continuado sin ti. No estaba obligada a esperarte.', 'Retirarse a tiempo es una virtud. A mitad de partida, solo una duda.', 'Has abandonado la mesa. La mesa, curiosamente, ha seguido adelante.', 'La retirada ha sido apresurada. La elegancia, discutible.', 'Te has marchado antes del desenlace. Qué confianza en la imaginación ajena.', 'Abandonar es una decisión. Las consecuencias también lo son.', 'Sir Edwards toma nota de tu salida. No consta que la celebre.', 'El marcador no ha solicitado explicaciones. Qué considerado.', 'Has dejado la partida sin desenlace. Los demás han tenido que escribirlo.']
  };

  function hashStr(t) { var h = 0; t = String(t); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }
  function phraseFor(o, seedId) {
    var key = o.res === 'gone' ? 'gone' : o.res === 'draw' ? 'draw' : o.res + '_' + (o.margin >= 8 ? 'big' : o.margin <= 2 ? 'close' : 'clear');
    var list = PHRASES[key] || PHRASES.draw;
    // Derrota que no es aplastante: además de las de la diferencia entran las del puesto (2.º, 3.º y 4.º solo con cuatro jugadores).
    if (o.res === 'loss' && o.margin < 8) {
      var pk = o.pos === 2 ? 'pos2' : o.pos === 3 ? 'pos3' : (o.pos === 4 && o.n >= 4) ? 'pos4' : '';
      if (pk) list = list.concat(PHRASES[pk]);
    }
    var name = String(o.winner || 'Otro jugador').slice(0, 18);
    return list[hashStr(seedId + ':' + key + ':' + o.pos) % list.length].replace(/\{nombre\}/g, name);
  }

  // En partida el múltiple no se anuncia: título y botón de salida iguales a los del 1 vs 1.
  function isReto(d) { return !!(d && d.tipo === 'reto_multi'); }
  // El Duelo no lleva título arriba (la tarjeta ya dice si es clásico o por apuestas); el Reto sí.
  function gameTitle(d) { return isReto(d) ? H.ico('retos') + 'Reto' : ''; }
  function exitText(d) { return isReto(d) ? '← Retos' : '← Duelo online'; }

  // ---- Pintado --------------------------------------------------------------------------------
  var H = null;
  function esc(s) { return H.esc(s); }
  function num(v) { return H.num(v); }
  function S() { return H.S; }

  function sel() { var s = S(); if (!s.multiSel) s.multiSel = []; return s.multiSel; }

  function renderKind() {
    var reto = S().pickKind === 'reto';
    var stakes = !reto && S().pickModo === 'stakes';
    var back = H.backToList;
    var h = H.header(reto ? 'Reto' : stakes ? 'Duelo por apuestas' : 'Duelo clásico', 'Elige cómo jugar', back);
    function card(img, title, sub, act, off) {
      var ic = '<span class="seq-m-opt-ic" aria-hidden="true"><img src="assets/duelos/formato/' + img + '.webp" alt="" draggable="false" onerror="this.remove()"></span>';
      var body = '<div class="seq-m-opt-body"><div class="seq-m-opt-title">' + title + '</div><div class="seq-m-opt-sub">' + sub + '</div></div>';
      if (off) return '<div class="seq-m-opt seq-d-off" aria-disabled="true">' + ic + body + '</div>';
      return '<div class="seq-m-opt" role="button" tabindex="0" onclick="' + act + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + act + '}">' + ic + body + '<span class="seq-m-opt-go" aria-hidden="true">›</span></div>';
    }
    var one = card('uno-contra-uno', '1 vs 1', reto ? 'Un amigo, a su ritmo.' : 'Un amigo, cara a cara.', 'SEQMulti.one()');
    var ft = (H.features && H.features()) || {}, served = reto ? ft.multi_reto : ft.multi_duel;
    var multi = !served
      ? card('multiple', 'Múltiple', 'Muy pronto.', '', true)
      : (stakes && !STAKES_READY)
      ? card('multiple', 'Múltiple', 'Muy pronto. Sir Edwards aún afila las apuestas.', '', true)
      : card('multiple', 'Múltiple', 'De ' + MIN_PLAYERS + ' a ' + MAX_PLAYERS + ' jugadores.' + (reto ? ' A su ritmo.' : ''), 'SEQMulti.startPick()');
    return h + '<div class="seq-m-opts">' + one + multi + '</div>';
  }

  function renderPickPlayers() {
    var s = S(), fl = s.lists.friends, chosen = sel();
    var reto = s.pickKind === 'reto';
    var h = H.header('Elige a tus rivales', reto ? 'Reto múltiple' : (s.pickModo === 'stakes' ? 'Duelo por apuestas' : 'Duelo clásico') + ' · múltiple', function () { s.screen = 'pickkind'; H.render(); });
    h += reto ? '<p class="stats-section-sub">Elige a ' + (MIN_PLAYERS - 1) + ' o ' + (MAX_PLAYERS - 1) + ' amigos. Tienen 3 días para jugar.</p>'
      : '<p class="stats-section-sub">Elige a ' + (MIN_PLAYERS - 1) + ' o ' + (MAX_PLAYERS - 1) + ' amigos en línea.</p>';
    if (!fl) return h + '<p class="stats-section-sub">Cargando…</p>';
    if (!fl.friends.length) return h + H.emptyState('vacio-amigos', 'Aún no tienes amigos', 'Añádelos para poder retarlos.', '<button class="btn btn-primary" onclick="SEQDuels.open(\'friends\')">Añadir amigos</button>');
    var on = reto ? fl.friends : fl.friends.filter(H.isOnline), off = reto ? [] : fl.friends.filter(function (f) { return !H.isOnline(f); });
    h += '<h3 class="seq-d-h3">' + (reto ? 'Amigos' : 'En línea') + ' (' + num(on.length) + ')</h3>';
    h += on.length ? '<div class="history-list">' + on.map(function (f) {
      var p = H.player(f.player), picked = chosen.indexOf(p.id) >= 0, full = !picked && chosen.length >= MAX_PLAYERS - 1;
      return '<div class="history-item seq-d-row seq-pl-row seq-m-friend' + (picked ? ' seq-m-on' : '') + (full ? ' seq-d-off' : '') + '" role="checkbox" aria-checked="' + (picked ? 'true' : 'false') + '"' + (full ? ' aria-disabled="true"' : ' tabindex="0" onclick="SEQMulti.toggle(\'' + p.id + '\')" onkeydown="if(event.key===\'Enter\')SEQMulti.toggle(\'' + p.id + '\')"') + '>' +
        H.who(p, reto ? '' : '<span class="seq-d-on">● En línea</span>') + '<div class="history-item-score seq-m-check">' + (picked ? H.ico('correcto') : '') + '</div></div>';
    }).join('') + '</div>' : '<p class="stats-section-sub">No tienes amigos en línea.</p>';
    if (off.length) h += '<h3 class="seq-d-h3">Sin conexión (' + num(off.length) + ')</h3><div class="history-list">' + off.map(function (f) {
      return '<div class="history-item seq-d-row seq-pl-row seq-d-off" aria-disabled="true">' + H.who(H.player(f.player), 'Sin conexión') + '</div>';
    }).join('') + '</div>';
    var ok = chosen.length >= MIN_PLAYERS - 1 && chosen.length <= MAX_PLAYERS - 1;
    h += '<div class="seq-m-bar"><button class="btn btn-primary" style="width:100%;"' + (ok ? '' : ' disabled') + ' onclick="SEQMulti.' + (reto ? 'next' : 'create') + '()">' + (ok ? (reto ? 'Elegir el modo · ' : 'Crear sala · ') + (chosen.length + 1) + ' jugadores' : 'Elige al menos ' + (MIN_PLAYERS - 1) + ' amigos') + '</button></div>';
    return h;
  }

  // Marcador compacto de todos durante la partida: puesto, avatar, nombre corto y puntos.
  function chips(d, helpers) {
    if (helpers) H = helpers;
    var m = d.marcador; if (!m || !m.jugadores) return '';
    var by = {}; (d.jugadores || []).forEach(function (j) { by[j.id] = j; });
    var rows = m.jugadores.slice().sort(function (a, b) { return (num(a.posicion) || 9) - (num(b.posicion) || 9); });
    return '<div class="seq-m-board" aria-label="Marcador">' + rows.map(function (r) {
      var j = by[r.id]; if (!j) return '';
      var p = H.player(j);
      return '<div class="seq-m-chip' + (j.es_yo ? ' me' : '') + (r.abandonado ? ' gone' : '') + '"><span class="seq-m-pos">' + esc(ordinal(r.posicion)) + '</span><span class="seq-m-av">' + p.avatar + '</span><span class="seq-m-nm">' + (j.es_yo ? 'Tú' : p.name) + '</span><b class="seq-m-pts">' + (r.puntos == null ? '·' : num(r.puntos)) + '</b></div>';
    }).join('') + '</div>';
  }

  function playersList(d, go) {
    return '<div class="history-list seq-m-players">' + (d.jugadores || []).map(function (j) {
      var st = go && j.estado === 'aceptado' ? 'Listo' : playerStatus(j, d.estado), good = j.estado === 'aceptado' && (go || d.estado === 'pendiente' || j.listo);
      return '<div class="history-item seq-pl-row">' + H.who(H.player(j), (j.es_yo ? 'Tú · ' : '') + (good ? H.ico('correcto') : j.estado === 'rechazado' || j.estado === 'fuera' ? H.ico('incorrecto') : H.ico('mediocre')) + esc(st)) + '</div>';
    }).join('') + '</div>';
  }

  function accepted(d) { return (d.jugadores || []).filter(function (j) { return j.estado === 'aceptado'; }).length; }

  function renderRoom(d) {
    var h = H.gameHeader(gameTitle(d), 'SEQDuels.leaveDuel()');
    var s = S(), now = H.serverNow();
    if (!d) return h + '<p class="stats-section-sub">Cargando…</p>';
    var mine = d.yo || {}, creator = d.soy === 'creador';

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
    if (now < t0) { s.shown = null; return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Empieza en <span id="seq-d-count"></span>…</div>' + playersList(d, true) + '</div>'; }
    try { SEQLevelUp.markKey('multi:' + d.id); } catch (e) {}
    if (mine.abandonado) { s.shown = null; return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Has salido de la partida</div><p class="duel-result-hint">Quedas el último. Los demás siguen sin ti.</p></div>'; }
    if (d.modo === 'stakes' && window.SEQMultiStakes && !mine.completado) { s.shown = null; return SEQMultiStakes.play(d, H, chips); }
    var k = H.classicWin(d, now).k; s.lastIdx = k;
    if (mine.completado) { s.shown = null; return head + chips(d) + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Has terminado. Nadie ha aplaudido.</div><p class="duel-result-hint">Esperando a los demás…</p></div>'; }
    if (!d.preguntas || d.preguntas.length <= k) { s.shown = null; return head + '<p class="stats-section-sub">Cargando pregunta…</p>'; }
    var rs = null; (mine.respuestas || []).forEach(function (a) { if (num(a.indice) === k) rs = a; });
    H.topbarShown(false);
    var h = '<div class="seq-d-toprow"><button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.leaveDuel()">' + exitText(d) + '</button></div>' +
      '<div id="seq-d-msg" class="feedback" style="display:none;"></div>' +
      '<div class="mode-header game-hud seq-d-hud seq-d-hud-reto"><span class="seq-d-hud-lbl"><span class="seq-d-hud-mode" title="' + (isReto(d) ? 'Reto' : 'Duelo clásico') + '"><img class="seq-ico seq-d-mode-ico" src="assets/modes/emblema/duelo-clasico.webp" alt="" draggable="false"></span>' + (k + 1) + '/' + num(d.n_preguntas || 20) + '</span>' +
      '<span class="seq-d-hud-right"><span class="seq-d-hud-time">' + H.ico('tiempo') + '<span id="seq-d-time"></span>s</span></span></div>' +
      chips(d) + '<div class="progress-bar"><div id="seq-d-bar" class="bar-fill"></div></div>' +
      H.questionBlock(d.id, k, d.preguntas[k], rs, false);
    return h + (rs ? '<p class="stats-section-sub seq-d-next">Siguiente pregunta en cuanto respondan todos o acabe el tiempo.</p>' : '');
  }

  // Tarjeta final: misma familia que la de Duelo (.results-card / .seq-d-final), con la clasificación completa.
  function renderEnd(d, reto) {
    H.topbarShown(false);
    var back = reto ? "SEQDuels.open('retos')" : "SEQDuels.open('duels')", backTxt = reto ? 'Volver a Retos' : 'Volver a Duelos';
    var head = H.gameHeader(gameTitle(d), back);
    var r = d.resultado;
    if (!r && reto) {
      var whyR = { cancelado: d.motivo_fin === 'todos_rechazan' ? 'Todos rechazaron el reto. Qué manera de dejarte solo.' : 'Reto cancelado. Aquí no ha pasado nada.', expirado: 'Pasó el plazo y nadie jugó. Sir Edwards no ha visto nada que comentar.' }[d.estado] || 'Reto cerrado.';
      return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + (d.estado === 'expirado' ? 'Caducado' : 'Cancelado') + '</div><p class="duel-result-hint">' + esc(whyR) + '</p><button class="btn btn-secondary" style="width:100%;" onclick="' + back + '">' + backTxt + '</button></div>';
    }
    if (!r) {
      var why = { cancelado: d.motivo_fin === 'sin_listos' ? 'Nadie llegó a tiempo a la sala de espera. Mucha ilusión, poca puntualidad.' : d.motivo_fin === 'sin_jugadores' ? 'Se fueron los jugadores. Sir Edwards guarda las copas.' : 'Sala cancelada. Aquí no ha pasado nada.', expirado: 'Las invitaciones caducaron sin suficientes valientes.' }[d.estado] || 'Sala cerrada.';
      return head + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">' + (d.estado === 'expirado' ? 'Caducada' : 'Cancelada') + '</div><p class="duel-result-hint">' + esc(why) + '</p><button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.open(\'duels\')">Volver a Duelos</button></div>';
    }
    var mine = d.yo || {};
    var o = outcome(r, !!mine.abandonado);
    var res = o.res === 'win' ? 'win' : o.res === 'draw' ? 'draw' : 'loss';
    H.resultSoundOnce(reto ? 'mreto' : 'multi', d, res);
    var charKey = res === 'win' ? 'victory' : res === 'loss' ? 'defeat' : 'empate';
    var big = o.margin >= 8;
    var moodSrc = res === 'win' ? (big ? 'assets/ui/sombrero-laurel.webp' : 'assets/ui/copa.webp') : res === 'loss' ? (big ? 'assets/ui/sombrero-aplastado.webp' : 'assets/ui/bandera-blanca.webp') : 'assets/modes/amigos.webp';
    var cat = categoryTitle(o);
    var xp = H.xpFor(reto ? 'reto' : 'duel', d, mine.aciertos); H.syncXpOnce(reto ? 'reto' : 'multi', d, xp);
    var tone = res === 'win' ? 'tone-win' : res === 'loss' ? 'tone-fail' : 'tone-bien';
    var rows = (r.clasificacion || []).map(function (x) {
      var p = H.player(x);
      return '<div class="seq-m-row' + (x.es_yo ? ' me' : '') + (x.posicion === 1 ? ' first' : '') + (x.abandonado || x.jugo === false ? ' gone' : '') + '"><span class="seq-m-rpos">' + esc(ordinal(x.posicion)) + '</span><span class="seq-m-av">' + p.avatar + '</span><span class="seq-m-rname">' + (x.es_yo ? 'Tú' : p.name) + (x.abandonado ? ' <i>(se fue)</i>' : x.jugo === false ? ' <i>(no jugó)</i>' : '') + '</span><b class="seq-m-pts">' + (x.jugo === false ? '—' : num(x.puntuacion)) + '</b></div>';
    }).join('');
    var chipsXp = xp > 0 ? '<div class="results-mode-chips show">' + H.xpChipHtml(xp) + '</div>' : '';
    var stamp = ({ win: ['VICTORIA', 'gold'], loss: ['DERROTA', 'fail'], draw: ['EMPATE', 'ok'] })[res];
    var h = '<div class="results-card seq-d-results seq-d-final seq-m-final duel-result-box ' + (res === 'win' ? 'duel-result-win' : res === 'loss' ? 'duel-result-loss' : 'duel-result-draw') + '" data-tier="' + (res === 'win' ? 'oro' : res === 'loss' ? 'derrota' : 'azul') + '">' +
      '<div class="results-character show char-' + (res === 'draw' ? 'neutral' : charKey) + '" aria-hidden="true"><picture><source srcset="assets/character/' + charKey + '.webp" type="image/webp"><img src="assets/character/' + charKey + '.webp" alt="" draggable="false"></picture></div>' +
      '<h3 class="seq-d-res-title">' + (reto ? 'Reto · ' + esc(H.retoModeName(d)) : d.modo === 'stakes' ? 'Duelo por apuestas' : 'Duelo clásico') + '</h3>' +
      ((xp > 0 && window.SEQLevelUp) ? SEQLevelUp.htmlFor((reto ? 'mreto:' : 'multi:') + d.id) : '') +
      (reto ? '' : '<div class="seq-m-unit">' + (d.modo === 'stakes' ? 'Puntos' : 'Aciertos') + '</div>') + '<div class="seq-m-rank" role="list">' + rows + '</div>' +
      '<div class="results-phrase-container ' + tone + '"><div class="results-mood-icon has-img"><img class="mood-img" src="' + moodSrc + '" alt="" draggable="false"></div>' +
      '<div class="results-category-title">' + esc(cat) + '</div>' +
      '<div class="results-phrase duel-result-phrase">' + esc(phraseFor(o, d.id)) + '</div></div>' + chipsXp + (reto || !H.medalsBlock ? '' : H.medalsBlock('multi:' + d.id)) +
      '<div class="results-lucidez-stamp show"><span class="stamp-badge tone-' + stamp[1] + '">' + stamp[0] + '</span></div>' +
      '<div class="results-actions">' +
      (!reto && d.soy === 'creador' ? '<button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="SEQMulti.action(\'rematch\')">' + H.ico('revancha') + 'Revancha</button>' : '') +
      '<button class="btn btn-share btn-share-quiet" style="width:100%;margin-top:8px;" onclick="SEQDuels.shareResult()">' + H.ico('compartir') + 'Compartir resultado</button>' +
      '<button type="button" class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="' + back + '">' + backTxt + '</button></div></div>';
    return head + h;
  }

  // ---- Reto múltiple (2.5): pantallas de la sala; la partida de cada uno es la misma de un Reto 1 vs 1 (duels.js) ----
  function retoStatus(j, d) {
    if (j.estado === 'rechazado') return 'Ha rechazado';
    if (j.estado === 'invitado') return 'Sin responder';
    if (j.terminado) return 'Ya ha jugado';
    if (j.empezado) return 'Jugando…';
    return j.es_creador && d.estado === 'pendiente' ? 'Ha creado el reto' : 'Aún no ha jugado';
  }
  function retoPlayers(d) {
    return '<div class="history-list seq-m-players">' + (d.jugadores || []).map(function (j) {
      var good = j.terminado, bad = j.estado === 'rechazado';
      return '<div class="history-item seq-pl-row">' + H.who(H.player(j), (j.es_yo ? 'Tú · ' : '') + (good ? H.ico('correcto') : bad ? H.ico('incorrecto') : H.ico('mediocre')) + esc(retoStatus(j, d))) + '</div>';
    }).join('') + '</div>';
  }
  // Devuelve el HTML de la pantalla, o null cuando hay que jugar (entonces pinta la partida el Reto de siempre).
  function renderMReto(d, helpers, head) {
    H = helpers;
    if (d.estado === 'completado' || d.estado === 'cancelado' || d.estado === 'expirado') return renderEnd(d, true);
    var now = H.serverNow(), y = d.yo || {}, creator = d.soy === 'creador', cad = H.left(num(d.expira_at) - now);
    var box = '<div class="duel-result-box duel-result-neutral">', host = (d.jugadores || []).filter(function (j) { return j.es_creador; })[0] || {};
    var h = head + '<p class="stats-section-sub seq-d-vs">Reto múltiple · ' + num((d.jugadores || []).length) + ' jugadores</p>' + H.modeLine(d);
    var btns = '<button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.retoAction(\'accept\')">Aceptar</button> <button class="btn btn-secondary" style="width:100%;margin-top:8px;" onclick="SEQDuels.retoAction(\'reject\')">Rechazar</button>';
    if (y.invitacion === 'rechazado') return h + box + '<div class="duel-result-title">Has rechazado este reto</div><p class="duel-result-hint">Sir Edwards toma nota. Los demás siguen sin ti.</p>' + retoPlayers(d) + '</div>';
    if (y.invitacion === 'invitado') {
      return h + box + '<div class="duel-result-title">' + H.player(host).name + ' te ha retado</div><p class="duel-result-hint">Caduca en ' + esc(cad) + '. Después, cada uno juega cuando pueda.</p>' + retoPlayers(d) + btns + '</div>';
    }
    if (d.estado === 'pendiente') {
      return h + box + '<div class="duel-result-title">Esperando respuestas…</div><p class="duel-result-hint">Caduca en ' + esc(cad) + '. En cuanto uno acepte, podréis jugar.</p>' + retoPlayers(d) +
        (creator ? '<button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.retoAction(\'cancel\')">Cancelar reto</button>' : '') + '</div>';
    }
    if (y.terminado) {
      var xp = H.xpFor('reto', d, y.aciertos); H.syncXpOnce('reto', d, xp);
      var cnt = num(y.aciertos) + (d.modo && d.modo !== 'estandar' ? (num(y.aciertos) === 1 ? ' acierto' : ' aciertos') : '/' + num(d.n_preguntas || 20));
      return h + box + '<div class="duel-result-title">Tu parte está hecha: ' + cnt + '</div><p class="duel-result-hint">' + (xp ? '+' + xp + ' XP ya en tu cuenta. ' : '') + 'La clasificación llegará cuando hayan jugado todos o termine el plazo. Quedan ' + esc(cad) + '.</p>' + retoPlayers(d) + '<button class="btn btn-secondary" style="width:100%;" onclick="SEQDuels.reload()">Actualizar</button></div>';
    }
    if (!y.empezado) {
      return h + box + '<div class="duel-result-title">Tu turno, aspirante.</div><p class="duel-result-hint">Te quedan ' + esc(cad) + ' para jugar tu parte. Una vez empieces, no hay pausa.</p>' + retoPlayers(d) + '<button class="btn btn-primary" style="width:100%;" onclick="SEQDuels.retoAction(\'start\')">Jugar mi parte</button></div>';
    }
    return null;
  }
  function pendingCountMReto(list) {
    var n = 0;
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (!x) return;
      if (x.mi_estado === 'invitado' && (x.estado === 'pendiente' || x.estado === 'aceptado')) n++;
      else if (x.estado === 'aceptado' && x.mi_estado === 'aceptado' && x.yo && !x.yo.terminado) n++;
    });
    return n;
  }
  function rowReto(x, helpers) {
    H = helpers || H;
    var js = (x.jugadores || []).filter(function (j) { return !j.es_yo; });
    var p = H.player(js[0] || {}), id = H.safeId(x.id), n = (x.jugadores || []).length;
    var who = { name: p.name + (js.length > 1 ? ' +' + (js.length - 1) : ''), avatar: p.avatar, id: p.id };
    var sub = 'Reto múltiple · ' + n + ' jugadores', btns = '';
    if (x.mi_estado === 'invitado' && (x.estado === 'pendiente' || x.estado === 'aceptado')) {
      sub = '¡Te han retado a un reto múltiple!';
      btns = '<button class="btn btn-primary seq-d-sm" onclick="event.stopPropagation();SEQDuels.listAction(\'mreto\',\'' + id + '\',\'accept\')">Aceptar</button> <button class="btn btn-secondary seq-d-sm" onclick="event.stopPropagation();SEQDuels.listAction(\'mreto\',\'' + id + '\',\'reject\')">Rechazar</button>';
    } else if (x.estado === 'pendiente') sub = 'Reto múltiple · esperando respuestas';
    else if (x.estado === 'aceptado') sub = x.yo && x.yo.terminado ? 'Reto múltiple · esperando a los demás' : '¡Te toca jugar!';
    else if (x.estado === 'completado' && x.resultado) sub = 'Múltiple · ' + ordinal(x.resultado.mi_posicion) + ' de ' + num(x.resultado.n_jugadores) + ' · ' + num(x.resultado.mi_puntuacion) + ' aciertos';
    else if (x.estado === 'cancelado') sub = 'Reto múltiple · cancelado';
    else if (x.estado === 'expirado') sub = 'Reto múltiple · caducado';
    if (x.modo && x.estado !== 'completado') sub = H.retoModeName(x) + ' · ' + sub;
    return '<div class="history-item seq-d-row seq-pl-row" onclick="SEQDuels.open(\'mreto\',\'' + id + '\')">' + H.who(who, esc(sub)) + (btns ? '<div class="seq-pl-act seq-pl-act-full">' + btns + '</div>' : '') + '</div>';
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
  function one() { if (!ready()) return; hh(); H.pick1v1(S().pickKind === 'reto' ? 'reto' : 'duel', S().pickModo); }
  function next() { if (!ready()) return; hh(); var c = sel(); if (c.length >= MIN_PLAYERS - 1 && c.length <= MAX_PLAYERS - 1) H.pickModeMulti(c.slice()); }

  function shareText(d) {
    var r = d && d.resultado; if (!r || !r.clasificacion) return '';
    var rows = r.clasificacion.map(function (x) { return ordinal(x.posicion) + ' ' + String(x.display_name || 'Jugador') + ' · ' + (Math.floor(Number(x.puntuacion)) || 0); });
    return (d.tipo === 'reto_multi' ? 'Reto múltiple' : 'Duelo múltiple') + ' en SirEdwards Quiz' + (d.modo === 'stakes' ? ' (por apuestas)' : '') + '\n' + rows.join('\n') + '\nSir Edwards lo ha visto todo.';
  }
  // Datos para la imagen de compartir (SEQShareCard): clasificación, frase y desenlace que ya decidió el servidor.
  function shareInput(d, helpers) {
    var HH = helpers || H, r = d && d.resultado; if (!r || !r.clasificacion) return null;
    var o = outcome(r, !!(d.yo && d.yo.abandonado)), reto = isReto(d);
    var res = o.res === 'win' ? 'win' : o.res === 'draw' ? 'draw' : 'loss';
    return { kind: reto ? 'reto' : 'duel', result: res, myScore: Math.floor(Number(r.mi_puntuacion)) || 0, opponentScore: 0,
      modeLabel: reto ? HH.retoModeName(d) : d.modo === 'stakes' ? 'por apuestas' : 'clásico',
      unit: reto ? '' : d.modo === 'stakes' ? 'Puntos' : 'Aciertos', phrase: phraseFor(o, d.id), place: Math.floor(Number(r.mi_posicion)) || 0,
      ranking: r.clasificacion.map(function (x) { var p = HH.player(x); return { pos: x.posicion, name: x.display_name || 'Jugador', avatar: x.avatar, score: x.puntuacion, me: !!x.es_yo, gone: !!(x.abandonado || x.jugo === false) }; }) };
  }
  window.SEQMulti = { board: chips, shareInput: shareInput, shareText: shareText, renderMReto: renderMReto, rowReto: rowReto, pendingCountMReto: pendingCountMReto, next: next, 
    render: render, row: row, pendingCount: pendingCount,
    startPick: startPick, toggle: toggle, create: create, action: action, listAction: listAction, one: one,
    core: { ordinal: ordinal, playerStatus: playerStatus, pendingCount: pendingCount, outcome: outcome, categoryTitle: categoryTitle, phraseFor: phraseFor, MIN_PLAYERS: MIN_PLAYERS, MAX_PLAYERS: MAX_PLAYERS }
  };
})();
