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
// (assets/character/, PNG + WebP). Estrategia de caché intacta.
// 2.0 (Prompt 1.5, corrección de uso de los assets de Lucidez): subido de 8
// a 9; cambiaron index.html y styles/main.css (el retrato pasa a ir debajo
// del título/frase en las 4 transiciones, y se retira por completo de la
// pantalla de juego del Enigma Final). Sin archivos nuevos. Estrategia de
// caché NO se ha tocado.
// 2.0 (Prompt 4, progresión): subido de 9 a 10; cambiaron index.html,
// styles/main.css, src/data/medals.js, src/utils/store.js y src/online/duels.js (ya en el shell).
// 2.0 (Prompt 5, tarjeta de compartir): subido de 10 a 11; nuevo src/share/share-card.js
// (añadido al shell) y cambiaron index.html y src/online/duels.js.
const CACHE_VERSION = 108;
const CACHE_NAME = `sedq-shell-v${CACHE_VERSION}`;

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
  './src/data/ui-maps.js',
  './src/online/config.js',
  './src/ui/install-app.js',
  './src/ui/game-fx.js',
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
  './assets/ui/casi.webp',
  './assets/ui/derrota.webp',
  './assets/ui/cofre-medallas.webp',
  './assets/ui/pizarra-operaciones.webp',
  './assets/ui/cerebro-engranajes.webp',
  './assets/ui/sombrero-saludo.webp',
  './assets/ui/sombrero-laurel.webp',
  './assets/ui/bandera-blanca.webp',
  './assets/ui/cartel-peligro.webp',
  './assets/ui/cronometro.webp',
  './assets/ui/gorro-burro.webp',
  './assets/ui/insignia-nivel.webp',
  './assets/ui/instalar-app.webp',
  './assets/ui/libro-vela.webp',
  './assets/ui/medalla-deslucida.webp',
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
  './assets/ui/libro-telaranas.webp',
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
  './assets/logros/all_medals_secret.webp',
  './assets/logros/balanced_master.webp',
  './assets/logros/cleaner_25.webp',
  './assets/logros/cleaner_5.webp',
  './assets/logros/correct_100.webp',
  './assets/logros/correct_300.webp',
  './assets/logros/correct_600.webp',
  './assets/logros/duel_cinco_victorias.webp',
  './assets/logros/duel_eso_era_un_duelo.webp',
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
  './assets/logros/master_150.webp',
  './assets/logros/master_250.webp',
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
  './assets/logros/world_citizen.webp',
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
  './src/utils/duel.js',
  './src/utils/matching.js',
  './src/utils/store.js',
  './src/state/read-facade.js',
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
  './assets/character/hat.webp',
  './assets/character/victory.webp',
  './assets/character/defeat.webp',
  './assets/character/lucidez-fase1.webp',
  './assets/character/lucidez-fase2.webp',
  './assets/character/lucidez-fase3.webp',
  './assets/character/lucidez-enigma.webp',
];

// JS y CSS se piden desde index.html con ?v=<CACHE_VERSION> (ver scripts/bump-version.mjs): se precargan
// con la misma URL exacta para que la caché los encuentre.
// Los retratos PNG que tienen versión WebP no se precargan (los navegadores actuales usan el WebP; un
// navegador antiguo los pide a la red). La música tampoco: suena solo con conexión.
const SHELL_URLS = APP_SHELL.map((u) => (/^\.\/(src|styles)\/.+\.(js|css)$/.test(u) ? u + '?v=' + CACHE_VERSION : u));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
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
