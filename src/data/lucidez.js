// Extraido literalmente de SirEdwards_Quiz_v1_1.html (Fase 2 - sin modificar contenido)
// Cargado como script clasico (no ES Module) para no alterar el scope global.

const LUCIDEZ_RIDDLES = [
  {"q": "Soy alto siendo joven y bajo siendo viejo. ¿Quién soy?", "a": "Una vela", "explanation": "Una vela es alta cuando es nueva y se va haciendo más baja a medida que se consume."},
  {"q": "¿Qué es lo que se puede romper aunque jamás se toque, jamás se golpee y jamás se mueva de su sitio?", "a": "Una promesa", "explanation": "Una promesa se puede romper al no cumplirla, aunque no sea un objeto físico."},
  {"q": "Si 5 máquinas tardan 5 minutos en fabricar 5 piezas, ¿cuánto tiempo tardarían 100 máquinas en fabricar 100 piezas?", "a": "5 minutos", "explanation": "Cada máquina fabrica una pieza en 5 minutos. Por tanto, 100 máquinas pueden fabricar 100 piezas en esos mismos 5 minutos."},
  {"q": "¿Qué es lo que se puede ver una vez en un minuto, dos veces en un solo momento, pero no aparece ni una sola vez en cien años?", "a": "La letra M", "explanation": "La palabra «minuto» contiene una M, «momento» contiene dos y «cien años» no contiene ninguna."},
  {"q": "Dos padres y dos hijos fueron a pescar. Cada uno pescó un pez, pero solo llevaron tres peces a casa. ¿Cómo es posible?", "a": "Abuelo, padre e hijo", "explanation": "El abuelo es padre, el padre es a la vez padre e hijo, y el niño es hijo. Por eso hay dos padres y dos hijos, pero solo tres personas."},
  {"q": "Tengo un número de tres cifras. La primera cifra es el doble de la segunda. La segunda es el doble de la tercera. Las tres cifras suman 7. ¿Qué número es?", "a": "421", "explanation": "La tercera cifra es 1, la segunda es 2 y la primera es 4. 4 + 2 + 1 = 7."},
  {"q": "Un hombre llega a una ciudad el domingo, pasa tres días allí y se marcha el domingo. ¿Cómo es posible?", "a": "Su caballo se llama Domingo", "explanation": "«Domingo» es el nombre de su caballo, no el día en que se marcha."},
  {"q": "Un hombre está en una habitación con una vela, una chimenea y una lámpara de aceite. Tiene una sola cerilla. ¿Qué enciende primero?", "a": "La cerilla", "explanation": "Necesita encender la cerilla antes de poder encender cualquiera de las otras cosas."},
  {"q": "Completa la serie: 2 – 6 – 12 – 20 – 30 – ?", "a": "42", "explanation": "Las diferencias son +4, +6, +8, +10 y +12. Por tanto, 30 + 12 = 42."},
  {"q": "Tienes 6 huevos. Rompes 2, cocinas 2 y comes 2. ¿Cuántos huevos quedan?", "a": "4", "explanation": "Son los mismos 2 huevos: los rompes, los cocinas y después los comes. Los otros 4 siguen intactos."},
  {"q": "Tengo dos monedas que suman 30 céntimos. Una de ellas no es de 10 céntimos. ¿Qué monedas son?", "a": "20 céntimos y 10 céntimos", "explanation": "Una de las monedas no es de 10 céntimos: es la de 20. La otra sí es de 10."},
  {"q": "Cuando tenía 6 años, mi hermana tenía el doble de mi edad. Ahora tengo 30. ¿Cuántos años tiene mi hermana?", "a": "36", "explanation": "Cuando tú tenías 6, ella tenía 12, así que siempre hay 6 años de diferencia. Si ahora tienes 30, ella tiene 36."},
  {"q": "Un hombre mira un retrato y dice: «Hermanos y hermanas no tengo, pero el padre de este hombre es hijo de mi padre». ¿Quién aparece en el retrato?", "a": "Su hijo", "explanation": "Como no tiene hermanos, «el hijo de mi padre» solo puede ser él mismo. Por tanto, él es el padre del hombre del retrato."},
  {"q": "Un granjero tiene gallinas y conejos. En total hay 35 cabezas y 94 patas. ¿Cuántos conejos y cuántas gallinas tiene?", "a": "12 conejos y 23 gallinas", "explanation": "Si todos fueran gallinas habría 70 patas. Las 24 patas adicionales corresponden a 12 conejos, ya que cada conejo aporta 2 patas más que una gallina."},
  {"q": "En una carrera adelantas al corredor que va en segundo lugar. ¿En qué posición estás ahora?", "a": "En segundo lugar", "explanation": "Al adelantar al segundo, ocupas su posición. No has adelantado al primero."},
  {"q": "Hay guantes rojos, azules y verdes en una caja oscura. ¿Cuántos debes sacar para asegurarte de tener dos del mismo color?", "a": "4", "explanation": "En el peor caso, los tres primeros podrían ser uno de cada color. El cuarto necesariamente coincide con uno de ellos."},
  {"q": "Un hombre pasó ocho días sin dormir y no tuvo ningún problema. ¿Cómo es posible?", "a": "Dormía por la noche", "explanation": "Pasó ocho días sin dormir durante el día."},
  {"q": "Hay cuatro cartas: A — K — 4 — 7. Cada una tiene una letra por una cara y un número por la otra. Regla: «Si hay una vocal, detrás hay un número par». ¿Qué cartas debes girar para comprobarla?", "a": "A y 7", "explanation": "Hay que comprobar A para verificar que detrás hay un número par, y 7 para comprobar que detrás no haya una vocal. K y 4 no pueden demostrar que la regla sea falsa."},
  {"q": "Un padre tiene cuatro hijos. Cada hijo tiene una hermana. ¿Cuántos hijos tiene el padre en total?", "a": "5", "explanation": "Los cuatro hijos tienen la misma hermana."},
  {"q": "Dos hombres juegan cinco partidas de ajedrez. Cada uno gana el mismo número de partidas y no hubo ningún empate. ¿Cómo es posible?", "a": "No jugaban entre ellos", "explanation": "La clave está en asumir algo que la pregunta nunca dice: que los dos hombres se enfrentaron entre sí."}
];;

const LUCIDEZ_PHASE_COPY = {
  1: { label: 'FASE I', sub: 'El desafío comienza.', icon: '👁️' },
  2: { label: 'FASE II', sub: 'La presión aumenta. Mantén la mente fría.', icon: '👁️' },
  3: { label: 'FASE III', sub: 'Ya no basta con saber. Ahora tendrás que razonar.', icon: '👁️' }
};;

