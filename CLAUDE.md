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
- **Audio:** sonidos y música se centralizan en `src/audio/audio.js` (reproducción, ajustes de sonido, comportamiento sin conexión).
  Hoy el audio sigue dentro de `index.html` (`playSound` y afines); se extrae al añadir los sonidos nuevos, en un commit propio.
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
**generadas a partir de `src/data/questions.js`, `lucidez.js`, `medals.js` y `avatars.js`**. Si cambias cualquiera de ellos: regenerar (`scripts/gen-questions.mjs`,
`scripts/gen-lucidez.mjs`, `scripts/gen-constants.mjs`) y **volver a desplegar el Worker**; si no, Duelo/Retos y el perfil pueden fallar en producción.
Los Retos por modo (2.0) los corrige el servidor (`src/reto-modes.js` del backend); `src/utils/matching.js` tiene una copia literal allí (`src/matching.js`).
Igual con `src/utils/sync-merge.js`: debe ser el mismo texto que `src/sync-merge.js` del backend.

## Producto (decisiones cerradas de la 2.0)
- «Lucidez Mental» es un modo secreto: no se nombra antes de desbloquearlo (10 Fragmentos de Mente). Textos misteriosos hasta entonces.
- No existe el «Duelo por código» (retirado): solo Duelo online (en directo, con amigos, 20 preguntas) y Retos (asíncronos, con plazo,
  y con el modo que elija quien reta entre los que ambos tengan desbloqueados). Ambos exigen cuenta y cuentan para las estadísticas y logros de Duelo.
- «Compartir resultado» es una acción secundaria y discreta.
- Historial de versiones breve y en orden.
- Bienvenida (primera vez, tras la cuenta) y aviso de novedades (al actualizar, lee la entrada del historial de la versión):
  mantener SIEMPRE su tono de Sir Edwards, elegante y sarcástico («Vaya, un nuevo aspirante.», «Tus excusas, no.»,
  «Mientras no mirabas, Sir Edwards ha estado ocupado:»). Cada versión nueva lleva su entrada en el historial con ese tono.
- Nunca perder datos de usuarios existentes: la clave local `siredwards_quiz_v1_0_data` no se cambia.
