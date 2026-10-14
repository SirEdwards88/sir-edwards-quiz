// 2.4: dónde suenan los jingles (derrota/victoria en duelos, logros secretos).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('Duelo y Reto: victoria y derrota suenan una sola vez por resultado (el empate no)', () => {
  const d = read('src/online/duels.js');
  assert.match(d, /resultSoundOnce\(kind, d, res\);/);
  assert.match(d, /if \(res === 'draw' \|\| !d \|\| !d\.id/);
  assert.match(d, /playSound\(res === 'win' \? 'win' : 'lose'\)/);
  assert.match(d, /SEQResultHeard\.first\(kind \+ ':' \+ d\.id\)/);
  assert.match(read('src/state/result-heard.js'), /heard\.slice\(-60\)/, 'la lista de resultados oídos está acotada');
});

test('los cuatro logros secretos existen y todos disparan el jingle secreto', () => {
  const ctx = {}; 
  const src = read('src/data/medals.js');
  const ids = [...src.matchAll(/id: '([a-z_0-9]+)', title: '[^']*', desc: '[^']*', secret: true/g)].map((m) => m[1]);
  const extra = /id: 'all_medals_secret'/.test(src) ? ['all_medals_secret'] : [];
  assert.deepEqual([...ids, ...extra].sort(), ['all_medals_secret', 'lucidez_absoluta', 'lucidez_conexiones_imposibles', 'lucidez_mente_despierta']);
  const html = read('index.html'), classic = read('src/ui/mental-classic-ui.js');
  assert.equal((html.match(/newMedalsUnlocked\.some\(m => m\.secret\)/g) || []).length, 2, 'Lucidez y partida normal');
  assert.ok(/newMedals\.some\(function \(m\) \{ return m\.secret; \}\)\) playSound\('eye'\)/.test(classic));
});

test('derrota: Lucidez fallida, Fondo con mala puntuación y los modos con retrato de derrota', () => {
  const html = read('index.html'), classic = read('src/ui/mental-classic-ui.js');
  assert.match(html, /else if \(failed && newModesUnlocked\.length === 0\) \{\s*playSound\('lose'\)/);
  assert.match(html, /lastResultCharacterState === 'defeat'\)\) \{\s*playSound\('lose'\)/);
  assert.match(classic, /playSound\(r\.category !== 'mal' \? 'win' : 'lose'\)/);
});
