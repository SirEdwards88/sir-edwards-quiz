// Música de menús: estado propio (retener/soltar), sin fundidos donde el volumen no se puede cambiar y sin reintentos sin conexión.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('../src/audio/audio.js', import.meta.url), 'utf8');

function env({ canFade = true, online = true } = {}) {
  const timers = [], winListeners = {}, instances = [];
  class FakeAudio {
    constructor(s) { this.src = s; this.paused = true; this._v = 1; this.plays = 0; this.pauses = 0; this.ls = {}; instances.push(this); }
    set volume(v) { if (canFade) this._v = v; }
    get volume() { return this._v; }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.pauses++; this.paused = true; }
    addEventListener(ev, fn) { (this.ls[ev] = this.ls[ev] || []).push(fn); }
    fire(ev) { (this.ls[ev] || []).forEach((f) => f()); }
  }
  const window = { addEventListener(ev, fn) { winListeners[ev] = fn; } };
  const ctx = {
    console, window, Audio: FakeAudio, store: { sound: 'on' }, navigator: { onLine: online },
    localStorage: { getItem: () => null, setItem() {} },
    document: { visibilityState: 'visible', getElementById: () => null, addEventListener() {}, removeEventListener() {}, querySelectorAll: () => [] },
    setInterval: (fn) => { const t = { fn, on: true }; timers.push(t); return t; },
    clearInterval: (t) => { if (t) t.on = false; }
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  instances.length = 0;   // la primera instancia es el sondeo del propio módulo (¿se puede cambiar el volumen?)
  const run = (code) => vm.runInContext(code, ctx);
  const tick = (n = 60) => { for (let i = 0; i < n; i++) timers.filter((t) => t.on).forEach((t) => t.fn()); };
  const flush = () => new Promise((r) => setImmediate(r));
  return { ctx, run, tick, flush, instances, winListeners, timers };
}
async function start(e) { e.run('musicUnlocked = true; syncMusic();'); await e.flush(); e.tick(); return e.instances[0]; }

test('retener la música la pausa con fundido y NO vuelve sola con los cambios de vista; soltar la reanuda con fundido', async () => {
  const e = env(); const a = await start(e);
  assert.equal(a.paused, false); assert.ok(Math.abs(a.volume - 0.55) < 0.01);
  e.ctx.window.SEQMusic.hold();
  assert.equal(a.paused, false, 'primero baja con fundido…');
  e.tick();
  assert.equal(a.paused, true, '…y se pausa');
  for (let i = 0; i < 5; i++) { e.run('syncMusic()'); e.tick(); }   // cambios de vista mientras dura la escena
  assert.equal(a.paused, true, 'seguía pausada: nada la restaura');
  assert.equal(a.plays, 1, 'no se pidió reproducir otra vez');
  e.ctx.window.SEQMusic.release(); await e.flush(); e.tick();
  assert.equal(a.paused, false); assert.ok(Math.abs(a.volume - 0.55) < 0.01, 'vuelve a su volumen');
  assert.equal(e.instances.length, 1, 'el mismo reproductor');
});

test('soltar con la música desactivada por el jugador no la enciende', async () => {
  const e = env(); const a = await start(e);
  e.ctx.window.SEQMusic.hold(); e.tick();
  e.run("localStorage.getItem = () => 'off'");
  e.ctx.window.SEQMusic.release(); await e.flush(); e.tick();
  assert.equal(a.paused, true);
});

test('donde el volumen no se puede cambiar (iPhone) no hay fundidos: solo pausa y reproducir', async () => {
  const e = env({ canFade: false });
  assert.equal(e.ctx.window.SEQMusic.canFade, false);
  const a = await start(e);
  assert.equal(a.paused, false);
  assert.equal(e.timers.length, 0, 'ningún temporizador de fundido');
  e.ctx.window.SEQMusic.hold();
  assert.equal(a.paused, true, 'pausa inmediata');
  e.ctx.window.SEQMusic.release(); await e.flush();
  assert.equal(a.paused, false);
});

test('sin conexión no se reintenta reproducir en cada cambio de vista; al volver la red, sí', async () => {
  const e = env({ online: false });
  e.run('musicUnlocked = true');
  for (let i = 0; i < 4; i++) e.run('syncMusic()');
  await e.flush();
  assert.equal(e.instances.length, 0, 'ni siquiera se crea el reproductor');
  e.ctx.navigator.onLine = true;
  e.winListeners.online();
  await e.flush(); e.tick();
  assert.equal(e.instances.length, 1);
  assert.equal(e.instances[0].plays, 1);
});

test('si el archivo falla al cargar, se deja de insistir hasta que vuelva la conexión', async () => {
  const e = env(); const a = await start(e);
  a.fire('error'); a.paused = true;
  for (let i = 0; i < 4; i++) e.run('syncMusic()');
  await e.flush();
  assert.equal(a.plays, 1, 'no se vuelve a llamar a play()');
  e.winListeners.online(); await e.flush(); e.tick();
  assert.equal(e.instances.length, 2, 'reproductor nuevo');
  assert.equal(e.instances[1].plays, 1);
});

test('la Presentación retiene la música al empezar y la suelta al terminar', () => {
  const ui = fs.readFileSync(new URL('../src/ui/encargos-intro.js', import.meta.url), 'utf8');
  assert.match(ui, /ended = true; clearAll\(\); menuMusic\(false\);/);
  assert.match(ui, /active = \{ el: el \};\n    menuMusic\(true\);/);
  assert.ok((ui.match(/menuMusic\(true\)/g) || []).length === 1 && (ui.match(/menuMusic\(false\)/g) || []).length === 1, 'un retener y un soltar');
});
