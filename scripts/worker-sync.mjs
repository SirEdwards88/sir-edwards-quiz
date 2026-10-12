// Mantiene al día lo que el Worker (repo sir-edwards-quiz-backend, fuera de este) copia de la PWA.
//
// El Worker lleva COPIAS de archivos de esta PWA: unas literales (corrector de respuestas, selección de Lucidez, cálculo
// mental, combinación de datos) y otras GENERADAS (banco de preguntas, banco de Lucidez, logros y avatares). Si una cambia aquí
// y no allí, Duelo/Retos/perfil fallan en producción. Este script lo evita:
//
//   node scripts/worker-sync.mjs <ruta del backend>   copia las literales, regenera las generadas, pasa los tests del
//                                                     backend contra esta PWA y deja anotado el estado en
//                                                     scripts/worker-copies.json. Después solo queda DESPLEGAR el Worker.
//   node scripts/worker-sync.mjs --check              compara con lo anotado; sale con error si cambió una copia literal
//                                                     (y avisa si cambiaron los datos generados). Lo ejecuta un test.
//   node scripts/worker-sync.mjs --stamp              anota el estado actual sin tocar el backend.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'scripts', 'worker-copies.json');

// Copias literales: archivo de la PWA -> archivo del Worker, con lo que el Worker añade antes y después del cuerpo.
export const LITERAL = {
  'src/utils/matching.js': { to: 'src/matching.js',
    head: '// Corrector flexible de respuestas escritas: COPIA LITERAL de src/utils/matching.js de la PWA (Lucidez en Retos).\n// test/lucidez-bank-sync.test.mjs comprueba que el cuerpo es idéntico. No editar aquí: editar en la PWA y copiar.\n',
    tail: '\nexport { isMatchFlexible, normalizeText };\n' },
  'src/utils/answer-alias.js': { to: 'src/answer-alias.js',
    head: '// Guarda del corrector de respuestas escritas: COPIA LITERAL de src/utils/answer-alias.js de la PWA (Lucidez en Retos).\n// test/lucidez-bank-sync.test.mjs comprueba que el cuerpo es idéntico. No editar aquí: editar en la PWA y copiar.\nimport { isMatchFlexible, normalizeText } from \'./matching.js\';\n\n',
    tail: '\nexport { isMatchWithAlias };\n' },
  'src/utils/lucidez-select.js': { to: 'src/lucidez-select.js', head: '', tail: '\nexport { SEQLucidezSelect };\n' },
  'src/utils/mental-calc.js': { to: 'src/mental-calc.js', head: '', tail: '\nexport { SEQMentalCalc };\n' },
  'src/utils/sync-merge.js': { to: 'src/sync-merge.js', head: '', tail: '\nexport default SEQSyncMerge;\n' },
};
// Otras copias a mano en reto-modes.js (SUDDEN_SHAPE, constantes de Retos): se vigilan, no se copian solas.
const WATCHED = ['src/utils/sudden-progression.js'];
// Datos de los que el Worker genera su propio banco (scripts gen-*.mjs del backend).
export const DATA = ['src/data/questions.js', 'src/data/questions-retired.js', 'src/data/lucidez.js', 'src/data/medals.js', 'src/data/avatars.js'];

const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

export function current() {
  const o = { literal: {}, watched: {}, data: {} };
  for (const f of Object.keys(LITERAL)) o.literal[f] = sha(f);
  for (const f of WATCHED) o.watched[f] = sha(f);
  for (const f of DATA) if (fs.existsSync(path.join(root, f))) o.data[f] = sha(f);
  return o;
}
export function stamp() { fs.writeFileSync(manifestPath, JSON.stringify(current(), null, 2) + '\n'); }

// { logic: [archivos de lógica cambiados], data: [archivos de datos cambiados] } respecto a lo anotado.
export function status() {
  const saved = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { literal: {}, watched: {}, data: {} };
  const now = current();
  const diff = (a, b) => Object.keys(b).filter((f) => a[f] !== b[f]);
  return { logic: [...diff(saved.literal || {}, now.literal), ...diff(saved.watched || {}, now.watched)], data: diff(saved.data || {}, now.data) };
}

function sync(backend) {
  const b = path.resolve(backend);
  if (!fs.existsSync(path.join(b, 'src', 'reto-modes.js'))) { console.error('No parece el repo del backend: ' + b); process.exit(1); }
  for (const [from, w] of Object.entries(LITERAL)) {
    const body = fs.readFileSync(path.join(root, from), 'utf8');
    fs.writeFileSync(path.join(b, w.to), w.head + body + w.tail);
    console.log('copiado  ' + from + ' -> ' + w.to);
  }
  for (const gen of ['gen-questions.mjs', 'gen-lucidez.mjs', 'gen-constants.mjs']) {
    const r = spawnSync(process.execPath, [path.join(b, 'scripts', gen), root], { stdio: 'inherit', cwd: b });
    if (r.status !== 0) { console.error('Falló ' + gen); process.exit(1); }
  }
  const t = spawnSync('npm', ['test'], { cwd: b, stdio: 'inherit', env: { ...process.env, PWA_DIR: root } });
  if (t.status !== 0) console.warn('\nOJO: hay tests del backend en rojo (revisa si ya fallaban antes de este cambio).');
  stamp();
  console.log('\nEstado anotado en scripts/worker-copies.json.\nFalta solo DESPLEGAR el Worker: cd ' + b + ' && npx wrangler deploy');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === '--stamp') { stamp(); console.log('Estado anotado.'); }
  else if (arg === '--check') {
    const s = status();
    if (s.data.length) console.warn('AVISO: cambiaron datos que el Worker copia (' + s.data.join(', ') + '). Ejecuta: node scripts/worker-sync.mjs <backend> y despliega el Worker.');
    if (s.logic.length) { console.error('ERROR: cambió código que el Worker copia (' + s.logic.join(', ') + '). Ejecuta: node scripts/worker-sync.mjs <backend>, despliega el Worker.'); process.exit(1); }
    console.log('OK: el código copiado al Worker coincide con lo anotado');
  } else if (arg) sync(arg);
  else { console.error('Uso: node scripts/worker-sync.mjs <ruta del backend> | --check | --stamp'); process.exit(1); }
}
