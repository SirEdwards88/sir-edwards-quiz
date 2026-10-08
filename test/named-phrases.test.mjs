// 2.2 — Frases con nombre: filtro del nombre, probabilidades, topes y redacción de las bolsas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(read('src/data/named-phrases.js').replace(/^const /gm, 'var ') + ';\n' + read('src/utils/named-phrases.js').replace(/^const /m, 'var '), ctx);
const N = ctx.SEQNamed, PH = ctx.NAMED_PHRASES, RU = ctx.NAMED_RULES;

test('nombreSeguro: acepta nombres normales y normaliza mayúsculas', () => {
  for (const [i, o] of [['Marta', 'Marta'], ['marta', 'Marta'], ['MARTA', 'Marta'], ['Ana María', 'Ana María'], ['José-Luis', 'José-Luis'], ['Zoë', 'Zoë'], ['Eva', 'Eva']]) assert.equal(N.nombreSeguro(i), o, i);
});
test('nombreSeguro: rechaza lo que no encaja (el nombre no sale, la frase normal sí)', () => {
  for (const n of ['Al', 'Jo', '', null, 'Marta99', 'Marta!', 'M4rta', '😀Ana', 'MaRtA', 'Aaaa', 'Jugador', 'Jugador-ab12', 'Invitado', 'Sir Edwards', 'Edwards', 'x'.repeat(17), 'Ana Maria Lopez']) assert.equal(N.nombreSeguro(n), null, String(n));
});

test('las bolsas con nombre: claves con regla, {nombre} presente, sin emojis, largo razonable y sin nombre al final', () => {
  assert.deepEqual(Object.keys(PH).sort(), Object.keys(RU).sort());
  for (const [k, list] of Object.entries(PH)) for (const t of list) {
    assert.ok(t.includes('{nombre}'), k + ': ' + t);
    assert.equal(t.split('{nombre}').length - 1, 1, 'una sola vez: ' + t);
    assert.ok(t.length <= 130, k + ' largo: ' + t.length);
    assert.ok(!/\p{Extended_Pictographic}/u.test(t), 'sin emojis: ' + t);
    assert.ok(!/\{nombre\}[.»]*$/.test(t), 'el nombre no va al final: ' + t);
    if (/^«/.test(t)) assert.ok(/»$/.test(t), t);
  }
  assert.ok(Object.values(PH).flat().length <= 45, 'son pocas a propósito');
});
test('las frases con nombre no contienen masculinos genéricos sobre el jugador', () => {
  const bad = /\b(tranquilo|bienvenido|preparado|listo|cansado|seguro|solo|orgulloso de ti)\b/i;
  for (const list of Object.values(PH)) for (const t of list) { if (/orgulloso de ti/.test(t)) continue; assert.ok(!bad.test(t), t); }
});

const base = (o) => Object.assign({ name: 'Marta', rnd: () => 0, now: new Date(2026, 9, 8, 10), caps: {} }, o);

test('tryPick: sin nombre válido o con la probabilidad en contra, devuelve null', () => {
  N.resetSession();
  assert.equal(N.tryPick('end_perfecto', base({ name: 'Jugador-ab12' })), null);
  assert.equal(N.tryPick('end_perfecto', base({ rnd: () => 0.99 })), null);
  assert.equal(N.tryPick('clave_inexistente', base()), null);
  const t = N.tryPick('end_perfecto', base());
  assert.ok(t && t.includes('Marta') && !t.includes('{nombre}'));
});
test('tryPick: como mucho una frase con nombre por sesión', () => {
  N.resetSession();
  assert.ok(N.tryPick('survival_win', base()));
  assert.equal(N.tryPick('end_perfecto', base()), null);
  N.resetSession();
  assert.ok(N.tryPick('end_perfecto', base()));
});
test('tryPick: topes semanal (Encargos) y diario (evento diurno)', () => {
  const caps = {};
  N.resetSession(); assert.ok(N.tryPick('encargos_4', base({ caps })));
  N.resetSession(); assert.equal(N.tryPick('encargos_4', base({ caps, now: new Date(2026, 9, 10, 10) })), null, 'misma semana');
  N.resetSession(); assert.ok(N.tryPick('encargos_4', base({ caps, now: new Date(2026, 9, 14, 10) })), 'otra semana');
  N.resetSession(); assert.ok(N.tryPick('day', base({ caps })));
  N.resetSession(); assert.equal(N.tryPick('day', base({ caps })), null, 'mismo día');
});

test('integración: pickRotatingPhrase consulta SEQNamed y las claves coinciden con las del juego', () => {
  const html = read('index.html'), ev = read('src/utils/sir-events.js');
  assert.match(html, /SEQNamed\.tryPick\(poolKey\)/);
  assert.match(html, /src\/data\/named-phrases\.js\?v=\d+/); assert.match(html, /src\/utils\/named-phrases\.js\?v=\d+/);
  assert.match(read('sw.js'), /named-phrases\.js/);
  for (const k of ['survival_win', 'sudden_win', 'lucidez_perfecto']) assert.ok(html.includes(k), k);
  assert.match(html, /end_\$\{key\}/); assert.match(read('src/ui/encargos-ui.js'), /'encargos_' \+ st/);
  for (const k of ["'comeback'", "'day'", "'streak_' + milestone"]) assert.ok(ev.includes(k), k);
});

test('ninguna frase con nombre es copia literal de una normal (quitado el nombre)', () => {
  const norm = (t) => t.replace(/[«»'"]/g, '').replace(/\s*,?\s*\{nombre\}\s*,?/g, ' ').replace(/\s+/g, ' ').replace(/ \./g, '.').trim().toLowerCase();
  const corpus = norm(['src/data/phrases.js', 'src/data/encargos-phrases.js', 'src/utils/sir-events.js'].map(read).join('\n'));
  const dup = Object.values(PH).flat().filter((t) => corpus.includes(norm(t))); assert.deepEqual(dup, []);
});

test('hitos más altos: frases con nombre en bolsas aparte, sin «» (las pone el bocadillo) y enganchadas en hitos.js', () => {
  for (const k of ['hito_survival_30', 'hito_sudden_death_20']) {
    assert.ok(Array.from(PH[k]).length >= 2, k);
    for (const t of PH[k]) assert.ok(!/[«»]/.test(t) && t.length <= 110, k + ': ' + t);
  }
  const src = fs.readFileSync(new URL('../src/ui/hitos.js', import.meta.url), 'utf8');
  assert.match(src, /tryPick\('hito_' \+ h\.mode \+ '_' \+ h\.n\)/);
});

test('resultado de Duelo: a veces nombra al RIVAL, estable al repintar; sin nombre válido o sin suerte sale la normal', () => {
  const c = { store: {}, saveStore() {}, Math: Object.create(Math) };
  c.window = c; vm.createContext(c);
  vm.runInContext(read('src/data/named-phrases.js').replace(/^const /gm, 'var ') + ';\n' + read('src/utils/named-phrases.js').replace(/^const /m, 'var '), c);
  vm.runInContext('function pickRotatingPhrase(k, l) { return l[0]; }', c);
  vm.runInContext(read('src/data/duel-phrases.js'), c);
  const P = c.SEQDuelPhrases;
  // Forzamos que la bolsa con nombre salga siempre (p = 1) y sin tope de sesión.
  for (const k of Object.keys(c.NAMED_RULES)) c.NAMED_RULES[k] = { p: 1 };
  const first = P.pickRotating('win', 5, 'G1', 'Marta');
  assert.ok(/Marta/.test(first), 'nombra al rival: ' + first);
  assert.equal(P.pickRotating('win', 5, 'G1', 'Marta'), first, 'estable al repintar');
  assert.equal(P.pickRotating('win', 5, 'G1', 'Marta'), first);
  c.SEQNamed.resetSession();
  // Nombre no válido → frase normal (de la lista de siempre).
  const normal = P.pickRotating('win', 5, 'G2', 'x');
  assert.ok(Array.from(P.PHRASES.victoria_clara).includes(normal), 'normal: ' + normal);
  // Todos los resultados tienen su grupo con nombre.
  for (const [res, m] of [['win', 1], ['win', 2], ['win', 5], ['win', 9], ['loss', 1], ['loss', 3], ['loss', 5], ['loss', 9], ['draw', 0]]) {
    c.SEQNamed.resetSession();
    assert.ok(/Ana/.test(P.pickRotating(res, m, 'H' + res + m, 'Ana')), res + m);
  }
});
