// Duelo/Retos: tras un fallo de red o un estado que ya cambió se consulta el estado real; los plazos de la lista usan el reloj del servidor.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/online/duels.js', import.meta.url), 'utf8');
const act = src.slice(src.indexOf('function act('), src.indexOf('function duelAction('));

test('act(): ante red cortada, estado cambiado o plazo vencido recarga el estado y mantiene el aviso', () => {
  assert.match(act, /e\.network\)\s*\|\|\s*c === 'invalid_state'\s*\|\|\s*c === 'reto_expired'/);
  assert.match(act, /S\.id \? load\(\) : refreshSummary\(\)/);
  assert.match(act, /say\(msg, true\)/);
  assert.ok(act.indexOf('S.busy = false') < act.indexOf('load()'), 'el bloqueo se libera antes de consultar');
});

test('la lista de retos calcula «caduca en» con el reloj del servidor, no con el del dispositivo', () => {
  assert.match(src, /caduca en ' \+ left\(num\(x\.expira_at\) - serverNow\(\)\)/);
  assert.ok(!/caduca en ' \+ left\(num\(x\.expira_at\) - Date\.now\(\)\)/.test(src));
});
