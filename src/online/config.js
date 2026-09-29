// Configuración PÚBLICA de la capa online (v1.4). No contiene secretos: el
// Client ID de Google es público por diseño y la URL del Worker también.
//
// Mientras API_BASE_URL o GOOGLE_CLIENT_ID estén vacíos, la capa online queda
// COMPLETAMENTE desactivada: la app se comporta exactamente como la v1.3
// (sin sección de cuenta, sin ranking, sin ninguna petición de red extra).
//
// Rellenar antes de desplegar (ver DEPLOY.md):
//   API_BASE_URL     -> URL del Worker, sin barra final. Ej. https://sir-edwards-quiz-api.TU_SUBDOMINIO.workers.dev
//   GOOGLE_CLIENT_ID -> "ID de cliente" de OAuth (tipo Aplicación web) de Google Cloud.
window.SEQ_ONLINE_CONFIG = {
  API_BASE_URL: '',
  GOOGLE_CLIENT_ID: ''
};
