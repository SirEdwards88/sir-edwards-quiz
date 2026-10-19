// SirEdwards Quiz — Duelos: desbloqueo, presentación de Sir Edwards (primera vez) y tarjeta de ayuda. Script clásico.
//
//   · Desbloqueo: Duelo se abre al llegar al nivel 5 (700 XP). Quien ya usó los duelos (ayuda vista, historial de duelos o
//     desbloqueo anotado) no se vuelve a bloquear nunca. Marca local en localStorage; no toca el store ni el Worker.
//   · Presentación: la primera vez que se entra en Duelo, Sir Edwards se presenta (tres pantallas). Sustituye al aviso de ayuda.
//   · Ayuda: la tarjeta (?) de Duelo se pinta desde aquí (helpHtml), la misma que ve la presentación.
// Usa en ejecución: store (index.html). Con «reducir movimiento» no hay animaciones.

(function () {
  'use strict';

  var NEED_LEVEL = 5;
  var K_UNLOCKED = 'siredwards_quiz_duel_unlocked';
  var K_ANNOUNCED = 'siredwards_quiz_duel_unlock_announced';
  var K_INTRO ='siredwards_quiz_duel_intro_seen';
  var K_HELP = 'siredwards_quiz_v1_1_duel_help_seen';   // clave histórica del aviso de ayuda
  var mem = {};

  function get(k) { try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {} return mem[k] == null ? null : mem[k]; }
  function set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; }
  function el(id) { return document.getElementById(id); }

  // Nivel a partir de la XP: la misma curva que getLevelProgressData de index.html (100 + 50 por nivel), con copia local por si falta.
  function levelOf(xp) {
    var level = 1, rest = num(xp);
    while (level < 30) { var c = 100 + (level - 1) * 50; if (rest >= c) { rest -= c; level++; } else break; }
    return level;
  }
  function xpFor(level) { var t = 0; for (var l = 1; l < level; l++) t += 100 + (l - 1) * 50; return t; }
  // Estado del desbloqueo a partir de un store (puro salvo la lectura de las marcas locales).
  function gate(st) {
    st = st || {};
    var ds = st.duelStats || {};
    var xp = num(st.xp), level = levelOf(xp), need = xpFor(NEED_LEVEL);
    var used = get(K_HELP) === '1' || get(K_UNLOCKED) === '1' || num(ds.played) > 0 || num(ds.multiWins) > 0;
    return { open: used || level >= NEED_LEVEL, level: level, needLevel: NEED_LEVEL, xp: Math.min(xp, need), needXp: need, missing: Math.max(0, need - xp) };
  }
  function currentGate() {
    var st = null; try { st = typeof store === 'object' ? store : null; } catch (e) {}
    var g = gate(st);
    if (g.open && get(K_UNLOCKED) !== '1') set(K_UNLOCKED, '1');
    return g;
  }

  // Aviso de «modo nuevo» al abrirse Duelo por nivel: se devuelve UNA vez {id, name} para que checkModeUnlocksAndGetNew
  // (index.html) lo trate como cualquier modo desbloqueado (tarjeta flotante, confeti y sonido). Quien ya tenía Duelo
  // abierto (marca local, ayuda vista o duelos jugados) queda anotado en silencio y no recibe aviso retroactivo.
  function takeNewUnlock() {
    if (get(K_ANNOUNCED) === '1') return null;
    var st = null; try { st = typeof store === 'object' ? store : null; } catch (e) {}
    st = st || {};
    var ds = st.duelStats || {};
    var used = get(K_HELP) === '1' || get(K_UNLOCKED) === '1' || num(ds.played) > 0 || num(ds.multiWins) > 0;
    if (used) { set(K_ANNOUNCED, '1'); return null; }
    if (levelOf(st.xp) < NEED_LEVEL) return null;
    set(K_ANNOUNCED, '1'); set(K_UNLOCKED, '1');
    return { id: 'duelo', name: 'Duelo', badge: 'Duelo' };
  }

  // Empezar de cero («Reiniciar progreso» o «Empezar de cero» al entrar con una cuenta): las marcas de Duelo son locales y
  // van aparte del progreso, así que se borran a la vez; si no, Duelo se quedaba abierto en un dispositivo recién reiniciado.
  function resetLocal() {
    [K_UNLOCKED, K_ANNOUNCED, K_INTRO, K_HELP].forEach(function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} });
  }

  // Entrar con una cuenta distinta de la que había enlazada en este dispositivo: las marcas de Duelo eran de la cuenta anterior.
  // Se borran y la puerta se recalcula solo con el progreso que quede en el dispositivo; si ese progreso ya abre Duelo
  // (nivel 5 o duelos jugados), se anota en silencio para no anunciar como nuevo un modo que ya estaba abierto.
  function onAccountSwitch() {
    resetLocal();
    var g = gate(typeof store === 'object' ? store : null);
    if (g.open) { set(K_UNLOCKED, '1'); set(K_ANNOUNCED, '1'); }
  }

  // ---- Tarjeta de ayuda -------------------------------------------------------------------------------------------------
  function sec(img, title, body, extra) {
    return '<section class="dh-sec"><img class="dh-ico" src="' + img + '" alt="" draggable="false"><div class="dh-txt"><h3>' + title + '</h3><p>' + body + '</p></div>' + (extra ? '<div class="dh-subs">' + extra + '</div>' : '') + '</section>';
  }
  function sub(img, title, body) {
    return '<div class="dh-sub"><img class="dh-ico dh-ico-s" src="' + img + '" alt="" draggable="false"><div><b>' + title + '</b><span>' + body + '</span></div></div>';
  }
  function helpHtml() {
    return '<div class="dh">' +
      sec('assets/modes/amigos.webp', 'Amigos', 'Se juega con amigos de tu lista. Sí, hace falta tener amigos.') +
      sec('assets/modes/duelo-online.webp', 'Duelo online', 'Jugáis a la vez, con dos modos.',
        sub('assets/duelos/modos/classic.webp', 'Clásico', 'Veinte preguntas; gana quien más acierte.') +
        sub('assets/duelos/modos/stakes.webp', 'Con apuestas', 'Antes de cada pregunta eliges en secreto cuánto te fías de ti: Cuerdo (±1), Osado (±2) o Insensato (±3). ' +
          'Si aciertas, sumas esa cifra; si fallas, la restas, sin bajar de 0. Si no eliges a tiempo, se aplica Cuerdo. ' +
          'Las dos últimas rondas valen el doble y hay niebla: dejas de ver la puntuación de los rivales.')) +
      sec('assets/modes/retos.webp', 'Retos', 'Retas a un amigo y cada uno juega su parte por separado, sin coincidir, dentro del plazo de 3 días.') +
      sec('assets/duelos/formato/uno-contra-uno.webp', '1 vs 1 o Todos contra todos', 'Contra un amigo, o contra dos o tres a la vez. Gana quien más sume.') +
      '<div class="dh-notes">' +
        '<p><b>Lo que cuenta.</b> Los duelos y retos 1 vs 1 suman para tus estadísticas, logros y ELO. ' +
          'Todos contra todos lleva sus propias estadísticas y logros, aparte. Ganar por abandono no cuenta; abandonar sí es derrota.</p>' +
        '<p><b>No te vayas a mitad.</b> A los 60 s sin conexión pierdes por abandono.</p>' +
      '</div></div>';
  }
  function fillHelp() { var b = el('duel-help-body'); if (b) b.innerHTML = helpHtml(); }

  // ---- Bloqueo -----------------------------------------------------------------------------------------------------------
  function closeLock() { var m = el('duel-lock-modal'); if (m && m.parentNode) m.parentNode.removeChild(m); }
  function showLock(g) {
    closeLock();
    var m = document.createElement('div');
    m.id = 'duel-lock-modal'; m.className = 'modal-overlay'; m.style.display = 'flex';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'duel-lock-title'); m.setAttribute('data-modal-esc', '');
    var pct = Math.min(100, Math.round((g.level / g.needLevel) * 100));
    m.innerHTML = '<div class="modal-card dl-card" tabindex="-1">' +
      '<img class="dl-lock" src="assets/cats/candado.webp" alt="" draggable="false">' +
      '<h2 id="duel-lock-title">Aún no.</h2>' +
      '<p class="dl-lead">Un duelo exige cierta dignidad. Alcanza el nivel ' + g.needLevel + ' y hablamos.</p>' +
      '<div class="dl-prog"><div class="dl-bar"><div class="dl-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="dl-lv-row"><span>Nivel ' + g.level + '</span><span>Nivel ' + g.needLevel + '</span></div></div>' +
      '<button type="button" class="btn btn-primary dl-ok" data-autofocus>Entendido</button></div>';
    m.addEventListener('click', function (e) { if (e.target === m) closeLock(); });
    m.querySelector('button').addEventListener('click', closeLock);
    document.body.appendChild(m);
    try { m.querySelector('button').focus(); } catch (e) {}
  }
  // Desde switchTab('duelo'): si Duelo sigue bloqueado muestra el aviso y devuelve true (la pantalla no cambia).
  function intercept() {
    var g = currentGate();
    if (g.open) return false;
    showLock(g);
    return true;
  }
  // Tarjeta de Duelo en Inicio: apagada, con un solo candado (en la flecha) y el requisito mientras esté bloqueado.
  function refresh() {
    var card = document.querySelector('.home-card-duelo'); if (!card) return;
    var g = currentGate(), subEl = card.querySelector('.home-big-sub');
    if (subEl && !subEl.getAttribute('data-orig')) subEl.setAttribute('data-orig', subEl.textContent);
    card.classList.toggle('is-locked', !g.open);
    if (subEl) subEl.textContent = g.open ? subEl.getAttribute('data-orig') : 'Se desbloquea al nivel ' + g.needLevel;
    var arrow = card.querySelector('.home-big-arrow');
    if (arrow) arrow.innerHTML = g.open ? '›' : '<img class="dl-arrow-lock" src="assets/cats/candado.webp" alt="" draggable="false">';
  }

  // ---- Presentación de Sir Edwards ----------------------------------------------------------------------------------------
  var pages = [
    { img: 'assets/character/presentacion-evaluador.webp', title: 'Dije que no habría tutorial.',
      body: 'Mentí. Pero lo hago por los demás: que nadie tenga que perder su tiempo explicándote cómo funciona esto.', btn: 'Continuar' },
    { title: 'Lo básico', help: true, btn: 'Continuar' },
    { img: 'assets/character/presentacion-mirada.webp', title: 'Ahora, a pelear.',
      body: 'Si pierdes, que sea con elegancia. No me dejes mal.', btn: 'A por ellos' }
  ];
  var intro = null;
  function endIntro() {
    set(K_INTRO, '1'); set(K_HELP, '1');
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    intro = null;
  }
  function renderPage(i) {
    var p = pages[i], last = i === pages.length - 1;
    var inner = '<div class="dint-card' + (p.help ? ' is-help' : '') + '" tabindex="-1">' +
      (p.img ? '<img class="dint-img" src="' + p.img + '" alt="" draggable="false" decoding="async">' : '') +
      '<h2 id="dint-title">' + p.title + '</h2>' +
      (p.help ? '<div class="dint-help">' + helpHtml() + '</div>' : '<p class="dint-body">' + p.body + '</p>') +
      '<div class="dint-dots" aria-hidden="true">' + pages.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
      '<button type="button" class="btn btn-primary dint-go">' + p.btn + '</button></div>';
    intro.innerHTML = inner;
    var go = intro.querySelector('.dint-go');
    go.addEventListener('click', function () { if (last) endIntro(); else renderPage(i + 1); });
    try { go.focus({ preventScroll: true }); } catch (e) {}
    var card = intro.querySelector('.dint-card'); if (card) card.scrollTop = 0;
  }
  // Desde showDuelHelpIfNeeded: true si ha mostrado la presentación (y por tanto no hace falta el aviso de ayuda).
  function introIfNeeded() {
    if (get(K_INTRO) === '1' || get(K_HELP) === '1') return false;
    if (intro) return true;
    intro = document.createElement('div');
    intro.className = 'dint'; intro.id = 'duel-intro';
    intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); intro.setAttribute('aria-labelledby', 'dint-title');
    document.body.appendChild(intro);
    renderPage(0);
    return true;
  }

  try { document.addEventListener('DOMContentLoaded', function () { fillHelp(); refresh(); }); } catch (e) {}

  window.SEQDuelIntro = {
    gate: gate, takeNewUnlock: takeNewUnlock, resetLocal: resetLocal, onAccountSwitch: onAccountSwitch, intercept: intercept, refresh: refresh, introIfNeeded: introIfNeeded, fillHelp: fillHelp, helpHtml: helpHtml,
    NEED_LEVEL: NEED_LEVEL
  };
})();
