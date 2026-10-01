// El tema claro/oscuro es de cada dispositivo: la sincronización con la cuenta no lo cambia.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, '..', 'src', f), 'utf8');

test('sincronizar con una cuenta que guardó tema claro no pisa el oscuro local', async () => {
  const store = { theme: 'dark', sound: 'on', xp: 0, savedGame: null };
  const ls = {};
  const ctx = vm.createContext({
    store, console, Date, JSON, Promise, Object, Array, Math, Number, String, Error, isFinite,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    applyTheme: (t) => { ctx.applied = t; }, updateThemeButtons() {}, updateSoundButtons() {}, updateBadges() {},
  });
  ctx.window = ctx;
  vm.runInContext(read('utils/sync-merge.js') + '\n;globalThis.SEQSyncMerge = SEQSyncMerge;', ctx);
  vm.runInContext(read('online/data-sync.js'), ctx);
  const M = ctx.SEQSyncMerge;
  const server = M.extractDoc({ theme: 'light', sound: 'off' }, { t: { settings: Date.now() + 1000 } });
  const env = {
    playerId: 'P1',
    api: () => Promise.resolve({ data: JSON.parse(JSON.stringify(server)) }),
    withApplying: (fn) => fn(),
  };
  await ctx.SEQDataSync.run(env, 'start');
  assert.equal(store.theme, 'dark', 'el tema local se mantiene');
  assert.equal(store.sound, 'off', 'el sonido sí se sincroniza');
});
