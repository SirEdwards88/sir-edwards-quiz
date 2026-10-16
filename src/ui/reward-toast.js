// SirEdwards Quiz — aviso discreto de recompensas de logro (tarjeta final).
//
// Los logros se muestran siempre en la tarjeta final. Solo los que dan algo tangible (un avatar o un
// Fragmento de Mente) llevan además este aviso breve, sin confeti ni sonido, para que no pase inadvertido.
// Varios a la vez se agrupan en un único aviso. Si hay modo nuevo, espera a que termine el suyo.
// Reutiliza showInfoToast (index.html). Solo interfaz: no toca logros, XP ni recompensas.

(function () {
  'use strict';

  function rewardsOf(medals) {
    var out = { avatars: 0, fragments: 0, medals: [] };
    (medals || []).forEach(function (m) {
      var frag = false, av = false;
      try { frag = FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1; } catch (e) {}
      try { av = !!getMedalAvatar(m.id); } catch (e) {}
      if (!frag && !av) return;
      out.medals.push(m);
      if (frag) out.fragments++;
      if (av) out.avatars++;
    });
    return out;
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function message(medals) {
    var r = rewardsOf(medals);
    if (!r.medals.length) return '';
    if (r.medals.length === 1) {
      var parts = [];
      if (r.avatars) parts.push('avatar desbloqueado');
      if (r.fragments) parts.push('+1 Fragmento de Mente');
      return 'Logro conseguido: ' + r.medals[0].title + ' · ' + parts.join(' y ');
    }
    var items = [];
    if (r.avatars) items.push(plural(r.avatars, 'avatar', 'avatares'));
    if (r.fragments) items.push(plural(r.fragments, 'Fragmento de Mente', 'Fragmentos de Mente'));
    return 'Nuevas recompensas: ' + items.join(' y ');
  }

  // delay: ms de espera (más largo si acaba de salir el aviso de un modo nuevo).
  function announce(medals, hadNewModes) {
    var text = message(medals);
    if (!text) return;
    setTimeout(function () {
      // Si el jugador ya salió de la tarjeta final, no se muestra: el logro sigue en sus resultados y en Logros.
      var card = document.getElementById('results-card');
      if (!card || !card.offsetParent) return;
      try { showInfoToast(text, 'copa'); } catch (e) {}
    }, hadNewModes ? 4800 : 900);
  }

  window.SEQRewardToast = { announce: announce, message: message };
})();
