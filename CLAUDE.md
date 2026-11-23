# SirEdwards Quiz — reglas de trabajo del proyecto

PWA de trivia (GitHub Pages) en JavaScript clásico, sin sistema de compilación. `index.html` es el punto de entrada.
Backend aparte (Cloudflare Worker + D1), que NO vive en este repositorio.

## Arquitectura: módulos, no más `index.html`
- **No se refactoriza `index.html` en masa.** Ya tiene ~7.100 líneas; no crece con lógica nueva.
- **Cada funcionalidad nueva va en su propio módulo de `src/`** (carpeta según su tipo: `data/`, `utils/`, `online/`, `share/`, `state/`…).
  `index.html` solo recibe la etiqueta `<script>` que lo enlaza y, si hace falta, la llamada.
- Reutiliza los módulos existentes antes de crear otro. No crees módulos duplicados ni reorganices archivos sin una necesidad concreta.
- Separa lógica de negocio, persistencia e interfaz cuando sea razonable.
- Sin dependencias nuevas ni herramienta de compilación salvo que sean imprescindibles.
- **Audio:** sonidos y música viven en `src/audio/audio.js` (reproducción, ajustes de sonido, comportamiento sin conexión). No añadas audio en `index.html`.
- Una reorganización mayor de `index.html` se deja para una versión posterior y solo si hace falta.
- No mezclar cambios de modularización con cambios funcionales ajenos a la tarea.

## Al publicar
- Cada archivo nuevo del que dependa el modo sin conexión se añade a la lista de `sw.js` y se **sube `CACHE_VERSION`** en cada publicación
  con `node scripts/bump-version.mjs` (pone el mismo número en los `?v=` de los `<script>`/`<link>` de `index.html`; un test lo comprueba).
- La tarjeta final de Duelo/Reto reutiliza los estilos de `#results-card`: si cambias esa tarjeta en `styles/main.css`/`theme.css`,
  ejecuta `node scripts/gen-duel-results-css.mjs` (regenera su bloque en `styles/online.css`; un test lo comprueba).
- Antes de subir: `node --test test/*.test.mjs` y comprobación en navegador (móvil y sin conexión cuando corresponda), sin errores de JavaScript.
- No sobrescribir `src/data/questions.js` (lo edita el propietario a mano) ni subir un `src/online/config.js` con valores inventados.

## Backend acoplado a esta PWA
El Worker (fuera de este repo) tiene su propia copia del banco de preguntas (corrige Duelo/Retos), de la lista de logros y de la de avatares,
**generadas a partir de `src/data/questions.js`, `lucidez.js`, `medals.js` y `avatars.js`**. Si cambias cualquiera de ellos: ejecutar
`node scripts/worker-sync.mjs <ruta del backend>` (copia las partes literales, regenera con los `gen-*.mjs` del backend, pasa sus tests y anota el estado en
`scripts/worker-copies.json`) y **volver a desplegar el Worker** (`npx wrangler deploy` en el backend); si no, Duelo/Retos y el perfil pueden fallar en producción.
`node scripts/worker-sync.mjs --check` (lo ejecuta un test y `bump-version.mjs` avisa) detecta que una copia quedó atrasada. Los `gen-*.mjs` viven en el backend, no aquí.
Los Retos por modo (2.0) los corrige el servidor (`src/reto-modes.js` del backend); `src/utils/matching.js` y `src/utils/answer-alias.js` (la guarda contra respuestas que son otro distractor del banco) tienen copia literal allí.
Igual con `src/utils/sync-merge.js`: debe ser el mismo texto que `src/sync-merge.js` del backend.

## Producto (decisiones cerradas de la 2.0)
- «Lucidez Mental» es un modo secreto: no se nombra antes de desbloquearlo (10 Fragmentos de Mente). Textos misteriosos hasta entonces.
- No existe el «Duelo por código» (retirado): solo Duelo online (en directo, con amigos, 20 preguntas) y Retos (asíncronos, con plazo,
  y con el modo que elija quien reta entre los que ambos tengan desbloqueados). Ambos exigen cuenta y cuentan para las estadísticas y logros de Duelo.
- El lema público «Test de Lucidez Mental» (título, descripción, vistas previas, cabecera y `manifest.json`) es el título expreso del juego: es una excepción deliberada a la regla de no nombrar el modo secreto. No se cambia.
- «Compartir resultado» es una acción secundaria y discreta.
- Historial de versiones breve y en orden.
- Bienvenida (primera vez, tras la cuenta) y aviso de novedades (al actualizar, lee la entrada del historial de la versión):
  la Bienvenida y el encabezado del aviso mantienen el tono de Sir Edwards, elegante y sarcástico («Vaya, un nuevo aspirante.», «Tus excusas, no.»,
  «Mientras no mirabas, Sir Edwards ha estado ocupado:»). El historial de versiones, en cambio, es breve y neutro (sin coletillas): la versión pública vigente es la 0.9 (las antiguas 1.0…2.0 se renumeraron a 0.1…0.9; no hay 0.7 ni 0.8). Ajustes muestra solo la última entrada y pliega el resto en «Versiones anteriores (N)».
- **La 1.0 está reservada** para el lanzamiento oficial en Google Play (enlaces de invitación a duelos/retos, tutorial y ayuda de Duelos renovados, primera app Android). No se añade su entrada ni se sube `APP_VERSION` a 1.0 hasta que todo eso esté terminado y verificado.
- Renumeración pública: `src/utils/version-scheme.js` traduce una vez la clave de «novedades vistas» antigua (`siredwards_quiz_v1_3_update_seen`, p. ej. "2.0" → "0.9") y deja la marca `siredwards_quiz_v1_3_update_seen_scheme`. Las claves de almacenamiento conservan sus nombres históricos.
- Tipografías (Inter, Playfair Display) alojadas en `assets/fonts/` y `styles/fonts.css`: no volver a depender de Google Fonts (sin conexión no cargan).
- Nunca perder datos de usuarios existentes: la clave local `siredwards_quiz_v1_0_data` no se cambia.
- Invitaciones unificadas de Duelos (1.0, apagadas hasta `features.duel_invites_v2` del Worker; sin migración): en 1 contra 1, amigo y enlace son excluyentes (el Worker cambia de método en una transacción);
  en Todos contra todos se combinan en una sola sala. Cancelar pide confirmación y solo vuelve atrás si el Worker lo confirma. El Worker es la fuente de verdad (recuperar, regenerar el token); la PWA nunca guarda ni muestra la URL completa.
  Detalle y despliegue: `docs/despliegue-invitaciones-unificadas-1-0.md`. Cada bandera nueva de `features` hay que añadirla a `src/online/online.js` (descarta las que no conoce).
- Tutorial de Duelos: siete viñetas fijas (textos en `src/data/duel-tour-steps.js`, no se cambian sin consultar), clave propia `siredwards_quiz_duel_tour_seen`; nunca escribe en el Worker ni toca `K_HELP`, `K_INTRO` ni `K_UNLOCKED`.
