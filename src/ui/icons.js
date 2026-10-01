/* SirEdwards Quiz v2.0 — Iconos ilustrados en lugar de emojis en textos del juego.
 *
 * seqIco('correcto') -> <img> de assets/ui/correcto.webp (o de la ruta indicada en PATHS).
 * SEQIcons.fromEmoji('⚠️') -> el mismo <img> para los emojis conocidos; '' si no hay ilustración.
 * Solo presentación: el aspecto (.seq-ico) vive en styles/theme.css.
 */
(function () {
  'use strict';
  var UI = 'assets/ui/';
  var PATHS = {
    bandera: 'assets/ui/bandera-blanca.webp',
    amigos: 'assets/modes/amigos.webp',
    calculo: 'assets/modes/mini/calculo.webp',
    duelo: 'assets/modes/suelto/duelo.webp',
    retos: 'assets/modes/suelto/retos.webp'
  };
  var BY_EMOJI = {
    '✅': 'correcto', '❌': 'incorrecto', '⚠️': 'atencion', '⚠': 'atencion', '⏱️': 'tiempo', '⏱': 'tiempo',
    '🛡️': 'escudo', '🛡': 'escudo', '🎉': 'celebracion', '🏆': 'copa', '🥇': 'oro', '🥈': 'plata', '🥉': 'bronce',
    '🔁': 'revancha', '↗': 'compartir', '📈': 'progreso', '🧹': 'escoba', '🧠': 'cerebro', '☁️': 'nube',
    '📱': 'movil', '⏳': 'mediocre', '🤝': 'amigos', '😔': 'derrota', '🧮': 'calculo', '⭐': 'xp', '✨': 'xp',
    '🧩': 'fragmento', '🔥': 'racha'
  };
  function src(name) { return PATHS[name] || (UI + name + '.webp'); }
  function ico(name, cls) {
    return '<img class="seq-ico' + (cls ? ' ' + cls : '') + '" src="' + src(name) + '" alt="" draggable="false">';
  }
  function fromEmoji(e, cls) { var n = BY_EMOJI[String(e || '').trim()]; return n ? ico(n, cls) : ''; }
  window.SEQIcons = { ico: ico, src: src, fromEmoji: fromEmoji, BY_EMOJI: BY_EMOJI };
  window.seqIco = ico;
})();
