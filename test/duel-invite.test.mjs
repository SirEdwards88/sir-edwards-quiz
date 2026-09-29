// v2.0 — enlace de invitación a un duelo: el código se reconoce dentro de un enlace o mensaje pegado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../src/utils/duel.js', import.meta.url), 'utf8');
// Las constantes del código viven en index.html (script clásico compartido): se extraen tal cual.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const consts = ['DUEL_CODE_ALPHABET', 'DUEL_MODE_IDS', 'DUEL_SCORE_DIGITS', 'DUEL_MAX_SCORE']
  .map((n) => { const m = html.match(new RegExp('^const ' + n + ' = .*;$', 'm')); assert.ok(m, n); return m[0]; }).join('\n');
const ctx = vm.createContext({});
vm.runInContext(consts + '\n' + src + '\n;globalThis.__api = { encodeDuelCode, decodeDuelCode };', ctx);
const { encodeDuelCode, decodeDuelCode } = ctx.__api;

const code = encodeDuelCode({ modeId: 'play', cfgIdx: 1, score: 7, seed: 123456 });

test('el código solo se sigue decodificando igual', () => {
  const d = decodeDuelCode(code);
  assert.equal(d.modeId, 'play'); assert.equal(d.score, 7); assert.equal(d.seed, 123456); assert.equal(d.code, code);
});
test('se reconoce dentro de un enlace de invitación', () => {
  const url = 'https://siredwards88.github.io/sir-edwards-quiz/?reto=' + encodeURIComponent(code);
  assert.equal(decodeDuelCode(url).code, code);
  assert.equal(decodeDuelCode(new URL(url).searchParams.get('reto')).code, code);
});
test('se reconoce dentro del mensaje completo de WhatsApp', () => {
  const msg = `⚔️ Te reto a un Duelo: he sacado 7/10.\nEntra aquí: https://x.github.io/q/?reto=${code}\nCódigo: ${code}`;
  assert.equal(decodeDuelCode(msg).code, code);
});
test('un código manipulado o basura sigue siendo inválido', () => {
  const bad = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A');
  assert.equal(decodeDuelCode(bad), null);
  assert.equal(decodeDuelCode('hola que tal'), null);
  assert.equal(decodeDuelCode('https://x.io/?reto=SRW-AAAAA-BBBBBB'), null);
  assert.equal(decodeDuelCode(''), null);
});
