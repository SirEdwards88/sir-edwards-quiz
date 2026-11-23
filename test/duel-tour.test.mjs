// Tutorial interactivo de Duelos 1.0: textos definitivos, siete viñetas, despedida, persistencia con clave propia, repetición desde «?»,
// aplazamiento si hay partida/invitación/sala, y garantía de que NO escribe en el Worker ni toca las marcas de desbloqueo.
// La comprobación visual real (360×640 y 390×844) está en el E2E del backend (e2e/duel-invites.e2e.mjs): aquí se prueba la lógica con un DOM mínimo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const DATA = read('src/data/duel-tour-steps.js');
const SRC = read('src/ui/duel-tour.js');
const KEY = 'siredwards_quiz_duel_tour_seen';

function data() { const win = {}; const ctx = vm.createContext({ window: win }); vm.runInContext(DATA, ctx); return win.SEQDuelTourData; }
const D = data();
const J = (x) => JSON.parse(JSON.stringify(x));   // los arrays del vm son de otro contexto: se clonan para deepEqual

// ---- DOM mínimo -------------------------------------------------------------------------------------------------------------------
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.parentNode = null; this.className = ''; this.style = {}; this.attrs = {}; this.listeners = {}; this._html = ''; this._text = ''; this.disabled = false; this.offsetHeight = 220; this.scrollTop = 0; this.scrollHeight = 260; this.id = ''; this.rect = { left: 20, top: 120, width: 300, height: 90 }; this.offsetParent = {}; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(e, f) { (this.listeners[e] = this.listeners[e] || []).push(f); }
  click() { if (!this.disabled) (this.listeners.click || []).forEach((f) => f()); }
  focus() { this.ownerDoc.activeElement = this; }
  contains(x) { for (let n = x; n; n = n.parentNode) if (n === this) return true; return false; }
  get firstChild() { return this.children[0] || null; }
  set textContent(t) { this._text = String(t); this.children = []; } get textContent() { return this._text || this.children.map((c) => c.textContent).join(''); }
  set innerHTML(h) { this._html = String(h); this.children = []; } get innerHTML() { return this._html; }
  get classList() { const s = this; return { toggle(c, on) { const l = s.className.split(/\s+/).filter(Boolean).filter((x) => x !== c); if (on) l.push(c); s.className = l.join(' '); }, add(c) { this.toggle(c, true); }, remove(c) { this.toggle(c, false); }, contains(c) { return s.className.split(/\s+/).includes(c); } }; }
  getBoundingClientRect() { return this.rect; }
  _all(sel) {
    const out = [];
    const walk = (n) => { for (const c of n.children) { if (matches(c, sel)) out.push(c); walk(c); } };
    walk(this); return out;
  }
  querySelector(sel) { const r = this._all(sel); return r[0] || null; }
  querySelectorAll(sel) { return this._all(sel); }
}
function matches(e, sel) {
  if (sel === 'button:not([disabled])') return e.tag === 'button' && !e.disabled;
  if (sel === '.dtour-demo img') return false;
  if (sel.startsWith('.')) return e.className.split(/\s+/).includes(sel.slice(1));
  return e.tag === sel;
}
function world({ ls = {}, state = { screen: null, lists: { duels: [], multis: [], retos: [], link: null } }, session = { features: { classic_duel: true, duel_links: true, duel_invites_v2: true } }, tabActive = true, own = false, hubVisible = true, modal = { open: false } } = {}) {
  const calls = { api: [], toasts: [], writes: [], backs: 0 };
  const body = new El('body'), doc = { activeElement: null, listeners: {}, body };
  const mk = (tag) => { const e = new El(tag); e.ownerDoc = doc; return e; };
  body.ownerDoc = doc;
  const hub = mk('div'); hub.id = 'seq-duel-cards';
  const view = mk('div'); view.className = tabActive ? 'view active' : 'view';
  Object.assign(doc, {
    createElement: mk, contains: (x) => body.contains(x),
    addEventListener(e, f) { (doc.listeners[e] = doc.listeners[e] || []).push(f); }, removeEventListener(e, f) { doc.listeners[e] = (doc.listeners[e] || []).filter((x) => x !== f); },
    getElementById: (id) => (id === 'view-duelo' ? view : null),
    querySelectorAll: (sel) => (sel === '.modal-overlay' && modal.open ? [{ getClientRects: () => [1] }] : []),
    querySelector: (sel) => (hubVisible && (sel === '#seq-duel-cards' || sel === '#duel-home') ? hub : null),
  });
  const timers = [];
  const store = { ...ls };
  const win = {
    innerWidth: 360, innerHeight: 640, addEventListener() {}, removeEventListener() {}, requestAnimationFrame: (f) => { f(); return 1; },
    SEQOnline: session ? { session: () => session, api: (...a) => { calls.api.push(a); return Promise.resolve({}); } } : undefined,
    SEQDuels: { _state: () => state, back: () => { calls.backs++; state.screen = null; } },
  };
  const ctx = {
    window: win, document: doc, console, Date, JSON, Math, Number, isFinite, setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {},
    getComputedStyle: () => ({ position: 'static' }),
    localStorage: { getItem: (k) => (k in store ? store[k] : (k === 'siredwards_quiz_duel_link_own' && own ? JSON.stringify({ endsAt: Date.now() + 60000 }) : null)), setItem: (k, v) => { calls.writes.push(k); store[k] = String(v); }, removeItem: (k) => { calls.writes.push('rm:' + k); delete store[k]; } },
    showInfoToast: (m) => calls.toasts.push(m), fetch: () => { throw new Error('fetch'); },
  };
  vm.createContext(ctx); vm.runInContext(DATA, ctx); vm.runInContext(SRC, ctx);
  const T = win.SEQDuelTour;
  const root = () => body.children.find((c) => c.id === 'duel-tour') || null;
  const q = (cls) => root().querySelector('.' + cls);
  return { T, win, doc, body, root, q, calls, store, state, timers, esc: (key = 'Escape') => { let prevented = false; (doc.listeners.keydown || []).forEach((f) => f({ key, preventDefault() { prevented = true; }, stopPropagation() {} })); return prevented; } };
}

// ---- Datos: textos definitivos ------------------------------------------------------------------------------------------------------
test('siete viñetas con los títulos y textos DEFINITIVOS, y la despedida sin crear una octava', () => {
  assert.equal(D.steps.length, 7);
  assert.deepEqual(J(D.steps.map((s) => s.title)), ['Bienvenido a Duelos', 'Dos formas de competir', 'Elige a tus rivales', 'Invita a quien quieras', 'Todo listo para empezar', 'El honor está en juego', '¿No coincidís?']);
  assert.deepEqual(J(D.steps.map((s) => s.body)), [
    'Ha llegado la hora de enfrentarte a otros jugadores. Espero que tus conocimientos estén a la altura de tu entusiasmo.',
    'Clásico pone a prueba tus conocimientos. Apuestas añade una decisión delicada: cuánto arriesgar. Confío en que sepas distinguir valentía de temeridad.',
    'Enfréntate a un jugador o participa en un todos contra todos de tres o cuatro jugadores. Cuantos más rivales, más posibilidades de quedar en evidencia.',
    'Invita a tus amigos o comparte un enlace con quien quieras. En Todos contra todos puedes combinar ambas opciones. El talento no exige estar en tu lista de contactos.',
    'La sala muestra quién ha llegado y quién falta. Comparte el enlace, inicia el duelo cuando estéis listos o cancela la invitación si cambias de opinión.',
    'Cada duelo 1 contra 1 puede hacerte subir o bajar en el ranking. Todos contra todos tiene sus propias estadísticas, sin afectar a tu ELO.',
    'Para eso están los Retos: envía uno y deja que tu rival juegue cuando pueda. Hasta la rivalidad merece cierta flexibilidad.']);
  assert.equal(D.farewell.body, 'El escenario está preparado y tus rivales te esperan. Procura que la primera impresión no sea la última.');
  assert.equal(D.farewell.button, 'Empezar a jugar');
  assert.equal(D.labels.back, 'Atrás'); assert.equal(D.labels.next, 'Continuar'); assert.equal(D.labels.progress(3, 7), '3 de 7');
  assert.ok(!('skip' in D.labels) && !/Saltar/.test((DATA + SRC).replace(/\/\/.*$/gm, '')), 'el recorrido inicial no tiene opción de omitirlo');
  for (const f of D.steps.map((s) => s.img).concat(D.farewell.img)) assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)), f);
  assert.doesNotMatch(DATA + SRC, /\p{Extended_Pictographic}/u, 'sin emojis');
});

test('la viñeta 4 no afirma que se puedan combinar amigo y enlace en 1 contra 1', () => {
  assert.match(D.steps[3].body, /En Todos contra todos puedes combinar ambas opciones/);
  assert.ok(!/1 contra 1|ambas opciones simultáneamente/.test(D.steps[3].body));
});

test('cada viñeta tiene diana: real (selectores) o demostración aislada con datos ficticios', () => {
  assert.deepEqual(J(D.steps.map((s) => s.target)), ['real', 'demo', 'demo', 'demo', 'demo', 'real', 'real']);
  for (const s of D.steps) { assert.ok(s.selectors.length, s.id); if (s.target === 'demo') assert.ok(['modos', 'rivales', 'invitar', 'sala'].includes(s.demo), s.id); }
  assert.deepEqual(J(D.steps[5].selectors), ['.seq-d-v-rank']); assert.deepEqual(J(D.steps[6].selectors), ['.seq-d-v-retos']);
});

// ---- Lógica pura ------------------------------------------------------------------------------------------------------------------------
test('colocación: debajo, encima, al pie o centrada según el espacio; el resalte se recorta a la pantalla', () => {
  const { _pure: P } = world().T;
  assert.deepEqual(JSON.parse(JSON.stringify(P.placeCard({ left: 10, top: 100, width: 100, height: 60 }, 640, 220))), { mode: 'below', top: 174 });
  assert.deepEqual(JSON.parse(JSON.stringify(P.placeCard({ left: 10, top: 400, width: 100, height: 100 }, 640, 220))), { mode: 'above', top: 166 });
  assert.equal(P.placeCard({ left: 10, top: 150, width: 300, height: 380 }, 640, 220).mode, 'bottom');
  assert.equal(P.placeCard(null, 640, 220).mode, 'center');
  assert.deepEqual(JSON.parse(JSON.stringify(P.clampRect({ left: -20, top: -10, width: 500, height: 900 }, 360, 640, 4))), { left: 4, top: 4, width: 352, height: 632 });
  assert.equal(P.clampRect({ left: 500, top: 10, width: 50, height: 50 }, 360, 640, 4), null, 'fuera de pantalla: no se señala');
  assert.equal(P.clampRect(null, 360, 640, 4), null);
  assert.deepEqual(JSON.parse(JSON.stringify(P.unionRect([{ left: 10, top: 10, width: 50, height: 20 }, { left: 40, top: 50, width: 100, height: 30 }, { left: 0, top: 0, width: 0, height: 0 }]))), { left: 10, top: 10, width: 130, height: 70 });
  assert.equal(P.unionRect([{ left: 0, top: 0, width: 0, height: 0 }]), null, 'no medible: sin posición');
  assert.equal(P.demoScale(300, 400), 1); assert.equal(P.demoScale(400, 300), 0.75); assert.equal(P.demoScale(400, 50), 0.55); assert.equal(P.demoScale(0, 100), 1);
});

test('grupo demostración + tarjeta: centrado en la altura libre, sin hueco, reducción máxima del 85 % y desplazamiento si no cabe', () => {
  const { _pure: P } = world().T; const G = (...a) => JSON.parse(JSON.stringify(P.placeGroup(...a)));
  const g = G(280, 200, 844, 0, 0, 12, 10);      // cabe de sobra: escala 1, grupo centrado algo por encima del centro, 10 px entre demostración y tarjeta
  assert.equal(g.scale, 1); assert.equal(g.scroll, false); assert.equal(g.cardTop - (g.demoTop + 280), 10);
  assert.ok(g.demoTop > 12 && g.demoTop + 280 + 10 + 200 < 844 - 12);
  const s = G(300, 220, 640, 0, 0, 12, 10);      // 360×640: se reduce, pero nunca por debajo del 85 %
  assert.ok(s.scale >= 0.85 && s.scale <= 1);
  const t = G(400, 260, 560, 0, 0, 12, 10);      // no cabe ni al 85 %: sin recortar, empieza arriba y se desplaza
  assert.equal(t.scale, 0.85); assert.equal(t.scroll, true); assert.equal(t.demoTop, 12); assert.ok(t.extent >= t.cardTop + 260);
  const a = G(280, 200, 844, 30, 20, 12, 10);    // áreas seguras: el grupo queda dentro
  assert.ok(a.demoTop >= 42 && a.cardTop + 200 <= 844 - 20 - 12);
});

test('margen de seguridad de 14 px en el grupo (viñeta 5 en 360×640)', () => {
  const { _pure: P } = world().T; const G = (...a) => JSON.parse(JSON.stringify(P.placeGroup(...a)));
  const g = G(305, 295, 640, 0, 0, 12, 10);   // 610 px de grupo en 616 libres: sin margen de 14 px habría solo 6; se reduce la demostración un poco
  assert.equal(g.scroll, false); assert.ok(g.scale < 1 && g.scale >= 0.85, 'escala ' + g.scale);
  assert.ok(g.cardTop + 295 <= 640 - 12 - 14 + 0.5, 'la tarjeta deja al menos 14 px más el margen de 12');
});

test('seguridad de apertura: partida, invitación, sala, enlace propio o pantallas de invitación bloquean; el hub vacío no', () => {
  const { _pure: P } = world().T;
  assert.equal(P.isBusy({ screen: null, lists: { duels: [], multis: [], retos: [] } }, false), false);
  assert.equal(P.isBusy({ screen: 'friends', lists: {} }, false), false, 'pantallas interiores inocuas');
  for (const screen of ['duel', 'multi', 'reto', 'invite', 'invites', 'pick', 'pickkind', 'multipick', 'retomode']) assert.equal(P.isBusy({ screen, lists: {} }, false), true, screen);
  assert.equal(P.isBusy({ lists: {} }, true), true, 'enlace propio guardado');
  for (const estado of ['pendiente', 'aceptado', 'en_curso']) assert.equal(P.isBusy({ lists: { duels: [{ estado }] } }, false), true, 'duelo ' + estado);
  assert.equal(P.isBusy({ lists: { duels: [{ estado: 'completado' }, { estado: 'cancelado' }] } }, false), false);
  assert.equal(P.isBusy({ lists: { multis: [{ estado: 'pendiente', mi_estado: 'invitado' }] } }, false), true);
  assert.equal(P.isBusy({ lists: { multis: [{ estado: 'pendiente', mi_estado: 'rechazado' }] } }, false), false);
  assert.equal(P.isBusy({ lists: { retos: [{ estado: 'aceptado', yo: { empezado: true, terminado: false } }] } }, false), true, 'reto a medias');
  assert.equal(P.isBusy({ lists: { retos: [{ estado: 'aceptado', yo: { empezado: false } }] } }, false), false);
  assert.equal(P.listsKnown({ lists: {} }), false); assert.equal(P.listsKnown({ lists: { duels: [] } }), true);
});

// ---- Recorrido (DOM mínimo) ---------------------------------------------------------------------------------------------------------------
test('primera visualización: siete viñetas, progreso «n de 7», despedida, y solo al terminar se marca (clave propia); no se puede omitir', () => {
  const w = world();
  assert.equal(w.T.startIfNeeded(), true);
  assert.ok(w.root(), 'abierto');
  const titles = [], steps = [];
  for (let i = 0; i < 7; i++) {
    titles.push(w.q('dtour-title').textContent); steps.push(w.q('dtour-step').textContent);
    assert.equal(w.root().querySelector('.dtour-x'), null, 'sin botón de cerrar en la primera visualización');
    assert.equal(w.q('dtour-next').textContent, 'Continuar');
    assert.equal(w.q('dtour-back').disabled, i === 0, 'Atrás desactivado solo en la primera');
    assert.equal(w.esc(), true, 'Escape se captura pero NO cierra');
    assert.ok(w.root(), 'sigue abierto tras Escape (no se puede omitir)');
    w.q('dtour-next').click();
  }
  assert.deepEqual(titles, J(D.steps.map((s) => s.title)));
  assert.deepEqual(steps, ['1 de 7', '2 de 7', '3 de 7', '4 de 7', '5 de 7', '6 de 7', '7 de 7']);
  // tras la séptima: despedida, que no es una octava viñeta
  assert.equal(w.q('dtour-body').textContent, D.farewell.body);
  assert.equal(w.q('dtour-step').textContent, '7 de 7');
  assert.equal(w.q('dtour-next').textContent, 'Empezar a jugar');
  assert.deepEqual(w.calls.writes, [], 'a medias no se marca nada');
  w.q('dtour-back').click(); assert.equal(w.q('dtour-title').textContent, '¿No coincidís?', 'Atrás desde la despedida vuelve a la séptima');
  w.q('dtour-next').click(); w.q('dtour-next').click();
  assert.equal(w.root(), null, 'cerrado');
  assert.deepEqual(w.calls.writes, [KEY], 'la ÚNICA marca es la clave propia');
  assert.equal(w.store[KEY], '1');
  assert.equal(w.T.startIfNeeded(), false, 'una sola vez');
  assert.equal(w.T.seen(), true);
});

test('Atrás y Continuar navegan sin perder el sitio; cerrar la app a medias deja el recorrido sin marcar', () => {
  const w = world(); w.T.startIfNeeded();
  w.q('dtour-next').click(); w.q('dtour-next').click(); w.q('dtour-back').click();
  assert.equal(w.q('dtour-step').textContent, '2 de 7');
  assert.equal(w.store[KEY], undefined);
  const w2 = world({ ls: {} }); assert.equal(w2.T.seen(), false, 'una instancia nueva (recarga) vuelve a empezar');
});

test('lo ven TODOS los jugadores, incluidos quienes completaron el tutorial antiguo; sin mirar K_HELP, K_INTRO ni K_UNLOCKED', () => {
  const w = world({ ls: { siredwards_quiz_duel_intro_seen: '1', siredwards_quiz_v1_1_duel_help_seen: '1', siredwards_quiz_duel_unlocked: '1' } });
  assert.equal(w.T.startIfNeeded(), true); assert.ok(w.root(), 'se muestra aunque ya vieran el anterior');
  for (let i = 0; i < 8; i++) w.q('dtour-next').click();
  assert.deepEqual(w.calls.writes, [KEY]);
  assert.equal(w.store.siredwards_quiz_duel_intro_seen, '1'); assert.equal(w.store.siredwards_quiz_v1_1_duel_help_seen, '1'); assert.equal(w.store.siredwards_quiz_duel_unlocked, '1');
  assert.ok(!/K_HELP|K_INTRO|K_UNLOCKED|duel_intro_seen|duel_help_seen|duel_unlocked/.test(SRC.replace(/\/\/.*$/gm, '')), 'el módulo no nombra esas claves en su código');
});

test('se aplaza si hay una partida, invitación o sala activas, y se muestra cuando ya no las hay', () => {
  const state = { screen: null, lists: { duels: [{ estado: 'pendiente', soy: 'creador' }], multis: [], retos: [], link: null } };
  const w = world({ state });
  w.T.startIfNeeded();
  assert.equal(w.root(), null, 'aplazado: no se abre sobre una invitación activa');
  assert.deepEqual(w.calls.writes, []);
  state.lists.duels = [];
  w.T.startIfNeeded(); assert.ok(w.root(), 'sin nada activo, se muestra');
  for (const s of [{ screen: 'duel', lists: { duels: [] } }, { screen: 'multi', lists: { duels: [] } }, { screen: 'invite', lists: { duels: [] } }]) { const x = world({ state: s }); x.T.startIfNeeded(); assert.equal(x.root(), null, s.screen); }
  const own = world({ own: true }); own.T.startIfNeeded(); assert.equal(own.root(), null, 'enlace propio abierto en este dispositivo');
  const away = world({ tabActive: false }); away.T.startIfNeeded(); assert.equal(away.root(), null, 'si el jugador no está en Duelos no se abre');
});

test('si las listas del Worker aún no han llegado, espera antes de decidir (no se abre a ciegas sobre una sala)', () => {
  const state = { screen: null, lists: {} };
  const w = world({ state });
  w.T.startIfNeeded();
  assert.equal(w.root(), null, 'esperando al servidor');
  assert.ok(w.timers.length >= 1, 'reintento programado');
  state.lists = { duels: [], multis: [], retos: [], link: null };
  w.timers.shift()[0]();
  assert.ok(w.root(), 'cuando se sabe que no hay nada activo, se muestra');
});

test('repetir desde el «?»: se puede cerrar (× y Escape), no escribe NINGUNA marca y no se abre sobre una partida', () => {
  const w = world({ ls: { [KEY]: '1' } });
  assert.equal(w.T.startIfNeeded(), false);
  assert.equal(w.T.replay(), true);
  assert.ok(w.root().querySelector('.dtour-x'), 'en la repetición sí hay cerrar');
  w.esc(); assert.equal(w.root(), null, 'Escape cierra la repetición');
  w.T.replay(); w.root().querySelector('.dtour-x').click(); assert.equal(w.root(), null);
  w.T.replay(); for (let i = 0; i < 8; i++) w.q('dtour-next').click();
  assert.equal(w.root(), null);
  assert.deepEqual(w.calls.writes, [], 'repetirlo no cambia ninguna marca');
  const busy = world({ state: { screen: 'duel', lists: {} } });
  assert.equal(busy.T.replay(), false); assert.equal(busy.root(), null); assert.match(busy.calls.toasts[0], /duelo o tu invitación/);
  // desde una pantalla interior inocua (Amigos) se vuelve al inicio de Duelos para señalar elementos reales
  const inner = world({ state: { screen: 'friends', lists: { duels: [] } } });
  assert.equal(inner.T.replay(), true); assert.equal(inner.calls.backs, 1);
});

test('NO hay llamadas de escritura (ni de ningún tipo) al Worker durante el recorrido y la repetición', () => {
  const w = world(); w.T.startIfNeeded();
  for (let i = 0; i < 8; i++) w.q('dtour-next').click();
  w.T.replay(); for (let i = 0; i < 8; i++) w.q('dtour-next').click();
  assert.deepEqual(w.calls.api, [], 'ni una petición a SEQOnline.api');
  const code = SRC.replace(/\/\/.*$/gm, '');
  assert.ok(!/\.api\(|fetch\(|XMLHttpRequest|sendBeacon|SEQOnline\.api|SEQDuels\.(open|create|duelAction|retoAction|pick|openInvites)|SEQInvites|SEQDuelLink|SEQMultiLink|SEQMulti\b/.test(code), 'el módulo no llama a nada que escriba ni crea invitaciones');
  assert.ok(!/onclick|on(?:click|change|input)=/.test(code), 'las demostraciones son inertes: sin eventos en línea');
});

test('las demostraciones son estáticas, con datos ficticios, sin ids ni controles interactivos', () => {
  const body = SRC.slice(SRC.indexOf('var DEMOS'), SRC.indexOf('// ---- Construcción de la capa'));
  assert.ok(!/<(button|a|input|textarea|select)\b|href=|\bid=|onclick|tabindex/i.test(body), 'sin elementos interactivos ni ids');
  assert.match(SRC, /demo\.setAttribute\('aria-hidden', 'true'\)/); assert.match(SRC, /demo\.inert = true/);
  for (const nombre of ['Edu', 'Clara', 'Dani']) assert.ok(body.includes(nombre), nombre);
});

test('sin diana medible no se señala ninguna posición: el recorrido sigue con el texto', () => {
  const w = world({ hubVisible: false }); w.T.startIfNeeded();
  assert.ok(w.root().className.includes('dtour-nospot'), 'sin resalte');
  assert.equal(w.q('dtour-spot').style.display, 'none');
  assert.equal(w.q('dtour-title').textContent, 'Bienvenido a Duelos');
  // La viñeta 1 es una presentación especial (como la despedida): sin resalte del hub en ninguna resolución, con la ilustración grande sobre la tarjeta
  for (const h of [640, 844, 914]) { const ok = world(); ok.win.innerHeight = h; ok.T.startIfNeeded(); assert.ok(ok.root().className.includes('dtour-nospot'), 'sin resalte a ' + h); assert.ok(ok.root().className.includes('dtour-welcome') && ok.root().className.includes('dtour-fw')); assert.equal(ok.q('dtour-spot').style.display, 'none'); assert.equal(ok.q('dtour-sir').style.display, 'block'); }
});

test('Tab queda atrapado en el recorrido (accesibilidad) y el diálogo declara su título', () => {
  const w = world(); w.T.startIfNeeded();
  assert.equal(w.root().getAttribute('role'), 'dialog'); assert.equal(w.root().getAttribute('aria-modal'), 'true'); assert.equal(w.root().getAttribute('aria-labelledby'), 'dtour-title');
  assert.equal(w.q('dtour-title').id, 'dtour-title');
  w.doc.activeElement = w.q('dtour-next');
  let prevented = false; (w.doc.listeners.keydown || []).forEach((f) => f({ key: 'Tab', shiftKey: false, preventDefault() { prevented = true; }, stopPropagation() {} }));
  assert.equal(prevented, true, 'desde el último botón, Tab vuelve al primero');
});

// ---- Cableado -------------------------------------------------------------------------------------------------------------------------------
test('cableado: index.html, caché de sw.js y hoja de estilos; sin reducir movimiento no hay animaciones; los módulos tienen su sitio', () => {
  const HTML = read('index.html'), SW = read('sw.js'), CSS = read('styles/duel-tour.css');
  for (const f of ['src/data/duel-tour-steps.js', 'src/ui/duel-tour.js']) { assert.match(HTML, new RegExp('<script src="' + f.replace(/[./]/g, '\\$&') + '\\?v=\\d+"></script>')); assert.ok(SW.includes("'./" + f + "'"), f); }
  assert.match(HTML, /<link rel="stylesheet" href="styles\/duel-tour\.css\?v=\d+">/); assert.ok(SW.includes("'./styles/duel-tour.css'"));
  assert.ok(HTML.indexOf('duel-tour-steps.js') < HTML.indexOf('duel-tour.js') && HTML.indexOf('duel-tour.js') < HTML.indexOf('duel-intro.js'), 'orden de carga: datos, motor, fachada');
  assert.match(CSS, /prefers-reduced-motion: reduce/);
  assert.match(CSS, /@media \(max-height: 700px\)/, 'ajuste para móviles bajos (360×640)');
  assert.doesNotMatch(CSS, /\p{Extended_Pictographic}/u);
  assert.equal(D.key, KEY);
});

test('no se apila sobre otro diálogo abierto (p. ej. el nombre): espera a que se cierre', () => {
  const modal = { open: true };
  const w = world({ modal });
  w.T.startIfNeeded();
  assert.equal(w.root(), null, 'con un diálogo abierto no se abre');
  assert.ok(w.timers.length >= 1, 'reintento programado');
  modal.open = false;
  w.timers.shift()[0]();
  assert.ok(w.root(), 'al cerrarse el diálogo, se muestra');
});

test('un enlace 1 contra 1 abierto en OTRO dispositivo (lo dice el Worker) también aplaza el recorrido; y con v2 espera a conocerlo', () => {
  const { _pure: P } = world().T;
  assert.equal(P.isBusy({ lists: { duels: [], link: { estado: 'abierto' } } }, false), true);
  assert.equal(P.isBusy({ lists: { duels: [], link: null } }, false), false);
  assert.equal(P.listsKnown({ lists: { duels: [] } }, true), false, 'con v2 hace falta saber también el estado del enlace');
  assert.equal(P.listsKnown({ lists: { duels: [], link: null } }, true), true);
  assert.equal(P.listsKnown({ lists: { duels: [] } }, false), true);
  const w = world({ state: { screen: null, lists: { duels: [], multis: [], retos: [], link: { estado: 'abierto', modo: 'classic' } } } });
  w.T.startIfNeeded(); assert.equal(w.root(), null);
  assert.match(read('src/online/duels.js'), /\/duel-links\/mine'\)\.then\(function \(d\) \{ S\.lists\.link/);
});

// ---- Publicación escalonada: sin la bandera del Worker el recorrido no se enseña ni se marca ------------------------------------------
test('con duel_invites_v2 apagada no se muestra (ni primera vez ni «?») y no se marca como visto', () => {
  const w = world({ session: { features: { classic_duel: true, duel_links: true, duel_invites_v2: false } } });
  w.T.startIfNeeded();
  assert.equal(w.root(), null, 'no se abre');
  assert.equal(w.T.replay(), false, 'tampoco desde el «?»');
  assert.equal(w.root(), null);
  assert.equal(w.T.seen(), false, 'sigue sin verse: se mostrará cuando el Worker active V2');
});
