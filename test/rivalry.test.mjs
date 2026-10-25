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

// Id de duelo (formato del servidor: 10 caracteres) que SÍ pasa el sorteo de la situación `key`; n = n-ésimo de ellos.
const okId = (R, key, n = 0) => { for (let i = 0, f = 0; i < 100000; i++) { const id = 'TEST' + String(i).padStart(6, '0'); if (R.accepts(key, id) && f++ === n) return id; } throw new Error('sin id'); };
const koId = (R, key, n = 0) => { for (let i = 0, f = 0; i < 100000; i++) { const id = 'TEST' + String(i).padStart(6, '0'); if (!R.accepts(key, id) && f++ === n) return id; } throw new Error('sin id'); };
const withId = (s, id) => ({ ...s, recientes: s.recientes.map((r, i) => (i ? r : { ...r, id })) });

test('frases: con el nombre del rival, estables por partida y sin repetir hasta agotar la bolsa', () => {
  const ctx = env(), R = ctx.window.SEQRivalry, P = ctx.window.SEQRivalryPhrases.PHRASES;
  for (const [k, list] of Object.entries(P)) { assert.ok(list.length >= 5, k + ': varias frases'); assert.equal(new Set(list).size, list.length, k + ': sin duplicados'); assert.ok(list.filter((t) => t.includes('{rival}')).length >= list.length - 2, k + ': casi todas llevan el nombre'); }
  const base = serie(['win', 'win', 'win']), seen = new Set();
  const id0 = okId(R, 'win_racha', 0), a = R.phrase(withId(base, id0), 'win', 'Bruno', id0);
  assert.ok(a && a.includes('Bruno') && !a.includes('{rival}'));
  assert.equal(R.phrase(withId(base, id0), 'win', 'Bruno', id0), a, 'repintar no cambia la frase');
  seen.add(a);
  for (let g = 1; g < P.win_racha.length; g++) { const id = okId(R, 'win_racha', g); seen.add(R.phrase(withId(base, id), 'win', 'Bruno', id)); }
  assert.equal(seen.size, P.win_racha.length, 'salen todas antes de repetir');
  assert.equal(R.phrase(serie(['draw', 'win']), 'draw', 'Bruno', 'g2'), '');
  const id1 = okId(R, 'win_racha', 7);
  assert.ok(!R.phrase(withId(base, id1), 'win', '', id1).includes('{rival}'), 'sin nombre no queda el marcador');
});

test('probabilidades: la tabla pedida, y el sorteo por identificador es determinista, con valores en [0,1) y bien repartido', () => {
  const { window: { SEQRivalry: R } } = env();
  assert.deepEqual({ ...R.PROB }, { win_remontada: 1, loss_racha: 1, win_racha: 0.75, loss_cae_racha: 0.75, win_igualados: 0.75, win_revancha: 0.5, loss_igualados: 0.5 });
  const N = 20000, ids = {
    secuenciales: (i) => 'TEST' + String(i).padStart(6, '0'),
    ulid: (i) => '01JB' + (i * 7919).toString(36).toUpperCase().padStart(6, '0'),   // con el prefijo de tiempo común que tienen los del servidor
    cortos: (i) => String(i)
  };
  for (const [nombre, mk] of Object.entries(ids)) {
    for (const [key, p] of Object.entries(R.PROB)) {
      let ok = 0, min = 1, max = 0;
      for (let i = 0; i < N; i++) { const u = R.unit(mk(i), key); assert.ok(u >= 0 && u < 1); min = Math.min(min, u); max = Math.max(max, u); if (R.accepts(key, mk(i))) ok++; }
      if (p === 1) assert.equal(ok, N, `${key}: siempre (${nombre})`);
      else assert.ok(Math.abs(ok / N - p) < 0.015, `${key}/${nombre}: ${ok / N} ≈ ${p}`);
      assert.ok(min < 0.01 && max > 0.99, `${key}/${nombre}: usa todo el rango`);
    }
  }
  // Determinismo: mismo id y situación → mismo número; otra situación → otro número (decisiones independientes entre grupos).
  assert.equal(R.unit('ABC0000001', 'win_racha'), R.unit('ABC0000001', 'win_racha'));
  assert.notEqual(R.unit('ABC0000001', 'win_racha'), R.unit('ABC0000001', 'win_revancha'));
  // Sin correlación visible entre ids vecinos: la proporción de aceptados tras un aceptado sigue siendo ≈ p.
  let after = 0, hits = 0; for (let i = 0; i < N - 1; i++) if (R.accepts('win_revancha', ids.secuenciales(i))) { after++; if (R.accepts('win_revancha', ids.secuenciales(i + 1))) hits++; }
  assert.ok(Math.abs(hits / after - 0.5) < 0.03, 'vecinos independientes');
  assert.equal(R.accepts('no_existe', 'X'), false);
});

test('rechazada: no se toca la bolsa y siguen las frases de siempre; aceptada: una frase de su grupo, y reabrir no gasta otra', () => {
  const ctx = env(), R = ctx.window.SEQRivalry, D = ctx.window.SEQDuelPhrases, P = ctx.window.SEQRivalryPhrases.PHRASES;
  const base = serie(['win', 'loss']), ko = koId(R, 'win_revancha'), okk = okId(R, 'win_revancha');
  assert.equal(R.context(withId(base, ko), 'win', ko), 'win_revancha');
  assert.equal(R.phrase(withId(base, ko), 'win', 'Bruno', ko), '', 'rechazada → sin frase de rivalidad');
  assert.equal(ctx.store.phraseBags, undefined, 'la bolsa de rivalidad no se ha tocado');
  assert.equal(ctx.store.duelPhraseByGame, undefined, 'ni se ha asignado nada a la partida');
  const normal = D.pickRotating('win', 2, ko, 'Bruno');           // la lógica de siempre sigue funcionando y asigna su frase
  assert.ok(normal && !P.win_revancha.some((t) => normal.includes(t.replace('{rival}', 'Bruno'))));
  assert.equal(R.phrase(withId(base, ko), 'win', 'Bruno', ko), '', 'reabrir: sigue sin frase de rivalidad (ya tiene la de siempre)');
  const t = R.phrase(withId(base, okk), 'win', 'Bruno', okk);
  assert.ok(P.win_revancha.map((x) => x.replace(/\{rival\}/g, 'Bruno')).includes(t));
  const bag = JSON.stringify(ctx.store.phraseBags);
  assert.equal(R.phrase(withId(base, okk), 'win', 'Bruno', okk), t);
  assert.equal(JSON.stringify(ctx.store.phraseBags), bag, 'reabrir no gasta otra frase de la bolsa');
});

test('prioridad: se elige UNA situación y solo se sortea esa (remontada, al 100 %, nunca la pisa la revancha del 50 %)', () => {
  const ctx = env(), R = ctx.window.SEQRivalry, P = ctx.window.SEQRivalryPhrases.PHRASES;
  const base = serie(['win', 'loss', 'loss']);
  for (let i = 0; i < 200; i++) {
    const id = 'PRIO' + String(i).padStart(6, '0'), t = R.phrase(withId(base, id), 'win', 'Bruno', id);
    assert.ok(P.win_remontada.map((x) => x.replace(/\{rival\}/g, 'Bruno')).includes(t), id);
  }
  const base2 = serie(['loss', 'loss', 'loss']);   // racha de derrotas (100 %) aunque la serie también pudiera estar igualada
  for (let i = 0; i < 100; i++) { const id = 'PRIX' + String(i).padStart(6, '0'); assert.ok(R.phrase(withId(base2, id), 'loss', 'Bruno', id)); }
});

test('partidas antiguas: la frase ya asignada se conserva, sea de siempre, con nombre o de rivalidad', () => {
  const ctx = env(), R = ctx.window.SEQRivalry, P = ctx.window.SEQRivalryPhrases.PHRASES;
  const base = serie(['win', 'win', 'win']), id = okId(R, 'win_racha', 3), ko = koId(R, 'win_racha', 3);
  ctx.store.duelPhraseByGame = { [id]: { k: 'victoria_clara', i: 2 }, [ko]: { k: 'named', t: 'Frase con nombre.' } };
  assert.equal(R.phrase(withId(base, id), 'win', 'Bruno', id), '', 'tenía una de siempre: aunque hoy saldría la de rivalidad, no se cambia');
  assert.equal(R.phrase(withId(base, ko), 'win', 'Bruno', ko), '', 'tenía una con nombre: igual');
  const other = okId(R, 'win_racha', 5);
  ctx.store.duelPhraseByGame[other] = { k: 'rival_win_racha', i: 4 };
  assert.equal(R.phrase(withId(base, other), 'win', 'Bruno', other), P.win_racha[4].replace(/\{rival\}/g, 'Bruno'), 'ya tenía la de rivalidad: la misma, sin volver a sortear');
});

test('simulación reproducible: 16 duelos alternos (historial previo V,D,V,D) → 16 oportunidades de C, 8 aceptadas con estos ids', () => {
  const ctx = env(), R = ctx.window.SEQRivalry, DAY = 86400000, t0 = 1_800_000_000_000;
  const hist = ['win', 'loss', 'win', 'loss'].map((r, i) => ({ id: 'PREV00000' + i, resultado: r, fecha: t0 - (4 - i) * DAY }));
  const opp = {}, out = [];
  for (let n = 0; n < 16; n++) {
    const id = 'SIMDUEL' + String(n + 1).padStart(3, '0'), res = n % 2 === 0 ? 'win' : 'loss';
    hist.push({ id, resultado: res, fecha: t0 + n * DAY });
    const rec = hist.slice().reverse();
    const s = { partidas: rec.length, victorias: rec.filter((x) => x.resultado === 'win').length, derrotas: rec.filter((x) => x.resultado === 'loss').length, empates: 0, recientes: rec.slice(0, 8) };
    const key = R.context(s, res, id);
    opp[key] = (opp[key] || 0) + 1;
    out.push(R.phrase(s, res, 'Bruno', id) ? 'C' : 'A');
  }
  assert.deepEqual(opp, { win_revancha: 8, loss_igualados: 8 });       // cada victoria activa revancha y cada derrota deja la serie igualada
  assert.equal(out.join(''), 'CACCAAACCCACACAA');                       // 8 de C y 8 de A/B (esperado en promedio: 8 y 8)
  // Y la media sobre muchos «meses» con otros ids converge a las 8 esperadas.
  let tot = 0; const M = 2000;
  for (let m = 0; m < M; m++) for (let n = 0; n < 16; n++) if (R.accepts(n % 2 === 0 ? 'win_revancha' : 'loss_igualados', 'M' + m + 'D' + n)) tot++;
  assert.ok(Math.abs(tot / M - 8) < 0.3, 'media ' + tot / M);
});
