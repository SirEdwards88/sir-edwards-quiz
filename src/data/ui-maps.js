// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const SHARE_IMAGE_PALETTE = {
  bg: '#f7f5ff',
  card: '#ffffff',
  border: '#6d28d9',
  text: '#17151f',
  sub: '#5b5568',
  accent: '#6d28d9',
  accentSoft: '#ede9fe',
  gold: '#d97706',
  navy: '#1849b3'
};;

const RESULT_TIER_STYLE = {
  bad:     { badge: '💀', pctEmoji: '💀' },
  medium:  { badge: '👑', pctEmoji: '😐' },
  good:    { badge: '👑', pctEmoji: '🙂' },
  perfect: { badge: '🏆', pctEmoji: '🏆' }
};;

const MODE_IDENTITY = {
  play: 'MODO ESTÁNDAR',
  review: 'REPASO',
  survival: 'SUPERVIVENCIA',
  sudden_death: 'MUERTE SÚBITA',
  timetrial: 'CONTRARRELOJ',
  mental_calc: 'CÁLCULO MENTAL',
  lucidez_mental: 'LUCIDEZ MENTAL'
};;

const RESULT_MOOD_ICONS = {
  desastre: '💀', suspenso: '😬', mediocre: '😐', bien: '🙂',
  casi_perfecto: '😏', perfecto: '🏆',
  win: '🏆', fail_desastre: '💀', fail_regular: '💔',
  timetrial: '⚡', review: '🧠', mentalcalc: '🔢'
};;

const SURVIVAL_TIER_RATIOS = {
  ameba: { facil: 0.7, medio: 0.3 },
  humano: { facil: 0.3, medio: 0.6, dificil: 0.1 },
  derrame: { medio: 0.7, dificil: 0.3 }
};;

