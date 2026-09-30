// SirEdwards Quiz v2.0 — efectos de la partida y de los resultados ("feel" de juego).
//
// Solo presentación: NO cambia puntuación, XP, rachas, logros ni guardado. Observa el DOM que ya pinta
// index.html (botones de respuesta, contador de racha, tarjeta de resultados) y añade encima:
//   - Acierto: destello verde en la tarjeta (las chispas se reservan para logros y modos nuevos).
//   - Fallo: sacudida breve de la tarjeta.
//   - Racha: la píldora 🔥 se "calienta" (3 / 5 / 10) y los hitos (3, 5, 10, 15, 20…) muestran un aviso.
//   - Resultados: las cifras cuentan hacia arriba, confeti cuando hay algo que celebrar
//     (≥70 % de aciertos, récord, logro o modo nuevo) y títulos en singular/plural correctos.
// Con «reducir movimiento» del sistema no hay animaciones (solo los títulos).
// Script clásico, sin dependencias. Se engancha solo en DOMContentLoaded.

(function () {
  'use strict';

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function $(id) { return document.getElementById(id); }
  function card() { return $('main-card-container'); }
  function flash(el, cls, ms) {
    if (!el || reduce) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // ---- Chispas y confeti (un único canvas a pantalla completa, sin capturar toques) --------------
  var canvas = null, ctx = null, parts = [], raf = 0;
  var COLORS = ['#c9992e', '#e8c874', '#f0d99a', '#1849b3', '#5b2e8f', '#b6202f', '#fffdf8'];
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var alive = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.life -= 1; if (p.life <= 0) continue;
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 25);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.shape === 'star') {
        ctx.beginPath();
        for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2; ctx.lineTo(Math.cos(a) * p.s, Math.sin(a) * p.s); ctx.lineTo(Math.cos(a + Math.PI / 4) * p.s * .38, Math.sin(a + Math.PI / 4) * p.s * .38); }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.fillRect(-p.s / 2, -p.s * .3, p.s, p.s * .6);
      }
      ctx.restore();
      alive.push(p);
    }
    parts = alive;
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = 0; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
  }
  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function sparks(x, y, n) {
    if (reduce) return;
    ensureCanvas();
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4.5;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: .12, drag: .95, s: 5 + Math.random() * 6,
        rot: Math.random() * 6, vr: (Math.random() - .5) * .3, life: 34 + Math.random() * 18, c: COLORS[i % 3], shape: 'star' });
    }
    start();
  }
  function confetti() {
    if (reduce) return;
    ensureCanvas();
    var w = window.innerWidth;
    for (var i = 0; i < 140; i++) {
      var fromLeft = i % 2 === 0;
      parts.push({ x: fromLeft ? -10 : w + 10, y: window.innerHeight * (.35 + Math.random() * .25),
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 7), vy: -(6 + Math.random() * 8), g: .22, drag: .985,
        s: 7 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 110 + Math.random() * 60,
        c: COLORS[i % COLORS.length], shape: Math.random() < .25 ? 'star' : 'rect' });
    }
    start();
  }

  // ---- Respuestas ------------------------------------------------------------------------------
  function watchChoices() {
    var box = $('choice-options');
    if (!box || typeof MutationObserver === 'undefined') return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (!t.classList || !t.classList.contains('choice-btn') || t.dataset.fxDone) continue;
        if (t.classList.contains('selected') && t.classList.contains('correct')) {
          t.dataset.fxDone = '1';
          // Solo el destello: las chispas se reservan para logros y modos nuevos (no en cada acierto).
          flash(card(), 'fx-ok', 650);
        } else if (t.classList.contains('incorrect')) {
          t.dataset.fxDone = '1';
          flash(card(), 'fx-bad', 520);
        }
      }
    }).observe(box, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // ---- Racha -----------------------------------------------------------------------------------
  var MILESTONES = [3, 5, 10, 15, 20, 25, 30, 40, 50];
  var lastStreak = 0;
  function streakBanner(n) {
    var host = $('view-game');
    if (!host || reduce) return;
    var old = host.querySelector('.fx-streak-banner'); if (old) old.remove();
    var b = document.createElement('div');
    b.className = 'fx-streak-banner';
    b.setAttribute('aria-hidden', 'true');
    b.innerHTML = '<span class="fx-streak-fire">🔥</span><span class="fx-streak-num"></span><span class="fx-streak-lbl">¡seguidas!</span>';
    b.querySelector('.fx-streak-num').textContent = String(n);
    host.appendChild(b);
    setTimeout(function () { b.remove(); }, 1500);
  }
  function onStreak() {
    var el = $('game-current-streak'), pill = $('game-streak-inline');
    if (!el || !pill) return;
    var n = parseInt(el.textContent, 10) || 0;
    pill.classList.toggle('fx-heat-1', n >= 3 && n < 5);
    pill.classList.toggle('fx-heat-2', n >= 5 && n < 10);
    pill.classList.toggle('fx-heat-3', n >= 10);
    if (n > lastStreak && MILESTONES.indexOf(n) !== -1) streakBanner(n);
    lastStreak = n;
  }
  function watchStreak() {
    var el = $('game-current-streak');
    if (!el || typeof MutationObserver === 'undefined') return;
    new MutationObserver(onStreak).observe(el, { childList: true, characterData: true, subtree: true });
  }

  // ---- Resultados ------------------------------------------------------------------------------
  function countUp(el, ms) {
    if (!el || reduce) return;
    var final = el.textContent;
    var m = final.match(/^(\D*)(\d+)(.*)$/);
    if (!m) return;
    var target = parseInt(m[2], 10);
    if (!(target > 0)) return;
    var t0 = performance.now();
    (function step(now) {
      if (el.textContent !== final && el.dataset.fxCounting !== '1') return; // otro código lo cambió: se respeta
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      el.dataset.fxCounting = '1';
      el.textContent = k < 1 ? m[1] + Math.round(target * e) + m[3] : final;
      if (k < 1) requestAnimationFrame(step); else delete el.dataset.fxCounting;
    })(t0);
  }
  function shown(id) {
    var el = $(id);
    return !!el && (el.classList.contains('show') || el.style.display === 'block');
  }
  function pluralTitles() {
    var set = function (boxId, listId, one, many) {
      var box = $(boxId), list = $(listId); if (!box || !list) return;
      var title = box.firstElementChild; if (!title) return;
      var n = list.children.length;
      if (n) title.textContent = n === 1 ? one : many;
    };
    set('session-medals-box', 'session-medals-list', '🏆 ¡Nuevo logro desbloqueado!', '🏆 ¡Nuevos logros desbloqueados!');
    set('session-mode-unlock-box', 'session-mode-unlock-list', '🎮✨ ¡Nuevo modo desbloqueado!', '🎮✨ ¡Nuevos modos desbloqueados!');
  }
  var resultsVisible = false;
  function onResults() {
    var rc = $('results-card');
    var vis = !!rc && rc.style.display !== 'none' && getComputedStyle(rc).display !== 'none';
    if (vis && !resultsVisible) {
      lastStreak = 0;
      setTimeout(function () {
        // El porcentaje se lee ANTES de animar las cifras (la animación empieza escribiendo 0 %).
        var pct = parseInt(($('res-percentage-text') || {}).textContent, 10);
        countUp($('res-score-text'), 900);
        countUp($('res-percentage-text'), 900);
        pluralTitles();
        var metrics = $('results-metrics-grid');
        var metricsOn = metrics && metrics.style.display !== 'none';
        // Confeti solo si la partida ha ido bien o hay récord; un logro o modo nuevo en una partida floja
        // se celebra con chispas sobre su propio recuadro (no con confeti sobre un «desastre absoluto»).
        var bigWin = (metricsOn && pct >= 70) || !!document.querySelector('#results-record-badge:not(:empty)');
        if (bigWin) setTimeout(confetti, 250);
        else ['session-mode-unlock-box', 'session-medals-box'].forEach(function (id, k) {
          if (!shown(id)) return;
          setTimeout(function () { var r = $(id).getBoundingClientRect(); if (r.top < window.innerHeight) sparks(r.left + r.width / 2, r.top + 16, 26); }, 450 + k * 250);
        });
      }, 60);
    }
    resultsVisible = vis;
  }
  function watchResults() {
    var rc = $('results-card');
    if (!rc || typeof MutationObserver === 'undefined') return;
    new MutationObserver(onResults).observe(rc, { attributes: true, attributeFilter: ['style', 'class'] });
    ['session-medals-list', 'session-mode-unlock-list'].forEach(function (id) {
      var l = $(id); if (l) new MutationObserver(pluralTitles).observe(l, { childList: true });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    try { watchChoices(); watchStreak(); watchResults(); } catch (e) { /* los efectos nunca deben romper el juego */ }
  });
  window.SEQFx = { sparks: sparks, confetti: confetti };
})();
