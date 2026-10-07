// 2.2: los logros ya conseguidos no se pierden ni se degradan al crecer el banco (nuevos denominadores por categoría).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const J = (x) => JSON.parse(JSON.stringify(x));

test('un logro ya conseguido se conserva al cargar la partida guardada (activos, históricos y con alias)', () => {
  const c = { console, localStorage: { getItem: () => null, setItem() {} } };
  vm.createContext(c);
  vm.runInContext(read('src/data/medals.js').replace(/^const /gm, 'var ') + ';' + read('src/utils/store.js').replace(/^const /gm, 'var ').replace(/^let /gm, 'var ') + ';this.S = sanitizeStore;', c);
  const earned = ['polimata', 'balanced_master', 'correct_100', 'master_150', 'world_citizen', 'duel_eso_era_un_duelo', 'polimata'];
  const out = J(c.S({ unlockedMedals: earned, questionStreaks: {} }).unlockedMedals);
  for (const id of ['polimata', 'balanced_master', 'correct_100', 'world_citizen', 'duel_eso_era_un_duelo']) assert.ok(out.includes(id), id);
  assert.ok(out.includes(c.resolveMedalId('master_150')), 'el alias histórico se conserva con su ID actual');
  assert.equal(out.filter((x) => x === 'polimata').length, 1, 'sin duplicados');
});

test('nada retira logros: store.unlockedMedals solo se amplía (nunca se filtra, recorta ni reasigna salvo normalizar IDs)', () => {
  const files = ['index.html', 'src/online/online.js', 'src/state/encargos.js', 'src/ui/achievements.js', 'src/state/sir-events.js'];
  for (const f of files) {
    const s = read(f);
    assert.ok(!/unlockedMedals\s*\.\s*(splice|pop|shift|length\s*=)/.test(s), 'retira logros en ' + f);
    assert.ok(!/delete\s+[\w.]*unlockedMedals/.test(s), 'borra logros en ' + f);
    assert.ok(!/unlockedMedals\s*=\s*(?!\[\]|store\.unlockedMedals)/.test(s.replace(/if \(!store\.unlockedMedals\) store\.unlockedMedals = \[\];/g, '').replace(/if \(!Array\.isArray\(store\.unlockedMedals\)\) store\.unlockedMedals = \[\];/g, '')), 'reasigna logros en ' + f);
  }
});

test('2.2 no toca medals.js: las condiciones de los logros de dominio por categoría son las de la 2.1', () => {
  const s = read('src/data/medals.js');
  assert.ok(/id: 'polimata'[^\n]*x\.mastered \/ x\.total >= 0\.4/.test(s));
  assert.ok(/id: 'balanced_master'[^\n]*x\.mastered \/ x\.total >= 0\.6/.test(s));
});
