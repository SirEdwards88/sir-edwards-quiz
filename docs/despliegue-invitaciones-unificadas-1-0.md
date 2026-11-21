# Invitaciones unificadas y tutorial de Duelos (1.0): despliegue y validación manual

Contrato del Worker: `sir-edwards-quiz-backend/docs/INVITACIONES_UNIFICADAS_1_0.md`. **Sin migración D1.** Nada de esto está publicado: es trabajo local sin commit.

## Orden seguro de despliegue (cuando decidas publicar)

1. Backend: `npm test` (esperado: solo el fallo intermitente de `v15-live-check`), `npx wrangler whoami` (cuenta `siredwardsquiz@gmail.com`),
   `npx wrangler d1 migrations list sir-edwards-quiz --remote` (**sin pendientes**; no hay migración nueva),
   `npx wrangler deploy --dry-run` y comprobar que `wrangler.toml` refleja las vars en vivo (`DUEL_INVITES_V2_ENABLED = "false"` es la única nueva).
2. `npx wrangler deploy` con el flag **apagado**. Comprobar `GET /me` → `features.duel_invites_v2 === false` y que duelos, enlaces y salas siguen como antes.
3. PWA: `node --test test/*.test.mjs`, comprobar `sw.js`/`?v=` (la `CACHE_VERSION` local ya es 533 y cubre estos cambios; ver «Riesgos»), commit y push solo con tu orden.
   Con el flag apagado la PWA conserva la interfaz anterior (botón «Compartir invitación», «Crear sala por enlace»), salvo el tutorial nuevo y las salas de espera.
4. Activar (reproducible): commit de release que pone `DUEL_INVITES_V2_ENABLED = "true"` en `wrangler.toml` (solo producción), `npx wrangler deploy --dry-run`, `npx wrangler versions view <id>` para
   confirmar que las demás variables en vivo coinciden con el archivo (`wrangler deploy` las reescribe todas; los secretos no se tocan) y `npx wrangler deploy`. Comprobar `features.duel_invites_v2 === true`
   y probar el recorrido manual de abajo. No usar `--var`: no queda registrado y el siguiente deploy lo apagaría.
5. Apagado rápido: volver a `"false"` y `npx wrangler deploy` (o, en una emergencia, `npx wrangler deploy --var DUEL_INVITES_V2_ENABLED:false`). No hay nada que deshacer en D1.
6. **No** publicar APK/OTA/Google Play ni crear la entrada 1.0 del historial hasta cerrar la validación manual.

## Recorrido manual con varias cuentas (pendiente de hacer)

Cuentas A, B, C, D a nivel 7 (E con nivel inferior). Flag encendido.

1. **1v1 por enlace:** A → Duelos → Clásico → 1 contra 1 → Invitar por enlace → «Esperando jugadores» (sin URL visible). Compartir/copiar. B abre el enlace, acepta; sala de 2 min; jugad.
2. **1v1 por amigo:** A invita a B (amigo en línea). B acepta o rechaza. Probar «Cancelar invitación» (texto sin mencionar enlace).
3. **Exclusividad y cambio:** A crea enlace, vuelve atrás (no cancela) → Invitar a un amigo → confirma «Cambiar» → el enlace deja de funcionar (B lo abre y ve «cancelado»).
   Repetir al revés. Con el amigo ya aceptado: no se puede cambiar.
4. **Todos contra todos de 3:** A crea la sala; invita a B (amigo) y C entra por enlace; con 3 aparece «Empezar duelo»; jugad. Sin ELO.
5. **De 4:** D entra por el enlace o por invitación; con 4 la sala pasa a sala de espera; el quinto recibe «sala completa».
6. **Cancelación con invitados presentes:** A cancela la sala (confirmación «Seguir esperando» / «Cancelar sala»); B, C, D ven «El anfitrión ha cancelado la sala».
7. **Regeneración desde otro dispositivo:** A crea enlace en el móvil 1; entra en el móvil 2 → Elige cómo jugar → «Ver invitación» → «Obtener enlace nuevo»; el enlace del móvil 1 deja de funcionar,
   el nuevo sí; los participantes siguen. El móvil 1 detecta (≤ 20 s) que su enlace ya no vale.
8. **Nivel insuficiente:** E intenta invitar, aceptar, crear enlace y canjear: mensaje claro de nivel 7 una sola vez.
9. **Tutorial en Android real:** jugador nuevo en Duelos → 7 viñetas, Atrás/Continuar, despedida «Empezar a jugar»; no aparece sobre una invitación o sala activas; se repite desde «?»;
   comprobar resaltes y tarjetas con el teclado abierto, girado y con zoom de texto del sistema alto.

## Riesgos pendientes

- **`xp_total` declarado por el cliente:** el nivel 7 sigue siendo una barrera de progresión, no de seguridad (documentado).
- **Nivel 7 y XP sin sincronizar (auditado):** quien llegó al nivel 7 en el dispositivo (sin conexión o antes de sincronizar) puede ver Duelos abiertos y recibir `level_required` hasta que la sincronización normal suba su XP a la cuenta. No se ha tocado la validación del servidor: la PWA pide una sincronización del progreso propio y muestra «Tu nivel aún no se ha sincronizado con tu cuenta. Inténtalo de nuevo en unos segundos.» (solo si el dispositivo tiene de verdad el nivel 7; las marcas locales sin nivel no bastan). Si el servidor recorta la XP declarada (tope de 16 por acierto), el bloqueo es legítimo y no se salta.
- **Cancelación sin aviso activo:** los participantes se enteran al sondear su sala (≤ 5 s); no hay push de cancelación.
- **Peticiones por minuto:** entrar en «Elige cómo jugar» / «Invitar jugadores» lanza una tanda de lecturas (amigos, duelos, salas, retos y mi enlace); el Worker limita a 90 por minuto y jugador.
- **Tutorial:** resaltes de la pantalla real (viñetas 1, 6 y 7) dependen de que los elementos sean visibles; si no, se muestra el texto sin señalar nada. Verificado en Chrome móvil emulado, **no en Android real**.
- **Huella de `damasco-marfil.svg` (corregida):** `sw.js` vuelve a `215adc44`, la de los bytes de Git (LF). `scripts/asset-revs.mjs` hashea ahora los `.svg` normalizando CRLF a LF, así que `bump-version.mjs` ya no depende de los saltos de línea de Windows. (`bump-version.mjs --check` sigue avisando en un árbol CRLF porque compara también los saltos de línea del bloque; en un clon LF pasa.)
- El tutorial no se reinicia con «Reiniciar progreso»/cambio de cuenta (su clave es independiente y por dispositivo).
- Las pruebas de la PWA solo salen limpias en un clon con LF; en este árbol (CRLF) hay 15 fallos preexistentes ajenos a este trabajo.
