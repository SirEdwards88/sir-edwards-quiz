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
test('el historial va en orden y la 2.0 incluye mejoras visuales y 40 preguntas nuevas', () => {
  const changelog = html.slice(html.indexOf('<h3 style="margin-top:0;">Historial de versiones'), html.indexOf('<div class="settings-section settings-danger-zone">'));
  const versions = [...changelog.matchAll(/settings-changelog-entry-version">v([0-9.]+)</g)].map((m) => m[1]);
  assert.deepEqual(versions, ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '2.0']);
  const v2 = changelog.slice(changelog.lastIndexOf('v2.0'));
  assert.match(v2, /Mejoras visuales/); assert.match(v2, /40 preguntas nuevas/);
});
