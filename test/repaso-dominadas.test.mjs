import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');

test('Repaso: la tarjeta final muestra «Preguntas dominadas» (solo en Repaso)', () => {
  assert.match(html, /id="res-mastered-box"[\s\S]{0,200}id="res-mastered-value"[\s\S]{0,120}Preguntas dominadas/);
  assert.match(html, /currentGame\.masteredCount = \(currentGame\.masteredCount \|\| 0\) \+ 1/);
  assert.match(html, /res-mastered-value'\); if \(mv\) mv\.textContent = String\(currentGame\.masteredCount \|\| 0\)/);
  assert.match(css, /\.metric-box-wide \{ grid-column: 1 \/ -1; \}/);
  assert.match(css, /#results-card \.metric-box\.metric-box-wide \{ display: none !important; \}/);
  assert.match(css, /\.card\.theme-review #results-card \.metric-box\.metric-box-wide \{ display: flex !important; \}/);
});
