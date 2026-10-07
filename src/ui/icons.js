/* SirEdwards Quiz v2.0 — Iconos ilustrados en lugar de emojis en textos del juego.
 *
 * El juego NO usa emojis: ni como icono ni como texto de reserva (lo vigila test/no-emoji.test.mjs).
 * Todo icono es una ilustración que se pide por NOMBRE:
 *   seqIco('correcto')            -> <img> de assets/ui/correcto.webp (o de la ruta indicada en PATHS).
 *   SEQIcons.src('racha')         -> la ruta del icono (para quien construye su propio <img> o fondo).
 *   SEQIcons.fromName('atencion') -> el mismo <img> si el nombre es de un icono conocido; '' si no lo es.
 * Solo presentación: el aspecto (.seq-ico) vive en styles/theme.css.
 */
(function () {
  'use strict';
  var UI = 'assets/ui/';
  // Iconos que no viven en assets/ui/.
  var PATHS = {
    bandera: 'assets/ui/bandera-blanca.webp',
    sombrero: 'assets/ui/sombrero-saludo.webp',
    amigos: 'assets/modes/amigos.webp',
    calculo: 'assets/modes/mini/calculo.webp',
    duelo: 'assets/modes/suelto/duelo.webp',
    retos: 'assets/modes/suelto/retos.webp',
    candado: 'assets/cats/candado.webp',
    'candado-abierto': 'assets/cats/candado-abierto.webp',
    'modo-estandar': 'assets/modes/suelto/estandar.webp',
    'modo-repaso': 'assets/modes/suelto/repaso.webp',
    'modo-supervivencia': 'assets/modes/suelto/supervivencia.webp',
    'modo-muerte-subita': 'assets/modes/suelto/muerte-subita.webp',
    'modo-contrarreloj': 'assets/modes/suelto/contrarreloj.webp',
    'modo-calculo': 'assets/modes/suelto/calculo.webp',
    'modo-secreto': 'assets/modes/suelto/secreto.webp'
  };
  // Nombres de assets/ui/ que se piden con fromName() (avisos, toasts…). Los demás se piden con seqIco()/src() directamente.
  var UI_NAMES = [
    'correcto', 'incorrecto', 'atencion', 'tiempo', 'escudo', 'celebracion', 'copa', 'oro', 'plata', 'bronce',
    'revancha', 'compartir', 'progreso', 'escoba', 'cerebro', 'nube', 'movil', 'mediocre', 'derrota', 'xp', 'fragmento', 'racha', 'guante', 'insignia', 'avatar-desbloqueado', 'marca-duelo'
  ];
  function src(name) { return PATHS[name] || (UI + name + '.webp'); }
  function known(name) { return Object.prototype.hasOwnProperty.call(PATHS, name) || UI_NAMES.indexOf(name) !== -1; }
  function ico(name, cls) {
    return '<img class="seq-ico' + (cls ? ' ' + cls : '') + '" src="' + src(name) + '" alt="" draggable="false">';
  }
  function fromName(name, cls) { return typeof name === 'string' && known(name) ? ico(name, cls) : ''; }
  window.SEQIcons = { ico: ico, src: src, known: known, fromName: fromName, UI_NAMES: UI_NAMES, PATHS: PATHS };
  window.seqIco = ico;
})();
