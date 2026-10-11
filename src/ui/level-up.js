// Subida de nivel en la tarjeta final (2.3). El XP se suma durante la partida, así que se compara el nivel
// al empezar (mark) con el de al terminar (show). Si sube, la tarjeta enseña la insignia del tramo, rayos y cinta.
// Duelo y Reto (2.3): la XP la concede el servidor y llega a este dispositivo tras una sincronización, así que se
// marca el nivel por partida (markKey) y el aviso (htmlFor) aparece en cuanto el nivel local supera al de entonces.
// Solo interfaz: no toca XP, estadísticas ni logros.
var SEQLevelUp = (function () {
  var base = null;
  var keyed = {};
  function level() { try { return getLevelData(store.xp); } catch (e) { return null; } }
  function tier(l) { return l >= 30 ? 'diamante' : l >= 20 ? 'rubi' : l >= 10 ? 'oro' : l >= 5 ? 'plata' : 'bronce'; }
  function mark() { base = level(); }
  function clear() { var o = document.getElementById('lvlup-block'); if (o) o.remove(); }
  function html(now, still) {
    return '<div id="lvlup-block" class="lvlup-block' + (still ? ' lu-still' : '') + '" role="status">' +
      '<img class="lu-rays" src="assets/ui/nivel/rayos.webp" alt="" draggable="false">' +
      '<img class="lu-badge" src="assets/ui/nivel/insignia-' + tier(now) + '.webp" alt="" draggable="false">' +
      '<div class="lu-ribbon"><img src="assets/ui/nivel/cinta-nivel.webp" alt="" draggable="false"><span>NIVEL ' + now + '</span></div></div>';
  }
  function show() {
    clear();
    var now = level();
    var up = base !== null && now !== null && now > base;
    base = now;
    if (!up) return;
    var anchor = document.getElementById('results-metrics-grid');
    if (!anchor || !anchor.parentNode) return;
    anchor.insertAdjacentHTML('afterend', html(now, false));
  }
  // Por partida (Duelo y Reto): el nivel con el que se entra a ella. Solo la primera vez.
  function markKey(key) {
    if (!key || keyed[key]) return;
    var l = level();
    if (l !== null) keyed[key] = { base: l, shown: false };
  }
  // HTML del aviso para esa partida, o '' si no ha subido. La pantalla se repinta cada pocos segundos: tras la
  // primera vez el aviso sale quieto (sin animación) para que no parpadee.
  function htmlFor(key) {
    var k = keyed[key], now = level();
    if (!k || now === null || !(now > k.base)) return '';
    var still = k.shown; k.shown = true;
    return html(now, still);
  }
  return { mark: mark, show: show, clear: clear, markKey: markKey, htmlFor: htmlFor };
})();
