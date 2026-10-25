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
const CACHE_VERSION = 444;
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
  './styles/results-frame.css',
  './styles/visual-2-3.css',
  './styles/light-refresh.css',
  './styles/theme.css',
  './styles/fonts.css',
  './src/data/avatars.js',
  './src/data/lucidez.js',
  './src/data/medals.js',
  './src/data/phrases.js',
  './src/data/duel-phrases.js',
  './src/data/rivalry-phrases.js',
  './src/utils/rivalry.js',
  './src/ui/a11y.js',
  './src/ui/privacy.js',
  './src/ui/back-nav.js',
  './src/data/questions.js',
  './src/data/questions-retired.js',
  './src/data/ui-maps.js',
  './src/online/config.js',
  './src/ui/install-app.js',
  './src/share/invite.js',
  './src/ui/reward-toast.js',
  './src/ui/game-fx.js',
  './src/ui/last-life.js',
  './src/ui/hitos.js',
  './src/ui/achievements.js',
  './src/ui/stats-extra.js',
  './src/ui/name-prompt.js',
  './src/ui/intro.js',
  './assets/modes/estandar.webp',
  './assets/modes/home-jugar.webp',
  './assets/modes/duelo.webp',
  './assets/modes/duelo-online.webp',
  './assets/modes/repaso.webp',
  './assets/modes/supervivencia.webp',
  './assets/modes/muerte-subita.webp',
  './assets/modes/contrarreloj.webp',
  './assets/modes/calculo.webp',
  './assets/modes/calculo-turbo.webp',
  './assets/character/hat-destello.webp',
  './assets/ui/fondos/cabecera.webp',
  './assets/ui/fondos/damasco-marfil.svg',
  './assets/ui/fondos/duelo.webp',
  './assets/ui/fondos/encargos.webp',
  './assets/ui/fondos/estadisticas.webp',
  './assets/ui/fondos/secreto.webp',
  './assets/ui/tarjeta/sello-record.webp',
  './assets/ui/logros/candado.webp',
  './assets/ui/logros/sello-conseguido.webp',
  './assets/ui/logros/sello-secreto.webp',
  './assets/ui/logros/silueta-secreta.webp',
  './assets/ui/nivel/cinta-nivel.webp',
  './assets/ui/nivel/confeti.webp',
  './assets/ui/nivel/insignia-bronce.webp',
  './assets/ui/nivel/insignia-diamante.webp',
  './assets/ui/nivel/insignia-oro.webp',
  './assets/ui/nivel/insignia-plata.webp',
  './assets/ui/nivel/insignia-rubi.webp',
  './assets/ui/nivel/rayos.webp',
  './assets/ui/escenas/error.webp',
  './assets/ui/escenas/sin-conexion.webp',
  './assets/ui/escenas/vacio-general.webp',
  './assets/ui/escenas/vacio-retos.webp',
  './assets/ui/escenas/vacio-amigos.webp',
  './assets/modes/calculo-clasico.webp',
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
  './assets/ui/casi.webp',
  './assets/ui/derrota.webp',
  './assets/ui/cofre-medallas.webp',
  './assets/ui/pizarra-operaciones.webp',
  './assets/ui/cerebro-engranajes.webp',
  './assets/ui/sombrero-saludo.webp',
  './assets/ui/sir-aviso.webp',
  './assets/ui/sir-reto.webp',
  './assets/ui/sombrero-nombre.webp',
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
  './assets/modes/emblema/ameba.webp',
  './assets/modes/emblema/calculo-clasico.webp',
  './assets/modes/emblema/calculo-turbo.webp',
  './assets/modes/emblema/contrarreloj.webp',
  './assets/modes/emblema/derrame.webp',
  './assets/modes/emblema/duelo-apuestas.webp',
  './assets/modes/emblema/duelo-clasico.webp',
  './assets/modes/emblema/estandar.webp',
  './assets/modes/emblema/humano.webp',
  './assets/modes/emblema/muerte-subita.webp',
  './assets/modes/emblema/repaso.webp',
  './assets/modes/emblema/secreto.webp',
  './assets/modes/emblema/supervivencia.webp',
  './assets/modes/suelto/calculo-turbo.webp',
  './assets/modes/suelto/calculo-clasico.webp',
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
  './assets/duelos/rankings/fondo.webp',
  './assets/duelos/rankings/friends.webp',
  './assets/duelos/rankings/global.webp',
  './assets/duelos/rankings/mental.webp',
  './assets/duelos/rankings/pvp.webp',
  './assets/duelos/rankings/timetrial.webp',
  './assets/duelos/estadisticas.webp',
  './assets/duelos/modos/classic.webp',
  './assets/duelos/modos/stakes.webp',
  './assets/duelos/formato/uno-contra-uno.webp',
  './assets/duelos/formato/multiple.webp',
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
  './assets/logros/multi_mesa_completa.webp',
  './assets/logros/multi_contra_la_corriente.webp',
  './assets/logros/multi_entre_la_niebla.webp',
  './assets/logros/multi_alguien_tenia_que_perder.webp',
  './assets/logros/multi_costumbre_preocupante.webp',
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
  './assets/modes/mini/calculo-clasico.webp',
  './assets/modes/mini/secreto.webp',
  './assets/modes/mini/ranking.webp',
  './assets/modes/mini/duelo.webp',
  './assets/modes/mini/logros.webp',
  './src/audio/audio.js',
  './assets/audio/correct.mp3',
  './assets/audio/win.mp3',
  './assets/audio/lose.mp3',
  './assets/audio/record.mp3',
  './assets/audio/event.mp3',
  './assets/audio/secret.mp3',
  './assets/audio/lucidez-fase1.mp3',
  './assets/audio/lucidez-fase2.mp3',
  './assets/audio/lucidez-fase3.mp3',
  './assets/audio/lucidez-enigma.mp3',
  './assets/fonts/inter-latin.woff',
  './assets/fonts/playfair-display-latin.woff',
  './assets/audio/wrong.mp3',
  './src/utils/sync-merge.js',
  './src/online/data-sync.js',
  './src/online/online.js',
  './src/share/share-card.js',
  './src/online/reto-fx.js',
  './src/online/duels.js',
  './src/online/duels-v21.js',
  './src/online/multi-duels.js',
  './src/online/multi-stakes.js',
  './src/online/player-profile.js',
  './src/online/inbox.js',
  './src/online/push.js',
  './src/utils/duel.js',
  './src/utils/matching.js',
  './src/utils/review-batch.js',
  './src/utils/records-reset.js',
  './src/utils/answer-alias.js',
  './src/utils/lucidez-select.js',
  './src/state/lucidez-bag.js',
  './src/state/timetrial-bag.js',
  './src/utils/encargos-core.js',
  './src/utils/encargos-progress.js',
  './src/state/encargos.js',
  './src/state/multi-result.js',
  './src/data/encargos-phrases.js',
  './src/ui/encargos-ui.js',
  './src/data/named-phrases.js',
  './src/utils/named-phrases.js',
  './src/utils/encargos-intro-core.js',
  './src/data/encargos-intro-phrases.js',
  './src/ui/encargos-intro.js',
  './src/ui/duel-intro.js',
  './src/data/home-quotes.js',
  './src/ui/home-quote.js',
  './styles/encargos-intro.css',
  './styles/duel-intro.css',
  './styles/encargos.css',
  './styles/sir-events.css',
  './styles/reward-toast.css',
  './styles/privacy.css',
  './src/utils/sir-events.js',
  './src/ui/sir-events-ui.js',
  './src/state/sir-events.js',
  './src/state/result-heard.js',
  './assets/character/event_siredwards_visit.webp',
  './assets/character/event_siredwards_streak.webp',
  './assets/character/event_siredwards_record.webp',
  './assets/character/event_siredwards_day.webp',
  './assets/character/event_siredwards_night.webp',
  './assets/character/event_siredwards_comeback.webp',
  './assets/character/event_siredwards_animo.webp',
  './assets/character/event_siredwards_visit2.webp',
  './assets/character/event_siredwards_broken.webp',
  './assets/character/event_siredwards_weak.webp',
  './assets/character/empate.webp',
  './assets/character/siredwards_encargos.webp',
  './assets/character/siredwards_encargos_completados.webp',
  './assets/character/presentacion-evaluador.webp',
  './assets/character/presentacion-expediente.webp',
  './assets/character/presentacion-mirada.webp',
  './assets/character/lunes-aprobacion.webp',
  './assets/character/lunes-reproche.webp',
  './src/utils/sudden-progression.js',
  './src/utils/mental-calc.js',
  './src/utils/mental-classic.js',
  './src/utils/mental-tips.js',
  './src/ui/mental-classic-ui.js',
  './src/ui/resume-clock.js',
  './src/ui/mental-menu.js',
  './src/ui/level-up.js',
  './src/utils/store.js',
  './src/state/read-facade.js',
  './src/utils/streak-xp.js',
  './src/state/write-helpers.js',
  './icons/icon-192.png?v=10',
  './icons/icon-512.png?v=10',
  './icons/icon-192-maskable.png?v=10',
  './icons/icon-512-maskable.png?v=10',
  './icons/apple-touch-icon.png?v=10',
  './icons/favicon-16.png?v=10',
  './icons/favicon-32.png?v=10',
  './icons/favicon-48.png?v=10',
  './assets/avatars/sombrero.png',
  './assets/avatars/libro.png',
  './assets/avatars/reloj.png',
  './assets/avatars/mascara.png',
  './assets/avatars/gato.png',
  './assets/avatars/caballo.png',
  './assets/avatars/sello.png',
  './assets/avatars/gramofono.png',
  './assets/avatars/buho.png',
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
  './assets/audio/event.mp3': '3dfec73a',
  './assets/audio/lose.mp3': 'bf64ed58',
  './assets/audio/lucidez-enigma.mp3': '157889a8',
  './assets/audio/lucidez-fase1.mp3': 'd8b89cd3',
  './assets/audio/lucidez-fase2.mp3': '464b2b68',
  './assets/audio/lucidez-fase3.mp3': '4689da7d',
  './assets/audio/record.mp3': '3165b8dd',
  './assets/audio/secret.mp3': 'fe9a2e00',
  './assets/audio/win.mp3': '59d1eef1',
  './assets/audio/wrong.mp3': '738c1d1c',
  './assets/avatars/avatar_siredwards_coleccionista.png': '8dc28fff',
  './assets/avatars/avatar_siredwards_imparable.png': '221ca0dc',
  './assets/avatars/avatar_siredwards_insensato.png': 'e93833f7',
  './assets/avatars/avatar_siredwards_medianoche.png': '1e74df22',
  './assets/avatars/avatar_siredwards_supremo.png': '28ec36fd',
  './assets/avatars/avatar_siredwards_vengador.png': 'bcde96ef',
  './assets/avatars/buho.png': '66608045',
  './assets/avatars/caballo.png': '7540fbcc',
  './assets/avatars/gato.png': '6f3a32b2',
  './assets/avatars/gramofono.png': '28475006',
  './assets/avatars/libro.png': 'b335e4ec',
  './assets/avatars/mascara.png': 'e4a66caa',
  './assets/avatars/reloj.png': 'b86627f5',
  './assets/avatars/sello.png': '4de41fde',
  './assets/avatars/sombrero.png': '327bd356',
  './assets/cats/arte.webp': '0d91c36e',
  './assets/cats/candado-abierto.webp': 'b059b37f',
  './assets/cats/candado.webp': '12d27bf4',
  './assets/cats/ciencia.webp': '48fe4594',
  './assets/cats/cultura.webp': '13fcba51',
  './assets/cats/deporte.webp': '37ef9eeb',
  './assets/cats/geografia.webp': '0a32eea5',
  './assets/cats/historia.webp': 'c208d729',
  './assets/character/defeat.webp': 'd4895852',
  './assets/character/empate.webp': '377f3c16',
  './assets/character/event_siredwards_animo.webp': 'b6bc6f28',
  './assets/character/event_siredwards_broken.webp': 'ce24073a',
  './assets/character/event_siredwards_comeback.webp': 'e1b589e8',
  './assets/character/event_siredwards_day.webp': '8cacefd5',
  './assets/character/event_siredwards_night.webp': 'f50f1203',
  './assets/character/event_siredwards_record.webp': '954f50aa',
  './assets/character/event_siredwards_streak.webp': '5a5725fc',
  './assets/character/event_siredwards_visit.webp': '6df39c1c',
  './assets/character/event_siredwards_visit2.webp': '6459896f',
  './assets/character/event_siredwards_weak.webp': 'ac69c5c3',
  './assets/character/hat-destello.webp': '2a29547a',
  './assets/character/hat.webp': 'f86acb28',
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
  './assets/duelos/apuestas/cuerdo.webp': '365327aa',
  './assets/duelos/apuestas/insensato.webp': '628352d0',
  './assets/duelos/apuestas/osado.webp': 'a6d8261b',
  './assets/duelos/estadisticas.webp': '947e443b',
  './assets/duelos/formato/multiple.webp': '3e06736e',
  './assets/duelos/formato/uno-contra-uno.webp': '0765638a',
  './assets/duelos/modos/classic.webp': '683e5674',
  './assets/duelos/modos/stakes.webp': '2b319ce8',
  './assets/duelos/rangos/caballero_del_dato.webp': '099a63ba',
  './assets/duelos/rangos/erudito_de_salon.webp': '37d5af3b',
  './assets/duelos/rangos/lord_sabelotodo.webp': '9d4e0dea',
  './assets/duelos/rangos/plebeyo_ilustrado.webp': '9c9aadc0',
  './assets/duelos/rangos/sir_edwards.webp': '05fa85f5',
  './assets/duelos/rankings/fondo.webp': '1a39e8f5',
  './assets/duelos/rankings/friends.webp': 'd908f9d6',
  './assets/duelos/rankings/global.webp': 'dcfdf98c',
  './assets/duelos/rankings/mental.webp': '64643357',
  './assets/duelos/rankings/pvp.webp': '1d932d90',
  './assets/duelos/rankings/timetrial.webp': 'e2753514',
  './assets/familias/aciertos.webp': '097c4a53',
  './assets/familias/dominio.webp': '06c0ebe9',
  './assets/familias/duelo.webp': '08a7a9bc',
  './assets/familias/errores.webp': '287dd125',
  './assets/familias/especial.webp': '330dfe9a',
  './assets/familias/modos.webp': '9e8c2a1b',
  './assets/familias/nivel.webp': 'e3f69050',
  './assets/familias/prog.webp': '63da724b',
  './assets/familias/racha.webp': '935e4201',
  './assets/familias/secretos.webp': '71d42b2c',
  './assets/fonts/inter-latin.woff': 'd7de890e',
  './assets/fonts/playfair-display-latin.woff': '5e956ae2',
  './assets/logros/all_medals_secret.webp': 'e1705874',
  './assets/logros/balanced_master.webp': 'b30a2fa7',
  './assets/logros/cleaner_25.webp': '6abf53aa',
  './assets/logros/cleaner_5.webp': 'ad5d3176',
  './assets/logros/correct_100.webp': '7d979750',
  './assets/logros/correct_400.webp': '699c3b3c',
  './assets/logros/correct_800.webp': '6ccf1940',
  './assets/logros/diurno.webp': 'd5e9fdcd',
  './assets/logros/duel_apuestas_calculada.webp': '4439369a',
  './assets/logros/duel_apuestas_ultima_locura.webp': 'a0810628',
  './assets/logros/duel_cinco_victorias.webp': '42e6bb82',
  './assets/logros/duel_contra_las_cuerdas.webp': '7002d435',
  './assets/logros/duel_otra_vez_tu.webp': 'f7db1f29',
  './assets/logros/duel_por_los_pelos.webp': '344623a9',
  './assets/logros/duel_primera_sangre.webp': 'f5385273',
  './assets/logros/duel_revancha.webp': '2e90b9e8',
  './assets/logros/duel_rey_del_empate.webp': 'dff6c620',
  './assets/logros/duel_sin_titubear.webp': '3afcf40e',
  './assets/logros/duel_tres_al_hilo.webp': 'cf6d35d9',
  './assets/logros/duel_victoria_inaugural.webp': '79b1d6a3',
  './assets/logros/first_game.webp': 'e9a0ca9f',
  './assets/logros/games_10.webp': '3d35025d',
  './assets/logros/games_20.webp': '89433df0',
  './assets/logros/games_5.webp': 'fa719ff1',
  './assets/logros/games_50.webp': 'a24c2ace',
  './assets/logros/level_10.webp': '776cdabe',
  './assets/logros/level_20.webp': '01d9c08c',
  './assets/logros/level_30.webp': 'c12ead2f',
  './assets/logros/level_5.webp': '91e2a1dd',
  './assets/logros/limpieza_general.webp': 'd9d69359',
  './assets/logros/lucidez_absoluta.webp': '6fe28412',
  './assets/logros/lucidez_conexiones_imposibles.webp': '8539b929',
  './assets/logros/lucidez_mente_despierta.webp': '19d64b82',
  './assets/logros/master_10.webp': '321f8d97',
  './assets/logros/master_100.webp': '6720bc63',
  './assets/logros/master_200.webp': '6a4b5d80',
  './assets/logros/master_50.webp': '477bf6d1',
  './assets/logros/medal_collector_10.webp': 'bad26196',
  './assets/logros/medal_collector_20.webp': '5c0335ef',
  './assets/logros/medal_collector_30.webp': '7ea68ed0',
  './assets/logros/mental_calc_15.webp': '1a2429bc',
  './assets/logros/mental_calc_30.webp': 'c4971c24',
  './assets/logros/mental_calc_40.webp': '31dfcebd',
  './assets/logros/mente_fracturada.webp': 'b2be2d01',
  './assets/logros/multi_alguien_tenia_que_perder.webp': 'ddc6a35e',
  './assets/logros/multi_contra_la_corriente.webp': 'e81680ee',
  './assets/logros/multi_costumbre_preocupante.webp': 'dd9003ab',
  './assets/logros/multi_entre_la_niebla.webp': '0d4722cb',
  './assets/logros/multi_mesa_completa.webp': '28e64b2b',
  './assets/logros/noctambulo.webp': '010d7158',
  './assets/logros/polimata.webp': '9cf89b5e',
  './assets/logros/sd_primer_riesgo.webp': '28591db4',
  './assets/logros/sharp_eye.webp': '364d44ca',
  './assets/logros/sin_frenos.webp': '8fc08093',
  './assets/logros/sin_preferencias.webp': '49606e4f',
  './assets/logros/streak_10.webp': '348bd1f6',
  './assets/logros/streak_20.webp': '8d61633e',
  './assets/logros/streak_30.webp': '37c39921',
  './assets/logros/streak_5.webp': '4db98987',
  './assets/logros/surv_ameba.webp': '580b9783',
  './assets/logros/surv_derrame.webp': '39d7d201',
  './assets/logros/surv_humano.webp': 'df5e2dc7',
  './assets/logros/tt_15.webp': '18f21f13',
  './assets/logros/tt_30.webp': '7deb221b',
  './assets/logros/tt_50.webp': '68630d42',
  './assets/modes/ajustes.webp': '04e7acbd',
  './assets/modes/ameba.webp': '9253546d',
  './assets/modes/amigos.webp': 'd908f9d6',
  './assets/modes/calculo-clasico.webp': 'd339c2c7',
  './assets/modes/calculo-turbo.webp': 'cb37e9d6',
  './assets/modes/calculo.webp': 'c0a2c952',
  './assets/modes/contrarreloj.webp': 'a36cb781',
  './assets/modes/derrame.webp': '04ceb604',
  './assets/modes/duelo-online.webp': 'dde605d4',
  './assets/modes/duelo.webp': 'a4a67f60',
  './assets/modes/emblema/ameba.webp': 'f63f2828',
  './assets/modes/emblema/calculo-clasico.webp': '5c93e490',
  './assets/modes/emblema/calculo-turbo.webp': '2828432d',
  './assets/modes/emblema/contrarreloj.webp': '7a1ed85a',
  './assets/modes/emblema/derrame.webp': 'edf48e3d',
  './assets/modes/emblema/duelo-apuestas.webp': 'cbcbc473',
  './assets/modes/emblema/duelo-clasico.webp': '649ded14',
  './assets/modes/emblema/estandar.webp': 'd8f6cf29',
  './assets/modes/emblema/humano.webp': 'c033e3f4',
  './assets/modes/emblema/muerte-subita.webp': 'f9d1049e',
  './assets/modes/emblema/repaso.webp': '05efa81a',
  './assets/modes/emblema/secreto.webp': '3bc1f40f',
  './assets/modes/emblema/supervivencia.webp': 'c783fd6b',
  './assets/modes/estadisticas.webp': '11e2a663',
  './assets/modes/estandar.webp': '6a6a14f7',
  './assets/modes/home-jugar.webp': '36ce73eb',
  './assets/modes/humano.webp': '782482e6',
  './assets/modes/logros.webp': 'bb4f08de',
  './assets/modes/mini/ameba.webp': 'ec7aca36',
  './assets/modes/mini/calculo-clasico.webp': 'e3b6dba9',
  './assets/modes/mini/calculo.webp': '568f4aa7',
  './assets/modes/mini/contrarreloj.webp': '65ff62b2',
  './assets/modes/mini/derrame.webp': '16c006a7',
  './assets/modes/mini/duelo.webp': 'daf5b635',
  './assets/modes/mini/estandar.webp': '79121632',
  './assets/modes/mini/humano.webp': 'fa2c6739',
  './assets/modes/mini/logros.webp': '18a25933',
  './assets/modes/mini/muerte-subita.webp': '9fcca8d5',
  './assets/modes/mini/ranking.webp': '3608d180',
  './assets/modes/mini/repaso.webp': 'bfded6f5',
  './assets/modes/mini/secreto.webp': 'c02dcd98',
  './assets/modes/mini/supervivencia.webp': '4cf3184c',
  './assets/modes/muerte-subita.webp': 'b9dea2cc',
  './assets/modes/ranking.webp': 'e5edfa17',
  './assets/modes/repaso.webp': '1eab41f5',
  './assets/modes/retos.webp': '7a0b8510',
  './assets/modes/secreto.webp': '52143f5e',
  './assets/modes/suelto/ameba.webp': 'df950cb2',
  './assets/modes/suelto/calculo-clasico.webp': '7c7c777e',
  './assets/modes/suelto/calculo-turbo.webp': '5b9388ea',
  './assets/modes/suelto/calculo.webp': '8bcd1f43',
  './assets/modes/suelto/contrarreloj.webp': 'c0a755c3',
  './assets/modes/suelto/derrame.webp': 'f5bb4ad6',
  './assets/modes/suelto/duelo.webp': 'ef6a0cf3',
  './assets/modes/suelto/estandar.webp': '99986f8f',
  './assets/modes/suelto/humano.webp': '508f1726',
  './assets/modes/suelto/muerte-subita.webp': '7872779c',
  './assets/modes/suelto/repaso.webp': '2c00e891',
  './assets/modes/suelto/retos.webp': '59c6f62a',
  './assets/modes/suelto/secreto.webp': 'e4a61264',
  './assets/modes/suelto/supervivencia.webp': '5a028c83',
  './assets/modes/supervivencia.webp': '5cbe99dc',
  './assets/ui/abaco.webp': '479e43d7',
  './assets/ui/atencion.webp': 'b77f41e5',
  './assets/ui/avatar-desbloqueado.webp': '179309c6',
  './assets/ui/bandera-blanca.webp': 'dee45dd5',
  './assets/ui/bien.webp': 'fc543daa',
  './assets/ui/bola-rota.webp': 'a1013b47',
  './assets/ui/bombilla.webp': '6a5b987d',
  './assets/ui/bronce.webp': 'dba4350a',
  './assets/ui/calavera.webp': '91078f77',
  './assets/ui/calculadora-humo.webp': 'd056b438',
  './assets/ui/calculadora-laton.webp': '5dfc4d30',
  './assets/ui/caracol.webp': '59071199',
  './assets/ui/cartel-peligro.webp': 'a2387bfc',
  './assets/ui/casi.webp': 'f9301bfb',
  './assets/ui/celebracion.webp': '8b133046',
  './assets/ui/cerebro-engranajes.webp': '7e026a43',
  './assets/ui/cerebro.webp': 'd405c40b',
  './assets/ui/cofre-medallas.webp': '3c2e9fad',
  './assets/ui/compartir.webp': '9171bda6',
  './assets/ui/copa.webp': 'b373f220',
  './assets/ui/correcto.webp': '974bb8e4',
  './assets/ui/derrota.webp': '209581d4',
  './assets/ui/desastre.webp': '8e5ccc49',
  './assets/ui/diamante.webp': '8ab2f0aa',
  './assets/ui/escenas/error.webp': '224f56ac',
  './assets/ui/escenas/sin-conexion.webp': '9076a1a8',
  './assets/ui/escenas/vacio-amigos.webp': 'e9fc13d9',
  './assets/ui/escenas/vacio-general.webp': '19c959cc',
  './assets/ui/escenas/vacio-retos.webp': '2cbbaf58',
  './assets/ui/escoba.webp': 'bcb8cf24',
  './assets/ui/escudo.webp': '4c0a7fbf',
  './assets/ui/fondos/cabecera.webp': '76ee3e40',
  './assets/ui/fondos/damasco-marfil.svg': '215adc44',
  './assets/ui/fondos/duelo.webp': '3883e2b3',
  './assets/ui/fondos/encargos.webp': '54f2070c',
  './assets/ui/fondos/estadisticas.webp': 'a64f5f52',
  './assets/ui/fondos/secreto.webp': 'ddd0084f',
  './assets/ui/fragmento.webp': '9ee6dbe6',
  './assets/ui/gorro-burro.webp': '3c695c11',
  './assets/ui/guante.webp': 'd7253f3d',
  './assets/ui/hito12.webp': '2b04966a',
  './assets/ui/hito15.webp': '5d54b0c5',
  './assets/ui/incorrecto.webp': 'fd05c912',
  './assets/ui/insignia-nivel.webp': '46fa7480',
  './assets/ui/insignia.webp': '6e91644d',
  './assets/ui/instalar-app.webp': '8c3da78c',
  './assets/ui/libreta.webp': '692a9ac7',
  './assets/ui/libro-vela.webp': '37b490f3',
  './assets/ui/libro.webp': '486b4819',
  './assets/ui/liebre.webp': '6781ca8d',
  './assets/ui/logros/candado.webp': '6ea1573a',
  './assets/ui/logros/sello-conseguido.webp': '92112121',
  './assets/ui/logros/sello-secreto.webp': '90114283',
  './assets/ui/logros/silueta-secreta.webp': '045b4b95',
  './assets/ui/medalla.webp': '67b76085',
  './assets/ui/mediocre.webp': '99595f15',
  './assets/ui/movil.webp': 'cc6ab1aa',
  './assets/ui/nivel/cinta-nivel.webp': 'cbf35898',
  './assets/ui/nivel/confeti.webp': '36473c45',
  './assets/ui/nivel/insignia-bronce.webp': 'df3ad9fa',
  './assets/ui/nivel/insignia-diamante.webp': '55ceab53',
  './assets/ui/nivel/insignia-oro.webp': 'aafc1757',
  './assets/ui/nivel/insignia-plata.webp': '96d96a8b',
  './assets/ui/nivel/insignia-rubi.webp': '25f16e7e',
  './assets/ui/nivel/rayos.webp': 'e94f846a',
  './assets/ui/nube.webp': '0848c96b',
  './assets/ui/oro.webp': 'e6d1e643',
  './assets/ui/perfecto.webp': 'c82114e6',
  './assets/ui/pergamino.webp': '2c916bb6',
  './assets/ui/pizarra-operaciones.webp': '12e89c0c',
  './assets/ui/plata.webp': '34964a2b',
  './assets/ui/progreso.webp': '93e94202',
  './assets/ui/racha.webp': '3c061c6c',
  './assets/ui/regla-calculo.webp': '968d898c',
  './assets/ui/reloj-derretido.webp': '671f44b6',
  './assets/ui/revancha.webp': 'c7fc74b3',
  './assets/ui/sir-aviso.webp': '70e4dbaf',
  './assets/ui/sir-reto.webp': '801d3e4c',
  './assets/ui/sombrero-aplastado.webp': 'bd1a6ce9',
  './assets/ui/sombrero-laurel.webp': '12dbb7f8',
  './assets/ui/sombrero-mediocre.webp': '02513cbd',
  './assets/ui/sombrero-nombre.webp': '4e3032c8',
  './assets/ui/sombrero-saludo.webp': '7d193989',
  './assets/ui/suspenso.webp': '582fd4c7',
  './assets/ui/tarjeta/sello-record.webp': '5e2ca086',
  './assets/ui/tiempo.webp': '47ba95ec',
  './assets/ui/xp.webp': 'dbf27712',
  './assets/ui/zorro.webp': '31ad5246'
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
          // Solo se guarda una página correcta: un 404/500 de la red no puede sustituir a la copia buena de sin conexión.
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
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

// 2.3 — Avisos push de Retos. El servidor manda {t, b, url, tag}; aquí solo se enseña la notificación y, al tocarla,
// se abre o enfoca la app llevando al reto (#reto=ID). Si la app ya está a la vista, no se duplica: la avisa el aviso interno.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  const title = String(d.t || 'Sir Edwards').slice(0, 80);
  const m = /reto=([0-9A-Z]{10})/.exec(String(d.url || ''));
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((c) => c.visibilityState === 'visible')) {
      wins.forEach((c) => c.postMessage({ type: 'seq-push', id: m ? m[1] : null }));
      return;
    }
    await self.registration.showNotification(title, {
      body: String(d.b || '').slice(0, 160),
      badge: './icons/badge-96.png',
      tag: String(d.tag || 'seq'), renotify: false, data: { id: m ? m[1] : null },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const id = event.notification.data && event.notification.data.id;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins[0];
    if (win) {
      try { await win.focus(); } catch (e) {}
      win.postMessage({ type: 'seq-push', id: id || null, open: true });
      return;
    }
    await self.clients.openWindow('./' + (id ? '#reto=' + id : ''));
  })());
});

// Este service worker no toca localStorage en ningún punto (de hecho no
// puede: un service worker no tiene acceso al localStorage de la página,
// son almacenes distintos), así que el guardado del progreso del juego es
// completamente independiente de todo lo anterior.
