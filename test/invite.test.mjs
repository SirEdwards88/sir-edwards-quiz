import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load(nav) {
  const el = { style: {}, textContent: '' };
  const ctx = { window: {}, navigator: nav, document: { getElementById: () => el }, setTimeout, clearTimeout };
  vm.runInNewContext(fs.readFileSync('src/share/invite.js', 'utf8'), ctx);
  return { inv: ctx.window.SEQInvite, el };
}

test('invitar: usa el menú de compartir con texto y enlace', async () => {
  let got;
  const { inv } = load({ share: async (d) => { got = d; } });
  await inv.share();
  assert.equal(got.url, inv.URL);
  assert.match(got.text, /a la altura/);
  assert.doesNotMatch(got.text, /cultura general/);
});

test('invitar: sin menú de compartir copia el mensaje', async () => {
  let copied;
  const { inv, el } = load({ clipboard: { writeText: async (t) => { copied = t; } } });
  await inv.share();
  assert.equal(copied, inv.message());
  assert.match(copied, /https:\/\//);
  assert.match(el.textContent, /copiado/i);
});

test('invitar: cerrar el menú de compartir no copia nada', async () => {
  let copied = false;
  const { inv } = load({ share: async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; }, clipboard: { writeText: async () => { copied = true; } } });
  await inv.share();
  assert.equal(copied, false);
});

test('invitar: el enlace lleva a la página de instalación', () => {
  const { inv } = load({});
  assert.match(inv.URL, /\/instalar\.html$/);
});
