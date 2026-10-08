// v2.0 — el modo secreto no revela su nombre antes de desbloquearlo (textos estáticos) + orden del historial.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('los hitos de Fragmentos tienen versión secreta sin el nombre del modo', () => {
  const block = html.slice(html.indexOf('const FRAGMENT_MILESTONES = ['), html.indexOf('function getFragmentMilestoneState'));
  const secrets = [...block.matchAll(/secret(?:Text|Goal): '([^']*)'/g)].map((m) => m[1]);
  assert.equal(secrets.length, 6, 'texto y objetivo secretos para los 3 hitos');
  for (const t of secrets) assert.ok(!/lucidez|error(es)? extra/i.test(t), 'no revela: ' + t);
});
test('bienvenida, subtítulo de Fragmentos e historial no nombran el modo', () => {
  const welcome = html.slice(html.indexOf('id="welcome-modal"'), html.indexOf('id="update-modal"'));
  assert.ok(!/lucidez/i.test(welcome), 'bienvenida');
  assert.ok(/Consigue Fragmentos de Mente para desbloquear un modo secreto/.test(html));
  const changelog = html.slice(html.indexOf('<h3 style="margin-top:0;">Historial de versiones'), html.indexOf('<div class="settings-section settings-danger-zone">'));
  assert.ok(!/lucidez/i.test(changelog), 'historial de versiones');
});
test('el historial va en orden, la 2.0 incluye mejoras visuales y 40 preguntas nuevas y la 1.4 ya no menciona el ranking por XP', () => {
  const changelog = html.slice(html.indexOf('<h3 style="margin-top:0;">Historial de versiones'), html.indexOf('<div class="settings-section settings-danger-zone">'));
  const versions = [...changelog.matchAll(/settings-changelog-entry-version">v([0-9.]+)</g)].map((m) => m[1]);
  assert.deepEqual(versions, ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '2.0', '2.1', '2.2']);
  const v2 = changelog.slice(changelog.lastIndexOf('v2.0'), changelog.lastIndexOf('v2.1'));
  assert.match(v2, /Mejoras visuales/); assert.match(v2, /40 preguntas nuevas/);
  const v14 = changelog.slice(changelog.indexOf('v1.4'), changelog.indexOf('v1.5'));
  assert.ok(!/ranking/i.test(v14), 'la 1.4 no menciona el ranking por XP');
  assert.match(changelog.slice(changelog.lastIndexOf('v2.1')), /[Dd]uelo por apuestas/);
});

test('bienvenida en dos viñetas: la segunda avisa de que no habrá tutorial y sigue sin nombrar el modo secreto', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const w = html.slice(html.indexOf('id="welcome-modal"'), html.indexOf('id="update-modal"'));
  assert.match(w, /id="welcome-step-1"/); assert.match(w, /id="welcome-step-2"/);
  assert.match(w, /No habrá tutorial/); assert.match(w, /onclick="welcomeNext\(\)"/);
  assert.ok(!/lucidez/i.test(w));
});

test('la bienvenida sale tras la cuenta y solo a cuentas nuevas; quien ya tenía progreso se salta la presentación', () => {
  const intro = fs.readFileSync(new URL('../src/ui/intro.js', import.meta.url), 'utf8');
  assert.ok(!/showWelcomeFirst/.test(intro), 'ya no sale antes de la cuenta');
  assert.match(intro, /accountHadProgress/); assert.match(intro, /function afterWelcome/);
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /SEQIntro\.afterWelcome/);
});
