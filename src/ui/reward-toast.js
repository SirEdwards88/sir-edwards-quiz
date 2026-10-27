// SirEdwards Quiz — aviso discreto de recompensas de logro (tarjeta final).
//
// Los logros se muestran siempre en la tarjeta final. Solo los que dan algo tangible (un avatar o un
// Fragmento de Mente) llevan además este aviso breve, sin confeti ni sonido, para que no pase inadvertido.
// Varios a la vez salen en una sola tarjeta, con icono, nombre y recompensa de cada uno. Si hay modo nuevo, espera a que termine el suyo.
// Reutiliza showInfoToast (index.html). Solo interfaz: no toca logros, XP ni recompensas.

(function () {
  'use strict';
  var root = window;

  function rewardsOf(medals, all) {
    var out = { avatars: 0, fragments: 0, medals: [] };
    (medals || []).forEach(function (m) {
      var frag = false, av = false;
      try { frag = FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1; } catch (e) {}
      try { av = !!getMedalAvatar(m.id); } catch (e) {}
      if (!frag && !av && !all) return;
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
    try { if (FRAGMENT_MEDAL_IDS.indexOf(m.id) !== -1) parts.push('Fragmento de Mente desbloqueado'); } catch (e) {}
    return parts.join(' · ');
  }
  function icon(m) { try { return window.SEQAchievements ? SEQAchievements.iconHTML(m) : ''; } catch (e) { return ''; } }

  // Una tarjeta por logro con recompensa (también para los tests).
  function cards(medals) {
    return rewardsOf(medals).medals.map(function (m) { return { id: m.id, title: m.title, reward: rewardText(m) }; });
  }

  function cardHTML(list) {
    if (list.length === 1) {
      var m = list[0];
      return '<span class="reward-toast-ico">' + icon(m) + '</span><span class="reward-toast-body"><span class="reward-toast-kicker">¡Logro desbloqueado!</span>' +
        '<span class="reward-toast-name">' + esc(m.title) + '</span><span class="reward-toast-reward">' + esc(rewardText(m) || m.desc || '') + '</span></span>';
    }
    var shown = list.slice(0, 4), extra = list.length - shown.length;
    return '<span class="reward-toast-body reward-toast-multi"><span class="reward-toast-kicker">¡Logros desbloqueados!</span><span class="reward-toast-rows">' +
      shown.map(function (m) {
        return '<span class="reward-toast-row"><span class="reward-toast-ico">' + icon(m) + '</span><span><span class="reward-toast-rname">' + esc(m.title) +
          '</span>' + (rewardText(m) ? '<span class="reward-toast-reward">' + esc(rewardText(m)) + '</span>' : '') + '</span></span>';
      }).join('') + '</span>' + (extra > 0 ? '<span class="reward-toast-reward">y ' + extra + (extra === 1 ? ' más' : ' más') + '</span>' : '') + '</span>';
  }

  // Uno: tarjeta con su icono. Varios a la vez: una sola tarjeta con todos.
  function show(medals, all) {
    var list = rewardsOf(medals, all).medals;
    if (!list.length) return;
    var t = document.querySelector('.reward-toast');
    if (!t) { t = document.createElement('div'); t.className = 'reward-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.classList.toggle('reward-toast-group', list.length > 1);
    t.innerHTML = cardHTML(list);
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(window.__rewardToastTimer);
    window.__rewardToastTimer = setTimeout(function () { t.classList.remove('show'); }, list.length > 1 ? 4000 : 3200);
  }

  // hadNewModes: si acaba de salir el aviso de un modo nuevo, espera a que termine el suyo.
  var pend = 0;
  // true mientras haya un aviso de logro en pantalla o programado (los Encargos esperan a que acabe).
  var tierWaiting = false; // el aviso de Ventaja de Lucidez espera su turno: los Encargos (y todo lo demás) esperan detrás
  function baseBusy() { return pend > 0 || !!document.querySelector('.reward-toast.show'); }
  function busy() { return baseBusy() || tierWaiting; }
  function announce(medals, hadNewModes) {
    if (!cards(medals).length) return;
    pend++;
    setTimeout(function () {
      pend--;
      // Si el jugador ya salió de la tarjeta final, no se muestra: el logro sigue en sus resultados y en Logros.
      var card = document.getElementById('results-card');
      if (!card || !card.offsetParent) return;
      show(medals);
    }, hadNewModes ? 4800 : 900);
  }

  // Duelos y Retos: la tarjeta final ya muestra la lista de logros; aquí solo el aviso de los que dan recompensa.
  // No se comprueba #results-card (el duelo tiene su propia tarjeta).
  function announceNow(medals) {
    if (!cards(medals).length) return;
    pend++;
    setTimeout(function () { pend--; show(medals); }, 600);
  }

  // Ventaja de Lucidez (12 y 15 Fragmentos): aviso flotante propio, además de la línea de la tarjeta final.
  // Espera a que no haya otro aviso (modo nuevo, solemne de Lucidez, logros) y a que lleve libre un rato, para no pisarlos.
  var tierTimer = null;
  function tierBusy() {
    return baseBusy() || !!document.querySelector('.encargos-toast.show') || !!document.querySelector('.mode-unlock-toast.show') || !!document.querySelector('.lucidez-unlock-overlay') ||
      !!(root.SEQLucidezUnlock && root.SEQLucidezUnlock.active && root.SEQLucidezUnlock.active());
  }
  function tierHTML(t) {
    var reward = t.bonus >= 2 ? '+2 errores extra en total' : '+1 error extra en Lucidez';
    return '<span class="reward-toast-ico"><img class="ach-img" src="assets/ui/fragmento.webp" alt="" draggable="false"></span><span class="reward-toast-body">' +
      '<span class="reward-toast-kicker">¡Ventaja de Lucidez desbloqueada!</span>' +
      '<span class="reward-toast-name">' + esc(t.fragments) + ' Fragmentos de Mente</span>' +
      '<span class="reward-toast-reward">' + esc(reward) + '</span></span>';
  }
  function announceTier(t) {
    if (!t || !t.fragments) return;
    var free = 0, tries = 0;
    clearInterval(tierTimer);
    tierWaiting = true;
    tierTimer = setInterval(function () {
      tries++;
      var card = document.getElementById('results-card');
      if (!card || !card.offsetParent || tries > 60) { clearInterval(tierTimer); tierWaiting = false; return; } // salió de la tarjeta final
      free = tierBusy() ? 0 : free + 1;
      if (free < 4) return; // ~1,6 s libre seguidos
      clearInterval(tierTimer);
      tierWaiting = false;
      var el = document.querySelector('.reward-toast');
      if (!el) { el = document.createElement('div'); el.className = 'reward-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
      el.classList.remove('reward-toast-group');
      el.innerHTML = tierHTML(t);
      void el.offsetWidth;
      el.classList.add('show');
      clearTimeout(window.__rewardToastTimer);
      window.__rewardToastTimer = setTimeout(function () { el.classList.remove('show'); }, 4200);
    }, 400);
  }

  window.SEQRewardToast = { announce: announce, announceNow: announceNow, announceTier: announceTier, cards: cards, busy: busy };
})();
