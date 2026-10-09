// Accesibilidad de modales: todos son diálogos con nombre, y a11y.js gestiona foco, Tab y Escape de forma central.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const a11y = fs.readFileSync(new URL('../src/ui/a11y.js', import.meta.url), 'utf8');
const overlays = [...html.matchAll(/<div id="([^"]+)" class="modal-overlay[^"]*"([^>]*)>([\s\S]*?)(?=<div id="|<!--|\n\n)/g)];

test('hay ocho modales y cada uno es un diálogo (en el propio overlay o en su tarjeta) con nombre', () => {
  const ids = [...html.matchAll(/<div id="([^"]+)" class="modal-overlay/g)].map((m) => m[1]);
  assert.equal(ids.length, 8, ids.join(', '));
  for (const id of ids) {
    const open = html.slice(html.indexOf(`<div id="${id}"`));
    const head = open.slice(0, open.indexOf('>') + 1);
    const card = open.slice(open.indexOf('>') + 1, open.indexOf('>') + 400);
    const tag = /role="dialog"/.test(head) ? head : (card.match(/<div class="modal-card[^>]*role="dialog"[^>]*>/) || [''])[0];
    assert.match(tag, /role="dialog"/, id + ' sin role="dialog"');
    assert.match(tag, /aria-modal="true"/, id + ' sin aria-modal');
    const lab = tag.match(/aria-labelledby="([^"]+)"/);
    assert.ok(lab, id + ' sin aria-labelledby');
    assert.ok(html.includes(`id="${lab[1]}"`), id + ': aria-labelledby apunta a un id que no existe (' + lab[1] + ')');
  }
});

test('Escape solo cierra los modales que no obligan a decidir', () => {
  const withEsc = [...html.matchAll(/<div id="([^"]+)" class="modal-overlay[^>]*data-modal-esc/g)].map((m) => m[1]).sort();
  assert.deepEqual(withEsc, ['app-confirm-modal', 'discard-game-modal', 'duel-help-modal', 'update-modal']);
  for (const id of ['welcome-modal', 'auth-gate', 'seq-migrate-modal']) {
    const head = html.slice(html.indexOf(`<div id="${id}"`)); assert.ok(!/data-modal-esc/.test(head.slice(0, head.indexOf('>'))), id + ' no debe cerrarse con Escape');
  }
});

test('el foco inicial nunca cae en una acción destructiva', () => {
  const autos = [...html.matchAll(/<button[^>]*data-autofocus[^>]*>/g)].map((m) => m[0]);
  assert.ok(autos.length >= 2);
  assert.ok(autos.every((b) => !/btn-danger/.test(b)), 'ningún data-autofocus en un botón peligroso');
  assert.ok(!/data-autofocus/.test(html.slice(html.indexOf('id="discard-game-modal"'), html.indexOf('id="app-confirm-modal"'))));
});

test('a11y.js: foco al abrir, Tab atrapado, Escape opcional y foco devuelto al cerrar', () => {
  for (const frag of ['MutationObserver', "e.key === 'Escape'", "e.key !== 'Tab'", 'data-modal-esc', 'data-autofocus', 'openers', 'prev.focus(']) assert.ok(a11y.includes(frag), 'falta ' + frag);
  assert.match(html, /<script src="src\/ui\/a11y\.js(\?v=\d+)?"><\/script>/);
});
