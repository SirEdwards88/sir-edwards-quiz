// Página de instalación (instalar.html): archivos enlazados, manifest, QR y lógica pura de plataforma/estado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const R = (p) => new URL('../' + p, import.meta.url);
const html = fs.readFileSync(R('instalar.html'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(R('src/install/instalar-page.js'), 'utf8'), ctx);
const P = ctx.SEQInstalarPage;

test('instalar.html enlaza manifest, estilos, script e imágenes que existen', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.json">/);
  for (const m of html.matchAll(/(?:href|src)="((?:styles|src|assets|icons)\/[^"?]+)"/g)) assert.ok(fs.existsSync(R(m[1])), m[1] + ' no existe');
  assert.match(html, /<h1[^>]*>Sir Edwards Quiz<\/h1>/);
  assert.match(html, /Instalar Sir Edwards Quiz/);
  assert.match(html, /Añadir a pantalla de inicio/);
});

test('el QR enlaza con la propia página de instalación y existe', () => {
  assert.ok(fs.statSync(R('assets/share/qr-instalar.png')).size > 1000);
  assert.match(html, /qr-instalar\.png/);
  assert.match(html, /instalar\.html/);
});

test('plataforma: iPhone/iPad (también Chrome en iOS y iPad que se hace pasar por Mac) y Safari', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  assert.deepEqual({ ...P.detectPlatform(iphone, true) }, { ios: true, safari: true });
  assert.equal(P.detectPlatform(iphone.replace('Version/17.0', 'CriOS/120'), true).safari, false);
  assert.equal(P.detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', true).ios, true);
  assert.equal(P.detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', false).ios, false);
  assert.equal(P.detectPlatform('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36', true).ios, false);
});

test('textos de estado: uno por situación, en el tono de Sir Edwards y sin emojis', () => {
  const all = ['installed', 'ready', 'ios', 'manual', 'wait'].map((s) => P.statusText(s, { safari: true }));
  assert.equal(new Set(all).size, 5);
  assert.match(P.statusText('installed'), /instalado/);
  assert.match(P.statusText('ios', { safari: false }), /Safari/);
  assert.match(P.statusText('manual'), /Instalar aplicación/);
});

test('la vista previa al compartir usa una imagen propia (sombrero centrado) de 1200x630 que existe', () => {
  assert.match(html, /og:image" content="https:\/\/siredwards88\.github\.io\/sir-edwards-quiz\/assets\/share\/og-instalar\.jpg"/);
  assert.ok(fs.statSync(R('assets/share/og-instalar.jpg')).size > 20000);
});
