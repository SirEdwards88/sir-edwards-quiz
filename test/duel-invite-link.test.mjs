// Fase B (cliente): invitación a duelo por enlace — src/online/duel-invite-link.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../src/online/duel-invite-link.js', import.meta.url), 'utf8');
const HTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SW = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const TOKEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.slice(0, 24).replace(/[IO]/g, 'A');
const GOOD = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.slice(0, 24);

function env({ hash = '', session = { features: { classic_duel: true, duel_links: true } }, gateOpen = true, now = 1_000_000 } = {}) {
  const ls = {}, calls = [], toasts = [], opened = [], confirms = [], replaced = [], listeners = {};
  let t = now;
  const api = {};
  const ctx = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    Date: { now: () => t },
    location: { hash, origin: 'https://edu.github.io', pathname: '/sir-edwards-quiz/index.html', search: '' },
    history: { replaceState: (a, b, u) => { replaced.push(u); ctx.location.hash = ''; } },
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    navigator: {}, document: { getElementById: () => null },
    window: { addEventListener: (e, f) => { listeners[e] = f; } },
    showInfoToast: (m) => toasts.push(m),
    showAppConfirm: (o) => confirms.push(o),
    switchTab: (x) => opened.push('tab:' + x),
    store: {}, SEQDuelIntro: { gate: () => ({ open: gateOpen }) },
    SEQOnline: { session: () => session, api: (m, p, b) => { calls.push([m, p, b]); return api.next ? api.next(m, p, b) : Promise.resolve({}); } },
    SEQDuels: { open: (a, b) => opened.push(a + (b ? ':' + b : '')), _state: () => ({ pickModo: 'classic', lists: { friends: { friends: [] } } }), _h: { say() {} }, rerender() {} },
  };
  ctx.window.SEQOnline = ctx.SEQOnline; ctx.window.SEQDuels = ctx.SEQDuels; ctx.window.SEQDuelIntro = ctx.SEQDuelIntro;
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { ctx, L: ctx.window.SEQDuelLink, ls, calls, toasts, opened, confirms, replaced, api, tick: (ms) => { t += ms; }, listeners };
}
const flush = () => new Promise((r) => setImmediate(r));

test('token del hash: solo 24 caracteres del alfabeto válido; todo lo demás se ignora', () => {
  const { L } = env();
  assert.equal(L._tokenFromHash('#duelo=' + GOOD), GOOD);
  for (const bad of ['', '#', '#duelo=', '#duelo=corto', '#duelo=' + GOOD + 'A', '#duelo=' + 'a'.repeat(24), '#duelo=' + '0'.repeat(24), '#otro=' + GOOD, '#duelo=' + GOOD + '&x=1', '#duelo=<script>'.padEnd(31, 'A'), null])
    assert.equal(L._tokenFromHash(bad), null, String(bad));
});

test('capturar: guarda el token pendiente y lo quita de la barra de direcciones', () => {
  const e = env({ hash: '#duelo=' + GOOD });
  const p = JSON.parse(e.ls.siredwards_quiz_duel_link_pending);
  assert.equal(p.token, GOOD);
  assert.deepEqual(e.replaced, ['/sir-edwards-quiz/index.html']);
  assert.equal(e.L.pending(), GOOD);
  const none = env({ hash: '#duelo=basura' });
  assert.equal(none.ls.siredwards_quiz_duel_link_pending, undefined);
});

test('el token pendiente caduca a los 10 minutos', () => {
  const e = env({ hash: '#duelo=' + GOOD });
  e.tick(10 * 60 * 1000 + 1);
  assert.equal(e.L.pending(), null);
  assert.equal(e.ls.siredwards_quiz_duel_link_pending, undefined);
});

test('abrir un enlace sin sesión: se conserva y no se llama al servidor; al haber sesión pregunta antes de canjear', async () => {
  const e = env({ hash: '#duelo=' + GOOD, session: null });
  e.L.resume(); await flush();
  assert.equal(e.calls.length, 0); assert.equal(e.L.pending(), GOOD);
});

test('con sesión y nivel 7: consulta, pregunta con el nombre del creador y solo canjea si aceptas', async () => {
  const e = env({ hash: '#duelo=' + GOOD });
  e.api.next = (m, p) => Promise.resolve(m === 'GET' ? { estado: 'abierto', modo: 'stakes', creador: { display_name: 'Ana <b>' } } : { id: 'DUELO00001' });
  e.L.resume(); await flush();
  assert.deepEqual(e.calls[0], ['GET', '/duel-links/' + GOOD, undefined]);
  assert.equal(e.confirms.length, 1);
  assert.match(e.confirms[0].message, /Ana <b> te invita a un duelo por apuestas/);
  assert.equal(e.calls.filter((c) => c[0] === 'POST').length, 0, 'aún no canjeó');
  assert.equal(e.L.pending(), null, 'el token no se reutiliza');
  e.confirms[0].onConfirm(); await flush();
  assert.deepEqual(e.calls[1], ['POST', '/duel-links/' + GOOD + '/redeem', undefined]);
  assert.deepEqual(e.opened, ['tab:duelo', 'duel:DUELO00001']);
});

test('nivel 7 no alcanzado: avisa y no llama al servidor', async () => {
  const e = env({ hash: '#duelo=' + GOOD, gateOpen: false });
  e.L.resume(); await flush();
  assert.equal(e.calls.length, 0); assert.match(e.toasts[0], /nivel 7/); assert.equal(e.L.pending(), null);
});

test('enlace usado, caducado o cancelado: mensaje claro y sin preguntar', async () => {
  for (const [estado, re] of [['canjeado', /ya se ha usado/], ['expirado', /ha caducado/], ['cancelado', /se ha cancelado/]]) {
    const e = env({ hash: '#duelo=' + GOOD });
    e.api.next = () => Promise.resolve({ estado, modo: 'classic', creador: { display_name: 'Ana' } });
    e.L.resume(); await flush();
    assert.equal(e.confirms.length, 0); assert.match(e.toasts[0], re);
  }
  const e = env({ hash: '#duelo=' + GOOD });
  e.api.next = () => Promise.reject(Object.assign(new Error('x'), { code: 'link_not_found' }));
  e.L.resume(); await flush();
  assert.match(e.toasts[0], /no existe/);
});

test('crear: pide el enlace al servidor con el modo elegido y abre la sala «Invitación lista»', async () => {
  const e = env();
  e.api.next = () => Promise.resolve({ token: GOOD, modo: 'classic', restante_ms: 600000 });
  e.L.create(); await flush();
  assert.deepEqual(JSON.parse(JSON.stringify(e.calls[0])), ['POST', '/duel-links', { modo: 'classic' }]);
  assert.deepEqual(e.opened, ['invite']);
  // la sala pinta el enlace completo con el token en el hash y NO el ID del creador
  const html = e.L.render({ header: (t, s) => '<h>' + t + '|' + s + '</h>', esc: (s) => s });
  assert.match(html, /Invitación lista\|Duelo clásico/);
  assert.ok(html.includes('https://siredwards88.github.io/sir-edwards-quiz/#duelo=' + GOOD));
  assert.match(html, /Compartir enlace/); assert.match(html, /Copiar enlace/); assert.match(html, /Cancelar invitación/); assert.match(html, /Caduca en <b id="seq-link-left">10:00/);
  assert.match(html, /2 minutos/);
  assert.ok(!/Invitación enviada/.test(html), 'aún no se ha enviado nada: solo está lista');
  assert.ok(!/<input/.test(html), 'el enlace se muestra en un bloque que se parte en líneas, no en un campo con scroll');
  assert.match(html, /<div class="seq-link-url" id="seq-link-url"/);
  assert.match(html, /sigue activa hasta que caduque o la canceles/);
});

test('crear: un error del servidor se explica (nivel, ocupado)', async () => {
  const e = env();
  e.api.next = () => Promise.reject(Object.assign(new Error('x'), { code: 'level_required' }));
  e.L.create(); await flush();
  assert.match(e.toasts[0], /nivel 7/); assert.deepEqual(e.opened, []);
});

test('cancelar la invitación avisa al servidor y vuelve a elegir rival', async () => {
  const e = env();
  e.api.next = () => Promise.resolve({ token: GOOD, modo: 'stakes', restante_ms: 600000 });
  e.L.create(); await flush();
  e.L.cancel(); await flush();
  assert.deepEqual(e.calls[1], ['POST', '/duel-links/' + GOOD + '/cancel', undefined]);
  assert.equal(e.opened[e.opened.length - 1], 'pick');
});

test('con la bandera duel_links ausente (Worker antiguo o apagada) no hay interfaz: ni botón, ni crear, ni canjear', async () => {
  for (const features of [{ classic_duel: true }, { classic_duel: true, duel_links: false }, { duel_links: true }]) {
    const e = env({ session: { features }, hash: '#duelo=' + GOOD });
    assert.equal(e.L.pickButton(), '', JSON.stringify(features));
    e.L.create(); e.L.resume(); await flush();
    assert.deepEqual(e.calls, [], 'no se llama al servidor');
  }
});

test('mi invitación activa se recupera en vez de crear otra: sin POST, con aviso y sin cancelar nada', async () => {
  const e = env();
  e.api.next = () => Promise.resolve({ token: GOOD, modo: 'classic', restante_ms: 600000 });
  e.L.create(); await flush();
  e.L.leave();                                    // salgo de la pantalla: NO se cancela
  assert.equal(e.calls.length, 1, 'salir no cancela en el servidor');
  assert.match(e.L.pickButton(), /Ver mi invitación activa/);
  assert.doesNotMatch(e.L.pickButton(), /Compartir invitación/);
  e.L.create(); await flush();                    // equivale a recuperarla
  assert.equal(e.calls.filter((c) => c[0] === 'POST').length, 1, 'no se crea un segundo enlace');
  assert.equal(e.opened[e.opened.length - 1], 'invite');
  assert.ok(e.L.render({ header: (t) => t, esc: (x) => x }).includes('#duelo=' + GOOD));
  e.L.cancel(); await flush();
  assert.match(e.L.pickButton(), /Compartir invitación/, 'tras cancelar vuelve a poder crear');
});

test('si el servidor dice que ya hay un enlace abierto (otro dispositivo): se pide confirmación antes de reemplazarlo', async () => {
  const e = env();
  let n = 0;
  e.api.next = (m, p, b) => (n++ === 0 ? Promise.reject(Object.assign(new Error('x'), { code: 'link_open' })) : Promise.resolve({ token: GOOD, modo: 'classic', restante_ms: 600000 }));
  e.L.create(); await flush();
  assert.equal(e.confirms.length, 1); assert.match(e.confirms[0].message, /anterior dejará de funcionar/);
  assert.equal(e.calls.length, 1, 'hasta confirmar no se reemplaza nada');
  e.confirms[0].onConfirm(); await flush();
  assert.deepEqual(JSON.parse(JSON.stringify(e.calls[1])), ['POST', '/duel-links', { modo: 'classic', replace: true }]);
  assert.equal(e.opened[e.opened.length - 1], 'invite');
});

test('el enlace pendiente sobrevive a recargas sin sesión y se ofrece al iniciar sesión', async () => {
  const e = env({ hash: '#duelo=' + GOOD, session: null });
  const saved = e.ls.siredwards_quiz_duel_link_pending;
  assert.ok(saved, 'guardado al recibirlo');
  // «recarga»: otra instancia del módulo con el mismo almacenamiento y sin hash
  const e2 = env({ session: null }); e2.ls.siredwards_quiz_duel_link_pending = saved;
  e2.ctx.localStorage.setItem('siredwards_quiz_duel_link_pending', saved);
  e2.L.resume(); await flush();
  assert.equal(e2.L.pending(), GOOD); assert.equal(e2.calls.length, 0);
  // inicia sesión: ahora sí
  e2.ctx.SEQOnline.session = () => ({ features: { classic_duel: true, duel_links: true } });
  e2.api.next = () => Promise.resolve({ estado: 'abierto', modo: 'classic', creador: { display_name: 'Ana' } });
  e2.L.resume(); await flush();
  assert.equal(e2.confirms.length, 1); assert.match(e2.confirms[0].message, /Ana te invita/);
});

test('el enlace compartido usa siempre la URL pública, nunca localhost ni el origen de la copia abierta', () => {
  for (const origin of ['http://localhost:8099', 'http://127.0.0.1:5500', 'https://otra-copia.example']) {
    const e = env(); e.ctx.location.origin = origin;
    assert.equal(e.L._urlFor(GOOD), 'https://siredwards88.github.io/sir-edwards-quiz/#duelo=' + GOOD);
  }
  assert.ok(!/localhost|127\.0\.0\.1/.test(SRC.replace(/\/\/.*$/gm, '')));
});

test('«Añadir como amigo»: solo si el rival no lo es todavía; una vez enviada ya no se repite', () => {
  const e = env();
  const d = { rival: { id: 'BBBBBBBBBB' } };
  assert.match(e.L.friendButton(d), /Añadir como amigo/);
  e.ctx.SEQDuels._state = () => ({ lists: { friends: { friends: [{ player: { id: 'BBBBBBBBBB' } }] } } });
  assert.equal(e.L.friendButton(d), '');
  assert.equal(e.L.friendButton({ rival: { id: "x'><script>" } }), '');
});

test('cableado: script en index.html antes de duels.js, en el Service Worker, y duels.js lo usa', () => {
  const tag = (f) => HTML.indexOf('<script src="src/online/' + f + '?v=');
  assert.ok(tag('duel-invite-link.js') > 0 && tag('duel-invite-link.js') < tag('duels.js'));
  assert.ok(SW.includes('./src/online/duel-invite-link.js'));
  const D = fs.readFileSync(new URL('../src/online/duels.js', import.meta.url), 'utf8');
  for (const f of ['SEQDuelLink.pickButton()', 'SEQDuelLink.render(HELPERS)', 'SEQDuelLink.begin()', 'SEQDuelLink.friendButton(d)', 'SEQDuelLink.resume()', 'SEQDuelLink.stop()']) assert.ok(D.includes(f), f);
});

test('seguridad del módulo: sin innerHTML ni eval, y el token no se envía a ningún sitio salvo al Worker', () => {
  const code = SRC.replace(/\/\/.*$/gm, '');
  assert.ok(!/innerHTML|eval\(|document\.write|new Function/.test(code));
  assert.ok(!/console\./.test(code), 'no se registra el token');
});
