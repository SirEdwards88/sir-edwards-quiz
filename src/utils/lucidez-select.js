// SirEdwards Quiz — Lucidez Mental: selección de las preguntas de cultura de UNA partida (10 + 5 + 9).
//
// Función pura y determinista si se le pasa `rng`: el cliente le pasa Math.random (y su memoria de «vistas»),
// el Worker (Retos) una PRNG con semilla, así los dos jugadores de un Reto reciben exactamente lo mismo.
//
// Qué entra: solo preguntas con `lz` 'A' o 'B' (criba 2.2: recuperables sin opciones, respuesta clara y corta).
// Curva por fase (la dificultad la manda el plan, no la categoría):
//   Fase I   (10): 1 fácil + 7 medias + 2 difíciles, de menos a más.
//   Fase II  (5):  5 medias.
//   Fase III (9):  4 medias + 5 difíciles, de menos a más.
// Variedad: máx. 3 de una categoría en la Fase I, 2 en la II y 3 en la III; máx. 6 en toda la partida; mínimo 2 de
// cada una de las seis categorías; nunca 3 seguidas iguales. Pares (`par`): dos preguntas cuyo enunciado destapa la
// respuesta de la otra no coinciden en la misma partida. Dentro de cada nivel las A pesan 3 y las B pesan 1.
// `avoid` (opcional, Set o array de ids): preguntas a evitar si hay alternativa (la memoria del cliente).
// La MEMORIA manda sobre la variedad: nunca se repite una pregunta si queda una alternativa válida no vista, aunque haya
// que romper un límite de categoría. Solo se repite cuando no queda ninguna no vista de ese nivel. La curva nunca se rompe.
//
// Script clásico (scope global), sin dependencias.
// IMPORTANTE: el Worker (backend) tiene una COPIA LITERAL de este archivo en src/lucidez-select.js (con un `export` al final);
// su test comprueba que el cuerpo es idéntico. Si cambias algo aquí, cópialo allí y vuelve a desplegar el Worker.

const SEQLucidezSelect = (function () {
  'use strict';

  var PLAN = {
    1: [['facil', 1], ['medio', 7], ['dificil', 2]],
    2: [['medio', 5]],
    3: [['medio', 4], ['dificil', 5]]
  };
  var CAT_LIMIT_PHASE = { 1: 3, 2: 2, 3: 3 };
  var CAT_LIMIT_GAME = 6;
  var CAT_MIN_GAME = 2;
  var RANK = { facil: 0, medio: 1, dificil: 2 };
  var CATS = ['historia', 'geografia', 'ciencia', 'arte_literatura', 'deporte', 'cultura_general'];

  function rnd(rng) { return rng ? rng() : Math.random(); }

  function toSet(x) {
    var s = {};
    if (x && typeof x.forEach === 'function') x.forEach(function (v) { s[v] = 1; });
    return s;
  }

  function isEligible(q) { return q && (q.lz === 'A' || q.lz === 'B'); }

  function weightedPick(list, rng) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += list[i].lz === 'A' ? 3 : 1;
    var r = rnd(rng) * total;
    for (i = 0; i < list.length; i++) {
      r -= list[i].lz === 'A' ? 3 : 1;
      if (r < 0) return list[i];
    }
    return list[list.length - 1];
  }

  // Ordena una fase de menos a más dificultad (el orden entre iguales sale del sorteo) evitando 3 preguntas seguidas
  // de la misma categoría: en cada hueco se elige, entre las válidas, una de la categoría con más pendientes.
  function orderPhase(items, rng) {
    var left = items.map(function (q) { return { q: q, k: rnd(rng) }; });
    left.sort(function (a, b) { return RANK[a.q.dif] - RANK[b.q.dif] || a.k - b.k; });
    left = left.map(function (t) { return t.q; });
    var out = [];
    while (left.length) {
      var lvl = left[0].dif;
      var group = left.filter(function (q) { return q.dif === lvl; });
      var p1 = out.length ? out[out.length - 1].cat : null;
      var p2 = out.length > 1 ? out[out.length - 2].cat : null;
      var valid = group.filter(function (q) { return !(q.cat === p1 && q.cat === p2); });
      if (!valid.length) valid = group;
      var best = 0, bestN = -1;
      for (var i = 0; i < valid.length; i++) {
        var n = group.filter(function (q) { return q.cat === valid[i].cat; }).length;
        if (n > bestN) { bestN = n; best = i; }
      }
      var pick = valid[best];
      out.push(pick);
      left.splice(left.indexOf(pick), 1);
    }
    // Reparación: si una tanda de 3 cruza dos niveles, se intercambia una de sus preguntas con otra del mismo nivel.
    for (var rep = 0; rep < 20 && triples(out) > 0; rep++) {
      var before = triples(out), fixed = false;
      for (var a = 0; a < out.length && !fixed; a++) {
        for (var b = 0; b < out.length && !fixed; b++) {
          if (a === b || out[a].dif !== out[b].dif || out[a].cat === out[b].cat) continue;
          var tmp = out[a]; out[a] = out[b]; out[b] = tmp;
          if (triples(out) < before) fixed = true; else { tmp = out[a]; out[a] = out[b]; out[b] = tmp; }
        }
      }
      if (!fixed) break;
    }
    return out;
  }

  function triples(arr) {
    var n = 0;
    for (var i = 2; i < arr.length; i++) if (arr[i].cat === arr[i - 1].cat && arr[i].cat === arr[i - 2].cat) n++;
    return n;
  }

  function select(bank, rng, avoid) {
    var pool = (bank || []).filter(isEligible);
    var avoidSet = toSet(avoid);
    var used = {}, banned = {}, catGame = {};
    var phases = { 1: [], 2: [], 3: [] };

    function blocked(q) {
      if (used[q.n] || banned[q.n]) return true;
      var p = q.par;
      if (p) for (var i = 0; i < p.length; i++) if (used[p[i]]) return true;
      return false;
    }
    function take(q, fase, catPhase) {
      used[q.n] = 1;
      if (q.par) for (var i = 0; i < q.par.length; i++) banned[q.par[i]] = 1;
      catGame[q.cat] = (catGame[q.cat] || 0) + 1;
      if (catPhase) catPhase[q.cat] = (catPhase[q.cat] || 0) + 1;
      if (fase) phases[fase].push(q);
    }

    [1, 2, 3].forEach(function (fase) {
      var catPhase = {};
      PLAN[fase].forEach(function (tramo) {
        var nivel = tramo[0], cuantas = tramo[1];
        for (var n = 0; n < cuantas; n++) {
          var base = pool.filter(function (q) { return q.dif === nivel && !blocked(q); });
          // Intentos de más estricto a más laxo. La memoria manda: primero todas las no vistas (con variedad completa,
          // luego solo con el límite de fase, luego sin límites de categoría); solo si no queda ninguna no vista de
          // este nivel se admite una ya vista (otra vez de más estricta a más laxa en variedad).
          var full = function (q) { return (catPhase[q.cat] || 0) < CAT_LIMIT_PHASE[fase] && (catGame[q.cat] || 0) < CAT_LIMIT_GAME; };
          var phaseOk = function (q) { return (catPhase[q.cat] || 0) < CAT_LIMIT_PHASE[fase]; };
          var tiers = [
            function (q) { return !avoidSet[q.n] && full(q); },
            function (q) { return !avoidSet[q.n] && phaseOk(q); },
            function (q) { return !avoidSet[q.n]; },
            full,
            phaseOk,
            function () { return true; }
          ];
          var cand = [];
          for (var t = 0; t < tiers.length && !cand.length; t++) cand = base.filter(tiers[t]);
          if (!cand.length) continue; // banco sin preguntas de ese nivel: se devuelven menos, nunca de otro nivel
          take(weightedPick(cand, rng), fase, catPhase);
        }
      });
    });

    // Mínimo CAT_MIN_GAME por categoría: se cambia una pregunta de una categoría sobrada por otra del MISMO nivel.
    for (var guard = 0; guard < 24; guard++) {
      var missing = CATS.filter(function (c) { return (catGame[c] || 0) < CAT_MIN_GAME; });
      if (!missing.length) break;
      var done = false;
      for (var m = 0; m < missing.length && !done; m++) {
        var c = missing[m];
        var repl = pool.filter(function (q) { return q.cat === c && !blocked(q); });
        // La memoria manda también aquí: el cambio por mínimo de categoría nunca mete una pregunta ya vista.
        repl = repl.filter(function (q) { return !avoidSet[q.n]; });
        // Mezcla simple para no favorecer siempre al mismo reemplazo.
        repl = repl.map(function (q) { return { q: q, k: rnd(rng) }; }).sort(function (a, b) { return a.k - b.k; }).map(function (x) { return x.q; });
        for (var r = 0; r < repl.length && !done; r++) {
          var q2 = repl[r];
          for (var f = 3; f >= 1 && !done; f--) {
            for (var i = 0; i < phases[f].length && !done; i++) {
              var v = phases[f][i];
              if (v.dif !== q2.dif || (catGame[v.cat] || 0) <= CAT_MIN_GAME) continue;
              var inPhase = phases[f].filter(function (x) { return x.cat === q2.cat; }).length;
              if (inPhase >= CAT_LIMIT_PHASE[f]) continue;
              used[v.n] = 0;
              if (blocked(q2)) { used[v.n] = 1; continue; }
              catGame[v.cat]--;
              phases[f][i] = q2;
              used[q2.n] = 1;
              catGame[q2.cat] = (catGame[q2.cat] || 0) + 1;
              if (q2.par) for (var k = 0; k < q2.par.length; k++) banned[q2.par[k]] = 1;
              done = true;
            }
          }
        }
      }
      if (!done) break;
    }

    return { p1: orderPhase(phases[1], rng), p2: orderPhase(phases[2], rng), p3: orderPhase(phases[3], rng) };
  }

  return { select: select, isEligible: isEligible, PLAN: PLAN, CAT_LIMIT_PHASE: CAT_LIMIT_PHASE, CAT_LIMIT_GAME: CAT_LIMIT_GAME, CAT_MIN_GAME: CAT_MIN_GAME, CATS: CATS };
})();
