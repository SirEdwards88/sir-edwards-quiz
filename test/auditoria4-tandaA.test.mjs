// Auditoría 4, tanda A (cliente): aviso mixto, baja del push al cerrar sesión, hitos desde la lista, cola de avisos caducados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const inbox = read('src/online/inbox.js');
const duels = read('src/online/duels.js');
const online = read('src/online/online.js');

test('el aviso de la bandeja con lista mixta abre siempre una pantalla que existe (nunca open(null))', () => {
  assert.doesNotMatch(inbox, /\? 'duels' : null\)/);
  assert.match(inbox, /'retos' : 'duels'\)/);
  assert.match(duels, /function open\(screen, id\) \{\s*if \(!active\(\) \|\| !screen\) return;/);
});

test('cerrar sesión da de baja el push con SEQPush.disable (el DELETE sin cuerpo daba 415) y espera con tope', () => {
  const fn = online.slice(online.indexOf('function doSignOut()'), online.indexOf('function logoutAll()'));
  assert.doesNotMatch(fn, /api\('DELETE', '\/me\/push'\)/);
  assert.match(fn, /SEQPush\.disable\(\)/);
  assert.match(fn, /2500/);
  assert.ok(fn.indexOf('SEQPush.disable') < fn.indexOf('account = null'), 'el token se descarta después de la baja');
});

test('los duelos terminados vistos desde la lista piden el detalle (la lista no trae hitos)', () => {
  const fn = duels.slice(duels.indexOf('function recordFromList('), duels.indexOf('function recordDuel('));
  assert.match(fn, /call\('GET', \(kind === 'reto' \? '\/challenges\/' : '\/duels\/'\)/);
  assert.doesNotMatch(fn, /recordDuel\(x, x\.id, kind\)/);
});

test('la bandeja descarta avisos en cola que ya no están pendientes y SEQDuels exporta refreshSummary', () => {
  assert.match(inbox, /queue = queue\.filter\(function \(i\) \{ return !loaded\[i\.kind\] \|\| live\[i\.kind \+ ':' \+ i\.id\]; \}\)/);
  assert.match(duels, /open: open, back: back, refreshSummary: refreshSummary/);
});
