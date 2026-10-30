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

const MODE_IDENTITY = {
  play: 'ESTÁNDAR',
  review: 'REPASO',
  survival: 'SUPERVIVENCIA',
  sudden_death: 'MUERTE SÚBITA',
  timetrial: 'CONTRARRELOJ',
  mental_calc: 'CÁLCULO TURBO',
  lucidez_mental: 'LUCIDEZ MENTAL'
};;

// Icono del resultado: NOMBRE de ilustración (ver SEQIcons.src), nunca un emoji.
const RESULT_MOOD_ICONS = {
  desastre: 'sombrero-aplastado', suspenso: 'suspenso', mediocre: 'sombrero-mediocre', bien: 'sombrero-saludo',
  casi_perfecto: 'casi', perfecto: 'sombrero-laurel',
  win: 'sombrero-laurel', fail_desastre: 'sombrero-aplastado', fail_regular: 'derrota',
  timetrial: 'modo-contrarreloj', review: 'modo-repaso', mentalcalc: 'modo-calculo'
};;

// Supervivencia: 4 vidas (se pueden fallar tres; el cuarto fallo termina la partida).
const SURVIVAL_LIVES = 4;

const SURVIVAL_TIER_RATIOS = {
  ameba: { facil: 0.7, medio: 0.3 },
  humano: { facil: 0.3, medio: 0.6, dificil: 0.1 },
  derrame: { facil: 0.1, medio: 0.6, dificil: 0.3 }
};;

