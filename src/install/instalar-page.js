// SirEdwards Quiz — página de instalación (instalar.html). Autónoma: no usa nada del juego.
//   - Android / ordenador (Chrome, Edge…): guarda el aviso nativo 'beforeinstallprompt' y lo lanza con el botón.
//   - iPhone / iPad: no existe botón; se destacan los tres pasos de Safari.
//   - Ya instalada (modo standalone o 'appinstalled'): ofrece abrir el juego.
//   - Sin aviso nativo (Firefox, aviso ya usado, app ya instalada en este navegador): texto con el camino manual.
// Script clásico. La parte pura (detectPlatform / statusText) se prueba en test/instalar.test.mjs.

(function (root) {
  'use strict';

  function detectPlatform(ua, touch) {
    ua = String(ua || '');
    var ios = /iPad|iPhone|iPod/.test(ua) || (ua.indexOf('Macintosh') !== -1 && !!touch);
    var safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    return { ios: ios, safari: safari };
  }

  // Texto de estado según lo que se sepa. state: 'installed' | 'ready' | 'ios' | 'manual' | 'wait'
  function statusText(state, plat) {
    if (state === 'installed') return 'Ya lo tienes instalado. Qué eficiencia.';
    if (state === 'ready') return 'Un toque y queda en tu pantalla de inicio.';
    if (state === 'ios') return plat && plat.safari ? 'En iPhone se hace desde el menú de Safari. Sigue los tres pasos de abajo.'
      : 'En iPhone se instala desde Safari. Abre esta página allí y sigue los tres pasos de abajo.';
    if (state === 'manual') return 'Abre el menú del navegador (⋮) y elige «Instalar aplicación» o «Añadir a pantalla de inicio». Si no aparece, ya está instalada o este navegador no lo permite.';
    return 'Preparando la instalación…';
  }

  var api = { detectPlatform: detectPlatform, statusText: statusText };
  root.SEQInstalarPage = api;
  if (typeof document === 'undefined') return;

  var doc = document, deferred = null, installed = false, timer = 0;
  function $(id) { return doc.getElementById(id); }
  function standalone() {
    try { return (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) || root.navigator.standalone === true; } catch (e) { return false; }
  }
  var plat = detectPlatform(root.navigator && root.navigator.userAgent, 'ontouchend' in doc);

  function render() {
    var btn = $('ins-btn'), st = $('ins-status'), open = $('ins-open'), ios = $('ins-ios');
    if (!btn || !st) return;
    var state = installed || standalone() ? 'installed' : plat.ios ? 'ios' : deferred ? 'ready' : timer === -1 ? 'manual' : 'wait';
    st.textContent = statusText(state, plat);
    btn.hidden = state !== 'ready';
    if (open) open.hidden = state !== 'installed';
    if (ios) { ios.classList.toggle('is-hint', state === 'ios'); ios.hidden = state === 'installed'; }
    var qr = doc.querySelector('.ins-qr'); if (qr) qr.hidden = state === 'installed';
  }

  root.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; render(); });
  root.addEventListener('appinstalled', function () { installed = true; deferred = null; render(); });

  doc.addEventListener('DOMContentLoaded', function () {
    var btn = $('ins-btn');
    if (btn) btn.addEventListener('click', function () {
      if (!deferred) return;
      var p = deferred; deferred = null; render();
      try { p.prompt(); Promise.resolve(p.userChoice).catch(function () {}).then(render); } catch (e) { render(); }
    });
    // Para que el navegador considere la app instalable aquí también (mismo service worker que el juego).
    try { if ('serviceWorker' in root.navigator) root.navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
    render();
    // Si en unos segundos no llega el aviso nativo, se explica el camino manual.
    timer = setTimeout(function () { timer = -1; render(); }, 2500);
  });
})(typeof window !== 'undefined' ? window : globalThis);
