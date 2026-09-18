// Extraido literalmente de index.html (Fase 3, Lote 3B - nucleo
// algoritmico de Duelo: PRNG, codificacion/decodificacion del codigo
// de reto, y construccion determinista de colas). Sin modificar ni
// una linea respecto al original. Cargado como script clasico (no ES
// Module) para conservar el scope global compartido con el script
// principal.
//
// DEPENDENCIAS COMPARTIDAS QUE NO SE MUEVEN EN ESTE LOTE (siguen
// definidas en index.html, disponibles por el scope global compartido):
//   - arrangeStandardBlock (usada por buildDuelStandardQueue; tambien
//     la usa el modo Estandar normal, no es exclusiva de Duelo)
//   - generateMentalCalcOp (usada por buildDuelMentalCalcQueue; tambien
//     la usa el modo Calculo Mental normal)
//   - generateLucidezMentalOp (usada por buildDuelLucidezPools; tambien
//     la usa el modo Lucidez Mental normal)
//   - TEST_QUESTIONS, QUESTIONS, SURVIVAL_TIER_RATIOS, LUCIDEZ_RIDDLES
//     (datos, ya extraidos en la Fase 2)
//   - DUEL_MODE_IDS, DUEL_MAX_SCORE, DUEL_SCORE_DIGITS,
//     DUEL_CODE_ALPHABET, DUEL_QUESTIONS_COUNT, DUEL_MENTAL_CALC_QUEUE_SIZE
//     (constantes de configuracion de Duelo, protegidas desde la Fase 2)

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, rng) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildDuelQueue(seed, diffMode) {
  const rng = mulberry32(seed);
  if (diffMode === 'mixta') {
    const pools = {
      facil: TEST_QUESTIONS.filter(q => q.dif === 'facil'),
      medio: TEST_QUESTIONS.filter(q => q.dif === 'medio'),
      dificil: TEST_QUESTIONS.filter(q => q.dif === 'dificil'),
    };
    const facil = seededShuffle(pools.facil, rng).slice(0, 8);
    const medio = seededShuffle(pools.medio, rng).slice(0, 8);
    const dificil = seededShuffle(pools.dificil, rng).slice(0, 4);
    return seededShuffle([...facil, ...medio, ...dificil], rng);
  }
  const pool = TEST_QUESTIONS.filter(q => q.dif === diffMode);
  return seededShuffle(pool, rng).slice(0, DUEL_QUESTIONS_COUNT);
}

function buildDuelSurvivalQueue(seed, tier, count) {
  const rng = mulberry32(seed);
  const ratios = SURVIVAL_TIER_RATIOS[tier] || { facil: 1 / 3, medio: 1 / 3, dificil: 1 / 3 };
  const difs = ['facil', 'medio', 'dificil'].filter(d => ratios[d]);
  const pools = {
    facil: TEST_QUESTIONS.filter(q => q.dif === 'facil'),
    medio: TEST_QUESTIONS.filter(q => q.dif === 'medio'),
    dificil: TEST_QUESTIONS.filter(q => q.dif === 'dificil'),
  };
  const counts = {};
  let assigned = 0;
  difs.forEach((d, i) => {
    if (i === difs.length - 1) counts[d] = count - assigned;
    else { counts[d] = Math.round(count * ratios[d]); assigned += counts[d]; }
  });
  let queue = [];
  difs.forEach(d => { queue.push(...seededShuffle(pools[d], rng).slice(0, counts[d])); });
  return seededShuffle(queue, rng).slice(0, count);
}

function buildDuelSuddenDeathQueue(seed, count) {
  const rng = mulberry32(seed);
  const pools = {
    facil: TEST_QUESTIONS.filter(q => q.dif === 'facil'),
    medio: TEST_QUESTIONS.filter(q => q.dif === 'medio'),
    dificil: TEST_QUESTIONS.filter(q => q.dif === 'dificil'),
  };
  const blockSize = Math.floor(count / 3) || 1;
  const lastBlockSize = count - blockSize * 2;
  const queue = [];
  queue.push(...seededShuffle(pools.facil, rng).slice(0, blockSize));
  queue.push(...seededShuffle(pools.medio, rng).slice(0, blockSize));
  queue.push(...seededShuffle(pools.dificil, rng).slice(0, lastBlockSize));
  return queue.slice(0, count);
}

function buildDuelTimetrialQueue(seed) {
  const rng = mulberry32(seed);
  return seededShuffle(TEST_QUESTIONS, rng);
}

function buildDuelMentalCalcQueue(seed) {
  const rng = mulberry32(seed);
  const ops = [];
  for (let i = 0; i < DUEL_MENTAL_CALC_QUEUE_SIZE; i++) {
    const tier = i >= 15 ? 'hard' : i >= 5 ? 'medium' : 'easy';
    ops.push(generateMentalCalcOp(tier, rng));
  }
  return ops;
}

function buildDuelLucidezPools(seed) {
  const rng = mulberry32(seed);
  const poolMedioDificil = QUESTIONS.filter(q => q.dif === 'medio' || q.dif === 'dificil');
  const poolMedio = QUESTIONS.filter(q => q.dif === 'medio');

  // Fase I: 10 preguntas medio/difícil.
  const shuffledMD = seededShuffle(poolMedioDificil, rng);
  const phase1Queue = shuffledMD.slice(0, 10);
  const usedIds = new Set(phase1Queue.map(q => q.n));

  // Fase II: 5 preguntas medio (sin repetir las de Fase I) + 5 cálculos,
  // en orden barajado, igual que buildLucidezPhase2Queue.
  const remainingMedio = seededShuffle(poolMedio.filter(q => !usedIds.has(q.n)), rng);
  const phase2Questions = remainingMedio.slice(0, 5).map(q => ({ type: 'question', q }));
  phase2Questions.forEach(item => usedIds.add(item.q.n));
  const calcs = [0, 1, 2, 3, 4].map(i => {
    const tier = i % 2 === 0 ? 'medium' : 'hard';
    return { type: 'calc', ...generateLucidezMentalOp(tier, rng) };
  });
  const phase2Queue = seededShuffle(calcs.concat(phase2Questions), rng);

  // Fase III: 9 preguntas medio/difícil restantes (sin repetir Fase I ni II).
  const phase3Queue = shuffledMD.slice(10).filter(q => !usedIds.has(q.n)).slice(0, 9);
  phase3Queue.forEach(q => usedIds.add(q.n));

  const finalRiddle = LUCIDEZ_RIDDLES[Math.floor(rng() * LUCIDEZ_RIDDLES.length)];

  return { phase1Queue, phase2Queue, phase3Queue, finalRiddle };
}

function buildDuelStandardQueue(seed, count) {
  const rng = mulberry32(seed);
  const pools = {
    facil: TEST_QUESTIONS.filter(q => q.dif === 'facil'),
    medio: TEST_QUESTIONS.filter(q => q.dif === 'medio'),
    dificil: TEST_QUESTIONS.filter(q => q.dif === 'dificil'),
  };
  const numBlocks = Math.max(1, Math.round(count / 10));
  const pickedAll = {
    facil: seededShuffle(pools.facil, rng).slice(0, numBlocks * 4),
    medio: seededShuffle(pools.medio, rng).slice(0, numBlocks * 4),
    dificil: seededShuffle(pools.dificil, rng).slice(0, numBlocks * 2),
  };
  const baseShape = ['facil', 'facil', 'facil', 'facil', 'medio', 'medio', 'medio', 'medio', 'dificil', 'dificil'];
  const queue = [];
  for (let b = 0; b < numBlocks; b++) {
    let shape;
    do {
      shape = seededShuffle(baseShape, rng);
    } while ((shape[0] === 'dificil' && shape[1] === 'dificil') || (shape[8] === 'dificil' && shape[9] === 'dificil'));
    const picked = {
      facil: pickedAll.facil.splice(0, 4),
      medio: pickedAll.medio.splice(0, 4),
      dificil: pickedAll.dificil.splice(0, 2),
    };
    queue.push(...arrangeStandardBlock(shape, picked));
  }
  return queue.slice(0, count);
}

function duelToBase36(num, width) {
  return Math.max(0, Math.floor(num)).toString(36).padStart(width, '0');
}

function duelChecksum(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) sum = (sum * 31 + str.charCodeAt(i)) % 36;
  return DUEL_CODE_ALPHABET[sum];
}

function encodeDuelCode({ modeId, cfgIdx, score, seed }) {
  const modeIdx = Math.max(0, DUEL_MODE_IDS.indexOf(modeId));
  const core = duelToBase36(modeIdx, 1) + duelToBase36(cfgIdx || 0, 1) +
    duelToBase36(Math.min(score, DUEL_MAX_SCORE), DUEL_SCORE_DIGITS) + duelToBase36(seed, 6);
  const check = duelChecksum(core);
  const full = (core + check).toUpperCase();
  return `SRW-${full.slice(0, 5)}-${full.slice(5)}`;
}

function decodeDuelCode(rawCode) {
  if (!rawCode) return null;
  const cleaned = String(rawCode).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const full = cleaned.startsWith('SRW') ? cleaned.slice(3) : cleaned;
  if (full.length !== 11) return null;
  const core = full.slice(0, 10).toLowerCase();
  const check = full.slice(10).toLowerCase();
  if (duelChecksum(core) !== check) return null;
  const modeIdx = parseInt(core[0], 36);
  const cfgIdx = parseInt(core[1], 36);
  const score = parseInt(core.slice(2, 2 + DUEL_SCORE_DIGITS), 36);
  const seed = parseInt(core.slice(2 + DUEL_SCORE_DIGITS), 36);
  if (!(modeIdx >= 0 && modeIdx < DUEL_MODE_IDS.length)) return null;
  const modeId = DUEL_MODE_IDS[modeIdx];
  if (!(Number.isFinite(cfgIdx) && cfgIdx >= 0)) return null;
  if (!(Number.isFinite(score) && score >= 0 && score <= DUEL_MAX_SCORE)) return null;
  if (!(Number.isFinite(seed) && seed >= 0)) return null;
  return { modeId, cfgIdx, score, seed, code: `SRW-${full.slice(0, 5)}-${full.slice(5)}` };
}

