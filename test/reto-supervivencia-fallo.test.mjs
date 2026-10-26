import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/online/duels.js', import.meta.url), 'utf8');

test('Retos de Supervivencia: tras un fallo la respuesta correcta se ve 2 s y un toque salta la espera', () => {
  assert.match(src, /var slowFail = S\.screen === 'reto' && d\.modo === 'supervivencia' && !r\.es_correcta && S\.shown === sh;/);
  assert.match(src, /setTimeout\(load, slowFail \? 2000 : \(S\.screen === 'reto' \? 700 : 300\)\)/);
  assert.match(src, /vEl\.onclick = function \(\) \{ vEl\.onclick = null; clearTimeout\(waitT\); load\(\); \}/);
});
