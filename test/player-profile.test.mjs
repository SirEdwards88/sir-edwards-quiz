// 2.3: ficha de jugador (src/online/player-profile.js) y sus puntos de entrada.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('la ficha está enlazada: script en index.html, sw.js y pantalla «profile» en duels.js', () => {
  assert.match(read('index.html'), /src\/online\/player-profile\.js\?v=\d+/);
  assert.match(read('sw.js'), /'\.\/src\/online\/player-profile\.js'/);
  const d = read('src/online/duels.js');
  assert.match(d, /S\.screen === 'profile'\) h = window\.SEQProfile \? SEQProfile\.render\(\)/);
  assert.match(d, /screen === 'profile'\) \{ if \(window\.SEQProfile\) SEQProfile\.load\(\)/);
  assert.equal((d.match(/SEQProfile\.open\(/g) || []).length, 4, 'búsqueda, recibidas, enviadas y amigos');
});

test('rankings: pulsar un jugador abre su ficha solo con un ID válido', () => {
  const v = read('src/online/duels-v21.js');
  assert.match(v, /function tapOf\(r\)[^\n]*\[0-9A-Z\]\{10\}/);
  assert.equal((v.match(/tapOf\(r\)/g) || []).length, 3, 'definición, podio y fila');
});

test('player-profile.js: sin innerHTML ni APIs de inyección; datos del servidor escapados; estados de amistad completos', () => {
  const code = read('src/online/player-profile.js').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  assert.doesNotMatch(code, /innerHTML|eval\s*\(|document\.write|insertAdjacentHTML|localStorage/);
  for (const m of ["'ninguna'", "'enviada'", "'recibida'", "'amigos'"]) assert.ok(code.includes(m), m);
  assert.doesNotMatch(code, /\+\s*\w+\.display_name\s*\+/);
  assert.match(code, /h\.player\(d\)/);
  assert.match(code, /\/\^\(accept\|reject\|cancel\)\$\/\.test\(action\)/);
  // Un dato ausente es «—», no 0.
  assert.match(code, /v === null \|\| v === undefined \? '—'/);
});
