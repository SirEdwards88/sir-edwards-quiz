// «Sabías que» válido: hasta 140 caracteres; los biográficos (empiezan por años: «1867–1934. …», «h. 470–399 a. C. …», «n. 1986. …»)
// pueden ser más largos (decisión de Edu, 26 de octubre de 2026), hasta 450.
export const esBiografico = (s) => /^(h\. |n\. )?\d/.test(s || '');
export const sabiasOk = (q) => !!q.sabias && q.sabias.length <= (esBiografico(q.sabias) ? 450 : 140);
