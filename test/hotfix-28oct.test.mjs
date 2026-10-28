// 28 oct: sin «Sesión iniciada…», Duelo recuperado sin aviso de modo nuevo, aterrizar en Inicio tras entrar, aviso de racha visible.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const online = read('src/online/online.js');
const html = read('index.html');
const fx = read('src/ui/game-fx.js');
const css = read('styles/main.css');

test('no hay toast «Sesión iniciada…» (se solapaba con la pestaña del nombre)', () => {
  assert.doesNotMatch(online, /Sesión iniciada\./);
  assert.doesNotMatch(online, /te reconoce/);
});

test('al recuperar una cuenta que ya abre Duelo se anota en silencio: takeNewUnlock no devuelve «modo nuevo»', () => {
  const ls = {};
  const win = {};
  const ctx = { window: win, store: { xp: 1400 }, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } }, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, Math, Number, isFinite };
  vm.createContext(ctx); vm.runInContext(read('src/ui/duel-intro.js'), ctx);
  const M = win.SEQDuelIntro;
  M.markOpenSilently();
  assert.equal(M.takeNewUnlock(), null);
  assert.equal(ls.siredwards_quiz_duel_unlocked, '1');
  // Sin nivel suficiente no se anota nada: el aviso saldrá cuando toque.
  const ls2 = {}; const win2 = {};
  const ctx2 = { window: win2, store: { xp: 100 }, localStorage: { getItem: (k) => (k in ls2 ? ls2[k] : null), setItem: (k, v) => { ls2[k] = String(v); }, removeItem() {} }, document: ctx.document, Math, Number, isFinite };
  vm.createContext(ctx2); vm.runInContext(read('src/ui/duel-intro.js'), ctx2);
  win2.SEQDuelIntro.markOpenSilently();
  assert.equal(ls2.siredwards_quiz_duel_unlocked, undefined);
  assert.match(online, /SEQDuelIntro\.markOpenSilently\(\); \} catch \(e\) \{\}\s*\n\s*afterLocalChange\(gamesAdded\)/);
});

test('al cerrarse la pantalla de cuenta (entrar) se aterriza en Inicio, salvo en partida', () => {
  const i = html.indexOf('// Cerrando (login correcto');
  const block = html.slice(i, html.indexOf('authGateWasOpen = shouldShow;', i));
  assert.match(block, /in-game'\)\) switchTab\('home'\)/);
});

test('el aviso de racha es fijo respecto a la pantalla (con teclado o vista desplazada no queda fuera)', () => {
  assert.match(css, /\.fx-streak-banner \{ position: fixed;/);
  assert.match(fx, /document\.body\.appendChild\(b\)/);
  assert.match(fx, /window\.innerHeight/);
});
