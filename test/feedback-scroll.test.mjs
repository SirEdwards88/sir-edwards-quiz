// 2.5: el scroll al feedback no debe sacar de la pantalla la cabecera (progreso y racha) salvo que no quede otra.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const R = (p) => new URL('../' + p, import.meta.url);
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(R('src/ui/feedback-scroll.js'), 'utf8'), ctx);
const S = ctx.SEQFeedbackScroll;

test('si el feedback ya se ve entero no se mueve nada', () => {
  assert.equal(S.delta(300, 500, 740, 100), 0);
});

test('se desplaza lo justo para ver el feedback y la cabecera sigue a la vista', () => {
  // feedback 615-832 en 740 px: hacen falta 104 px, pero la cabecera está en 101: se queda en 97
  const d = S.delta(615, 832, 740, 101);
  assert.equal(d, 97);
  assert.ok(101 - d >= 0, 'la cabecera no sale por arriba');
});

test('sin cabecera a la que atenerse se ve el feedback entero', () => {
  assert.equal(S.delta(615, 832, 740, null), 104);
});

test('con poco alto (teclado abierto) manda el feedback aunque la cabecera salga', () => {
  const d = S.delta(580, 800, 440, 101);
  assert.ok(d > 101, 'se prioriza el feedback');
  assert.ok(580 - d >= 8, 'el principio del feedback no sube por encima del margen');
});

test('index.html enlaza el módulo y sw.js lo cachea; ya no quedan scrollIntoView centrados en el feedback', () => {
  const html = fs.readFileSync(R('index.html'), 'utf8');
  const sw = fs.readFileSync(R('sw.js'), 'utf8');
  assert.match(html, /src\/ui\/feedback-scroll\.js\?v=\d+/);
  assert.match(sw, /'\.\/src\/ui\/feedback-scroll\.js'/);
  assert.ok(!/fb\.scrollIntoView\(\{ behavior: smoothOK\(\), block: 'center' \}\)/.test(html));
});
