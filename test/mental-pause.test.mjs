// Cálculo de Fondo: pausa educativa «Entendido» tras un fallo con truco (src/ui/mental-classic-ui.js + cableado en index.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = read('index.html');

// Entorno mínimo: solo lo que toca pauseForTip/understood (el resto de index.html se prueba a nivel de código fuente).

function mk(opts) {
  const calls = { setTimeout: 0, nextQuestion: 0, finishGame: 0, runTimer: 0, stopUrgency: 0, cancelFinish: 0, reveal: 0 };
  const buttons = [];
  const fb = { onclick: 'viejo', children: [], appendChild(el) { this.children.push(el); } };
  const env = {
    window: {},
    document: {
      createElement: () => { const el = { handlers: {}, disabled: false, addEventListener(t, f) { this.handlers[t] = f; }, focus() { this.focused = true; } }; buttons.push(el); return el; },
      getElementById: id => id === 'mental-tip-ok' ? buttons[buttons.length - 1] : null
    },
    setTimeout: () => { calls.setTimeout++; return 1; }, clearTimeout() {}, clearInterval() {},
    mentalCalcTimer: 77, mentalCalcAutoCheckTimer: 5, pendingModeFinish: null,
    currentGame: { mode: 'mental_calc', variant: 'classic', answered: true, lives: opts.lastLife ? 0 : 2 },
    store: {}, SEQMentalClassic: {}, SEQMentalTips: { reset() {} }, SEQFeedbackScroll: { reveal() { calls.reveal++; } },
    stopUrgencySound() { calls.stopUrgency++; }, cancelPendingModeFinish() { calls.cancelFinish++; env.pendingModeFinish = null; },
    tooSoon: !!opts.tooSoon, tapTooSoon() { return env.tooSoon; },
    flushPendingModeFinish() { const p = env.pendingModeFinish; if (!p) return false; env.pendingModeFinish = null; p.callback(); return true; },
    finishGame() { calls.finishGame++; },
    blockNext: false, nextQuestion() { calls.nextQuestion++; if (!env.blockNext) env.currentGame.answered = false; },
    runMentalCalcTimer() { calls.runTimer++; env.mentalCalcTimer = 99; }
  };
  const ctx = vm.createContext(env);
  vm.runInContext(read('src/ui/mental-classic-ui.js'), ctx);
  return { env, ctx, fb, ui: env.window.SEQMentalClassicUI, calls, btn: () => buttons[buttons.length - 1], buttons };
}

test('fallo con truco y vidas: el reloj se detiene de verdad y no queda ninguna transición automática', () => {
  const t = mk({});
  t.ui.pauseForTip(t.fb, false);
  assert.equal(t.env.mentalCalcTimer, null, 'intervalo del reloj parado');
  assert.equal(t.calls.setTimeout, 0, 'ningún temporizador pendiente');
  assert.equal(t.calls.stopUrgency, 1, 'el tic-tac de urgencia se corta');
  assert.equal(t.fb.onclick, null, 'tocar la tarjeta no avanza');
  assert.equal(t.btn().textContent, 'Entendido');
  assert.equal(t.btn().type, 'button');
  assert.equal(t.fb.children.length, 1, 'el botón vive en la tarjeta de fallo');
  assert.ok(t.btn().focused, 'el foco pasa al botón (cierra el teclado virtual)');
  assert.equal(t.env.pendingModeFinish, null, 'con vidas no hay cierre diferido');
  assert.equal(t.calls.nextQuestion + t.calls.finishGame, 0, 'no avanza solo');
});

test('«Entendido» con vidas: continúa con la operación nueva, reloj reiniciado y una sola vez aunque se pulse dos veces', () => {
  const t = mk({});
  t.ui.pauseForTip(t.fb, false);
  const click = t.btn().handlers.click;
  click({ type: 'click' }); click({ type: 'click' }); click({ type: 'click' });
  assert.equal(t.calls.nextQuestion, 1, 'doble toque: una sola operación nueva');
  assert.equal(t.calls.runTimer, 1, 'el reloj arranca una vez (la operación nueva trae sus 20 s completos de renderMentalCalcOp)');
  assert.equal(t.env.mentalCalcTimer, 99);
  assert.equal(t.btn().disabled, true);
  assert.equal(t.calls.finishGame, 0);
});

test('un toque que llega justo después de contestar no se cuenta como «Entendido» y no consume el botón', () => {
  const t = mk({ tooSoon: true });
  t.ui.pauseForTip(t.fb, false);
  t.btn().handlers.click({ type: 'click' });
  assert.equal(t.calls.nextQuestion, 0);
  t.env.tooSoon = false;
  t.btn().handlers.click({ type: 'click' });
  assert.equal(t.calls.nextQuestion, 1);
});

test('si la operación no avanza (p. ej. Sir Edwards tiene una pregunta abierta) la pausa sigue activa', () => {
  const t = mk({});
  t.env.blockNext = true;
  t.ui.pauseForTip(t.fb, false);
  t.btn().handlers.click({ type: 'click' });
  assert.equal(t.calls.nextQuestion, 1);
  assert.equal(t.calls.runTimer, 0, 'sin avance no se reinicia el reloj');
  assert.equal(t.btn().disabled, false, 'el botón sigue disponible');
  t.env.blockNext = false;
  t.btn().handlers.click({ type: 'click' });
  assert.equal(t.calls.nextQuestion, 2);
  assert.equal(t.calls.runTimer, 1);
});

test('última vida: sin temporizador; «Entendido» lleva al resultado una sola vez y sin operación adicional', () => {
  const t = mk({ lastLife: true });
  t.ui.pauseForTip(t.fb, true);
  assert.equal(t.calls.setTimeout, 0);
  assert.equal(t.env.mentalCalcTimer, null);
  assert.ok(t.env.pendingModeFinish && t.env.pendingModeFinish.deadline === Infinity, 'cierre pendiente SIN plazo (solo para que salir al menú cuente la partida)');
  assert.equal(t.calls.finishGame, 0, 'no termina por sí sola');
  const click = t.btn().handlers.click;
  click({}); click({});
  assert.equal(t.calls.finishGame, 1);
  assert.equal(t.calls.nextQuestion, 0, 'ninguna operación nueva al acabar');
  assert.equal(t.calls.runTimer, 0);
  assert.equal(t.env.pendingModeFinish, null);
});

test('última vida y salida al menú durante la lectura: el cierre pendiente cuenta la partida y «Entendido» ya no hace nada', () => {
  const t = mk({ lastLife: true });
  t.ui.pauseForTip(t.fb, true);
  assert.equal(t.env.flushPendingModeFinish(), true);      // lo que hace exitGameToMenu()
  assert.equal(t.calls.finishGame, 1);
  t.btn().handlers.click({});
  assert.equal(t.calls.finishGame, 1, 'no se cierra dos veces');
});

test('si la partida cambia mientras tanto, un «Entendido» viejo no avanza la nueva', () => {
  const t = mk({});
  t.ui.pauseForTip(t.fb, false);
  t.env.currentGame = { mode: 'mental_calc', variant: 'classic', answered: true, lives: 1 };   // partida distinta
  t.btn().handlers.click({});
  assert.equal(t.calls.nextQuestion, 0);
});

test('cableado en index.html: con truco se llama a la pausa; sin truco sigue la transición breve de 1,2 s; Turbo intacto', () => {
  const i = html.indexOf('function checkMentalCalcAnswer(');
  const fn = html.slice(i, html.indexOf('function ', i + 40));
  const pause = fn.indexOf('SEQMentalClassicUI.pauseForTip(fb, currentGame.lives <= 0)');
  assert.ok(pause > 0 && /if \(tieneTruco\) \{ SEQMentalClassicUI\.pauseForTip/.test(fn));
  assert.ok(fn.indexOf('scheduleModeFinish', pause) > pause, 'las rutas automáticas quedan después, solo para el caso sin truco');
  assert.ok(fn.indexOf('SEQMentalClassic.FAIL_AUTO_MS') > pause);
  assert.ok(!/FAIL_PAUSE_MS/.test(html) && !/FAIL_PAUSE_MS|4500/.test(read('src/utils/mental-classic.js')) && !/4500/.test(fn));
  assert.ok(fn.includes('mentalCalcEndTime -= 3000;'), 'Turbo: −3 s por fallo, sin cambios');
  assert.ok(fn.includes("if (classic && !currentGame.isDuel && typeof SEQMentalTips !== 'undefined')"), 'el truco solo sale en Fondo');
});

test('la pausa y los trucos solo existen en Cálculo de Fondo: Duelos, Retos y Turbo no los usan', () => {
  for (const f of ['src/online/duels.js', 'src/online/online.js', 'src/online/config.js']) {
    if (fs.existsSync(new URL('../' + f, import.meta.url))) assert.ok(!/SEQMentalTips|pauseForTip|mental-tip-ok/.test(read(f)), f);
  }
  const turbo = html.slice(html.indexOf('function startMentalCalcModeImpl('), html.indexOf('function runMentalCalcTimer('));
  assert.ok(!/pauseForTip|mental-tip-ok|SEQMentalTips/.test(turbo));
  assert.ok(!/pauseForTip|mental-tip-ok/.test(read('src/ui/mental-menu.js')));
});

test('reanudación: con 0 vidas y «Entendido» pendiente se guarda la partida y al reabrir se cierra y se cuenta (no se reanuda)', () => {
  const C = vm.runInNewContext(read('src/utils/mental-classic.js') + '\nSEQMentalClassic', {});
  const pending = { mode: 'mental_calc', variant: 'classic', answered: true, lives: 0, score: 120, correct: 5, total: 6, streak: 0, bestStreak: 5 };
  assert.equal(C.isPendingClose(pending), true);
  assert.equal(C.isResumable(pending), false);
  const saved = C.pack(pending, { text: '48 × 25', answer: 1200, tier: 'easy' }, 12345);
  assert.equal(saved.currentMentalOp, null, 'la operación fallada no se guarda (no se puede repetir con la respuesta ya vista)');
  assert.equal(C.isResumable(saved), false);
  assert.equal(Number(saved.lives), 0);        // → savedGameNeedsSettling(saved) y restore() → finish()
  assert.equal(C.isPendingClose({ ...pending, lives: 1 }), false);
  assert.equal(C.isPendingClose({ ...pending, answered: false }), false);
  assert.equal(C.isPendingClose({ ...pending, variant: 'turbo' }), false);
  assert.match(html, /isResumable\(currentGame\) \|\| SEQMentalClassic\.isPendingClose\(currentGame\)\) store\.savedGame = SEQMentalClassic\.pack/);
  // Con vidas: se guarda «contestada» y al volver sale una operación nueva con los 20 s completos.
  const alive = C.pack({ ...pending, lives: 2 }, { text: '48 × 25', answer: 1200, tier: 'easy' }, 0);
  const u = C.unpack(alive);
  assert.equal(u.op, null);
  assert.equal(u.remainingMs, C.OP_MS);
  assert.equal(u.game.lives, 2);
});

test('restore() de una partida sin vidas ya la cierra con finish() (el cierre «por reabrir» que usa la pausa)', () => {
  const ui = read('src/ui/mental-classic-ui.js');
  const r = ui.slice(ui.indexOf('function restore('));
  assert.ok(/if \(!SEQMentalClassic\.isResumable\(saved\)\)[\s\S]*?currentGame\.lives = 0;[\s\S]*?finish\(\);/.test(r));
});

test('textos: el botón se llama «Entendido», la ayuda del modo no promete pausas de 4,5 s', () => {
  assert.ok(read('src/ui/mental-classic-ui.js').includes("btn.textContent = 'Entendido'"));
  assert.ok(!/4,5 s|4\.5 s/.test(html));
});

test('teclado virtual: se suelta el foco del campo, el botón recibe el foco y se reasegura su visibilidad al cambiar el tamaño', () => {
  const ui = read('src/ui/mental-classic-ui.js');
  assert.ok(/getElementById\('ans-input'\)[\s\S]{0,80}\.blur\(\)/.test(ui) && /btn\.focus\(\{ preventScroll: true \}\)/.test(ui));
  assert.ok(/addEventListener\('resize', onViewportChange\)/.test(ui) && /visualViewport\.addEventListener\('resize', onViewportChange\)/.test(ui));
  assert.ok(/scrollIntoView\(\{ block: 'nearest' \}\)/.test(ui));
});

test('reanudación: la vida se descuenta y se guarda ANTES de abrir la pausa (no se recupera una vida ni se repite la operación)', () => {
  const i = html.indexOf('function checkMentalCalcAnswer(');
  const fn = html.slice(i, html.indexOf('function ', i + 40));
  const pause = fn.indexOf('SEQMentalClassicUI.pauseForTip');
  const dec = fn.lastIndexOf('currentGame.lives--;', pause), save = fn.lastIndexOf('saveStore();', pause);
  assert.ok(dec > 0 && save > dec && pause > save, 'orden: lives-- → saveStore → pauseForTip');
  assert.ok(/SEQMentalClassic\.isPendingClose\(currentGame\)/.test(html), 'saveCurrentGame guarda también la partida con la última vida perdida');
});

test('teclado virtual: el botón «Entendido» se vuelve a mostrar tras el reajuste de la app, sin tocar su manejador de teclado', () => {
  const ui = read('src/ui/mental-classic-ui.js');
  assert.ok(/revealTimer = setTimeout\(function \(\) \{ revealTimer = null; revealTip\(\); \}, 160\)/.test(ui));
  assert.ok(/if \(!tipPending/.test(ui.slice(ui.indexOf('function onViewportChange'), ui.indexOf('function pauseForTip'))), 'solo mientras dura la pausa');
});
