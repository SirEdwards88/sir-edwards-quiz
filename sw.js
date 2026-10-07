// Service worker de Sir Edwards Quiz.
//
// IMPORTANTE para cada futura publicación: sube el número de CACHE_VERSION.
// Es la única forma en que un navegador que ya tiene la app instalada/cacheada
// detecta que hay una versión nueva de este archivo (los navegadores comparan
// sw.js byte a byte), instala el nuevo service worker y, en su 'activate',
// borra las cachés de versiones anteriores. Si no subes este número, un
// cambio en index.html/CSS/JS puede quedar cacheado indefinidamente para
// quien ya tenga la app instalada.
//
// v1.3: subido de 1 a 2 porque index.html cambió (versión, modal de
// novedades). La estrategia de caché en sí no se ha tocado.
// v1.4: subido de 2 a 3 (index.html cambió y hay archivos nuevos en el shell:
// styles/online.css, src/online/config.js y src/online/online.js). La
// estrategia de caché NO se ha tocado. Las peticiones al Worker de Cloudflare
// y a Google son de otro origen: este SW ya las dejaba pasar sin interceptar
// (solo gestiona GET del mismo origen), así que jamás se cachean.
// v1.5: subido de 3 a 4 (index.html cambió y hay un archivo nuevo en el shell:
// src/online/duels.js). La estrategia de caché NO se ha tocado.
// v1.5 (hub de Duelos): subido de 4 a 5 porque cambiaron index.html,
// src/online/duels.js y styles/online.css (ya estaban en el shell; no hay
// archivos nuevos). La estrategia de caché NO se ha tocado.
// v1.5 (partida de Duelo/Reto): subido de 5 a 6; cambiaron src/online/duels.js y
// styles/online.css (ya en el shell). La estrategia de caché NO se ha tocado.
// 2.0 (primera pasada gráfica, solo visual): subido de 6 a 7; cambiaron index.html,
// styles/main.css y src/online/duels.js (ya en el shell). Estrategia de caché intacta.
// 2.0 (Prompt 1.5, assets + branding de instalación): subido de 7 a 8;
// cambiaron index.html, styles/main.css, manifest.json y los 4 PNG de
// icons/ (el sombrero oficial sustituye al icono "SE"). Nuevos en el shell:
// los PNG de favicon/apple-touch-icon y los assets estáticos del personaje
// (assets/character/, solo WebP). Estrategia de caché intacta.
// 2.0 (Prompt 1.5, corrección de uso de los assets de Lucidez): subido de 8
// a 9; cambiaron index.html y styles/main.css (el retrato pasa a ir debajo
// del título/frase en las 4 transiciones, y se retira por completo de la
// pantalla de juego del Enigma Final). Sin archivos nuevos. Estrategia de
// caché NO se ha tocado.
// 2.0 (Prompt 4, progresión): subido de 9 a 10; cambiaron index.html,
// styles/main.css, src/data/medals.js, src/utils/store.js y src/online/duels.js (ya en el shell).
// 2.0 (Prompt 5, tarjeta de compartir): subido de 10 a 11; nuevo src/share/share-card.js
// (añadido al shell) y cambiaron index.html y src/online/duels.js.
const CACHE_VERSION = 142;
// Dos cachés (ver install/fetch más abajo):
//  · CACHE_NAME  (versionada): index.html, CSS, JS, manifest e iconos. Es poco y es imprescindible: si no se puede guardar, la
//    versión nueva no se instala y se queda la anterior.
//  · ASSET_CACHE (estable): las imágenes de assets/. Cada una se guarda con su huella (ASSET_REVS) y solo se vuelve a descargar
//    si cambia el archivo, no en cada publicación. Es tolerante: una imagen que falla no impide instalar; se pide al usarla.
const CACHE_NAME = `sedq-shell-v${CACHE_VERSION}`;
const ASSET_CACHE = 'sedq-assets';

// Rutas relativas al propio sw.js (que vive en la raíz de la app, tanto en
// local como bajo /sir-edwards-quiz/ en GitHub Pages). Ninguna es absoluta,
// así que esta lista funciona igual en cualquier subruta.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './styles/main.css',
  './styles/online.css',
  './styles/theme.css',
  './src/data/avatars.js',
  './src/data/lucidez.js',
  './src/data/medals.js',
  './src/data/phrases.js',
  './src/data/duel-phrases.js',
  './src/ui/a11y.js',
  './src/data/questions.js',
  './src/data/questions-retired.js',
  './src/data/ui-maps.js',
  './src/online/config.js',
  './src/ui/install-app.js',
  './src/ui/game-fx.js',
  './src/ui/last-life.js',
  './src/ui/hitos.js',
  './src/ui/achievements.js',
  './src/ui/stats-extra.js',
  './src/ui/intro.js',
  './assets/modes/estandar.webp',
  './assets/modes/duelo.webp',
  './assets/modes/repaso.webp',
  './assets/modes/supervivencia.webp',
  './assets/modes/muerte-subita.webp',
  './assets/modes/contrarreloj.webp',
  './assets/modes/calculo.webp',
  './assets/modes/secreto.webp',
  './assets/modes/retos.webp',
  './assets/modes/amigos.webp',
  './assets/modes/ranking.webp',
  './assets/modes/ameba.webp',
  './assets/modes/humano.webp',
  './assets/modes/derrame.webp',
  './assets/modes/estadisticas.webp',
  './assets/modes/logros.webp',
  './assets/modes/ajustes.webp',
  './src/ui/mode-badges.js',
  './src/ui/lucidez-ui.js',
  './src/ui/sabias.js',
  './src/ui/icons.js',
  './assets/ui/bien.webp',
  './assets/ui/avatar-desbloqueado.webp',
  './assets/ui/guante.webp',
  './assets/ui/insignia.webp',
  './assets/ui/marca-duelo.webp',
  './assets/ui/casi.webp',
  './assets/ui/derrota.webp',
  './assets/ui/cofre-medallas.webp',
  './assets/ui/pizarra-operaciones.webp',
  './assets/ui/cerebro-engranajes.webp',
  './assets/ui/sombrero-saludo.webp',
  './assets/ui/sombrero-laurel.webp',
  './assets/ui/bandera-blanca.webp',
  './assets/ui/cartel-peligro.webp',
  './assets/ui/zorro.webp',
  './assets/ui/gorro-burro.webp',
  './assets/ui/insignia-nivel.webp',
  './assets/ui/instalar-app.webp',
  './assets/ui/libro-vela.webp',
  './assets/ui/sombrero-mediocre.webp',
  './assets/ui/libreta.webp',
  './assets/ui/calculadora-laton.webp',
  './assets/ui/pergamino.webp',
  './assets/ui/regla-calculo.webp',
  './assets/ui/reloj-derretido.webp',
  './assets/ui/sombrero-aplastado.webp',
  './assets/ui/desastre.webp',
  './assets/ui/fragmento.webp',
  './assets/ui/hito12.webp',
  './assets/ui/hito15.webp',
  './assets/ui/mediocre.webp',
  './assets/ui/movil.webp',
  './assets/ui/nube.webp',
  './assets/ui/perfecto.webp',
  './assets/ui/racha.webp',
  './assets/ui/suspenso.webp',
  './assets/ui/xp.webp',
  './assets/ui/copa.webp',
  './assets/ui/libro.webp',
  './assets/ui/cerebro.webp',
  './assets/ui/bombilla.webp',
  './assets/ui/medalla.webp',
  './assets/modes/suelto/estandar.webp',
  './assets/modes/suelto/repaso.webp',
  './assets/modes/suelto/supervivencia.webp',
  './assets/modes/suelto/ameba.webp',
  './assets/modes/suelto/humano.webp',
  './assets/modes/suelto/derrame.webp',
  './assets/modes/suelto/muerte-subita.webp',
  './assets/modes/suelto/contrarreloj.webp',
  './assets/modes/suelto/calculo.webp',
  './assets/modes/suelto/secreto.webp',
  './assets/modes/suelto/duelo.webp',
  './assets/modes/suelto/retos.webp',
  './assets/ui/correcto.webp',
  './assets/ui/incorrecto.webp',
  './assets/ui/progreso.webp',
  './assets/ui/calavera.webp',
  './assets/ui/bola-rota.webp',
  './assets/ui/diamante.webp',
  './assets/ui/caracol.webp',
  './assets/ui/liebre.webp',
  './assets/ui/calculadora-humo.webp',
  './assets/ui/abaco.webp',
  './assets/ui/tiempo.webp',
  './assets/ui/atencion.webp',
  './assets/ui/compartir.webp',
  './assets/ui/escudo.webp',
  './assets/ui/celebracion.webp',
  './assets/ui/oro.webp',
  './assets/ui/plata.webp',
  './assets/ui/bronce.webp',
  './assets/ui/revancha.webp',
  './assets/ui/escoba.webp',
  './assets/familias/aciertos.webp',
  './assets/familias/dominio.webp',
  './assets/familias/duelo.webp',
  './assets/familias/errores.webp',
  './assets/familias/especial.webp',
  './assets/familias/modos.webp',
  './assets/familias/nivel.webp',
  './assets/familias/prog.webp',
  './assets/familias/racha.webp',
  './assets/familias/secretos.webp',
  './assets/cats/historia.webp',
  './assets/cats/geografia.webp',
  './assets/cats/ciencia.webp',
  './assets/cats/arte.webp',
  './assets/cats/deporte.webp',
  './assets/cats/cultura.webp',
  './assets/cats/candado.webp',
  './assets/cats/candado-abierto.webp',
  './assets/logros/diurno.webp',
  './assets/logros/duel_apuestas_calculada.webp',
  './assets/logros/duel_apuestas_ultima_locura.webp',
  './assets/logros/duel_contra_las_cuerdas.webp',
  './assets/logros/duel_tres_al_hilo.webp',
  './assets/logros/streak_20.webp',
  './assets/logros/streak_30.webp',
  './assets/logros/duel_sin_titubear.webp',
  './assets/duelos/rangos/plebeyo_ilustrado.webp',
  './assets/duelos/rangos/caballero_del_dato.webp',
  './assets/duelos/rangos/erudito_de_salon.webp',
  './assets/duelos/rangos/lord_sabelotodo.webp',
  './assets/duelos/rangos/sir_edwards.webp',
  './assets/duelos/rankings/friends.webp',
  './assets/duelos/rankings/global.webp',
  './assets/duelos/rankings/mental.webp',
  './assets/duelos/rankings/pvp.webp',
  './assets/duelos/rankings/timetrial.webp',
  './assets/duelos/estadisticas.webp',
  './assets/duelos/modos/classic.webp',
  './assets/duelos/modos/stakes.webp',
  './assets/duelos/apuestas/cuerdo.webp',
  './assets/duelos/apuestas/osado.webp',
  './assets/duelos/apuestas/insensato.webp',
  './assets/logros/all_medals_secret.webp',
  './assets/logros/balanced_master.webp',
  './assets/logros/cleaner_25.webp',
  './assets/logros/cleaner_5.webp',
  './assets/logros/correct_100.webp',
  './assets/logros/correct_400.webp',
  './assets/logros/correct_800.webp',
  './assets/logros/duel_cinco_victorias.webp',
  './assets/logros/duel_otra_vez_tu.webp',
  './assets/logros/duel_por_los_pelos.webp',
  './assets/logros/duel_primera_sangre.webp',
  './assets/logros/duel_revancha.webp',
  './assets/logros/duel_rey_del_empate.webp',
  './assets/logros/duel_victoria_inaugural.webp',
  './assets/logros/first_game.webp',
  './assets/logros/games_10.webp',
  './assets/logros/games_20.webp',
  './assets/logros/games_5.webp',
  './assets/logros/games_50.webp',
  './assets/logros/level_10.webp',
  './assets/logros/level_20.webp',
  './assets/logros/level_30.webp',
  './assets/logros/level_5.webp',
  './assets/logros/limpieza_general.webp',
  './assets/logros/lucidez_absoluta.webp',
  './assets/logros/lucidez_conexiones_imposibles.webp',
  './assets/logros/lucidez_mente_despierta.webp',
  './assets/logros/master_10.webp',
  './assets/logros/master_100.webp',
  './assets/logros/master_200.webp',
  './assets/logros/master_50.webp',
  './assets/logros/medal_collector_10.webp',
  './assets/logros/medal_collector_20.webp',
  './assets/logros/medal_collector_30.webp',
  './assets/logros/mental_calc_15.webp',
  './assets/logros/mental_calc_30.webp',
  './assets/logros/mental_calc_40.webp',
  './assets/logros/mente_fracturada.webp',
  './assets/logros/noctambulo.webp',
  './assets/logros/polimata.webp',
  './assets/logros/sd_primer_riesgo.webp',
  './assets/logros/sharp_eye.webp',
  './assets/logros/sin_frenos.webp',
  './assets/logros/sin_preferencias.webp',
  './assets/logros/streak_10.webp',
  './assets/logros/streak_5.webp',
  './assets/logros/surv_ameba.webp',
  './assets/logros/surv_derrame.webp',
  './assets/logros/surv_humano.webp',
  './assets/logros/tt_15.webp',
  './assets/logros/tt_30.webp',
  './assets/logros/tt_50.webp',
  './assets/modes/mini/estandar.webp',
  './assets/modes/mini/repaso.webp',
  './assets/modes/mini/supervivencia.webp',
  './assets/modes/mini/ameba.webp',
  './assets/modes/mini/humano.webp',
  './assets/modes/mini/derrame.webp',
  './assets/modes/mini/muerte-subita.webp',
  './assets/modes/mini/contrarreloj.webp',
  './assets/modes/mini/calculo.webp',
  './assets/modes/mini/secreto.webp',
  './assets/modes/mini/ranking.webp',
  './assets/modes/mini/duelo.webp',
  './assets/modes/mini/logros.webp',
  './src/audio/audio.js',
  './assets/audio/correct.mp3',
  './assets/audio/wrong.mp3',
  './src/utils/sync-merge.js',
  './src/online/data-sync.js',
  './src/online/online.js',
  './src/share/share-card.js',
  './src/online/duels.js',
  './src/online/duels-v21.js',
  './src/utils/duel.js',
  './src/utils/matching.js',
  './src/utils/answer-alias.js',
  './src/utils/lucidez-select.js',
  './src/state/lucidez-bag.js',
  './src/utils/encargos-core.js',
  './src/utils/encargos-progress.js',
  './src/state/encargos.js',
  './src/data/encargos-phrases.js',
  './src/ui/encargos-ui.js',
  './src/utils/encargos-intro-core.js',
  './src/data/encargos-intro-phrases.js',
  './src/ui/encargos-intro.js',
  './styles/encargos-intro.css',
  './styles/encargos.css',
  './styles/sir-events.css',
  './src/utils/sir-events.js',
  './src/ui/sir-events-ui.js',
  './src/state/sir-events.js',
  './assets/character/event_siredwards_visit.webp',
  './assets/character/event_siredwards_streak.webp',
  './assets/character/event_siredwards_day.webp',
  './assets/character/event_siredwards_night.webp',
  './assets/character/siredwards_encargos.webp',
  './assets/character/siredwards_encargos_completados.webp',
  './assets/character/presentacion-evaluador.webp',
  './assets/character/presentacion-expediente.webp',
  './assets/character/presentacion-mirada.webp',
  './assets/character/lunes-aprobacion.webp',
  './assets/character/lunes-reproche.webp',
  './src/utils/sudden-progression.js',
  './src/utils/fresh-first.js',
  './src/utils/mental-calc.js',
  './src/utils/store.js',
  './src/state/read-facade.js',
  './src/utils/streak-xp.js',
  './src/state/write-helpers.js',
  './icons/icon-192.png?v=4',
  './icons/icon-512.png?v=4',
  './icons/icon-192-maskable.png?v=4',
  './icons/icon-512-maskable.png?v=4',
  './icons/apple-touch-icon.png?v=4',
  './icons/favicon-16.png?v=4',
  './icons/favicon-32.png?v=4',
  './icons/favicon-48.png?v=4',
  './assets/avatars/sombrero.png',
  './assets/avatars/libro.png',
  './assets/avatars/reloj.png',
  './assets/avatars/lupa.png',
  './assets/avatars/mascara.png',
  './assets/avatars/pluma.png',
  './assets/avatars/cuervo.png',
  './assets/avatars/gato.png',
  './assets/avatars/globo.png',
  './assets/avatars/pipa.png',
  './assets/avatars/paraguas.png',
  './assets/avatars/caballo.png',
  './assets/avatars/avatar_siredwards_coleccionista.png',
  './assets/avatars/avatar_siredwards_vengador.png',
  './assets/avatars/avatar_siredwards_imparable.png',
  './assets/avatars/avatar_siredwards_insensato.png',
  './assets/avatars/avatar_siredwards_medianoche.png',
  './assets/avatars/avatar_siredwards_supremo.png',
  './assets/character/hat.webp',
  './assets/character/victory.webp',
  './assets/character/defeat.webp',
  './assets/character/lucidez-fase1.webp',
  './assets/character/lucidez-fase2.webp',
  './assets/character/lucidez-fase3.webp',
  './assets/character/lucidez-enigma.webp',
  './assets/character/hito-barbilla.webp',
  './assets/character/hito-monoculo.webp',
  './assets/character/hito-manos.webp',
];

// Huellas de las imágenes de APP_SHELL que viven en assets/. GENERADO por scripts/bump-version.mjs: no se edita a mano.
// <asset-revs>
const ASSET_REVS = {
  './assets/audio/correct.mp3': 'ada74251',
  './assets/audio/wrong.mp3': '738c1d1c',
  './assets/avatars/avatar_siredwards_coleccionista.png': 'e673dc90',
  './assets/avatars/avatar_siredwards_imparable.png': 'fa0e4d0e',
  './assets/avatars/avatar_siredwards_insensato.png': 'e93833f7',
  './assets/avatars/avatar_siredwards_medianoche.png': '22ff76ca',
  './assets/avatars/avatar_siredwards_supremo.png': '28ec36fd',
  './assets/avatars/avatar_siredwards_vengador.png': 'bcde96ef',
  './assets/avatars/caballo.png': 'c9c2b6e6',
  './assets/avatars/cuervo.png': 'e349d11e',
  './assets/avatars/gato.png': '2197648d',
  './assets/avatars/globo.png': '3a25e9c2',
  './assets/avatars/libro.png': 'e10102e6',
  './assets/avatars/lupa.png': '8455a10c',
  './assets/avatars/mascara.png': 'd1b2daef',
  './assets/avatars/paraguas.png': 'fa9d7838',
  './assets/avatars/pipa.png': 'b218d2cf',
  './assets/avatars/pluma.png': 'c3384287',
  './assets/avatars/reloj.png': '090c2ea8',
  './assets/avatars/sombrero.png': 'f0e31e52',
  './assets/cats/arte.webp': '74fe26f8',
  './assets/cats/candado-abierto.webp': 'd1046594',
  './assets/cats/candado.webp': 'd6264547',
  './assets/cats/ciencia.webp': '279f6ccf',
  './assets/cats/cultura.webp': '913ac61b',
  './assets/cats/deporte.webp': 'c3fd0d86',
  './assets/cats/geografia.webp': '8e534e2b',
  './assets/cats/historia.webp': '255dac0e',
  './assets/character/defeat.webp': 'd4895852',
  './assets/character/event_siredwards_day.webp': '8cacefd5',
  './assets/character/event_siredwards_night.webp': 'f50f1203',
  './assets/character/event_siredwards_streak.webp': 'f43c5ebd',
  './assets/character/event_siredwards_visit.webp': '6df39c1c',
  './assets/character/hat.webp': '89336d1f',
  './assets/character/hito-barbilla.webp': '10eabc42',
  './assets/character/hito-manos.webp': '3f46e800',
  './assets/character/hito-monoculo.webp': 'd87d04a2',
  './assets/character/lucidez-enigma.webp': '2fd9eba2',
  './assets/character/lucidez-fase1.webp': '0737e99a',
  './assets/character/lucidez-fase2.webp': '4f89375b',
  './assets/character/lucidez-fase3.webp': 'c3c18eac',
  './assets/character/lunes-aprobacion.webp': '78ac9458',
  './assets/character/lunes-reproche.webp': '7e3a9052',
  './assets/character/presentacion-evaluador.webp': 'ceaa2779',
  './assets/character/presentacion-expediente.webp': '2644648c',
  './assets/character/presentacion-mirada.webp': '261e874d',
  './assets/character/siredwards_encargos.webp': '390cd810',
  './assets/character/siredwards_encargos_completados.webp': '2a545d18',
  './assets/character/victory.webp': '2fdab0ea',
  './assets/duelos/apuestas/cuerdo.webp': '5aa358e0',
  './assets/duelos/apuestas/insensato.webp': '3ec93c42',
  './assets/duelos/apuestas/osado.webp': 'ef050fa5',
  './assets/duelos/estadisticas.webp': '30ffe7da',
  './assets/duelos/modos/classic.webp': '497d660f',
  './assets/duelos/modos/stakes.webp': '0d2e08f2',
  './assets/duelos/rangos/caballero_del_dato.webp': '68b82e99',
  './assets/duelos/rangos/erudito_de_salon.webp': 'd979ca49',
  './assets/duelos/rangos/lord_sabelotodo.webp': 'fe5a008f',
  './assets/duelos/rangos/plebeyo_ilustrado.webp': '50ff37db',
  './assets/duelos/rangos/sir_edwards.webp': '84d052b1',
  './assets/duelos/rankings/friends.webp': '32fca8fc',
  './assets/duelos/rankings/global.webp': '00f86aa8',
  './assets/duelos/rankings/mental.webp': '4397e9b4',
  './assets/duelos/rankings/pvp.webp': '87a2d360',
  './assets/duelos/rankings/timetrial.webp': 'fbd11a25',
  './assets/familias/aciertos.webp': 'b0a3ed70',
  './assets/familias/dominio.webp': 'a210b7ad',
  './assets/familias/duelo.webp': '67ae6bb2',
  './assets/familias/errores.webp': '6a61de7f',
  './assets/familias/especial.webp': '2b651777',
  './assets/familias/modos.webp': '9067a56b',
  './assets/familias/nivel.webp': 'dd01c4ef',
  './assets/familias/prog.webp': 'fbb99c0a',
  './assets/familias/racha.webp': 'e880c0e5',
  './assets/familias/secretos.webp': '0bef212c',
  './assets/logros/all_medals_secret.webp': 'e09114d4',
  './assets/logros/balanced_master.webp': '5a3d960a',
  './assets/logros/cleaner_25.webp': 'ec2d635e',
  './assets/logros/cleaner_5.webp': '621f6e81',
  './assets/logros/correct_100.webp': '29e36f64',
  './assets/logros/correct_400.webp': '7b355a59',
  './assets/logros/correct_800.webp': '4d4f88a5',
  './assets/logros/diurno.webp': 'ff49e8fd',
  './assets/logros/duel_apuestas_calculada.webp': 'd9d4bb60',
  './assets/logros/duel_apuestas_ultima_locura.webp': '7238c5c4',
  './assets/logros/duel_cinco_victorias.webp': '9ebbdb3e',
  './assets/logros/duel_contra_las_cuerdas.webp': '9f14ecec',
  './assets/logros/duel_otra_vez_tu.webp': '87ee87a8',
  './assets/logros/duel_por_los_pelos.webp': '0dcfa874',
  './assets/logros/duel_primera_sangre.webp': 'fc80f30b',
  './assets/logros/duel_revancha.webp': '776d03cd',
  './assets/logros/duel_rey_del_empate.webp': '12605ca8',
  './assets/logros/duel_sin_titubear.webp': '5ef937d7',
  './assets/logros/duel_tres_al_hilo.webp': 'e72dea28',
  './assets/logros/duel_victoria_inaugural.webp': '4631ac2b',
  './assets/logros/first_game.webp': 'a2683615',
  './assets/logros/games_10.webp': '2d46cbf3',
  './assets/logros/games_20.webp': '063fb0df',
  './assets/logros/games_5.webp': '4a63d648',
  './assets/logros/games_50.webp': '3d814361',
  './assets/logros/level_10.webp': '17920c98',
  './assets/logros/level_20.webp': '45d96e36',
  './assets/logros/level_30.webp': 'def8975f',
  './assets/logros/level_5.webp': '1aceebe6',
  './assets/logros/limpieza_general.webp': '9a07fb0b',
  './assets/logros/lucidez_absoluta.webp': 'ef7dd571',
  './assets/logros/lucidez_conexiones_imposibles.webp': '7dfd7cd9',
  './assets/logros/lucidez_mente_despierta.webp': '29699286',
  './assets/logros/master_10.webp': '814d59de',
  './assets/logros/master_100.webp': '7ead293e',
  './assets/logros/master_200.webp': '2b206860',
  './assets/logros/master_50.webp': '10d6bac0',
  './assets/logros/medal_collector_10.webp': 'bfc168b8',
  './assets/logros/medal_collector_20.webp': '4444330e',
  './assets/logros/medal_collector_30.webp': '2fc93251',
  './assets/logros/mental_calc_15.webp': 'e883aa30',
  './assets/logros/mental_calc_30.webp': '2534cf5c',
  './assets/logros/mental_calc_40.webp': '66643d10',
  './assets/logros/mente_fracturada.webp': '2cd26704',
  './assets/logros/noctambulo.webp': 'fe71c00c',
  './assets/logros/polimata.webp': '9b77ca28',
  './assets/logros/sd_primer_riesgo.webp': 'c4ddf427',
  './assets/logros/sharp_eye.webp': 'c29c4452',
  './assets/logros/sin_frenos.webp': '0ea44242',
  './assets/logros/sin_preferencias.webp': '1f4fe452',
  './assets/logros/streak_10.webp': '19fbed81',
  './assets/logros/streak_20.webp': 'f0321cac',
  './assets/logros/streak_30.webp': 'cebebeba',
  './assets/logros/streak_5.webp': 'f0539224',
  './assets/logros/surv_ameba.webp': '93fe03b2',
  './assets/logros/surv_derrame.webp': '854a8422',
  './assets/logros/surv_humano.webp': '5c4c474f',
  './assets/logros/tt_15.webp': '19b311d2',
  './assets/logros/tt_30.webp': 'dec53159',
  './assets/logros/tt_50.webp': '67d7ad22',
  './assets/modes/ajustes.webp': 'efc30bb4',
  './assets/modes/ameba.webp': '4fe92f52',
  './assets/modes/amigos.webp': '79bca382',
  './assets/modes/calculo.webp': '005a5053',
  './assets/modes/contrarreloj.webp': 'e7891d2b',
  './assets/modes/derrame.webp': '6c358668',
  './assets/modes/duelo.webp': 'd47818b5',
  './assets/modes/estadisticas.webp': 'a0e2a9cb',
  './assets/modes/estandar.webp': 'c4e818ff',
  './assets/modes/humano.webp': 'ff7ed687',
  './assets/modes/logros.webp': 'f2be8383',
  './assets/modes/mini/ameba.webp': '271a4cd4',
  './assets/modes/mini/calculo.webp': '13e2994d',
  './assets/modes/mini/contrarreloj.webp': '886ed165',
  './assets/modes/mini/derrame.webp': 'dcfb454f',
  './assets/modes/mini/duelo.webp': 'eaca26f5',
  './assets/modes/mini/estandar.webp': '57783124',
  './assets/modes/mini/humano.webp': '431e98c2',
  './assets/modes/mini/logros.webp': '9343eadb',
  './assets/modes/mini/muerte-subita.webp': '9523835c',
  './assets/modes/mini/ranking.webp': 'ac68383e',
  './assets/modes/mini/repaso.webp': '278f6431',
  './assets/modes/mini/secreto.webp': '33d0ec27',
  './assets/modes/mini/supervivencia.webp': '23361043',
  './assets/modes/muerte-subita.webp': '58d22b90',
  './assets/modes/ranking.webp': '648f2258',
  './assets/modes/repaso.webp': '6779dde6',
  './assets/modes/retos.webp': '1c5e7209',
  './assets/modes/secreto.webp': '93656d07',
  './assets/modes/suelto/ameba.webp': '36d2644e',
  './assets/modes/suelto/calculo.webp': '8bcd1f43',
  './assets/modes/suelto/contrarreloj.webp': '72d54956',
  './assets/modes/suelto/derrame.webp': 'f9612197',
  './assets/modes/suelto/duelo.webp': 'b929357f',
  './assets/modes/suelto/estandar.webp': 'cf74b615',
  './assets/modes/suelto/humano.webp': 'c94a5071',
  './assets/modes/suelto/muerte-subita.webp': 'a78150d7',
  './assets/modes/suelto/repaso.webp': '29b0cdfa',
  './assets/modes/suelto/retos.webp': 'b28aabca',
  './assets/modes/suelto/secreto.webp': 'f0fb994d',
  './assets/modes/suelto/supervivencia.webp': '0edf213a',
  './assets/modes/supervivencia.webp': '0252d2ac',
  './assets/ui/abaco.webp': '8df7f337',
  './assets/ui/atencion.webp': '0d989e0c',
  './assets/ui/avatar-desbloqueado.webp': '3435d8f2',
  './assets/ui/bandera-blanca.webp': '3ce4aa4a',
  './assets/ui/bien.webp': '80ea2d08',
  './assets/ui/bola-rota.webp': 'dcbcfa95',
  './assets/ui/bombilla.webp': '38c00fe5',
  './assets/ui/bronce.webp': '5a68a9d9',
  './assets/ui/calavera.webp': '19d4f16e',
  './assets/ui/calculadora-humo.webp': 'd62bbef4',
  './assets/ui/calculadora-laton.webp': '7912ca3d',
  './assets/ui/caracol.webp': 'a97b0113',
  './assets/ui/cartel-peligro.webp': '97d54d81',
  './assets/ui/casi.webp': '6bfb6d21',
  './assets/ui/celebracion.webp': '87e6433a',
  './assets/ui/cerebro-engranajes.webp': 'b446d97a',
  './assets/ui/cerebro.webp': '416f0417',
  './assets/ui/cofre-medallas.webp': '3600dee0',
  './assets/ui/compartir.webp': '2b2e6a06',
  './assets/ui/copa.webp': '0c2c5067',
  './assets/ui/correcto.webp': '924ae99a',
  './assets/ui/derrota.webp': '8ccd87f3',
  './assets/ui/desastre.webp': '2b34b57a',
  './assets/ui/diamante.webp': '79ba4678',
  './assets/ui/escoba.webp': '173febbe',
  './assets/ui/escudo.webp': '53e5ae4f',
  './assets/ui/fragmento.webp': '4a6cbc9e',
  './assets/ui/gorro-burro.webp': 'fa3c4688',
  './assets/ui/guante.webp': '82d30bd8',
  './assets/ui/hito12.webp': '8fd60e1f',
  './assets/ui/hito15.webp': '957fbb83',
  './assets/ui/incorrecto.webp': 'fb744d60',
  './assets/ui/insignia-nivel.webp': '04b26e8e',
  './assets/ui/insignia.webp': 'c6704d09',
  './assets/ui/instalar-app.webp': '4b10f2c0',
  './assets/ui/libreta.webp': '3734c844',
  './assets/ui/libro-vela.webp': 'e2da705b',
  './assets/ui/libro.webp': 'fab53d16',
  './assets/ui/liebre.webp': 'c77382c1',
  './assets/ui/marca-duelo.webp': '4ed6e4f5',
  './assets/ui/medalla.webp': 'fecfd017',
  './assets/ui/mediocre.webp': 'aed5e07c',
  './assets/ui/movil.webp': '6b806f36',
  './assets/ui/nube.webp': 'f7c1dccf',
  './assets/ui/oro.webp': '289c3aed',
  './assets/ui/perfecto.webp': 'fa3bd5a2',
  './assets/ui/pergamino.webp': '2a0bf488',
  './assets/ui/pizarra-operaciones.webp': '2d698757',
  './assets/ui/plata.webp': 'c0ce8742',
  './assets/ui/progreso.webp': 'b7e701c5',
  './assets/ui/racha.webp': '3ee4565d',
  './assets/ui/regla-calculo.webp': '74673993',
  './assets/ui/reloj-derretido.webp': '2789b018',
  './assets/ui/revancha.webp': 'ad4f0bf4',
  './assets/ui/sombrero-aplastado.webp': 'ce481fbc',
  './assets/ui/sombrero-laurel.webp': '18b65104',
  './assets/ui/sombrero-mediocre.webp': '3531e6f5',
  './assets/ui/sombrero-saludo.webp': '23366762',
  './assets/ui/suspenso.webp': '7489b62c',
  './assets/ui/tiempo.webp': 'ee46f823',
  './assets/ui/xp.webp': 'b4465a36',
  './assets/ui/zorro.webp': '462a7e7a'
};
// </asset-revs>

// JS y CSS se piden desde index.html con ?v=<CACHE_VERSION> (ver scripts/bump-version.mjs): se precargan
// con la misma URL exacta para que la caché los encuentre.
// Los retratos PNG que tienen versión WebP no se precargan (los navegadores actuales usan el WebP; un
// navegador antiguo los pide a la red). La música tampoco: suena solo con conexión.
const isAsset = (u) => /^\.\/assets\//.test(u);
const withVersion = (u) => (/^\.\/(src|styles)\/.+\.(js|css)$/.test(u) ? u + '?v=' + CACHE_VERSION : u);
const SHELL_URLS = APP_SHELL.map(withVersion).filter((u) => !isAsset(u));   // código: caché versionada
const ASSET_URLS = APP_SHELL.filter(isAsset);                              // imágenes: caché estable

// Clave de una imagen en ASSET_CACHE: su URL + su huella. Si el archivo cambia, cambia la clave y se vuelve a descargar.
const assetRequest = (u) => new Request(u + '?r=' + ASSET_REVS[u]);

// Guarda las imágenes que falten (con 6 descargas a la vez) y retira las que ya no tocan. Nunca lanza error: devuelve cuántas fallaron.
async function cacheAssets() {
  const cache = await caches.open(ASSET_CACHE);
  const wanted = ASSET_URLS.filter((u) => ASSET_REVS[u]).map((u) => [u, assetRequest(u)]);
  const queue = [];
  for (const [u, req] of wanted) { if (!(await cache.match(req))) queue.push([u, req]); }
  let failed = 0;
  const worker = async () => {
    while (queue.length) {
      const [u, req] = queue.shift();
      try {
        const res = await fetch(u, { cache: 'reload' });   // 'reload': nunca una copia vieja de la caché HTTP
        if (res && res.ok) await cache.put(req, res); else failed++;
      } catch (e) { failed++; }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  const keep = new Set(wanted.map(([, req]) => req.url));
  for (const k of await cache.keys()) { if (/\?r=/.test(k.url) && !keep.has(k.url)) await cache.delete(k); }
  return failed;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const code = await caches.open(CACHE_NAME);
    await code.addAll(SHELL_URLS);
    // Imágenes: tolerante y con tope de tiempo. Lo que no llegue se descarga la primera vez que se use.
    try { await Promise.race([cacheAssets(), new Promise((resolve) => setTimeout(resolve, 30000))]); } catch (e) { /* no bloquea la instalación */ }
  })());
  // Deliberadamente NO se llama a self.skipWaiting() aquí: si alguien está
  // a mitad de una partida cuando se publica una versión nueva, no queremos
  // que el service worker tome el control de golpe y le cambie el shell
  // bajo los pies. El nuevo SW se instala y espera; se activa solo cuando
  // ya no queda ninguna pestaña abierta con la versión anterior (el ciclo
  // de vida estándar del navegador), momento en el que además limpiamos
  // las cachés viejas en 'activate'. Esto es justo lo que pide el punto 4:
  // "no servir versiones antiguas indefinidamente después de una
  // actualización", sin interrumpir una sesión de juego en curso.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('sedq-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

const SCOPE_PATH = new URL('./', self.location).pathname;

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET, y solo mismo origen: las peticiones a Google Fonts (u otro
  // origen externo) se dejan pasar sin interceptar, tal y como ya
  // funcionaban antes de que existiera este service worker.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegación (abrir/recargar la página): red primero, con la copia en
  // caché como respaldo si no hay conexión. Así, en cuanto haya red, se ve
  // siempre el index.html más reciente en vez de quedarse pegado a una
  // versión vieja cacheada.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // Imágenes de assets/ con huella: se sirven de la caché estable; si no están (instalación incompleta), de la red, y se guardan.
  const rel = './' + url.pathname.slice(SCOPE_PATH.length);
  if (Object.prototype.hasOwnProperty.call(ASSET_REVS, rel)) {
    const key = new Request(url.origin + url.pathname + '?r=' + ASSET_REVS[rel]);
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(key);
        if (hit) return hit;
        const res = await fetch(req);
        if (res && res.ok && res.status !== 206) cache.put(key, res.clone());
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Resto de recursos propios (CSS/JS/iconos/manifest): caché primero para
  // que el juego cargue rápido y funcione razonablemente sin conexión, con
  // red como respaldo y actualización silenciosa de la caché.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // 206 = trozo de un archivo (la música se pide por partes): la caché no admite respuestas parciales.
          if (res && res.ok && res.status !== 206) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Este service worker no toca localStorage en ningún punto (de hecho no
// puede: un service worker no tiene acceso al localStorage de la página,
// son almacenes distintos), así que el guardado del progreso del juego es
// completamente independiente de todo lo anterior.
