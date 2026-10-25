// 2.5: serie entre dos jugadores — qué situación toca, resumen para pintar y frases con contexto (estables, con nombre, sin repetir).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
function grab(html, name) { const i = html.indexOf('function ' + name); assert.ok(i > 0, name); let d = 0; for (let k = html.indexOf('{', i); k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}' && --d === 0) return html.slice(i, k + 1); } }
function env() {
  const html = read('index.html');
  const ctx = { console, window: {}, store: {}, saveStore() {} };
  vm.createContext(ctx);
  vm.runInContext(grab(html, 'shuffleArray') + '\n' + grab(html, 'pickRotatingPhrase') + '\n' + read('src/data/duel-phrases.js') + '\n' + read('src/data/rivalry-phrases.js') + '\n' + read('src/utils/rivalry.js'), ctx);
  return ctx;
}
// Serie desde la óptica del jugador; `res` va del más NUEVO al más viejo (como lo manda el servidor).
const serie = (res, extra = {}) => {
  const w = res.filter((x) => x === 'win').length, l = res.filter((x) => x === 'loss').length, d = res.filter((x) => x === 'draw').length;
  return { partidas: res.length, victorias: w, derrotas: l, empates: d, recientes: res.map((r, i) => ({ id: 'g' + (res.length - i), resultado: r, margen: r === 'win' ? 2 : r === 'loss' ? -2 : 0, fecha: 1_000_000_000 - i * 86_400_000 })), ...extra };
};

test('situación: cada caso con su prioridad, y solo si ESTE duelo es el último de la serie', () => {
  const { window: { SEQRivalry: R } } = env();
  const id = (s) => s.recientes[0].id;
  assert.equal(R.context(serie(['win', 'loss', 'loss']), 'win', 'g3'), 'win_remontada');
  assert.equal(R.context(serie(['win', 'win', 'win']), 'win', 'g3'), 'win_racha');
  assert.equal(R.context(serie(['win', 'loss']), 'win', 'g2'), 'win_revancha');
  assert.equal(R.context(serie(['win', 'loss', 'win', 'loss']), 'win', 'g4'), 'win_revancha'); // igualados, pero la revancha manda
  // La revancha exige que la derrota anterior sea de los últimos 7 días (7 días justos sí, 8 no).
  const lejos = (dias) => { const x = serie(['win', 'loss']); x.recientes[1].fecha = x.recientes[0].fecha - dias * 86_400_000; return x; };
  assert.equal(R.context(lejos(7), 'win', 'g2'), 'win_revancha');
  assert.equal(R.context(lejos(8), 'win', 'g2'), null);
  assert.equal(R.context(serie(['win', 'draw', 'loss', 'win', 'loss', 'draw']), 'win', 'g6'), 'win_igualados');
  assert.equal(R.context(serie(['loss', 'loss', 'loss']), 'loss', 'g3'), 'loss_racha');
  assert.equal(R.context(serie(['loss', 'win', 'win']), 'loss', 'g3'), 'loss_cae_racha');
  assert.equal(R.context(serie(['loss', 'draw', 'win', 'win']), 'loss', 'g4'), null);
  assert.equal(R.context(serie(['loss', 'win', 'loss', 'win']), 'loss', 'g4'), 'loss_igualados');
  // Empate, primer duelo y racha cortada por un empate: nada.
  assert.equal(R.context(serie(['draw', 'win']), 'draw', 'g2'), null);
  assert.equal(R.context(serie(['win']), 'win', 'g1'), null);
  assert.equal(R.context(serie(['win', 'draw', 'win']), 'win', 'g3'), null);
  // Un resultado antiguo (ya hay otro duelo más nuevo) o datos que no cuadran: nada.
  assert.equal(R.context(serie(['win', 'win', 'win']), 'win', 'g1'), null);
  assert.equal(R.context(serie(['win', 'win', 'win']), 'loss', 'g3'), null);
  assert.equal(R.context(null, 'win', 'g1'), null);
  assert.equal(R.context({ partidas: 3 }, 'win', 'g1'), null);
});

test('resumen: desde el 2.º duelo, con plurales y las últimas partidas de la más antigua a la más nueva', () => {
  const { window: { SEQRivalry: R } } = env();
  assert.equal(R.summary(serie(['win'])), null);
  assert.equal(R.summary(null), null);
  const s = R.summary(serie(['win', 'loss', 'draw', 'win', 'win', 'loss', 'win']));
  assert.equal(s.text, '4 victorias, 2 derrotas y 1 empate');
  assert.deepEqual(s.dots, ['win', 'win', 'loss', 'win', 'win'].slice(0, 0).concat(['win', 'win', 'draw', 'loss', 'win']));
  assert.equal(R.summary(serie(['win', 'loss'])).text, '1 victoria y 1 derrota');
  assert.equal(R.summary(serie(['loss', 'loss', 'draw'])).text, '0 victorias, 2 derrotas y 1 empate');
});

test('frases: con el nombre del rival, estables por partida y sin repetir hasta agotar la bolsa', () => {
  const ctx = env(), R = ctx.window.SEQRivalry, P = ctx.window.SEQRivalryPhrases.PHRASES;
  for (const [k, list] of Object.entries(P)) { assert.ok(list.length >= 5, k + ': varias frases'); assert.equal(new Set(list).size, list.length, k + ': sin duplicados'); assert.ok(list.filter((t) => t.includes('{rival}')).length >= list.length - 2, k + ': casi todas llevan el nombre'); }
  const s = serie(['win', 'win', 'win']);
  const a = R.phrase(s, 'win', 'Bruno', 'g3');
  assert.ok(a && a.includes('Bruno') && !a.includes('{rival}'));
  assert.equal(R.phrase(s, 'win', 'Bruno', 'g3'), a, 'repintar no cambia la frase');
  const seen = new Set([a]);
  for (let g = 0; g < P.win_racha.length - 1; g++) { const id = 'x' + g; seen.add(R.phrase({ ...s, recientes: s.recientes.map((r, i) => i ? r : { ...r, id }) }, 'win', 'Bruno', id)); }
  assert.equal(seen.size, P.win_racha.length, 'salen todas antes de repetir');
  assert.equal(R.phrase(serie(['draw', 'win']), 'draw', 'Bruno', 'g2'), '');
  assert.ok(!R.phrase(s, 'win', '', 'g3').includes('{rival}'), 'sin nombre no queda el marcador');
});
