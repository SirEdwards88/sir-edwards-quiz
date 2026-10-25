// Una derrota/final ya decidida nunca se pierde: salir al menú durante la espera la cierra al momento,
// y una partida guardada ya decidida se cierra (y se cuenta) al volver en vez de descartarse.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fn = (name) => {
  const a = html.indexOf('function ' + name + '(');
  assert.ok(a >= 0, 'falta ' + name);
  let i = html.indexOf('{', a), depth = 0;
  for (; i < html.length; i++) { if (html[i] === '{') depth++; else if (html[i] === '}' && --depth === 0) break; }
  return html.slice(a, i + 1);
};

function sandbox(saved) {
  const ctx = { store: { savedGame: saved }, discarded: 0, calls: [] };
  ctx.getStore = () => ctx.store;
  ctx.discardSavedGameAsFinished = () => { ctx.discarded++; return false; };
  ctx.getLucidezPhase = (i) => (i < 10 ? 1 : i < 20 ? 2 : i < 29 ? 3 : 'final');
  ctx.SEQMentalClassic = { isResumable: (g) => Number(g.lives) > 0 };
  vm.createContext(ctx);
  vm.runInContext(fn('savedGameNeedsSettling') + fn('hasSavedGame') + ';this.needs=savedGameNeedsSettling;this.has=hasSavedGame;', ctx);
  return ctx;
}
const q = [{}, {}];

test('Supervivencia / Muerte Súbita con el fallo marcado se conservan para cerrarse, no se descartan', () => {
  for (const g of [{ mode: 'survival', survivalFailed: true, queue: q, currentIdx: 1 }, { mode: 'sudden_death', suddenDeathFailed: true, queue: q, currentIdx: 1 }]) {
    const c = sandbox(g);
    assert.equal(c.needs(g), true);
    assert.equal(c.has(), true);
    assert.equal(c.discarded, 0);
  }
});

test('una partida normal sigue siendo continuable y no se marca como por cerrar', () => {
  const g = { mode: 'survival', lives: 2, queue: q, currentIdx: 1 };
  const c = sandbox(g);
  assert.equal(c.needs(g), false);
  assert.equal(c.has(), true);
});

test('Contrarreloj y Turbo con el reloj agotado se conservan para cerrarse (el resultado cuenta)', () => {
  const tt = { mode: 'timetrial', timeTrialEndTime: Date.now() - 5000, queue: q, currentIdx: 1 };
  let c = sandbox(tt);
  assert.equal(c.needs(tt), true); assert.equal(c.has(), true); assert.equal(c.discarded, 0);
  const mc = { mode: 'mental_calc', mentalCalcEndTime: Date.now() - 5000 };
  c = sandbox(mc);
  assert.equal(c.needs(mc), true); assert.equal(c.has(), true);
  const live = { mode: 'mental_calc', mentalCalcEndTime: Date.now() + 5000 };
  c = sandbox(live);
  assert.equal(c.needs(live), false); assert.equal(c.has(), true);
});

test('Lucidez: enigma respondido, vidas de la Fase II a 0 o reloj agotado se conservan para cerrarse', () => {
  const base = { mode: 'lucidez_mental', phase1Queue: [], phase2Queue: [], phase3Queue: [] };
  const cases = [
    { ...base, currentIdx: 29, answered: true },
    { ...base, currentIdx: 12, lucidezLives: 0 },
    { ...base, currentIdx: 22, lucidezPhase3EndTime: Date.now() - 1000 },
    { ...base, currentIdx: 29, lucidezFinalEndTime: Date.now() - 1000 }
  ];
  for (const g of cases) {
    const c = sandbox(g);
    assert.equal(c.needs(g), true, JSON.stringify(g));
    assert.equal(c.has(), true);
    assert.equal(c.discarded, 0);
  }
  const ok = { ...base, currentIdx: 12, lucidezLives: 1 };
  assert.equal(sandbox(ok).needs(ok), false);
});

test('Fondo sin vidas se cierra al volver; con vidas se reanuda', () => {
  const dead = { mode: 'mental_calc', variant: 'classic', lives: 0 };
  let c = sandbox(dead);
  assert.equal(c.needs(dead), true); assert.equal(c.has(), true); assert.equal(c.discarded, 0);
  const alive = { mode: 'mental_calc', variant: 'classic', lives: 2 };
  c = sandbox(alive);
  assert.equal(c.needs(alive), false); assert.equal(c.has(), true);
});

test('salir al menú ejecuta el cierre pendiente en vez de cancelarlo', () => {
  const ctx = { pendingModeFinish: null, pendingModeFinishTimer: null, ran: 0, order: [] };
  vm.createContext(ctx);
  vm.runInContext(fn('flushPendingModeFinish') + ';this.flush=flushPendingModeFinish;', ctx);
  assert.equal(ctx.flush(), false);
  ctx.pendingModeFinish = { callback: () => { ctx.ran++; }, deadline: Date.now() + 1500 };
  assert.equal(ctx.flush(), true);
  assert.equal(ctx.ran, 1);
  assert.equal(ctx.pendingModeFinish, null);
  assert.equal(ctx.flush(), false);
  assert.equal(ctx.ran, 1, 'el cierre no se ejecuta dos veces');

  const exit = fn('exitGameToMenu');
  assert.ok(exit.indexOf('flushPendingModeFinish()') > 0 && exit.indexOf('flushPendingModeFinish()') < exit.indexOf('cancelPendingModeFinish()'));
  assert.ok(exit.indexOf('flushPendingModeFinish()') < exit.indexOf("switchTab('modes')"), 'si se cierra la partida, se ve su resultado en lugar de saltar al menú');
});

test('empezar otra partida con una ya decidida la cierra y muestra su resultado, no la descarta', () => {
  const d = fn('confirmDiscardSavedGame');
  assert.ok(d.includes('savedGameNeedsSettling(store.savedGame)') && d.includes("switchTab('game')"));
});

test('el texto del error extra de Lucidez explica lo que hace', () => {
  // Ahora lo dice un aviso grande («ESCUDO USADO», como los ±segundos) en vez de una línea pequeña bajo la pregunta.
  assert.ok(html.includes('ESCUDO USADO') && html.includes('playLucidezShieldFX()'));
  assert.ok(!html.includes('Error extra perdonado: no te cuesta una vida.'));
  assert.ok(!html.includes('Error extra: no cuenta. Era:'));
});
