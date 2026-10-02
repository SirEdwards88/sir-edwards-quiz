// Muerte Súbita: dificultad progresiva dentro de la partida (30 preguntas).
// Una pregunta por posición, con 10 fáciles, 10 medias y 10 difíciles en total y mezclas graduales entre tramos
// (fácil al principio, las difíciles solo empiezan a asomar hacia la mitad y mandan al final). Se usan las dificultades que ya existen en el banco.
// Script clásico (scope global). El Worker (src/reto-modes.js del backend) tiene SU copia de SUDDEN_SHAPE:
// test/sudden-progression.test.mjs del backend comprueba que son idénticas. Si cambias esto, cambia allí y redespliega.
const SUDDEN_SHAPE = [
  'facil', 'facil', 'facil', 'facil', 'facil',          //  1-5   fácil
  'facil', 'medio', 'facil', 'medio', 'facil',          //  6-10  de fácil a media
  'medio', 'facil', 'medio', 'facil', 'medio',          // 11-15  media (con alguna fácil)
  'medio', 'dificil', 'medio', 'dificil', 'medio',      // 16-20  de media a difícil
  'dificil', 'medio', 'dificil', 'medio', 'dificil',    // 21-25  difícil (con alguna media)
  'dificil', 'dificil', 'dificil', 'dificil', 'dificil' // 26-30  difícil
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
