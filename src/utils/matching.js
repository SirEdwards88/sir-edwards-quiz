// Extraido literalmente de index.html (Fase 3, Lote 3A - motor de
// coincidencia de respuestas). Sin modificar ni una linea respecto al
// original. Cargado como script clasico (no ES Module) para conservar
// el scope global compartido con el script principal.

function normalizeText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(s) {
  return normalizeText(s).replace(/\s/g, '');
}

function tokenize(s) {
  return normalizeText(s)
    .split(' ')
    .filter(Boolean);
}

function getLevenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  if (a.length > b.length) [a, b] = [b, a];

  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);

  for (let j = 1; j <= b.length; j++) {
    const curr = [j];

    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1,
        prev[i] + 1,
        prev[i - 1] + cost
      );
    }
    prev = curr;
  }

  return prev[a.length];
}

function getAllowedDistance(word) {
  const len = word.length;
  // Los errores de una letra se toleran solo en palabras suficientemente
  // largas. Nunca se aplica esta tolerancia a respuestas numéricas.
  if (len <= 3) return 0;
  if (len <= 8) return 1;
  return 2;
}

function isPluralVariant(a, b) {
  if (a + 's' === b || b + 's' === a) return true;
  if (a + 'es' === b || b + 'es' === a) return true;
  if (a.endsWith('z') && a.slice(0, -1) + 'ces' === b) return true;
  if (b.endsWith('z') && b.slice(0, -1) + 'ces' === a) return true;
  return false;
}

function wordsMatch(userWord, targetWord) {
  if (userWord === targetWord) return true;
  if (isPluralVariant(userWord, targetWord)) return true;

  const maxLen = Math.max(userWord.length, targetWord.length);
  if (maxLen <= 3) return false;

  const distance = getLevenshteinDistance(userWord, targetWord);
  return distance <= getAllowedDistance(targetWord);
}

function splitAnswerParts(text) {
  // IMPORTANTE: hay que separar por coma/punto y coma/"+" ANTES de
  // normalizar el texto, porque normalizeText() convierte esos símbolos en
  // espacios (elimina cualquier carácter que no sea letra/número). Si se
  // normaliza primero, una respuesta separada solo por comas (p. ej.
  // "Leopoldo Alas, Clarín") pierde el separador y deja de detectarse como
  // respuesta múltiple.
  return (text || '')
    .split(/[,;+]/)
    .flatMap(chunk => normalizeText(chunk).split(/\s+(?:y|e|con)\s+/i))
    .map(part => part.trim())
    .filter(Boolean);
}

function removeFillerWords(words) {
  const fillers = new Set([
    'el','la','los','las','un','una','unos','unas',
    'de','del','al','en','por','para','con',
    'es','son','fue','eran','era','como',
    'que','se','y','e'
  ]);

  return words.filter(w => !fillers.has(w));
}

function isMultiAnswerTarget(targetRaw) {
  const raw = targetRaw || '';
  if (/[,;+]/.test(raw)) return true;
  const normalized = normalizeText(raw);
  return /\s(?:y|e|con)\s/.test(normalized);
}

function isRomanNumeralToken(word) {
  return /^(m{0,4})(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/.test(word) && word.length > 0;
}

function isMatchMultiAnswer(userRaw, targetRaw) {
  const userTokens = removeFillerWords(tokenize(userRaw));
  const targetParts = splitAnswerParts(targetRaw)
    .map(part => removeFillerWords(tokenize(part)).filter(w => !isRomanNumeralToken(w)))
    .filter(part => part.length > 0);

  if (!userTokens.length || !targetParts.length) return false;

  // Para una respuesta de varias partes, cada parte exigida debe estar
  // representada POR COMPLETO en la respuesta del jugador: se exige que
  // TODAS las palabras significativas de cada parte aparezcan en la
  // respuesta (p. ej. "Isabel de Castilla" exige "Isabel" e "de Castilla",
  // no solo "Isabel").
  const allPartsMatched = targetParts.every(partTokens =>
    partTokens.every(targetWord =>
      userTokens.some(userWord => wordsMatch(userWord, targetWord))
    )
  );

  if (!allPartsMatched) return false;

  // Evita que "Pinta" sea suficiente cuando se preguntan las tres carabelas.
  return userTokens.length >= targetParts.length;
}

function extractNumberGroups(text) {
  return normalizeText(text).match(/\d+/g) || [];
}

function hasNumbers(text) {
  return /\d/.test(text);
}

function isNumericAnswerMatch(userText, targetText, questionText = '', targetRaw = '') {
  const userNumbers = extractNumberGroups(userText);
  const targetNumbers = extractNumberGroups(targetText);

  if (!targetNumbers.length) return null;

  if (!userNumbers.length) return false;

  if (JSON.stringify(userNumbers) === JSON.stringify(targetNumbers)) return true;

  // Si la respuesta correcta usa un separador de miles/decimales
  // ("300.000 km/s", "42,195 km"), ese separador se convierte en espacio y el
  // número objetivo queda partido en varios trozos ("300","000"). Aceptamos
  // también que el usuario escriba el número seguido, sin separador ("300000").
  if (userNumbers.join('') === targetNumbers.join('')) return true;

  // Números decimales escritos con coma (estilo español, p. ej. "42,195 km"
  // para la maratón). normalizeText convierte la coma en espacio y el
  // número queda partido en dos grupos ("42" y "195"). La mayoría de la
  // gente responde solo con la parte entera redondeada ("42 km"), que es
  // la forma habitual de referirse a la cifra, así que la aceptamos.
  const decimalMatch = /(\d+),(\d+)/.exec(targetRaw);
  if (decimalMatch && userNumbers.length === 1 && userNumbers[0] === decimalMatch[1]) {
    return true;
  }

  // Algunas preguntas usan "aproximadamente". En esos casos permitimos
  // una pequeña tolerancia numérica para respuestas equivalentes como
  // "300000 km/s" frente a "299.792 km/s".
  if (/aproximad(?:amente|a)/i.test(questionText) && userNumbers.length === 1 && targetNumbers.length >= 1) {
    const userValue = Number(userNumbers[0]);
    // Cuando el objetivo usa separador de miles (299.792), normalizeText
    // puede dividirlo en dos grupos: 299 y 792. Se vuelven a unir aquí.
    const targetValue = Number(targetNumbers.join(''));
    if (Number.isFinite(userValue) && Number.isFinite(targetValue) && targetValue !== 0) {
      const relativeError = Math.abs(userValue - targetValue) / Math.abs(targetValue);
      if (relativeError <= 0.001) return true; // 0,1 %
    }
  }

  return false;
}

function isMatchFlexible(userRaw, targetRaw, questionText = '') {
  const userText = normalizeText(userRaw);
  const targetText = normalizeText(targetRaw);

  if (!userText || !targetText) return false;

  // 1. Coincidencia exacta normalizada: la regla principal.
  if (userText === targetText) return true;

  // 2. Excepción explícita para la velocidad de la luz: la respuesta del
  //    banco de Lucidez se mantiene como "299.792,458 km/s", pero aceptamos
  //    también la aproximación habitual "300000 km/s".
  if (targetText === '299792 458 km s' && userText === '300000 km s') return true;

  // 3. Las respuestas con números se tratan de forma estricta.
  //    Esto evita que Levenshtein convierta 1945 en 1944.
  if (hasNumbers(targetText)) {
    const numbersMatch = isNumericAnswerMatch(userText, targetText, questionText, targetRaw);
    if (!numbersMatch) return false;

    // Si además del número hay palabras (p. ej. "8 de marzo"), esas
    // palabras también deben coincidir: el número solo no es suficiente
    // para dar por buena una fecha o dato distinto (p. ej. "8 de mayo").
    const targetWordsOnly = removeFillerWords(tokenize(targetText.replace(/\d+/g, ' ')));
    if (!targetWordsOnly.length) return true;

    const userWordsOnly = removeFillerWords(tokenize(userText.replace(/\d+/g, ' ')));

    if (!userWordsOnly.length) {
      // El usuario ha escrito solo el número. Lo aceptamos cuando las
      // palabras que acompañan al número en la respuesta correcta ya
      // aparecen en el propio enunciado de la pregunta (p. ej. "¿Cada
      // cuántos años...?" -> "4 años", o "¿Cuántos jugadores...?" -> "5
      // jugadores"): esas palabras no aportan ninguna información nueva,
      // así que exigirlas es innecesariamente estricto. Si en cambio
      // aportan información que el enunciado no da (p. ej. el mes de una
      // fecha), se siguen exigiendo tal y como antes.
      const questionWords = removeFillerWords(tokenize(questionText));
      return targetWordsOnly.every(targetWord =>
        questionWords.some(qWord => wordsMatch(qWord, targetWord))
      );
    }

    return targetWordsOnly.every(targetWord =>
      userWordsOnly.some(userWord => wordsMatch(userWord, targetWord))
    );
  }

  // 3. Preguntas con varias respuestas explícitas.
  if (isMultiAnswerTarget(targetText)) {
    if (isMatchMultiAnswer(userText, targetText)) return true;
    return false;
  }

  const userTokens = removeFillerWords(tokenize(userText));
  const targetTokens = removeFillerWords(tokenize(targetText));

  if (!userTokens.length || !targetTokens.length) return false;

  // 4. Respuestas de una persona/lugar/obra con nombre compuesto:
  //    permite usar una parte inequívoca del nombre.
  //    Ej.: "Djokovic" -> "Novak Djokovic"
  //         "Teide" -> "El Teide"
  //         "Cervantes" -> "Miguel de Cervantes"
  if (userTokens.length === 1 && targetTokens.length > 1) {
    const userWord = userTokens[0];

    if (targetTokens.some(targetWord =>
      userWord === targetWord && userWord.length >= 4
    )) {
      return true;
    }
  }

  // 5. Todas las palabras de la respuesta corta deben corresponder
  //    a alguna palabra de la respuesta correcta.
  if (userTokens.length <= targetTokens.length) {
    const everyUserWordMatches = userTokens.every(userWord =>
      targetTokens.some(targetWord => wordsMatch(userWord, targetWord))
    );

    if (everyUserWordMatches) return true;
  }

  // 6. Último nivel: pequeños errores tipográficos en respuestas completas.
  const u = normalize(userText);
  const t = normalize(targetText);

  if (u === t) return true;

  // No aceptar que una respuesta sea simplemente un fragmento de otra
  // salvo por la regla explícita de nombres compuestos anterior.
  const maxLen = Math.max(u.length, t.length);
  let allowedDistance = 0;

  if (maxLen >= 4 && maxLen <= 5) allowedDistance = 1;
  else if (maxLen >= 6 && maxLen <= 8) allowedDistance = 1;
  else if (maxLen > 8) allowedDistance = 2;

  return getLevenshteinDistance(u, t) <= allowedDistance;
}

