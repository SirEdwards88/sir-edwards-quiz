// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const ALL_MEDALS = [
  // RACHAS
  {id:'streak_5', title:'Primera Chispa', desc:'5 respuestas correctas consecutivas en Modo Estándar.', streak:5, check:s => (s.standardBestStreak || 0) >= 5},
  {id:'streak_10', title:'Corriente Imparable', desc:'10 respuestas correctas consecutivas en Modo Estándar.', streak:10, check:s => (s.standardBestStreak || 0) >= 10},

  {id:'streak_20', title:'Racha de Élite', desc:'20 respuestas correctas consecutivas en Modo Estándar.', streak:20, check:s => (s.standardBestStreak || 0) >= 20},
  {id:'streak_30', title:'SirEdwards Imparable', desc:'30 respuestas correctas consecutivas.', streak:30, check:s => (s.bestStreak || 0) >= 30},

  // PROGRESIÓN
  { id: 'first_game', title: 'Primeros Pasos', desc: 'Termina tu primera partida.', check: s => s.gamesPlayed >= 1 },
  { id: 'games_5', title: 'Cliente Habitual', desc: 'Juega 5 partidas.', check: s => s.gamesPlayed >= 5 },
  { id: 'games_10', title: 'Ya eres de la casa', desc: 'Juega 10 partidas.', check: s => s.gamesPlayed >= 10 },
  { id: 'games_20', title: 'Veterano del Quiz', desc: 'Juega 20 partidas.', check: s => s.gamesPlayed >= 20 },
  { id: 'games_50', title: 'Leyenda del Quiz', desc: 'Juega 50 partidas.', check: s => s.gamesPlayed >= 50 },

  // NIVEL
  { id: 'level_5', title: 'Recluta Mental', desc: 'Alcanza el nivel 5.', check: s => getLevelData(s.xp) >= 5 },
  { id: 'level_10', title: 'Cerebro en Marcha', desc: 'Alcanza el nivel 10.', check: s => getLevelData(s.xp) >= 10 },
  { id: 'level_20', title: 'Mente Superior', desc: 'Alcanza el nivel 20.', check: s => getLevelData(s.xp) >= 20 },
  { id: 'level_30', title: 'Cerebro de Élite', desc: 'Alcanza el nivel máximo (30).', check: s => getLevelData(s.xp) >= 30 },

  // DOMINIO
  { id: 'master_10', title: 'Primeros Conocimientos', desc: 'Domina 10 preguntas (3 aciertos consecutivos en cada una).', check: s => getMasteredCount(s) >= 10 },
  { id: 'master_50', title: 'Estudioso', desc: 'Domina 50 preguntas.', check: s => getMasteredCount(s) >= 50 },
  { id: 'master_100', title: 'Erudito', desc: 'Domina 100 preguntas.', check: s => getMasteredCount(s) >= 100 },
  { id: 'master_200', title: 'Biblioteca Humana', desc: 'Domina 200 preguntas.', check: s => getMasteredCount(s) >= 200 },

  // APRENDER DE LOS ERRORES
  { id: 'cleaner_5', title: 'Segunda Oportunidad', desc: 'Consigue dominar 5 preguntas que habías fallado anteriormente.', check: s => (s.errorsCleaned || 0) >= 5 },
  { id: 'cleaner_25', title: 'Aprender del Error', desc: 'Consigue dominar 25 preguntas que habías fallado anteriormente.', check: s => (s.errorsCleaned || 0) >= 25 },
  { id: 'limpieza_general', title: 'Limpieza General', desc: 'Deja tu lista de preguntas falladas en 0.', check: s => (s.errorsCleaned || 0) > 0 && (s.failedQuestions || []).length === 0 },

  // SUPERVIVENCIA
  { id: 'surv_ameba', title: 'Sobreviviente Primordial', desc: 'Gana Supervivencia en Modo Ameba.', check: s => (s.survivalAmebaWins || 0) >= 1 },
  { id: 'surv_humano', title: 'Evolución Confirmada', desc: 'Gana Supervivencia en Modo Humano Promedio.', check: s => (s.survivalHumanoWins || 0) >= 1 },
  { id: 'surv_derrame', title: 'Cerebro en Llamas', desc: 'Gana Supervivencia en Modo Derrame Cerebral.', check: s => (s.survivalDerrameWins || 0) >= 1 },

  // MUERTE SÚBITA
  // Objetivo binario (lo consigues o mueres): un único logro, no hitos
  // intermedios ni una variante "perfección" redundante con ganar el modo.
  { id: 'sd_primer_riesgo', title: 'Primer riesgo', desc: 'Gana una partida de Muerte Súbita.', check: s => (s.suddenWins || 0) >= 1 },

  // CONTRARRELOJ
  { id: 'tt_15', title: 'Velocidad Mental', desc: 'Consigue al menos 15 aciertos en Contrarreloj.', check: s => (s.maxTimeTrialScore || 0) >= 15 },
  { id: 'tt_30', title: 'Rayo Intelectual', desc: 'Consigue al menos 30 aciertos en Contrarreloj.', check: s => (s.maxTimeTrialScore || 0) >= 30 },
  { id: 'tt_50', title: 'Furia Mental', desc: 'Consigue al menos 50 aciertos en Contrarreloj.', check: s => (s.maxTimeTrialScore || 0) >= 50 },
  { id: 'sin_frenos', title: 'Sin Frenos', desc: 'Responde correctamente 10 preguntas consecutivas en Contrarreloj.', check: s => (s.timeTrialBestStreak || 0) >= 10 },

  // CÁLCULO MENTAL
  { id: 'mental_calc_15', title: 'Cálculo Relámpago', desc: 'Consigue 15 aciertos de Cálculo Mental en una misma partida.', check: s => (s.bestMentalCalcCorrect || 0) >= 15 },
  { id: 'mental_calc_30', title: 'Calculadora Humana', desc: 'Consigue 30 aciertos de Cálculo Mental en una misma partida.', check: s => (s.bestMentalCalcCorrect || 0) >= 30 },
  { id: 'mental_calc_40', title: 'Genio Numérico', desc: 'Consigue 40 o más aciertos de Cálculo Mental en una misma partida.', check: s => (s.bestMentalCalcCorrect || 0) >= 40 },

  // PRECISIÓN / HABILIDAD
  { id: 'correct_100', title: 'Cerebro de Precisión', desc: 'Acierta 100 preguntas en total.', check: s => s.totalCorrect >= 100 },
  { id: 'correct_400', title: 'Veterano del Conocimiento', desc: 'Acierta 400 preguntas en total.', check: s => s.totalCorrect >= 400 },
  { id: 'correct_800', title: 'Máquina del Quiz', desc: 'Acierta 800 preguntas en total.', check: s => s.totalCorrect >= 800 },

  // COLECCIÓN
  { id: 'medal_collector_10', title: 'Coleccionista', desc: 'Desbloquea 10 logros diferentes.', check: s => (s.unlockedMedals || []).filter(id => !['medal_collector_10','medal_collector_20','medal_collector_30','all_medals_secret'].includes(id) && isActiveMedalId(id)).length >= 10 },
  { id: 'medal_collector_20', title: 'Cazador de Logros', desc: 'Desbloquea 20 logros diferentes.', check: s => (s.unlockedMedals || []).filter(id => !['medal_collector_10','medal_collector_20','medal_collector_30','all_medals_secret'].includes(id) && isActiveMedalId(id)).length >= 20 },
  { id: 'medal_collector_30', title: 'Maestro de los Logros', desc: 'Desbloquea 30 logros diferentes.', check: s => (s.unlockedMedals || []).filter(id => !['medal_collector_10','medal_collector_20','medal_collector_30','all_medals_secret'].includes(id) && isActiveMedalId(id)).length >= 30 },

  // LOGROS ESPECIALES
  { id: 'sharp_eye', title: 'Ojo de Halcón', desc: 'Responde correctamente 5 preguntas difíciles consecutivas.', check: s => (s.hardBestStreak || 0) >= 5 },
  { id: 'sin_preferencias', title: 'Sin Preferencias', desc: 'Consigue 10 aciertos consecutivos sin repetir categoría.', check: s => (s.noRepeatCatBestStreak || 0) >= 10 },
  { id: 'polimata', title: 'Polímata', desc: 'Domina al menos el 40% de las preguntas de cada categoría.', check: s => getCategoryMastery(s).every(x => x.total > 0 && x.mastered / x.total >= 0.4) },
  { id: 'balanced_master', title: 'Sin Puntos Débiles', desc: 'Alcanza al menos un 60% de dominio en todas las categorías.', check: s => getCategoryMastery(s).every(x => x.total > 0 && x.mastered / x.total >= 0.6) },
  { id: 'noctambulo', title: 'Noctámbulo', desc: 'Completa una partida entre las 00:00 y las 04:00.', check: s => !!s.hasCompletedNightGame },
  { id: 'diurno', title: 'Primera Luz', desc: 'Completa una partida entre las 06:00 y las 08:00.', check: s => !!s.hasCompletedMorningGame },
  { id: 'mente_fracturada', title: 'Mente Fracturada', desc: 'Consigue tu primer Fragmento de Mente.', check: s => getFragmentCount(s) >= 1 },

  // DUELO
  { id: 'duel_primera_sangre', title: 'Primera Sangre', desc: 'Completa tu primer duelo.', check: s => (s.duelStats && s.duelStats.played || 0) >= 1 },
  { id: 'duel_victoria_inaugural', title: 'Victoria Inaugural', desc: 'Gana tu primer duelo.', check: s => (s.duelStats && s.duelStats.wins || 0) >= 1 },
  { id: 'duel_por_los_pelos', title: 'Por los Pelos', desc: 'Gana un duelo por exactamente 1 punto.', check: s => !!(s.duelStats && s.duelStats.wonByOnePoint) },
  { id: 'duel_contra_las_cuerdas', title: 'Contra las Cuerdas', desc: 'Gana un duelo después de haber ido al menos 3 puntos por detrás en algún momento.', check: s => !!(s.duelStats && s.duelStats.comebackWon) },
  { id: 'duel_rey_del_empate', title: 'El Rey del Empate', desc: 'Consigue 3 empates en duelos.', check: s => (s.duelStats && s.duelStats.draws || 0) >= 3 },
  // Ningún icono de logro se repite (test/achievements-view.test.mjs lo comprueba).
  { id: 'duel_cinco_victorias', title: 'Cinco Victorias', desc: 'Gana 5 duelos.', check: s => (s.duelStats && s.duelStats.wins || 0) >= 5 },
  // Prompt 4 — dependen del ID estable del rival en Duelo online (ver
  // registerOnlineDuelResult en index.html). Sin avatar asociado todavía.
  { id: 'duel_revancha', title: 'Revancha', desc: 'Gana un duelo contra un rival contra el que anteriormente perdiste.', check: s => !!(s.duelStats && s.duelStats.revengeWon) },
  { id: 'duel_otra_vez_tu', title: '¿Otra vez tú?', desc: 'Gana al mismo rival 3 veces.', check: s => (s.duelStats && s.duelStats.bestWinsVsRival || 0) >= 3 },
  { id: 'duel_tres_al_hilo', title: 'Caballero Invicto', desc: 'Gana 3 duelos consecutivos.', check: s => (s.duelStats && s.duelStats.bestWinStreak || 0) >= 3 },
  // Los cuatro siguientes los decide el SERVIDOR (resultado.hitos de cada duelo online): el cliente solo los registra.
  { id: 'duel_sin_titubear', title: 'Sin Titubear', desc: 'Gana un duelo acertando todas las preguntas.', check: s => !!(s.duelStats && s.duelStats.perfectWon) },
  { id: 'duel_apuestas_ultima_locura', title: 'La Última Locura', desc: 'En un Duelo por Apuestas, elige Insensato en la ronda final, acierta y gana.', check: s => !!(s.duelStats && s.duelStats.stakesLastMadness) },
  { id: 'duel_apuestas_calculada', title: 'Apuesta Calculada', desc: 'En un mismo Duelo por Apuestas, usa Cuerdo, Osado e Insensato.', check: s => !!(s.duelStats && s.duelStats.stakesAllThree) },

  // LUCIDEZ MENTAL: LOGROS SECRETOS
  // No otorgan Fragmentos de Mente (el modo ya está desbloqueado para
  // conseguirlos) y aparecen como "???" hasta desbloquearse, igual que
  // "Error 404: Duda no encontrada".
  { id: 'lucidez_mente_despierta', title: 'Mente Despierta', desc: 'Gana una partida de Lucidez Mental.', secret: true, check: s => !!s.lucidezEverWon },
  { id: 'lucidez_conexiones_imposibles', title: 'Conexiones Imposibles', desc: 'Resuelve correctamente 5 acertijos de Lucidez Mental.', secret: true, check: s => (s.lucidezTotalCorrect || 0) >= 5 },
  { id: 'lucidez_absoluta', title: 'Lucidez Absoluta', desc: 'Consigue una partida perfecta de Lucidez Mental: 30/30.', secret: true, check: s => !!s.lucidezEverPerfect },

  // SECRETO FINAL
  {
    id: 'all_medals_secret',
        title: 'Error 404: Duda no encontrada',
    desc: 'Desbloquea todos los demás logros del juego.',
    secret: true,
    check: s => {
      const otherMedals = ALL_MEDALS.filter(m => m.id !== 'all_medals_secret');
      return otherMedals.every(m => (s.unlockedMedals || []).includes(m.id));
    }
  }
];;

// RECOMPENSAS (única fuente): Fragmento de Mente = hitos importantes de progreso, habilidad o hazañas
// excepcionales (15 en total, FRAGMENT_TOTAL); Avatar = logros con identidad. Se derivan de aquí.
const MEDAL_REWARDS = {
  fragment: ["games_50", "level_20", "master_100", "cleaner_25", "sd_primer_riesgo", "tt_30", "mental_calc_30", "correct_800", "sharp_eye", "diurno", "duel_cinco_victorias", "streak_20", "duel_contra_las_cuerdas", "surv_humano", "duel_apuestas_calculada"],
  avatar: {
    medal_collector_30: 'avatar_siredwards_coleccionista',
    duel_revancha: 'avatar_siredwards_vengador',
    streak_30: 'avatar_siredwards_imparable',
    noctambulo: 'avatar_siredwards_medianoche',
    all_medals_secret: 'avatar_siredwards_supremo',
    duel_apuestas_ultima_locura: 'avatar_siredwards_insensato'
  }
};
const FRAGMENT_MEDAL_IDS = MEDAL_REWARDS.fragment.slice();

// IDs que ya no son logros activos pero se CONSERVAN: no se vuelven a conceder ni cuentan para la colección,
// y un desbloqueo antiguo no se pierde. MEDAL_ALIASES: ID histórico → ID actual.
const RETIRED_MEDAL_IDS = ['world_citizen', 'duel_eso_era_un_duelo', 'ultimo_cerebro'];
const MEDAL_ALIASES = { master_150: 'master_100', master_250: 'master_200', correct_300: 'correct_400', correct_600: 'correct_800' };
function isActiveMedalId(id) { return ALL_MEDALS.some(m => m.id === id); }
function resolveMedalId(id) { return Object.prototype.hasOwnProperty.call(MEDAL_ALIASES, id) ? MEDAL_ALIASES[id] : id; }
function getMedalAvatar(id) { return MEDAL_REWARDS.avatar[id] || null; }


const MEDAL_LOCK_SVG = '<svg class="medal-lock-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.5a4.75 4.75 0 0 0-4.75 4.75v3.05H6.4A2.15 2.15 0 0 0 4.25 11.45v9.1A2.15 2.15 0 0 0 6.4 22.7h11.2a2.15 2.15 0 0 0 2.15-2.15v-9.1a2.15 2.15 0 0 0-2.15-2.15h-.85V6.25A4.75 4.75 0 0 0 12 1.5zm0 2.2a2.55 2.55 0 0 1 2.55 2.55v3.05H9.45V6.25A2.55 2.55 0 0 1 12 3.7z"/></svg>';;

