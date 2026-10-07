// 2.2: frases de Sir Edwards por estado de los Encargos (0/4…4/4), rotativas y calculadas sobre la rotación ACTUAL.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
function env() {
  const html = read('index.html');
  const grab = (name) => { const i = html.indexOf('function ' + name); assert.ok(i > 0, name); let d = 0, j = html.indexOf('{', i); for (let k = j; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}' && --d === 0) return html.slice(i, k + 1); } };
  const ctx = { console, store: {} };
  vm.createContext(ctx);
  vm.runInContext(grab('shuffleArray') + '\n' + grab('pickRotatingPhrase') + '\n' + read('src/data/encargos-phrases.js').replace(/^const /, 'var ') + '\n' + read('src/ui/encargos-ui.js').replace(/^const SEQEncargosUI/, 'var SEQEncargosUI') + ';this.UI = SEQEncargosUI; this.PH = ENCARGOS_PHRASES;', ctx);
  return ctx;
}
const view = (done, great) => ({ doneCount: done, great: { claimed: great }, missions: [], allDone: done === 3 && great });

test('frases por estado (mínimo 5 cada uno), sin repetidas, sin emojis y sin números del histórico', () => {
  const { PH } = env();
  assert.deepEqual(Object.keys(PH), ['encargos_0', 'encargos_1', 'encargos_2', 'encargos_3', 'encargos_4']);
  const all = [];
  for (const k of Object.keys(PH)) { assert.ok(PH[k].length >= 5, k); all.push(...PH[k]); }
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.every((t) => t.length > 20 && t.length < 100 && !/\p{Extended_Pictographic}/u.test(t)));
});

test('el estado sale de los 4 encargos de la rotación actual cobrados (3 semanales + Gran Encargo), nunca del histórico', () => {
  const { UI } = env();
  assert.equal(UI.stateOf(view(0, false)), 0);
  assert.equal(UI.stateOf(view(1, false)), 1);
  assert.equal(UI.stateOf(view(2, false)), 2);
  assert.equal(UI.stateOf(view(3, false)), 3);
  assert.equal(UI.stateOf(view(2, true)), 3, 'dos semanales + Gran Encargo = 3/4');
  assert.equal(UI.stateOf(view(0, true)), 1);
  assert.equal(UI.stateOf(view(3, true)), 4);
  assert.equal(UI.stateOf({ doneCount: 37, great: { claimed: true } }), 4, 'tope en 4 aunque haya un contador enorme');
});

test('cada visita da una frase de SU estado, rotan sin repetir hasta agotar todas y luego recomienzan', () => {
  const ctx = env();
  const { UI, PH } = ctx;
  for (let st = 0; st <= 4; st++) {
    const v = st === 4 ? view(3, true) : view(st, false);
    const got = [], n = PH['encargos_' + st].length;
    for (let i = 0; i < n; i++) got.push(UI.phrase(v, true));
    assert.equal(new Set(got).size, n, 'estado ' + st + ': todas antes de repetir');
    assert.ok(got.every((t) => PH['encargos_' + st].includes(t)));
    const next = UI.phrase(v, true);
    assert.ok(PH['encargos_' + st].includes(next), 'vuelve a empezar');
    assert.notEqual(next, got[n - 1], 'la primera de la nueva vuelta no repite la última');
  }
});

test('repintar la pantalla (sin visita nueva) no gasta frases; un cambio de estado sí pide otra', () => {
  const { UI, PH, store } = env();
  const a = UI.phrase(view(1, false), true);
  const left = store.phraseBags.encargos_1.length;
  for (let i = 0; i < 10; i++) assert.equal(UI.phrase(view(1, false), false), a);
  assert.equal(store.phraseBags.encargos_1.length, left);
  const b = UI.phrase(view(2, false), false); // cambia el estado con la pantalla abierta
  assert.ok(PH.encargos_2.includes(b));
});
