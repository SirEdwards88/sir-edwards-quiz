// Auditoría 4, tanda C (red del cliente): 11, 14, 15, 17, 19.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const duels = readFileSync(new URL('../src/online/duels.js', import.meta.url), 'utf8');
const inbox = readFileSync(new URL('../src/online/inbox.js', import.meta.url), 'utf8');
const push = readFileSync(new URL('../src/online/push.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('11: responder reintenta el mismo cuerpo por red y, si no, libera el DOM', () => {
  assert.match(duels, /function postAnswer\(sh, body, onOk, onSettled\)/);
  assert.match(duels, /e\.network && n < 3/);
  assert.match(duels, /S\.shownAnswered = false; S\.lastHtml = null;/);
});
test('15: la primera carga fallida se reintenta y se relanza al volver la conexión', () => {
  assert.match(duels, /if \(afterError && S\.id[^\n]*setTimeout\(load, 3000\)/);
  assert.match(duels, /addEventListener\('online'[^\n]*!S\.data[^\n]*load\(\)/);
});
test('14: salir de la pestaña Duelo o ocultar la app para sondeo, ticker y sonido', () => {
  assert.match(duels, /function onHide\(\)/);
  assert.match(duels, /onHide: onHide/);
  assert.match(html, /if \(tabId !== 'duelo'\) \{ try \{ SEQDuels\.onHide\(\)/);
  assert.match(duels, /visibilityState === 'hidden'\) \{ clearInterval\(S\.tickT\)/);
});
test('17: avisos y notificaciones abren Duelo con comprobación y confirman si hay duelo en directo', () => {
  assert.match(duels, /function openGuarded\(fn\)/);
  assert.match(duels, /v\.classList\.contains\('active'\)\) fn\(\)/);
  assert.match(inbox, /SEQDuels\.openGuarded/);
  assert.match(push, /SEQDuels\.openGuarded/);
});
test('19: la bandeja no consulta en plena partida', () => {
  assert.match(inbox, /force !== true && inMatch\(\)/);
});
