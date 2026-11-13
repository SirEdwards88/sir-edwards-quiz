# Android / Google Play — comprobaciones previas (sin cambiar la PWA)

## Hipótesis inicial
Probar primero **Trusted Web Activity (TWA) con Bubblewrap**. No convertir a Capacitor ni reescribir el frontend sin identificar un bloqueo concreto. La TWA carga la PWA desde su origen web y necesita verificar la relación con la app Android mediante Digital Asset Links.

## Antes de compilar
- [ ] Confirmar **URL HTTPS definitiva** y el origen real desde el que se sirve la PWA (no asumir que la URL del repositorio es la del juego).
- [ ] Comprobar en un Android real: manifest, instalación PWA, service worker, modo sin conexión y persistencia de datos.
- [ ] Verificar Google Identity Services dentro de TWA con cuenta de prueba, inicio de sesión, cierre y retorno a la app. No asumir compatibilidad sin probarla.
- [ ] Probar enlaces de invitación y retos al abrir desde WhatsApp y desde la app cerrada.
- [ ] Comprobar notificaciones push tras instalar, aceptar permisos, recibir avisos, abrir el destino correcto y desactivar los avisos.
- [ ] Probar botón Atrás, cambio de aplicación, rotación (manifest fija orientación vertical), reanudación de partida y desconexión/reconexión.
- [ ] Revisar iconos adaptativos, pantalla de inicio, capturas y textos de ficha de Play.

## TWA / firmas
- [ ] Generar proyecto de prueba con Bubblewrap; mantener el proyecto Android y el keystore fuera del repositorio público si contienen secretos.
- [ ] Elegir package ID estable; conservar el keystore de subida y sus contraseñas fuera de Git.
- [ ] Publicar `.well-known/assetlinks.json` en el **origen web**, con package ID y huella SHA-256 de la firma correcta. En Google Play App Signing, la firma de distribución puede ser distinta de la de subida.
- [ ] Verificar Digital Asset Links en un móvil. Si falla, la TWA puede abrirse como Custom Tab con barra de navegación.
- [ ] En GitHub Pages, comprobar que se publica la carpeta `.well-known`; puede requerir configuración explícita de Jekyll o `.nojekyll`.
- [ ] Crear un AAB para Play y un APK de prueba local; validar las firmas respectivas.

## Criterios para no publicar todavía
- Google Login no funciona de forma fiable; los enlaces de reto se pierden; hay pérdida de progreso; las notificaciones prometidas no funcionan; TWA no verifica el dominio; la navegación Atrás rompe partidas; la ficha de privacidad no coincide con la app.

## Cuándo considerar Capacitor
Solo si las pruebas muestran una necesidad nativa concreta que TWA no resuelva con una complejidad razonable. Una migración cambia almacenamiento, autenticación, enlaces y notificaciones y requiere otra ronda de pruebas.

## Referencias oficiales
- https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2
- https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs

Este documento es una lista de validación, **no** evidencia de que Android ya funcione. No incluye certificados ni claves reales.
