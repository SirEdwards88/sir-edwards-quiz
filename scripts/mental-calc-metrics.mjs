// Métricas de depuración del generador de Cálculo Mental: node scripts/mental-calc-metrics.mjs [racha=0,5,10,15,20,30] [n=10000]
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = vm.runInNewContext(fs.readFileSync(path.join(root, 'src/utils/mental-calc.js'), 'utf8') + '\nSEQMentalCalc', {});
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const streaks = (process.argv[2] || '0,5,10,15,20,30').split(',').map(Number), N = Number(process.argv[3] || 10000);
function carries(a, b) { let n = 0, c = 0; while (a > 0 || b > 0 || c) { const s = a % 10 + b % 10 + c; c = s >= 10 ? 1 : 0; n += c; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
function borrows(a, b) { let n = 0, br = 0; while (a > 0 || b > 0) { const da = a % 10, db = b % 10 + br; br = da < db ? 1 : 0; n += br; a = Math.floor(a / 10); b = Math.floor(b / 10); } return n; }
const mean = (x) => x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0;
for (const st of streaks) {
  const s = M.createSession(mulberry32(st + 1)), ops = [];
  for (let i = 0; i < N; i++) ops.push(M.nextOperation(s, { streak: st }));
  const byT = {}, fam = {}, hist = {}, seen = new Set(); let rep = 0, errT = [];
  ops.forEach((o) => { (byT[o.sign] = byT[o.sign] || []).push(o); fam[o.sign + ':' + o.family] = (fam[o.sign + ':' + o.family] || 0) + 1; const b = Math.floor(o.difficulty / 10) * 10; hist[b] = (hist[b] || 0) + 1; if (seen.has(o.text)) rep++; seen.add(o.text); errT.push(Math.abs(o.difficulty - o.target)); });
  console.log(`\n=== racha ${st} · ${N} operaciones ===`);
  console.log('dificultad media', mean(ops.map((o) => o.difficulty)).toFixed(1), '· error medio |real−pedida|', mean(errT).toFixed(2));
  console.log('por tipo (nº · dif. media · operando máx medio):', Object.keys(byT).map((t) => `${t} ${byT[t].length} · ${mean(byT[t].map((o) => o.difficulty)).toFixed(1)} · ${mean(byT[t].map((o) => Math.max(o.a, o.b))).toFixed(0)}`).join('   '));
  console.log('llevadas medias (+)', mean((byT['+'] || []).map((o) => carries(o.a, o.b))).toFixed(2), '· préstamos medios (−)', mean((byT['-'] || []).map((o) => borrows(o.a, o.b))).toFixed(2));
  console.log('triviales (dif<20)', (100 * ops.filter((o) => o.difficulty < 20).length / N).toFixed(1) + '%', '· repetidas (texto ya visto)', (100 * rep / N).toFixed(1) + '%');
  console.log('distribución de dificultades', Object.keys(hist).sort((a, b) => a - b).map((k) => `${k}s:${(100 * hist[k] / N).toFixed(0)}%`).join(' '));
  console.log('familias', Object.keys(fam).sort().map((k) => `${k}:${(100 * fam[k] / N).toFixed(1)}%`).join(' '));
}
