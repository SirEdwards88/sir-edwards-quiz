// Duelos 2.1 (cliente): nombres, marcador, carta final, apuestas ocultas, Rankings y Estadísticas.
// El módulo es un script clásico: se carga en un contexto vm con un window y un document mínimos.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SRC = read('src/online/duels-v21.js');

function load({ session = { features: { classic_duel: true } } } = {}) {
  const els = {};
  const el = (id) => (els[id] = els[id] || { id, innerHTML: '', style: {}, textContent: '' });
  const win = {};
  win.SEQOnline = { session: () => session };
  win.SEQAvatars = { avatarHTML: (a) => '<i>' + String(a) + '</i>' };
  const calls = [];
  win.SEQDuels = {
    _h: {
      esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
      player: (p) => ({ name: String((p && p.display_name) || 'Rival'), avatar: '<i>av</i>', id: '' }),
      ico: (n) => '[' + n + ']', serverNow: () => 5000,
      itemInfo: (n) => ({ q: 'Pregunta ' + n, a: 'A', options: ['A', 'B', 'C', 'D'], qn: n }),
      optionsFor: (_s, _i, info) => info.options.slice(),
      call: (m, p, b) => { calls.push([m, p, b]); return Promise.resolve({}); },
      say: () => {}, errText: () => 'error', header: () => '<hdr>', back: () => {},
    },
    _state: () => st, reload: () => calls.push(['reload']), rerender: () => {},
  };
  const st = { screen: 'duel', id: 'DDDDDDDDDD', data: null, sending: false };
  const ctx = vm.createContext({ window: win, document: { getElementById: (id) => els[id] || null }, Date, Math, String, Number, Object, isFinite, Promise, setTimeout, console });
  vm.runInContext(SRC, ctx);
  return { M: win.SEQDuels21, win, els, el, calls, st };
}

const base = (o = {}) => ({
  id: 'DDDDDDDDDD', modo: 'stakes', estado: 'en_curso', t0: 1000, n_preguntas: 12, rival: { display_name: 'Bruno' },
  marcador: { yo: 8, rival: 7, resueltas: 6, total: 12 }, preguntas: [], rondas_resueltas: [],
  ronda: { indice: 6, fase: 'apuesta', mi_apuesta: null, apuesta_rival: null, rival_bloqueada: false, yo_respondi: false, apuesta_cierra_at: 9000 }, ...o,
});

test('nombres EXACTOS de apuestas y modos; nada de los nombres antiguos', () => {
  const { M } = load();
  assert.equal(JSON.stringify(Object.values(M.STAKES).map((s) => s.nombre)), JSON.stringify(['Cuerdo', 'Osado', 'Insensato']));
  assert.deepEqual(Object.values(M.STAKES).map((s) => s.valor), [1, 2, 3]);
  assert.deepEqual(Object.values(M.STAKES).map((s) => s.emoji), ['🧠', '🎩', '💀']);
  assert.equal(M.MODES.classic.nombre, 'Duelo clásico');
  assert.equal(M.MODES.stakes.nombre, 'Duelo por apuestas');
  assert.equal(Object.keys(M.MODES).length, 2, 'exactamente dos modos');
  for (const old of ['Seguro', 'Riesgo', 'Todo']) assert.equal(SRC.includes("nombre: '" + old), false);
});

test('rangos: solo 5, con su emoji de respaldo; iconos como assets independientes', () => {
  const { M } = load();
  assert.deepEqual(Object.values(M.RANK_EMOJI), ['🥉', '🥈', '🥇', '💎', '👑']);
  const html = M.rankIcon({ icono: 'sir_edwards' });
  assert.match(html, /assets\/duelos\/rangos\/sir_edwards\.webp/);
  assert.match(html, /onerror=/, 'si falta el archivo, se muestra el emoji');
  assert.match(M.rankIcon({ icono: '<script>' }), /plebeyo_ilustrado/, 'un icono desconocido nunca se incrusta tal cual');
  assert.match(M.modeIcon('stakes'), /assets\/duelos\/modos\/stakes\.webp/);
});

test('Duelo online: los dos modos son tarjetas grandes como los modos normales, con el medallón protagonista', () => {
  const { M } = load();
  const html = M.modeButtons();
  assert.equal((html.match(/mode-card seq-v21-modecard seq-v21-modecard-/g) || []).length, 2, 'exactamente dos modos');
  assert.match(html, /SEQDuels\.pick\('duel','classic'\)/); assert.match(html, /SEQDuels\.pick\('duel','stakes'\)/);
  assert.match(html, /Duelo clásico/); assert.match(html, /Duelo por apuestas/);
  assert.match(html, /20 preguntas/); assert.match(html, /12 rondas/);
  assert.match(html, /<div class="mode-card-icon has-img/, 'misma estructura que las tarjetas de los modos normales');
  assert.match(html, /<h3>Duelo clásico<\/h3><p>/);
  assert.match(html, /assets\/duelos\/modos\/classic\.webp/); assert.match(html, /assets\/duelos\/modos\/stakes\.webp/);
  assert.equal(/seq-v21-mode-go|seq-v21-mode-desc/.test(html), false, 'ya no son botones pequeños');
  const css = read('styles/online.css');
  assert.match(css, /\.seq-v21-modecard \.mode-card-icon[^{]*\{[^}]*width: 92px !important/, 'el medallón es grande');
});

test('marcador dinámico: «TÚ 8 — 7 RIVAL» y «Ronda 7 / 12» (apuestas) / «Pregunta 9 / 20» (clásico)', () => {
  const { M } = load();
  const s = M._pure.scoreboard(base());
  assert.match(s, /TÚ<\/small><b>8<\/b>/); assert.match(s, /<b>7<\/b><small>RIVAL/); assert.match(s, /Ronda 7 \/ 12/);
  const c = M._pure.scoreboard({ modo: 'classic', n_preguntas: 20, marcador: { yo: 7, rival: 6, resueltas: 8, total: 20 }, ronda: null });
  assert.match(c, /Pregunta 9 \/ 20/); assert.match(c, /<b>7<\/b>/); assert.match(c, /<b>6<\/b>/);
  // clásico en juego: el número de pregunta es la que se está jugando (índice 8 → 9), aunque haya menos resueltas
  assert.match(M.scoreboard({ modo: 'classic', n_preguntas: 20, marcador: { yo: 7, rival: 6, resueltas: 7, total: 20 }, ronda: null }, 8), /Pregunta 9 \/ 20/);
});

test('duels.js pinta el marcador en la partida clásica', () => {
  assert.match(read('src/online/duels.js'), /SEQDuels21\.scoreboard\(d, idx\)/);
});

test('carta final: ELO antes → después, cambio, rango… y NADA de apuestas', () => {
  const { M } = load();
  const html = M.eloBlock({ antes: 1248, cambio: 17, despues: 1265, rango: { nombre: 'Lord Sabelotodo', icono: 'lord_sabelotodo' }, en_colocacion: false });
  assert.match(html, /1\.248/); assert.match(html, /1\.265/); assert.match(html, /\+17 ELO/); assert.match(html, /Lord Sabelotodo/);
  assert.match(html, /lord_sabelotodo\.webp/);
  assert.equal(/apuest|ronda|cuerdo|osado|insensato/i.test(html), false, 'sin información de apuestas en la carta final');
  assert.match(M.eloBlock({ antes: 1000, cambio: -16, despues: 984, rango: { nombre: 'Plebeyo Ilustrado' }, en_colocacion: true, partidas_colocacion: 2, colocacion_total: 5 }), /−16 ELO[\s\S]*En colocación · 2\/5/);
  assert.equal(M.eloBlock(null), '');
});

test('apuestas: se pintan las 3 opciones con ±valor; la apuesta del rival NO aparece antes de tiempo', () => {
  const { M } = load();
  const h = M.play(base({ ronda: { indice: 6, fase: 'apuesta', mi_apuesta: 'osado', apuesta_rival: null, rival_bloqueada: true } }), M.__h || undefined);
  assert.match(h, /Cuerdo/); assert.match(h, /Osado/); assert.match(h, /Insensato/);
  assert.match(h, /\+1/); assert.match(h, /−3/);
  assert.match(h, /Apuesta bloqueada/);
  assert.match(h, /Tu rival ya ha apostado/);
  assert.equal((h.match(/seq-v21-reveal-side/g) || []).length, 0, 'no hay panel de revelación mientras se apuesta');
  assert.match(h, /disabled/, 'una apuesta bloqueada no se puede cambiar');
});

test('apuestas: revelación de las dos apuestas ANTES de la pregunta; en la pregunta no hay veredicto', () => {
  const { M } = load();
  const rev = M.play(base({ ronda: { indice: 6, fase: 'revelando', mi_apuesta: 'cuerdo', apuesta_rival: 'insensato', pregunta_abre_at: 9000 } }));
  assert.match(rev, /Cuerdo/); assert.match(rev, /Insensato/); assert.match(rev, /vs/);
  assert.equal(/choice-btn/.test(rev), false, 'aún no hay pregunta');
  const q = M.play(base({ preguntas: [1, 2, 3, 4, 5, 6, 77], ronda: { indice: 6, fase: 'pregunta', mi_apuesta: 'cuerdo', apuesta_rival: 'insensato', pregunta_cierra_at: 19000 } }));
  assert.match(q, /Pregunta 77/); assert.equal((q.match(/choice-btn/g) || []).length, 4);
  assert.equal(/correcto|incorrecto|Resultado de la ronda/.test(q), false, 'mientras la pregunta está activa no hay resultado parcial');
});

test('apuestas: la ronda resuelta revela aciertos y apuestas de ambos', () => {
  const { M } = load();
  const h = M.play(base({
    ronda: { indice: 7, fase: 'resolucion' },
    rondas_resueltas: [{ indice: 6, mi_apuesta: 'osado', apuesta_rival: 'insensato', mi_correcta: true, rival_correcta: false }],
  }));
  assert.match(h, /Resultado de la ronda/); assert.match(h, /\[correcto\]/); assert.match(h, /\[incorrecto\]/);
  assert.match(h, /\+2/); assert.match(h, /−3/);
});

test('apuesta y respuesta: solo se envían claves/opciones (nunca resultados) y una vez', async () => {
  const { M, calls, st } = load();
  st.data = base();
  M.stake('todo'); M.stake('seguro'); M.stake('<x>');
  assert.equal(calls.length, 0, 'claves desconocidas no se envían');
  M.stake('insensato');
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(['POST', '/duels/DDDDDDDDDD/stake', { indice: 6, apuesta: 'insensato' }]));
  st.sending = false;
  st.data = base({ preguntas: [1, 2, 3, 4, 5, 6, 77], ronda: { indice: 6, fase: 'pregunta', mi_apuesta: 'cuerdo' } });
  M.answer(2);
  assert.equal(JSON.stringify(calls.find((c) => c[1] && c[1].endsWith('/answer'))), JSON.stringify(['POST', '/duels/DDDDDDDDDD/answer', { indice: 6, respuesta: 'C' }]));
  assert.equal(JSON.stringify(calls).includes('es_correcta'), false);
});

test('Rankings: dos ámbitos, tres tableros exactos, sin ranking universal ni emojis como iconografía', () => {
  const { M, win } = load();
  assert.deepEqual(Object.keys(M.BOARDS), ['pvp', 'mental', 'timetrial']);
  assert.deepEqual(Object.values(M.BOARDS).map((b) => b.nombre), ['PvP', 'Cálculo Mental', 'Contrarreloj']);
  assert.equal(/universal|todos los rankings/i.test(SRC), false);
  win.SEQDuels._h.call = () => new Promise(() => {});
  const html = M.renderRankings();
  const sinAtributos = html.replace(/<[^>]*>/g, '');           // texto visible
  assert.match(sinAtributos, /Amigos/); assert.match(sinAtributos, /Global/);
  assert.match(sinAtributos, /PvP/); assert.match(sinAtributos, /Cálculo Mental/); assert.match(sinAtributos, /Contrarreloj/);
  assert.equal(/\p{Extended_Pictographic}/u.test(sinAtributos), false, 'ningún emoji como iconografía visible');
  for (const id of ['pvp', 'mental', 'timetrial']) assert.match(html, new RegExp('assets/duelos/rankings/' + id + '\\.webp'));
  assert.equal(/rankings\/(friends|global)\.webp/.test(html), false, 'el ámbito es un selector de texto, sin iconos');
});

test('Rankings: el seleccionado se reconoce (aria-selected y clase); el ámbito es un selector de texto', () => {
  const { M, win } = load();
  win.SEQDuels._h.call = () => new Promise(() => {});
  let html = M.renderRankings();
  assert.match(html, /seq-v21-scope-btn sel[^>]*>[\s\S]*?Amigos/);
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 2, 'un ámbito y un ranking seleccionados');
  M.setBoard('timetrial'); html = M.renderRankings();
  assert.match(html, /seq-v21-board-btn sel[^>]*>[\s\S]*?Contrarreloj/);
  M.setScope('global'); html = M.renderRankings();
  assert.match(html, /seq-v21-scope-btn sel[^>]*>[\s\S]*?Global/);
});

test('Rankings PvP: «Tu posición», podio con medallas, insignia de rango y colocación en la lista', async () => {
  const { M, win } = load();
  const lord = { nombre: 'Lord Sabelotodo', icono: 'lord_sabelotodo' }, cab = { nombre: 'Caballero del Dato', icono: 'caballero_del_dato' };
  win.SEQDuels._h.call = () => Promise.resolve({
    scope: 'friends', board: 'pvp', validado: true, me: { elo: 1265, rank: 2, rango: lord, en_colocacion: false },
    ranking: [{ rank: 1, display_name: 'Ana', avatar: 'sombrero', elo: 1300, rango: lord, en_colocacion: false, is_me: false },
      { rank: 2, display_name: 'Yo', avatar: 'libro', elo: 1265, rango: lord, en_colocacion: false, is_me: true },
      { rank: 3, display_name: 'Cris', avatar: 'lupa', elo: 1200, rango: cab, en_colocacion: false, is_me: false },
      { rank: 4, display_name: 'Dani', avatar: 'pipa', elo: 1100, rango: cab, en_colocacion: false, is_me: false },
      { rank: null, display_name: 'Rita', avatar: 'reloj', elo: 1500, rango: { nombre: 'Sir Edwards' }, en_colocacion: true, is_me: false }],
  });
  await M.loadRankings();
  const h = M.renderRankings();
  assert.match(h, /seq-v21-podium/); assert.match(h, /seq-v21-pod-1/); assert.match(h, /seq-v21-pod-2/); assert.match(h, /seq-v21-pod-3/);
  for (const m of ['oro', 'plata', 'bronce']) assert.match(h, new RegExp('assets/ui/' + m + '\\.webp'), 'medalla ' + m);
  assert.match(h, /seq-v21-me-pos[^>]*><small>#<\/small>2/, '«Tu posición»: puesto 2');
  assert.match(h, /1\.265 ELO/); assert.match(h, /lord_sabelotodo\.webp/, 'insignia de rango');
  assert.equal((h.match(/seq-v21-rk-badge/g) || []).length, 1, 'solo Dani (clasificado) lleva insignia en la lista; Rita está en colocación');
  assert.match(h, /En colocación/); assert.match(h, /seq-v21-pos">4</); assert.match(h, /seq-v21-pos none">—</);
  assert.equal(/sin verificar/i.test(h), false);
  assert.match(SRC, /El Salón de la Fama/);
});

test('Rankings Cálculo Mental y Contrarreloj: misma estructura, sin inventar rangos', async () => {
  const { M, win } = load();
  const rows = [['Ana', 4000], ['Bruno', 3000], ['Carla', 2500], ['Dani', 2000], ['Eva', 1500]].map(([n, s], i) => ({ rank: i + 1, display_name: n, avatar: 'x' + i, score: s, is_me: i === 2 }));
  for (const board of ['mental', 'timetrial']) {
    win.SEQDuels._h.call = () => Promise.resolve({ validado: false, ranking: rows, me: { score: 2500, rank: 3 } });
    M.setBoard(board); await M.loadRankings();
    const h = M.renderRankings();
    assert.match(h, /seq-v21-podium/); assert.match(h, /4\.000/); assert.match(h, /2\.500 pts/);
    assert.match(h, /seq-v21-me-pos[^>]*><small>#<\/small>3/);
    assert.equal(/sin verificar/i.test(h), false, 'se eliminó «sin verificar por el servidor»');
    assert.equal(/seq-v21-rk-badge|rangos\//.test(h), false, board + ': no hay rangos que mostrar ni se inventan');
    assert.equal((h.match(/seq-avatar seq-v21-rk-av/g) || []).length, 2, 'puestos 4 y 5 en la lista, con avatar en el contenedor estándar');
    assert.equal((h.match(/seq-avatar seq-v21-pod-ring/g) || []).length, 3, 'tres avatares en el podio');
    assert.match(h, new RegExp('assets/duelos/rankings/' + board + '\.webp'));
  }
});

test('Rankings: con menos de tres jugadores no hay podio; los primeros llevan su medalla en la lista', async () => {
  const { M, win } = load();
  win.SEQDuels._h.call = () => Promise.resolve({ validado: true, me: { score: 900, rank: 1 }, ranking: [{ rank: 1, display_name: 'Solo', avatar: 'x', score: 900, is_me: true }, { rank: 2, display_name: 'Otro', avatar: 'y', score: 400, is_me: false }] });
  M.setBoard('mental'); await M.loadRankings();
  const h = M.renderRankings();
  assert.equal(h.includes('seq-v21-podium'), false);
  assert.equal((h.match(/class="seq-v21-rk( me)?"/g) || []).length, 2, 'los dos van en la lista');
  assert.match(h, /assets\/ui\/oro\.webp/); assert.match(h, /assets\/ui\/plata\.webp/);
});

test('Rankings: el avatar no se recorta (contenedor estándar con tamaño propio y fila con altura mínima)', () => {
  const css = read('styles/online.css');
  assert.match(css, /\.seq-v21-rk \.seq-avatar\.seq-v21-rk-av \{[^}]*width: 46px; height: 46px/);
  assert.match(css, /\.seq-v21-rk \{[^}]*min-height: 62px/);
  assert.equal(/\.seq-v21-rk-av \{ width: 30px/.test(css), false, 'la regla antigua que lo recortaba ya no existe');
  assert.match(SRC, /seq-avatar seq-v21-rk-av/);
});

test('Rankings: si el servidor tiene el ranking global desactivado se explica sin romper la pantalla', async () => {
  const { M, win } = load();
  win.SEQDuels._h.call = () => Promise.reject({ status: 404 });
  M.setScope('global'); await M.loadRankings();
  const h = M.renderRankings();
  assert.match(h, /todavía no está/i); assert.match(h, /Amigos/);
});

const STATS = {
  elo: { actual: 1284, peak: 1310, rango: { nombre: 'Lord Sabelotodo', icono: 'lord_sabelotodo' }, posicion_global: 84, en_colocacion: false, partidas_colocacion: 5, colocacion_total: 5 },
  competitivo: { partidas: 24, victorias: 15, derrotas: 8, empates: 1, porcentaje_victorias: 62.5, racha_actual: 3, mejor_racha: 6 },
  historial: [
    { rival: { display_name: 'Bruno' }, resultado: 'win', mi_puntuacion: 14, puntuacion_rival: 11, modo: 'classic', elo_antes: 1248, elo_cambio: 17, elo_despues: 1265, fecha: 1_800_000_000_000 },
    { rival: { display_name: 'Carla' }, resultado: 'loss', mi_puntuacion: 9, puntuacion_rival: 12, modo: 'stakes', elo_antes: 1265, elo_cambio: -9, elo_despues: 1256, fecha: 1_800_000_100_000 },
  ],
  head_to_head: [{ rival: { display_name: 'Bruno' }, partidas: 5, victorias: 3, derrotas: 1, empates: 1 }],
  elo_serie: [{ fecha: 1, elo: 1000 }],
};

test('Estadísticas: solo un botón «Ver estadísticas de duelos»; al pulsarlo se muestra/oculta el detalle completo', async () => {
  const { M, win, el } = load();
  const host = el('seq-duel-stats');
  win.SEQDuels._h.call = () => Promise.resolve(STATS);
  M.renderStats();
  assert.match(host.innerHTML, /Ver estadísticas de duelos/);
  assert.match(host.innerHTML, /seq-v21-statsbtn/);
  assert.match(host.innerHTML, /aria-expanded="false"/);
  assert.equal(host.innerHTML.includes('class="seq-v21-full"'), false, 'cerrado: no hay detalle ni resumen');
  M.toggleStats(); await M.loadStats(true);
  assert.match(host.innerHTML, /Ocultar estadísticas/); assert.match(host.innerHTML, /aria-expanded="true"/);
  assert.match(host.innerHTML, /class="seq-v21-full"/); assert.match(host.innerHTML, /1\.284/); assert.match(host.innerHTML, /#84/);
  M.toggleStats();
  assert.equal(host.innerHTML.includes('class="seq-v21-full"'), false);
  assert.match(host.innerHTML, /Ver estadísticas de duelos/);
});

test('Estadísticas completas: ELO y rango, pico, posición, últimos duelos de ambos modos y cara a cara (sin duplicar el Historial)', () => {
  const { M } = load();
  const html = M._pure.fullStatsHtml(STATS);
  for (const t of ['Pico de ELO', 'Posición global', 'Duelos con ELO', 'Últimos duelos con ELO', 'Cara a cara', 'Lord Sabelotodo', 'Clasificado']) assert.match(html, new RegExp(t));
  assert.match(html, /1\.284/); assert.match(html, /lord_sabelotodo\.webp/);
  assert.equal(/Historial competitivo|% victorias|>Derrotas<|>Empates<|>Victorias<|Mejor racha|Racha actual|ELO actual/.test(html), false,
    'partidas, victorias, derrotas, empates y rachas ya están en «Historial de duelos»: no se repiten');
  assert.match(html, /Clásico/); assert.match(html, /Apuestas/);
  assert.match(html, /1\.248 → 1\.265/); assert.match(html, /\+17/); assert.match(html, /−9/);
  assert.match(html, /5 partidas · 3V · 1D · 1E/);
  assert.match(html, /assets\/duelos\/modos\/classic\.webp/); assert.match(html, /assets\/duelos\/modos\/stakes\.webp/);
});

test('Estadísticas sin cuenta o con la función apagada: el bloque no se muestra', () => {
  const { M, el } = load({ session: { features: {} } });
  const host = el('seq-duel-stats'); host.innerHTML = 'x';
  M.renderStats();
  assert.equal(host.innerHTML, ''); assert.equal(host.style.display, 'none');
});

test('Ajustes/Perfil: ya no hay resumen ni acceso a estadísticas de duelos (un solo punto de entrada)', () => {
  const { M } = load();
  assert.equal(M.profileSummaryHtml, undefined); assert.equal(M.openStats, undefined);
  const on = read('src/online/online.js');
  assert.equal(/profileSummaryHtml|openStats|Ver estadísticas →/.test(on + SRC), false);
});

test('Estadísticas: el detalle indica la colocación', () => {
  const { M } = load();
  const s = JSON.parse(JSON.stringify(STATS)); s.elo.en_colocacion = true; s.elo.partidas_colocacion = 2;
  assert.match(M._pure.fullStatsHtml(s), /En colocación · 2\/5/);
});

test('Estadísticas: quien solo juega duelos también ve su sección (no depende de las partidas normales)', () => {
  const html = read('index.html');
  const fn = html.slice(html.indexOf('function renderStats()'), html.indexOf('function renderStats()') + 900);
  assert.match(fn, /dsAny/); assert.match(fn, /wins[\s\S]*losses[\s\S]*draws/);
});

test('seguridad de pintado: los textos del servidor se escapan', () => {
  const { M } = load();
  const s = JSON.parse(JSON.stringify(STATS)); s.historial[0].rival.display_name = '<img src=x onerror=alert(1)>'; s.elo.rango.nombre = '<b>x</b>';
  const html = M._pure.fullStatsHtml(s);
  assert.equal(html.includes('<img src=x'), false); assert.equal(html.includes('<b>x</b>'), false);
});

// ------------------------------------------------------------------ Enganches ---
test('duels.js: hub con Rankings activo, dos modos, modo enviado al crear, ELO en la carta y reloj propio', () => {
  const d = read('src/online/duels.js');
  assert.match(d, /hubCard\('rank'[\s\S]*SEQDuels\.open\('rankings'\)/);
  assert.equal(d.includes('PRÓXIMAMENTE</p></div>\';\n    slot'), false, 'la tarjeta de Ranking ya no está bloqueada');
  assert.match(d, /modeButtons\(\)/);
  assert.match(d, /\{ rival: rivalId, modo: S\.pickModo === 'stakes' \? 'stakes' : 'classic' \}/);
  assert.match(d, /SEQDuels21\.eloBlock\(r\.elo\)/);
  assert.match(d, /SEQDuels21\.tick\(d, now\)/);
  assert.match(d, /SEQDuels21\.play\(d, HELPERS\)/);
  assert.match(d, /screen === 'rankings'/);
});

test('el hub de Duelos NO tiene una tarjeta de estadísticas', () => {
  const d = read('src/online/duels.js');
  const hub = d.slice(d.indexOf('function renderCards'), d.indexOf('window.addEventListener(\'online\''));
  assert.equal(/estad[ií]sticas/i.test(hub), false);
  assert.equal((hub.match(/hubCard\('/g) || []).length, 4, 'Duelo online, Retos, Amigos y Rankings');
});

test('Estadísticas: el botón vive DENTRO de «Historial de duelos»; no hay bloque arriba; módulo en el service worker', () => {
  const html = read('index.html'), sw = read('sw.js');
  const sec = html.slice(html.indexOf('id="stats-duel-section"'), html.indexOf('id="stats-duel-section"') + 3000);
  assert.match(sec, /Historial de duelos/); assert.match(sec, /id="seq-duel-stats"/);
  assert.equal((html.match(/id="seq-duel-stats"/g) || []).length, 1);
  assert.ok(html.indexOf('id="seq-duel-stats"') > html.indexOf('id="stats-duel-section"'), 'no está encima de las estadísticas generales');
  assert.match(html, /SEQDuels21\.onStatsShown\(\)/);
  assert.match(html, /<script src="src\/online\/duels-v21\.js\?v=\d+"><\/script>/);
  assert.match(sw, /'\.\/src\/online\/duels-v21\.js'/);
});

test('Avatares: bloqueado → muestra el logro; Supremo → «logro secreto» sin revelar cuál; desbloqueado → normal', () => {
  const ctx = vm.createContext({ window: {}, document: {}, console });
  vm.runInContext(read('src/data/avatars.js'), ctx);
  const A = ctx.window.SEQAvatars;
  assert.equal(A.medalOf('avatar_siredwards_vengador'), 'duel_revancha');
  assert.equal(A.isAvailable('avatar_siredwards_vengador', []), false);
  assert.equal(A.isAvailable('avatar_siredwards_vengador', ['duel_revancha']), true);
  assert.equal(A.isAvailable('sombrero', []), true, 'los base siempre');
  assert.equal(A.isSecret('avatar_siredwards_supremo'), true);
  assert.equal(A.isSecret('avatar_siredwards_vengador'), false);
  const on = read('src/online/online.js');
  assert.match(on, /Se desbloquea al completar el logro «/);
  assert.match(on, /Se desbloquea al completar un logro secreto\./);
  assert.match(on, /showAvatarHint/);
  assert.equal(/disabled title="'/.test(on), false, 'ya no es un botón muerto: se puede tocar para ver el requisito');
  const sup = on.slice(on.indexOf('function avatarHintText'), on.indexOf('function pickAvatar'));
  assert.ok(sup.indexOf('isSecret') < sup.indexOf('ALL_MEDALS'), 'el secreto se comprueba ANTES de buscar el nombre del logro');
});

test('Novedades de la 2.1: resumen corto de cinco líneas', () => {
  const html = read('index.html');
  const i = html.lastIndexOf('settings-changelog-entry-version">v2.1<');
  const entry = html.slice(i, html.indexOf('</ul>', i));
  const lis = [...entry.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  assert.equal(lis.length, 5);
  assert.ok(lis.every((l) => l.length <= 45), 'frases de una línea: ' + lis.join(' | '));
  assert.equal(lis.some((l) => /\p{Extended_Pictographic}/u.test(l)), false, 'el historial no lleva emojis: tono de Sir Edwards');
});

test('iconos de Rankings: existen como archivo y están en el service worker', () => {
  const sw = read('sw.js');
  for (const id of ['friends', 'global', 'pvp', 'mental', 'timetrial']) {
    assert.ok(fs.existsSync(new URL('../assets/duelos/rankings/' + id + '.webp', import.meta.url)), id);
    assert.ok(sw.includes("'./assets/duelos/rankings/" + id + ".webp'"), id);
  }
  assert.ok(fs.existsSync(new URL('../assets/duelos/estadisticas.webp', import.meta.url)), 'estadisticas.webp');
  assert.ok(sw.includes("'./assets/duelos/estadisticas.webp'"), 'estadisticas.webp en sw.js');
});

test('el módulo no guarda nada en el almacenamiento ni decide resultados', () => {
  assert.equal(/localStorage|sessionStorage|indexedDB/.test(SRC), false);
  assert.equal(/es_correcta\s*[:=]\s*true|ganador\s*=|elo\s*\+=|puntuacion\s*\+=/.test(SRC), false);
});
