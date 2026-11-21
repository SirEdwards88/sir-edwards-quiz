// Duelos: desbloqueo (10 partidas o 100 aciertos), presentación de la primera vez y ayuda. Script clásico en un vm mínimo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../src/ui/duel-intro.js', import.meta.url), 'utf8');
const HTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function load(ls = {}) {
  const win = {};
  const ctx = { window: win, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } }, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, Math, Number, isFinite };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { M: win.SEQDuelIntro, ls };
}

test('bloqueado por debajo del nivel 7; se abre al llegar a 1350 XP', () => {
  const { M } = load();
  assert.equal(M.gate({ xp: 0 }).open, false);
  assert.equal(M.gate({ xp: 1349 }).open, false);
  assert.equal(M.gate({ xp: 1350 }).open, true);
  const g = JSON.parse(JSON.stringify(M.gate({ xp: 250 })));
  assert.equal(g.level, 3); assert.equal(g.needLevel, 7); assert.equal(g.missing, 1100); assert.equal(g.needXp, 1350);
  assert.equal(M.gate({}).open, false);
  assert.equal(M.gate(null).open, false);
});

test('quien ya usó los duelos nunca se bloquea (marca histórica, historial o desbloqueo anotado)', () => {
  assert.equal(load({ siredwards_quiz_v1_1_duel_help_seen: '1' }).M.gate({ xp: 10 }).open, true);
  assert.equal(load({ siredwards_quiz_duel_unlocked: '1' }).M.gate({}).open, true);
  assert.equal(load().M.gate({ duelStats: { played: 2 } }).open, true);
  assert.equal(load().M.gate({ duelStats: { multiWins: 1 } }).open, true);
});

test('subir a nivel 7 en partida y pintar Inicio o abrir Duelo antes de terminar no gasta el aviso de «modo nuevo»', () => {
  const ls = {};
  const win = {};
  const ctx = { window: win, store: { xp: 1360 }, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } }, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, Math, Number, isFinite };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  const M = win.SEQDuelIntro;
  assert.equal(M.intercept(), false, 'Duelo está abierto');
  M.refresh();
  assert.equal(ls.siredwards_quiz_duel_unlocked, undefined, 'abrir la puerta no anota nada antes de celebrarlo');
  assert.deepEqual(JSON.parse(JSON.stringify(M.takeNewUnlock())), { id: 'duelo', name: 'Duelo', badge: 'Duelo' });
  assert.equal(M.takeNewUnlock(), null, 'solo una vez');
  assert.equal(ls.siredwards_quiz_duel_unlocked, '1');
  assert.equal(M.gate({}).open, true, 'ya no se vuelve a cerrar');
});

// 1.0: la presentación antigua (seis viñetas) se sustituyó por el recorrido interactivo de src/ui/duel-tour.js (test/duel-tour.test.mjs).
// duel-intro.js conserva introIfNeeded() y replay() como FACHADA y ya no escribe ninguna marca al verlo.
function loadFacade(tour, ls = {}) {
  const win = {};
  if (tour) win.SEQDuelTour = tour;
  const ctx = { window: win, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } }, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, Math, Number, isFinite };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { M: win.SEQDuelIntro, ls };
}

test('fachada: introIfNeeded() y replay() delegan en el recorrido nuevo y devuelven su resultado', () => {
  const calls = [];
  const { M } = loadFacade({ startIfNeeded: () => { calls.push('start'); return true; }, replay: () => { calls.push('replay'); return true; } });
  assert.equal(M.introIfNeeded(), true); assert.equal(M.replay(), true);
  assert.deepEqual(calls, ['start', 'replay']);
  const off = loadFacade({ startIfNeeded: () => false, replay: () => false }).M;
  assert.equal(off.introIfNeeded(), false); assert.equal(off.replay(), false);
  // sin el módulo del recorrido (o si falla) no se rompe nada
  const none = loadFacade(null).M;
  assert.equal(none.introIfNeeded(), false); assert.equal(none.replay(), false);
  const boom = loadFacade({ startIfNeeded() { throw new Error('x'); }, replay() { throw new Error('x'); } }).M;
  assert.equal(boom.introIfNeeded(), false); assert.equal(boom.replay(), false);
});

test('el recorrido NO altera el desbloqueo: la fachada no escribe K_HELP, K_INTRO ni K_UNLOCKED, y no consulta K_INTRO/K_HELP para decidir', () => {
  const ls = {};
  const { M } = loadFacade({ startIfNeeded: () => true, replay: () => true }, ls);
  M.introIfNeeded(); M.replay();
  assert.deepEqual(ls, {}, 'ninguna marca escrita');
  assert.equal(M.gate({ xp: 0 }).open, false, 'ver el tutorial no abre Duelos');
  // quien ya completó la presentación antigua (K_INTRO / K_HELP) también debe ver el recorrido nuevo: la fachada no mira esas marcas
  const old = loadFacade({ startIfNeeded: () => 'visto', replay: () => true }, { siredwards_quiz_duel_intro_seen: '1', siredwards_quiz_v1_1_duel_help_seen: '1' });
  assert.equal(old.M.introIfNeeded(), true);
  const code = SRC.replace(/\/\/.*$/gm, '');
  assert.ok(!/set\(K_HELP|set\(K_INTRO/.test(code.replace(/function (onAccountSwitch|markOpenSilently)[\s\S]*?\n  }/g, '')), 'ninguna escritura de K_HELP/K_INTRO fuera de la migración de cuentas existente');
  assert.ok(!/PAGES|dint-/.test(code), 'sin restos de la presentación antigua');
});

test('el «?» de Duelos ya no anota «Duelo usado»: abrir la Ayuda no escribe marcas y no se come el aviso de modo nuevo', () => {
  // Antes closeDuelHelpModal() escribía siredwards_quiz_v1_1_duel_help_seen: gate() lo toma por «ya usó Duelo», así que quedaba
  // abierto para siempre y takeNewUnlock() lo anotaba en silencio (se perdía el aviso con confeti al llegar al nivel 7).
  assert.ok(!/duel_help_seen/.test(HTML), 'index.html ya no escribe la marca histórica');
  assert.ok(!/closeDuelHelpModal|showDuelHelpModal|duel-help-modal/.test(HTML), 'sin restos del aviso antiguo');
  assert.match(HTML, /id="duel-help-btn" onclick="SEQHelp\.open\(\)"/);
  const HELP = fs.readFileSync(new URL('../src/ui/help.js', import.meta.url), 'utf8');
  assert.ok(!/localStorage|sessionStorage|duel_help_seen|siredwards_quiz_duel/.test(HELP), 'la Ayuda no toca almacenamiento');
  // Nivel 7 alcanzado, aviso aún sin celebrar: con la Ayuda de por medio, el aviso sale una sola vez.
  const ls = {}; const win = {};
  const ctx = { window: win, store: { xp: 1400 }, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } }, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, Math, Number, isFinite };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(win.SEQDuelIntro.takeNewUnlock())), { id: 'duelo', name: 'Duelo', badge: 'Duelo' });
});

test('index.html: enlaza módulos y estilos de Duelo y Ayuda, engancha switchTab y Ajustes abre la Ayuda', () => {
  assert.match(HTML, /src\/ui\/duel-intro\.js\?v=/);
  assert.match(HTML, /styles\/duel-intro\.css\?v=/);
  assert.match(HTML, /src\/data\/help\.js\?v=/);
  assert.match(HTML, /src\/ui\/help\.js\?v=/);
  assert.match(HTML, /styles\/help\.css\?v=/);
  assert.match(HTML, /SEQDuelIntro\.intercept\(\)/);
  assert.match(HTML, /SEQDuelIntro\.introIfNeeded\(\)/);
  assert.match(HTML, /id="help-modal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*data-modal-esc/);
  assert.match(HTML, /id="help-modal-body"/);
  assert.ok(!/Abrir la Ayuda/.test(HTML), 'Ajustes ya no tiene tarjeta de Ayuda');
  assert.ok(!/setDuelTopbar[\s\S]{0,900}help\.style\.display = \(/.test(HTML), 'el «?» siempre visible');
  const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  for (const f of ['src/ui/duel-intro.js', 'src/data/help.js', 'src/ui/help.js', 'styles/duel-intro.css', 'styles/help.css']) assert.ok(sw.includes(f), f + ' en sw.js');
});

test('nivel 7 local sin sincronizar: se pide una sincronización normal y se explica, sin tocar la validación del servidor; sin nivel local no hay mensaje', () => {
  const mk = (xp) => {
    const syncs = []; const win = { SEQOnline: { syncSoon: () => syncs.push(1) } };
    const ctx = { window: win, store: { xp }, localStorage: { getItem: () => null, setItem() {} }, document: { addEventListener() {}, getElementById: () => null, querySelector: () => null }, Math, Number, isFinite };
    vm.createContext(ctx); vm.runInContext(SRC, ctx);
    return { M: win.SEQDuelIntro, syncs };
  };
  const hi = mk(1400);
  assert.equal(hi.M.levelSyncMessage(), 'Tu nivel aún no se ha sincronizado con tu cuenta. Inténtalo de nuevo en unos segundos.');
  assert.equal(hi.syncs.length, 1, 'pide la sincronización normal del progreso propio');
  const lo = mk(100);
  assert.equal(lo.M.levelSyncMessage(), null); assert.equal(lo.syncs.length, 0, 'sin nivel 7 ni local, el mensaje del servidor es el correcto');
  // las marcas locales sin nivel (K_UNLOCKED) no bastan para este mensaje: solo el nivel real del dispositivo
  const marks = mk(0); assert.equal(marks.M.levelSyncMessage(), null);
});
