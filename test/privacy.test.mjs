// Política de privacidad: módulo propio, enlazada desde Ajustes y desde la pantalla de acceso, disponible sin conexión.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html'), sw = read('sw.js'), mod = read('src/ui/privacy.js');
const ctx = {}; vm.createContext(ctx); vm.runInContext(mod + ';this.P=SEQPrivacy;', ctx);

test('vive en src/ui/privacy.js, con su hoja, y entra en la caché sin conexión', () => {
  assert.match(html, /<script src="src\/ui\/privacy\.js(\?v=\d+)?"><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="styles\/privacy\.css(\?v=\d+)?">/);
  assert.ok(sw.includes("'./src/ui/privacy.js'") && sw.includes("'./styles/privacy.css'"));
  assert.ok(!html.includes('Guardamos tu progreso y tu actividad online') || html.includes('SEQPrivacy.open()'));
});

test('enlazada desde Ajustes y desde la pantalla de acceso, y la Tab del muro la deja pasar', () => {
  assert.equal((html.match(/SEQPrivacy\.open\(\)/g) || []).length, 2);
  const gate = html.slice(html.indexOf('id="auth-gate"'), html.indexOf('</div>\n<script>', html.indexOf('id="auth-gate"')));
  assert.ok(gate.includes('SEQPrivacy.open()'), 'enlace en la pantalla de acceso');
  assert.ok(html.includes("getElementById('privacy-modal'); if (pm && pm.style.display === 'flex') return;"));
  assert.ok(!html.includes('Solo usamos tu cuenta para identificarte'), 'la frase antigua, que se quedaba corta, ya no está');
});

test('el texto dice lo que el servidor guarda de verdad (sin correo ni nombre real) y da el contacto', () => {
  const text = JSON.stringify(ctx.P.sections);
  assert.match(text, /No recibimos ni guardamos tu correo ni tu nombre real/);
  assert.match(text, /no está verificado/);
  assert.match(text, /Eliminar mi cuenta online/);
  assert.equal(ctx.P.contact, 'eduardmartinez88@gmail.com');
  assert.ok(text.includes(ctx.P.contact));
});

test('los botones que cita la política existen en Ajustes', () => {
  assert.ok(read('src/online/online.js').includes('Eliminar mi cuenta online'));
});

test('el texto se pinta con textContent, sin innerHTML', () => {
  assert.ok(!/innerHTML\s*=/.test(mod));
});

test('si el almacenamiento local falla, se avisa una vez por racha (y se rearma al volver a guardar)', () => {
  const a = html.indexOf('function saveStore('); const body = html.slice(a, html.indexOf('\n}\n', a));
  assert.ok(body.includes('storageFailWarned = false;') && body.includes('if (!storageFailWarned) {') && body.includes('showInfoToast('));
  const ctx2 = { msgs: [], fail: true, storageFailWarned: false, store: {}, answerStreak: 0, saveCurrentGame() {}, updateBadges() {}, updateStreakDisplay() {}, updateResumeButton() {},
    localStorage: { setItem() { if (ctx2.fail) throw new Error('quota'); } }, console: { warn() {} }, showInfoToast(m) { ctx2.msgs.push(m); } };
  vm.createContext(ctx2);
  vm.runInContext('let storageFailWarned = false;' + html.slice(a, html.indexOf('\n}\n', a) + 3) + ';this.save=saveStore;', ctx2);
  ctx2.save(); ctx2.save(); assert.equal(ctx2.msgs.length, 1, 'un solo aviso mientras siga fallando');
  ctx2.fail = false; ctx2.save(); ctx2.fail = true; ctx2.save(); assert.equal(ctx2.msgs.length, 2, 'se vuelve a avisar tras una racha buena');
});
