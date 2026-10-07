// v2.0 — vista de Logros: todos los logros tienen familia y las barras de progreso cuadran con sus condiciones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load() {
  const ctx = { window: {}, getLevelData(xp) { let l = 1, c = xp; while (l < 30) { const k = 100 + (l - 1) * 50; if (c >= k) { c -= k; l++; } else break; } return Math.min(l, 30); },
    getMasteredCount: (s) => s._mastered || 0, getCategoryMastery: () => [], getFragmentCount: () => 0 };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../src/data/medals.js', import.meta.url), 'utf8').replace(/^const /gm, 'var '), ctx);
  vm.runInContext(fs.readFileSync(new URL('../src/ui/achievements.js', import.meta.url), 'utf8'), ctx);
  return ctx;
}

test('cada logro pertenece a una familia (ninguno cae en «Otros»)', () => {
  const c = load();
  const grouped = new Set(c.window.SEQAchievements.GROUPS.flatMap((g) => g.ids));
  const missing = c.ALL_MEDALS.filter((m) => !grouped.has(m.id)).map((m) => m.id);
  assert.equal(missing.join(','), '', 'sin familia: ' + missing.join(','));
  for (const id of grouped) assert.ok(c.ALL_MEDALS.some((m) => m.id === id), 'id inexistente en una familia: ' + id);
});

test('el objetivo de cada barra es exactamente el umbral de su logro', () => {
  const c = load();
  const P = c.window.SEQAchievements.PROGRESS;
  const field = { games: 'gamesPlayed', streak_: 'standardBestStreak', correct_: 'totalCorrect', cleaner_: 'errorsCleaned', tt_: 'maxTimeTrialScore', mental_calc_: 'bestMentalCalcCorrect' };
  for (const m of c.ALL_MEDALS) {
    if (!P[m.id]) continue;
    const target = P[m.id]({ duelStats: {} })[1];
    // Construye un store justo en el umbral y otro una unidad por debajo, moviendo el valor que la barra mide.
    const mk = (v) => {
      const s = { duelStats: { draws: 0, wins: 0, bestWinsVsRival: 0 }, unlockedMedals: [] };
      if (m.id.startsWith('level_')) { let xp = 0; while (c.getLevelData(xp) < v) xp += 10; s.xp = xp; }
      else if (m.id.startsWith('master_')) s._mastered = v;
      else if (m.id.startsWith('medal_collector')) s.unlockedMedals = c.ALL_MEDALS.filter((x) => !x.id.startsWith('medal_collector') && x.id !== 'all_medals_secret').slice(0, v).map((x) => x.id); // solo cuentan logros ACTIVOS
      else if (m.id === 'sharp_eye') s.hardBestStreak = v;
      else if (m.id === 'sin_preferencias') s.noRepeatCatBestStreak = v;
      else if (m.id === 'sin_frenos') s.timeTrialBestStreak = v;
      else if (m.id === 'duel_rey_del_empate') s.duelStats.draws = v;
      else if (m.id === 'duel_cinco_victorias') s.duelStats.wins = v;
      else if (m.id === 'duel_otra_vez_tu') s.duelStats.bestWinsVsRival = v;
      else if (m.id === 'duel_tres_al_hilo') s.duelStats.bestWinStreak = v;
      else { const k = Object.keys(field).find((p) => m.id.startsWith(p)); assert.ok(k, 'sin campo para ' + m.id); s[field[k]] = v; }
      return s;
    };
    assert.equal(!!m.check(mk(target)), true, m.id + ' debería conseguirse en ' + target);
    assert.equal(!!m.check(mk(target - 1)), false, m.id + ' no debería conseguirse en ' + (target - 1));
    assert.equal(P[m.id](mk(target))[0], target, m.id + ': la barra no mide lo mismo que la condición');
  }
});

test('pantalla de Logros: ilustraciones propias (logros, familias e hitos) y ningún emoji', () => {
  const c = load();
  const file = (p) => fs.existsSync(new URL('../' + p, import.meta.url));
  for (const m of c.ALL_MEDALS) assert.ok(file('assets/logros/' + m.id + '.webp'), 'sin insignia: logro ' + m.id);
  for (const g of c.window.SEQAchievements.GROUPS) {
    assert.ok(file('assets/familias/' + g.key + '.webp'), 'sin escudo: familia ' + g.key);
    assert.equal('icon' in g, false, 'la familia ' + g.key + ' no lleva emoji');
  }
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ms = html.slice(html.indexOf('const FRAGMENT_MILESTONES'), html.indexOf('];', html.indexOf('const FRAGMENT_MILESTONES')));
  assert.equal(/(?:icon|secretIcon):/.test(ms), false, 'los hitos de Fragmentos usan su ilustración (fragmentMilestoneImg), no un emoji');
});
