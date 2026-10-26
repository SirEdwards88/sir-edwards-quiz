/* Aviso solemne al desbloquear Lucidez Mental (10 Fragmentos de Mente).
   Pantalla completa, una sola vez (el desbloqueo ya queda anotado en notifiedModeUnlocks), con los estilos
   de .lucidez-story-overlay y el sonido de la Fase 1. NO se puede saltar: dura lo que el sonido entero.
   Mientras tanto, los sonidos propios de la tarjeta final (récord, victoria...) quedan en espera (gate) y
   suenan al cerrarse, seguidos del aviso flotante (con la pista de los logros secretos) y el confeti,
   como en el resto de modos. */
(function (root) {
  'use strict';
  var TITLE = 'LUCIDEZ DESBLOQUEADA';
  var SUB = 'Hay una puerta que ya puedes cruzar.';
  var TOAST_EXTRA = 'Tres logros secretos desvelados.';
  var FALLBACK_MS = 4500, MIN_MS = 2500, MAX_MS = 9000, TAIL_MS = 300, GAP_MS = 1400, SAFETY_MS = 20000;
  var GATED = ['playSound', 'playRecordSound'];

  function isUnlock(modes) {
    return Array.isArray(modes) && modes.some(function (m) { return m && (m.id === 'lucidez_mental' || m.name === 'Lucidez Mental'); });
  }

  // --- Sonidos en espera ---
  var gated = false, queue = [], originals = {}, safety = null;
  function gate(modes) {
    if (gated || !isUnlock(modes)) return;
    gated = true; queue = [];
    GATED.forEach(function (n) {
      var f = root[n]; if (typeof f !== 'function') return;
      originals[n] = f;
      root[n] = function () { queue.push([n, Array.prototype.slice.call(arguments)]); };
    });
    safety = setTimeout(release, SAFETY_MS);
  }
  // Devuelve cuántos sonidos estaban en espera (ya reproducidos).
  function release() {
    if (!gated) return 0;
    gated = false;
    if (safety) { clearTimeout(safety); safety = null; }
    GATED.forEach(function (n) { if (originals[n]) root[n] = originals[n]; });
    var q = queue; queue = [];
    q.forEach(function (c) { try { originals[c[0]].apply(root, c[1]); } catch (e) {} });
    return q.length;
  }

  function durationMs() {
    try {
      if (root.store && root.store.sound === 'off') return MIN_MS;
      /* global sampleBuffers */
      if (typeof sampleBuffers !== 'undefined' && sampleBuffers.luc1 && sampleBuffers.luc1.duration) {
        return Math.max(MIN_MS, Math.min(MAX_MS, Math.ceil(sampleBuffers.luc1.duration * 1000) + TAIL_MS));
      }
    } catch (e) {}
    return FALLBACK_MS;
  }

  function run(modes, done) {
    var called = false;
    function finish(delay) { if (called) return; called = true; if (delay) setTimeout(function () { try { done && done(); } catch (e) {} }, delay); else { try { done && done(); } catch (e) {} } }
    if (!isUnlock(modes) || typeof document === 'undefined') { release(); finish(0); return; }
    var el = document.createElement('div');
    el.className = 'lucidez-story-overlay show tone-success lucidez-unlock-overlay';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-label', TITLE);
    var icon = '';
    try { icon = root.SEQIcons ? root.SEQIcons.src('modo-secreto') : ''; } catch (e) {}
    el.innerHTML = '<div>' +
      '<div class="lucidez-story-icon">' + (icon ? '<img class="lucidez-story-img lucidez-unlock-img" src="' + icon + '" alt="" draggable="false">' : '') + '</div>' +
      '<div class="lucidez-story-title">' + TITLE + '</div>' +
      '<div class="lucidez-story-sub">' + SUB + '</div>' +
      '</div>';
    document.body.appendChild(el);
    try { if (typeof root.playLucidezChapterSound === 'function') root.playLucidezChapterSound('phase1'); } catch (e) {}
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      // Primero los sonidos de la tarjeta (récord...); si había alguno, el de victoria espera a que se oiga.
      var n = release();
      finish(n ? GAP_MS : 0);
    }, durationMs());
  }

  var api = { isUnlock: isUnlock, gate: gate, release: release, run: run, TITLE: TITLE, SUB: SUB, TOAST_EXTRA: TOAST_EXTRA };
  root.SEQLucidezUnlock = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
