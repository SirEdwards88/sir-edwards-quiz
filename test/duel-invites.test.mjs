// 1.0 — Invitaciones unificadas (cliente): src/online/duel-invites.js y su integración con multi-duels.js, duels.js y los módulos de enlace.
// El Worker es la fuente de verdad: aquí se prueba qué pinta y qué pide la PWA, nunca qué decide el servidor (eso, en el backend).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const INV = read('src/online/duel-invites.js');
const MULTI = read('src/online/multi-duels.js');
const DUELS = read('src/online/duels.js');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; };
const flush = () => new Promise((r) => setImmediate(r));
const J = (x) => JSON.parse(JSON.stringify(x));

// Entorno: módulo + multi-duels.js reales, con el resto simulado. `features` decide qué declara el Worker.
function world({ features = { classic_duel: true, multi_duel: true, duel_links: true, multi_duel_links: true, duel_invites_v2: true }, lists = { friends: { friends: [] }, duels: [], multis: [] }, api } = {}) {
  const calls = [], confirms = [], toasts = [], said = [], opened = [], dl = [], ml = [];
  const S = { screen: 'pickkind', pickKind: 'duel', pickModo: 'classic', invKind: 'one', id: 'MMMMMMMMMM', lists, data: null };
  const apiFn = (m, p, b) => { calls.push([m, p, b]); const r = api ? api(m, p, b) : null; return r instanceof Promise ? r : Promise.resolve(r === undefined || r === null ? {} : r); };
  const H = {
    S, esc, num, ico: (n) => '[' + n + ']', serverNow: () => 5000, safeId: (i) => (/^[0-9A-Z]{10}$/.test(i) ? i : ''),
    player: (p) => ({ name: esc((p && p.display_name) || 'Jugador'), avatar: '<i>av</i>', id: (p && /^[0-9A-Z]{10}$/.test(p.id) ? p.id : '') }),
    who: (p, sub) => '<who>' + p.name + (sub ? '|' + sub : '') + '</who>',
    header: (t, s, back) => { H.backFn = back; return '<hdr>' + t + '|' + s + '</hdr>'; }, gameHeader: () => '<game></game>', topbarShown() {},
    isOnline: (f) => !(f && f.online === false), emptyState: () => '<empty>', backToList() {},
    say: (m, bad) => said.push([m, bad]), errText: (e) => 'ERR:' + ((e && e.code) || 'x'), render() {}, refresh() {},
    open: (a, b) => opened.push([a, b]), apply: (d) => opened.push(['apply', d.id]), pick1v1: (k, m) => opened.push(['pick1v1', k, m]), pickModeMulti() {},
    features: () => features, session: () => ({ display_name: 'Edu', avatar: 'sombrero', features }), act() {},
    questionBlock: () => '', classicWin: () => ({ k: 0 }), resultSoundOnce() {}, xpFor: () => 0, syncXpOnce() {}, xpChipHtml: () => '', modeLine: () => '', retoModeName: () => '', left: () => '',
  };
  const ctx = vm.createContext({ Math, String, Number, Object, isFinite, console, Promise, setTimeout, clearTimeout,
    document: { getElementById: (id) => (id === 'seq-d-msg' ? {} : null) },
    showAppConfirm: (o) => confirms.push(o), showInfoToast: (m) => toasts.push(m) });
  ctx.window = ctx;
  ctx.SEQOnline = { session: () => ({ features }), api: apiFn };
  ctx.SEQDuels = { _h: H, _state: () => S, rerender() { calls.push(['rerender']); }, reload() { calls.push(['reload']); }, refreshSummary() { calls.push(['summary']); return Promise.all([apiFn('GET', '/duel-links/mine').then((d) => { S.lists.link = (d && d.enlace) || null; }), apiFn('GET', '/duels').then((d) => { S.lists.duels = d.duels || []; }), apiFn('GET', '/multi-duels').then((d) => { S.lists.multis = d.duels || []; })]); },
    openInvites: (k) => { S.screen = 'invites'; S.invKind = k; opened.push(['openInvites', k]); }, duelAction: (a) => calls.push(['duelAction', a]) };
  ctx.SEQDuelLink = { recover() { dl.push('recover'); }, create(r) { dl.push('create' + (r ? ':replace' : '')); }, cancel() { dl.push('cancel'); } };
  ctx.SEQMultiLink = { create() { ml.push('create'); }, pickButton: () => '<linkbtn>', roomPanel: (d, v2) => '<panel v2=' + v2 + ' enlace=' + (d.enlace ? d.enlace.estado : '-') + '>', roomButtons: () => '<btns>' };
  vm.runInContext(INV, ctx); vm.runInContext(MULTI, ctx);
  return { I: ctx.SEQInvites, M: ctx.SEQMulti, H, S, ctx, calls, confirms, toasts, said, opened, dl, ml };
}
const room = (o = {}) => ({
  id: 'MMMMMMMMMM', tipo: 'duelo_multi', modo: 'classic', estado: 'pendiente', soy: 'creador', server_now: 5000, invitacion_expira_at: 9000,
  enlace: { estado: 'abierto', expira_at: 9000, restante_ms: 4000 },
  jugadores: [{ id: 'JJJJJJJJJ0', display_name: 'Edu', es_yo: true, es_creador: true, estado: 'aceptado' }], yo: { estado: 'aceptado', respuestas: [] }, ...o,
});
const P = (i, name, estado = 'aceptado') => ({ id: 'JJJJJJJJJ' + i, display_name: name, es_yo: false, es_creador: false, estado });

// ---- Lógica pura ----------------------------------------------------------------------------------------------------------------------
test('qué invitación mía hay activa: sala > duelo directo > enlace; solo las que he creado y aún no han empezado', () => {
  const { I } = world(), A = I.core.activeFrom;
  assert.equal(A({}, null), null);
  assert.equal(A({ duels: [{ id: 'D', soy: 'rival', estado: 'pendiente' }], multis: [{ id: 'M', soy: 'invitado', estado: 'pendiente' }] }, null), null, 'las invitaciones que me hacen no son mías');
  assert.deepEqual(J(A({ duels: [{ id: 'D', soy: 'creador', estado: 'pendiente', modo: 'stakes' }] }, { estado: 'abierto', modo: 'classic' })), { tipo: 'duel', id: 'D', estado: 'pendiente', modo: 'stakes' });
  assert.deepEqual(J(A({ duels: [{ id: 'D', soy: 'creador', estado: 'pendiente' }], multis: [{ id: 'M', soy: 'creador', estado: 'aceptado', modo: 'classic' }] }, null)), { tipo: 'multi', id: 'M', estado: 'aceptado', modo: 'classic' });
  assert.deepEqual(J(A({}, { estado: 'abierto', modo: 'stakes' })), { tipo: 'enlace', modo: 'stakes' });
  assert.equal(A({ duels: [{ id: 'D', soy: 'creador', estado: 'en_curso' }, { id: 'E', soy: 'creador', estado: 'completado' }] }, { estado: 'cancelado' }), null, 'una partida ya iniciada o terminada no es una invitación');
  assert.equal(I.core.modeLabel('stakes', 'all'), 'Apuestas · Todos contra todos'); assert.equal(I.core.modeLabel('classic', 'one'), 'Clásico · 1 contra 1');
  assert.equal(I.core.startHint(2), 'Podrás empezar cuando seáis al menos 3.'); assert.equal(I.core.startHint(3), '');
});

// ---- Selección y pantalla «Invitar jugadores» --------------------------------------------------------------------------------------
test('selección: «1 contra 1» («Reta a otro jugador.») y «Todos contra todos» («De 3 a 4 jugadores.»); sin «Crear sala por enlace»; no se bloquea por pocos amigos', () => {
  const w = world(); // sin amigos
  const h = w.M.render('pickkind', w.H);
  assert.match(h, /1 contra 1/); assert.match(h, /Reta a otro jugador\./); assert.match(h, /Todos contra todos/); assert.match(h, /De 3 a 4 jugadores\./);
  assert.match(h, /SEQInvites\.go\('one'\)/); assert.match(h, /SEQInvites\.go\('all'\)/);
  assert.ok(!/Crear sala por enlace|Necesitas al menos|seq-d-off|Muy pronto/.test(h), 'ninguna opción deshabilitada ni enlace suelto');
  assert.ok(!/1 vs 1/.test(h));
  const one = world({ lists: { friends: { friends: [{ player: { id: 'AAAAAAAAA1' } }] }, duels: [], multis: [] } });
  assert.ok(!/seq-d-off/.test(one.M.render('pickkind', one.H)), 'tampoco con un solo amigo');
  // sin el flag del Worker se conserva el flujo anterior
  const old = world({ features: { multi_duel: true, multi_duel_links: true } });
  const ho = old.M.render('pickkind', old.H);
  assert.match(ho, /SEQMulti\.one\(\)/); assert.match(ho, /Necesitas al menos 2 amigos/); assert.match(ho, /seq-d-off/, 'sin v2, con pocos amigos sigue desactivado (flujo anterior)'); assert.match(ho, /<linkbtn>/, 'y conserva su botón de enlace');
});

test('«Invitar jugadores»: dos métodos dentro de la misma pantalla, con la diferencia 1 contra 1 / Todos contra todos a la vista', () => {
  const w = world();
  w.S.invKind = 'one'; w.S.pickModo = 'stakes';
  let h = w.I.render(w.H);
  assert.match(h, /Invitar jugadores\|Apuestas · 1 contra 1/);
  assert.match(h, /Invitar por enlace/); assert.match(h, /Comparte una invitación con quien quieras\./);
  assert.match(h, /Invitar a un amigo/); assert.match(h, /Selecciona un amigo disponible\./);
  assert.match(h, /Elige un método/); assert.ok(!/Puedes combinar ambos/.test(h));
  w.S.invKind = 'all'; h = w.I.render(w.H);
  assert.match(h, /Puedes combinar ambos/); assert.ok(!/Elige un método/.test(h));
  assert.match(h, /SEQInvites\.room\('link'\)/); assert.match(h, /SEQInvites\.room\('friend'\)/);
  // sin enlaces servidos, solo el amigo
  const nl = world({ features: { classic_duel: true, multi_duel: true, duel_invites_v2: true } });
  assert.ok(!/Invitar por enlace/.test(nl.I.render(nl.H)));
  assert.ok(w.H.backFn, 'tiene botón atrás');
});

test('1 contra 1: la invitación activa se muestra marcada en SU método, y el otro método queda como alternativa', async () => {
  const w = world({ api: (m, p) => (p === '/duel-links/mine' ? { enlace: { estado: 'abierto', modo: 'classic', restante_ms: 5000 } } : p === '/duels' ? { duels: [] } : { duels: [] }) });
  w.S.invKind = 'one';
  await w.I.refresh();
  const h = w.I.render(w.H);
  assert.match(h, /Invitar por enlace <span class="seq-inv-badge">Activo<\/span>/);
  assert.ok(!/Invitar a un amigo <span class="seq-inv-badge">/.test(h));
  assert.ok(w.calls.some((c) => c[1] === '/duel-links/mine') && w.calls.every((c) => c[0] === 'GET'), 'solo lecturas');
});

// ---- Exclusividad 1 contra 1 y cambio de método ------------------------------------------------------------------------------------
test('1 contra 1 · método enlace: sin invitación crea; con enlace abierto lo recupera (no crea otro); con amigo pendiente pide confirmar el cambio', async () => {
  const mk = (state) => world({ api: (m, p) => (p === '/duel-links/mine' ? { enlace: state.link || null } : p === '/duels' ? { duels: state.duels || [] } : { duels: state.multis || [] }) });
  let w = mk({}); w.I.link(); await flush();
  assert.deepEqual(w.dl, ['create']); assert.equal(w.confirms.length, 0);
  w = mk({ link: { estado: 'abierto', modo: 'classic', restante_ms: 1 } }); w.I.link(); await flush();
  assert.deepEqual(w.dl, ['recover'], 'recupera la invitación existente');
  w = mk({ duels: [{ id: 'DDDDDDDDDD', soy: 'creador', estado: 'pendiente' }] }); w.I.link(); await flush();
  assert.deepEqual(w.dl, [], 'no crea nada hasta confirmar');
  assert.equal(w.confirms.length, 1);
  assert.deepEqual([w.confirms[0].title, w.confirms[0].message, w.confirms[0].confirmLabel, w.confirms[0].cancelLabel], ['¿Cambiar de método?', 'Se cancelará tu invitación al amigo y se creará un enlace.', 'Cambiar', 'Mantenerla']);
  w.confirms[0].onConfirm();
  assert.deepEqual(w.dl, ['create:replace'], 'el cambio lo hace el Worker en una sola transacción (replace)');
  // invitación ya ACEPTADA: no se sustituye, se vuelve a ella
  w = mk({ duels: [{ id: 'DDDDDDDDDD', soy: 'creador', estado: 'aceptado' }] }); w.I.link(); await flush();
  assert.equal(w.confirms.length, 0); assert.deepEqual(w.opened[0], ['duel', 'DDDDDDDDDD']);
  // una sala múltiple activa es incompatible: se recupera
  w = mk({ multis: [{ id: 'SSSSSSSSSS', soy: 'creador', estado: 'pendiente' }] }); w.I.link(); await flush();
  assert.deepEqual(w.opened[0], ['multi', 'SSSSSSSSSS']); assert.deepEqual(w.dl, []);
});

test('1 contra 1 · método amigo: con enlace abierto pide confirmar y el selector crea con replace; con amigo pendiente vuelve a él', async () => {
  const mk = (state) => world({ api: (m, p) => (p === '/duel-links/mine' ? { enlace: state.link || null } : p === '/duels' ? { duels: state.duels || [] } : { duels: [] }) });
  let w = mk({}); w.I.friend(); await flush();
  assert.deepEqual(w.opened, [['pick1v1', 'duel', 'classic']]); assert.equal(w.I.replaceFlag(), false);
  w = mk({ link: { estado: 'abierto', modo: 'classic', restante_ms: 1 } }); w.I.friend(); await flush();
  assert.equal(w.confirms.length, 1); assert.equal(w.confirms[0].message, 'Se cancelará tu enlace en cuanto invites a un amigo.');
  assert.equal(w.opened.length, 0, 'no se navega ni se cancela nada hasta confirmar');
  w.confirms[0].onConfirm();
  assert.deepEqual(w.opened, [['pick1v1', 'duel', 'classic']]); assert.equal(w.I.replaceFlag(), true, 'el selector enviará replace');
  w.I.replaceDone(); assert.equal(w.I.replaceFlag(), false);
  w = mk({ duels: [{ id: 'DDDDDDDDDD', soy: 'creador', estado: 'pendiente' }] }); w.I.friend(); await flush();
  assert.deepEqual(w.opened[0], ['duel', 'DDDDDDDDDD'], 'ya hay un amigo invitado: se recupera, no se duplica');
  // y duels.js manda replace solo cuando se está cambiando de método
  assert.match(DUELS, /var rep = !!\(window\.SEQInvites && SEQInvites\.replaceFlag && SEQInvites\.replaceFlag\(\)\);\s*if \(rep\) body\.replace = true;/);
  assert.match(DUELS, /if \(rep\) SEQInvites\.replaceDone\(\)/);
});

test('un fallo al consultar el Worker se muestra UNA vez y no navega ni cambia nada', async () => {
  const w = world({ api: () => Promise.reject(Object.assign(new Error('x'), { network: true })) });
  w.I.link(); await flush();
  assert.equal(w.said.length, 1); assert.deepEqual(w.dl, []); assert.deepEqual(w.opened, []); assert.equal(w.toasts.length, 0, 'nunca aviso rojo y aviso flotante a la vez');
  w.said.length = 0; w.I.friend(); await flush();
  assert.equal(w.said.length, 1); assert.equal(w.toasts.length, 0);
});

// ---- Todos contra todos: una sala, métodos combinados ------------------------------------------------------------------------------------
test('Todos contra todos: por enlace crea la sala; por amigo la crea y abre el selector; con sala existente se recupera (nunca dos salas)', async () => {
  const mk = (multis) => world({ api: (m, p) => (p === '/multi-duels' ? { duels: multis || [] } : p === '/duels' ? { duels: [] } : { enlace: null }) });
  let w = mk(); w.S.invKind = 'all'; w.I.room('link'); await flush();
  assert.deepEqual(w.ml, ['create']); assert.equal(w.I.consumePicker(), false);
  w = mk(); w.I.room('friend'); await flush();
  assert.deepEqual(w.ml, ['create']); assert.equal(w.I.consumePicker(), true, 'al entrar en la sala se abre el selector de amigos');
  w = mk([{ id: 'SSSSSSSSSS', soy: 'creador', estado: 'pendiente' }]); w.I.room('link'); await flush();
  assert.deepEqual(w.ml, [], 'no se crea otra sala'); assert.deepEqual(w.opened[0], ['multi', 'SSSSSSSSSS']);
  // con un enlace 1 contra 1 abierto hay que confirmarlo antes y se cancela por la ruta sin token
  w = world({ api: (m, p) => (p === '/duel-links/mine' ? { enlace: { estado: 'abierto', modo: 'classic', restante_ms: 5 } } : p === '/duels' || p === '/multi-duels' ? { duels: [] } : {}) });
  w.I.room('link'); await flush();
  assert.equal(w.confirms.length, 1); assert.deepEqual(w.ml, []);
  w.confirms[0].onConfirm(); await flush();
  assert.ok(w.calls.some((c) => c[0] === 'POST' && c[1] === '/duel-links/mine/cancel')); assert.deepEqual(w.ml, ['create']);
});

test('sala de espera del anfitrión: «Sala de espera», modalidad, tiempo, contador, lista única, enlace y empezar solo con 3', () => {
  const w = world();
  w.S.data = room({ jugadores: [room().jugadores[0], P(1, 'Ana')] });
  let h = w.M.render('multi', w.H);
  assert.match(h, /Sala de espera/); assert.ok(!/Esperando jugadores/.test(h)); assert.match(h, /Clásico · Todos contra todos/);
  assert.equal((h.match(/Esperando jugador…/g) || []).length, 2, 'dos plazas libres');
  assert.ok(h.indexOf('2/4 jugadores') < h.indexOf('Podrás empezar') && h.indexOf('Podrás empezar') < h.indexOf('<who>'), 'el aviso va justo bajo el contador');
  assert.match(h, /aria-expanded="false"/); assert.match(h, /Caduca en <b id="seq-d-count">/);
  assert.match(h, /2\/4 jugadores/); assert.match(h, /<panel v2=true enlace=abierto>/);
  assert.match(h, /Podrás empezar cuando seáis al menos 3\./); assert.ok(!/Empezar duelo/.test(h), 'sin botón enorme desactivado');
  assert.ok(!/disabled/.test(h)); assert.match(h, /Invitar amigos/); assert.match(h, /Cancelar sala/);
  assert.ok(!/https?:|#duelo/.test(h), 'la URL completa no se muestra');
  assert.equal((h.match(/<who>/g) || []).length, 2, 'una sola lista de participantes');
  w.S.data = room({ jugadores: [room().jugadores[0], P(1, 'Ana'), P(2, 'Luis'), P(3, 'Eva', 'invitado')] });
  h = w.M.render('multi', w.H);
  assert.ok(!/Esperando jugador…/.test(h), 'sala llena: ninguna plaza libre');
  assert.match(h, /4\/4 jugadores/); assert.match(h, /Empezar duelo/); assert.ok(!/Podrás empezar/.test(h)); assert.ok(!/Invitar amigos/.test(h), 'sala llena: no se puede invitar más');
  assert.match(h, /action\('start'\)/);
  // modo apuestas
  w.S.data = room({ modo: 'stakes' }); assert.match(w.M.render('multi', w.H), /Apuestas · Todos contra todos/);
});

test('invitar a un amigo desde la sala: solo disponibles, envía UN id y se repinta con lo que devuelve el Worker; un error se dice una vez', async () => {
  const w = world({ api: () => ({ id: 'MMMMMMMMMM' }), lists: { friends: { friends: [{ player: { id: 'AAAAAAAAA1', display_name: '<b>Ana</b>' }, online: true }, { player: { id: 'AAAAAAAAA2', display_name: 'Luis' }, online: false }, { player: { id: 'JJJJJJJJJ1', display_name: 'Ya dentro' }, online: true }] }, duels: [], multis: [] } });
  w.S.data = room({ jugadores: [room().jugadores[0], P(1, 'Ya dentro')] });
  w.I._I.picker = true;
  const h = w.M.render('multi', w.H);
  assert.match(h, /aria-expanded="true"/); assert.ok(h.indexOf('>Invitar amigos<') < h.indexOf('seq-inv-friends'), 'la lista va debajo del botón'); assert.ok(!/Ocultar amigos/.test(h));
  assert.ok(!h.includes('<b>Ana</b>') && h.includes('&lt;b&gt;Ana'), 'nombres escapados');
  assert.ok(!/Ya dentro<\/who>.*Invitar/.test(h.replace(/\n/g, '')) || !/invite\('JJJJJJJJJ1'\)/.test(h), 'quien ya está en la sala no se ofrece');
  assert.match(h, /invite\('AAAAAAAAA1'\)/); assert.ok(!/invite\('AAAAAAAAA2'\)/.test(h), 'sin conexión: no se invita');
  w.I.invite('AAAAAAAAA1'); await flush();
  const post = w.calls.find((c) => c[0] === 'POST'); assert.deepEqual(J(post), ['POST', '/multi-duels/MMMMMMMMMM/invite', { rivales: ['AAAAAAAAA1'] }]);
  assert.deepEqual(w.opened.pop(), ['apply', 'MMMMMMMMMM']);
  w.I.invite("x'><script>"); assert.equal(w.calls.filter((c) => c[0] === 'POST').length, 1, 'ids no válidos se ignoran');
  const bad = world({ api: () => Promise.reject(Object.assign(new Error('x'), { code: 'room_full' })) });
  bad.S.data = room(); bad.I.invite('AAAAAAAAA1'); await flush();
  assert.deepEqual(J(bad.said.filter((x) => x[1])), [['ERR:room_full', true]]); assert.equal(bad.toasts.length, 0);
  assert.ok(bad.calls.some((c) => c[0] === 'reload'), 'se vuelve a leer la sala (la verdad la tiene el Worker)');
});

// ---- Cancelación ---------------------------------------------------------------------------------------------------------------------------
test('cancelar sala: confirmación con los textos exactos y solo entonces se cancela; cancelar invitación directa: sin mencionar enlace', () => {
  const w = world();
  let cancelled = 0; w.ctx.SEQMulti.action = (a) => { if (a === 'cancel') cancelled++; };
  w.I.cancelRoom();
  assert.deepEqual([w.confirms[0].title, w.confirms[0].message, w.confirms[0].confirmLabel, w.confirms[0].cancelLabel], ['¿Cancelar sala?', 'Los participantes tendrán que salir de esta sala.', 'Cancelar sala', 'Seguir esperando']);
  assert.equal(cancelled, 0); w.confirms[0].onConfirm(); assert.equal(cancelled, 1);
  w.I.cancelDuel();
  const c = w.confirms[1];
  assert.deepEqual([c.title, c.confirmLabel, c.cancelLabel], ['¿Cancelar invitación?', 'Cancelar invitación', 'Seguir esperando']);
  assert.ok(!/enlace/i.test(c.message), 'una invitación directa no menciona un enlace inexistente: ' + c.message);
  w.confirms[1].onConfirm(); assert.deepEqual(w.calls.filter((x) => x[0] === 'duelAction'), [['duelAction', 'cancel']]);
  // y la sala de espera con listos también pasa por la confirmación
  assert.match(MULTI, /SEQInvites\.cancelRoom\(\)/);
});

test('invitación directa pendiente: sala «Esperando jugadores» con anfitrión, invitado, contador 1/2 y cancelar con confirmación', () => {
  const w = world();
  const h = w.I.directWaiting({ modo: 'stakes' }, w.H, w.H.player({ display_name: 'Ana', id: 'AAAAAAAAA1' }));
  assert.match(h, /Esperando jugadores/); assert.match(h, /Apuestas · 1 contra 1/); assert.match(h, /1\/2 jugadores/); assert.match(h, /Anfitrión/); assert.match(h, /Invitación enviada/);
  assert.match(h, /SEQInvites\.cancelDuel\(\)/); assert.match(h, /Cancelar invitación/);
  assert.match(DUELS, /SEQInvites\.directWaiting\(d, HELPERS, p\)/);
});

// ---- Recuperación ---------------------------------------------------------------------------------------------------------------------------
test('«Elige cómo jugar» recupera la invitación activa con un aviso (no crea otra) y «Ver invitación» abre la que corresponde', async () => {
  const w = world({ api: (m, p) => (p === '/duel-links/mine' ? { enlace: null } : p === '/duels' ? { duels: [] } : { duels: [{ id: 'SSSSSSSSSS', soy: 'creador', estado: 'pendiente', modo: 'classic' }] }) });
  w.I.onKind(); await flush(); await flush();
  const h = w.M.render('pickkind', w.H);
  assert.match(h, /Tienes una sala esperando jugadores\./); assert.match(h, /SEQInvites\.resume\(\)/);
  w.I.resume(); assert.deepEqual(w.opened.pop(), ['multi', 'SSSSSSSSSS']);
  assert.ok(w.calls.every((c) => c[0] === 'GET' || c[0] === 'rerender' || c[0] === 'summary'), 'recuperar solo lee');
  const none = world(); assert.equal(none.I.banner(), '');
});

test('el módulo solo existe con features.duel_invites_v2 (y classic_duel); sin ella todo es el comportamiento anterior', () => {
  const off = world({ features: { classic_duel: true, multi_duel: true, duel_links: true } });
  assert.equal(off.I.on(), false); assert.equal(off.I.banner(), ''); assert.equal(off.I.replaceFlag(), false);
  assert.equal(world({ features: { duel_invites_v2: true } }).I.on(), false, 'sin Duelo online no hay invitaciones');
  assert.equal(world().I.on(), true);
  assert.match(read('src/online/online.js'), /duel_invites_v2/);
});

// ---- Cableado y seguridad ------------------------------------------------------------------------------------------------------------------
test('cableado: index.html y sw.js cargan el módulo y su hoja; duels.js lo integra; el cliente conserva el flag que declara el Worker', () => {
  const HTML = read('index.html'), SW = read('sw.js');
  assert.match(HTML, /<script src="src\/online\/duel-invites\.js\?v=\d+"><\/script>/); assert.match(HTML, /<link rel="stylesheet" href="styles\/duel-invites\.css\?v=\d+">/);
  assert.ok(SW.includes("'./src/online/duel-invites.js'") && SW.includes("'./styles/duel-invites.css'"));
  for (const f of ['SEQInvites.render(HELPERS)', 'openInvites: openInvites', "S.screen === 'invites'", 'SEQInvites.onKind()']) assert.ok(DUELS.includes(f), f);
  assert.match(DUELS, /link_open: 'Ya tienes una invitación activa\.'/);
  assert.match(DUELS, /friend_locked/);
});

test('seguridad del módulo: sin innerHTML/eval, textos del servidor siempre por H.esc()/H.player(), sin consola', () => {
  const code = INV.replace(/\/\/.*$/gm, '');
  assert.ok(!/innerHTML|document\.write|eval\(|new Function|console\./.test(code));
  assert.doesNotMatch(INV, /\p{Extended_Pictographic}/u);
  // los datos del servidor entran por H.player()/H.who(); lo único que se concatena sin pasar por ellos son textos fijos o contadores numéricos
  assert.ok(!/d\.display_name|j\.display_name|\.display_name\s*\+/.test(code.replace(/H\.player\(session\(\) \|\| \{\}\)/g, '')), 'nunca se pinta un nombre en bruto');
  assert.doesNotMatch(code, /localStorage|sessionStorage/, 'no guarda nada: el estado vive en el Worker');
});
