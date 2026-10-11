// Subida de nivel en la tarjeta final (2.3). El XP se suma durante la partida, así que se compara el nivel
// al empezar (mark) con el de al terminar (show). Si sube, la tarjeta enseña la insignia del tramo, rayos y cinta.
// Solo interfaz: no toca XP, estadísticas ni logros.
var SEQLevelUp = (function () {
  var base = null;
  function level() { try { return getLevelData(store.xp); } catch (e) { return null; } }
  function tier(l) { return l >= 30 ? 'diamante' : l >= 20 ? 'rubi' : l >= 10 ? 'oro' : l >= 5 ? 'plata' : 'bronce'; }
  function mark() { base = level(); }
  function clear() { var o = document.getElementById('lvlup-block'); if (o) o.remove(); }
  function show() {
    clear();
    var now = level();
    var up = base !== null && now !== null && now > base;
    base = now;
    if (!up) return;
    var anchor = document.getElementById('results-metrics-grid');
    if (!anchor || !anchor.parentNode) return;
    var d = document.createElement('div');
    d.id = 'lvlup-block'; d.className = 'lvlup-block';
    d.setAttribute('role', 'status');
    d.innerHTML = '<img class="lu-rays" src="assets/ui/nivel/rayos.webp" alt="" draggable="false">' +
      '<img class="lu-badge" src="assets/ui/nivel/insignia-' + tier(now) + '.webp" alt="" draggable="false">' +
      '<div class="lu-ribbon"><img src="assets/ui/nivel/cinta-nivel.webp" alt="" draggable="false"><span>NIVEL ' + now + '</span></div>';
    anchor.parentNode.insertBefore(d, anchor.nextSibling);
  }
  return { mark: mark, show: show, clear: clear };
})();
