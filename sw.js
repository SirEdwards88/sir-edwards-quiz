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
const CACHE_VERSION = 20;
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
  './src/data/avatars.js',
  './src/data/lucidez.js',
  './src/data/medals.js',
  './src/data/phrases.js',
  './src/data/questions.js',
  './src/data/ui-maps.js',
  './src/online/config.js',
  './src/ui/install-app.js',
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
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-16.png',
  './icons/favicon-32.png',
  './icons/favicon-48.png',
  './assets/avatars/sombrero.png',
  './assets/avatars/libro.png',
  './assets/avatars/reloj.png',
  './assets/avatars/lupa.png',
  './assets/avatars/mascara.png',
  './assets/avatars/pluma.png',
  './assets/character/hat.png',
  './assets/character/hat.webp',
  './assets/character/victory.png',
  './assets/character/victory.webp',
  './assets/character/defeat.png',
  './assets/character/defeat.webp',
  './assets/character/lucidez-fase1.png',
  './assets/character/lucidez-fase1.webp',
  './assets/character/lucidez-fase2.png',
  './assets/character/lucidez-fase2.webp',
  './assets/character/lucidez-fase3.png',
  './assets/character/lucidez-fase3.webp',
  './assets/character/lucidez-enigma.png',
  './assets/character/lucidez-enigma.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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
          if (res && res.ok) {
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
