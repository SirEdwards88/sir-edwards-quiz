// Muerte Súbita: dificultad progresiva dentro de la partida (30 preguntas).
// Una pregunta por posición: fácil al principio, transición fácil → media, tramo medio, transición
// media → difícil y tramo final difícil. Se usan las dificultades que ya existen en el banco.
// Script clásico (scope global). El Worker (src/reto-modes.js del backend) tiene SU copia de SUDDEN_SHAPE:
// test/sudden-progression.test.mjs del backend comprueba que son idénticas. Si cambias esto, cambia allí y redespliega.
const SUDDEN_SHAPE = [
  'facil', 'facil', 'facil', 'facil', 'facil',          //  1-5   fácil
  'facil', 'medio', 'facil', 'medio', 'medio',          //  6-10  de fácil a media
  'medio', 'medio', 'medio', 'medio', 'medio',          // 11-15  media
  'medio', 'dificil', 'medio', 'dificil', 'dificil',    // 16-20  de media a difícil
  'dificil', 'dificil', 'dificil', 'dificil', 'dificil',
  'dificil', 'dificil', 'dificil', 'dificil', 'dificil' // 21-30  difícil
];
const SUDDEN_TRAMOS = [
  { desde: 1, hasta: 5, nombre: 'Fácil' },
  { desde: 6, hasta: 10, nombre: 'De fácil a media' },
  { desde: 11, hasta: 15, nombre: 'Media' },
  { desde: 16, hasta: 20, nombre: 'De media a difícil' },
  { desde: 21, hasta: 30, nombre: 'Difícil' }
];
// Nombre del tramo en el que está la pregunta número n (1-30). Fuera de rango: el último tramo.
function suddenTramoName(n) {
  for (let i = 0; i < SUDDEN_TRAMOS.length; i++) {
    if (n >= SUDDEN_TRAMOS[i].desde && n <= SUDDEN_TRAMOS[i].hasta) return SUDDEN_TRAMOS[i].nombre;
  }
  return SUDDEN_TRAMOS[SUDDEN_TRAMOS.length - 1].nombre;
}
