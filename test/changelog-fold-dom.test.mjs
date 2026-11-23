// 0.9: fold() con 0, 1, varias y siete entradas (DOM mínimo simulado): solo la última visible, el resto plegado, sin duplicados.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('../src/ui/changelog-fold.js', import.meta.url), 'utf8'), ctx);
const F = ctx.SEQChangelogFold;

function el(cls, text) {
  const e = { cls, text, children: [], parent: null, tag: '' };
  const detach = (c) => { if (c.parent) c.parent.children = c.parent.children.filter((x) => x !== c); c.parent = e; };
  e.appendChild = (c) => { detach(c); e.children.push(c); return c; };
  e.insertBefore = (c, ref) => { detach(c); e.children.splice(e.children.indexOf(ref), 0, c); return c; };
  Object.defineProperty(e, 'firstChild', { get: () => e.children[0] });
  Object.defineProperty(e, 'textContent', { get: () => e.text, set: (v) => { e.text = v; } });
  Object.defineProperty(e, 'className', { get: () => e.cls, set: (v) => { e.cls = v; } });
  const find = (n, c) => { for (const k of n.children) { if (k.cls === c) return k; const r = find(k, c); if (r) return r; } return null; };
  e.querySelector = (sel) => find(e, sel.replace(':scope > ', '').replace('.', ''));
  e.querySelectorAll = (sel) => e.children.filter((k) => k.cls === sel.replace(':scope > ', '').replace('.', ''));
  return e;
}
function build(versions) {
  const host = el('settings-changelog');
  versions.forEach((v) => host.appendChild(el('settings-changelog-entry', 'v' + v)));
  const doc = { querySelector: (s) => (s === '.settings-changelog' ? host : null), createElement: (tag) => { const e = el(''); e.tag = tag; return e; } };
  return { host, doc };
}
const SEVEN = ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.9'];

test('fold con 0 y 1 entradas: no pliega nada', () => {
  for (const vs of [[], ['0.9']]) {
    const { host, doc } = build(vs);
    assert.equal(F.fold(doc), false);
    assert.equal(host.children.length, vs.length);
  }
});

test('fold con varias entradas: la última visible, el resto en «Versiones anteriores (N)», en orden y sin duplicados', () => {
  for (const vs of [['0.8', '0.9'], ['0.1', '0.2', '0.3'], SEVEN, [...SEVEN, '1.0']]) {
    const { host, doc } = build(vs);
    assert.equal(F.fold(doc), true);
    const older = host.children[0];
    assert.equal(older.tag, 'details');
    assert.equal(older.children[0].text, 'Versiones anteriores (' + (vs.length - 1) + ')');
    const inside = older.children[1].children.map((e) => e.text);
    const visible = host.children.slice(1).map((e) => e.text);
    assert.deepEqual(inside, vs.slice(0, -1).map((v) => 'v' + v));
    assert.deepEqual(visible, ['v' + vs[vs.length - 1]]);
    assert.equal(new Set([...inside, ...visible]).size, vs.length);
    assert.equal(older.open, undefined, 'cerrado por defecto');
    assert.equal(F.fold(doc), false, 'idempotente');
  }
});

test('con las siete entradas actuales: visible v0.9 y «Versiones anteriores (6)»', () => {
  const { host, doc } = build(SEVEN);
  F.fold(doc);
  assert.equal(host.children[0].children[0].text, 'Versiones anteriores (6)');
  assert.equal(host.children[1].text, 'v0.9');
});
