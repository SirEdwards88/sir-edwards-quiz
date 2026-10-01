import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('la tarjeta final de Duelo/Reto copia al día los estilos de la tarjeta en solitario', () => {
  const out = execFileSync(process.execPath, [new URL('../scripts/gen-duel-results-css.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.match(out, /^OK/);
});
