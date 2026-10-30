// 2.5: «Jugar de nuevo» al final de las partidas en solitario.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const R = (p) => new URL('../' + p, import.meta.url);
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(R('src/ui/replay.js'), 'utf8'), ctx);
const P = ctx.SEQReplay.plan;

test('plan: cada modo en solitario relanza el mismo modo', () => {
  assert.equal(P({ mode: 'play' }, 0), 'play');
  assert.equal(P({ mode: 'survival' }, 0), 'survival');
  assert.equal(P({ mode: 'sudden_death' }, 0), 'sudden_death');
  assert.equal(P({ mode: 'timetrial' }, 0), 'timetrial');
  assert.equal(P({ mode: 'mental_calc' }, 0), 'mental_turbo');
  assert.equal(P({ mode: 'mental_calc', variant: 'classic' }, 0), 'mental_classic');
});

test('plan: Repaso solo repite si quedan fallos pendientes', () => {
  assert.equal(P({ mode: 'review' }, 3), 'review');
  assert.equal(P({ mode: 'review' }, 0), null);
});

test('plan: Lucidez Mental también repite; Duelos y Retos no (tienen su Revancha)', () => {
  assert.equal(P({ mode: 'lucidez_mental' }, 5), 'lucidez');
  assert.equal(P({ mode: 'play', isDuel: true }, 5), null);
  assert.equal(P(null, 5), null);
});

test('el botón está en la tarjeta de resultados, es el principal y no se escribe a mano en otro sitio', () => {
  const html = fs.readFileSync(R('index.html'), 'utf8');
  const sw = fs.readFileSync(R('sw.js'), 'utf8');
  assert.match(html, /id="res-replay-btn"[^>]*hidden[^>]*onclick="SEQReplay\.start\(\)"/);
  assert.match(html, /src\/ui\/replay\.js\?v=\d+/);
  assert.match(sw, /'\.\/src\/ui\/replay\.js'/);
  assert.equal(ctx.SEQReplay.LABEL, 'Jugar de nuevo');
  assert.ok(!/Otra ronda/.test(html + fs.readFileSync(R('src/ui/replay.js'), 'utf8')));
});
