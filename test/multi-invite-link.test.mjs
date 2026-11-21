// Enlace de Todos contra todos (cliente): src/online/multi-invite-link.js, su integración en la pantalla de elegir modo,
// en la sala de espera, en la Ayuda, en el tutorial y en la caché de la PWA.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SRC = read('src/online/multi-invite-link.js');
const HTML = read('index.html');
const SW = read('sw.js');
const MULTI = read('src/online/multi-duels.js');
const INTRO = read('src/ui/duel-intro.js');
const GOOD = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.slice(0, 24);

function env({ hash = '', session = { features: { multi_duel_links: true } }, gateOpen = true, now = 1_000_000 } = {}) {
  const ls = {}, calls = [], toasts = [], opened = [], confirms = [], replaced = [], listeners = {};
  let t = now, shared = null, copied = null;
  const api = {};
  const ctx = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    Date: { now: () => t },
    location: { hash, pathname: '/sir-edwards-quiz/index.html', search: '' },
    history: { replaceState: (a, b, u) => { replaced.push(u); ctx.location.hash = ''; } },
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    navigator: { share: (o) => { shared = o; return Promise.resolve(); }, clipboard: { writeText: (s) => { copied = s; return Promise.resolve(); } } },
    document: { getElementById: () => null },
    window: { addEventListener: (e, f) => { listeners[e] = f; } },
    showInfoToast: (m) => toasts.push(m), showAppConfirm: (o) => confirms.push(o), switchTab: (x) => opened.push('tab:' + x),
    store: {}, SEQDuelIntro: { gate: () => ({ open: gateOpen }) },
    SEQOnline: { session: () => session, api: (m, p, b) => { calls.push([m, p, b]); return api.next ? api.next(m, p, b) : Promise.resolve({}); } },
    SEQDuels: { open: (a, b) => opened.push(a + (b ? ':' + b : '')), _state: () => ({ pickModo: 'stakes' }) },
  };
  Object.assign(ctx.window, { SEQOnline: ctx.SEQOnline, SEQDuels: ctx.SEQDuels, SEQDuelIntro: ctx.SEQDuelIntro });
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { L: ctx.window.SEQMultiLink, ls, calls, toasts, opened, confirms, replaced, api, listeners, tick: (ms) => { t += ms; }, get shared() { return shared; }, get copied() { return copied; } };
}
const flush = () => new Promise((r) => setImmediate(r));

test('capturar: solo #duelo-multi= con 24 caracteres válidos; se guarda y se quita de la barra; no choca con #duelo=', () => {
  const e = env({ hash: '#duelo-multi=' + GOOD });
  assert.equal(JSON.parse(e.ls.siredwards_quiz_multi_link_pending).token, GOOD);
  assert.equal(e.L.pending(), GOOD);
  assert.deepEqual(e.replaced, ['/sir-edwards-quiz/index.html']);
  for (const bad of ['#duelo-multi=corto', '#duelo-multi=' + GOOD + 'A', '#duelo-multi=' + 'a'.repeat(24), '#duelo-multi=' + GOOD + '&x=1', '#duelo=' + GOOD, '']) {
    assert.equal(env({ hash: bad }).ls.siredwards_quiz_multi_link_pending, undefined, bad);
  }
  assert.match(read('src/online/duel-invite-link.js'), /\^#duelo=\(/, 'el enlace 1 contra 1 sigue leyendo solo #duelo=');
  assert.equal(typeof env().listeners.hashchange, 'function');
});

test('el token pendiente caduca a los 10 minutos', () => {
  const e = env({ hash: '#duelo-multi=' + GOOD });
  e.tick(10 * 60 * 1000 + 1);
  assert.equal(e.L.pending(), null);
});

test('sin sesión se conserva el enlace y no se llama al servidor', async () => {
  const e = env({ hash: '#duelo-multi=' + GOOD, session: null });
  e.L.resume(); await flush();
  assert.equal(e.calls.length, 0); assert.equal(e.L.pending(), GOOD);
});

test('función apagada o sin nivel 7: se descarta el enlace con un aviso y no se llama al servidor', async () => {
  const off = env({ hash: '#duelo-multi=' + GOOD, session: { features: { multi_duel_links: false } } });
  off.L.resume(); await flush();
  assert.equal(off.calls.length, 0); assert.equal(off.L.pending(), null); assert.equal(off.toasts.length, 1);
  const low = env({ hash: '#duelo-multi=' + GOOD, gateOpen: false });
  low.L.resume(); await flush();
  assert.equal(low.calls.length, 0); assert.equal(low.L.pending(), null); assert.match(low.toasts[0], /nivel 7/);
});

test('con sesión: consulta, pregunta con el nombre del anfitrión (sin HTML) y solo entra si aceptas', async () => {
  const e = env({ hash: '#duelo-multi=' + GOOD });
  e.api.next = (m) => Promise.resolve(m === 'GET'
    ? { estado: 'abierto', modo: 'stakes', plazas_ocupadas: 2, plazas_totales: 4, soy: 'invitado', creador: { display_name: 'Ana <b>' } }
    : { id: 'SALA000001' });
  e.L.resume(); await flush();
  assert.equal(JSON.stringify(e.calls[0]), JSON.stringify(['GET', '/multi-duel-links/' + GOOD, null]));
  assert.equal(e.confirms.length, 1);
  assert.match(e.confirms[0].message, /Ana <b> te invita a Todos contra todos por apuestas\. Hay 2 de 4 plazas ocupadas/);
  assert.equal(e.calls.filter((c) => c[0] === 'POST').length, 0, 'aún no ha entrado');
  e.confirms[0].onConfirm(); await flush();
  assert.equal(JSON.stringify(e.calls[1]), JSON.stringify(['POST', '/multi-duel-links/' + GOOD + '/redeem', null]));
  assert.deepEqual(e.opened, ['tab:duelo', 'multi:SALA000001']);
  assert.equal(e.L.pending(), null, 'el token ya no queda guardado');
});

test('quien ya participa recupera su sala sin preguntar; sala completa o enlace caducado, con su aviso', async () => {
  const e = env({ hash: '#duelo-multi=' + GOOD });
  e.api.next = (m) => Promise.resolve(m === 'GET' ? { estado: 'expirado', soy: 'participante' } : { id: 'SALA000001' });
  e.L.resume(); await flush();
  assert.equal(e.confirms.length, 0);
  assert.deepEqual(e.opened, ['tab:duelo', 'multi:SALA000001']);
  const full = env({ hash: '#duelo-multi=' + GOOD });
  full.api.next = () => Promise.resolve({ estado: 'completo', soy: 'invitado' });
  full.L.resume(); await flush();
  assert.equal(full.confirms.length, 0); assert.match(full.toasts[0], /completa/);
  const dead = env({ hash: '#duelo-multi=' + GOOD });
  dead.api.next = () => Promise.resolve({ estado: 'cancelado', soy: 'invitado' });
  dead.L.resume(); await flush();
  assert.equal(dead.confirms.length, 0); assert.match(dead.toasts[0], /ya no admite jugadores/);
});

test('errores del servidor: mensaje por código, sin mostrar texto ajeno; sin conexión se conserva para reintentar', async () => {
  const busy = env({ hash: '#duelo-multi=' + GOOD });
  busy.api.next = (m) => (m === 'GET' ? Promise.resolve({ estado: 'abierto', soy: 'invitado', plazas_ocupadas: 1, plazas_totales: 4, creador: {} }) : Promise.reject({ code: 'player_busy', message: '<img onerror=x>' }));
  busy.L.resume(); await flush(); busy.confirms[0].onConfirm(); await flush();
  assert.match(busy.toasts[0], /duelo o una sala en marcha/); assert.ok(!busy.toasts[0].includes('<img'));
  const net = env({ hash: '#duelo-multi=' + GOOD });
  net.api.next = () => Promise.reject({ network: true });
  net.L.resume(); await flush();
  assert.equal(net.L.pending(), GOOD, 'sin conexión se reintenta');
  const nf = env({ hash: '#duelo-multi=' + GOOD });
  nf.api.next = () => Promise.reject({ code: 'link_not_found' });
  nf.L.resume(); await flush();
  assert.equal(nf.L.pending(), null); assert.match(nf.toasts[0], /no existe/);
});

test('crear: envía el modo elegido, guarda el enlace con el tiempo restante del servidor y abre la sala', async () => {
  const e = env();
  e.api.next = () => Promise.resolve({ token: GOOD, duelo_id: 'SALA000001', modo: 'stakes', expira_at: 5, restante_ms: 600000 });
  e.L.create(); e.L.create(); await flush();
  assert.equal(e.calls.length, 1, 'doble pulsación: una sola petición');
  assert.equal(JSON.stringify(e.calls[0]), JSON.stringify(['POST', '/multi-duel-links', { modo: 'stakes' }]));
  assert.deepEqual(e.opened, ['tab:duelo', 'multi:SALA000001']);
  const own = JSON.parse(e.ls.siredwards_quiz_multi_link_own);
  assert.equal(own.endsAt, 1_000_000 + 600000, 'usa el reloj del dispositivo + tiempo restante, no la hora del servidor');
  const html = e.L.roomButtons('SALA000001');
  assert.ok(html.includes('Compartir enlace') && html.includes('Copiar enlace'));
  assert.ok(!html.includes('#duelo-multi=') && !html.includes(GOOD) && !html.includes('siredwards88.github.io'), 'la dirección completa no se muestra');
  assert.equal(e.L.roomButtons('OTRA000001'), '', 'solo en la sala propia');
  e.tick(600001);
  assert.equal(e.L.roomButtons('SALA000001'), '', 'caducado: sin botones');
});

test('compartir y copiar usan siempre la dirección pública y avisan del plazo', async () => {
  const e = env();
  e.api.next = () => Promise.resolve({ token: GOOD, duelo_id: 'SALA000001', restante_ms: 600000 });
  e.L.create(); await flush();
  e.L.share();
  assert.equal(e.shared.url, 'https://siredwards88.github.io/sir-edwards-quiz/#duelo-multi=' + GOOD);
  assert.match(e.shared.text, /10 minutos/);
  e.L.copy(); await flush();
  assert.equal(e.copied, 'https://siredwards88.github.io/sir-edwards-quiz/#duelo-multi=' + GOOD);
  assert.match(e.toasts.at(-1), /copiado/);
});

test('apagado: ni botón de crear ni enlaces en la sala', () => {
  const e = env({ session: { features: { multi_duel_links: false } } });
  assert.equal(e.L.pickButton(), ''); assert.equal(e.L.roomButtons('X'), '');
  const on = env();
  assert.match(on.L.pickButton(), /Crear sala por enlace/);
  assert.match(on.L.pickButton(), /aunque no sean amigos/);
});

test('integración: script en index.html y en la caché de sw.js, botón solo en Duelo (no Retos) y solo con la función servida', () => {
  assert.match(HTML, /<script src="src\/online\/multi-invite-link\.js\?v=\d+"><\/script>/);
  assert.match(SW, /'\.\/src\/online\/multi-invite-link\.js'/);
  assert.ok(HTML.indexOf('multi-duels.js') < HTML.indexOf('multi-invite-link.js'), 'se carga después del módulo de salas');
  // 1.0: con las invitaciones unificadas el enlace deja de ser una opción independiente; sin el flag del Worker se conserva el botón.
  assert.match(MULTI, /var linkOption = !uni && !reto && ft\.multi_duel_links && window\.SEQMultiLink \? SEQMultiLink\.pickButton\(\) : ''/);
  assert.match(MULTI, /SEQMultiLink\.roomButtons\(d\.id\)/);
  assert.doesNotMatch(SRC, /innerHTML|document\.write|eval\(/);
});

test('el tutorial nuevo (1.0) distingue los dos casos: combinar amigos y enlace es solo de Todos contra todos', () => {
  // La presentación antigua con variantes según flags desapareció: ahora es el recorrido de siete viñetas (test/duel-tour.test.mjs).
  assert.ok(!/bodyMulti/.test(INTRO), 'duel-intro.js ya no lleva textos de tutorial');
  const win = {}; vm.createContext({ window: win }); vm.runInContext(read('src/data/duel-tour-steps.js'), vm.createContext({ window: win }));
  const four = win.SEQDuelTourData.steps[3].body;
  assert.match(four, /En Todos contra todos puedes combinar ambas opciones/);
  assert.doesNotMatch(four, /1 contra 1/, 'no se afirma que se puedan combinar en 1 contra 1');
});

test('el cliente conserva el flag multi_duel_links que declara el Worker (online.js lo normaliza)', () => {
  assert.match(read('src/online/online.js'), /multi_duel_links: f\.multi_duel_links === true/);
});
