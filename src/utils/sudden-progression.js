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
// Rango de Sir Edwards según las preguntas sobrevividas (aciertos antes de caer; 30 = las completó todas).
const SUDDEN_RANGOS = [
  { desde: 0, hasta: 5, nombre: 'Aprendiz de superviviente' },
  { desde: 6, hasta: 10, nombre: 'Resistente' },
  { desde: 11, hasta: 15, nombre: 'Veterano' },
  { desde: 16, hasta: 20, nombre: 'Curtido' },
  { desde: 21, hasta: 25, nombre: 'Superviviente de élite' },
  { desde: 26, hasta: 29, nombre: 'Casi inmortal' },
  { desde: 30, hasta: 30, nombre: 'Inmortal' }
];
function suddenRango(survived) {
  const n = Math.max(0, Math.min(30, Math.floor(Number(survived) || 0)));
  for (let i = 0; i < SUDDEN_RANGOS.length; i++) {
    if (n >= SUDDEN_RANGOS[i].desde && n <= SUDDEN_RANGOS[i].hasta) return SUDDEN_RANGOS[i].nombre;
  }
  return SUDDEN_RANGOS[0].nombre;
}
