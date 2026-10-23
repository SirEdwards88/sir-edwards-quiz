// SirEdwards Quiz — Repaso por tandas: cada partida de Repaso trae como mucho 20 de las preguntas falladas pendientes.
//
// Con muchos fallos acumulados (80, 100…) repasar todo de una vez era un coñazo. La bolsa de repaso sigue teniendo todas las
// pendientes (el número entre paréntesis en la tarjeta del modo es el total). Cada partida coge las 20 que hace MÁS TIEMPO que
// no salen en un Repaso (las que nunca han salido, primero; los empates, al azar): así ninguna se queda olvidada.
// Una pregunta sale de la bolsa solo al dominarla (3 aciertos seguidos), como hasta ahora.
//
// Cuándo salió cada una se guarda en este dispositivo, en su propia clave (no toca la clave de datos del juego ni se sincroniza:
// si cambias de dispositivo, la rotación empieza de cero y ya). Si localStorage falla, se reparte al azar y sigue funcionando.
// Script clásico: window.SEQReviewBatch. La parte pura (pick) se prueba con el azar y el registro inyectados.

(function (root) {
  'use strict';

  var BATCH = 20;
  var KEY = 'siredwards_quiz_v2_review_seen';   // { [n]: marca de tiempo del último Repaso en que salió }

  // pool: preguntas pendientes; seen: { n: ts }. Devuelve una lista NUEVA de como mucho `max`: las que más tiempo llevan sin salir.
  function pick(pool, seen, max, rnd) {
    var list = Array.isArray(pool) ? pool.slice() : [];
    var n = Math.max(1, max | 0 || BATCH), r = typeof rnd === 'function' ? rnd : Math.random, s = seen && typeof seen === 'object' ? seen : {};
    if (list.length <= n) return list;
    for (var i = list.length - 1; i > 0; i--) {   // se baraja primero: los empates (p. ej. «nunca han salido») quedan al azar
      var j = Math.floor(r() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t;
    }
    var tsOf = function (q) { var v = q && s[q.n]; return typeof v === 'number' && isFinite(v) ? v : 0; };
    list = list.map(function (q, k) { return { q: q, k: k, t: tsOf(q) }; }).sort(function (a, b) { return a.t - b.t || a.k - b.k; });
    return list.slice(0, n).map(function (x) { return x.q; });
  }

  function load() { try { var o = JSON.parse(root.localStorage.getItem(KEY)); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
  // Anota las de esta tanda y se queda solo con las que siguen pendientes (el registro no crece más que la bolsa).
  function save(seen, batch, pool, now) {
    try {
      var keep = {}, t = typeof now === 'number' ? now : Date.now();
      (pool || []).forEach(function (q) { if (q && seen[q.n]) keep[q.n] = seen[q.n]; });
      (batch || []).forEach(function (q) { if (q) keep[q.n] = t; });
      root.localStorage.setItem(KEY, JSON.stringify(keep));
    } catch (e) {}
  }

  // Para Repaso: elige la tanda y la anota como vista.
  function next(pool) {
    var seen = load(), batch = pick(pool, seen, BATCH);
    save(seen, batch, pool);
    return batch;
  }

  root.SEQReviewBatch = { pick: pick, next: next, save: save, load: load, BATCH: BATCH, KEY: KEY };
})(typeof window !== 'undefined' ? window : globalThis);
