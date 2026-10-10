// v2.0 — audio: módulo propio, muestras de acierto/fallo disponibles sin conexión.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('../src/audio/audio.js', import.meta.url), 'utf8');
test('el audio vive en src/audio/audio.js y no en index.html', () => {
  assert.match(html, /<script src="src\/audio\/audio\.js(\?v=\d+)?"><\/script>/);
  for (const fn of ['function playSound(', 'function playCorrectSound(', 'function getAudioCtx(']) {
    assert.ok(!html.includes(fn), 'index.html aún define ' + fn); assert.ok(audio.includes(fn), 'falta ' + fn);
  }
});
test('las muestras existen, son ligeras y están en la caché sin conexión', () => {
  for (const f of ['src/audio/audio.js', 'assets/audio/correct.mp3', 'assets/audio/wrong.mp3']) {
    assert.ok(sw.includes(`'./${f}'`), f);
    assert.ok(fs.statSync(new URL('../' + f, import.meta.url)).size < 60000, f + ' pesa demasiado');
  }
});
test('el sonido apagado silencia también las muestras', () => {
  assert.match(audio, /function playSound\(type\) \{\s*\n\s*if \(store\.sound === 'off'\) return;\s*\n\s*if \(type === 'bad' && playSample/);
  assert.match(audio, /function playCorrectSound\(streak\) \{\s*\n\s*if \(store\.sound === 'off'\) return;/);
});
test('música de menús: archivo ligero, no se precarga al instalar y tiene su interruptor', () => {
  const size = fs.statSync(new URL('../assets/audio/menu-theme.mp3', import.meta.url)).size;
  assert.ok(size < 3_000_000, 'menu-theme.mp3 pesa ' + size);
  assert.ok(!sw.includes('menu-theme.mp3'), 'la música no debe ir en la lista de instalación');
  assert.match(html, /id="music-control"/);
  assert.match(audio, /function changeMusic\(/);
  assert.match(sw, /res\.status !== 206/);
});

test('campanillas: sonido de evento de Sir Edwards y de récord, con el interruptor de sonido respetado', async () => {
  const fs = await import('node:fs');
  const a = fs.readFileSync(new URL('../src/audio/audio.js', import.meta.url), 'utf8');
  assert.ok(a.includes('function playSirEventSound()') && a.includes('function playRecordSound()'));
  assert.equal((a.match(/if \(store\.sound === 'off'\) return;\n  try \{ (playBellNote|\[1319)/g) || []).length, 2);
  const ui = fs.readFileSync(new URL('../src/ui/sir-events-ui.js', import.meta.url), 'utf8');
  assert.ok(ui.includes("ev.type === 'record'") && ui.includes('playSirEventSound'));
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('playRecordSound();') && html.includes('!recordSoundPlayed'));
});
