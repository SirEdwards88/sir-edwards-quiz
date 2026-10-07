// SirEdwards Quiz — Encargos (2.2): interfaz. Pantalla de Encargos, tira editorial de Inicio y aviso flotante.
// Solo pinta lo que dice `encargosView()` (src/state/encargos.js); no toca el progreso. Script clásico.
//
//   · Inicio: NO hay cuarta tarjeta; una tira compacta entre las tarjetas pequeñas y el pie (#home-encargos).
//   · Pantalla (#view-encargos): escena de Sir Edwards (ilustración + frase), tres encargos, Gran Encargo destacado,
//     recompensas, progreso y tiempo restante.
//   · Aviso: flotante, 2,6 s, sin modal, en cola (nunca tapa la partida: va arriba y no recibe toques).

const SEQEncargosUI = (function () {
  'use strict';

  var IMG_SCENE = 'assets/character/siredwards_encargos.webp';
  var IMG_DONE = 'assets/character/siredwards_encargos_completados.webp';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pct(r) { return Math.round(Math.max(0, Math.min(1, r.frac)) * 100); }

  function timeLeftText(ms) {
    var min = Math.max(1, Math.ceil(ms / 60000));
    var d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
    if (d >= 1) return d + (d === 1 ? ' día' : ' días') + (h ? ' y ' + h + ' h' : '');
    if (h >= 1) return h + ' h' + (m ? ' ' + m + ' min' : '');
    return m + ' min';
  }

  // Frases de Sir Edwards según cómo vaya la semana.
  function phrase(v) {
    if (v.allDone) return 'Semana saldada. No cantaré victoria: la próxima ya viene de camino.';
    if (v.doneCount === 3) return 'Los tres cumplidos. Casi parece usted competente. Queda el Gran Encargo, claro.';
    if (v.doneCount > 0 || v.missions.some(function (m) { return m.r.cur > 0; })) return 'Veo avances. Todavía no me atrevo a llamarlos mérito.';
    return 'Esta semana, sus obligaciones son estas. No me haga repetirlas.';
  }

  // ---- tira de Inicio -------------------------------------------------------------------------------
  function renderHome() {
    var el = document.getElementById('home-encargos');
    if (!el || typeof encargosView !== 'function') return;
    var v;
    try { v = encargosView(); } catch (e) { el.hidden = true; return; }
    el.hidden = false;
    var title, line, tail, frac;
    if (v.allDone) {
      title = 'ENCARGOS DE SIR EDWARDS'; line = 'Semana saldada: los tres y el Gran Encargo'; tail = 'Hasta el lunes'; frac = 1;
    } else if (v.doneCount === 3) {
      title = 'ENCARGOS DE SIR EDWARDS'; line = '3/3 encargos semanales · falta el Gran Encargo'; tail = '+' + v.great.xp + ' XP disponibles'; frac = v.great.r.frac;
    } else {
      title = 'ENCARGOS DE SIR EDWARDS'; line = v.doneCount + '/3 encargos semanales completados'; tail = '+' + v.xpAvailable + ' XP disponibles';
      frac = v.doneCount / 3;
    }
    el.className = 'home-encargos' + (v.allDone ? ' is-done' : '');
    el.innerHTML =
      '<img class="home-encargos-img" src="' + (v.allDone ? IMG_DONE : IMG_SCENE) + '" alt="" width="64" height="64" decoding="async" draggable="false">' +
      '<div class="home-encargos-body">' +
        '<div class="home-encargos-kicker">' + esc(title) + '</div>' +
        '<div class="home-encargos-line">' + esc(line) + '</div>' +
        '<div class="home-encargos-bar"><div class="home-encargos-fill" style="width:' + Math.round(frac * 100) + '%"></div></div>' +
        '<div class="home-encargos-tail">' + esc(tail) + ' <span aria-hidden="true">›</span></div>' +
      '</div>';
  }

  // ---- pantalla ---------------------------------------------------------------------------------------
  function missionCard(m, great) {
    var cls = 'enc-card' + (great ? ' is-great' : '') + (m.claimed ? ' is-done' : '');
    return '<div class="' + cls + '">' +
      (great ? '<div class="enc-great-tag">GRAN ENCARGO</div>' : '') +
      '<div class="enc-card-head"><div class="enc-card-title">' + (great ? '<span aria-hidden="true">👑 </span>' : '') + esc(m.titulo) + '</div>' +
      '<div class="enc-card-xp">' + (m.claimed ? 'Cobrado' : '+' + m.xp + ' XP') + '</div></div>' +
      '<div class="enc-card-desc">' + esc(m.desc) + '</div>' +
      '<div class="enc-bar"><div class="enc-bar-fill" style="width:' + (m.claimed ? 100 : pct(m.r)) + '%"></div></div>' +
      '<div class="enc-card-prog">' + (m.claimed ? '✓ Completado' : esc(m.r.label)) + '</div>' +
      '</div>';
  }
  function renderScreen() {
    var el = document.getElementById('encargos-body');
    if (!el || typeof encargosView !== 'function') return;
    var v = encargosView();
    el.innerHTML =
      '<div class="enc-scene">' +
        '<img class="enc-scene-img" src="' + (v.allDone ? IMG_DONE : IMG_SCENE) + '" alt="Sir Edwards" decoding="async" draggable="false">' +
        '<div class="enc-bubble">' + esc(phrase(v)) + '</div>' +
      '</div>' +
      '<div class="enc-meta"><span>' + v.doneCount + '/3 encargos' + (v.bonusClaimed ? ' · bonus cobrado' : '') + '</span><span>Quedan ' + esc(timeLeftText(v.msLeft)) + '</span></div>' +
      '<div class="enc-list">' + v.missions.map(function (m) { return missionCard(m, false); }).join('') + '</div>' +
      missionCard(v.great, true);
  }

  // ---- aviso flotante en cola ---------------------------------------------------------------------------
  var queue = [], showing = false, el = null, hideT = null;
  function ensureEl() {
    if (el && document.body.contains(el)) return el;
    el = document.createElement('div');
    el.className = 'encargos-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }
  function next() {
    if (!queue.length) { showing = false; return; }
    showing = true;
    var t = queue.shift(), n = ensureEl();
    n.className = 'encargos-toast is-' + t.kind;
    n.innerHTML = '<div class="encargos-toast-main">' + (t.kind === 'progress' ? '<span aria-hidden="true">🎩 </span>' : '') + esc(t.main) + '</div>' +
      (t.sub ? '<div class="encargos-toast-sub">' + esc(t.sub) + '</div>' : '');
    void n.offsetWidth;
    n.classList.add('show');
    clearTimeout(hideT);
    hideT = setTimeout(function () { n.classList.remove('show'); setTimeout(next, 260); }, 2600);
  }
  // kind: 'progress' | 'done' | 'great'
  function toast(main, kind, sub) {
    queue.push({ main: main, kind: kind || 'progress', sub: sub || '' });
    if (queue.length > 4) queue.splice(0, queue.length - 4);
    if (!showing) next();
  }

  return { renderHome: renderHome, renderScreen: renderScreen, toast: toast, timeLeftText: timeLeftText, phrase: phrase };
})();
