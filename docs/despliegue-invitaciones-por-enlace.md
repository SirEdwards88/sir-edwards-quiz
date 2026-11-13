# Invitaciones por enlace (Fase B): preparación de publicación

## 1. Orden de publicación (obligatorio)

El código nuevo del Worker escribe la columna `duelo_online.origen` en CADA duelo que se crea (también entre amigos y en revanchas).
Por eso la migración va siempre antes que el Worker: si el Worker nuevo corre sin ella, ningún duelo se puede crear.

1. `npx wrangler d1 migrations list sir-edwards-quiz --remote` (solo lee) y `npx wrangler d1 migrations apply sir-edwards-quiz --remote`.
   La 0010 solo añade (tabla nueva + columna con valor por defecto); el Worker actual sigue funcionando igual con ella aplicada.
2. `npx wrangler deploy --dry-run` y `npx wrangler deploy` con `DUEL_LINKS_ENABLED = "false"` (valor del `wrangler.toml`).
   Comprobar `GET /me`: `features.duel_links` debe ser `false`. Probar a mano un duelo normal entre amigos, un reto y la sincronización.
3. Publicar la PWA (commit, push, `CACHE_VERSION` 525 → 526 con `node scripts/bump-version.mjs`). Con la bandera apagada la PWA no
   enseña nada de enlaces ni en Ayuda ni en el tutorial.
4. Activar: `npx wrangler deploy --var DUEL_LINKS_ENABLED:true` (necesita `CLASSIC_DUEL_ENABLED = "true"`, que ya lo está).
   Un `wrangler deploy` posterior sin ese `--var` la vuelve a apagar: es el lado seguro.

## 2. Apagado rápido

`npx wrangler deploy` (sin `--var`) o `npx wrangler deploy --var DUEL_LINKS_ENABLED:false`. En cuanto el cliente refresca `/me`, el botón,
los textos de Ayuda/tutorial y el canje desaparecen y las rutas `/duel-links*` responden 404. Los duelos ya creados por enlace son duelos
normales y terminan con normalidad. No hay que tocar la PWA ni deshacer la migración (la 0010 no se revierte; es inocua).
Solo si falla el Worker en general: `npx wrangler rollback` (la migración aditiva no impide volver al Worker anterior).

## 3. Prueba con dos móviles y dos cuentas reales

Antes: PWA publicada, bandera activada, ambas cuentas a nivel 7 o más (o con algún duelo previo) y sin duelos activos.

1. Móvil A (cuenta A): Duelos → Duelo online → Clásico → «Compartir invitación». Debe verse «Invitación lista» y el enlace
   `https://siredwards88.github.io/sir-edwards-quiz/#duelo=…`. Pulsa «Compartir enlace» y envíalo al móvil B (mensajería).
2. A sale de la pantalla y vuelve a Duelos: el botón dice «Ver mi invitación activa» (no se crea otro).
3. Móvil B (cuenta B, que NO es amiga de A): abre el enlace. Sin sesión debe pedir iniciar sesión y, al entrar, preguntar
   «A te invita a un duelo clásico… ¿Aceptas?». Acepta.
4. Los dos entran en la sala de 2 minutos; ambos pulsan «¡Listo!» y empieza el duelo. Jugad hasta el final.
5. Al terminar: debe aparecer «Añadir como amigo» y NO deben ser amigos todavía. Prueba la revancha desde B: A debe aceptarla.
6. Casos límite: abrir de nuevo el mismo enlace (debe decir que ya se usó); crear otro y esperar 10 min (caducado); crear otro y
   cancelarlo (cancelado); con A en duelo, abrir un enlace de otra persona (ocupado).
7. Comprobar que un duelo entre amigos, un reto y la sincronización siguen funcionando con normalidad.
Si algo falla: apagado rápido (sección 2) y apunta pantalla y hora.

## 4. Guion de ejecución (en este orden, parando si algo falla)

Paso 0 — comprobación sin riesgo (solo lee): `cd sir-edwards-quiz-backend && node scripts/preflight-fase-b.mjs ../sir-edwards-quiz` y `npm test` (debe acabar con `# fail 0`).

Paso 1 — migración (desde `sir-edwards-quiz-backend`):
```
npx wrangler whoami
npx wrangler d1 migrations list sir-edwards-quiz --remote      # debe listar solo 0010 como pendiente
npx wrangler d1 migrations apply sir-edwards-quiz --remote
npx wrangler d1 migrations list sir-edwards-quiz --remote      # ya sin pendientes
```
Paso 2 — Worker apagado: `npx wrangler deploy --dry-run` (revisar nombre `sir-edwards-quiz-api` y D1 `sir-edwards-quiz`), luego `npx wrangler deploy`.
Comprobar con sesión iniciada en la PWA actual: consola → `SEQOnline.session().features.duel_links` debe ser `false` (o `undefined` si la PWA aún es la vieja).
Probar un duelo normal entre amigos, un reto y que los datos se sincronizan. Si falla: `npx wrangler rollback`.

Paso 3 — PWA 526: `node scripts/bump-version.mjs`, `node --test test/*.test.mjs`, commit y push (solo tras tu «publica»). Esperar a que GitHub Pages sirva
la 526 y recargar dos veces la app para que el Service Worker nuevo tome el control. Sin enlaces a la vista.

Paso 4 — activación: `npx wrangler deploy --var DUEL_LINKS_ENABLED:true`; comprobar `features.duel_links === true` y hacer la prueba con dos móviles (sección 3).
Apagado: sección 2.
