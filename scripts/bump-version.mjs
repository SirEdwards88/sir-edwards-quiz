// Sube CACHE_VERSION en sw.js y pone el mismo número en las URLs ?v= de los <script>/<link> propios de
// index.html. Así, al publicar, el navegador nunca mezcla el index.html nuevo con JS/CSS viejos de caché
// (aunque quien atienda la primera carga sea todavía el service worker anterior).
// También deja al día las huellas de las imágenes (bloque <asset-revs> de sw.js): una imagen cambiada se vuelve a descargar
// aunque conserve el nombre, y las que no cambian no se bajan otra vez.
// Uso: node scripts/bump-version.mjs          (sube 1)
//      node scripts/bump-version.mjs --revs   (solo regenera las huellas, sin subir la versión)
//      node scripts/bump-version.mjs --check  (solo comprueba que todo coincide; sale con error si no)
import fs from 'node:fs';
import { applyRevs, currentBlock } from './asset-revs.mjs';

const root = new URL('../', import.meta.url);
const swPath = new URL('sw.js', root);
const htmlPath = new URL('index.html', root);
const sw = fs.readFileSync(swPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

const m = sw.match(/const CACHE_VERSION = (\d+);/);
if (!m) { console.error('No se encontró CACHE_VERSION en sw.js'); process.exit(1); }
const check = process.argv.includes('--check');
const revsOnly = process.argv.includes('--revs');
const v = check || revsOnly ? Number(m[1]) : Number(m[1]) + 1;

// <script src="src/…js"> y <link rel="stylesheet" href="styles/…css">, con o sin ?v= previo.
const re = /(<script src="src\/[^"?]+\.js)(\?v=\d+)?(")|(<link rel="stylesheet" href="styles\/[^"?]+\.css)(\?v=\d+)?(")/g;
const out = html.replace(re, (all, s1, _s2, s3, l1, _l2, l3) => (s1 ? `${s1}?v=${v}${s3}` : `${l1}?v=${v}${l3}`));

const swWithRevs = applyRevs(sw, root);
if (check) {
  if (out !== html) { console.error(`index.html no tiene ?v=${v} en todos sus <script>/<link> propios.`); process.exit(1); }
  if (currentBlock(swWithRevs) !== currentBlock(sw)) { console.error('Las huellas de imágenes de sw.js están desfasadas: ejecuta node scripts/bump-version.mjs --revs'); process.exit(1); }
  console.log(`OK: CACHE_VERSION ${v} coincide con index.html y las huellas de imágenes están al día`);
} else if (revsOnly) {
  fs.writeFileSync(swPath, swWithRevs);
  console.log('Huellas de imágenes regeneradas en sw.js (CACHE_VERSION sin cambios)');
} else {
  fs.writeFileSync(swPath, swWithRevs.replace(/const CACHE_VERSION = \d+;/, `const CACHE_VERSION = ${v};`));
  fs.writeFileSync(htmlPath, out);
  console.log(`CACHE_VERSION → ${v} (sw.js e index.html; huellas de imágenes al día)`);
}
