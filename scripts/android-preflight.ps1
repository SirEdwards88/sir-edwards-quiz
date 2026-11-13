# Comprobación no destructiva para preparar Sir Edwards Quiz como TWA.
# Uso: powershell -ExecutionPolicy Bypass -File .\scripts\android-preflight.ps1
# No instala software, no genera claves y no modifica el juego.
$ErrorActionPreference = "Continue"
$manifestUrl = "https://siredwards88.github.io/sir-edwards-quiz/manifest.json"
$rootUrl = "https://siredwards88.github.io/"
$assetLinksUrl = "https://siredwards88.github.io/.well-known/assetlinks.json"
$ok = $true

Write-Host "=== Sir Edwards Quiz: preflight Android ==="
foreach ($cmd in @("node", "npm", "java")) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($null -eq $found) {
    Write-Warning "$cmd no encontrado en PATH."
    $ok = $false
  } else {
    Write-Host "$cmd disponible: $($found.Source)"
  }
}

try {
  $manifest = Invoke-RestMethod -Uri $manifestUrl -TimeoutSec 15
  if ($manifest.name -ne "Sir Edwards Quiz") {
    Write-Warning "Nombre inesperado en manifest: $($manifest.name)"
    $ok = $false
  } else {
    Write-Host "Manifest HTTPS correcto: $manifestUrl"
  }
  Write-Host "Inicio: $($manifest.start_url) | Scope: $($manifest.scope) | Display: $($manifest.display)"
} catch {
  Write-Warning "No se pudo leer el manifest: $($_.Exception.Message)"
  $ok = $false
}

try {
  $res = Invoke-WebRequest -Uri $rootUrl -TimeoutSec 15 -UseBasicParsing
  Write-Host "Dominio raiz: HTTP $($res.StatusCode)"
} catch {
  Write-Warning "No se pudo acceder al dominio raiz: $($_.Exception.Message)"
  $ok = $false
}

try {
  $asset = Invoke-RestMethod -Uri $assetLinksUrl -TimeoutSec 15
  Write-Host "Asset Links publicado: $assetLinksUrl"
  Write-Warning "Comprueba manualmente que el paquete y la huella SHA-256 coinciden con la firma REAL."
} catch {
  Write-Host "Asset Links aun no disponible (esperado antes de generar la firma Android)."
}

if ($ok) {
  Write-Host "Preflight basico completado. Siguiente paso: Bubblewrap init/build y pruebas en movil."
} else {
  Write-Warning "Hay requisitos pendientes. Corrigelos antes de compilar."
}
