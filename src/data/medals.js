// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const ALL_MEDALS = [
  // 🔥 RACHAS
  {id:'streak_5', icon:'🔥', title:'Primera Chispa', desc:'5 respuestas correctas consecutivas en Modo Estándar.', streak:5, check:s => (s.standardBestStreak || 0) >= 5},
  {id:'streak_10', icon:'🌊', title:'Corriente Imparable', desc:'10 respuestas correctas consecutivas en Modo Estándar.', streak:10, check:s => (s.standardBestStreak || 0) >= 10},

  // 🎮 PROGRESIÓN
  { id: 'first_game', icon: '🚪', title: 'Primeros Pasos', desc: 'Termina tu primera partida.', check: s => s.gamesPlayed >= 1 },
  { id: 'games_5', icon: '🎟️', title: 'Cliente Habitual', desc: 'Juega 5 partidas.', check: s => s.gamesPlayed >= 5 },
  { id: 'games_10', icon: '🪪', title: 'Ya eres de la casa', desc: 'Juega 10 partidas.', check: s => s.gamesPlayed >= 10 },
  { id: 'games_20', icon: '🧭', title: 'Veterano del Quiz', desc: 'Juega 20 partidas.', check: s => s.gamesPlayed >= 20 },
  { id: 'games_50', icon: '👑', title: 'Leyenda del Quiz', desc: 'Juega 50 partidas.', check: s => s.gamesPlayed >= 50 },

  // 🧠 NIVEL
  { id: 'level_5', icon: '🧑‍🎓', title: 'Recluta Mental', desc: 'Alcanza el nivel 5.', check: s => getLevelData(s.xp) >= 5 },
  { id: 'level_10', icon: '🌟', title: 'Cerebro en Marcha', desc: 'Alcanza el nivel 10.', check: s => getLevelData(s.xp) >= 10 },
  { id: 'level_20', icon: '🦉', title: 'Mente Superior', desc: 'Alcanza el nivel 20.', check: s => getLevelData(s.xp) >= 20 },
  { id: 'level_30', icon: '🧬', title: 'Cerebro de Élite', desc: 'Alcanza el nivel máximo (30).', check: s => getLevelData(s.xp) >= 30 },

  // 📚 DOMINIO
  { id: 'master_10', icon: '🔍', title: 'Primeros Conocimientos', desc: 'Domina 10 preguntas (3 aciertos consecutivos en cada una).', check: s => getMasteredCount(s) >= 10 },
  { id: 'master_50', icon: '📖', title: 'Estudioso', desc: 'Domina 50 preguntas.', check: s => getMasteredCount(s) >= 50 },
  { id: 'master_150', icon: '🧠', title: 'Erudito', desc: 'Domina 100 preguntas.', check: s => getMasteredCount(s) >= 100 },
  { id: 'master_250', icon: '📚', title: 'Biblioteca Humana', desc: 'Domina 200 preguntas.', check: s => getMasteredCount(s) >= 200 },

  // 🔄 APRENDER DE LOS ERRORES
  { id: 'cleaner_5', icon: '🔄', title: 'Segunda Oportunidad', desc: 'Consigue dominar 5 preguntas que habías fallado anteriormente.', check: s => (s.errorsCleaned || 0) >= 5 },
  { id: 'cleaner_25', icon: '💡', title: 'Aprender del Error', desc: 'Consigue dominar 25 preguntas que habías fallado anteriormente.', check: s => (s.errorsCleaned || 0) >= 25 },
  { id: 'limpieza_general', icon: '🧹', title: 'Limpieza General', desc: 'Deja tu lista de preguntas falladas en 0.', check: s => (s.errorsCleaned || 0) > 0 && (s.failedQuestions || []).length === 0 },

  // ❤️ SUPERVIVENCIA
  { id: 'surv_ameba', icon: '🦠', title: 'Sobreviviente Primordial', desc: 'Gana Supervivencia en Modo Ameba.', check: s => (s.survivalAmebaWins || 0) >= 1 },
  { id: 'surv_humano', icon: '🧍', title: 'Evolución Confirmada', desc: 'Gana Supervivencia en Modo Humano Promedio.', check: s => (s.survivalHumanoWins || 0) >= 1 },
  { id: 'surv_derrame', icon: '🌋', title: 'Cerebro en Llamas', desc: 'Gana Supervivencia en Modo Derrame Cerebral.', check: s => (s.survivalDerrameWins || 0) >= 1 },

  // ☠️ MUERTE SÚBITA
  // Objetivo binario (lo consigues o mueres): un único logro, no hitos
  // intermedios ni una variante "perfección" redundante con ganar el modo.
  { id: 'sd_primer_riesgo', icon: '☠️', title: 'Primer riesgo', desc: 'Gana una partida de Muerte Súbita.', check: s => (s.suddenWins || 0) >= 1 },

  // ⏱️ CONTRARRELOJ
  { id: 'tt_15', icon: '🏃', title: 'Velocidad Mental', desc: 'Consigue al menos 15 aciertos en Contrarreloj.', check: s => (s.maxTimeTrialScore || 0) >= 15 },
  { id: 'tt_30', icon: '💨', title: 'Rayo Intelectual', desc: 'Consigue al menos 30 aciertos en Contrarreloj.', check: s => (s.maxTimeTrialScore || 0) >= 30 },
  { id: 'tt_50', icon: '🌪️', title: 'Furia Mental', desc: 'Consigue al menos 50 aciertos en Contrarreloj.', check: s => (s.maxTimeTrialScore || 0) >= 50 },
  { id: 'sin_frenos', icon: '🏎️', title: 'Sin Frenos', desc: 'Responde correctamente 10 preguntas consecutivas en Contrarreloj.', check: s => (s.timeTrialBestStreak || 0) >= 10 },

  // 🧮 CÁLCULO MENTAL
  { id: 'mental_calc_15', icon: '🧮', title: 'Cálculo Relámpago', desc: 'Consigue 15 aciertos de Cálculo Mental en una misma partida.', check: s => (s.bestMentalCalcCorrect || 0) >= 15 },
  { id: 'mental_calc_30', icon: '📐', title: 'Calculadora Humana', desc: 'Consigue 30 aciertos de Cálculo Mental en una misma partida.', check: s => (s.bestMentalCalcCorrect || 0) >= 30 },
  { id: 'mental_calc_40', icon: '🔢', title: 'Genio Numérico', desc: 'Consigue 40 o más aciertos de Cálculo Mental en una misma partida.', check: s => (s.bestMentalCalcCorrect || 0) >= 40 },

  // 🎯 PRECISIÓN / HABILIDAD
  { id: 'correct_100', icon: '🎯', title: 'Cerebro de Precisión', desc: 'Acierta 100 preguntas en total.', check: s => s.totalCorrect >= 100 },
  { id: 'correct_300', icon: '🗂️', title: 'Veterano del Conocimiento', desc: 'Acierta 300 preguntas en total.', check: s => s.totalCorrect >= 300 },
  { id: 'correct_600', icon: '🏺', title: 'Máquina del Quiz', desc: 'Acierta 600 preguntas en total.', check: s => s.totalCorrect >= 600 },

  // 🏅 COLECCIÓN
  { id: 'medal_collector_10', icon: '🗝️', title: 'Coleccionista', desc: 'Desbloquea 10 logros diferentes.', check: s => (s.unlockedMedals || []).filter(id => !['medal_collector_10','medal_collector_20','medal_collector_30','all_medals_secret'].includes(id)).length >= 10 },
  { id: 'medal_collector_20', icon: '💠', title: 'Cazador de Logros', desc: 'Desbloquea 20 logros diferentes.', check: s => (s.unlockedMedals || []).filter(id => !['medal_collector_10','medal_collector_20','medal_collector_30','all_medals_secret'].includes(id)).length >= 20 },
  { id: 'medal_collector_30', icon: '🏅', title: 'Maestro de los Logros', desc: 'Desbloquea 30 logros diferentes.', check: s => (s.unlockedMedals || []).filter(id => !['medal_collector_10','medal_collector_20','medal_collector_30','all_medals_secret'].includes(id)).length >= 30 },

  // ✨ LOGROS ESPECIALES
  { id: 'sharp_eye', icon: '🔭', title: 'Ojo de Halcón', desc: 'Responde correctamente 5 preguntas difíciles consecutivas.', check: s => (s.hardBestStreak || 0) >= 5 },
  { id: 'world_citizen', icon: '🌎', title: 'Ciudadano del Mundo', desc: 'Domina al menos 10 preguntas de cada categoría.', check: s => getCategoryMastery(s).every(x => x.mastered >= 10) },
  { id: 'sin_preferencias', icon: '🎭', title: 'Sin Preferencias', desc: 'Consigue 10 aciertos consecutivos sin repetir categoría.', check: s => (s.noRepeatCatBestStreak || 0) >= 10 },
  { id: 'polimata', icon: '📊', title: 'Polímata', desc: 'Domina al menos el 50% de las preguntas de cada categoría.', check: s => getCategoryMastery(s).every(x => x.total > 0 && x.mastered / x.total >= 0.5) },
  { id: 'balanced_master', icon: '🧩', title: 'Sin Puntos Débiles', desc: 'Alcanza al menos un 75% de dominio en todas las categorías.', check: s => getCategoryMastery(s).every(x => x.total > 0 && x.mastered / x.total >= 0.75) },
  { id: 'noctambulo', icon: '🌙', title: 'Noctámbulo', desc: 'Completa una partida entre las 00:00 y las 04:00.', check: s => !!s.hasCompletedNightGame },
  { id: 'mente_fracturada', icon: '🔮', title: 'Mente Fracturada', desc: 'Consigue tu primer Fragmento de Mente.', check: s => getFragmentCount(s) >= 1 },

  // ⚔️ DUELO
  { id: 'duel_primera_sangre', icon: '⚔️', title: 'Primera Sangre', desc: 'Completa tu primer duelo.', check: s => (s.duelStats && s.duelStats.played || 0) >= 1 },
  { id: 'duel_victoria_inaugural', icon: '🏆', title: 'Victoria Inaugural', desc: 'Gana tu primer duelo.', check: s => (s.duelStats && s.duelStats.wins || 0) >= 1 },
  { id: 'duel_por_los_pelos', icon: '⚡', title: 'Por los Pelos', desc: 'Gana un duelo por exactamente 1 punto.', check: s => !!(s.duelStats && s.duelStats.wonByOnePoint) },
  { id: 'duel_eso_era_un_duelo', icon: '💥', title: '¿Eso Era un Duelo?', desc: 'Gana un duelo por 10 puntos o más.', check: s => !!(s.duelStats && s.duelStats.wonByTenPlus) },
  { id: 'duel_rey_del_empate', icon: '🤝', title: 'El Rey del Empate', desc: 'Consigue 3 empates en duelos.', check: s => (s.duelStats && s.duelStats.draws || 0) >= 3 },
  // Icono 🥇 en vez de 🏆 (ya usado por Victoria Inaugural) para no repetir icono entre logros nuevos.
  { id: 'duel_cinco_victorias', icon: '🥇', title: 'Cinco Victorias', desc: 'Gana 5 duelos.', check: s => (s.duelStats && s.duelStats.wins || 0) >= 5 },

  // 👁️ LUCIDEZ MENTAL: LOGROS SECRETOS
  // No otorgan Fragmentos de Mente (el modo ya está desbloqueado para
  // conseguirlos) y aparecen como "???" hasta desbloquearse, igual que
  // "Error 404: Duda no encontrada".
  { id: 'lucidez_mente_despierta', icon: '🌅', title: 'Mente Despierta', desc: 'Gana una partida de Lucidez Mental.', secret: true, check: s => !!s.lucidezEverWon },
  { id: 'lucidez_conexiones_imposibles', icon: '🕸️', title: 'Conexiones Imposibles', desc: 'Resuelve correctamente 5 acertijos de Lucidez Mental.', secret: true, check: s => (s.lucidezTotalCorrect || 0) >= 5 },
  { id: 'lucidez_absoluta', icon: '💎', title: 'Lucidez Absoluta', desc: 'Consigue una partida perfecta de Lucidez Mental: 30/30.', secret: true, check: s => !!s.lucidezEverPerfect },

  // 👁️ SECRETO FINAL
  {
    id: 'all_medals_secret',
    icon: '🕳️',
    title: 'Error 404: Duda no encontrada',
    desc: 'Desbloquea todos los demás logros del juego.',
    secret: true,
    check: s => {
      const otherMedals = ALL_MEDALS.filter(m => m.id !== 'all_medals_secret');
      return otherMedals.every(m => (s.unlockedMedals || []).includes(m.id));
    }
  }
];;

const FRAGMENT_MEDAL_IDS = [
  'master_150',        // 🎓 Erudito
  'cleaner_25',         // 💡 Aprender del Error
  'surv_derrame',        // ❤️ Cerebro en Llamas
  'surv_humano',         // ❤️ Evolución Confirmada
  'sd_primer_riesgo',    // ☠️ Primer riesgo
  'sin_frenos',          // 🏎️ Sin Frenos
  'tt_30',               // 💨 Rayo Intelectual (30 aciertos en Contrarreloj)
  'mental_calc_30',      // 📐 Calculadora Humana
  'duel_cinco_victorias', // 🥇 Cinco Victorias (Duelo)
  'games_50',            // 👑 Leyenda del Quiz
  'level_20',            // 🦉 Mente Superior
  'correct_600',         // 🏺 Máquina del Quiz
  'world_citizen',       // 🌎 Ciudadano del Mundo
  'sharp_eye',           // 🔭 Ojo de Halcón
  'medal_collector_30'   // 🏅 Maestro de los Logros
];;

const MEDAL_LOCK_SVG = '<svg class="medal-lock-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1.5a4.75 4.75 0 0 0-4.75 4.75v3.05H6.4A2.15 2.15 0 0 0 4.25 11.45v9.1A2.15 2.15 0 0 0 6.4 22.7h11.2a2.15 2.15 0 0 0 2.15-2.15v-9.1a2.15 2.15 0 0 0-2.15-2.15h-.85V6.25A4.75 4.75 0 0 0 12 1.5zm0 2.2a2.55 2.55 0 0 1 2.55 2.55v3.05H9.45V6.25A2.55 2.55 0 0 1 12 3.7z"/></svg>';;

