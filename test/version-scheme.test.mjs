// 0.9: renumeración pública (1.0…2.0 → 0.1…0.9; la 1.0 queda reservada para Google Play) y compatibilidad de los avisos de novedades.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = read('index.html');
const VS = (() => { const c = vm.createContext({}); vm.runInContext(read('src/utils/version-scheme.js'), c); return c.SEQVersionScheme; })();
const SEEN = 'siredwards_quiz_v1_3_update_seen';
const SCHEME = 'siredwards_quiz_v1_3_update_seen_scheme';
const DATA = 'siredwards_quiz_v1_0_data';

const entries = [...html.matchAll(/<div class="settings-changelog-entry">([\s\S]*?)<\/ul>/g)].map((m) => ({
  v: /entry-version">v([\d.]+)</.exec(m[1])[1],
  date: /entry-date">([^<]+)</.exec(m[1])[1],
  items: [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1]),
}));
const store = (init = {}) => { const d = { ...init }; return { d, getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; } }; };

test('las siete entradas: nueva numeración, fechas y descripciones originales, orden cronológico, sin 0.7/0.8 ni 1.0', () => {
  assert.deepEqual(entries.map((e) => e.v + ' ' + e.date), ['0.1 01/09/2026', '0.2 08/09/2026', '0.3 20/09/2026', '0.4 29/09/2026', '0.5 07/10/2026', '0.6 14/10/2026', '0.9 29/10/2026']);
  assert.deepEqual(entries.map((e) => e.items.length), [2, 2, 2, 4, 4, 3, 5]);
  assert.equal(entries[0].items[0], '320 preguntas, 6 categorías y 7 modos de juego.');
  assert.equal(entries[3].items[0], 'Amigos y duelos online.');
  assert.equal(entries[6].items[4], 'Nuevo botón para iniciar otra partida directamente al terminar.');
  assert.ok(!entries.some((e) => e.v === '1.0'), 'la 1.0 sigue reservada: no hay entrada todavía');
});

test('APP_VERSION es 0.9, corresponde a la última entrada y no queda «v2.0» visible', () => {
  assert.match(html, /const APP_VERSION = "0\.9";/);
  assert.equal(entries[entries.length - 1].v, '0.9');
  assert.ok(!/v2\.0</.test(html) && !/Mental v2\.0"/.test(html));
});

test('legacyToCurrent traduce la numeración antigua y deja lo demás', () => {
  const m = { '1.0': '0.1', '1.1': '0.2', '1.2': '0.3', '1.3': '0.3', '1.4': '0.3', '1.5': '0.4', '1.6': '0.5', '1.7': '0.6', '1.8': '0.6', '2.0': '0.9', '2.1': '0.9', 'v2.0': '0.9' };
  for (const [a, b] of Object.entries(m)) assert.equal(VS.legacyToCurrent(a), b, a);
  for (const x of ['0.9', '0.1', '', null, 'abc', '0']) assert.equal(VS.legacyToCurrent(x), null, String(x));
});

test('jugador que vio la 2.0: queda en 0.9 (sin aviso repetido), sin tocar su progreso, y solo se migra una vez', () => {
  const s = store({ [DATA]: '{"xp":50}', [SEEN]: '2.0' });
  assert.equal(VS.migrate(s), 'migrated');
  assert.equal(s.d[SEEN], '0.9');
  assert.equal(s.d[DATA], '{"xp":50}');
  assert.equal(VS.migrate(s), 'skipped');
  s.d[SEEN] = '1.5'; // un «1.5» posterior ya es de la numeración nueva: no se vuelve a traducir
  assert.equal(VS.migrate(s), 'skipped');
  assert.equal(s.d[SEEN], '1.5');
});

test('migrate: instalación nueva solo deja la marca; jugador de 1.5 antiguo pasa a 0.4; almacenamiento roto no lanza', () => {
  const n = store(); assert.equal(VS.migrate(n), 'marked'); assert.equal(SEEN in n.d, false); assert.equal(n.d[SCHEME], '0.x');
  const o = store({ [SEEN]: '1.5' }); VS.migrate(o); assert.equal(o.d[SEEN], '0.4');
  assert.doesNotThrow(() => VS.migrate({ getItem() { throw new Error('x'); } }));
});

// Funciones reales del aviso, extraídas de index.html y ejecutadas con un DOM simulado.
function runNotice(appVersion, st, changelog = entries) {
  const src = html.slice(html.indexOf('function findChangelogEntryForVersion'), html.indexOf('// 2.0: «Compartir resultado» es discreto'));
  const nodes = changelog.map((e) => ({
    querySelector: (s) => (s.includes('entry-version') ? { textContent: 'v' + e.v } : s.includes('changelog-list') ? { innerHTML: e.items.map((i) => '<li>' + i + '</li>').join('') } : null),
  }));
  const modal = { style: {} }, label = {}, list = {};
  const doc = { querySelectorAll: () => nodes, getElementById: (id) => ({ 'update-modal': modal, 'update-modal-version': label, 'update-modal-list': list }[id] || null) };
  const c = vm.createContext({ document: doc, localStorage: st });
  vm.runInContext('const APP_VERSION=' + JSON.stringify(appVersion) + ';const UPDATE_SEEN_KEY=' + JSON.stringify(SEEN) + ';' + src + ';this.run=maybeShowUpdateModal;this.close=closeUpdateModal;', c);
  c.run();
  return { shown: modal.style.display === 'flex', label: label.textContent, html: list.innerHTML, close: c.close };
}

test('aviso: usuario nuevo no lo ve; quien vio la 2.0 no lo ve repetido; quien viene de otra versión lo ve una vez con el texto del historial', () => {
  const nuevo = store(); VS.migrate(nuevo);
  assert.equal(runNotice('0.9', nuevo).shown, false);
  assert.equal(nuevo.d[SEEN], '0.9');

  const viejo = store({ [DATA]: '{}', [SEEN]: '2.0' }); VS.migrate(viejo);
  assert.equal(runNotice('0.9', viejo).shown, false);

  const atras = store({ [DATA]: '{}', [SEEN]: '1.7' }); VS.migrate(atras);
  const r = runNotice('0.9', atras);
  assert.equal(r.shown, true); assert.equal(r.label, 'v0.9');
  assert.ok(r.html.includes('Sir Edwards irrumpe con sus propias preguntas.'));
  r.close();
  assert.equal(atras.d[SEEN], '0.9');
  assert.equal(runNotice('0.9', atras).shown, false, 'no se repite');
});

test('transición 0.9 → 1.0 (y 1.1): la entrada nueva se encuentra aunque las anteriores estén plegadas; sin entrada no se fuerza el aviso', () => {
  const nuevas = [...entries, { v: '1.0', date: '01/01/2027', items: ['Primera versión oficial.'] }, { v: '1.1', date: '01/02/2027', items: ['Algo más.'] }];
  const st = store({ [DATA]: '{}', [SEEN]: '0.9' }); VS.migrate(st);
  const r = runNotice('1.0', st, nuevas);
  assert.equal(r.shown, true); assert.equal(r.label, 'v1.0'); assert.ok(r.html.includes('Primera versión oficial.'));
  r.close();
  assert.equal(runNotice('1.1', st, nuevas).shown, true);
  assert.equal(runNotice('1.0', store({ [DATA]: '{}', [SEEN]: '0.9' }), entries).shown, false, 'sin entrada de 1.0 no hay aviso');
});

test('claves persistentes intactas y módulo enlazado (index.html antes de intro, sw.js)', () => {
  assert.match(html, /siredwards_quiz_v1_0_data/);
  assert.match(read('src/ui/intro.js'), /siredwards_quiz_v1_3_update_seen'/);
  assert.match(html, /const UPDATE_SEEN_KEY = 'siredwards_quiz_v1_3_update_seen';/);
  assert.ok(html.indexOf('src/utils/version-scheme.js') > 0);
  assert.ok(read('sw.js').includes("'./src/utils/version-scheme.js'"));
});
