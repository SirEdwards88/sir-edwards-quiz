// 2.2 — Pregunta del nombre: validación, nombre genérico y encaje en el flujo de entrada.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('src/ui/name-prompt.js').replace(/^const /m, 'var ') + ';\n' + read('src/data/encargos-intro-phrases.js').replace(/^const /m, 'var ') + '\n' + read('src/utils/encargos-intro-core.js').replace(/^const /m, 'var '), ctx);
const NP = ctx.SEQNamePrompt, CORE = ctx.SEQEncargosIntroCore;

test('el nombre genérico del servidor se reconoce (con y sin sufijo) y los demás no', () => {
  for (const n of ['Jugador', 'jugador', 'Jugador-a1b2', 'jugador-9z8y', '', '  ', null]) assert.equal(NP.isDefaultName(n), true, String(n));
  for (const n of ['Edwards', 'Jugadora', 'Jugador Uno', 'Ana']) assert.equal(NP.isDefaultName(n), false, n);
});

test('validate: acepta nombres normales y limpia espacios', () => {
  assert.deepEqual({ ...NP.validate('  Ana   María ') }, { ok: true, name: 'Ana María' });
  assert.equal(NP.validate('Sir Edwards').ok, true);
  assert.equal(NP.validate('Zoë').ok, true);
});

test('validate: rechaza vacío, inicial suelta, demasiado largo, sin letras, direcciones/símbolos y el nombre por defecto', () => {
  for (const n of ['', '   ', 'A', 'x'.repeat(17), '1234', '@ana', 'ana@correo.com', 'www.ejemplo.es', '<b>Ana</b>', 'a/b', 'Jugador', 'Jugador-ab12']) {
    const r = NP.validate(n); assert.equal(r.ok, false, n); assert.ok(r.msg && r.msg.length > 5, n);
  }
});

test('Sir Edwards no se dirige al jugador por el nombre genérico «Jugador-xxxx»', () => {
  assert.equal(CORE.cleanName('Jugador-ab12'), null);
  assert.equal(CORE.cleanName('Jugador'), null);
  assert.equal(CORE.cleanName('Marta'), 'Marta');
});

test('encaje: modal accesible, módulo enlazado y en el modo sin conexión, y la pregunta va tras la cuenta', () => {
  const html = read('index.html');
  assert.match(html, /<div id="name-modal" class="modal-overlay"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="name-title"/);
  assert.match(html, /<script src="src\/ui\/name-prompt\.js\?v=\d+"><\/script>/);
  assert.ok(!/id="name-modal"[^>]*data-modal-esc/.test(html), 'no debe cerrarse con Escape');
  assert.match(read('sw.js'), /'\.\/src\/ui\/name-prompt\.js'/);
  const intro = read('src/ui/intro.js');
  assert.match(intro, /function askName/); assert.match(intro, /SEQNamePrompt\.maybeAsk/);
  assert.match(read('src/online/online.js'), /setDisplayName: function/);
  assert.ok(!/lucidez/i.test(html.slice(html.indexOf('id="name-modal"'), html.indexOf('Modal de "novedades'))), 'sin nombrar el modo secreto');
});
