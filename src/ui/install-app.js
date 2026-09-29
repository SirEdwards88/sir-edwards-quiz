// SirEdwards Quiz v2.0 — «Instalar la app» en Ajustes.
//
// El aviso flotante de instalación (index.html, #pwa-install-hint) se puede cerrar y no vuelve
// en un tiempo; esta entrada fija en Ajustes es el camino que siempre está ahí mientras la app se
// use desde el navegador. Se oculta sola dentro de la app instalada.
//   - Android/Chrome: usa el aviso nativo guardado (deferredInstallPrompt, index.html).
//   - iOS/Safari o navegadores sin aviso nativo: explica en una frase cómo hacerlo desde el menú.
// Script clásico: usa por nombre, en tiempo de ejecución, isStandaloneDisplay y deferredInstallPrompt.

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function standalone() { try { return isStandaloneDisplay(); } catch (e) { return false; } }
  function nativePrompt() { try { return deferredInstallPrompt || null; } catch (e) { return null; } }
  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (ua.indexOf('Macintosh') !== -1 && 'ontouchend' in document);
  }
  function manualText() {
    return isIOS()
      ? 'En Safari, toca el botón de compartir y elige «Añadir a pantalla de inicio».'
      : 'Abre el menú del navegador (⋮) y elige «Instalar aplicación» o «Añadir a pantalla de inicio».';
  }

  function refresh() {
    var group = $('install-app-group');
    if (!group) return;
    group.style.display = standalone() ? 'none' : '';
    var note = $('install-app-note');
    if (note && nativePrompt()) note.style.display = 'none';
  }

  function install() {
    var p = nativePrompt();
    var note = $('install-app-note');
    if (p) {
      p.prompt();
      Promise.resolve(p.userChoice).catch(function () {}).then(function () {
        try { deferredInstallPrompt = null; } catch (e) {}
        refresh();
      });
      return;
    }
    if (note) { note.textContent = manualText(); note.style.display = 'block'; }
  }

  window.SEQInstall = { refresh: refresh, install: install };
  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('appinstalled', refresh);
})();
