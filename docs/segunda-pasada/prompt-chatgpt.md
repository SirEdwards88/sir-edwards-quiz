# Prompt para la segunda pasada con ChatGPT

Adjunta a ChatGPT dos archivos: `questions.propuesta.js` (banco con las propuestas ya aplicadas en el campo `sabias`) y `sabias-revision.md` (tabla con el texto actual, la clase A/B/C, el motivo y la propuesta). Pega este texto:

---

Eres editor y verificador de datos de un juego de trivia en español (SirEdwards Quiz). Te adjunto `questions.propuesta.js`: cada pregunta tiene `n`, `q` (pregunta), `a` (respuesta) y `sabias`, el texto de «¿Sabías que…?» que se muestra tras responder. Te adjunto también `sabias-revision.md`, con el texto antiguo, el motivo del cambio y la propuesta nueva. Un primer revisor ha reescrito unos 250 textos; haz una SEGUNDA PASADA crítica de esos 250 (los que aparecen en la tabla de `sabias-revision.md`). No hace falta tocar el resto.

Qué debe cumplir un buen «Sabías que»:
1. Añade un dato NUEVO: no está en la pregunta ni en la respuesta ni se deduce de ellas.
2. Es concreto: cifra, fecha, nombre propio, causa, consecuencia, origen del nombre, comparación cotidiana o mito desmentido.
3. Sorprende o ayuda a recordar la respuesta.
4. Es VERDADERO y estable en el tiempo (nada de récords, cargos o cifras que cambian; si hace falta, con año).
5. No revela la respuesta de OTRA pregunta del banco.
6. Máximo 140 caracteres, 1-2 frases, empieza por el dato, tono sobrio (ingenio solo si sale natural), sin emojis, comillas «», texto plano. Varía los arranques.

Tu tarea, para cada uno de los textos propuestos:
- VERIFICA que cada afirmación es cierta. Si dudas de una cifra, fecha, cita o atribución, dilo y propón una alternativa segura. No inventes. Presta atención a los marcados «verificar».
- Detecta si repite la pregunta o la respuesta, si se deduce de ellas o si es relleno.
- Detecta si contiene la respuesta de otra pregunta del banco (destripe), sobre todo con preguntas emparejadas.
- Detecta textos casi iguales entre sí y arranques repetidos («El…», «En…», «Fue…»).
- Mejora el gancho si es flojo, sin pasar de 140 caracteres.

Salida: una tabla en Markdown con estas columnas, SOLO para los textos que cambies o que dudes (no repitas los correctos):
`n | veredicto (OK / CAMBIAR / DUDOSO) | problema | texto final (≤140 caracteres) | fuente o razonamiento`

Después, entrega un archivo `sabias-final.json` con la forma {"n": "texto final"} que incluya TODOS los ids revisados (los que no cambies, con el texto propuesto tal cual). No modifiques ningún otro campo del banco.
