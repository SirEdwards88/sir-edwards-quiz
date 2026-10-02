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
