// SirEdwards Quiz 2.4 — ficha pública de un jugador (resumen: precisión, récords por modo y PvP).
//
// Se abre desde Amigos, desde los Rankings y desde la búsqueda, y lleva las acciones de amistad (enviar solicitud,
// aceptar/rechazar, cancelar). Solo presenta lo que devuelve el servidor en GET /players/:id (ver src/profile.js del
// backend): el PvP lo verifica el servidor; la precisión, las rachas y los récords los DECLARA cada jugador y así se
// avisa en la pantalla. Un dato que falta llega como null y se muestra como «—», nunca como un cero inventado.
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

  function stat(label, value, hint) {
    return '<div class="seq-pf-stat"><b>' + value + '</b><span>' + esc(label) + '</span>' + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</div>';
  }
  function section(title, note, body) {
    return '<h3 class="seq-d-h3">' + esc(title) + '</h3>' + (note ? '<p class="seq-pf-note">' + esc(note) + '</p>' : '') + body;
  }

  function actions(a) {
    var f = (window.SEQOnline && window.SEQOnline.session && (window.SEQOnline.session() || {}).features) || {};
    var b = '';
    if (a.estado === 'ninguna') b = '<button class="btn btn-primary" onclick="SEQProfile.request()">Enviar solicitud de amistad</button>';
    else if (a.estado === 'enviada') b = '<span class="seq-pf-state">Solicitud enviada. Esperando respuesta…</span> <button class="btn btn-secondary seq-d-sm" onclick="SEQProfile.respond(\'cancel\')">Cancelar</button>';
    else if (a.estado === 'recibida') b = '<span class="seq-pf-state">Quiere ser tu amigo.</span> <button class="btn btn-primary seq-d-sm" onclick="SEQProfile.respond(\'accept\')">Aceptar</button> <button class="btn btn-secondary seq-d-sm" onclick="SEQProfile.respond(\'reject\')">Rechazar</button>';
    else if (a.estado === 'amigos') {
      b = '<span class="seq-pf-state seq-pf-friend">Amigos</span>';
      if (f.async_challenges) b += ' <button class="btn btn-secondary seq-d-sm" onclick="SEQDuels.quick(\'reto\',\'' + safeId(P.id) + '\')">Retar</button>';
      if (f.classic_duel) b += ' <button class="btn btn-primary seq-d-sm" onclick="SEQDuels.quick(\'duel\',\'' + safeId(P.id) + '\')">Duelo</button>';
    }
    return b ? '<div class="seq-pf-actions">' + b + '</div>' : '';
  }

  function render() {
    var h = H(), out = h.header('Ficha de jugador', '', back);
    if (P.err) return out + '<p class="stats-section-sub">' + esc(P.err) + '</p>';
    var d = P.data;
    if (!d) return out + '<p class="stats-section-sub">Cargando…</p>';
    var p = h.player(d), lv = level(d.xp), a = d.amistad || { estado: 'ninguna' };
    out += '<div class="seq-pf-hero"><span class="seq-pl-av seq-pf-av">' + p.avatar + '</span><div class="seq-pf-id"><div class="seq-pf-name">' + p.name + (a.estado === 'yo' ? ' <small>(tú)</small>' : '') + '</div>' +
      '<div class="seq-pl-sub">' + (lv ? 'Nivel ' + num(lv) + ' · ' : '') + num(d.xp) + ' XP</div></div></div>';
    out += actions(a);

    var g = d.progreso;
    out += section('Progreso', 'Declarado por el jugador: el servidor no puede comprobarlo.',
      g ? '<div class="seq-pf-grid">' + stat('Precisión', pct(g.precision)) + stat('Mejor racha', dash(g.mejor_racha)) + stat('Partidas', dash(g.partidas)) + stat('Logros', dash(g.logros)) + '</div>'
        : '<p class="stats-section-sub">Sin partidas registradas. Un misterio con encanto.</p>');

    var r = d.records;
    out += section('Récords', 'Declarados por el jugador.',
      r ? '<div class="seq-pf-grid">' + stat('Cálculo Turbo', dash(r.calculo_turbo), 'puntos') + stat('Cálculo de Fondo', dash(r.calculo_fondo), 'aciertos') + stat('Contrarreloj', dash(r.contrarreloj), 'puntos') + '</div>'
        : '<p class="stats-section-sub">Aún sin récords que presumir.</p>');

    var v = d.pvp;
    out += section('Duelo online (PvP)', 'Verificado por el servidor.',
      v ? '<div class="seq-pf-grid">' + stat('Rango', v.en_colocacion ? 'En colocación' : esc((v.rango && v.rango.nombre) || '—')) + stat('ELO', dash(v.elo), 'pico ' + dash(v.pico)) +
          stat('V / D / E', num(v.victorias) + ' / ' + num(v.derrotas) + ' / ' + num(v.empates)) + stat('Victorias', pct(v.porcentaje_victorias), num(v.partidas) + ' duelos') + '</div>'
        : '<p class="stats-section-sub">Ningún duelo puntuado todavía.</p>');
    return out;
  }

  window.SEQProfile = { open: open, load: load, render: render, request: request, respond: respond, back: back, _state: function () { return P; } };
})();
