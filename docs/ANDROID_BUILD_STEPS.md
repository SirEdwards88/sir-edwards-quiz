# Sir Edwards Quiz — primera compilación Android (TWA)

Estado: preparación. **No es una APK compilada ni una verificación Digital Asset Links completada.**

## Decisión mínima
- Mantener el juego en `https://siredwards88.github.io/sir-edwards-quiz/` y el backend Cloudflare actual.
- Crear, desde la cuenta propietaria, un repositorio **público** `SirEdwards88/siredwards88.github.io` para servir exclusivamente la raíz del origen. No mover el juego ni cambiar su URL.
- En ese repositorio, activar GitHub Pages desde `main` / raíz y añadir `.nojekyll` (archivo vacío). No introducir credenciales.
- El archivo de asociación se publicará en `https://siredwards88.github.io/.well-known/assetlinks.json` **después** de conocer la firma Android real. No confundir con `https://siredwards88.github.io/sir-edwards-quiz/.well-known/assetlinks.json`.

## En el ordenador de desarrollo (Windows)
1. Comprobar Node.js y Java/Android SDK; instalar las dependencias que Bubblewrap indique. Mantener SDK, contraseñas y keystore fuera del repositorio Git.
2. Ejecutar `npm install -g @bubblewrap/cli`.
3. En una carpeta Android **separada del frontend**, ejecutar:

   ```powershell
   bubblewrap init --manifest=https://siredwards88.github.io/sir-edwards-quiz/manifest.json
   ```

4. Revisar el `twa-manifest.json` generado: `host` = `siredwards88.github.io`, ruta de inicio = `/sir-edwards-quiz/`, nombre `Sir Edwards Quiz`, orientación vertical y URLs de iconos. **Elegir y confirmar manualmente un application ID permanente antes de distribuir.** No dar por definitivo un identificador de ejemplo.
5. Generar y guardar el keystore en un lugar seguro, con copia de seguridad privada. No subirlo ni subir contraseñas a GitHub.
6. Ejecutar `bubblewrap build`. Comprobar qué APK/AAB genera la versión instalada de Bubblewrap. No afirmar que compila hasta verificar archivos y salida de la herramienta.
7. Obtener huella SHA-256 del certificado que **firma realmente el APK de prueba** (por ejemplo, con `keytool -list -v -keystore <ruta-del-keystore>` o `apksigner verify --print-certs <apk>`).
8. Crear en el repositorio raíz `.well-known/assetlinks.json` con el paquete real y la huella real:

   ```json
   [{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"REEMPLAZAR_POR_ID_REAL","sha256_cert_fingerprints":["REEMPLAZAR_POR_HUELLA_SHA256_REAL"]}}]
   ```

9. Verificar por HTTPS que `https://siredwards88.github.io/.well-known/assetlinks.json` responde con JSON válido, sin redirecciones inesperadas ni 404. Comprobar TWA en móvil: si aparece barra de navegador, investigar firma, package ID, origen y caché.
10. Probar login Google, cierre de sesión, duelos, invitaciones, notificaciones, Atrás, offline, actualización de caché y conservación del progreso. **No publicar todavía** si fallan.

## Cuando se cree Google Play Console
- Inscribir la app en Play App Signing y obtener la huella SHA-256 del **certificado de firma de aplicación de Play**. Puede diferir de la firma local o de subida: añadirla a `assetlinks.json` y comprobar la versión instalada desde Play.
- Subir el AAB firmado correspondiente; completar la ficha, políticas, acceso de revisión y pruebas exigidas por la consola.

## Qué puede automatizarse y qué requiere al propietario
- Automatizable: generación del proyecto Bubblewrap, comprobaciones del manifiesto, tests y compilación **si el ordenador tiene herramientas y permisos**.
- Requiere intervención del propietario: confirmar application ID, crear el repositorio raíz si falta, custodiar firma y contraseñas, activar Pages, verificar Android real y gestionar Play Console.
- Nunca crear ni subir una clave privada en un repositorio público. Nunca declarar verificado un enlace sin comprobarlo.

Referencias: https://developer.chrome.com/docs/android/trusted-web-activity/quick-start ; https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs
