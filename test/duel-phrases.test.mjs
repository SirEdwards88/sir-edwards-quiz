// 2.2: frases de final de Duelo y Retos con bolsa (sin repetir hasta agotar el grupo), estables por partida.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
function grab(html, name) { const i = html.indexOf('function ' + name); assert.ok(i > 0, name); let d = 0; for (let k = html.indexOf('{', i); k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}' && --d === 0) return html.slice(i, k + 1); } }
function env(withStore = true) {
  const html = read('index.html');
  const ctx = { console, window: {}, saves: 0 };
  if (withStore) { ctx.store = {}; ctx.saveStore = () => { ctx.saves++; }; }
  vm.createContext(ctx);
  vm.runInContext(grab(html, 'shuffleArray') + '\n' + grab(html, 'pickRotatingPhrase') + '\n' + read('src/data/duel-phrases.js'), ctx);
  ctx.D = ctx.window.SEQDuelPhrases;
  return ctx;
}

test('cada grupo rota con bolsa: todas las frases antes de repetir, y luego recomienza sin empezar por la última', () => {
  const { D } = env();
  for (const [res, margin] of [['win', 1], ['win', 2], ['win', 5], ['win', 9], ['loss', 1], ['loss', 3], ['loss', 6]]) {
    const list = D.PHRASES[D.poolKey(res, margin)], n = list.length, got = [];
    for (let g = 0; g < n; g++) got.push(D.pickRotating(res, margin, `${res}${margin}-g${g}`));
    assert.equal(new Set(got).size, n, `${res}/${margin}: las ${n} antes de repetir`);
    const next = D.pickRotating(res, margin, `${res}${margin}-otra`);
    assert.ok(list.includes(next));
    assert.notEqual(next, got[n - 1], 'la nueva vuelta no empieza por la última');
  }
});

test('la frase de una partida es estable: repintar o reabrir el resultado no cambia la frase ni gasta la bolsa', () => {
  const { D, store } = env();
  const a = D.pickRotating('win', 1, 'duelo-77');
  const left = store.phraseBags.duel_victoria_1.length;
  for (let i = 0; i < 8; i++) assert.equal(D.pickRotating('win', 1, 'duelo-77'), a);
  assert.equal(store.phraseBags.duel_victoria_1.length, left);
  assert.notEqual(D.pickRotating('win', 1, 'duelo-78'), a, 'otra partida, otra frase');
});

test('solo se recuerdan las últimas 40 partidas', () => {
  const { D, store } = env();
  for (let g = 0; g < 60; g++) D.pickRotating('loss', 6, 'p' + g);
  assert.equal(Object.keys(store.duelPhraseByGame).length, 40);
  assert.ok(store.duelPhraseByGame.p59 && !store.duelPhraseByGame.p0);
});

test('sin almacén (o sin id) cae a la elección estable por id de siempre', () => {
  const sin = env(false);
  assert.equal(sin.D.pickRotating('win', 5, 'x1'), sin.D.pick('win', 5, 'x1'));
  const { D, store } = env();
  assert.equal(D.pickRotating('win', 5, ''), D.pick('win', 5, ''));
  assert.equal(store.phraseBags, undefined, 'sin id no se toca la bolsa');
});
