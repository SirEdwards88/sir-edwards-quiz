import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ctx = vm.createContext({ document: {} });
vm.runInContext(read('src/ui/update-notes.js') + ';this.N=SEQUpdateNotes;', ctx);
const N = ctx.N;

test('titular y apoyo salen solos del texto del historial', () => {
  assert.deepEqual({ ...N.split('Sir Edwards interrumpe a su antojo: 20 preguntas exclusivas y dos logros.') }, { head: 'Sir Edwards interrumpe a su antojo', rest: '20 preguntas exclusivas y dos logros.' });
  assert.deepEqual({ ...N.split('Varios arreglos pequeños, accesibilidad incluida. Un caballero no presume de sus remiendos.') }, { head: 'Varios arreglos pequeños, accesibilidad incluida.', rest: 'Un caballero no presume de sus remiendos.' });
  assert.deepEqual({ ...N.split('Repetir partida con un toque al terminar.') }, { head: 'Repetir partida con un toque al terminar.', rest: '' });
  assert.deepEqual({ ...N.split('  ') }, { head: '', rest: '' });
});

test('el módulo está en index.html (tras intro.js), en sw.js y lo llama intro.js', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('src/ui/update-notes.js') > html.indexOf('src/ui/intro.js?v='));
  assert.ok(read('sw.js').includes("'./src/ui/update-notes.js'"));
  assert.ok(read('src/ui/intro.js').includes('SEQUpdateNotes.decorate()'));
});
