// Logros 2.1: 60 activos, IDs normalizados con alias, recompensas (15 Fragmentos + avatares) y condiciones nuevas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
function load(extra = '') {
  const c = { console, getLevelData: () => 1, getMasteredCount: (s) => s._mastered || 0, getCategoryMastery: () => [{ mastered: 0, total: 1 }], getFragmentCount: () => 0 };
  vm.createContext(c);
  vm.runInContext(read('src/data/medals.js').replace(/^const /gm, 'var ') + ';' + extra, c);
  return c;
}
const ids = (c) => c.ALL_MEDALS.map((m) => m.id);
const J = (x) => JSON.parse(JSON.stringify(x));

test('hay exactamente 60 logros activos, sin IDs repetidos y sin emojis: cada uno con su insignia propia', () => {
  const c = load();
  assert.equal(c.ALL_MEDALS.length, 60);
  assert.equal(new Set(ids(c)).size, 60);
  assert.equal(c.ALL_MEDALS.some((m) => 'icon' in m), false, 'los logros no llevan emoji: su icono es assets/logros/<id>.webp');
  for (const m of c.ALL_MEDALS) assert.ok(fs.existsSync(new URL('../assets/logros/' + m.id + '.webp', import.meta.url)), 'falta la insignia de ' + m.id);
});

test('world_citizen y duel_eso_era_un_duelo ya no son activos (se conservan como históricos)', () => {
  const c = load();
  for (const old of ['world_citizen', 'duel_eso_era_un_duelo']) {
    assert.equal(ids(c).includes(old), false);
    assert.equal(J(c.RETIRED_MEDAL_IDS).includes(old), true);
    assert.equal(c.isActiveMedalId(old), false);
  }
  assert.equal(ids(c).includes('duel_contra_las_cuerdas'), true);
  assert.equal(c.ALL_MEDALS.find((m) => m.id === 'duel_contra_las_cuerdas').title, 'Contra las Cuerdas');
});

test('IDs normalizados: master_100/200 y correct_400/800 con alias de los antiguos', () => {
  const c = load();
  for (const id of ['master_100', 'master_200', 'correct_400', 'correct_800']) assert.ok(ids(c).includes(id), id);
  for (const old of ['master_150', 'master_250', 'correct_300', 'correct_600']) assert.equal(ids(c).includes(old), false, old);
  assert.deepEqual(J(c.MEDAL_ALIASES), { master_150: 'master_100', master_250: 'master_200', correct_300: 'correct_400', correct_600: 'correct_800' });
  assert.equal(c.resolveMedalId('master_150'), 'master_100');
  assert.equal(c.resolveMedalId('streak_5'), 'streak_5');
  const by = (id) => c.ALL_MEDALS.find((m) => m.id === id);
  assert.match(by('master_100').desc, /100/); assert.match(by('master_200').desc, /200/);
  assert.match(by('correct_400').desc, /400/); assert.match(by('correct_800').desc, /800/);
  // Los títulos existentes no cambian
  assert.equal(by('master_100').title, 'Erudito'); assert.equal(by('master_200').title, 'Biblioteca Humana');
  assert.equal(by('correct_400').title, 'Veterano del Conocimiento'); assert.equal(by('correct_800').title, 'Máquina del Quiz');
});

test('nombres de los logros nuevos, exactos', () => {
  const c = load();
  const t = (id) => c.ALL_MEDALS.find((m) => m.id === id).title;
  assert.equal(t('streak_20'), 'Racha de Élite'); assert.equal(t('streak_30'), 'SirEdwards Imparable');
  assert.equal(t('diurno'), 'Primera Luz'); assert.equal(t('duel_sin_titubear'), 'Sin Titubear');
  assert.equal(t('duel_apuestas_ultima_locura'), 'La Última Locura'); assert.equal(t('duel_apuestas_calculada'), 'Apuesta Calculada');
  assert.equal(t('duel_tres_al_hilo'), 'Caballero Invicto');
});

test('Fragmentos: exactamente 15, todos activos, con las altas y bajas pedidas', () => {
  const c = load();
  const f = J(c.FRAGMENT_MEDAL_IDS);
  assert.equal(f.length, 15); assert.equal(new Set(f).size, 15);
  for (const id of f) assert.ok(ids(c).includes(id), 'no activo: ' + id);
  for (const id of ['streak_20', 'duel_contra_las_cuerdas', 'diurno', 'games_50', 'level_20', 'master_100', 'cleaner_25', 'sd_primer_riesgo', 'tt_30', 'mental_calc_30', 'correct_800', 'sharp_eye', 'duel_cinco_victorias', 'surv_humano', 'duel_apuestas_calculada']) assert.ok(f.includes(id), id);
  for (const id of ['medal_collector_30', 'ultimo_cerebro', 'duel_sin_titubear', 'sin_frenos', 'surv_derrame', 'world_citizen', 'duel_revancha', 'streak_30', 'duel_apuestas_ultima_locura', 'duel_tres_al_hilo']) assert.equal(f.includes(id), false, id);
});

test('avatares: cada uno ligado a su logro, sin Fragmento donde no toca', () => {
  const c = load();
  assert.deepEqual(J(c.MEDAL_REWARDS.avatar), {
    medal_collector_30: 'avatar_siredwards_coleccionista', duel_revancha: 'avatar_siredwards_vengador',
    streak_30: 'avatar_siredwards_imparable', duel_apuestas_ultima_locura: 'avatar_siredwards_insensato',
    noctambulo: 'avatar_siredwards_medianoche', all_medals_secret: 'avatar_siredwards_supremo', polimata: 'buho',
  });
  assert.equal(c.getMedalAvatar('duel_revancha'), 'avatar_siredwards_vengador');
  assert.equal(c.getMedalAvatar('games_50'), null);
  const f = J(c.FRAGMENT_MEDAL_IDS);
  assert.equal(f.includes('duel_revancha'), false, 'Vengador: avatar SIN Fragmento');
  assert.equal(f.includes('streak_30'), false, 'Imparable: avatar SIN Fragmento');
  assert.equal(f.includes('medal_collector_30'), false, 'Maestro de los Logros: ya sin Fragmento, conserva su avatar');
  assert.equal(c.getMedalAvatar('medal_collector_30'), 'avatar_siredwards_coleccionista');
});

test('rachas: 20 solo en Modo Estándar; 30 («Imparable») en cualquier modo', () => {
  const c = load(); const m = (id) => c.ALL_MEDALS.find((x) => x.id === id);
  assert.equal(m('streak_20').check({ standardBestStreak: 19 }), false); assert.equal(m('streak_20').check({ standardBestStreak: 20 }), true);
  assert.equal(m('streak_30').check({ bestStreak: 29 }), false); assert.equal(m('streak_30').check({ bestStreak: 30 }), true);
  assert.equal(m('streak_30').check({ standardBestStreak: 30 }), false, 'la de 30 mide la racha global (bestStreak)');
  assert.equal(m('streak_30').desc, '30 respuestas correctas consecutivas.');
  assert.equal(m('streak_20').check({ timeTrialBestStreak: 99, hardBestStreak: 99 }), false, 'otras rachas no cuentan');
});

test('Noctámbulo y Primera Luz: se logran encontrando a Sir Edwards nocturno / diurno', () => {
  const c = load();
  const night = c.ALL_MEDALS.find((x) => x.id === 'noctambulo'), day = c.ALL_MEDALS.find((x) => x.id === 'diurno');
  assert.match(night.desc, /Sir Edwards nocturno.*00:00 a 04:00/); assert.match(day.desc, /Sir Edwards diurno.*06:00 a 10:00/);
  assert.equal(night.check({ hasCompletedNightGame: true }), true); assert.equal(night.check({}), false);
  assert.equal(day.check({ hasCompletedMorningGame: true }), true); assert.equal(day.check({}), false);
  const ctl = read('src/state/sir-events.js');
  assert.ok(/ev\.type === 'night'\) store\.hasCompletedNightGame = true/.test(ctl) && /ev\.type === 'day'\) store\.hasCompletedMorningGame = true/.test(ctl));
  assert.ok(!/markNightCompletionIfApplicable/.test(read('index.html')), 'ya no se marca al terminar partida');
});

// ---- registro de duelos: los hitos los pone el servidor
function duelEnv() {
  const html = read('index.html');
  const grab = (name) => { const i = html.indexOf('function ' + name + '('); const j = html.indexOf('\n}\n', i); return html.slice(i, j + 3); };
  const store = { duelPlayedCodes: [], duelStats: null };
  const ctx = { store, checkMedalsAndGetNew: () => [], checkFragmentRewardsAndGetNew: () => null, saveStore: () => {} };
  vm.createContext(ctx); vm.runInContext(grab('getDefaultDuelStats') + grab('registerOnlineDuelResult'), ctx);
  return ctx;
}
const play = (c, id, result, hitos) => c.registerOnlineDuelResult({ duelId: id, rivalId: 'R1', result, myScore: 9, opponentScore: 8, hitos });

test('Contra las Cuerdas y Sin Titubear: solo con el hito del servidor y solo si se GANA', () => {
  const c = duelEnv(); const m = (id) => load().ALL_MEDALS.find((x) => x.id === id);
  play(c, 'a', 'loss', { comeback: true, perfect: true });
  assert.equal(!!c.store.duelStats.comebackWon, false); assert.equal(!!c.store.duelStats.perfectWon, false);
  play(c, 'b', 'win', null);
  assert.equal(!!c.store.duelStats.comebackWon, false, 'sin hito del servidor no se concede');
  play(c, 'c', 'win', { comeback: true });
  assert.equal(c.store.duelStats.comebackWon, true); assert.equal(m('duel_contra_las_cuerdas').check(c.store), true);
  play(c, 'd', 'win', { perfect: true });
  assert.equal(m('duel_sin_titubear').check(c.store), true);
});

test('Sin Titubear sustituye a La Última Palabra: ID nuevo, pluma reutilizada, la antigua queda retirada', () => {
  const c = load(); const by = (id) => c.ALL_MEDALS.find((x) => x.id === id);
  assert.equal(by('ultimo_cerebro'), undefined, 'La Última Palabra ya no es activa');
  assert.equal(J(c.RETIRED_MEDAL_IDS).includes('ultimo_cerebro'), true, 'se conserva como histórica');
  assert.equal(by('duel_sin_titubear').desc, 'Gana un duelo acertando todas las preguntas.');
  assert.ok(fs.existsSync(new URL('../assets/logros/duel_sin_titubear.webp', import.meta.url)), 'tiene su insignia');
  assert.equal(J(c.FRAGMENT_MEDAL_IDS).includes('duel_sin_titubear'), false);
  assert.equal(c.ALL_MEDALS.length, 60);
});

test('Fragmentos reasignados: Evolución Confirmada y Apuesta Calculada dan; Maestro y Sin Titubear no', () => {
  const c = load(); const f = J(c.FRAGMENT_MEDAL_IDS);
  assert.equal(c.ALL_MEDALS.find((x) => x.id === 'surv_humano').title, 'Evolución Confirmada');
  assert.ok(f.includes('surv_humano')); assert.ok(f.includes('duel_apuestas_calculada'));
  assert.equal(f.includes('medal_collector_30'), false); assert.equal(f.includes('ultimo_cerebro'), false);
  assert.equal(f.length, 15); assert.equal(new Set(f).size, 15);
});

test('logros de apuestas: Última Locura exige victoria; Apuesta Calculada se registra aunque se pierda', () => {
  const c = duelEnv(); const m = (id) => load().ALL_MEDALS.find((x) => x.id === id);
  play(c, 'a', 'loss', { stakes_all_three: true, stakes_last_madness: true });
  assert.equal(m('duel_apuestas_calculada').check(c.store), true);
  assert.equal(m('duel_apuestas_ultima_locura').check(c.store), false);
  play(c, 'b', 'win', { stakes_last_madness: true });
  assert.equal(m('duel_apuestas_ultima_locura').check(c.store), true);
});

test('Caballero Invicto: 3 victorias seguidas; derrota y empate rompen la cadena', () => {
  const m = (id) => load().ALL_MEDALS.find((x) => x.id === id);
  let c = duelEnv(); play(c, 'a', 'win'); play(c, 'b', 'win'); play(c, 'c', 'loss'); play(c, 'd', 'win'); play(c, 'e', 'win');
  assert.equal(m('duel_tres_al_hilo').check(c.store), false, 'la derrota rompe la cadena');
  c = duelEnv(); play(c, 'a', 'win'); play(c, 'b', 'win'); play(c, 'c', 'draw'); play(c, 'd', 'win');
  assert.equal(m('duel_tres_al_hilo').check(c.store), false, 'el empate rompe la cadena');
  play(c, 'e', 'win'); play(c, 'f', 'win');
  assert.equal(m('duel_tres_al_hilo').check(c.store), true);
});

test('la fuente de la condición es el servidor: duels.js pasa resultado.hitos al registrar', () => {
  assert.match(read('src/online/duels.js'), /hitos: kind === 'duel' && r\.hitos/);
});

test('la colección solo cuenta logros ACTIVOS (un ID histórico no suma)', () => {
  const c = load(); const m = c.ALL_MEDALS.find((x) => x.id === 'medal_collector_10');
  const real = c.ALL_MEDALS.filter((x) => !x.id.startsWith('medal_collector') && x.id !== 'all_medals_secret').slice(0, 9).map((x) => x.id);
  assert.equal(m.check({ unlockedMedals: [...real, 'world_citizen'] }), false, 'world_citizen ya no cuenta');
  assert.equal(m.check({ unlockedMedals: [...real, 'streak_5'] }) || m.check({ unlockedMedals: [...real, 'first_game'] }), true);
});

test('guardado: los IDs históricos se migran a los actuales sin perder el desbloqueo', () => {
  const src = read('src/utils/store.js');
  assert.match(src, /resolveMedalId/);
  const c = load('this.R = resolveMedalId;');
  const mapped = ['master_150', 'streak_5', 'master_250', 'master_100', 'correct_600'].map((i) => c.R(i)).filter((v, i, a) => a.indexOf(v) === i);
  assert.deepEqual(mapped, ['master_100', 'streak_5', 'master_200', 'correct_800']);
});
