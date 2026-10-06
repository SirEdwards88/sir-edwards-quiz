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

test('hay exactamente 60 logros activos, sin IDs ni iconos repetidos', () => {
  const c = load();
  assert.equal(c.ALL_MEDALS.length, 60);
  assert.equal(new Set(ids(c)).size, 60);
  const icons = c.ALL_MEDALS.map((m) => m.icon.replace(/\uFE0F/g, ''));
  assert.equal(new Set(icons).size, 60);
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
  assert.equal(t('diurno'), 'Primera Luz'); assert.equal(t('ultimo_cerebro'), 'La Última Palabra');
  assert.equal(t('duel_apuestas_ultima_locura'), 'La Última Locura'); assert.equal(t('duel_apuestas_calculada'), 'Apuesta Calculada');
  assert.equal(t('duel_tres_al_hilo'), 'Caballero Invicto');
});

test('Fragmentos: exactamente 15, todos activos, con las altas y bajas pedidas', () => {
  const c = load();
  const f = J(c.FRAGMENT_MEDAL_IDS);
  assert.equal(f.length, 15); assert.equal(new Set(f).size, 15);
  for (const id of f) assert.ok(ids(c).includes(id), 'no activo: ' + id);
  for (const id of ['streak_20', 'ultimo_cerebro', 'duel_contra_las_cuerdas', 'diurno', 'games_50', 'level_20', 'master_100', 'cleaner_25', 'sd_primer_riesgo', 'tt_30', 'mental_calc_30', 'correct_800', 'medal_collector_30', 'sharp_eye', 'duel_cinco_victorias']) assert.ok(f.includes(id), id);
  for (const id of ['sin_frenos', 'surv_derrame', 'world_citizen', 'duel_revancha', 'streak_30', 'duel_apuestas_ultima_locura', 'duel_apuestas_calculada', 'duel_tres_al_hilo']) assert.equal(f.includes(id), false, id);
});

test('avatares: cada uno ligado a su logro, sin Fragmento donde no toca', () => {
  const c = load();
  assert.deepEqual(J(c.MEDAL_REWARDS.avatar), {
    medal_collector_30: 'avatar_siredwards_coleccionista', duel_revancha: 'avatar_siredwards_vengador',
    streak_30: 'avatar_siredwards_imparable', duel_apuestas_ultima_locura: 'avatar_siredwards_insensato',
    noctambulo: 'avatar_siredwards_medianoche', all_medals_secret: 'avatar_siredwards_supremo',
  });
  assert.equal(c.getMedalAvatar('duel_revancha'), 'avatar_siredwards_vengador');
  assert.equal(c.getMedalAvatar('games_50'), null);
  const f = J(c.FRAGMENT_MEDAL_IDS);
  assert.equal(f.includes('duel_revancha'), false, 'Vengador: avatar SIN Fragmento');
  assert.equal(f.includes('streak_30'), false, 'Imparable: avatar SIN Fragmento');
  assert.equal(f.includes('medal_collector_30'), true, 'Coleccionista conserva Fragmento y suma avatar');
});

test('rachas: solo Modo Estándar, 20 y 30 seguidas', () => {
  const c = load(); const m = (id) => c.ALL_MEDALS.find((x) => x.id === id);
  assert.equal(m('streak_20').check({ standardBestStreak: 19 }), false); assert.equal(m('streak_20').check({ standardBestStreak: 20 }), true);
  assert.equal(m('streak_30').check({ standardBestStreak: 29 }), false); assert.equal(m('streak_30').check({ standardBestStreak: 30 }), true);
  assert.equal(m('streak_20').check({ timeTrialBestStreak: 99, hardBestStreak: 99 }), false, 'otras rachas no cuentan');
});

test('Primera Luz: marca de la franja 06:00 (incl.) – 08:00 (excl.) y condición', () => {
  const html = read('index.html');
  const fn = html.slice(html.indexOf('function markNightCompletionIfApplicable'), html.indexOf('function checkModeUnlocksAndGetNew'));
  const run = (hour) => {
    const store = {};
    const ctx = { store, Date: class { getHours() { return hour; } } };
    vm.createContext(ctx); vm.runInContext(fn + ';markNightCompletionIfApplicable();', ctx);
    return !!store.hasCompletedMorningGame;
  };
  assert.equal(run(5), false); assert.equal(run(6), true); assert.equal(run(7), true); assert.equal(run(8), false); assert.equal(run(12), false);
  const c = load(); assert.equal(c.ALL_MEDALS.find((x) => x.id === 'diurno').check({ hasCompletedMorningGame: true }), true);
  assert.equal(c.ALL_MEDALS.find((x) => x.id === 'diurno').check({}), false);
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

test('Contra las Cuerdas y La Última Palabra: solo con el hito del servidor y solo si se GANA', () => {
  const c = duelEnv(); const m = (id) => load().ALL_MEDALS.find((x) => x.id === id);
  play(c, 'a', 'loss', { comeback: true, last_word: true });
  assert.equal(!!c.store.duelStats.comebackWon, false); assert.equal(!!c.store.duelStats.lastWordWon, false);
  play(c, 'b', 'win', null);
  assert.equal(!!c.store.duelStats.comebackWon, false, 'sin hito del servidor no se concede');
  play(c, 'c', 'win', { comeback: true });
  assert.equal(c.store.duelStats.comebackWon, true); assert.equal(m('duel_contra_las_cuerdas').check(c.store), true);
  play(c, 'd', 'win', { last_word: true });
  assert.equal(m('ultimo_cerebro').check(c.store), true);
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
