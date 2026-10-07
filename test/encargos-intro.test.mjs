// Presentación de Sir Edwards (Encargos): frases, decisiones puras (qué y cuándo), cableado y correcciones de texto.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const exists = (p) => fs.existsSync(new URL('../' + p, import.meta.url));
function load() {
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(read('src/data/encargos-intro-phrases.js').replace(/^const /m, 'var ') + '\n' + read('src/utils/encargos-intro-core.js').replace(/^const /m, 'var '), ctx);
  return { P: ctx.ENCARGOS_INTRO, C: ctx.SEQEncargosIntroCore };
}
const noEmoji = (t) => !/\p{Extended_Pictographic}/u.test(t);

test('frases: sin vacías, sin repetidas, sin emojis, con las claves que clasifica el núcleo', () => {
  const { P } = load();
  assert.deepEqual(Object.keys(P.result).sort(), ['buena', 'derrota', 'empate', 'mala', 'neutra', 'normal', 'victoria']);
  const all = [];
  Object.values(P.result).forEach((l) => { assert.ok(l.length >= 1); all.push(...l); });
  ['base', 'aprobacion', 'reproche', 'extraAprobacion', 'extraReproche'].forEach((k) => all.push(...P.monday[k]));
  all.push(P.monday.open, P.callback);
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.every((t) => t.length > 5 && t.length < 100 && noEmoji(t)));
  assert.equal(P.monday.open, 'Es lunes.');
  assert.ok(P.result.buena.length >= 5 && P.result.normal.length >= 5 && P.result.mala.length >= 5);
});

test('«Cuatro de cuatro» solo en la variante de aprobación; el reproche nunca lo dice', () => {
  const { P, C } = load();
  const rep = C.mondayFixed(P.monday, 'reproche').concat(C.mondayPool(P.monday, 'reproche'));
  const apr = C.mondayFixed(P.monday, 'aprobacion').concat(C.mondayPool(P.monday, 'aprobacion'));
  assert.ok(!rep.some((t) => /cuatro de cuatro/i.test(t)));
  assert.ok(apr.some((t) => /cuatro de cuatro/i.test(t)));
  assert.ok(!P.monday.base.some((t) => /cuatro de cuatro|^es lunes|^lunes/i.test(t)), 'la bolsa común no repite la apertura ni nombra el resultado');
  assert.deepEqual(C.mondayFixed(P.monday, 'aprobacion')[0], 'Es lunes.');
  assert.deepEqual(C.mondayFixed(P.monday, 'reproche')[0], 'Es lunes.');
});

test('clasificación de la primera partida por modo, con los umbrales existentes', () => {
  const { C } = load();
  const std = (s) => C.classify({ mode: 'play', score: s, total: 20 });
  assert.equal(std(0), 'mala'); assert.equal(std(10), 'mala');
  assert.equal(std(11), 'normal'); assert.equal(std(14), 'normal');
  assert.equal(std(15), 'buena'); assert.equal(std(20), 'buena');
  const tt = (s) => C.classify({ mode: 'timetrial', score: s, total: 99 });
  assert.equal(tt(14), 'mala'); assert.equal(tt(15), 'normal'); assert.equal(tt(30), 'normal'); assert.equal(tt(31), 'buena');
  assert.equal(C.classify({ mode: 'mental_calc', score: 31 }), 'buena');
  ['survival', 'sudden_death', 'lucidez_mental'].forEach((m) => {
    assert.equal(C.classify({ mode: m, failed: true }), 'mala');
    assert.equal(C.classify({ mode: m, failed: false }), 'buena');
  });
  assert.equal(C.classify({ kind: 'duel', result: 'win' }), 'victoria');
  assert.equal(C.classify({ kind: 'duel', result: 'loss' }), 'derrota');
  assert.equal(C.classify({ kind: 'duel', result: 'draw' }), 'empate');
  assert.equal(C.classify({ mode: 'play', score: NaN, total: 0 }), 'neutra');
  assert.equal(C.classify(null), 'neutra');
  assert.equal(C.classify({ mode: 'otro' }), 'neutra');
});

test('nombre: solo si existe y es razonable; sin nombre la línea sale sin él', () => {
  const { C } = load();
  assert.equal(C.cleanName('Ana'), 'Ana');
  assert.equal(C.cleanName('  María   José '), 'María José');
  assert.equal(C.cleanName('Jugador'), null);
  assert.equal(C.cleanName(''), null);
  assert.equal(C.cleanName(null), null);
  assert.equal(C.cleanName('visita www.ejemplo.com'), null);
  assert.equal(C.cleanName('juan@correo.es'), null);
  assert.equal(C.cleanName('Alejandro Fernández de la Vega'), 'Alejandro');
  assert.equal(C.cleanName('Supercalifragilisticoexpialidoso'), null);
  assert.equal(C.cleanName('1234'), null);
});

test('la presentación grande: solo en Inicio, con una partida terminada, sin partida ni modal, y una sola vez', () => {
  const { C } = load();
  const ok = { seen: false, hasResult: true, onHome: true, inGame: false, blocked: false };
  assert.equal(C.shouldShowIntro(ok), true);
  assert.equal(C.shouldShowIntro({ ...ok, seen: true }), false);
  assert.equal(C.shouldShowIntro({ ...ok, hasResult: false }), false, 'sin partida terminada no sale (ni al abrir la app)');
  assert.equal(C.shouldShowIntro({ ...ok, onHome: false }), false);
  assert.equal(C.shouldShowIntro({ ...ok, inGame: true }), false, 'nunca dentro de una partida / Duelo / Reto');
  assert.equal(C.shouldShowIntro({ ...ok, blocked: true }), false, 'nunca sobre un modal: se reintenta en la siguiente visita');
  assert.equal(C.shouldShowIntro(null), false);
});

test('carta de los lunes: solo lunes, una vez por semana, tras la presentación y nunca el mismo día', () => {
  const { C } = load();
  const ok = { seen: true, introDay: '2026-10-05', today: '2026-10-12', dow: 1, weekId: '2026-W42', lastShown: '2026-W41', onHome: true, inGame: false, blocked: false };
  assert.equal(C.shouldShowMonday(ok), true);
  assert.equal(C.shouldShowMonday({ ...ok, seen: false }), false, 'sin presentación no hay carta');
  assert.equal(C.shouldShowMonday({ ...ok, dow: 2 }), false, 'solo los lunes («Es lunes.»)');
  assert.equal(C.shouldShowMonday({ ...ok, dow: 0 }), false);
  assert.equal(C.shouldShowMonday({ ...ok, lastShown: '2026-W42' }), false, 'una vez por lunes');
  assert.equal(C.shouldShowMonday({ ...ok, introDay: '2026-10-12' }), false, 'nunca el día de la gran presentación');
  assert.equal(C.shouldShowMonday({ ...ok, blocked: true }), false);
  assert.equal(C.shouldShowMonday({ ...ok, inGame: true }), false);
  assert.equal(C.shouldShowMonday({ ...ok, onHome: false }), false);
});

test('aprobación = los cuatro de la semana pasada cobrados (3 semanales + Gran Encargo); lo demás, reproche', () => {
  const { C } = load();
  const w = '2026-W41';
  const full = [w + ':m:a', w + ':m:b', w + ':m:c', w + ':b', w + ':g:x'];
  assert.equal(C.mondayKind(full, w), 'aprobacion');
  assert.equal(C.mondayKind(full.filter((k) => k !== w + ':g:x'), w), 'reproche', 'sin Gran Encargo');
  assert.equal(C.mondayKind(full.filter((k) => k !== w + ':m:c'), w), 'reproche', 'faltan semanales');
  assert.equal(C.mondayKind([], w), 'reproche', 'no jugó');
  assert.equal(C.mondayKind(full, '2026-W40'), 'reproche', 'solo cuenta la semana pasada');
  assert.equal(C.mondayKind(undefined, w), 'reproche');
});

test('cableado: scripts, estilos y assets en index.html y sw.js; ganchos de fin de partida, Lucidez y Duelo', () => {
  const html = read('index.html'), sw = read('sw.js');
  const files = ['src/utils/encargos-intro-core.js', 'src/data/encargos-intro-phrases.js', 'src/ui/encargos-intro.js', 'styles/encargos-intro.css'];
  files.forEach((f) => { assert.ok(exists(f), f); assert.ok(html.includes(f + '?v='), 'index.html ' + f); assert.ok(sw.includes("'./" + f + "'"), 'sw.js ' + f); });
  ['presentacion-evaluador', 'presentacion-expediente', 'presentacion-mirada', 'lunes-aprobacion', 'lunes-reproche'].forEach((n) => {
    const f = 'assets/character/' + n + '.webp';
    assert.ok(exists(f), f); assert.ok(sw.includes("'./" + f + "'"), 'sw.js ' + f);
    assert.ok(fs.statSync(new URL('../' + f, import.meta.url)).size < 80 * 1024, f + ' < 80 KB');
  });
  assert.ok(html.indexOf('encargos-intro-core.js') > html.indexOf('encargos-core.js'));
  assert.ok(html.indexOf('encargos-intro.js') > html.indexOf('encargos-intro-phrases.js'));
  assert.equal((html.match(/SEQEncargosIntro\.noteGame\(/g) || []).length, 2, 'finishGame y finishLucidezMode');
  assert.match(html, /SEQEncargosIntro\.noteDuel\(info\.result\)/);
  assert.match(html, /SEQEncargosIntro\.onHome\(\)/);
  assert.match(html, /Tu expediente semanal/);
  assert.equal((html.match(/SEQEncargosIntro\.onHome\(\)/g) || []).length, 2, 'Inicio y la pantalla de modos (destino de «Volver al Menú principal»)');
  assert.match(read('src/ui/encargos-intro.js'), /viewActive\('view-modes'\)/);
});

test('la tira de Inicio queda oculta hasta la presentación, cuenta sobre 4 y no avisa antes', () => {
  const ui = read('src/ui/encargos-ui.js');
  assert.match(ui, /!SEQEncargosIntro\.seen\(\)\) \{ el\.hidden = true; return; \}/);
  assert.match(ui, /!SEQEncargosIntro\.seen\(\)\) return;/, 'toast silenciado hasta la presentación');
  assert.ok(!/\/3 encargos/.test(ui.slice(0, ui.indexOf('function renderScreen'))), 'la tira ya no dice n/3');
  assert.match(ui, /n \+ '\/4 encargos completados'/);
  assert.match(ui, /'3\/4 encargos completados/);
});

test('la presentación no usa nada fuera de opacidad/transformación y respeta reducir movimiento', () => {
  const css = read('styles/encargos-intro.css');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.is-reduced/);
  const frames = [...css.matchAll(/@keyframes\s+\w+\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)].map((m) => m[1]);
  assert.ok(frames.length >= 6);
  frames.forEach((f) => { const props = [...f.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]); props.forEach((p) => assert.ok(['opacity', 'transform'].includes(p), 'propiedad animada: ' + p)); });
  const js = read('src/ui/encargos-intro.js');
  assert.match(js, /navigator\.vibrate/);
  assert.match(js, /!reduced\(\) && navigator\.vibrate/);
});

test('historial 2.0: sin los dos logros de Duelo', () => {
  const html = read('index.html');
  assert.ok(!/dos logros de Duelo/.test(html));
  assert.match(html, /<li>Sonidos nuevos y música para los menús\.<\/li>/);
});

test('el evento de réplica se usa una sola vez y solo en los modos permitidos', () => {
  const st = read('src/state/sir-events.js');
  assert.match(st, /SEQEncargosIntro\.callbackPending\(\)/);
  assert.match(st, /else if \(cb\) SEQEncargosIntro\.takeCallback\(\)/);
  assert.match(st, /SIR_EVENT_MODES = \['play', 'survival', 'sudden_death', 'review', 'lucidez_mental'\]/);
  const { P } = load();
  assert.match(P.callback, /Solo observaba/);
});
