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
  ['verdict', 'comment'].forEach((g) => Object.values(P.monday[g]).forEach((l) => all.push(...l)));
  all.push(...P.monday.close);
  all.push(P.monday.open, P.monday.openOther, P.callback);
  assert.equal(new Set(all).size, all.length, 'ninguna frase repetida, ni dentro de una bolsa ni entre bolsas');
  assert.ok(all.every((t) => t.length > 5 && t.length < 100 && noEmoji(t)));
  assert.equal(P.monday.open, 'Es lunes.');
  assert.ok(P.result.buena.length >= 5 && P.result.normal.length >= 5 && P.result.mala.length >= 5);
});

test('carta semanal: bolsas amplias, para que no se repita semana tras semana', () => {
  const { P } = load();
  ['aprobacion', 'reproche'].forEach((k) => {
    assert.ok(P.monday.verdict[k].length >= 10, 'veredicto ' + k);
    assert.ok(P.monday.comment[k].length >= 10, 'comentario ' + k);
  });
  assert.ok(P.monday.close.length >= 20, 'cierre común');
  assert.ok(P.monday.verdict.incorporacion.length >= 3 && P.monday.comment.incorporacion.length >= 3);
});

test('«Cuatro de cuatro» solo en el veredicto de aprobación; el resto de líneas nunca lo dice ni se pisan entre sí', () => {
  const { P, C } = load();
  const lines = (kind) => [].concat(C.mondayVerdictPool(P.monday, kind), C.mondayCommentPool(P.monday, kind), C.mondayClosePool(P.monday));
  assert.ok(!lines('reproche').some((t) => /cuatro de cuatro/i.test(t)));
  assert.ok(C.mondayVerdictPool(P.monday, 'aprobacion').some((t) => /cuatro de cuatro/i.test(t)));
  assert.ok(![].concat(C.mondayCommentPool(P.monday, 'aprobacion'), C.mondayClosePool(P.monday)).some((t) => /cuatro de cuatro|cumpliste/i.test(t)), 'solo el veredicto habla del resultado');
  assert.ok(!P.monday.close.some((t) => /cuatro de cuatro|^es lunes|^lunes|^nueva semana|lunes/i.test(t)), 'el cierre común no repite la apertura, no nombra el lunes ni el resultado');
  assert.equal(C.mondayOpen(P.monday, true), 'Es lunes.');
  assert.equal(C.mondayOpen(P.monday, undefined), 'Es lunes.');
  assert.equal(C.mondayOpen(P.monday, false), 'Nueva semana.');
  // Veredicto y comentario de reproche no hablan de aprobación, y los de aprobación no hablan de deudas.
  assert.ok(!C.mondayCommentPool(P.monday, 'reproche').some((t) => /impecable|sin una sola mancha|cuatro/i.test(t)));
  assert.ok(![].concat(C.mondayVerdictPool(P.monday, 'aprobacion'), C.mondayCommentPool(P.monday, 'aprobacion')).some((t) => /me debes|sin saldar|a medias|incompleta/i.test(t)));
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

test('carta semanal: primera visita a Inicio de cada semana nueva (no solo lunes), nunca en la semana de incorporación', () => {
  const { C } = load();
  const ok = { seen: true, introWeek: '2026-W41', weekId: '2026-W42', lastShown: '2026-W41', onHome: true, inGame: false, blocked: false };
  assert.equal(C.shouldShowMonday(ok), true, 'también si abre el miércoles de la semana nueva');
  assert.equal(C.shouldShowMonday({ ...ok, seen: false }), false, 'sin presentación no hay carta');
  assert.equal(C.shouldShowMonday({ ...ok, lastShown: '2026-W42' }), false, 'una vez por semana');
  assert.equal(C.shouldShowMonday({ ...ok, weekId: '2026-W41', lastShown: null }), false, 'semana de incorporación: ni carta ni reproche');
  assert.equal(C.shouldShowMonday({ ...ok, introWeek: null }), true);
  assert.equal(C.shouldShowMonday({ ...ok, blocked: true }), false);
  assert.equal(C.shouldShowMonday({ ...ok, inGame: true }), false);
  assert.equal(C.shouldShowMonday({ ...ok, onHome: false }), false);
});

test('la semana de incorporación no se evalúa: la primera carta es neutra; después, aprobación/reproche', () => {
  const { C, P } = load();
  const w = '2026-W41';
  const full = [w + ':m:a', w + ':m:b', w + ':m:c', w + ':b', w + ':g:x'];
  assert.equal(C.mondayKind([], w, w), 'incorporacion', 'aunque no haya cobrado nada, sin reproche');
  assert.equal(C.mondayKind(full, w, w), 'incorporacion');
  assert.equal(C.mondayKind(full, w, '2026-W40'), 'aprobacion');
  assert.equal(C.mondayKind([], w, '2026-W40'), 'reproche');
  const lines = [].concat(C.mondayVerdictPool(P.monday, 'incorporacion'), C.mondayCommentPool(P.monday, 'incorporacion'), C.mondayClosePool(P.monday));
  assert.ok(!lines.some((t) => /cuatro de cuatro|debes|no cumpliste|cumpliste|reproche|expediente impecable|sin saldar|a medias|incompleta/i.test(t)), 'sin juicio sobre una semana que no vivió');
  assert.equal(C.mondayOpen(P.monday, false), 'Nueva semana.');
  assert.equal(C.mondayOpen(P.monday, true), 'Es lunes.');
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

test('historial 2.0: sin los dos logros de Duelo y con el Duelo online explicado (clásico y apuestas, con amigos)', () => {
  const html = read('index.html');
  assert.match(html, /<li>Duelo online con amigos, en dos modos: clásico y apuestas\.<\/li>/);
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
