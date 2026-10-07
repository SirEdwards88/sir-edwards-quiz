// 2.2 — Respuestas escritas con alias (Lucidez Mental).
// Una pregunta de QUESTIONS puede llevar `alias: [...]` con otras formas de escribir la misma respuesta
// («seis» para «6», «24» para «24 segundos»). Se prueba la respuesta y, después, cada alias con el mismo
// comparador flexible de siempre (src/utils/matching.js, que NO se toca). Sin `alias` se comporta igual que antes.
// El backend tiene la misma lógica en src/reto-modes.js (corrige los Retos de Lucidez).
function isMatchWithAlias(userRaw, q) {
  if (isMatchFlexible(userRaw, q.a, q.q)) return true;
  var al = q && q.alias;
  if (Array.isArray(al)) {
    for (var i = 0; i < al.length; i++) {
      if (isMatchFlexible(userRaw, String(al[i]), q.q)) return true;
    }
  }
  return false;
}
