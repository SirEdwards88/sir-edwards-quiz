// v2.0 — lado cliente de la combinación de datos (src/utils/sync-merge.js): extraer del store, combinar y aplicar
// sin perder, reordenar ni duplicar nada de lo local.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, '..', 'src', 'utils', 'sync-merge.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(src + '\n;globalThis.M = SEQSyncMerge;', ctx);
const M = ctx.M;
const clone = (x) => JSON.parse(JSON.stringify(x));

const baseStore = () => ({
  xp: 100, gamesPlayed: 3, seenQuestionIds: [317, 235, 200, 285, 88], failedQuestions: [9, 4, 7], recentQuestionIds: [3, 2, 1],
  questionStats: { 5: { correct: 2, wrong: 1 } }, questionStreaks: { 5: 1 }, theme: 'dark', sound: 'on', suddenWins: 1,
  gameHistory: [
    { date: 'a', mode: 'Estándar', score: '3/20', percentage: 15 },
    { date: 'a', mode: 'Estándar', score: '3/20', percentage: 15 },
    { date: 'b', mode: 'Estándar', score: '2/20', percentage: 10 },
  ],
  duelStats: { played: 0, wins: 0, losses: 0, draws: 0, currentWinStreak: 0, bestWinStreak: 0, wonByOnePoint: false, wonByTenPlus: false, revengeWon: false, bestWinsVsRival: 0, rivals: {} },
  duelHistory: [], duelPlayedCodes: [],
});

test('extraer → aplicar sobre el MISMO store no cambia nada (ni orden, ni duplicados, ni campos)', () => {
  const s = baseStore();
  const before = clone(s);
  const doc = M.extractDoc(s, { t: { settings: 5, learning: 5 } });
  const changed = M.applyDoc(s, M.mergeDocs(M.extractDoc(s, { t: { settings: 5, learning: 5 } }), doc));
  assert.equal(changed, false);
  assert.deepEqual(s, before, 'el orden de seenQuestionIds/failedQuestions y el historial local se conservan tal cual');
});

test('aplicar datos remotos: solo se AÑADE lo que falta; lo local mantiene su orden', () => {
  const s = baseStore();
  const remote = { v: 1, f: { seenQuestionIds: [1, 88, 999], suddenWins: 5, gameHistory: [{ date: 'c', mode: 'Lucidez Mental', score: '20/30', percentage: 66, ts: 5000 }], questionStats: { 5: { correct: 1, wrong: 9 }, 6: { correct: 1, wrong: 0 } } }, g: {} };
  const changed = M.applyDoc(s, M.mergeDocs(M.extractDoc(s, {}), remote));
  assert.equal(changed, true);
  assert.deepEqual(clone(s.seenQuestionIds), [317, 235, 200, 285, 88, 1, 999], 'orden local + los nuevos al final');
  assert.equal(s.suddenWins, 5);
  assert.deepEqual(clone(s.questionStats['5']), { correct: 2, wrong: 9 });
  assert.deepEqual(clone(s.questionStats['6']), { correct: 1, wrong: 0 });
  assert.equal(s.gameHistory.length, 4);
  assert.equal(s.gameHistory[0].mode, 'Lucidez Mental', 'la partida más reciente (ts) va primero');
  assert.equal(s.gameHistory.filter((e) => e.score === '3/20').length, 2, 'las dos partidas locales idénticas siguen siendo dos');
});

test('los cambios locales hechos MIENTRAS volaba la petición no se pierden al aplicar la respuesta', () => {
  const s = baseStore();
  const sent = M.extractDoc(s, { t: { settings: 5, learning: 5 } });
  s.seenQuestionIds.push(4242); s.suddenWins = 9; s.theme = 'light';
  const server = M.mergeDocs(sent, { v: 1, f: { seenQuestionIds: [7] }, g: {} });
  const finalDoc = M.mergeDocs(M.extractDoc(s, { t: { settings: 99, learning: 5 } }), server);
  M.applyDoc(s, finalDoc);
  assert.ok(s.seenQuestionIds.includes(4242) && s.seenQuestionIds.includes(7));
  assert.equal(s.suddenWins, 9);
  assert.equal(s.theme, 'light', 'el ajuste cambiado durante el vuelo (t más reciente) gana');
});

test('ajustes y aprendizaje: gana el grupo más reciente; un dispositivo nuevo con valores por defecto no pisa nada', () => {
  const s = { theme: 'light', sound: 'on', failedQuestions: [], questionStreaks: {}, recentQuestionIds: [] };
  const remote = { v: 1, f: {}, g: { settings: { t: 50, v: { theme: 'dark', sound: 'off' } }, learning: { t: 50, v: { failedQuestions: [3, 1], questionStreaks: { 3: 0 }, recentQuestionIds: [1] } } } };
  M.applyDoc(s, M.mergeDocs(M.extractDoc(s, { t: { settings: 0, learning: 0 } }), remote));
  assert.equal(s.theme, 'dark'); assert.equal(s.sound, 'off');
  assert.deepEqual(clone(s.failedQuestions).sort(), [1, 3]);
});

test('la combinación nunca toca XP, partidas, aciertos, fallos ni logros (viajan por /progress/sync)', () => {
  const doc = M.extractDoc({ xp: 5, gamesPlayed: 5, totalCorrect: 5, totalWrong: 5, bestStreak: 5, unlockedMedals: ['x'], suddenWins: 2 }, {});
  ['xp', 'gamesPlayed', 'totalCorrect', 'totalWrong', 'bestStreak', 'unlockedMedals'].forEach((k) => assert.equal(k in doc.f, false, k));
  const s = { xp: 5, unlockedMedals: ['x'] };
  M.applyDoc(s, { v: 1, f: { xp: 999, unlockedMedals: ['y'], suddenWins: 1 }, g: {} });
  assert.deepEqual(clone(s), { xp: 5, unlockedMedals: ['x'], suddenWins: 1 });
});

test('el módulo del cliente y sync-merge.js del servidor coinciden (si el backend está al lado)', () => {
  const server = path.join(here, '..', '..', 'sir-edwards-quiz-backend-v1.5-dev', 'src', 'sync-merge.js');
  if (!fs.existsSync(server)) return;
  assert.equal(fs.readFileSync(server, 'utf8').replace(/\nexport default SEQSyncMerge;\n$/, '\n'), src);
});
