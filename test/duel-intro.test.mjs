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

// DOM mínimo para probar la presentación: solo lo que usa duel-intro.js.
function loadDom(ls = {}) {
  const body = { children: [], appendChild(el) { this.children.push(el); el.parentNode = this; return el; }, removeChild(el) { this.children = this.children.filter((c) => c !== el); el.parentNode = null; } };
  const btn = () => ({ h: null, addEventListener(_e, fn) { this.h = fn; }, focus() {}, click() { if (this.h) this.h(); } });
  const mk = () => ({ attrs: {}, parentNode: null, _html: '', go: null, skip: null,
    setAttribute(k, v) { this.attrs[k] = v; },
    set innerHTML(v) { this._html = v; this.go = /dint-go/.test(v) ? btn() : null; this.skip = /dint-skip/.test(v) ? btn() : null; },
    get innerHTML() { return this._html; },
    querySelector(sel) { return sel === '.dint-go' ? this.go : sel === '.dint-skip' ? this.skip : sel === '.dint-card' ? { scrollTop: 0 } : null; },
    querySelectorAll() { return [this.go, this.skip].filter(Boolean); }, contains() { return true } });
  const keys = [];
  const win = {};
  const ctx = { window: win, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    document: { addEventListener(ev, fn) { if (ev === 'keydown') keys.push(fn); }, getElementById: () => null, querySelector: () => null, createElement: mk, body, activeElement: null, contains: () => false }, Math, Number, isFinite };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  const shown = () => body.children[0];
  const title = () => { const m = shown() && shown().innerHTML.match(/<h2 id="dint-title">([^<]*)<\/h2>/); return m ? m[1] : null; };
  return { M: win.SEQDuelIntro, ls, body, shown, title, keys };
}

test('la presentación explica duelo en directo, retos, amigos, ranking/ELO y dónde está la Ayuda', () => {
  const { M } = load();
  const all = JSON.stringify(M.PAGES);
  assert.ok(!all.includes('Sin amigos, no hay duelo'), 'la amistad no es obligatoria');
  for (const t of ['Bienvenido a Duelos', 'Clásico', 'Apuestas', 'Bienvenido a Duelos', 'Dije que no habría tutorial. Mentí.', 'Duelos online', 'Dos jugadores. Un vencedor.', 'No hace falta coincidir', 'La reputación está en juego', 'Amigos', 'tres días', 'cinco partidas', 'Ranking y ELO', '¿Alguna duda?', 'botón ? de Duelos', 'dejarme mal']) assert.ok(all.includes(t), t);
  assert.equal(M.PAGES.length, 6);
  assert.equal(M.PAGES[M.PAGES.length - 1].btn, 'A por ellos');
});

test('primera visita: se muestra, al completarla se marca y no vuelve a salir sola', () => {
  const d = loadDom();
  assert.equal(d.M.introIfNeeded(), true);
  assert.equal(d.title(), 'Bienvenido a Duelos');
  for (let i = 0; i < 5; i++) d.shown().go.click();
  assert.equal(d.title(), '¿Alguna duda?');
  assert.equal(d.ls.siredwards_quiz_duel_intro_seen, undefined, 'a medias no cuenta como vista');
  d.shown().go.click();
  assert.equal(d.body.children.length, 0);
  assert.equal(d.ls.siredwards_quiz_duel_intro_seen, '1');
  assert.equal(d.M.introIfNeeded(), false, 'no se repite sola');
});

test('saltar o pulsar Escape la da por vista; cerrar no la deja a medias', () => {
  const a = loadDom(); a.M.introIfNeeded(); a.shown().skip.click();
  assert.equal(a.ls.siredwards_quiz_duel_intro_seen, '1'); assert.equal(a.body.children.length, 0);
  const b = loadDom(); b.M.introIfNeeded();
  b.keys[0]({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(b.ls.siredwards_quiz_duel_intro_seen, '1'); assert.equal(b.body.children.length, 0);
  const c = loadDom(); c.M.introIfNeeded(); c.shown().go.click();
  assert.equal(c.ls.siredwards_quiz_duel_intro_seen, undefined);
});

test('replay (desde la Ayuda): se puede ver siempre y NO cambia ninguna marca ni abre el desbloqueo', () => {
  const d = loadDom();
  assert.equal(d.M.gate({ xp: 0 }).open, false);
  assert.equal(d.M.replay(), true);
  for (let i = 0; i < 5; i++) d.shown().go.click();
  assert.match(d.shown().innerHTML, />Entendido</, 'al repasarla, el último botón es Entendido');
  d.shown().go.click();
  assert.equal(d.body.children.length, 0);
  assert.deepEqual(d.ls, {}, 'no se escribe ninguna marca');
  assert.equal(d.M.gate({ xp: 0 }).open, false, 'repasar el tutorial no desbloquea Duelos');
  // y quien ya la vio también puede repasarla
  const e = loadDom({ siredwards_quiz_duel_intro_seen: '1' });
  assert.equal(e.M.introIfNeeded(), false);
  assert.equal(e.M.replay(), true); assert.equal(e.title(), 'Bienvenido a Duelos');
  e.shown().skip.click();
  assert.equal(e.body.children.length, 0);
  assert.deepEqual(e.ls, { siredwards_quiz_duel_intro_seen: '1' });
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

test('las viñetas 3 y 4 usan las ilustraciones definitivas del reloj y del sobre, y existen', () => {
  const { M } = load();
  assert.equal(M.PAGES[2].img, 'assets/character/sir-edwards-duelos-reloj.webp');
  assert.equal(M.PAGES[3].img, 'assets/character/sir-edwards-retos-sobre.webp');
  for (const f of ['sir-edwards-duelos-reloj', 'sir-edwards-retos-sobre']) assert.ok(fs.existsSync(new URL('../assets/character/' + f + '.webp', import.meta.url)), f);
});
test('cada viñeta tiene título funcional, frase de Sir Edwards y explicación', () => {
  const { M } = load();
  for (const p of M.PAGES) assert.ok(p.title && p.quip && p.body && p.quip.length < p.body.length, p.title);
  assert.deepEqual(JSON.parse(JSON.stringify(M.PAGES.map((p) => p.title))), ['Bienvenido a Duelos', 'Amigos', 'Duelos online', 'Retos', 'Ranking y ELO', '¿Alguna duda?']);
});
