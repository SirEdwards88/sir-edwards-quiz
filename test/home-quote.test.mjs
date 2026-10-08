// Cita de Inicio (2.3): rota entre las de src/data/home-quotes.js cada vez que se abre el juego; si algo falla, se queda la de index.html.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const quotes = () => { const c = {}; vm.createContext(c); vm.runInContext(read('src/data/home-quotes.js') + '\nthis.Q = HOME_QUOTES;', c); return c.Q; };

test('banco de diez citas: las dos de siempre y las nuevas, en el tono de Sir Edwards', () => {
  const q = quotes();
  assert.equal(q.length, 10);
  assert.equal(new Set(q).size, q.length, 'sin repetidas');
  assert.ok(q.includes('«La mente es como un músculo. Cuanto más la ejercitas, más fuerte se vuelve.»'));
  assert.ok(q.includes('«Se aprende más de un error que de diez aciertos. De ahí tu enorme potencial.»'));
  for (const t of q) {
    assert.match(t, /^«[^«»]+»$/, 'comillas españolas: ' + t);
    assert.ok(!/[!¡]/.test(t), 'sin exclamaciones: ' + t);
    assert.ok(!/\p{Extended_Pictographic}/u.test(t), 'sin emojis: ' + t);
    assert.ok(!/\d/.test(t), 'sin cifras que se queden viejas: ' + t);
    assert.ok(t.length <= 90, 'cabe en dos líneas del móvil: ' + t);
  }
});

const KEY = 'siredwards_quiz_v1_0_data';
function load(env, saved) {
  const el = { textContent: 'original' }, listeners = {}, win = {}, mem = saved === undefined ? {} : { [KEY]: saved };
  const home = { classList: { contains: (c) => c === 'active' && env.homeActive !== false } };
  const c = {
    document: { visibilityState: env.visibility || 'visible', addEventListener: (t, f) => { listeners[t] = f; }, querySelector: (s) => (s === '.home-quote' ? el : null), getElementById: (id) => (id === 'view-home' ? home : null) },
    localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } },
    ...env
  };
  c.window = c; c.addEventListener = (t, f) => { win[t] = f; }; vm.createContext(c);
  vm.runInContext(read('src/data/home-quotes.js'), c);
  vm.runInContext(read('src/ui/home-quote.js'), c);
  return { H: vm.runInContext('SEQHomeQuote', c), el, listeners, win, mem };
}

test('refresh pinta la que elige la bolsa (poolKey home_quote)', () => {
  const asked = [];
  const { H, el } = load({ store: {}, pickRotatingPhrase: (k, list) => { asked.push([k, list.length]); return list[2]; } });
  H.refresh();
  assert.equal(el.textContent, '«Lo difícil de hoy es lo fácil de mañana. Siempre que mañana vuelvas.»');
  assert.deepEqual(asked, [['home_quote', 10]]);
});

test('si falta la bolsa, el store o la elección falla, se conserva el texto de index.html', () => {
  for (const env of [{ store: {} }, { pickRotatingPhrase: () => 'x' }, { store: {}, pickRotatingPhrase: () => { throw new Error('x'); } }, { store: {}, pickRotatingPhrase: () => '' }]) {
    const { H, el } = load(env);
    assert.doesNotThrow(() => H.refresh());
    assert.equal(el.textContent, 'original');
  }
});

test('cambia al abrir la app y al volver a ella con Inicio a la vista; no al volver con otra pantalla', () => {
  let n = 0;
  const env = { store: {}, pickRotatingPhrase: (k, list) => list[n++ % list.length] };
  let t = load(env);
  t.listeners.DOMContentLoaded(); assert.equal(n, 1);
  t.listeners.visibilitychange(); assert.equal(n, 2);                        // reanudar desde segundo plano
  t.win.pageshow({ persisted: true }); assert.equal(n, 3);                   // volver desde la caché de páginas
  t.win.pageshow({ persisted: false }); assert.equal(n, 3);                  // carga normal: ya la gestionó DOMContentLoaded
  n = 0; t = load({ ...env, homeActive: false });
  t.listeners.visibilitychange(); assert.equal(n, 0);                        // no se gasta una cita que nadie lee
  n = 0; t = load({ ...env, visibility: 'hidden' });
  t.listeners.visibilitychange(); assert.equal(n, 0);                        // al pasar a segundo plano no cambia
});

test('persiste solo la bolsa de esta cita y deja intacto el resto del progreso', () => {
  const saved = JSON.stringify({ xp: 1234, currentStreak: 7, phraseBags: { otra: [1, 2] }, lastPhraseIndex: { otra: 1 }, nested: { a: [1, { b: 2 }] } });
  const store = { xp: 999, currentStreak: 0, phraseBags: { home_quote: [3, 1] }, lastPhraseIndex: { home_quote: 4 } };
  const t = load({ store, pickRotatingPhrase: (k, list) => list[0] }, saved);
  t.H.refresh();
  const d = JSON.parse(t.mem[KEY]);
  assert.deepEqual(d.phraseBags, { otra: [1, 2], home_quote: [3, 1] });
  assert.deepEqual(d.lastPhraseIndex, { otra: 1, home_quote: 4 });
  assert.equal(d.xp, 1234); assert.equal(d.currentStreak, 7);                // lo que había guardado no se pisa con el store en memoria
  assert.deepEqual(d.nested, { a: [1, { b: 2 }] });
});

test('sin datos guardados, con datos corruptos o sin bolsa, no escribe ni rompe', () => {
  const store = { phraseBags: { home_quote: [1] }, lastPhraseIndex: {} };
  for (const saved of [undefined, 'no es json', '"texto"']) {
    const t = load({ store, pickRotatingPhrase: (k, list) => list[0] }, saved);
    assert.doesNotThrow(() => t.H.refresh());
    assert.equal(t.el.textContent, '«La mente es como un músculo. Cuanto más la ejercitas, más fuerte se vuelve.»');
    assert.equal(t.mem[KEY], saved);
  }
  const t = load({ store: {}, pickRotatingPhrase: (k, list) => list[0] }, '{"xp":1}');
  t.H.refresh(); assert.equal(t.mem[KEY], '{"xp":1}');
});

test('cableado: scripts en index.html, sin rotar al navegar dentro de la app, archivos en la caché sin conexión y respaldo dentro del banco', () => {
  const html = read('index.html'), sw = read('sw.js');
  assert.match(html, /<script src="src\/data\/home-quotes\.js\?v=\d+"><\/script>\s*<script src="src\/ui\/home-quote\.js\?v=\d+"><\/script>/);
  assert.ok(!/SEQHomeQuote/.test(html), 'index.html no llama al módulo: se gestiona solo al abrir/volver');
  assert.ok(sw.includes("'./src/data/home-quotes.js'") && sw.includes("'./src/ui/home-quote.js'"));
  const fallback = /<p class="home-quote">([^<]+)<\/p>/.exec(html);
  assert.ok(fallback && quotes().includes(fallback[1]), 'la cita fija de index.html debe ser una del banco');
});
