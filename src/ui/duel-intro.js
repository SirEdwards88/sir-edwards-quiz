// SirEdwards Quiz — Duelos: desbloqueo y presentación de Sir Edwards (tutorial). Script clásico.
//
//   · Desbloqueo: Duelo se abre al llegar al nivel 7 (1.350 XP). Quien ya usó los duelos (presentación vista, historial de duelos o
//     desbloqueo anotado) no se vuelve a bloquear nunca. Marca local en localStorage; no toca el store ni el Worker.
//   · Presentación: la primera vez que se entra en Duelo, Sir Edwards se presenta (seis viñetas: duelo en directo, retos, amigos,
//     ranking y ELO, y dónde está la Ayuda). Al completarla o saltarla no se repite sola. Se puede volver a ver con replay()
//     (botón de la Ayuda): enseñarla de nuevo no cambia ninguna marca.
//   · Ayuda: el texto completo vive en src/data/help.js y lo pinta src/ui/help.js. Aquí ya no hay tarjeta de ayuda propia.
// Usa en ejecución: store (index.html). Con «reducir movimiento» no hay animaciones.

(function () {
  'use strict';

  var NEED_LEVEL = 7;
  var K_UNLOCKED = 'siredwards_quiz_duel_unlocked';
  var K_ANNOUNCED = 'siredwards_quiz_duel_unlock_announced';
  var K_INTRO ='siredwards_quiz_duel_intro_seen';
  // Clave histórica del antiguo aviso de ayuda. Solo se LEE para no bloquear a quien ya usaba Duelo; abrir la Ayuda ya no la escribe.
  var K_HELP = 'siredwards_quiz_v1_1_duel_help_seen';
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
    // La marca de «abierto» se anota solo cuando Duelo ya se celebró (o se anotó en silencio). Si el nivel 7 se alcanza en plena
    // partida y antes de terminar se pinta Inicio o se entra en Duelo, marcarla aquí lo daba por «ya usado» y se perdía el aviso con confeti.
    if (g.open && get(K_UNLOCKED) !== '1' && get(K_ANNOUNCED) === '1') set(K_UNLOCKED, '1');
    return g;
  }

  // Aviso de «modo nuevo» al abrirse Duelo por nivel: se devuelve UNA vez {id, name} para que checkModeUnlocksAndGetNew
  // (index.html) lo trate como cualquier modo desbloqueado (tarjeta flotante, confeti y sonido). Quien ya tenía Duelo
  // abierto (marca local, presentación vista o duelos jugados) queda anotado en silencio y no recibe aviso retroactivo.
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
  // (nivel 7 o duelos jugados), se anota en silencio para no anunciar como nuevo un modo que ya estaba abierto.
  function onAccountSwitch() {
    resetLocal();
    var g = gate(typeof store === 'object' ? store : null);
    if (g.open) { set(K_UNLOCKED, '1'); set(K_ANNOUNCED, '1'); set(K_INTRO, '1'); }
  }

  // Tras traer el progreso de una cuenta: si ya abre Duelo, se anota como abierto y anunciado sin avisar (no es un modo nuevo).
  function markOpenSilently() {
    var g = gate(typeof store === 'object' ? store : null);
    // Quien recupera una cuenta con Duelo abierto no es nuevo: tampoco se le repite la presentación de Sir Edwards, y la tarjeta se
    // actualiza ya (antes seguía bloqueada hasta cambiar de pestaña, y al entrar salía la presentación otra vez).
    if (g.open) { set(K_UNLOCKED, '1'); set(K_ANNOUNCED, '1'); set(K_INTRO, '1'); try { refresh(); } catch (e) {} }
  }

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
      '<div class="dl-lv-row dl-lv-count">' + g.level + ' / ' + g.needLevel + '</div></div>' +
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

  // ---- Presentación de Sir Edwards (tutorial) ------------------------------------------------------------------------------
  // `body` admite <b>…</b>: son textos fijos de este archivo, nunca datos de nadie.
  // Cada viñeta: título funcional (lo primero que se lee), frase de Sir Edwards (secundaria) y párrafo que enseña.
  function linksOn() { try { var s = window.SEQOnline && window.SEQOnline.session && window.SEQOnline.session(); return !!(s && s.features && s.features.classic_duel && s.features.duel_links); } catch (e) { return false; } }
  var pages = [
    { img: 'assets/character/presentacion-evaluador.webp', title: 'Bienvenido a Duelos', quip: 'Dije que no habría tutorial. Mentí.',
      body: 'Aquí podrás hacer amigos, disputar duelos en directo, enviar retos y competir por un puesto en el ranking. Una breve explicación evitará que los demás tengan que perder su tiempo contigo.', btn: 'Continuar' },
    { img: 'assets/character/presentacion-expediente.webp', title: 'Amigos', quip: 'Hasta las rivalidades necesitan una presentación.',
      body: 'Busca jugadores por su nombre o ID y envíales una solicitud. Cuando la acepten, podrás encontrarlos y desafiarlos directamente.', btn: 'Continuar' },
    { img: 'assets/character/sir-edwards-duelos-reloj.webp', title: 'Duelos online', quip: 'Dos jugadores. Un vencedor.',
      body: 'Competís al mismo tiempo. Elige Clásico o Apuestas y desafía a un amigo conectado, o comparte una invitación. Perder con elegancia sigue siendo perder.', bodyOff: 'Competís al mismo tiempo. Elige Clásico o Apuestas y desafía a un amigo conectado. Perder con elegancia sigue siendo perder.', btn: 'Continuar' },
    { img: 'assets/character/sir-edwards-retos-sobre.webp', title: 'Retos', quip: 'No hace falta coincidir.',
      body: 'Envía un reto a un amigo aunque no esté conectado. Tendrá tres días desde su creación para jugarlo. Hasta la paciencia tiene un límite.', btn: 'Continuar' },
    { img: 'assets/character/event_siredwards_record.webp', title: 'Ranking y ELO', quip: 'La reputación está en juego.',
      body: 'Los duelos individuales y los retos 1 contra 1 completados afectan a tu ELO. Tus primeras cinco partidas sirven para colocarte en el ranking. La reputación exige cierta constancia.', btn: 'Continuar' },
    { img: 'assets/character/presentacion-mirada.webp', title: '¿Alguna duda?', quip: 'Si pierdes, que sea con elegancia.',
      body: 'El botón ? de Duelos abre la Ayuda con todas las reglas. Desde allí también podrás repetir este tutorial. Procura no dejarme mal.', btn: 'A por ellos' }
  ];
  var intro = null, replaying = false, opener = null;

  function closeIntro() {
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    intro = null;
    var back = opener; opener = null;
    if (back && document.contains(back)) { try { back.focus({ preventScroll: true }); } catch (e) {} }
  }
  // Completarla o saltarla la da por vista (no se repite sola). Al volver a verla desde la Ayuda no se cambia ninguna marca.
  function endIntro() {
    if (!replaying) { set(K_INTRO, '1'); set(K_HELP, '1'); }
    replaying = false;
    closeIntro();
  }
  function onKey(e) {
    if (!intro) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endIntro(); return; }
    if (e.key !== 'Tab') return;
    var f = intro.querySelectorAll('button'); if (!f.length) return;
    var first = f[0], last = f[f.length - 1], a = document.activeElement;
    if (!intro.contains(a)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function renderPage(i) {
    var p = pages[i], last = i === pages.length - 1;
    var label = last && replaying ? 'Entendido' : p.btn;
    var inner = '<div class="dint-card" tabindex="-1">' +
      (p.img ? '<img class="dint-img" src="' + p.img + '" alt="" draggable="false" decoding="async">' : '') +
      '<h2 id="dint-title">' + p.title + '</h2>' +
      '<p class="dint-quip">' + p.quip + '</p>' +
      '<p class="dint-body">' + (p.bodyOff && !linksOn() ? p.bodyOff : p.body) + '</p>' +
      '<div class="dint-dots" aria-hidden="true">' + pages.map(function (_, k) { return '<i' + (k === i ? ' class="on"' : '') + '></i>'; }).join('') + '</div>' +
      '<button type="button" class="btn btn-primary dint-go">' + label + '</button>' +
      (last ? '' : '<button type="button" class="dint-skip">Saltar</button>') + '</div>';
    intro.innerHTML = inner;
    var go = intro.querySelector('.dint-go');
    go.addEventListener('click', function () { if (last) endIntro(); else renderPage(i + 1); });
    var skip = intro.querySelector('.dint-skip'); if (skip) skip.addEventListener('click', endIntro);
    try { go.focus({ preventScroll: true }); } catch (e) {}
    var card = intro.querySelector('.dint-card'); if (card) card.scrollTop = 0;
  }
  function show() {
    opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    intro = document.createElement('div');
    intro.className = 'dint'; intro.id = 'duel-intro';
    intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-modal', 'true'); intro.setAttribute('aria-labelledby', 'dint-title');
    document.body.appendChild(intro);
    renderPage(0);
  }
  // Desde showDuelHelpIfNeeded: true si ha mostrado la presentación.
  function introIfNeeded() {
    if (get(K_INTRO) === '1' || get(K_HELP) === '1') return false;
    if (intro) return true;
    replaying = false;
    show();
    return true;
  }
  // Desde el botón de la Ayuda: vuelve a enseñarla siempre, sin tocar las marcas de «vista» ni de desbloqueo.
  function replay() {
    if (intro) return true;
    replaying = true;
    show();
    return true;
  }

  try { document.addEventListener('keydown', onKey, true); } catch (e) {}
  try { document.addEventListener('DOMContentLoaded', function () { refresh(); }); } catch (e) {}

  window.SEQDuelIntro = {
    gate: gate, takeNewUnlock: takeNewUnlock, resetLocal: resetLocal, onAccountSwitch: onAccountSwitch, markOpenSilently: markOpenSilently, intercept: intercept, refresh: refresh, introIfNeeded: introIfNeeded, replay: replay,
    NEED_LEVEL: NEED_LEVEL, PAGES: pages
  };
})();
