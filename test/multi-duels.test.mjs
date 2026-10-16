// Duelo online múltiple 2.4 (cliente): lógica pura, pintado seguro, cableado y que no toca el 1 vs 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SRC = read('src/online/multi-duels.js');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { v = Math.floor(Number(v)); return isFinite(v) && v > 0 ? v : 0; };
function load() {
  const calls = [];
  const S = { screen: 'multi', id: 'MMMMMMMMMM', data: null, lists: { friends: null }, pickModo: 'classic', lastIdx: -1 };
  const H = {
    S, esc, num, ico: (n) => '[' + n + ']', serverNow: () => 5000, safeId: (i) => (/^[0-9A-Z]{10}$/.test(i) ? i : ''),
    player: (p) => ({ name: esc((p && p.display_name) || 'Jugador'), avatar: '<i>av</i>', id: (p && /^[0-9A-Z]{10}$/.test(p.id) ? p.id : '') }),
    who: (p, sub) => '<who>' + p.name + (sub ? '|' + sub : '') + '</who>',
    header: (t, s) => '<hdr>' + t + '|' + s + '</hdr>', gameHeader: (t) => '<game>' + t + '</game>', topbarShown() {},
    isOnline: (f) => !(f && f.online === false), emptyState: () => '<empty>', backToList() {},
    questionBlock: (scope, k) => '<q k=' + k + '>', classicWin: () => ({ k: 2 }),
    resultSoundOnce() {}, xpFor: (_k, _d, a) => 10 * num(a), syncXpOnce() {}, xpChipHtml: (x) => '<xp>' + x + '</xp>',
    render() {}, refresh() {}, open: (a, b) => calls.push(['open', a, b]), apply: (d) => calls.push(['apply', d.id]),
    act: (m, p, b, then) => { calls.push([m, p, b]); then && then({ id: 'NNNNNNNNNN' }); }, pick1v1: (k, m) => calls.push(['pick1v1', k, m]), pickModeMulti: (ids) => calls.push(['pickModeMulti', ids]),
    modeLine: () => '<mode>', retoModeName: (x) => 'Modo ' + (x && x.modo), left: () => '2 d 23 h',
  };
  const ctx = vm.createContext({ SEQDuels: { _h: H }, Math, String, Number, Object, isFinite, console });
  ctx.window = ctx;
  vm.runInContext(SRC, ctx);
  return { M: ctx.SEQMulti, H, S, calls };
}

const J = (i, name, o = {}) => ({ id: 'JJJJJJJJJ' + i, display_name: name, avatar: 'sombrero', es_yo: i === 0, es_creador: i === 0, estado: 'aceptado', listo: false, abandonado: false, ...o });
const room = (o = {}) => ({
  id: 'MMMMMMMMMM', tipo: 'duelo_multi', modo: 'classic', estado: 'pendiente', soy: 'creador', t0: null, n_preguntas: 20, server_now: 5000,
  invitacion_expira_at: 9000, listos_expira_at: null, preguntas: [], marcador: null, resultado: null,
  jugadores: [J(0, 'Edu'), J(1, 'Ana', { estado: 'invitado' }), J(2, 'Luis')], yo: { estado: 'aceptado', listo: false, respuestas: [], aciertos: 0 }, ...o,
});

test('lógica pura: ordinal, estados de jugador y recuento de pendientes', () => {
  const { M } = load(), C = M.core;
  assert.equal(C.ordinal(1), '1.º'); assert.equal(C.ordinal(4), '4.º'); assert.equal(C.ordinal(0), '');
  assert.equal(C.playerStatus({ estado: 'invitado' }, 'pendiente'), 'Sin responder');
  assert.equal(C.playerStatus({ estado: 'aceptado' }, 'pendiente'), 'Ha aceptado');
  assert.equal(C.playerStatus({ estado: 'aceptado', es_creador: true }, 'pendiente'), 'Anfitrión');
  assert.equal(C.playerStatus({ estado: 'aceptado', listo: true }, 'aceptado'), 'Listo');
  assert.equal(C.playerStatus({ estado: 'rechazado' }, 'pendiente'), 'Ha rechazado');
  assert.equal(C.pendingCount([{ estado: 'pendiente', mi_estado: 'invitado' }, { estado: 'pendiente', mi_estado: 'aceptado' }, { estado: 'en_curso', mi_estado: 'aceptado' }, { estado: 'completado', mi_estado: 'aceptado' }]), 2);
  assert.equal(C.pendingCount(null), 0);
});
test('resultado y frases: gana el primero, pierden los demás, y el margen elige la bolsa', () => {
  const { M } = load(), C = M.core;
  const cl = (...p) => p.map(([pos, pts, me, name], i) => ({ id: 'JJJJJJJJJ' + i, display_name: name || 'J' + i, posicion: pos, puntuacion: pts, es_yo: !!me }));
  // Gano con 15 frente a 9: victoria, ventaja 6 sobre el segundo.
  assert.deepEqual({ ...C.outcome({ mi_posicion: 1, mi_puntuacion: 15, clasificacion: cl([1, 15, true], [2, 9], [3, 4]) }, false) }, { res: 'win', margin: 6, pos: 1, winner: '' });
  // Empato en cabeza: empate.
  assert.equal(C.outcome({ mi_posicion: 1, mi_puntuacion: 12, clasificacion: cl([1, 12, true], [1, 12], [3, 5]) }, false).res, 'draw');
  // Segundo de cuatro con 10 frente a 16: derrota (no hay «puesto medio»), distancia 6 y nombre del ganador.
  const l = C.outcome({ mi_posicion: 2, mi_puntuacion: 10, clasificacion: cl([1, 16, false, 'Ana'], [2, 10, true], [3, 8], [4, 2]) }, false);
  assert.deepEqual({ ...l }, { res: 'loss', margin: 6, pos: 2, winner: 'Ana' });
  assert.equal(C.outcome({ mi_posicion: 4, mi_puntuacion: 2, clasificacion: [] }, true).res, 'gone');
  assert.equal(C.categoryTitle({ res: 'win', margin: 9 }), 'Victoria aplastante'); assert.equal(C.categoryTitle({ res: 'win', margin: 1 }), 'Victoria por la mínima');
  assert.equal(C.categoryTitle({ res: 'loss', margin: 5 }), 'Derrota clara'); assert.equal(C.categoryTitle({ res: 'loss', margin: 12 }), 'Derrota sin paliativos');
  // Frases propias del múltiple (hablan de «la mesa», no de «el rival»): estables por sala, con el nombre del ganador y sin llaves sueltas.
  const f = (o, id) => C.phraseFor(o, id);
  assert.equal(f({ res: 'loss', margin: 6, winner: 'Ana' }, 'SALA'), f({ res: 'loss', margin: 6, winner: 'Ana' }, 'SALA'));
  for (const o of [{ res: 'win', margin: 1 }, { res: 'win', margin: 5 }, { res: 'win', margin: 9 }, { res: 'draw', margin: 0 }, { res: 'loss', margin: 1, winner: 'Ana' }, { res: 'loss', margin: 5, winner: 'Ana' }, { res: 'loss', margin: 9, winner: 'Ana' }, { res: 'gone', margin: 0 }]) {
    for (const id of ['A', 'B', 'C', 'SALA1']) { const t = f(o, id); assert.ok(t.length > 10 && !/[{}]/.test(t) && !/\brival\b/i.test(t), t); }
  }
  assert.ok(['A', 'B', 'C', 'D', 'E', 'F'].some((id) => f({ res: 'loss', margin: 5, winner: 'Ana' }, id).includes('Ana')));
  assert.ok(f({ res: 'loss', margin: 5, winner: 'X'.repeat(40) }, 'A').length < 120);
});
test('elegir modo: apuestas + múltiple ya está activo', () => {
  const { M, S, H } = load();
  let h = M.render('pickkind', H);
  assert.match(h, /1 vs 1/); assert.match(h, /SEQMulti\.startPick\(\)/);
  S.pickModo = 'stakes';
  h = M.render('pickkind', H);
  assert.ok(!/Muy pronto/.test(h)); assert.match(h, /SEQMulti\.startPick\(\)/);
});
test('selector de amigos: 2 a 3 en línea, los desconectados no se pueden elegir y los nombres se escapan', () => {
  const { M, H, S } = load();
  S.lists.friends = { friends: [{ player: { id: 'AAAAAAAAA1', display_name: '<b>Ana</b>' }, online: true }, { player: { id: 'AAAAAAAAA2', display_name: 'Luis' }, online: false }, { player: { id: 'AAAAAAAAA3', display_name: 'Eva' }, online: true }] };
  M.startPick(); assert.equal(S.screen, 'multipick');
  let h = M.render('multipick', H);
  assert.ok(!h.includes('<b>Ana</b>')); assert.match(h, /&lt;b&gt;Ana/);
  assert.match(h, /disabled/); assert.ok(!/toggle\('AAAAAAAAA2'\)/.test(h), 'sin conexión: no se elige');
  M.toggle('AAAAAAAAA1'); M.toggle('AAAAAAAAA3'); assert.deepEqual(Array.from(S.multiSel), ['AAAAAAAAA1', 'AAAAAAAAA3']);
  h = M.render('multipick', H); assert.ok(!/ disabled onclick/.test(h)); assert.match(h, /Crear sala · 3 jugadores/);
  M.toggle('NOVALIDO'); assert.equal(S.multiSel.length, 2, 'ids no válidos se ignoran');
});
test('crear sala: envía solo ids de amigos y el modo; abre la sala devuelta', () => {
  const { M, H, S, calls } = load();
  M.create(); assert.equal(calls.length, 0, 'sin selección no envía nada');
  S.multiSel = ['AAAAAAAAA1', 'AAAAAAAAA3'];
  M.create();
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ['POST', '/multi-duels', { rivales: ['AAAAAAAAA1', 'AAAAAAAAA3'], modo: 'classic' }]);
  assert.deepEqual(calls[1], ['open', 'multi', 'NNNNNNNNNN']);
  S.multiSel = ['AAAAAAAAA1', 'AAAAAAAAA3', 'AAAAAAAAA4', 'AAAAAAAAA5']; calls.length = 0; M.create(); assert.equal(calls.length, 0, 'máximo 3 invitados');
});
test('sala pendiente: el creador necesita 3 aceptados para empezar; el invitado acepta o rechaza', () => {
  const { M, H, S } = load();
  let h = M.render('multi', Object.assign(H, {})); // sin datos
  assert.match(h, /Cargando/);
  S.data = room(); h = M.render('multi', H);
  assert.match(h, /Esperando a tus invitados/); assert.match(h, /disabled/); assert.match(h, /Cancelar sala/);
  S.data = room({ jugadores: [J(0, 'Edu'), J(1, 'Ana'), J(2, 'Luis')] }); h = M.render('multi', H);
  assert.match(h, /Empezar con 3/); assert.ok(!/disabled onclick="SEQMulti\.action\('start'\)"/.test(h));
  S.data = room({ soy: 'invitado', yo: { estado: 'invitado', respuestas: [] }, jugadores: [J(0, 'Edu', { es_yo: false }), J(1, 'Ana', { es_yo: true, estado: 'invitado' }), J(2, 'Luis', { es_yo: false })] });
  h = M.render('multi', H); assert.match(h, /action\('accept'\)/); assert.match(h, /action\('reject'\)/);
});
test('sala de espera y partida: botón Listo, marcador de todos y pregunta; fuera de la sala no se juega', () => {
  const { M, H, S } = load();
  S.data = room({ estado: 'aceptado' });
  let h = M.render('multi', H); assert.match(h, /Sala de espera/); assert.match(h, /action\('ready'\)/);
  S.data = room({ estado: 'aceptado', yo: { estado: 'aceptado', listo: true, respuestas: [] } }); h = M.render('multi', H);
  assert.ok(!/action\('ready'\)/.test(h)); assert.match(h, /Empezar ya/);
  const play = room({ estado: 'en_curso', t0: 1000, preguntas: [1, 2, 3], marcador: { jugadores: [{ id: 'JJJJJJJJJ0', puntos: 2, posicion: 2 }, { id: 'JJJJJJJJJ1', puntos: 3, posicion: 1 }, { id: 'JJJJJJJJJ2', puntos: 0, posicion: 3, abandonado: true }] } });
  S.data = play; h = M.render('multi', H);
  assert.match(h, /<q k=2>/); assert.match(h, /seq-m-board/); assert.match(h, /3\/20/); assert.ok(h.indexOf('1.º') < h.indexOf('2.º'), 'ordenado por puesto');
  S.data = room({ estado: 'en_curso', t0: 1000, preguntas: [1, 2, 3], yo: { estado: 'aceptado', completado: true, respuestas: [] } }); h = M.render('multi', H);
  assert.match(h, /Has terminado/);
  S.data = room({ estado: 'en_curso', t0: 1000, preguntas: [1], yo: { estado: 'fuera', respuestas: [] } }); h = M.render('multi', H); assert.match(h, /Ya no estás en esta sala/);
  S.data = room({ estado: 'en_curso', t0: 9000 }); h = M.render('multi', H); assert.match(h, /Empieza en/);
});
test('tarjeta final: clasificación completa con puestos compartidos, XP por acierto y revancha solo para el creador', () => {
  const { M, H, S } = load();
  const clas = [{ id: 'JJJJJJJJJ1', display_name: 'Ana', posicion: 1, puntuacion: 15 }, { id: 'JJJJJJJJJ0', display_name: 'Edu', es_yo: true, posicion: 1, puntuacion: 15 }, { id: 'JJJJJJJJJ2', display_name: '<i>Luis</i>', posicion: 3, puntuacion: 9, abandonado: true }];
  S.data = room({ estado: 'completado', yo: { estado: 'aceptado', aciertos: 15, respuestas: [] }, resultado: { mi_posicion: 1, mi_puntuacion: 15, n_jugadores: 3, empate_en_cabeza: true, clasificacion: clas } });
  let h = M.render('multi', H);
  assert.match(h, /Duelo clásico/); assert.doesNotMatch(h, /múltiple/); assert.match(h, /Empate en cabeza/); assert.match(h, /<xp>150<\/xp>/);
  assert.equal((h.match(/seq-m-row/g) || []).length >= 3, true); assert.ok(!h.includes('<i>Luis</i>')); assert.match(h, /se fue/);
  assert.match(h, /action\('rematch'\)/);
  S.data.soy = 'invitado'; h = M.render('multi', H); assert.ok(!/action\('rematch'\)/.test(h));
  S.data = room({ estado: 'cancelado', motivo_fin: 'sin_listos' }); h = M.render('multi', H); assert.match(h, /Cancelada/); assert.match(h, /puntualidad/);
});
test('fila de la lista: invitación con Aceptar/Rechazar; completado con puesto', () => {
  const { M, H } = load();
  const base = { id: 'MMMMMMMMMM', tipo: 'duelo_multi', jugadores: [{ id: 'JJJJJJJJJ1', display_name: 'Ana', es_yo: false }, { id: 'JJJJJJJJJ2', display_name: 'Luis', es_yo: false }, { id: 'JJJJJJJJJ0', display_name: 'Yo', es_yo: true }] };
  let h = M.row({ ...base, estado: 'pendiente', soy: 'invitado', mi_estado: 'invitado' }, H);
  assert.match(h, /listAction\('MMMMMMMMMM','accept'\)/); assert.match(h, /Ana \+1/);
  h = M.row({ ...base, estado: 'completado', mi_estado: 'aceptado', resultado: { mi_posicion: 2, n_jugadores: 3, mi_puntuacion: 11 } }, H);
  assert.match(h, /2\.º de 3 · 11 aciertos/); assert.ok(!/listAction/.test(h));
});
test('acciones: solo nombres conocidos y ruta propia /multi-duels', () => {
  const { M, S, calls } = load();
  M.action('hackea'); assert.equal(calls.length, 0);
  M.action('ready'); assert.deepEqual(calls[0], ['POST', '/multi-duels/MMMMMMMMMM/ready', undefined]);
  M.listAction('mal', 'accept'); M.listAction('MMMMMMMMMM', 'start'); assert.equal(calls.length, 2 - 1 + 1 - 1 + 1 - 1 + 1, 'lista: solo aceptar o rechazar');
  M.one(); assert.deepEqual(calls[calls.length - 1], ['pick1v1', 'duel', 'classic']);
});
test('no toca el 1 vs 1: el módulo no registra estadísticas ni logros y duels.js solo delega', () => {
  const code = SRC.replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/registerOnlineDuelResult|recordDuel/.test(code), 'el múltiple no cuenta para estadísticas de Duelo 1 vs 1');
  assert.ok(!/innerHTML\s*=/.test(code), 'el módulo devuelve HTML; nunca lo inserta él');
  const d = read('src/online/duels.js');
  assert.match(d, /features\(\)\.multi_duel && window\.SEQMulti/);
  assert.match(d, /'\/multi-duels\/'/);
  assert.ok(!/recordDuel\([^)]*multi/.test(d));
  const rec = d.match(/function recordResult\(d\) \{[\s\S]*?\n  \}/)[0];
  assert.match(rec, /S\.screen !== 'duel' && S\.screen !== 'reto'/, 'recordResult sigue ignorando la sala múltiple');
});
test('cableado: script en index.html, en el shell sin conexión y aviso de invitación en el buzón', () => {
  assert.match(read('index.html'), /src\/online\/multi-duels\.js\?v=\d+/);
  assert.match(read('sw.js'), /\.\/src\/online\/multi-duels\.js/);
  const ctx = vm.createContext({ window: {}, document: { addEventListener() {}, readyState: 'complete', visibilityState: 'visible' }, setTimeout() { return 0; }, clearTimeout() {}, navigator: {}, localStorage: { getItem() { return null; }, setItem() {} } });
  ctx.window = ctx; vm.runInContext(read('src/online/inbox.js'), ctx);
  const C = ctx.SEQInbox.core;
  const m = [{ id: 'MMMMMMMMMM', estado: 'pendiente', mi_estado: 'invitado', jugadores: [{ display_name: 'Ana', es_yo: false }, { display_name: 'Yo', es_yo: true }] }, { id: 'MMMMMMMMM2', estado: 'pendiente', mi_estado: 'aceptado', jugadores: [] }];
  const p = C.pendingFrom([], [], m);
  assert.deepEqual(Array.from(p.map((x) => x.kind + ':' + x.id + ':' + x.name)), ['multi:MMMMMMMMMM:Ana']);
  assert.equal(C.dotCount([], [], m), 1);
  assert.match(C.textFor(p).title, /Ana te invita a un duelo múltiple/);
  assert.equal(C.pendingFrom([], []).length, 0, 'sin tercer argumento sigue igual');
});
test('compartir: texto plano con la clasificación y sin HTML', () => {
  const { M } = load();
  const t = M.shareText({ modo: 'stakes', resultado: { clasificacion: [{ posicion: 1, display_name: 'Ana', puntuacion: 7 }, { posicion: 2, display_name: 'Edu', puntuacion: 3 }] } });
  assert.match(t, /por apuestas/); assert.match(t, /1\.º Ana · 7/); assert.match(t, /2\.º Edu · 3/);
  assert.equal(M.shareText({}), '');
});

// ---- Reto múltiple (2.5) ----
const mreto = (o = {}) => ({
  id: 'RRRRRRRRRR', tipo: 'reto_multi', estado: 'pendiente', soy: 'creador', modo: 'estandar', nivel: null, n_preguntas: 20, server_now: 5000, expira_at: 9000,
  jugadores: [J(0, 'Edu', { estado: 'aceptado', empezado: false, terminado: false }), J(1, 'Ana', { estado: 'invitado', es_creador: false, empezado: false, terminado: false }), J(2, 'Luis', { estado: 'invitado', es_creador: false, empezado: false, terminado: false })],
  yo: { invitacion: 'aceptado', empezado: false, terminado: false, aciertos: 0, actual: null }, resultado: null, ...o,
});
test('Reto: elegir «1 vs 1 / Múltiple» y los amigos (todos, sin exigir presencia); sigue al modo', () => {
  const { M, H, S, calls } = load();
  S.pickKind = 'reto';
  let h = M.render('pickkind', H);
  assert.match(h, /Reto/); assert.match(h, /A su ritmo/); assert.ok(!/Clasificación final/.test(h));
  M.one(); assert.deepEqual(calls[calls.length - 1], ['pick1v1', 'reto', 'classic']);
  S.lists.friends = { friends: [{ player: { id: 'AAAAAAAAA1', display_name: 'Ana' }, online: false }, { player: { id: 'AAAAAAAAA2', display_name: 'Luis' }, online: true }, { player: { id: 'AAAAAAAAA3', display_name: 'Eva' }, online: false }] };
  M.startPick(); h = M.render('multipick', H);
  assert.match(h, /3 días/); assert.ok(!/Sin conexión/.test(h)); assert.match(h, /toggle\('AAAAAAAAA1'\)/);
  M.toggle('AAAAAAAAA1'); M.toggle('AAAAAAAAA2');
  h = M.render('multipick', H); assert.match(h, /SEQMulti\.next\(\)/); assert.match(h, /Elegir el modo · 3 jugadores/);
  M.next(); assert.equal(JSON.stringify(calls[calls.length - 1]), JSON.stringify(['pickModeMulti', ['AAAAAAAAA1', 'AAAAAAAAA2']]));
});
test('Reto: pantallas de invitación, espera, tu turno, parte hecha y partida (null → juega el Reto de siempre)', () => {
  const { M, H } = load();
  let h = M.renderMReto(mreto({ soy: 'invitado', yo: { invitacion: 'invitado' } }), H, '<head>');
  assert.match(h, /te ha retado/); assert.match(h, /retoAction\('accept'\)/); assert.match(h, /retoAction\('reject'\)/);
  h = M.renderMReto(mreto(), H, '<head>'); assert.match(h, /Esperando respuestas/); assert.match(h, /retoAction\('cancel'\)/);
  h = M.renderMReto(mreto({ soy: 'invitado' }), H, '<head>'); assert.ok(!/retoAction\('cancel'\)/.test(h), 'solo el creador cancela');
  h = M.renderMReto(mreto({ estado: 'aceptado' }), H, '<head>'); assert.match(h, /Tu turno, aspirante/); assert.match(h, /retoAction\('start'\)/);
  h = M.renderMReto(mreto({ estado: 'aceptado', yo: { invitacion: 'aceptado', empezado: true, terminado: true, aciertos: 12 } }), H, '<head>'); assert.match(h, /Tu parte está hecha: 12\/20/);
  assert.equal(M.renderMReto(mreto({ estado: 'aceptado', yo: { invitacion: 'aceptado', empezado: true, terminado: false, actual: { indice: 0 } } }), H, '<head>'), null);
  h = M.renderMReto(mreto({ yo: { invitacion: 'rechazado' } }), H, '<head>'); assert.match(h, /Has rechazado/);
});
test('Reto: final con clasificación (también quien no jugó), sin revancha, y cancelado/expirado con su texto', () => {
  const { M, H } = load();
  const c = (i, pos, pt, o = {}) => ({ id: 'JJJJJJJJJ' + i, display_name: ['Edu', 'Ana', 'Luis'][i], avatar: 'x', es_yo: i === 0, posicion: pos, jugo: true, puntuacion: pt, ...o });
  const h = M.renderMReto(mreto({ estado: 'completado', resultado: { clasificacion: [c(0, 1, 15), c(1, 2, 9), c(2, 3, null, { jugo: false })], mi_posicion: 1, mi_puntuacion: 15, n_jugadores: 3 }, yo: { aciertos: 15 } }), H, '<head>');
  assert.match(h, /seq-m-rank/); assert.match(h, /Reto · /); assert.match(h, /no jugó/); assert.match(h, /VICTORIA/);
  assert.ok(!/rematch/.test(h), 'sin revancha'); assert.match(h, /Volver a Retos/);
  assert.match(M.renderMReto(mreto({ estado: 'cancelado', motivo_fin: 'todos_rechazan' }), H, ''), /rechazaron/);
  assert.match(M.renderMReto(mreto({ estado: 'expirado' }), H, ''), /Caducado/);
  assert.match(M.shareText(mreto({ resultado: { clasificacion: [c(0, 1, 15)] } })), /^Reto múltiple en SirEdwards Quiz/);
});
test('Reto: filas de la lista y recuento de pendientes', () => {
  const { M, H } = load();
  const row = (o) => M.rowReto({ id: 'RRRRRRRRRR', tipo: 'reto_multi', estado: 'pendiente', modo: 'estandar', mi_estado: 'invitado', yo: { terminado: false },
    jugadores: [J(0, 'Edu'), J(1, 'Ana'), J(2, 'Luis')].map((j, i) => ({ ...j, es_yo: i === 2 })), resultado: null, ...o }, H);
  assert.match(row({}), /Te han retado/); assert.match(row({}), /listAction\('mreto','RRRRRRRRRR','accept'\)/); assert.match(row({}), /open\('mreto'/);
  assert.match(row({ mi_estado: 'aceptado', estado: 'aceptado' }), /Te toca jugar/);
  assert.match(row({ mi_estado: 'aceptado', estado: 'completado', resultado: { mi_posicion: 2, n_jugadores: 3, mi_puntuacion: 9 } }), /2\.º de 3 · 9 aciertos/);
  assert.equal(M.pendingCountMReto([{ mi_estado: 'invitado', estado: 'pendiente' }, { mi_estado: 'aceptado', estado: 'aceptado', yo: { terminado: false } }, { mi_estado: 'aceptado', estado: 'aceptado', yo: { terminado: true } }, { mi_estado: 'rechazado', estado: 'aceptado' }, { mi_estado: 'invitado', estado: 'completado' }]), 2);
  assert.equal(M.pendingCountMReto(null), 0);
});
test('Reto: el Reto múltiple no registra resultados de Duelo y duels.js lo enlaza a su ruta', () => {
  const d = read('src/online/duels.js');
  assert.match(d, /\/multi-challenges\//); assert.match(d, /S\.isMulti = screen === 'mreto'/);
  assert.match(d, /if \(S\.isMulti\) \{ if \(d\.estado === 'aceptado'/, 'recordResult sale antes de registrar estadísticas');
  assert.match(d, /features\(\)\.multi_reto && window\.SEQMulti/);
});
