// SirEdwards Quiz 2.3 — ficha pública de un jugador (resumen: precisión, récords por modo y PvP).
//
// Se abre desde Amigos, desde los Rankings y desde la búsqueda, y lleva las acciones de amistad (enviar solicitud,
// aceptar/rechazar, cancelar, eliminar amigo). Solo presenta lo que devuelve el servidor en GET /players/:id (ver src/profile.js del
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
  function setTab(t) { P.tab = t === 'multi' ? 'multi' : 'pvp'; window.SEQDuels.rerender(); }
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

  // Eliminar amigo: dos toques (el primero pide confirmación y se desarma solo a los 4 s). No borra partidas ni estadísticas.
  var rmTimer = 0;
  function remove() {
    var fid = P.data && P.data.amistad && P.data.amistad.estado === 'amigos' && safeId(P.data.amistad.friendship_id);
    if (!fid) return;
    if (!P.rm) {
      P.rm = true; clearTimeout(rmTimer);
      rmTimer = setTimeout(function () { P.rm = false; if (window.SEQDuels._state().screen === 'profile') window.SEQDuels.rerender(); }, 4000);
      window.SEQDuels.rerender(); return;
    }
    P.rm = false; clearTimeout(rmTimer);
    act('POST', '/friends/' + fid + '/remove', undefined, 'Ya no sois amigos.');
  }

  function V21() { return window.SEQDuels21 || null; }
  // Misma estética que «Estadísticas»: expediente (.stats-dossier) y secciones con filete dorado (.stats-section).
  function sectionImg(img, title, body) {
    return '<div class="stats-section seq-pf-sec"><h3 class="stats-h"><img class="stats-h-img" src="assets/' + img + '.webp" alt="" draggable="false">' + esc(title) + '</h3>' + body + '</div>';
  }
  function extra(label, value, icon, hint) {
    return '<div class="stat-extra"><span class="stat-extra-icon has-img" aria-hidden="true">' + icon + '</span><div><span class="stat-extra-label">' + esc(label) + '</span><span class="stat-extra-value">' + value + '</span>' + (hint ? '<span class="stat-extra-context">' + esc(hint) + '</span>' : '') + '</div></div>';
  }
  function modeImg(name) { return '<img class="mode-img mode-img-loose" src="assets/modes/suelto/' + name + '.webp" alt="" draggable="false" onerror="this.remove()">'; }
  function mini(value, label) { return '<div class="stats-mini"><div class="stats-mini-value">' + value + '</div><div class="stats-mini-label">' + esc(label) + '</div></div>'; }
  function empty(text) { return '<p class="seq-pf-empty">' + esc(text) + '</p>'; }

  function actions(a) {
    var b = '';   // Retar a duelo o reto se hace desde Amigos (allí se comprueba que el amigo esté en línea), no desde la ficha.
    if (a.estado === 'ninguna') b = '<button class="btn btn-primary seq-pf-main" onclick="SEQProfile.request()">Enviar solicitud de amistad</button>';
    else if (a.estado === 'enviada') b = '<div class="seq-pf-chip seq-pf-wait"><span class="seq-pf-dot"></span>Solicitud enviada, esperando respuesta</div><button class="btn btn-secondary seq-pf-side" onclick="SEQProfile.respond(\'cancel\')">Cancelar</button>';
    else if (a.estado === 'recibida') b = '<div class="seq-pf-pair"><button class="btn btn-primary" onclick="SEQProfile.respond(\'accept\')">Aceptar</button><button class="btn btn-secondary" onclick="SEQProfile.respond(\'reject\')">Rechazar</button></div>';
    else if (a.estado === 'amigos') {
      b = '<div class="seq-pf-chip seq-pf-ok">' + (window.seqIco ? window.seqIco('correcto') : '') + 'Amigos</div>';
      b += '<button class="btn btn-secondary seq-pf-quit" onclick="SEQProfile.remove()">' + (P.rm ? '¿Seguro? Pulsa otra vez para eliminarlo' : 'Eliminar amigo') + '</button>';
    }
    return b ? '<div class="seq-pf-actions">' + b + '</div>' : '';
  }

  function render() {
    var h = H(), out = h.header('Ficha de jugador', 'Lo que se sabe de él', back);
    if (P.err) return out + '<div class="seq-pf-wrap">' + empty(P.err) + '</div>';
    var d = P.data;
    if (!d) return out + '<p class="seq-v21-rk-loading">Cargando…</p>';
    var p = h.player(d), a = d.amistad || { estado: 'ninguna' }, v = d.pvp, vv = V21(), g = d.progreso, r = d.records;
    var lucOk = false; try { lucOk = typeof getFragmentCount === 'function' && getFragmentCount(getStore()) >= FRAGMENT_TARGET; } catch (e) {}   // el modo secreto no se nombra hasta desbloquearlo
    var lp = null; try { lp = typeof getLevelProgressData === 'function' ? getLevelProgressData(num(d.xp)) : null; } catch (e) {}
    var rank = v ? (v.en_colocacion ? 'En colocación' : esc((v.rango && v.rango.nombre) || '')) : '';
    var badge = v && !v.en_colocacion && vv && vv.rankIcon ? vv.rankIcon(v.rango, 'seq-pf-badge') : '';

    out += '<div class="seq-pf-wrap"><div class="stats-dossier seq-pf-dossier">' +
      '<div class="dossier-head"><span class="dossier-kicker">Expediente de</span><span class="dossier-name">' + p.name + (a.estado === 'yo' ? ' <small>(tú)</small>' : '') + '</span></div>' +
      '<div class="stats-level-widget"><div class="stats-level-widget-icon dossier-seal seq-pf-seal" aria-hidden="true">' + p.avatar + '</div>' +
      '<div class="stats-level-widget-info"><div class="stats-level-widget-top">NIVEL ' + (lp ? num(lp.level) : '—') + (rank ? ' · <span class="seq-pf-rk">' + rank + '</span>' : '') + '</div>' +
      '<div class="progress-bar stats-level-widget-bar"><div class="bar-fill" style="width:' + (lp ? lp.progressPct : 0) + '%"></div></div>' +
      '<div class="stats-level-widget-xp">' + num(d.xp) + ' XP</div></div>' + badge + '</div>' +
      (g ? '<div class="dossier-tiles"><div class="dossier-tile"><div class="dossier-tile-label">Precisión</div><div class="dossier-tile-value">' + pct(g.precision) + '</div><div class="dossier-tile-sub">' + dash(g.partidas) + (num(g.partidas) === 1 ? ' partida' : ' partidas') + ' · ' + dash(g.logros) + (num(g.logros) === 1 ? ' logro' : ' logros') + '</div></div>' +
        '<div class="dossier-tile"><div class="dossier-tile-label">Mejor racha</div><div class="dossier-tile-value">' + dash(g.mejor_racha) + '</div><div class="dossier-tile-sub">' + (num(g.mejor_racha) === 1 ? 'acierto seguido' : 'aciertos seguidos') + '</div></div></div>' : '') +
      '</div>';
    if (!g) out += empty('Sin partidas registradas. Un misterio con encanto.');
    out += actions(a);

    out += sectionImg('ui/copa', 'Récords personales', r
      ? '<div class="stats-extra-grid" id="extra-stats">' + extra('Contrarreloj', dash(r.contrarreloj), modeImg('contrarreloj'), 'aciertos') + extra('Cálculo de Fondo', dash(r.calculo_fondo), modeImg('calculo-clasico'), 'aciertos') + extra('Cálculo Turbo', dash(r.calculo_turbo), modeImg('calculo-turbo'), 'puntos') + (r.lucidez ? (lucOk ? extra('Lucidez Mental', dash(r.lucidez, '/30'), modeImg('secreto'), 'mejor partida') : extra('Modo secreto', '???', modeImg('secreto'), '')) : '') + '</div>'
      : empty('Aún sin récords que presumir.'));

    var cc = d.cara_a_cara && window.SEQRivalry ? SEQRivalry.summary(d.cara_a_cara) : null;
    if (cc) {
      var myName = ''; try { myName = (window.SEQOnline.session() || {}).display_name; } catch (e) {}
      out += sectionImg('ui/copa', 'Vuestros duelos', SEQRivalry.html(cc, myName, String(d.display_name || 'Jugador').slice(0, 24), esc).replace('class="seq-d-serie"', 'class="seq-d-serie seq-pf-serie"'));
    }

    var mu = d.multi || {}, hasMu = num(mu.partidas) > 0, on = false;
    try { var ss = window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session(); on = !!(ss && ss.features && ss.features.classic_duel); } catch (e) {}
    var showTabs = on || hasMu || !!v, tab = showTabs && (P.tab === 'multi' || (!v && hasMu)) ? 'multi' : 'pvp';
    var tabs = showTabs ? '<div class="seq-v21-scope seq-v21-calcsub" role="tablist" aria-label="Tipo de duelo">' + [['pvp', '1 vs 1'], ['multi', 'Todos contra todos']].map(function (t) {
      return '<button type="button" role="tab" aria-selected="' + (tab === t[0]) + '" class="seq-v21-scope-btn' + (tab === t[0] ? ' sel' : '') + '" onclick="SEQProfile.setTab(\'' + t[0] + '\')">' + t[1] + '</button>';
    }).join('') + '</div>' : '';
    var body = tab === 'multi' && !hasMu ? empty('Ningún duelo todos contra todos todavía.') : tab === 'multi'
      ? '<div class="stats-mini-grid">' + mini(num(mu.partidas), 'Partidas') + mini(num(mu.victorias), 'Victorias') + mini(Math.max(0, num(mu.partidas) - num(mu.victorias) - num(mu.abandonos)), 'Derrotas') + mini(num(mu.abandonos), 'Abandonos') + mini(pct(mu.porcentaje_victorias), '% Victorias') + '</div>'
      : v ? '<div class="stats-mini-grid">' + mini(dash(v.elo), 'ELO') + mini(dash(v.pico), 'Récord ELO') + mini(pct(v.porcentaje_victorias), '% Victorias') +
        mini(num(v.victorias), 'Victorias') + mini(num(v.derrotas), 'Derrotas') + mini(num(v.empates), 'Empates') + '</div>'
      : empty('Ningún duelo 1 vs 1 todavía.');
    out += sectionImg('modes/suelto/duelo', 'Historial de duelos', tabs + body);
    return out + '</div>';
  }

  window.SEQProfile = { setTab: setTab, open: open, load: load, render: render, request: request, respond: respond, remove: remove, back: back, _state: function () { return P; } };
})();
