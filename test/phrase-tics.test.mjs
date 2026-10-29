// 2.5: la bolsa rotativa evita que dos frases seguidas compartan muletilla («por una vez», «expediente»…) sin romper la rotación.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
function grab(html, name) { const i = html.indexOf('function ' + name); assert.ok(i > 0, name); let d = 0; for (let k = html.indexOf('{', i); k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}') { d--; if (!d) return html.slice(i, k + 1); } } }
function env(withTics = true) {
  const html = read('index.html');
  const ctx = { console, window: {}, store: {} };
  vm.createContext(ctx);
  vm.runInContext((withTics ? read('src/utils/phrase-tics.js') + '\n' : '') + grab(html, 'shuffleArray') + '\n' + grab(html, 'pickRotatingPhrase'), ctx);
  return ctx;
}

test('detecta muletillas', () => {
  const c = env();
  const t = (s) => vm.runInContext('SEQTics.ticsOf(' + JSON.stringify(s) + ').length', c);
  assert.equal(t('Por una vez, tú no has necesitado más.'), 1);
  assert.equal(t('Tu expediente, por desgracia, no mejora.'), 2);
  assert.equal(t('Resultado correcto.'), 0);
});

test('tras una muletilla, adelanta una candidata sin ella y no pierde ninguna frase de la vuelta', () => {
  const c = env();
  c.list = ['A. Por una vez, bien.', 'B. Sin nada.', 'C. Por una vez, mal.', 'D. Otra sin nada.'];
  const run = (script) => vm.runInContext(script, c);
  run('SEQTics.note("Por una vez, ya.")');
  run('store.phraseBags = { p: [0, 1, 3, 2] }; store.lastPhraseIndex = {};');   // pop() daría C (con muletilla)
  const first = run('pickRotatingPhrase("p", list)');
  assert.ok(!/Por una vez/.test(first), first);
  const rest = [run('pickRotatingPhrase("p", list)'), run('pickRotatingPhrase("p", list)'), run('pickRotatingPhrase("p", list)')];
  assert.equal(new Set([first, ...rest]).size, 4, 'salen las cuatro, una sola vez');
});

test('si todas las candidatas chocan, sale la de siempre; sin SEQTics todo igual; el índice anterior no se adelanta', () => {
  const c = env();
  c.list = ['A. Por una vez.', 'B. Por una vez también.'];
  vm.runInContext('SEQTics.note("Por una vez, ya."); store.phraseBags = { p: [0, 1] }; store.lastPhraseIndex = {};', c);
  assert.equal(vm.runInContext('pickRotatingPhrase("p", list)', c), 'B. Por una vez también.');
  const n = env(false);
  n.list = ['x', 'y']; vm.runInContext('store.phraseBags = { p: [0, 1] }; store.lastPhraseIndex = {};', n);
  assert.equal(vm.runInContext('pickRotatingPhrase("p", list)', n), 'y');
  const d = env();
  d.list = ['A. Sin.', 'B. Sin.', 'C. Por una vez.'];
  vm.runInContext('SEQTics.note("Por una vez, ya."); store.phraseBags = { p: [1, 0, 2] }; store.lastPhraseIndex = { p: 0 };', d);
  assert.equal(vm.runInContext('pickRotatingPhrase("p", list)', d), 'A. Sin.'.replace('A', 'B'), 'salta la que salió justo antes (índice 0) y elige B');
});

test('index.html y sw.js enlazan el módulo', () => {
  assert.match(read('index.html'), /src\/utils\/phrase-tics\.js\?v=\d+/);
  assert.match(read('sw.js'), /\.\/src\/utils\/phrase-tics\.js/);
});
