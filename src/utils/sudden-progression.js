// Muerte Súbita: dificultad progresiva dentro de la partida (25 preguntas).
// Una pregunta por posición, con 8 fáciles, 9 medias y 8 difíciles en total y mezclas graduales entre tramos
// (fácil al principio, las difíciles solo empiezan a asomar hacia la mitad y mandan al final). Se usan las dificultades que ya existen en el banco.
// Script clásico (scope global). El Worker (src/reto-modes.js del backend) tiene SU copia de SUDDEN_SHAPE:
// test/sudden-progression.test.mjs del backend comprueba que son idénticas. Si cambias esto, cambia allí y redespliega.
const SUDDEN_SHAPE = [
  'facil', 'facil', 'facil', 'facil', 'facil',          //  1-5   fácil
  'medio', 'facil', 'medio', 'facil', 'medio',          //  6-10  de fácil a media
  'medio', 'facil', 'medio', 'medio', 'medio',          // 11-15  media (con alguna fácil)
  'dificil', 'medio', 'dificil', 'medio', 'dificil',    // 16-20  de media a difícil
  'dificil', 'dificil', 'dificil', 'dificil', 'dificil' // 21-25  difícil
];
