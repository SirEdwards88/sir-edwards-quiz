# Worker: Retos con Cálculo de Fondo (pendiente de desplegar)

La PWA (2.3) ya conoce el modo de Reto `calculo_fondo`. Mientras el Worker no lo envíe en la lista de modos
(`/retos/modos`), no aparece en ninguna parte: desplegar la PWA primero es seguro.

## Qué debe hacer el Worker (`src/reto-modes.js`)
Clonar `calculo_mental` con estas diferencias (reglas puras en `src/utils/mental-classic.js` de la PWA):

| Regla | Valor |
|---|---|
| id del modo | `calculo_fondo` |
| Desbloqueo (para ambos jugadores) | logro `tt_15` («Velocidad Mental»), igual que `calculo_mental` |
| Vidas al empezar | 1 (`estado.vidas = 1`, `estado.vidas_max = 4`) |
| Tiempo por operación | 20 000 ms (`yo.actual.limite_at` = inicio de la operación + 20 s, `total_ms = 20000`) |
| Vida extra | al llegar la racha en curso a 8, 16 y 24 (nunca por encima de 4 vidas) |
| Fallo o fuera de tiempo | resta 1 vida y corta la racha; con 0 vidas la parte termina (`terminado`) |
| Operaciones | las mismas que Turbo (`tipo: 'calculo'`, `texto`, `respuesta`), dificultad según racha; semilla compartida por los dos jugadores |
| Puntuación / ganador | más aciertos; empate a igualdad de aciertos y puntos (como `isBetter`) |
| XP | ninguna (igual que `calculo_mental`; la PWA muestra 0 XP) |
| Ránkings | ninguno |

La PWA pinta solo: icono, nombre «Cálculo de Fondo», aciertos, corazones (`vidas`/`vidas_max`), barra y segundos
(`limite_at`/`total_ms`). Todo lo demás lo manda el servidor.

Tras desplegar: añadir al historial 2.3 una línea del tipo «El Fondo también se juega en Retos.» y subir versión.

## Ranking de Cálculo de Fondo (pendiente de desplegar)
La PWA ya pide `GET /rankings?scope=friends|global&board=fondo` y pinta una cuarta pestaña «Cálculo de Fondo». Hasta que el
Worker lo conozca verá «Este ranking todavía no está disponible» (el 404 ya se trata).

1. **Sincronización:** la PWA envía dos campos nuevos tipo `max`: `bestMentalClassicCorrect` (aciertos de su mejor partida)
   y `bestMentalClassicScore` (sus puntos). Ya están en `src/utils/sync-merge.js` de la PWA (`MAX_FIELDS`): copiar ese
   archivo tal cual a `src/sync-merge.js` del backend (más su `export default`) y guardar los dos campos en D1 como los demás.
2. **Ranking `board=fondo`:** orden por `bestMentalClassicCorrect` desc y, a igualdad, `bestMentalClassicScore` desc; solo
   jugadores con aciertos > 0. Mismo formato que `mental`, pero en cada fila y en `me` el campo **`score` = aciertos**
   (la PWA lo pinta como «N aciertos»). `rank`, `display_name`, `avatar`, `is_me` como en `mental`.
