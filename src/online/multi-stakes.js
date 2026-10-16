// SirEdwards Quiz 2.4 — Duelo online MÚLTIPLE por apuestas (3 a 4 jugadores): pantalla de la partida.
//
// SOLO PRESENTACIÓN. El servidor decide preguntas, tiempos, apuestas, aciertos, puntos y clasificación; este archivo pinta lo que
// el servidor ya ha decidido y envía ENTRADAS (la clave de la apuesta y la respuesta elegida), nunca resultados. Lo que el servidor aún
// no debe revelar (las apuestas ajenas antes de tiempo, el acierto de la ronda en curso y, en las últimas rondas, los puntos) ni llega.
// Reglas (las aplica el servidor; aquí solo se explican): cada uno apuesta a su riesgo, las apuestas se revelan juntas y las dos últimas
// rondas valen doble; en las tres últimas el marcador enseña posiciones, no puntos.
//
// Lo llama src/online/multi-duels.js (play) y src/online/duels.js (tick, cada 250 ms). Todo texto del servidor pasa por esc() y los números
// por num(); las claves de apuesta que van en atributos son siempre constantes de este archivo.
(function () {
  'use strict';

  var STAKES = { cuerdo: { nombre: 'Cuerdo', valor: 1 }, osado: { nombre: 'Osado', valor: 2 }, insensato: { nombre: 'Insensato', valor: 3 } };
  var ORDER = ['cuerdo', 'osado', 'insensato'];
  var ST = { sent: {}, fetchedKey: '', soundKey: '', streak: 0 };

  function H() { return (window.SEQDuels && window.SEQDuels._h) || null; }
  function num(v) { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; }
  function esc(s) { var h = H(); return h ? h.esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function secs(ms) { return Math.max(0, Math.ceil(ms / 1000)); }
  function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
  function setBar(id, frac) { var el = $(id); if (el) el.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%'; }
  function key(k) { return Object.prototype.hasOwnProperty.call(STAKES, k) ? k : null; }
  function mult(r) { return r && r.doble ? 2 : 1; }
  function icon(k) { return '<span class="seq-v21-ico seq-v21-ico-stake" aria-hidden="true"><img src="assets/duelos/apuestas/' + k + '.webp" alt="" draggable="false" onerror="this.remove()"></span>'; }
  function label(k) { k = key(k); return k ? icon(k) + '<b>' + STAKES[k].nombre + '</b>' : '<b>—</b>'; }
  function byId(d) { var m = {}; (d.jugadores || []).forEach(function (j) { m[j.id] = j; }); return m; }
  function nameOf(j, h) { return j.es_yo ? 'Tú' : h.player(j).name; }

  // Los cuatro (o tres) jugadores con una marca: ya ha bloqueado, o aún piensa.
  function lockedRow(d, h) {
    var r = d.ronda, locked = r.bloqueadas || [];
    return '<div class="seq-m-locks">' + (d.jugadores || []).filter(function (j) { return j.estado === 'aceptado' && !j.abandonado; }).map(function (j) {
      var on = locked.indexOf(j.id) >= 0, p = h.player(j);
      return '<span class="seq-m-lock' + (on ? ' on' : '') + '" role="img" aria-label="' + (j.es_yo ? 'Tú' : p.name) + (on ? ': ha apostado' : ': aún piensa') + '" title="' + (on ? 'Ha apostado' : 'Aún piensa') + '">' + p.avatar + '<small>' + (on ? h.ico('correcto') : h.ico('mediocre')) + '</small><em>' + (j.es_yo ? 'Tú' : p.name) + '</em></span>';
    }).join('') + '</div>';
  }
  function stakeButtons(d, locked) {
    var r = d.ronda, mine = key(r.mi_apuesta), x = mult(r);
    return '<div class="seq-v21-stakes" role="group" aria-label="Elige tu apuesta">' + ORDER.map(function (k) {
      var st = STAKES[k], sel = mine === k, v = st.valor * x;
      return '<button type="button" class="seq-v21-stake seq-v21-stake-' + k + (sel ? ' sel' : '') + '"' + (locked ? ' disabled' : '') + ' onclick="SEQMultiStakes.stake(\'' + k + '\')">' +
        icon(k) + '<span class="seq-v21-stake-name">' + st.nombre + '</span><span class="seq-v21-stake-val"><i>+' + v + '</i><i>−' + v + '</i></span></button>';
    }).join('') + '</div>';
  }
  // Las apuestas de todos sobre la mesa (solo llegan del servidor cuando están reveladas).
  function table(d, h) {
    var r = d.ronda, ap = r.apuestas || {};
    return '<div class="seq-m-table">' + (d.jugadores || []).filter(function (j) { return ap[j.id]; }).map(function (j) {
      var p = h.player(j);
      return '<div class="seq-m-bet' + (j.es_yo ? ' me' : '') + '"><span class="seq-m-bet-av">' + p.avatar + '</span><small>' + (j.es_yo ? 'Tú' : p.name) + '</small>' + label(ap[j.id]) + '</div>';
    }).join('') + '</div>';
  }
  function resolved(d, h) {
    var list = d.rondas_resueltas || [], r = list[list.length - 1];
    if (!r) return '';
    var by = byId(d), x = r.doble ? 2 : 1, rows = (r.jugadores || []).map(function (e) {
      var j = by[e.id]; if (!j) return '';
      var k = key(e.apuesta) || 'cuerdo', v = STAKES[k].valor * x;
      return '<div class="seq-v21-res-row ' + (e.correcta ? 'ok' : 'bad') + '"><span>' + nameOf(j, h) + '</span>' + h.ico(e.correcta ? 'correcto' : 'incorrecto') + label(k) + '<b>' + (e.correcta ? '+' : '−') + v + '</b></div>';
    }).join('');
    return '<div class="seq-v21-resolved seq-m-res">' + rows + '</div>';
  }
  function question(d, h) {
    var r = d.ronda, idx = num(r.indice), qn = (d.preguntas || [])[idx];
    var info = qn != null ? h.itemInfo(qn) : null;
    if (!info && qn != null && h.updateNeeded) return h.updateNeeded();
    if (!info || !info.options) return '<p class="stats-section-sub">Cargando pregunta…</p>';
    var sent = ST.sent[d.id + ':' + idx], answered = !!(r.yo_respondi || sent != null), opts = h.optionsFor(d.id, idx, info);
    var out = '<div class="q-box seq-d-qbox"><span>' + esc(info.q) + '</span></div><div id="seq-m-choices" class="seq-d-choices" role="group" aria-label="Opciones de respuesta" data-idx="' + idx + '">';
    out += opts.map(function (o, i) {
      return '<button type="button" class="choice-btn' + (sent != null && o === sent ? ' selected' : '') + '"' + (answered ? ' disabled' : '') + ' onclick="SEQMultiStakes.answer(' + i + ')">' + esc(String(o)) + '</button>';
    }).join('') + '</div>';
    return out + (answered ? '<p class="stats-section-sub seq-v21-wait">Respuesta enviada. Esperando a que se resuelva la ronda…</p>' : '');
  }

  // Pantalla de la partida. `chips` pinta el marcador de todos (lo aporta multi-duels.js).
  function play(d, h, chips) {
    var r = d.ronda || null, fase = r ? r.fase : 'cuenta_atras', total = num(d.n_rondas) || 12;
    h.topbarShown(false);
    var out = '<div class="seq-d-toprow"><button type="button" class="game-exit-btn seq-d-exit" onclick="SEQDuels.leaveDuel()">← Duelo online</button></div>' +
      '<div id="seq-d-msg" class="feedback" style="display:none;"></div>' +
      '<div class="mode-header game-hud seq-d-hud seq-d-hud-reto seq-v21-hud"><span class="seq-d-hud-lbl"><span class="seq-d-hud-mode" title="Duelo por apuestas"><img class="seq-ico seq-d-mode-ico" src="assets/modes/emblema/duelo-apuestas.webp" alt="" draggable="false"></span>' +
      (r ? (num(r.indice) + 1) + '/' + total : '') + (r && r.doble ? ' · <b class="seq-m-double">Doble</b>' : '') + '</span>' +
      '<span class="seq-d-hud-right">' + (fase === 'apuesta' || fase === 'pregunta' ? '<span class="seq-d-hud-time">' + h.ico('tiempo') + '<span id="seq-m-time"></span>s</span>' : '') + '</span></div>' +
      chips(d) + (d.niebla ? '<p class="stats-section-sub seq-m-fog">Niebla: ya solo se ven las posiciones.</p>' : '') +
      '<div class="progress-bar"><div id="seq-m-bar" class="bar-fill"></div></div>';
    if (fase === 'cuenta_atras' || (!r && num(d.t0) > h.serverNow())) return out + '<div class="duel-result-box duel-result-neutral"><div class="duel-result-title">Empieza en <span id="seq-m-count"></span>…</div></div>';
    if (fase === 'apuesta') {
      var locked = !!r.mi_apuesta;
      out += '<div class="seq-v21-prompt">' + (locked ? 'Apuesta bloqueada' : (r.doble ? 'Ronda doble: elige tu apuesta' : 'Elige tu apuesta')) + '</div>' + stakeButtons(d, locked) + lockedRow(d, h);
      return out + (locked && r.mi_apuesta_auto ? '<p class="stats-section-sub">Se acabó el tiempo: Cuerdo.</p>' : '');
    }
    if (fase === 'revelando') return out + '<div class="seq-v21-prompt">Apuestas sobre la mesa</div>' + table(d, h) + '<p class="stats-section-sub seq-v21-wait">La pregunta llega en <span id="seq-m-count"></span>…</p>';
    if (fase === 'pregunta') return out + table(d, h) + question(d, h);
    return out + '<div class="seq-v21-prompt">Resultado de la ronda</div>' + resolved(d, h);
  }

  // ---- Reloj (lo llama duels.js cada 250 ms; solo textContent/style) ---------------------------------------
  function sfx(ok) {
    try {
      ST.streak = ok ? ST.streak + 1 : 0;
      if (ok && typeof playCorrectSound === 'function') playCorrectSound(ST.streak);
      else if (!ok && typeof playSound === 'function') playSound('bad');
    } catch (e) {}
  }
  function urgency(ms) { try { if (typeof updateUrgencySound === 'function') updateUrgencySound(ms / 1000); } catch (e) {} }
  function urgencyOff() { try { if (typeof stopUrgencySound === 'function') stopUrgencySound(); } catch (e) {} }
  function tick(d, now) {
    var r = d.ronda, boundary = null, total = 1, left = 0;
    if (!r) { if (num(d.t0) > now) { setText('seq-m-count', String(secs(num(d.t0) - now))); setText('seq-d-count', String(secs(num(d.t0) - now))); } return; }
    if (r.fase === 'apuesta') {
      boundary = num(r.revelacion_at) || num(r.apuesta_cierra_at);
      total = Math.max(1, boundary - num(r.apuesta_abre_at)); left = boundary - now;
      setText('seq-m-time', String(secs(left))); setBar('seq-m-bar', left / total);
    } else if (r.fase === 'revelando') { boundary = num(r.pregunta_abre_at); setText('seq-m-count', String(secs(boundary - now))); setBar('seq-m-bar', 1); }
    else if (r.fase === 'pregunta') {
      var sent = !!(r.yo_respondi || ST.sent[d.id + ':' + r.indice] != null);
      if (sent) urgencyOff(); else urgency(num(r.pregunta_cierra_at) - now);
      boundary = num(r.pregunta_cierra_at) + 1100; total = Math.max(1, num(r.pregunta_cierra_at) - num(r.pregunta_abre_at)) || 20000; left = num(r.pregunta_cierra_at) - now;
      setText('seq-m-time', String(secs(left))); setBar('seq-m-bar', left / total);
      // Si ya han respondido todos, el servidor resuelve antes: se sondea cada segundo (lo hace duels.js).
    } else {
      boundary = num(r.apuesta_abre_at); setBar('seq-m-bar', 0);
      var list = d.rondas_resueltas || [], last = list[list.length - 1], sk = d.id + ':' + (last ? last.indice : '-');
      if (last && ST.soundKey !== sk) {
        ST.soundKey = sk;
        var mine = (last.jugadores || []).filter(function (e) { return e.id === myId(d); })[0];
        if (mine) sfx(!!mine.correcta);
      }
    }
    if (r.fase !== 'pregunta') urgencyOff();
    if (boundary && now >= boundary) {
      var k = d.id + ':' + r.indice + ':' + r.fase;
      if (ST.fetchedKey !== k) { ST.fetchedKey = k; if (window.SEQDuels) window.SEQDuels.reload(); }
    }
  }
  function myId(d) { var j = (d.jugadores || []).filter(function (x) { return x.es_yo; })[0]; return j ? j.id : null; }

  // ---- Entradas -------------------------------------------------------------------------------------------
  function state() { var h = H(), st = window.SEQDuels && window.SEQDuels._state(); return h && st && st.data && st.data.ronda ? { h: h, st: st, d: st.data } : null; }
  function stake(k) {
    k = key(k); var c = state();
    if (!k || !c || c.st.screen !== 'multi' || c.d.ronda.fase !== 'apuesta' || c.d.ronda.mi_apuesta || c.st.sending) return;
    c.st.sending = true;
    c.h.call('POST', '/multi-duels/' + c.st.id + '/stake', { indice: num(c.d.ronda.indice), apuesta: k }).then(function () {
      c.st.sending = false; window.SEQDuels.reload();
    }).catch(function (e) { c.st.sending = false; c.h.say(c.h.errText(e), true); window.SEQDuels.reload(); });
  }
  function answer(i) {
    var c = state();
    if (!c || c.st.screen !== 'multi' || c.d.ronda.fase !== 'pregunta' || c.st.sending) return;
    var idx = num(c.d.ronda.indice), info = c.h.itemInfo((c.d.preguntas || [])[idx]);
    if (!info || !info.options) return;
    var chosen = c.h.optionsFor(c.d.id, idx, info)[num(i)]; if (chosen == null) return;
    var k = c.d.id + ':' + idx; if (ST.sent[k] != null) return;
    c.st.sending = true; ST.sent[k] = chosen;
    c.h.call('POST', '/multi-duels/' + c.st.id + '/answer', { indice: idx, respuesta: chosen }).then(function () {
      c.st.sending = false; window.SEQDuels.reload();
    }).catch(function (e) { c.st.sending = false; delete ST.sent[k]; c.h.say(c.h.errText(e), true); window.SEQDuels.reload(); });
  }

  window.SEQMultiStakes = { play: play, tick: tick, stake: stake, answer: answer, core: { STAKES: STAKES, mult: mult } };
})();
