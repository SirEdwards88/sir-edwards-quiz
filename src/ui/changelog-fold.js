// SirEdwards Quiz 2.5 — historial de versiones plegable (Ajustes).
// El historial (de la más antigua a la más reciente) ocupaba mucho. Aquí solo se deja visible la última versión y todas las
// anteriores se pliegan en un <details> con el botón «Versiones anteriores (N)», colocado encima de la visible; al abrirlo, las
// antiguas aparecen entre el botón y la última, en orden cronológico. N se calcula, no se escribe a mano: al publicar una versión
// nueva no hay que tocar nada aquí. No toca el contenido de las entradas
// (la etiqueta «ACTUAL» y el resumen de novedades las siguen leyendo de .settings-changelog-entry, estén donde estén).
// Script clásico, sin dependencias. La parte pura (foldCount) se prueba en test/changelog-fold.test.mjs.

(function (root) {
  'use strict';

  var KEEP = 1;

  // Cuántas entradas se pliegan para un total dado (0 si no hay más que las visibles).
  function foldCount(total, keep) {
    var k = keep === undefined ? KEEP : keep;
    return total > k ? total - k : 0;
  }

  function fold(doc) {
    var d = doc || root.document;
    var host = d.querySelector('.settings-changelog');
    if (!host || host.querySelector('.settings-changelog-older')) return false;   // idempotente
    var entries = Array.prototype.slice.call(host.querySelectorAll(':scope > .settings-changelog-entry'));
    var n = foldCount(entries.length);
    if (!n) return false;
    var older = d.createElement('details');
    older.className = 'settings-changelog-older';
    var sum = d.createElement('summary');
    sum.className = 'settings-changelog-older-btn';
    sum.textContent = 'Versiones anteriores (' + n + ')';
    older.appendChild(sum);
    var body = d.createElement('div');
    body.className = 'settings-changelog-older-body';
    entries.slice(0, n).forEach(function (e) { body.appendChild(e); });
    older.appendChild(body);
    host.insertBefore(older, host.firstChild);
    return true;
  }

  var api = { foldCount: foldCount, fold: fold };
  root.SEQChangelogFold = api;
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fold(); });
  else fold();
})(typeof window !== 'undefined' ? window : globalThis);
