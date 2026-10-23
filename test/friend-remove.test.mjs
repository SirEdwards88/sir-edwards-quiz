// Eliminar amigo (ficha de jugador): dos toques y llamada al Worker; solo para quien ya es amigo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/online/player-profile.js', import.meta.url), 'utf8');

test('la ficha ofrece «Eliminar amigo» solo en el estado «amigos» y pide confirmar', () => {
  assert.match(src, /estado === 'amigos'[\s\S]{0,900}SEQProfile\.remove\(\)/);
  assert.match(src, /¿Seguro\? Pulsa otra vez/);
  assert.match(src, /'\/friends\/' \+ fid \+ '\/remove'/);
  assert.match(src, /remove: remove/);
});
test('el primer toque no llama al servidor (solo arma la confirmación)', () => {
  const body = /function remove\(\) \{([\s\S]*?)\n  \}/.exec(src)[1];
  const first = body.slice(0, body.indexOf("act('POST'"));
  assert.ok(/if \(!P\.rm\) \{[\s\S]*return;\s*\}/.test(first));
  assert.ok(!/act\(/.test(first));
});

test('la ficha no ofrece retar a duelo ni a reto: eso se hace desde Amigos (con la comprobación de «en línea»)', () => {
  assert.ok(!/SEQDuels\.quick/.test(src));
});

test('récords en la ficha: «Lucidez Mental» con el modo desbloqueado; si no, «Modo secreto» con «???» (como los logros secretos), sin puntuación', () => {
  assert.match(src, /r\.lucidez \? \(lucOk \? extra\('Lucidez Mental', dash\(r\.lucidez, '\/30'\)/);
  assert.match(src, /extra\('Modo secreto', '\?\?\?', modeImg\('secreto'\), ''\)/);
  assert.ok(!/extra\('Modo secreto', dash/.test(src), 'no se filtra la puntuación');
});
