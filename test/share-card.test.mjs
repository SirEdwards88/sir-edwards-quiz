// Prompt 5 — Share Result Card: modelo (variantes/datos) de src/share/share-card.js.
// La composición en canvas se verifica visualmente y en navegador (ver informe);
// aquí se valida la parte pura: qué variante/textos/personaje sale de los datos
// que ya existen, sin recalcular nada. Ejecutar: node --test test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'src/share/share-card.js'), 'utf8'), { window: win, document: {}, Image: class {} });
const build = (i) => JSON.parse(JSON.stringify(win.SEQShareCard.buildModel(i)));
const base = { modeName: 'Modo Estándar', scoreStr: '27/30', accuracy: 90, streak: 14 };

test('Estándar sin retrato en pantalla -> variante standard con sombrero', () => {
  const m = build({ ...base, modeName: 'Contrarreloj' });
  assert.equal(m.variant, 'standard'); assert.equal(m.title, 'RESULTADO'); assert.equal(m.character, 'hat');
  assert.equal(m.main, '27/30'); assert.equal(m.pill, 'CONTRARRELOJ');
  assert.equal(m.secondary, '90 % de efectividad · racha máxima 14');
});
test('Victory / Defeat según el retrato que ya muestra la pantalla', () => {
  const v = build({ ...base, characterState: 'victory' });
  assert.deepEqual([v.variant, v.title, v.character, v.outcome], ['victory', 'VICTORIA', 'victory', 'win']);
  const d = build({ ...base, characterState: 'defeat', scoreStr: '10/30', accuracy: 33 });
  assert.deepEqual([d.variant, d.title, d.character, d.outcome], ['defeat', 'DERROTA', 'defeat', 'loss']);
});
test('La racha 0 no se muestra; el marcador viene tal cual (no se recalcula)', () => {
  const m = build({ ...base, streak: 0, scoreStr: '7/50' });
  assert.equal(m.main, '7/50'); assert.equal(m.secondary, '90 % de efectividad');
});
test('Lucidez: personaje según la fase alcanzada y textos ya existentes', () => {
  const l = (o) => build({ ...base, modeName: 'Lucidez Mental', lucidez: o });
  assert.deepEqual([l({ failed: true, phase: 1 }).character, l({ failed: true, phase: 1 }).title], ['phase1', 'LA MENTE HA CEDIDO']);
  assert.equal(l({ failed: true, phase: 2 }).character, 'phase2');
  assert.equal(l({ failed: true, phase: 3 }).character, 'phase3');
  const fin = l({ failed: true, phase: 'final' });
  assert.deepEqual([fin.character, fin.title], ['enigma', 'ENIGMA SIN RESOLVER']);
  const win = l({ failed: false, perfect: false, phase: 'final' });
  assert.deepEqual([win.variant, win.character, win.title, win.outcome], ['lucidez', 'enigma', 'ENIGMA RESUELTO', 'win']);
  assert.equal(l({ failed: false, perfect: true, phase: 'final' }).title, 'LUCIDEZ ABSOLUTA');
});
test('Duelo por código: creador (código) y quien se une (ganador ya decidido)', () => {
  const c = build({ ...base, duel: { role: 'creator', code: 'K7P2QX', score: 21, totalQ: 30, modeLabel: 'Estándar' } });
  assert.deepEqual([c.variant, c.title, c.code, c.pill], ['duel', 'TE RETO A UN DUELO', 'K7P2QX', 'DUELO · ESTÁNDAR']);
  const w = build({ ...base, duel: { role: 'joiner', result: 'win', myScore: 22, opponentScore: 17 } });
  assert.deepEqual([w.title, w.character, w.main, w.versus.rival], ['VICTORIA', 'victory', '22 — 17', null]);
  assert.equal(build({ ...base, duel: { role: 'joiner', result: 'loss', myScore: 1, opponentScore: 2 } }).character, 'defeat');
  assert.deepEqual([build({ ...base, duel: { role: 'joiner', result: 'draw', myScore: 5, opponentScore: 5 } }).title], ['EMPATE']);
});
test('Duelo online y Reto: rival, avatar y marcador del servidor; empate con sombrero', () => {
  const o = (kind, result) => build({ online: { kind, result, myScore: 18, opponentScore: 15, modeLabel: '20 preguntas', rival: { name: 'Bruno', avatar: 'reloj' } }, player: { name: 'Yo', avatar: 'sombrero' } });
  const d = o('duel', 'win');
  assert.deepEqual([d.variant, d.title, d.character, d.main, d.versus.rival.name, d.versus.rival.avatar, d.player.name], ['duel', 'VICTORIA', 'victory', '18 — 15', 'Bruno', 'reloj', 'Yo']);
  assert.equal(o('reto', 'loss').variant, 'reto');
  assert.equal(o('reto', 'draw').character, 'hat');
  assert.match(o('reto', 'win').pill, /^RETO/);
});
test('Sin sesión no hay jugador (la tarjeta no inventa identidad); datos vacíos no lanzan', () => {
  assert.equal(build({ ...base }).player, null);
  assert.doesNotThrow(() => build(null));
  assert.doesNotThrow(() => build({}));
  assert.equal(build({ ...base, player: { name: '' } }).player, null);
});
test('Todas las variantes tienen tema definido y el tamaño es 1080×1350 a 2×', () => {
  for (const v of ['standard', 'victory', 'defeat', 'lucidez', 'duel', 'reto']) assert.ok(win.SEQShareCard.THEMES[v], v);
  assert.deepEqual(JSON.parse(JSON.stringify(win.SEQShareCard.SIZE)), { w: 1080, h: 1350, scale: 2 });
});
