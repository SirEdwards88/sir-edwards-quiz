// La tarjeta final de un Duelo/Reto (.seq-d-results, en src/online/duels.js) es la misma que la de una partida
// en solitario (#results-card). Este script copia las reglas de #results-card de styles/main.css y theme.css
// (salvo las de un modo concreto, .theme-*) al bloque marcado de styles/online.css, cambiando el selector.
// Uso: node scripts/gen-duel-results-css.mjs          (regenera el bloque)
//      node scripts/gen-duel-results-css.mjs --check  (solo comprueba que está al día; sale con error si no)
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const START = '/* ===== GENERADO: tarjeta final de Duelo/Reto (scripts/gen-duel-results-css.mjs) ===== */';
const END = '/* ===== FIN DEL BLOQUE GENERADO ===== */';

function collect(css, media, out) {
  let i = 0;
  while (i < css.length) {
    const j = css.indexOf('{', i);
    if (j < 0) break;
    let depth = 1, k = j + 1;
    while (depth && k < css.length) { if (css[k] === '{') depth++; else if (css[k] === '}') depth--; k++; }
    const sel = css.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const body = css.slice(j + 1, k - 1);
    if (sel.startsWith('@media')) collect(body, sel, out);
    else if (!sel.startsWith('@')) {
      const parts = sel.split(',').map((p) => p.trim()).filter((p) => p.includes('#results-card') && !p.includes('theme-') && !p.includes('#res-'));
      if (parts.length) {
        const rule = parts.map((p) => p.replaceAll('#results-card', '#seq-duel-root .seq-d-results')).join(', ') + ' {' + body.trim() + '}';
        out.push(media ? `${media} { ${rule} }` : rule);
      }
    }
    i = k;
  }
}

const out = [];
for (const f of ['styles/main.css', 'styles/theme.css']) collect(read(f), null, out);
const block = [START, ...out, END].join('\n');
const onlinePath = new URL('styles/online.css', root);
const online = fs.readFileSync(onlinePath, 'utf8');
const a = online.indexOf(START), b = online.indexOf(END);
const next = a >= 0 && b > a ? online.slice(0, a) + block + online.slice(b + END.length) : online.replace(/\s*$/, '\n\n') + block + '\n';

if (process.argv.includes('--check')) {
  if (next !== online) { console.error('styles/online.css: el bloque de la tarjeta final de Duelo/Reto no está al día (node scripts/gen-duel-results-css.mjs).'); process.exit(1); }
  console.log('OK: tarjeta final de Duelo/Reto al día con #results-card');
} else {
  fs.writeFileSync(onlinePath, next);
  console.log(`Tarjeta final de Duelo/Reto: ${out.length} reglas copiadas de #results-card`);
}
