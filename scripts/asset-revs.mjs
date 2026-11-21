// Huellas de las imágenes que el service worker guarda en su caché estable (sedq-assets).
// sw.js lleva entre <asset-revs> y </asset-revs> un mapa «ruta → huella» GENERADO por este módulo (lo escribe
// scripts/bump-version.mjs; no se edita a mano). Una imagen se vuelve a descargar solo si cambió su huella.
import fs from 'node:fs';
import crypto from 'node:crypto';

// Solo assets/: los iconos de icons/ llevan ?v= en su URL y viajan con el código (caché versionada).
export const ASSET_RE = /^\.\/assets\//;

// Rutas de APP_SHELL (en el orden de sw.js).
export function shellList(swSource) {
  const m = swSource.match(/const APP_SHELL = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('No se encontró APP_SHELL en sw.js');
  return [...m[1].matchAll(/^\s*'(\.\/[^']*)'/gm)].map((x) => x[1]);
}

export function assetList(swSource) { return shellList(swSource).filter((u) => ASSET_RE.test(u)); }

export function computeRevs(rootUrl, urls) {
  const revs = {};
  for (const u of [...urls].sort()) {
    const file = new URL(u.slice(2), rootUrl);
    if (!fs.existsSync(file)) throw new Error('APP_SHELL lista un archivo que no existe: ' + u);
    let bytes = fs.readFileSync(file);
    // Los .svg son texto: en un árbol de trabajo de Windows (autocrlf) llevan CRLF, pero lo que se publica desde Git son los bytes con LF.
    // Se hashea siempre la forma LF para que la huella no dependa de los saltos de línea de quien ejecute el script.
    if (/\.svg$/i.test(u)) bytes = Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    revs[u] = crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 8);
  }
  return revs;
}

export function revsBlock(revs) {
  const body = Object.entries(revs).map(([u, r]) => `  '${u}': '${r}'`).join(',\n');
  return `// <asset-revs>\nconst ASSET_REVS = {\n${body}\n};\n// </asset-revs>`;
}

export function currentBlock(swSource) {
  const m = swSource.match(/\/\/ <asset-revs>[\s\S]*?\/\/ <\/asset-revs>/);
  return m ? m[0] : null;
}

// Devuelve sw.js con el bloque de huellas al día.
export function applyRevs(swSource, rootUrl) {
  const block = revsBlock(computeRevs(rootUrl, assetList(swSource)));
  if (!currentBlock(swSource)) throw new Error('sw.js no tiene el bloque <asset-revs>');
  return swSource.replace(/\/\/ <asset-revs>[\s\S]*?\/\/ <\/asset-revs>/, () => block);
}
