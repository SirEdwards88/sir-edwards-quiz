// Extraido literalmente de index.html (Fase 3, Lote 3C - defaults,
// migracion y saneamiento del Store). Sin modificar ni una linea
// respecto al original. Cargado como script clasico (no ES Module)
// para conservar el scope global compartido con el script principal.
//
// AVISO DE MUTABILIDAD (no son funciones puras al 100%):
//   - sanitizeStore(s) MUTA su argumento "s" y devuelve la misma
//     referencia. Nunca se llama en la app real con el store global
//     como argumento (solo con el objeto recien creado dentro de
//     migrateStore), pero si se llamara directamente sobre el store
//     global, lo mutaria en el sitio.
//   - migrateStore(rawData) NO muta el objeto de nivel superior que
//     recibe, pero SI comparte por referencia (sin clonar) los
//     objetos/arrays anidados que vengan en la entrada (p. ej.
//     duelStats), por ser un shallow merge. Ver CHANGELOG_FASE3_LOTE3C.md.
//
// DEPENDENCIAS COMPARTIDAS QUE NO SE MUEVEN EN ESTE LOTE (siguen
// definidas en index.html, disponibles por el scope global compartido):
//   - UNLOCKABLE_MODES (usada por migrateStore para poblar
//     notifiedModeUnlocks; no es exclusiva del Store, tambien la usa
//     el flujo de desbloqueo de modos)
//   - getFragmentCount, getLevelData (usadas transitivamente via
//     UNLOCKABLE_MODES[].check(); compartidas con el resto de la UI)

const SAVE_VERSION = 3;;

function getDefaultStore() {
  return {
    xp: 0, unlockedMedals: [], totalCorrect: 0, totalWrong: 0, gamesPlayed: 0, standardGamesCount: 0, errorsCleaned: 0,
    failedQuestions: [],
    questionStreaks: {},
    // Estadísticas individuales por pregunta: permiten calcular rendimiento
    // real por categoría y dificultad sin perder información al dominarla.
    questionStats: {},
    // Preguntas que el jugador ya ha visto al menos una vez.
    seenQuestionIds: [],
    // Las tres dificultades de Supervivencia siempre duran 50 preguntas
    // (lo que cambia es la proporción de dificultades, no la longitud), así
    // que el progreso se guarda por tramo elegido, no por longitud de partida.
    survivalAmebaWins: 0, survivalHumanoWins: 0, survivalDerrameWins: 0,
    // Muerte Súbita ya no tiene 3 variantes de dificultad: es un único modo
    // de 30 preguntas con dificultad progresiva, así que un único contador basta.
    suddenWins: 0,
    maxTimeTrialScore: 0,
    lastGameAccuracy: 0,
    gameHistory: [],
    bestStreak: 0,
    // Racha máxima conseguida específicamente en Modo Estándar (los logros
    // "Primera Chispa" y "Corriente Imparable" solo deben contar rachas de
    // ese modo, no de otros).
    standardBestStreak: 0,
    // Racha máxima conseguida específicamente en Contrarreloj (logro "Sin Frenos").
    timeTrialBestStreak: 0,
    // Racha máxima de aciertos consecutivos en preguntas de dificultad
    // "dificil" (logro "Ojo de Halcón", ya no ligado a un modo concreto).
    hardBestStreak: 0,
    // Racha máxima de aciertos consecutivos sin repetir la categoría de la
    // pregunta inmediatamente anterior (logro "Sin Preferencias").
    noRepeatCatBestStreak: 0,
    // Se pone a true la primera vez que se completa una partida entre las
    // 00:00 y las 04:00 (logro "Noctámbulo").
    hasCompletedNightGame: false,
    // IDs de las preguntas mostradas recientemente. Se usan para evitar
    // repeticiones entre partidas cuando todavía hay suficientes preguntas nuevas.
    recentQuestionIds: [],
    currentStreak: 0,
    theme: 'light',
    sound: 'on',
    notifiedModeUnlocks: [],
    bestMentalCalcScore: 0,
    mentalCalcBestStreak: 0,
    bestMentalCalcCorrect: 0,
    mentalCalcTotalCorrect: 0,
    bestLucidezScore: 0,
    bestLucidezStreak: 0,
    lucidezPlayed: false,
    // Banderas/contadores para los 3 logros secretos exclusivos de Lucidez
    // Mental (no forman parte de los Fragmentos de Mente: ese modo ya está
    // desbloqueado cuando se consiguen, así que no tendría sentido que
    // dieran fragmentos).
    lucidezEverWon: false,
    lucidezTotalCorrect: 0,
    lucidezEverPerfect: false,
    // ⚔️ Duelo: reto asíncrono con semilla. Las estadísticas (duelStats)
    // solo se actualizan al UNIRSE a un reto (momento en que se conocen
    // ambos marcadores); crear un reto solo archiva tu propia partida en
    // duelHistory a la espera de que alguien la supere.
    duelStats: { played: 0, wins: 0, losses: 0, draws: 0, currentWinStreak: 0, bestWinStreak: 0, wonByOnePoint: false, wonByTenPlus: false },
    duelHistory: [],
    // ⚔️ Duelo: códigos de reto ya jugados como retador (joiner), para que
    // repetir un mismo reto no vuelva a contar en duelStats/logros — solo
    // la primera vez que se juega un código da estadísticas. Independiente
    // de duelHistory (que se recorta a 30 entradas) para no perder el
    // rastro de un código antiguo aunque ya no aparezca en el historial.
    duelPlayedCodes: [],
    saveVersion: SAVE_VERSION
  };
};

const SAVE_MIGRATIONS = {
  // El banco de preguntas se sustituyó por completo (nuevo banco de 300
  // preguntas): los "n" ya no corresponden a las mismas preguntas de antes,
  // así que cualquier estadística guardada por ID de pregunta quedaría
  // asociada a una pregunta distinta a la que se registró originalmente.
  // Se limpian solo esos campos (dominio por pregunta, rachas por pregunta,
  // preguntas vistas/recientes/falladas); XP, logros, rachas generales y
  // el resto del progreso del jugador no se tocan.
  2: (s) => {
    s.questionStats = {};
    s.questionStreaks = {};
    s.seenQuestionIds = [];
    s.recentQuestionIds = [];
    s.failedQuestions = [];
    return s;
  },
  // La versión 3 introduce la bolsa propia de Lucidez y endurece la lógica
  // de selección por subconjuntos. Las bolsas anteriores pueden pertenecer a
  // una composición distinta del banco, así que se reinician para evitar
  // arrastrar estados incompatibles. No se toca ningún otro progreso.
  3: (s) => {
    s.questionBags = {};
    s.lastQuestionInBag = {};
    return s;
  }
};;

function migrateStore(rawData) {
  const data = rawData && typeof rawData === 'object' ? rawData : {};
  const fromVersion = typeof data.saveVersion === 'number' ? data.saveVersion : 1;
  const hadNotifiedModeUnlocks = Array.isArray(data.notifiedModeUnlocks);

  // 1) Compatibilidad hacia adelante automática: cualquier campo que exista
  //    en getDefaultStore() pero no en el backup se rellena con su valor
  //    inicial, sin tocar los campos que sí trae el backup.
  const merged = { ...getDefaultStore(), ...data };

  if (!hadNotifiedModeUnlocks) {
    // Los modos ya desbloqueados antes de que existiera este aviso no deben
    // notificarse retroactivamente al jugador.
    merged.notifiedModeUnlocks = UNLOCKABLE_MODES.filter(m => m.check(merged)).map(m => m.id);
  }

  // El tema "Sistema" se retiró de Ajustes: si un backup trae ese valor
  // (de una versión de prueba anterior), lo convertimos a Claro para no
  // dejar un tema inválido que ningún botón de la interfaz representa.
  if (merged.theme !== 'light' && merged.theme !== 'dark') {
    merged.theme = 'light';
  }

  // 2) Migraciones de estructura, si las hay, en orden hasta la versión actual.
  for (let v = fromVersion + 1; v <= SAVE_VERSION; v++) {
    if (typeof SAVE_MIGRATIONS[v] === 'function') SAVE_MIGRATIONS[v](merged);
  }
  merged.saveVersion = SAVE_VERSION;
  return sanitizeStore(merged);
};

function sanitizeStore(s) {
  const asArray = (v) => Array.isArray(v) ? v : [];
  const asPlainObject = (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
  const asFiniteNonNegNumber = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const asBoolean = (v) => v === true;

  s.failedQuestions = asArray(s.failedQuestions);
  s.unlockedMedals = asArray(s.unlockedMedals);
  s.gameHistory = asArray(s.gameHistory).filter(item => item && typeof item === 'object');
  s.seenQuestionIds = asArray(s.seenQuestionIds);
  s.recentQuestionIds = asArray(s.recentQuestionIds);
  s.notifiedModeUnlocks = asArray(s.notifiedModeUnlocks);

  s.questionStats = asPlainObject(s.questionStats);
  s.questionStreaks = asPlainObject(s.questionStreaks);
  s.questionBags = asPlainObject(s.questionBags);
  s.lastQuestionInBag = asPlainObject(s.lastQuestionInBag);

  s.xp = asFiniteNonNegNumber(s.xp);
  s.gamesPlayed = asFiniteNonNegNumber(s.gamesPlayed);
  s.totalCorrect = asFiniteNonNegNumber(s.totalCorrect);
  s.totalWrong = asFiniteNonNegNumber(s.totalWrong);
  s.bestStreak = asFiniteNonNegNumber(s.bestStreak);
  s.standardBestStreak = asFiniteNonNegNumber(s.standardBestStreak);
  s.currentStreak = asFiniteNonNegNumber(s.currentStreak);
  // Resto de contadores/puntuaciones numéricos del store: mismo blindaje que
  // los de arriba (un backup editado a mano podría traer texto, negativos o
  // directamente basura en cualquiera de ellos).
  s.standardGamesCount = asFiniteNonNegNumber(s.standardGamesCount);
  s.errorsCleaned = asFiniteNonNegNumber(s.errorsCleaned);
  s.survivalAmebaWins = asFiniteNonNegNumber(s.survivalAmebaWins);
  s.survivalHumanoWins = asFiniteNonNegNumber(s.survivalHumanoWins);
  s.survivalDerrameWins = asFiniteNonNegNumber(s.survivalDerrameWins);
  s.suddenWins = asFiniteNonNegNumber(s.suddenWins);
  s.maxTimeTrialScore = asFiniteNonNegNumber(s.maxTimeTrialScore);
  s.lastGameAccuracy = asFiniteNonNegNumber(s.lastGameAccuracy);
  s.timeTrialBestStreak = asFiniteNonNegNumber(s.timeTrialBestStreak);
  s.hardBestStreak = asFiniteNonNegNumber(s.hardBestStreak);
  s.noRepeatCatBestStreak = asFiniteNonNegNumber(s.noRepeatCatBestStreak);
  s.bestMentalCalcScore = asFiniteNonNegNumber(s.bestMentalCalcScore);
  s.mentalCalcBestStreak = asFiniteNonNegNumber(s.mentalCalcBestStreak);
  s.bestMentalCalcCorrect = asFiniteNonNegNumber(s.bestMentalCalcCorrect);
  s.mentalCalcTotalCorrect = asFiniteNonNegNumber(s.mentalCalcTotalCorrect);
  s.bestLucidezScore = asFiniteNonNegNumber(s.bestLucidezScore);
  s.bestLucidezStreak = asFiniteNonNegNumber(s.bestLucidezStreak);

  // Banderas booleanas: con `!!valor`, cualquier string no vacío (incluido
  // literalmente "false") se evalúa como true. Un backup editado a mano con
  // `"lucidezEverPerfect": "false"` desbloquearía el logro secreto sin
  // haberlo conseguido. Exigimos el booleano real `true`; cualquier otra
  // cosa (incluida esa string) se trata como no conseguido.
  s.hasCompletedNightGame = asBoolean(s.hasCompletedNightGame);
  s.lucidezPlayed = asBoolean(s.lucidezPlayed);
  s.lucidezEverWon = asBoolean(s.lucidezEverWon);
  s.lucidezTotalCorrect = asFiniteNonNegNumber(s.lucidezTotalCorrect);
  s.lucidezEverPerfect = asBoolean(s.lucidezEverPerfect);

  s.duelStats = asPlainObject(s.duelStats);
  s.duelStats.played = asFiniteNonNegNumber(s.duelStats.played);
  s.duelStats.wins = asFiniteNonNegNumber(s.duelStats.wins);
  s.duelStats.losses = asFiniteNonNegNumber(s.duelStats.losses);
  s.duelStats.draws = asFiniteNonNegNumber(s.duelStats.draws);
  s.duelStats.currentWinStreak = asFiniteNonNegNumber(s.duelStats.currentWinStreak);
  s.duelStats.bestWinStreak = asFiniteNonNegNumber(s.duelStats.bestWinStreak);
  s.duelStats.wonByOnePoint = asBoolean(s.duelStats.wonByOnePoint);
  s.duelStats.wonByTenPlus = asBoolean(s.duelStats.wonByTenPlus);
  s.duelHistory = asArray(s.duelHistory).filter(item => item && typeof item === 'object');
  s.duelPlayedCodes = asArray(s.duelPlayedCodes).filter(c => typeof c === 'string' && c);

  if (s.theme !== 'light' && s.theme !== 'dark') s.theme = 'light';
  if (s.sound !== 'on' && s.sound !== 'off') s.sound = 'on';

  return s;
};

