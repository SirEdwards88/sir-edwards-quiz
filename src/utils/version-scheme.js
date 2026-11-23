// SirEdwards Quiz 0.9 — migración única de la clave «novedades vistas» tras renumerar las versiones públicas.
// Hasta la 2.0 la numeración pública era 1.0 … 2.0; ahora esas versiones son 0.1 … 0.9 (la 1.0 queda para el lanzamiento en
// Google Play). Un jugador que ya vio el aviso de la «2.0» tiene guardado "2.0" en siredwards_quiz_v1_3_update_seen: sin traducirlo
// recibiría de nuevo el aviso de la 0.9, y comparar números a ciegas no sirve porque «1.5» antiguo y «1.5» futuro colisionan.
// Por eso se traduce UNA vez, y una marca (UPDATE_SCHEME_KEY) deja constancia de que el valor guardado ya usa la numeración nueva.
// Solo toca esas dos claves de «novedades»; nunca el progreso (siredwards_quiz_v1_0_data) ni la bienvenida.
// Script clásico, sin dependencias. migrate() se ejecuta al cargar; la parte pura (legacyToCurrent) se prueba en test/version-scheme.test.mjs.

(function (root) {
  'use strict';

  var UPDATE_SEEN_KEY = 'siredwards_quiz_v1_3_update_seen';
  var UPDATE_SCHEME_KEY = 'siredwards_quiz_v1_3_update_seen_scheme';
  var SCHEME = '0.x';

  // [numeración antigua, numeración nueva], de menor a mayor. Un valor intermedio (p. ej. 1.3) cuenta como la entrada anterior.
  var LEGACY = [[[1, 0], '0.1'], [[1, 1], '0.2'], [[1, 2], '0.3'], [[1, 5], '0.4'], [[1, 6], '0.5'], [[1, 7], '0.6'], [[2, 0], '0.9']];

  function parse(v) {
    var m = /^v?(\d+)\.(\d+)(?:\.\d+)*$/.exec(String(v == null ? '' : v).trim());
    return m ? [parseInt(m[1], 10), parseInt(m[2], 10)] : null;
  }

  // Traduce un valor «visto» de la numeración antigua a la nueva. Devuelve null si no es una versión antigua reconocible.
  function legacyToCurrent(v) {
    var p = parse(v);
    if (!p || p[0] < 1) return null;
    var out = null;
    for (var i = 0; i < LEGACY.length; i++) {
      var k = LEGACY[i][0];
      if (p[0] > k[0] || (p[0] === k[0] && p[1] >= k[1])) out = LEGACY[i][1];
    }
    return out;
  }

  // Devuelve 'migrated' (había valor antiguo y se tradujo), 'marked' (nada que traducir; se deja la marca) o 'skipped'.
  function migrate(storage) {
    try {
      var s = storage || root.localStorage;
      if (s.getItem(UPDATE_SCHEME_KEY) === SCHEME) return 'skipped';
      var seen = s.getItem(UPDATE_SEEN_KEY);
      var next = seen === null ? null : legacyToCurrent(seen);
      if (next !== null) s.setItem(UPDATE_SEEN_KEY, next);
      s.setItem(UPDATE_SCHEME_KEY, SCHEME);
      return next !== null ? 'migrated' : 'marked';
    } catch (e) { return 'skipped'; }
  }

  root.SEQVersionScheme = { legacyToCurrent: legacyToCurrent, migrate: migrate, UPDATE_SEEN_KEY: UPDATE_SEEN_KEY, UPDATE_SCHEME_KEY: UPDATE_SCHEME_KEY };
  if (typeof document !== 'undefined') migrate();
})(typeof window !== 'undefined' ? window : globalThis);
