import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('un toque temprano en el aviso no cuelga la partida (Lucidez, Supervivencia, Fondo)', () => {
  const h = read('index.html');
  assert.match(h, /function tapTooSoon\(ev\)/);
  assert.equal((h.match(/tapTooSoon\(ev\)/g) || []).length >= 5, true);
});

test('Fondo: la vida extra deja 1300 ms antes de avanzar', () => {
  const h = read('index.html');
  assert.match(h, /if \(gained\) avanceMs = 1300;/);
  assert.match(h, /\}, avanceMs\);/);
});

test('Supervivencia y Muerte súbita esperan a los avisos; el módulo está en sw.js', () => {
  const h = read('index.html');
  assert.equal((h.match(/SEQAdvance\.whenClear/g) || []).length, 2);
  assert.match(h, /src\/ui\/advance\.js\?v=/);
  assert.match(read('sw.js'), /\.\/src\/ui\/advance\.js/);
});

test('enigma final: la solución se lee antes del overlay', () => {
  const h = read('index.html');
  assert.equal((h.match(/lucidezFinalReveal\(/g) || []).length, 4); // definición + 3 usos
});

test('resultados retiran los avisos de racha y de vida', () => {
  assert.match(read('src/ui/game-fx.js'), /querySelectorAll\('\.fx-streak-banner, \.fx-lastlife-banner'\)/);
});

test('tanda 2: los avisos no dependen de «reducir movimiento» y los de Fragmentos/Encargos no se pisan', () => {
  assert.doesNotMatch(read('src/ui/game-fx.js'), /!host \|\| reduce/);
  assert.doesNotMatch(read('src/ui/last-life.js'), /reduced\(\)/);
  assert.doesNotMatch(read('src/online/reto-fx.js'), /reduced\(\)/);
  const rt = read('src/ui/reward-toast.js');
  assert.match(rt, /tierWaiting/);
  assert.match(rt, /encargos-toast\.show/);
  assert.match(read('index.html'), /'copa'\), 4900\)/);
});
