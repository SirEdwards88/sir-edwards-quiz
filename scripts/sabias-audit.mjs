#!/usr/bin/env node
// Auditoría heurística de los «¿Sabías que…?» de src/data/questions.js (solo lectura).
//
// Uso:  node scripts/sabias-audit.mjs [--json salida.json] [--quiet]
//
// Carga QUESTIONS y TEST_QUESTIONS en un contexto aislado (no modifica nada) y marca como
// sospechosos los textos que probablemente no aportan un dato nuevo. Es una criba: el juicio
// final lo hace la revisión manual (docs/sabias-revision.md). Un aviso no significa que el texto
// sea malo, y la ausencia de avisos no significa que sea bueno.
//
// Avisos:
//   eco-respuesta      el texto repite la respuesta (o casi todas sus palabras significativas)
//   eco-pregunta       la mayoría de sus palabras ya están en la pregunta
//   poca-novedad       menos de la mitad de sus palabras son nuevas respecto a pregunta + respuesta
//   corto              menos de MIN caracteres
//   largo              más de MAX caracteres (los tests exigen <= 140)
//   sin-dato-nuevo     ninguna cifra ni nombre propio que no esté ya en pregunta o respuesta
//   parecido           casi idéntico a otro «Sabías que» (Jaccard de palabras)
//   otra-respuesta     contiene la respuesta de OTRA pregunta del banco (posible destripe)
//   inestable          lenguaje o cifras que caducan (récords, «actualmente», años recientes, población…)
//   comillas-rectas    usa " en vez de «»
//   emoji              contiene emoji
//   verificar          lleva la marca «verificar»

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN = 55;
const MAX = 140;
const SIM = 0.35; // umbral de parecido entre dos textos (Jaccard de raíces)

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const quiet = args.includes('--quiet');

// ---------- carga del banco ----------
const ctx = {};
vm.createContext(ctx);
vm.runInContext(
  fs.readFileSync(path.join(ROOT, 'src/data/questions.js'), 'utf8') + ';this.Q=QUESTIONS;this.T=TEST_QUESTIONS;',
  ctx
);
const { Q, T } = ctx;
const qByN = new Map(Q.map((x) => [x.n, x]));

// Un registro por pregunta (n). TEST_QUESTIONS trae las 650; QUESTIONS aporta alias y par.
const items = T.map((t) => {
  const q = qByN.get(t.n);
  return {
    n: t.n,
    cat: t.cat,
    dif: t.dif,
    q: t.q,
    a: t.a,
    options: t.options || [],
    alias: (q && q.alias) || [],
    par: (q && q.par) || [],
    sabias: t.sabias || '',
    enQ: !!q,
    enT: true
  };
}).sort((x, y) => x.n - y.n);

// ---------- utilidades de texto ----------
const STOP = new Set(('el la los las un una unos unas de del al en y e o u que se su sus por con para como mas es fue era ' +
  'son ser sido ha han lo le les me mi no si ya muy sin sobre entre tras desde hasta este esta estos estas ese esa eso esto ' +
  'aun pero porque cuando donde cual cuales quien quienes cuyo cuya hay hacia segun asi tambien solo otro otra otros otras ' +
  'mismo misma cada todo toda todos todas tiene tienen tuvo habia fueron fue siendo bajo ante dos tres uno').split(' '));

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[«»"'“”‘’()\[\]¿?¡!.,;:—–\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
const stem = (t) => (/^\d+$/.test(t) ? t : t.length > 5 ? t.slice(0, 5) : t);
const stems = (s) => norm(s).split(' ').filter((t) => t && !STOP.has(t) && (t.length >= 3 || /^\d+$/.test(t))).map(stem);
const set = (a) => new Set(a);
const inter = (a, b) => { let c = 0; for (const x of a) if (b.has(x)) c++; return c; };
const hasWord = (hay, needle) => (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');

// Números y nombres propios (que no abren frase) del texto original
function datos(s) {
  const out = new Set();
  for (const m of s.match(/\d[\d.,]*/g) || []) out.add(m.replace(/[.,]$/, ''));
  const palabras = s.split(/(\s+)/);
  let inicio = true;
  for (const w of palabras) {
    if (/^\s+$/.test(w) || !w) continue;
    const limpia = w.replace(/^[«"“(¿¡]+/, '');
    if (!inicio && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñü]/.test(limpia)) out.add(stem(norm(limpia)));
    inicio = /[.!?»]$/.test(w) && !/\b(a|d|n|s)\.$/.test(w);
  }
  return out;
}

// ---------- análisis por registro ----------
const INESTABLE = /actualmente|hoy en d[ií]a|a d[ií]a de hoy|en la actualidad|hasta la fecha|\br[eé]cord\b|\bactual\b|recientemente|[uú]ltimo (campe|ganad|premio)|\b20(1[5-9]|2\d)\b|habitantes|poblaci[oó]n|millones de (personas|usuarios|espectadores|seguidores|ventas)|seguidores|suscriptores/i;

for (const it of items) {
  it.flags = [];
  it.det = {};
  if (!it.sabias) { it.flags.push('sin-sabias'); continue; }
  const s = it.sabias;
  const S = set(stems(s));
  const known = set([...stems(it.q), ...stems(it.a), ...it.alias.flatMap(stems)]);
  const qSt = set(stems(it.q));
  const aSt = set(stems(it.a));

  // eco de la respuesta
  const aCover = aSt.size ? inter(aSt, S) / aSt.size : 0;
  if ((norm(it.a).length >= 4 && hasWord(s, it.a)) || (aSt.size >= 2 && aCover >= 0.75)) {
    it.flags.push('eco-respuesta');
  } else if (it.alias.some((al) => norm(al).length >= 5 && hasWord(s, al))) {
    it.flags.push('eco-respuesta');
  }
  // eco de la pregunta y novedad
  const nS = Math.max(S.size, 1);
  const enPregunta = inter(S, qSt) / nS;
  const novedad = 1 - inter(S, known) / nS;
  it.det.enPregunta = +enPregunta.toFixed(2);
  it.det.novedad = +novedad.toFixed(2);
  if (enPregunta >= 0.5) it.flags.push('eco-pregunta');
  if (novedad < 0.5) it.flags.push('poca-novedad');
  // longitud
  if (s.length < MIN) it.flags.push('corto');
  if (s.length > MAX) it.flags.push('largo');
  // dato nuevo (cifra o nombre propio ausente de pregunta+respuesta)
  const dq = datos(it.q + ' ' + it.a + ' ' + it.alias.join(' '));
  const ds = datos(s);
  const nuevos = [...ds].filter((d) => !dq.has(d) && !known.has(d));
  it.det.datosNuevos = nuevos;
  if (!nuevos.length) it.flags.push('sin-dato-nuevo');
  // estabilidad, formato
  const mi = s.match(INESTABLE);
  if (mi) { it.flags.push('inestable'); it.det.inestable = mi[0]; }
  if (/"|(^|[^\p{L}])'|'([^\p{L}]|$)/u.test(s)) it.flags.push('comillas-rectas');
  if (/\p{Extended_Pictographic}/u.test(s)) it.flags.push('emoji');
  if (/verificar/i.test(s)) it.flags.push('verificar');
}

// ---------- parecidos entre sí ----------
const conSab = items.filter((x) => x.sabias);
const sets = new Map(conSab.map((x) => [x.n, set(stems(x.sabias))]));
const parecidos = [];
for (let i = 0; i < conSab.length; i++) {
  for (let j = i + 1; j < conSab.length; j++) {
    const A = sets.get(conSab[i].n), B = sets.get(conSab[j].n);
    if (A.size < 4 || B.size < 4) continue;
    const jac = inter(A, B) / (A.size + B.size - inter(A, B));
    if (jac >= SIM) parecidos.push([conSab[i].n, conSab[j].n, +jac.toFixed(2)]);
  }
}
for (const [x, y, jac] of parecidos) {
  for (const n of [x, y]) {
    const it = items.find((k) => k.n === n);
    it.flags.push('parecido');
    (it.det.parecidoCon ||= []).push(n === x ? y : x);
  }
}

// ---------- ¿contiene la respuesta de otra pregunta? ----------
// Agujas: respuesta completa de cada pregunta (>= 5 letras, o un año de 4 cifras). Se ignora la propia.
const agujas = items.map((x) => ({ n: x.n, a: x.a, na: norm(x.a), st: set(stems(x.q)) }))
  .filter((x) => (x.na.length >= 5 && !/^\d+$/.test(x.na)) || /^\d{4}$/.test(x.na));
for (const it of conSab) {
  for (const g of agujas) {
    if (g.n === it.n) continue;
    if (!hasWord(it.sabias, g.a)) continue;
    // relación con el tema de la otra pregunta: palabras de su enunciado presentes aquí
    const S = sets.get(it.n);
    const solape = g.st.size ? inter(g.st, S) / g.st.size : 0;
    const esPar = it.par.includes(g.n) || (items.find((k) => k.n === g.n).par || []).includes(it.n);
    (it.det.otraRespuesta ||= []).push({ n: g.n, a: g.a, solape: +solape.toFixed(2), par: esPar });
  }
  // Se marca solo si hay indicio real de destripe: pareja declarada o solape temático
  const fuertes = (it.det.otraRespuesta || []).filter((o) => o.par || o.solape >= 0.2);
  if (fuertes.length) it.flags.push('otra-respuesta');
}

// ---------- arranques repetidos ----------
const primeras = (n) => conSab.map((x) => norm(x.sabias).split(' ').slice(0, n).join(' '));
const cuenta = (arr) => arr.reduce((m, k) => ((m[k] = (m[k] || 0) + 1), m), {});
const top = (o, k) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k);
const arranque1 = top(cuenta(primeras(1)), 12);
const arranque2 = top(cuenta(primeras(2)), 12);

// ---------- resumen ----------
const porAviso = {};
for (const it of items) for (const f of new Set(it.flags)) porAviso[f] = (porAviso[f] || 0) + 1;
const sospechosos = items.filter((x) => x.flags.some((f) => f !== 'sin-sabias'));
const limpios = conSab.length - sospechosos.length;

if (!quiet) {
  console.log('PREGUNTAS (n distintos): ' + items.length + '  | con «Sabías que»: ' + conSab.length + '  | sin: ' + (items.length - conSab.length));
  console.log('Entradas con sabias en los dos arrays: QUESTIONS ' + Q.filter((x) => x.sabias).length + ' + TEST_QUESTIONS ' + T.filter((x) => x.sabias).length +
    ' = ' + (Q.filter((x) => x.sabias).length + T.filter((x) => x.sabias).length) + ' (texto idéntico en ambos)');
  console.log('\nAvisos por tipo:');
  for (const [k, v] of Object.entries(porAviso).sort((a, b) => b[1] - a[1])) console.log('  ' + k.padEnd(18) + v);
  console.log('\nCon al menos un aviso: ' + sospechosos.length + '  | sin ningún aviso: ' + limpios);
  console.log('\nArranques más repetidos (1 palabra): ' + arranque1.map(([k, v]) => k + '×' + v).join(', '));
  console.log('Arranques más repetidos (2 palabras): ' + arranque2.map(([k, v]) => k + '×' + v).join(', '));
  console.log('\nParejas muy parecidas (Jaccard >= ' + SIM + '): ' + parecidos.length);
  for (const [x, y, j] of parecidos.slice(0, 20)) console.log('  ' + x + ' ~ ' + y + '  ' + j);
}

if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify({ items, porAviso, arranque1, arranque2, parecidos }, null, 1));
  if (!quiet) console.log('\nDetalle escrito en ' + jsonOut);
}
