// SirEdwards Quiz — Cálculo (2.3): una sola tarjeta en «Modos de juego»; al entrar se elige Turbo o Fondo,
// igual que las dificultades de Supervivencia. Reutiliza el submenú #menu-difficulty-modes de index.html
// (su cabecera, su botón «← Volver» y su estilo) con una rejilla propia (#diff-grid-mental).
// Script clásico (scope global). Las partidas las arrancan startMentalCalcMode (Turbo) y SEQMentalClassicUI (Fondo).
(function () {
  'use strict';
  function unlocked() { return (store.unlockedMedals || []).includes('tt_15'); }

  function open() {
    if (!unlocked()) {
      showInfoToast('Cálculo mental sigue esperando a alguien más rápido. Logro pendiente: «Velocidad Mental» (15 aciertos en Contrarreloj).', 'candado');
      return;
    }
    selectedPendingMode = 'mental';
    document.getElementById('menu-main-modes').style.display = 'none';
    var menu = document.getElementById('menu-difficulty-modes');
    menu.classList.remove('diff-survival', 'diff-sudden');
    menu.classList.add('diff-survival');
    menu.style.display = 'block';
    document.getElementById('diff-grid-survival').hidden = true;
    document.getElementById('diff-grid-mental').hidden = false;
    document.getElementById('diff-menu-title').innerHTML = '<img class="ui-img ui-title-img ui-title-loose" src="assets/modes/suelto/calculo.webp" alt="" draggable="false">Elige modo';
  }

  // Cada modo conserva su propia comprobación de desbloqueo, su aviso de partida guardada y su arranque.
  function pick(which) {
    if (which === 'fondo') SEQMentalClassicUI.start();
    else startMentalCalcMode();
  }

  window.SEQMentalMenu = { open: open, pick: pick };
})();
