// SirEdwards Quiz — aviso discreto de recompensas de logro (tarjeta final).
//
// Los logros se muestran siempre en la tarjeta final. Solo los que dan algo tangible (un avatar o un
// Fragmento de Mente) llevan además este aviso breve, sin confeti ni sonido, para que no pase inadvertido.
// Varios a la vez salen uno tras otro, cada uno con su tarjeta. Si hay modo nuevo, espera a que termine el suyo.
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
  function rewardText(m) {
    var parts = [];
    try { if (getMedalAvatar(m.id)) parts.push('Avatar desbloqueado'); } catch (e) {}
    try { if (FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1) parts.push('+1 Fragmento de Mente'); } catch (e) {}
    return parts.join(' · ');
  }
  function icon(m) { try { return window.SEQAchievements ? SEQAchievements.iconHTML(m) : ''; } catch (e) { return ''; } }

  // Una tarjeta por logro con recompensa (también para los tests).
  function cards(medals) {
    return rewardsOf(medals).medals.map(function (m) { return { id: m.id, title: m.title, reward: rewardText(m) }; });
  }

  function cardHTML(m) {
    return '<span class="reward-toast-ico">' + icon(m) + '</span><span class="reward-toast-body"><span class="reward-toast-kicker">Logro conseguido</span>' +
      '<span class="reward-toast-name">' + esc(m.title) + '</span><span class="reward-toast-reward">' + esc(rewardText(m)) + '</span></span>';
  }

  // Si caen varios de golpe, salen uno tras otro con la misma tarjeta; cada uno se despide antes de que entre el siguiente.
  function show(medals) {
    var list = rewardsOf(medals).medals;
    if (!list.length) return;
    var t = document.querySelector('.reward-toast');
    if (!t) { t = document.createElement('div'); t.className = 'reward-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    clearTimeout(window.__rewardToastTimer);
    var i = 0;
    (function next() {
      if (i >= list.length) return;
      t.classList.remove('show');
      var m = list[i++];
      window.__rewardToastTimer = setTimeout(function () {
        t.innerHTML = cardHTML(m);
        void t.offsetWidth;
        t.classList.add('show');
        window.__rewardToastTimer = setTimeout(function () {
          t.classList.remove('show');
          if (i < list.length) window.__rewardToastTimer = setTimeout(next, 400);
        }, 3300);
      }, i === 1 ? 0 : 50);
    })();
  }

  // hadNewModes: si acaba de salir el aviso de un modo nuevo, espera a que termine el suyo.
  function announce(medals, hadNewModes) {
    if (!cards(medals).length) return;
    setTimeout(function () {
      // Si el jugador ya salió de la tarjeta final, no se muestra: el logro sigue en sus resultados y en Logros.
      var card = document.getElementById('results-card');
      if (!card || !card.offsetParent) return;
      show(medals);
    }, hadNewModes ? 4800 : 900);
  }

  window.SEQRewardToast = { announce: announce, cards: cards };
})();
