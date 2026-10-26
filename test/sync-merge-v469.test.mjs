import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src = fs.readFileSync(new URL('../src/utils/sync-merge.js', import.meta.url), 'utf8');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(src + ';this.M = SEQSyncMerge;', ctx);
const M = ctx.M;

test('sync: el récord de Muerte súbita viaja entre dispositivos y gana el mayor', () => {
  assert.match(src, /'suddenBestSurvived'/);
  const a = M.sanitizeDoc({ v: 1, f: { suddenBestSurvived: 12 } }), b = M.sanitizeDoc({ v: 1, f: { suddenBestSurvived: 25 } });
  assert.equal(a.f.suddenBestSurvived, 12);
  assert.equal(M.mergeDocs(a, b).f.suddenBestSurvived, 25);
  assert.equal(M.mergeDocs(b, a).f.suddenBestSurvived, 25);
});

test('sync: notifiedFragmentRewards solo admite hitos válidos (1..15)', () => {
  const c = M.sanitizeDoc({ v: 1, f: { notifiedFragmentRewards: [12, 15, 99, -3, 'x', 0, 12] } });
  assert.deepEqual([...c.f.notifiedFragmentRewards], [12, 15]);
});
