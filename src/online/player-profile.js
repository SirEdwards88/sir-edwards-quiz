// SirEdwards Quiz 2.3 — ficha pública de un jugador (resumen: precisión, récords por modo y PvP).
//
// Se abre desde Amigos, desde los Rankings y desde la búsqueda, y lleva las acciones de amistad (enviar solicitud,
// aceptar/rechazar, cancelar). Solo presenta lo que devuelve el servidor en GET /players/:id (ver src/profile.js del
// backend). Un dato que falta llega como null y se muestra como «—», nunca como un cero inventado.
// Estética: la de los Rankings (tarjeta dorada, iconos de ranking, insignia de rango); estilos .seq-pf* en styles/online.css.
//
// No pinta nada por su cuenta: devuelve el HTML de la pantalla 'profile' de src/online/duels.js, que lo inserta.
// Todo texto del servidor pasa por esc()/num()/player() de duels.js; los IDs dentro de onclick, por safeId().
// Script clásico; se carga después de duels.js.
(function () {
  'use strict';

  var P = { id: '', data: null, err: '', loading: false, from: 'friends', busy: false, seq: 0 };

  function H() { return window.SEQDuels && window.SEQDuels._h; }
  function esc(s) { return H().esc(s); }
  function num(v) { return H().num(v); }
  function safeId(id) { return typeof id === 'string' && /^[0-9A-Z]{10}$/.test(id) ? id : ''; }
  function dash(v, suffix) { return v === null || v === undefined ? '—' : num(v) + (suffix || ''); }
  function pct(v) { return typeof v === 'number' && isFinite(v) ? String(Math.round(v * 10) / 10).replace('.', ',') + ' %' : '—'; }
  function level(xp) { try { return typeof getLevelData === 'function' ? getLevelData(num(xp)) : null; } catch (e) { return null; } }

  function open(id, from) {
    id = safeId(id);
    if (!id || !window.SEQDuels) return;
    var st = window.SEQDuels._state();
    P = { id: id, data: null, err: '', loading: true, from: from || st.screen || 'friends', busy: false, seq: P.seq + 1 };
    window.SEQDuels.open('profile');
  }
  function load() {
    var id = P.id, seq = ++P.seq;
    if (!id) return;
    P.loading = true; P.err = '';
    H().call('GET', '/players/' + id).then(function (d) {
      if (seq !== P.seq) return;
      P.loading = false; P.data = d; window.SEQDuels.rerender();
    }).catch(function (e) {
      if (seq !== P.seq) return;
      P.loading = false; P.err = e && e.status === 404 ? 'Esta ficha no está disponible. Sir Edwards guarda ciertos secretos.' : H().errText(e);
      window.SEQDuels.rerender();
    });
  }
  function back() {
    P.seq++;
    var to = P.from && P.from !== 'profile' ? P.from : 'friends';
    // Pantallas con un ID propio (una partida) no se reabren desde aquí: se vuelve a su lista.
    if (to === 'duel') to = 'duels'; else if (to === 'reto') to = 'retos';
    window.SEQDuels.open(to);
  }
  function act(method, path, body, okMsg) {
    if (P.busy) return;
    P.busy = true; H().say('');
    H().call(method, path, body).then(function () {
      P.busy = false;
      if (okMsg) H().say(okMsg);
      load();
    }).catch(function (e) { P.busy = false; H().say(H().errText(e), true); });
  }
  function request() { if (P.id) act('POST', '/friends/requests', { to: P.id }, 'Solicitud enviada.'); }
  function respond(action) {
    var fid = P.data && P.data.amistad && safeId(P.data.amistad.friendship_id);
    if (!fid || !/^(accept|reject|cancel)$/.test(action)) return;
    act('POST', '/friends/requests/' + fid + '/' + action, undefined, null);
  }

  function V21() { return window.SEQDuels21 || null; }
  // Mismos iconos «sueltos» que en la pantalla de Estadísticas (assets/modes/suelto/).
  function modeIc(name) { return '<span class="seq-pf-ico" aria-hidden="true"><img class="mode-img mode-img-loose" src="assets/modes/suelto/' + name + '.webp" alt="" draggable="false" onerror="this.remove()"></span>'; }
  // Casilla de dato: icono opcional, etiqueta pequeña, valor grande y detalle opcional (todo ya escapado por esc()/num()).
  function tile(label, value, hint, icon, wide) {
    return '<div class="seq-pf-tile' + (wide ? ' wide' : '') + '">' + (icon || '') + '<div class="seq-pf-tile-txt"><span class="seq-pf-lbl">' + esc(label) + '</span><b>' + value + '</b>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div></div>';
  }
  function section(title, body) {
    return '<div class="seq-pf-sec"><h3 class="seq-pf-h">' + esc(title) + '</h3>' + body + '</div>';
  }
  function empty(text) { return '<p class="seq-pf-empty">' + esc(text) + '</p>'; }

  function actions(a) {
    var f = (window.SEQOnline && window.SEQOnline.session && (window.SEQOnline.session() || {}).features) || {};
    var id = safeId(P.id), b = '';
    if (a.estado === 'ninguna') b = '<button class="btn btn-primary seq-pf-main" onclick="SEQProfile.request()">Enviar solicitud de amistad</button>';
    else if (a.estado === 'enviada') b = '<div class="seq-pf-chip seq-pf-wait"><span class="seq-pf-dot"></span>Solicitud enviada, esperando respuesta</div><button class="btn btn-secondary seq-pf-side" onclick="SEQProfile.respond(\'cancel\')">Cancelar</button>';
    else if (a.estado === 'recibida') b = '<div class="seq-pf-pair"><button class="btn btn-primary" onclick="SEQProfile.respond(\'accept\')">Aceptar</button><button class="btn btn-secondary" onclick="SEQProfile.respond(\'reject\')">Rechazar</button></div>';
    else if (a.estado === 'amigos') {
      b = '<div class="seq-pf-chip seq-pf-ok">' + (window.seqIco ? window.seqIco('correcto') : '') + 'Amigos</div>';
      var pair = '';
      if (f.classic_duel) pair += '<button class="btn btn-primary" onclick="SEQDuels.quick(\'duel\',\'' + id + '\')">Duelo online</button>';
      if (f.async_challenges) pair += '<button class="btn btn-secondary" onclick="SEQDuels.quick(\'reto\',\'' + id + '\')">Retar</button>';
      if (pair) b += '<div class="seq-pf-pair">' + pair + '</div>';
    }
    return b ? '<div class="seq-pf-actions">' + b + '</div>' : '';
  }

  function render() {
    var h = H(), out = h.header('Ficha de jugador', 'Lo que se sabe de él', back);
    if (P.err) return out + '<div class="seq-pf-wrap">' + empty(P.err) + '</div>';
    var d = P.data;
    if (!d) return out + '<p class="seq-v21-rk-loading">Cargando…</p>';
    var p = h.player(d), lv = level(d.xp), a = d.amistad || { estado: 'ninguna' }, v = d.pvp, vv = V21();
    var badge = v && !v.en_colocacion && vv && vv.rankIcon ? vv.rankIcon(v.rango, 'seq-pf-badge') : '';
    out += '<div class="seq-pf-wrap"><div class="seq-pf-hero"><span class="seq-pl-av seq-pf-av">' + p.avatar + '</span><div class="seq-pf-id">' +
      '<div class="seq-pf-name">' + p.name + (a.estado === 'yo' ? ' <small>(tú)</small>' : '') + '</div>' +
      '<div class="seq-pf-meta">' + (lv ? '<span class="seq-pf-lv">Nivel ' + num(lv) + '</span>' : '') + '<span>' + num(d.xp) + ' XP</span></div>' +
      (v ? '<div class="seq-pf-rank">' + (v.en_colocacion ? 'En colocación' : esc((v.rango && v.rango.nombre) || '')) + '</div>' : '') +
      '</div>' + badge + '</div>';
    out += actions(a);

    var g = d.progreso;
    out += section('Progreso', g
      ? '<div class="seq-pf-grid">' + tile('Precisión', pct(g.precision)) + tile('Mejor racha', dash(g.mejor_racha)) + tile('Partidas', dash(g.partidas)) + tile('Logros', dash(g.logros)) + '</div>'
      : empty('Sin partidas registradas. Un misterio con encanto.'));

    var r = d.records;
    out += section('Récords', r
      ? '<div class="seq-pf-grid">' + tile('Cálculo Turbo', dash(r.calculo_turbo), 'puntos', modeIc('calculo-turbo')) + tile('Cálculo de Fondo', dash(r.calculo_fondo), 'aciertos', modeIc('calculo-clasico')) + tile('Contrarreloj', dash(r.contrarreloj), 'puntos', modeIc('contrarreloj'), true) + '</div>'
      : empty('Aún sin récords que presumir.'));

    out += section('Duelo online', v
      ? '<div class="seq-pf-grid">' + tile('ELO', dash(v.elo), 'pico ' + dash(v.pico), vv && vv.rankIcon ? vv.rankIcon(v.rango, 'seq-pf-ico') : '') + tile('% de victorias', pct(v.porcentaje_victorias), num(v.partidas) + (num(v.partidas) === 1 ? ' duelo' : ' duelos')) +
          '<div class="seq-pf-record"><span class="seq-pf-w"><b>' + num(v.victorias) + '</b>victorias</span><span class="seq-pf-l"><b>' + num(v.derrotas) + '</b>derrotas</span><span class="seq-pf-d"><b>' + num(v.empates) + '</b>empates</span></div></div>'
      : empty('Ningún duelo puntuado todavía.'));
    return out + '</div>';
  }

  window.SEQProfile = { open: open, load: load, render: render, request: request, respond: respond, back: back, _state: function () { return P; } };
})();
