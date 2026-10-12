// Si cambias una copia literal del Worker (corrector, selección de Lucidez, cálculo mental, combinación de datos, SUDDEN_SHAPE)
// y no se ha sincronizado con el backend, este test falla: ejecuta `node scripts/worker-sync.mjs <backend>` y despliega el Worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { status, LITERAL } from '../scripts/worker-sync.mjs';

test('el código que el Worker copia de la PWA coincide con lo anotado en scripts/worker-copies.json', () => {
  const s = status();
  assert.deepEqual(s.logic, [], 'Cambió código copiado al Worker: node scripts/worker-sync.mjs <ruta del backend> (y desplegar el Worker). Archivos: ' + s.logic.join(', '));
});

test('la lista de copias literales cubre matching, answer-alias, lucidez-select, mental-calc y sync-merge', () => {
  for (const f of ['matching', 'answer-alias', 'lucidez-select', 'mental-calc', 'sync-merge']) assert.ok(LITERAL['src/utils/' + f + '.js'], f);
});
