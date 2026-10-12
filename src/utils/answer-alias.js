// 2.2 — Respuestas escritas con alias (Lucidez Mental, Enigma Final y Retos corregidos por el servidor).
// Una pregunta puede llevar `alias: [...]` con otras formas de escribir la misma respuesta («seis» para «6»,
// «24» para «24 segundos»). 2.4 — Además, el corrector flexible de siempre (src/utils/matching.js, que NO se toca)
// se envuelve en una guarda para que no dé por buenas respuestas que son OTRA opción del banco:
//   · una respuesta idéntica a la correcta o a un alias (sin tildes ni mayúsculas) siempre vale;
//   · si el jugador solo escribe una parte de la respuesta (el apellido, una palabra), esa parte debe escribirse
//     sin errores, tener 4 letras o más, no estar ya en el enunciado y no valer también para un distractor
//     del mismo número de pregunta en TEST_QUESTIONS («Justiniano» no vale para «Justiniano I» si «Justiniano II»
//     es una opción);
//   · si hay erratas, la respuesta debe quedar más cerca de la correcta que de cualquier distractor
//     («La Niña» ya no vale para «El Niño»).
// Los distractores salen de TEST_QUESTIONS (PWA) o de `q.rj` (copia del Worker, generada). Sin distractores se
// mantiene el comportamiento anterior salvo las reglas de «parte de la respuesta».
// Copia literal en el backend (src/answer-alias.js, con imports y un `export` al final): si cambias algo aquí, cópialo
// allí y vuelve a desplegar el Worker. Solo usa isMatchFlexible y normalizeText (matching.js).
var SEQAnswerGuard = (function () {
  'use strict';
  var FILL = { el: 1, la: 1, los: 1, las: 1, un: 1, una: 1, unos: 1, unas: 1, de: 1, del: 1, al: 1, en: 1, por: 1, para: 1, con: 1, y: 1, e: 1, que: 1, se: 1, es: 1, son: 1, fue: 1 };

  function tok(s) {
    return normalizeText(s).split(' ').filter(function (w) { return w && !FILL[w]; });
  }
  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [], i, j;
    for (i = 0; i <= a.length; i++) prev[i] = i;
    for (j = 1; j <= b.length; j++) {
      var cur = [j];
      for (i = 1; i <= a.length; i++) cur[i] = Math.min(cur[i - 1] + 1, prev[i] + 1, prev[i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[a.length];
  }
  function plural(t, w) { return t + 's' === w || w + 's' === t || t + 'es' === w || w + 'es' === t; }
  function strictTok(w, cT) { for (var i = 0; i < cT.length; i++) if (cT[i] === w || plural(cT[i], w)) return true; return false; }
  function covers(uT, cT) { if (!uT.length) return false; for (var i = 0; i < uT.length; i++) if (!strictTok(uT[i], cT)) return false; return true; }
  function rawKey(s) { return String(s || '').toLowerCase().replace(/[−–—]/g, '-').replace(/[^\p{L}\p{N}+-]/gu, ''); }

  function check(user, cands, qtext, rj, strict) {
    var uN = normalizeText(user);
    if (!uN) return false;
    var candN = cands.map(normalizeText);
    // 1. Igualdad exacta (sin tildes ni mayúsculas). Los alias tan cortos que solo son una letra o dos («O-») exigen
    //    además el mismo signo: «O+» no es «O-».
    for (var k = 0; k < cands.length; k++) {
      if (!candN[k] || candN[k] !== uN) continue;
      if (uN.length > 2 || rawKey(user) === rawKey(cands[k])) return true;
    }
    // 2. El corrector flexible de siempre.
    var matched = [];
    for (var m = 0; m < cands.length; m++) if (isMatchFlexible(user, cands[m], qtext)) matched.push(m);
    if (!matched.length) return false;
    // Respuestas con cifras: el corrector ya las trata de forma estricta.
    if (!strict && matched.every(function (x) { return /\d/.test(cands[x]); })) return true;

    var uT = tok(user);
    if (!uT.length) return false;
    var qT = tok(qtext);
    // 3. Repetir palabras del enunciado no es responder.
    if (uT.every(function (w) { return qT.indexOf(w) !== -1; })) return false;

    var rT = (rj || []).map(tok).filter(function (t) { return t.length; });
    var rN = (rj || []).map(function (r) { return tok(r).join(' '); }).filter(Boolean);
    var uJ = uT.join(' ');

    for (var i = 0; i < matched.length; i++) {
      var cT = tok(cands[matched[i]]);
      if (!cT.length || candN[matched[i]].length <= 2) continue; // los alias de una o dos letras solo valen por igualdad exacta
      if (covers(uT, cT)) {
        // Parte exacta de la respuesta.
        if (uT.length >= cT.length) return true;
        if (strict) continue; // enigmas: nada de partes sueltas («caballo» no es «Su caballo se llama Domingo»)
        if (uT.some(function (w) { return w.length < 4; })) continue;
        if (rT.some(function (t) { return covers(uT, t); })) continue;
        return true;
      }
      // Hay erratas.
      if (uT.length < cT.length) {
        // Parte de la respuesta con errata: solo palabras largas y claramente más cercanas a la respuesta que a un distractor.
        var fine = uT.every(function (w) {
          if (w.length < 6) return false;
          var best = Math.min.apply(null, cT.map(function (t) { return lev(w, t); }));
          if (best > (w.length > 8 ? 2 : 1)) return false;
          return rT.every(function (t) { return t.every(function (x) { return lev(w, x) > best; }); });
        });
        if (fine) return true;
        continue;
      }
      // Con erratas, una respuesta de una sola palabra corta (menos de 6 letras) debe estar bien escrita: «china» no es «chita».
      if (cT.length === 1 && uT.some(function (w) { return w.length < 6 && !strictTok(w, cT); })) continue;
      if (!rN.length) return true;
      var dA = lev(uJ, cT.join(' '));
      var dR = Math.min.apply(null, rN.map(function (r) { return lev(uJ, r); }));
      if (dA < dR) return true;
    }
    return false;
  }

  var rejMap = null;
  function rejectsFor(q) {
    if (typeof TEST_QUESTIONS === 'undefined' || !q || typeof q.n !== 'number') return [];
    if (!rejMap) {
      rejMap = {};
      for (var i = 0; i < TEST_QUESTIONS.length; i++) if (Array.isArray(TEST_QUESTIONS[i].options)) rejMap[TEST_QUESTIONS[i].n] = TEST_QUESTIONS[i].options;
    }
    var all = rejMap[q.n] || [];
    var okA = normalizeText(q.a);
    return all.filter(function (o) { return normalizeText(o) !== okA; });
  }

  return { check: check, rejectsFor: rejectsFor };
})();

function isMatchWithAlias(userRaw, q, rejects) {
  var al = q && (Array.isArray(q.alias) ? q.alias : (Array.isArray(q.al) ? q.al : []));
  var cands = [String(q.a)].concat((al || []).map(String));
  var rj = rejects || (q && Array.isArray(q.rj) ? q.rj : SEQAnswerGuard.rejectsFor(q));
  // Los enigmas finales no llevan `n`: se corrigen sin aceptar partes sueltas de la respuesta.
  var strict = !!(q && (q.strict || typeof q.n !== 'number'));
  return SEQAnswerGuard.check(userRaw, cands, q.q, rj, strict);
}
