// Una llave suelta o una declaración sin selector invalida en silencio la regla siguiente: que no vuelva a pasar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const dir = new URL('../styles/', import.meta.url).pathname;
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.css'))) {
  test(`CSS equilibrado: ${f}`, () => {
    const s = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    let d = 0;
    for (const c of s) { if (c === '{') d++; if (c === '}') { d--; assert.ok(d >= 0, 'llave de cierre de más'); } }
    assert.equal(d, 0, 'llaves sin cerrar');
    // declaración suelta: una línea que empieza por propiedad: valor; } justo tras un cierre o un comentario
    const stray = s.split('\n').filter((l, i, a) => /^\s+[a-z-]+\s*:[^{}]*;\s*\}\s*$/.test(l) && i > 0 && /^\s*$|\}\s*$/.test(a[i - 1]));
    assert.deepEqual(stray, []);
  });
}
