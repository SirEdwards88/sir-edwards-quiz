// SirEdwards Quiz — Duelos: desbloqueo y presentación de Sir Edwards (tutorial). Script clásico.
//
//   · Desbloqueo: Duelo se abre al llegar al nivel 7 (1.350 XP). Quien ya usó los duelos (presentación vista, historial de duelos o
//     desbloqueo anotado) no se vuelve a bloquear nunca. Marca local en localStorage; no toca el store ni el Worker.
//   · Tutorial: la primera vez que se entra en Duelo (una sola vez para todos, con clave propia) arranca el recorrido de siete viñetas
//     de src/ui/duel-tour.js. introIfNeeded() y replay() son la fachada. Verlo no escribe K_HELP, K_INTRO ni K_UNLOCKED.
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

  // ---- Nivel 7 sin sincronizar -------------------------------------------------------------------------------------------------
  // El Worker exige el nivel 7 con la XP que TIENE de la cuenta, y esa XP la sube la sincronización. Quien ha llegado al nivel 7 en este
  // dispositivo (sin conexión, o antes de que se sincronizara) puede ver Duelos abiertos y recibir «level_required» durante un rato.
  // No se toca la validación del servidor: se pide una sincronización normal del progreso propio y se explica qué pasa (en lugar de
  // «los duelos se abren al nivel 7», que contradice lo que ve el jugador). Devuelve null si localmente tampoco hay nivel 7.
  function levelSyncMessage() {
    var st = null; try { st = typeof store === 'object' ? store : null; } catch (e) {}
    if (gate(st).level < NEED_LEVEL) return null;
    try { if (window.SEQOnline && window.SEQOnline.syncSoon) window.SEQOnline.syncSoon(); } catch (e) {}
    return 'Tu nivel aún no se ha sincronizado con tu cuenta. Inténtalo de nuevo en unos segundos.';
  }

  // ---- Tutorial de Duelos (fachada) ------------------------------------------------------------------------------------------
  // El recorrido interactivo de siete viñetas vive en src/ui/duel-tour.js (textos en src/data/duel-tour-steps.js). Estas dos funciones
  // se conservan como punto de entrada para index.html y la Ayuda. El recorrido usa su PROPIA clave (siredwards_quiz_duel_tour_seen):
  // ya no se escribe K_HELP ni K_INTRO al verlo, así que no puede alterar las condiciones de desbloqueo de Duelos.
  // Desde showDuelHelpIfNeeded: true si lo ha mostrado o lo ha dejado programado (se aplaza si hay una partida, invitación o sala activas).
  function introIfNeeded() { try { return !!(window.SEQDuelTour && window.SEQDuelTour.startIfNeeded()); } catch (e) { return false; } }
  // Desde el botón «Ver el tutorial» de la Ayuda: lo enseña siempre que sea seguro, sin cambiar ninguna marca.
  function replay() { try { return !!(window.SEQDuelTour && window.SEQDuelTour.replay()); } catch (e) { return false; } }

  try { document.addEventListener('DOMContentLoaded', function () { refresh(); }); } catch (e) {}

  window.SEQDuelIntro = {
    gate: gate, takeNewUnlock: takeNewUnlock, resetLocal: resetLocal, onAccountSwitch: onAccountSwitch, markOpenSilently: markOpenSilently, intercept: intercept, refresh: refresh, introIfNeeded: introIfNeeded, replay: replay, levelSyncMessage: levelSyncMessage,
    NEED_LEVEL: NEED_LEVEL
  };
})();
