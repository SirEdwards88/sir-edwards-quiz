// 2.3: aviso de subida de nivel por partida (Duelo y Reto) y Cálculo de Fondo conocido por los Retos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function load(xp) {
  const ctx = { store: { xp }, getLevelData: (x) => 1 + Math.floor(x / 100) };
  vm.createContext(ctx);
  vm.runInContext(read('src/ui/level-up.js'), ctx);
  return ctx;
}

test('el aviso por partida solo sale si el nivel ha subido desde que se entró, y la segunda vez sale quieto', () => {
  const c = load(0);
  assert.equal(vm.runInContext("SEQLevelUp.htmlFor('reto:a')", c), '', 'sin marca no hay aviso');
  vm.runInContext("SEQLevelUp.markKey('reto:a')", c);
  assert.equal(vm.runInContext("SEQLevelUp.htmlFor('reto:a')", c), '', 'sin subida no hay aviso');
  c.store.xp = 250;
  const first = vm.runInContext("SEQLevelUp.htmlFor('reto:a')", c);
  assert.match(first, /NIVEL 3/);
  assert.ok(!first.includes('lu-still'));
  assert.ok(vm.runInContext("SEQLevelUp.htmlFor('reto:a')", c).includes('lu-still'), 'al repintar, sin animación');
  assert.equal(vm.runInContext("SEQLevelUp.htmlFor('duel:b')", c), '', 'otra partida no hereda el aviso');
});

test('marcar de nuevo la misma partida no mueve el nivel de partida', () => {
  const c = load(0);
  vm.runInContext("SEQLevelUp.markKey('duel:x')", c);
  c.store.xp = 150;
  vm.runInContext("SEQLevelUp.markKey('duel:x')", c);
  assert.match(vm.runInContext("SEQLevelUp.htmlFor('duel:x')", c), /NIVEL 2/);
});

test('Duelo y Reto marcan y pintan el aviso; los Retos conocen Cálculo de Fondo', () => {
  const d = read('src/online/duels.js');
  assert.ok(d.includes("markLevel(kind, S.id)") && d.includes('SEQLevelUp.htmlFor('));
  assert.match(d, /calculo_fondo: \{ nombre: 'Cálculo de Fondo'/);
  assert.ok(d.includes("d.modo === 'calculo_fondo'"), 'cabecera con reloj y sin XP');
  assert.ok(read('src/ui/mental-classic-ui.js').includes('SEQLevelUp.show()'), 'Fondo también avisa de la subida');
});
