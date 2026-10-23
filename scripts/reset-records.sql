-- Reseteo puntual de records de UNA cuenta (BKE02TTKCS): Turbo, Fondo (aciertos y puntos) y Contrarreloj.
-- No toca logros ni ningún otro campo. Sube `rev` para que cualquier dispositivo con una revisión antigua reintente.
-- Ejecutar en el backend, ANTES de abrir la app actualizada:
--   npx wrangler d1 execute sir-edwards-quiz --remote --file=<ruta-a-este-archivo>
UPDATE player_data
SET doc = json_set(doc,
      '$.f.bestMentalCalcScore', 0,
      '$.f.bestMentalClassicCorrect', 0,
      '$.f.bestMentalClassicScore', 0,
      '$.f.maxTimeTrialScore', 0),
    rev = rev + 1,
    updated_at = CAST(strftime('%s','now') AS INTEGER) * 1000
WHERE player_id = 'BKE02TTKCS';
