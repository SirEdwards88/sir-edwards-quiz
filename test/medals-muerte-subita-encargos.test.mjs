// Logros nuevos: hitos de Muerte Súbita (15 y 20 preguntas; el de 20 da Fragmento) y «Semana Saldada» (encargos).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/data/medals.js', import.meta.url), 'utf8');
const c = new Function('getLevelData', 'getFragmentCount', src + ';return { ALL_MEDALS, MEDAL_REWARDS };')(() => 1, () => 0);
const by = (id) => c.ALL_MEDALS.find((m) => m.id === id);

test('Muerte Súbita: hitos de 15 y 20 preguntas; quien ya ganó el modo los tiene', () => {
  assert.equal(by('sd_quince').check({ suddenBestSurvived: 14 }), false);
  assert.equal(by('sd_quince').check({ suddenBestSurvived: 15 }), true);
  assert.equal(by('sd_veinte').check({ suddenBestSurvived: 19 }), false);
  assert.equal(by('sd_veinte').check({ suddenBestSurvived: 20 }), true);
  assert.equal(by('sd_veinte').check({ suddenWins: 1 }), true, 'ganó antes de guardarse el récord');
  assert.equal(by('sd_primer_riesgo').check({ suddenWins: 1 }), true);
});

test('el Fragmento pasa del logro de ganar Muerte Súbita al de sobrevivir 20', () => {
  const f = c.MEDAL_REWARDS.fragment;
  assert.ok(f.includes('sd_veinte')); assert.ok(!f.includes('sd_primer_riesgo')); assert.equal(f.length, 15);
});

test('Semana Saldada: tres encargos y el Gran Encargo de una misma semana', () => {
  const m = by('encargos_semana_completa');
  assert.equal(m.check({ encargosClaimed: [] }), false);
  assert.equal(m.check({ encargosClaimed: ['2026-W41:m:a', '2026-W41:m:b', '2026-W41:m:c', '2026-W41:b'] }), false, 'falta el Gran Encargo');
  assert.equal(m.check({ encargosClaimed: ['2026-W41:m:a', '2026-W41:m:b', '2026-W42:m:c', '2026-W41:g:x', '2026-W42:g:y'] }), false, 'repartidos en semanas distintas');
  assert.equal(m.check({ encargosClaimed: ['2026-W41:m:a', '2026-W41:m:b', '2026-W41:m:c', '2026-W41:b', '2026-W41:g:x'] }), true);
});
