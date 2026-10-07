// SirEdwards Quiz — Lucidez Mental (solitario): memoria de preguntas vistas + llamada a la selección única.
//
// La selección en sí (curva 10+5+9, variedad, pares) vive en src/utils/lucidez-select.js y es la MISMA que usa el
// Worker para los Retos. Aquí solo se recuerda, en store.questionBags['lucidez_vistas'], qué preguntas han salido ya
// en esta vuelta del banco, para no repetir hasta agotarlo. La memoria se lleva por nivel (fácil / medio / difícil):
// cuando de un nivel no queda ninguna sin ver, se olvida solo ese nivel y empieza otra vuelta.
// Script clásico: usa los globales store, QUESTIONS y SEQLucidezSelect.

const LUCIDEZ_SEEN_KEY = 'lucidez_vistas';

function pickLucidezGame() {
  if (!store.questionBags) store.questionBags = {};
  const eligible = QUESTIONS.filter(SEQLucidezSelect.isEligible);
  const byId = new Map(eligible.map(q => [q.n, q]));
  let seen = Array.isArray(store.questionBags[LUCIDEZ_SEEN_KEY]) ? store.questionBags[LUCIDEZ_SEEN_KEY] : [];
  seen = seen.filter(id => byId.has(id)); // ids desconocidos o ya sin lz: fuera

  const need = { facil: 0, medio: 0, dificil: 0 };
  Object.keys(SEQLucidezSelect.PLAN).forEach(f => SEQLucidezSelect.PLAN[f].forEach(t => { need[t[0]] += t[1]; }));
  Object.keys(need).forEach(level => {
    const seenSet = new Set(seen);
    const unseen = eligible.filter(q => q.dif === level && !seenSet.has(q.n)).length;
    // Solo se «da la vuelta» a un nivel cuando no queda NINGUNA sin ver. Si quedan menos de las que pide la partida, salen
    // primero todas las no vistas y solo el resto se repite (la selección prefiere siempre lo no visto).
    if (unseen === 0) seen = seen.filter(id => byId.get(id).dif !== level);
  });

  const sel = SEQLucidezSelect.select(QUESTIONS, Math.random, seen);
  store.questionBags[LUCIDEZ_SEEN_KEY] = seen.concat(sel.p1, sel.p2, sel.p3).map(q => (typeof q === 'number' ? q : q.n));
  return sel;
}
