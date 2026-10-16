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

  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function rewardText(m) {
    var parts = [];
    try { if (getMedalAvatar(m.id)) parts.push('Avatar desbloqueado'); } catch (e) {}
    try { if (FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1) parts.push('+1 Fragmento de Mente'); } catch (e) {}
    return parts.join(' · ');
  }
  function icon(m) { try { return window.SEQAchievements ? SEQAchievements.iconHTML(m) : ''; } catch (e) { return ''; } }

  // Texto plano del aviso (también para los tests).
  function message(medals) {
    var r = rewardsOf(medals);
    if (!r.medals.length) return '';
    if (r.medals.length === 1) return 'Logro conseguido: ' + r.medals[0].title + ' · ' + rewardText(r.medals[0]);
    var items = [];
    if (r.avatars) items.push(plural(r.avatars, 'avatar', 'avatares'));
    if (r.fragments) items.push(plural(r.fragments, 'Fragmento de Mente', 'Fragmentos de Mente'));
    return 'Nuevas recompensas: ' + items.join(' y ');
  }

  function html(medals) {
    var r = rewardsOf(medals);
    if (r.medals.length === 1) {
      var m = r.medals[0];
      return '<span class="reward-toast-ico">' + icon(m) + '</span><span class="reward-toast-body"><span class="reward-toast-kicker">Logro conseguido</span>' +
        '<span class="reward-toast-name">' + esc(m.title) + '</span><span class="reward-toast-reward">' + esc(rewardText(m)) + '</span></span>';
    }
    return '<span class="reward-toast-body"><span class="reward-toast-kicker">Nuevas recompensas</span><ul class="reward-toast-list">' +
      r.medals.map(function (m) { return '<li>' + esc(m.title) + ' <span>· ' + esc(rewardText(m)) + '</span></li>'; }).join('') + '</ul></span>';
  }

  function show(medals) {
    var r = rewardsOf(medals);
    if (!r.medals.length) return;
    var t = document.querySelector('.reward-toast');
    if (!t) { t = document.createElement('div'); t.className = 'reward-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html(medals);
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(window.__rewardToastTimer);
    window.__rewardToastTimer = setTimeout(function () { t.classList.remove('show'); }, r.medals.length > 1 ? 4600 : 3600);
  }

  // hadNewModes: si acaba de salir el aviso de un modo nuevo, espera a que termine el suyo.
  function announce(medals, hadNewModes) {
    if (!message(medals)) return;
    setTimeout(function () {
      // Si el jugador ya salió de la tarjeta final, no se muestra: el logro sigue en sus resultados y en Logros.
      var card = document.getElementById('results-card');
      if (!card || !card.offsetParent) return;
      show(medals);
    }, hadNewModes ? 4800 : 900);
  }

  window.SEQRewardToast = { announce: announce, message: message };
})();
