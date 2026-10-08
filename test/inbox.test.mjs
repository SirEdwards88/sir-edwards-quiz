// 2.2 — Avisos de Duelos y Retos dentro del juego: lógica pura y cableado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = { window: {}, document: { addEventListener() {}, readyState: 'complete', visibilityState: 'visible' }, setTimeout() { return 0; }, clearTimeout() {}, navigator: {}, localStorage: { getItem() { return null; }, setItem() {} } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('src/online/inbox.js'), ctx);
const C = ctx.SEQInbox.core;

const duel = (id, estado, soy, name) => ({ id, estado, soy, rival: { display_name: name, avatar: 'sombrero' } });
const reto = (id, estado, soy, name, yo) => ({ id, estado, soy, rival: { display_name: name }, yo });

test('pendingFrom: solo invitaciones recibidas (duelo y reto), con IDs válidos', () => {
  const p = C.pendingFrom(
    [duel('ABCDEFGHJK', 'pendiente', 'rival', 'Marta'), duel('ABCDEFGHJL', 'pendiente', 'creador', 'Luis'), duel('ABCDEFGHJM', 'en_curso', 'rival', 'Ana'), duel('mal', 'pendiente', 'rival', 'X')],
    [reto('ZZZZZZZZZ1', 'pendiente', 'rival', 'Pau'), reto('ZZZZZZZZZ2', 'aceptado', 'rival', 'Eva', { terminado: false })]);
  assert.deepEqual(Array.from(p.map((x) => x.kind + ':' + x.id)), ['duel:ABCDEFGHJK', 'reto:ZZZZZZZZZ1']);
  assert.equal(C.pendingFrom(null, undefined).length, 0);
});
test('dotCount: invitaciones recibidas + retos aceptados que te toca jugar', () => {
  const n = C.dotCount([duel('ABCDEFGHJK', 'pendiente', 'rival', 'Marta')],
    [reto('ZZZZZZZZZ1', 'pendiente', 'rival', 'Pau'), reto('ZZZZZZZZZ2', 'aceptado', 'rival', 'Eva', { terminado: false }), reto('ZZZZZZZZZ3', 'aceptado', 'rival', 'Eva', { terminado: true })]);
  assert.equal(n, 3);
});
test('unseen: cada desafío avisa una sola vez', () => {
  const items = C.pendingFrom([duel('ABCDEFGHJK', 'pendiente', 'rival', 'Marta')], [reto('ZZZZZZZZZ1', 'pendiente', 'rival', 'Pau')]);
  assert.equal(C.unseen(items, []).length, 2);
  assert.deepEqual(Array.from(C.unseen(items, ['duel:ABCDEFGHJK']).map((i) => i.id)), ['ZZZZZZZZZ1']);
  assert.equal(C.unseen(items, ['duel:ABCDEFGHJK', 'reto:ZZZZZZZZZ1']).length, 0);
});
test('textFor: título fijo y claro; subtítulo que rota sin repetirse seguido; sin emojis, corto y sin prisa en los retos', () => {
  const one = C.textFor([{ kind: 'reto', id: 'x', name: 'Marta' }]), duelT = C.textFor([{ kind: 'duel', id: 'x', name: 'Marta' }]), many = C.textFor([{}, {}, {}]);
  assert.match(one.title, /Marta te ha retado/); assert.match(duelT.title, /Marta te reta a un duelo/); assert.match(many.title, /3 desafíos/);
  for (const [k, list] of Object.entries(C.SUBS)) {
    assert.ok(list.length >= 3 && new Set(list).size === list.length, k);
    for (const t of list) { assert.ok(t.length <= 60, t); assert.ok(!/\p{Extended_Pictographic}/u.test(t), t); }
  }
  assert.ok(Array.from(C.SUBS.reto).every((t) => !/reloj|segundos|ya mismo|rápid|corre/i.test(t)), 'un reto no da prisa');
  assert.ok(Array.from(C.SUBS.duel).some((t) => /reloj|Sesenta|tiempo|esperar|puntualidad/i.test(t)));
  let prev = null; for (let n = 0; n < 200; n++) { const t = C.textFor([{ kind: 'reto', id: 'x', name: 'A' }], () => 0).sub; if (n) assert.notEqual(t, prev, 'nunca el mismo seguido'); prev = t; }
  assert.equal(Array.from(C.SUBS.reto).filter((t) => /excusas/i.test(t)).length, 1, '«excusas» solo en una frase');
});
test('cableado: script en index.html, en el shell sin conexión y sin tocar el servidor', () => {
  assert.match(read('index.html'), /src\/online\/inbox\.js\?v=\d+/);
  assert.match(read('sw.js'), /\.\/src\/online\/inbox\.js/);
  const src = read('src/online/inbox.js');
  assert.ok(!/'POST'|'PUT'|'DELETE'|'PATCH'/.test(src), 'solo lecturas');
  assert.match(src, /textContent = t\.title/); assert.ok(!/innerHTML = [^;]*\bname\b/.test(src.replace(/av\.innerHTML[^\n]*\n/g, '')), 'el nombre del rival nunca va por innerHTML');
});

test('presencia (Duelo online): solo se puede retar a quien esté en línea; sin dato del servidor no se bloquea a nadie', () => {
  const d = read('src/online/duels.js');
  assert.match(d, /function isOnline\(f\) \{ return !\(f && f\.online === false\); \}/);
  assert.match(d, /En línea \(/); assert.match(d, /Sin conexión \(/);
  // Los sin conexión no llevan onclick de crear, y el botón de duelo de la pantalla de amigos se desactiva.
  assert.match(d, /seq-d-off" aria-disabled="true">/);
  assert.ok(!/seq-d-off[^']*onclick/.test(d));
  assert.match(d, /disabled title="Sin conexión: solo puedes retar a duelo a quien esté en línea"/);
  assert.match(d, /PRESENCE_MS = 15000/); assert.match(d, /clearTimeout\(S\.presT\)/);
  // Los Retos (asíncronos) siguen sin exigir presencia.
  assert.match(d, /return h \+ '<div class="history-list">' \+ fl\.friends\.map\(function \(f\) \{\n      var p = player\(f\.player\);\n      return '<div class="history-item seq-d-row seq-pl-row" onclick="SEQDuels\.create/);
});
