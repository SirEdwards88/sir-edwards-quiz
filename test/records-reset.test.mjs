import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function load() {
  const ctx = { window: {}, localStorage: undefined };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/utils/records-reset.js', 'utf8'), ctx);
  return ctx.window.SEQRecordsReset;
}
const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };
const base = () => ({ bestMentalCalcScore: 900, bestMentalClassicCorrect: 40, bestMentalClassicScore: 800, maxTimeTrialScore: 700, bestMentalCalcCorrect: 36, xp: 5 });

test('pone a 0 los records de la cuenta indicada, una sola vez, y no toca otros campos', () => {
  const R = load(), st = base(), ls = mem();
  assert.equal(R.run(st, 'BKE02TTKCS', ls), true);
  assert.equal(st.bestMentalCalcScore, 0);
  assert.equal(st.bestMentalClassicCorrect, 0);
  assert.equal(st.bestMentalClassicScore, 0);
  assert.equal(st.maxTimeTrialScore, 0);
  assert.equal(st.bestMentalCalcCorrect, 36);
  assert.equal(st.xp, 5);
  st.maxTimeTrialScore = 50; // nuevo record tras el reseteo: no se vuelve a borrar
  assert.equal(R.run(st, 'BKE02TTKCS', ls), false);
  assert.equal(st.maxTimeTrialScore, 50);
});

test('cualquier otra cuenta queda intacta', () => {
  const R = load(), st = base();
  assert.equal(R.run(st, 'OTRO000001', mem()), false);
  assert.deepEqual(st, base());
});

test('está enlazado en index.html, sw.js y la sincronización', () => {
  assert.match(fs.readFileSync('index.html', 'utf8'), /src\/utils\/records-reset\.js\?v=\d+/);
  assert.match(fs.readFileSync('sw.js', 'utf8'), /records-reset\.js/);
  assert.match(fs.readFileSync('src/online/online.js', 'utf8'), /SEQRecordsReset\.run\(store, account\.player\.id\)/);
});

test('el SQL solo toca esa cuenta y esos cuatro campos', () => {
  const sql = fs.readFileSync('scripts/reset-records.sql', 'utf8');
  assert.match(sql, /WHERE player_id = 'BKE02TTKCS'/);
  for (const k of ['bestMentalCalcScore', 'bestMentalClassicCorrect', 'bestMentalClassicScore', 'maxTimeTrialScore']) assert.ok(sql.includes("'$.f." + k + "'"));
  assert.ok(!/bestMentalCalcCorrect/.test(sql));
});
