// El juego NO usa emojis: ni en textos, ni como icono, ni como respaldo. Todo icono es una ilustración (assets/**)
// que se pide por nombre (src/ui/icons.js). Este test recorre el código que se publica y falla si aparece uno.
// «✓ ✕ ✦ ❝ → ←» son signos tipográficos, no emojis, y se permiten. Los avatares antiguos del Worker (perfiles guardados) no viven aquí.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const EMOJI = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|️/u;
const SKIP = new Set(['node_modules', '.git', 'assets', 'test', 'scripts', 'icons']);

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(f.name)) continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|html|css|json|webmanifest)$/.test(f.name)) out.push(p);
  }
  return out;
}

test('ningún archivo publicado contiene emojis (código, textos ni comentarios)', () => {
  const found = [];
  for (const file of walk(ROOT)) {
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (EMOJI.test(line)) found.push(path.relative(ROOT, file) + ':' + (i + 1) + ': ' + line.trim().slice(0, 90));
    });
  }
  assert.equal(found.join('\n'), '', 'emojis encontrados:\n' + found.join('\n'));
});

test('los iconos se piden por nombre: SEQIcons ya no traduce emojis', () => {
  const src = fs.readFileSync(new URL('../src/ui/icons.js', import.meta.url), 'utf8');
  assert.equal(/fromEmoji/.test(src), false);
  assert.match(src, /fromName/);
});
