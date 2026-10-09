// Botón/gesto «atrás» del móvil: la decisión pura (decide) y el cableado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../src/ui/back-nav.js', import.meta.url), 'utf8');
const ctx = {}; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const decide = ctx.SEQBackNav.decide;
const base = { blocking: false, esc: false, inGame: false, onHome: false, view: 'stats', hasDuelBack: true };

test('atrás: en partida no hace nada; en el resto de menús vuelve', () => {
  assert.equal(decide({ ...base, inGame: true, view: 'game' }), 'none', 'partida (y su tarjeta de resultados)');
  assert.equal(decide({ ...base }), 'home');
  assert.equal(decide({ ...base, view: 'modes' }), 'home');
  assert.equal(decide({ ...base, view: 'settings' }), 'home');
  assert.equal(decide({ ...base, onHome: true, view: 'home' }), 'none', 'en Inicio se sale de la app como siempre');
});

test('atrás: cierra la ventana abierta antes de cambiar de pantalla; las que obligan a decidir no se tocan', () => {
  assert.equal(decide({ ...base, esc: true }), 'escape');
  assert.equal(decide({ ...base, esc: true, inGame: true, view: 'game' }), 'escape', 'también cierra una ventana dentro de la partida');
  assert.equal(decide({ ...base, blocking: true }), 'none');
  assert.equal(decide({ ...base, blocking: true, esc: true }), 'none');
});

test('atrás en Duelo sube un nivel con la propia flecha de Duelo', () => {
  assert.equal(decide({ ...base, view: 'duelo' }), 'duel');
  assert.equal(decide({ ...base, view: 'duelo', hasDuelBack: false }), 'home');
});

test('cableado: index.html y sw.js cargan back-nav.js, que envuelve switchTab y escucha popstate', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(html, /<script src="src\/ui\/back-nav\.js(\?v=\d+)?"><\/script>/);
  assert.ok(sw.includes("'./src/ui/back-nav.js'"));
  assert.ok(src.includes('popstate') && src.includes('root.switchTab = function'));
});
