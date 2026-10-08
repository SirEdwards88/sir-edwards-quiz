// SirEdwards Quiz — Cita de Inicio (2.3): rota entre las de src/data/home-quotes.js. Script clásico.
//
// Cambia cada vez que se abre el juego: al cargar la app y cuando se vuelve a ella desde segundo plano (en el móvil, abrir una
// PWA suele ser reanudarla, sin recargar). No cambia al moverse por las pantallas de dentro. Se elige con la bolsa barajada de
// pickRotatingPhrase(), la misma del resto de frases: no se repite ninguna hasta agotarlas. Como abrir y cerrar sin jugar no
// guarda nada, aquí se persiste SOLO la bolsa de esta cita (phraseBags/lastPhraseIndex de «home_quote») leyendo y reescribiendo
// la clave de datos del juego: no se llama a saveStore(), que al arrancar tocaría la racha. Si algo falla (sin banco, sin bolsa,
// sin el elemento), se deja tal cual el texto que ya trae index.html, que es una de las citas del banco.
// Usa en ejecución, por nombre, HOME_QUOTES, pickRotatingPhrase y store.

const SEQHomeQuote = (function () {
  'use strict';

  var POOL = 'home_quote';
  var DATA_KEY = 'siredwards_quiz_v1_0_data';   // la clave de siempre; no se cambia

  function persist() {
    try {
      var raw = localStorage.getItem(DATA_KEY);
      if (!raw || !store || !store.phraseBags || !Array.isArray(store.phraseBags[POOL])) return;
      var d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return;
      if (!d.phraseBags || typeof d.phraseBags !== 'object') d.phraseBags = {};
      if (!d.lastPhraseIndex || typeof d.lastPhraseIndex !== 'object') d.lastPhraseIndex = {};
      d.phraseBags[POOL] = store.phraseBags[POOL];
      if (store.lastPhraseIndex && typeof store.lastPhraseIndex[POOL] === 'number') d.lastPhraseIndex[POOL] = store.lastPhraseIndex[POOL];
      localStorage.setItem(DATA_KEY, JSON.stringify(d));
    } catch (e) {}
  }

  function refresh() {
    try {
      var el = document.querySelector('.home-quote');
      if (!el || typeof HOME_QUOTES === 'undefined' || !HOME_QUOTES.length) return;
      if (typeof store === 'undefined' || !store || typeof pickRotatingPhrase !== 'function') return;
      var q = pickRotatingPhrase(POOL, HOME_QUOTES);
      if (!q) return;
      el.textContent = q;
      persist();
    } catch (e) {}
  }

  // Al volver a la app: solo si Inicio es lo que se ve, para no gastar una cita que nadie va a leer.
  function onReturn() {
    try { var v = document.getElementById('view-home'); if (v && v.classList.contains('active')) refresh(); } catch (e) {}
  }

  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', refresh);   // al abrir, Inicio es la vista activa
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') onReturn(); });
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pageshow', function (e) { if (e && e.persisted) onReturn(); });
  }
  return { refresh: refresh };
})();
