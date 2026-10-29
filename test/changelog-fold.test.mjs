// 2.5: el historial de versiones de Ajustes muestra las 3 últimas y pliega el resto.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const R = (p) => new URL('../' + p, import.meta.url);
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(R('src/ui/changelog-fold.js'), 'utf8'), ctx);
const F = ctx.SEQChangelogFold;

test('foldCount: N se calcula a partir del total', () => {
  assert.equal(F.foldCount(44), 41);
  assert.equal(F.foldCount(4), 1);
  assert.equal(F.foldCount(3), 0);
  assert.equal(F.foldCount(0), 0);
});

test('index.html enlaza el módulo, sw.js lo cachea y el botón no lleva el número escrito a mano', () => {
  const html = fs.readFileSync(R('index.html'), 'utf8');
  const sw = fs.readFileSync(R('sw.js'), 'utf8');
  assert.match(html, /src\/ui\/changelog-fold\.js\?v=\d+/);
  assert.match(sw, /'\.\/src\/ui\/changelog-fold\.js'/);
  assert.ok(!/Versiones anteriores \(\d+\)/.test(html));
  assert.match(fs.readFileSync(R('src/ui/changelog-fold.js'), 'utf8'), /'Versiones anteriores \(' \+ n \+ '\)'/);
});

test('el historial va de la más antigua a la más reciente y la actual sigue siendo la última', () => {
  const html = fs.readFileSync(R('index.html'), 'utf8');
  const versions = [...html.matchAll(/settings-changelog-entry-version">v([\d.]+)</g)].map((m) => m[1]);
  assert.ok(versions.length > 3);
  const num = (v) => v.split('.').map(Number);
  for (let i = 1; i < versions.length; i++) {
    const [a, b] = [num(versions[i - 1]), num(versions[i])];
    assert.ok(a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]), versions[i - 1] + ' debe ir antes que ' + versions[i]);
  }
});
