// «Momento Sir Edwards»: hitos, frases, imágenes y enlaces.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'src', 'ui', 'hitos.js'), 'utf8'), ctx);
const H = ctx.SEQHitos;

test('hitos solo en Supervivencia 10/25/40 y Muerte Súbita 15/25', () => {
  const at = (mode) => Array.from({ length: 60 }, (_, i) => i).filter((i) => H.hitoFor(mode, i));
  assert.deepEqual(at('survival'), [10, 25, 40]);
  assert.deepEqual(at('sudden_death'), [15, 25]);
  for (const m of ['play', 'timetrial', 'mental_calc', 'review', 'lucidez']) assert.deepEqual(at(m), []);
});

test('cada hito tiene 3 frases distintas, tuteo y su imagen existe', () => {
  for (const mode of ['survival', 'sudden_death']) {
    for (const n of Object.keys(H.HITOS[mode].at)) {
      const h = H.hitoFor(mode, Number(n));
      assert.equal(h.phrases.length, 3);
      assert.equal(new Set(h.phrases).size, 3);
      for (const p of h.phrases) assert.ok(!/\b(vos|vosotros|seguís|vuestr[oa]s?|habéis)\b/i.test(p), `sin «vos»: ${p}`);
      assert.ok(fs.existsSync(path.join(root, h.img)), h.img);
    }
  }
});

test('las frases no repiten ninguna ya existente en phrases.js', () => {
  const existing = fs.readFileSync(path.join(root, 'src', 'data', 'phrases.js'), 'utf8');
  for (const mode of ['survival', 'sudden_death']) for (const n of Object.keys(H.HITOS[mode].at))
    for (const p of H.HITOS[mode].at[n].phrases) assert.ok(!existing.includes(p), p);
});

test('pickPhrase nunca repite la última del mismo hito', () => {
  for (let last = 0; last < 3; last++) for (let k = 0; k < 20; k++) {
    const i = H.pickPhrase(['a', 'b', 'c'], last, () => k / 20);
    assert.ok(i >= 0 && i < 3 && i !== last);
  }
  assert.equal(H.pickPhrase(['a', 'b', 'c'], -1, () => 0.99), 2);
  assert.equal(H.pickPhrase(['a', 'b', 'c'], -1, () => 0), 0);
});

test('index.html y sw.js enlazan el módulo y las imágenes', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('src/ui/hitos.js'));
  assert.ok(sw.includes('src/ui/hitos.js'));
  for (const n of ['barbilla', 'monoculo', 'manos']) assert.ok(sw.includes(`assets/character/hito-${n}.webp`));
});
