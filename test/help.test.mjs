// Ayuda (src/data/help.js + src/ui/help.js): contenido, tono y comportamiento. Las cifras se contrastan con el Worker (duel-constants.js,
// friends.js) cuando su carpeta está junto a la de la PWA; si no está, esa parte se omite (como hace worker-sync --check).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const DATA_SRC = read('src/data/help.js');
const UI_SRC = read('src/ui/help.js');

function loadData() { const win = {}; vm.createContext({ window: win }); vm.runInContext(DATA_SRC, vm.createContext({ window: win })); return win.SEQHelpData; }
const D = loadData();

// Texto plano de un tema (sin marcas de negrita).
// `on`: con las invitaciones por enlace activas en el servidor (features.duel_links); `off`: sin ellas.
const pick = (x, on) => (x && typeof x === 'object' && !Array.isArray(x) && ('on' in x || 'off' in x)) ? (on ? x.on : x.off)
  : (typeof x === 'string' && x.startsWith('@enlace ')) ? (on ? x.slice(8) : null) : x;
const flat = (t, on = true) => t.blocks.map((b) => pick(b, on)).filter((b) => b != null).flat().map((b) => pick(b, on)).filter((b) => b != null).map((b) => (b && b.t) || b).join(' ').replace(/\*\*/g, '');
const ALL = D.topics.map((t) => t.title + ' ' + flat(t)).join('\n');
const ALL_OFF = D.topics.map((t) => t.title + ' ' + flat(t, false)).join('\n');
const topic = (id, on = true) => flat(D.topics.find((t) => t.id === id), on);

test('la Ayuda cubre los temas pedidos y sus ids son únicos', () => {
  const ids = D.topics.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['amigos', 'directo', 'invitaciones', 'retos', 'todos', 'ranking', 'abandonos', 'recompensas']) assert.ok(ids.includes(id), id);
  assert.equal(ids.length, 8, 'solo los ocho apartados de Duelos');
  assert.ok(!ids.includes('empezar') && !ids.includes('trucos'), 'sin «Cómo empezar» ni biblioteca de trucos');
  for (const t of D.topics) { assert.ok(t.title && t.blocks.length, t.id); for (const b of t.blocks) assert.ok(typeof b === 'string' || (b && typeof b.t === 'string') || (b && typeof b === 'object' && !Array.isArray(b) && typeof b.on === 'string' && typeof b.off === 'string') || (Array.isArray(b) && b.length && b.every((x) => typeof x === 'string' || (x && typeof x.on === 'string' && typeof x.off === 'string'))), t.id); }
});

test('tono: «tú», sin usted/le, sin emojis, sin modos retirados y frases cortas', () => {
  for (const bad of [/\busted(es)?\b/i, /\bsu\s+duelo\b/i, /código de sala/i, /Duelo por código/i, /Buscando rival/i, /\bnotificaci(ón|ones) push\b/i]) assert.doesNotMatch(ALL, bad);
  assert.doesNotMatch(ALL, /\p{Extended_Pictographic}/u);
  for (const t of D.topics) for (const s of flat(t).split(/(?<=[.!?])\s+/)) assert.ok(s.length <= 260, 'frase demasiado larga en ' + t.id + ': ' + s.slice(0, 70));
  assert.ok(D.lead && D.tutorialLabel);
});

test('reglas explicadas (comprobadas en el código del Worker): modos, plazos, ELO, rangos, abandono', () => {
  const t = (id, ...frags) => frags.forEach((f) => assert.ok(topic(id).includes(f), id + ': falta «' + f + '»'));
  t('directo', 'Clásico', 'Apuestas', '20 preguntas', '12 rondas', '10 segundos para elegir', 'Cuerdo (±1)', 'Osado (±2)', 'Insensato (±3)', 'sin bajar de 0', 'Si no eliges, se aplica Cuerdo', 'dos últimas rondas valen el doble', 'ocultan los puntos', 'revancha');
  t('invitaciones', '3 minutos', '2 minutos', 'cuenta atrás de 3 segundos', 'sin ELO ni penalización', 'un duelo o una sala activos a la vez');
  t('amigos', 'nombre o ID', 'Ajustes', '20 solicitudes', '7 días', 'en línea');
  t('retos', '3 días desde su creación', 'un Reto 1 contra 1 activo por pareja', '3 o 4 jugadores', 'máximo de 5 retos múltiples abiertos', 'Quien reta elige el modo');
  t('ranking', '1000 puntos', '5 partidas', 'Plebeyo Ilustrado: desde 0', 'Caballero del Dato: desde 1050', 'Erudito de Salón: desde 1150', 'Lord Sabelotodo: desde 1250', 'Sir Edwards: desde 1400', 'Colocación. Tus primeras', 'Rangos.', 'mejor clasificado', 'duelos múltiples no afectan al ELO');
  t('abandonos', '60 segundos', 'pierdes y baja tu ELO', 'ganas y sube tu ELO', 'no desbloquea logros ni hitos', 'ambos abandonáis', 'no afecta al ELO');
  t('recompensas', '10 XP');
  t('todos', '3 o 4 jugadores', 'No afecta al ELO', 'al menos 3 jugadores listos');
});

test('las cifras de la Ayuda coinciden con el Worker (si está al lado)', async (ctx) => {
  const back = path.resolve(new URL('..', import.meta.url).pathname, '..', 'sir-edwards-quiz-backend', 'src');
  if (!fs.existsSync(path.join(back, 'duel-constants.js'))) return ctx.skip('no está el backend junto a la PWA');
  const C = await import(pathToFileURL(path.join(back, 'duel-constants.js')).href);
  const min = (ms) => ms / 60000;
  assert.equal(topic('invitaciones').includes(min(C.CLASSIC_DUEL.invitacionTtlMs) + ' minutos'), true, 'invitación');
  assert.equal(topic('invitaciones').includes(min(C.CLASSIC_DUEL.listosTtlMs) + ' minutos'), true, 'sala de espera 1 vs 1');
  assert.equal(C.MULTI_DUEL.invitacionTtlMs, C.CLASSIC_DUEL.invitacionTtlMs);
  assert.equal(C.MULTI_DUEL.listosTtlMs, C.CLASSIC_DUEL.listosTtlMs, 'la Ayuda da una sola cifra de sala para 1 vs 1 y Todos contra todos');
  assert.ok(topic('todos').includes(min(C.MULTI_DUEL.invitacionTtlMs) + ' minutos') && topic('todos').includes(min(C.MULTI_DUEL.listosTtlMs)));
  assert.ok(topic('abandonos').includes(C.CLASSIC_DUEL.graciaDesconexionMs / 1000 + ' segundos'));
  assert.ok(topic('invitaciones').includes('cuenta atrás de ' + C.CLASSIC_DUEL.cuentaAtrasMs / 1000 + ' segundos'));
  assert.ok(topic('directo').includes(C.CLASSIC_DUEL.nPreguntas + ' preguntas') && topic('directo').includes('hasta ' + C.CLASSIC_DUEL.duracionPreguntaMs / 1000 + ' segundos'));
  assert.ok(topic('directo').includes(C.STAKES_DUEL.nRondas + ' rondas') && topic('directo').includes(C.STAKES_DUEL.apuestaMs / 1000 + ' segundos para elegir'));
  assert.ok(topic('directo').includes('Cuerdo** (±' + C.STAKE_TYPES.cuerdo.valor + ')') || topic('directo').includes('Cuerdo (±' + C.STAKE_TYPES.cuerdo.valor + ')'));
  assert.ok(topic('directo').includes('±' + C.STAKE_TYPES.osado.valor) && topic('directo').includes('±' + C.STAKE_TYPES.insensato.valor));
  assert.ok(topic('retos').includes(C.RETO.plazoMs / 86400000 + ' días'));
  assert.ok(topic('retos').includes('máximo de ' + C.MULTI_RETO.maxAbiertos + ' retos múltiples abiertos'));
  assert.ok(topic('ranking').includes(String(C.ELO.inicial)) && topic('ranking').includes(C.ELO.partidasColocacion + ' partidas'));
  for (const r of C.RANKS) assert.ok(topic('ranking').includes(r.nombre + ': desde ' + r.min), r.nombre);
  assert.ok(topic('todos').includes(C.MULTI_DUEL.minJugadores + ' o ' + C.MULTI_DUEL.maxJugadores + ' jugadores'));
  const fr = fs.readFileSync(path.join(back, 'friends.js'), 'utf8');
  assert.equal(Number(fr.match(/export const MAX_PENDING_OUT = (\d+)/)[1]), 20); assert.ok(topic('amigos').includes('20 solicitudes'));
  assert.equal(Number(eval(fr.match(/export const COOLDOWN_MS = ([^;]+);/)[1])), 7 * 86400000); assert.ok(topic('amigos').includes('7 días'));
});

// DOM mínimo para help.js
function loadUi() {
  const mk = (tag) => ({ tag, children: [], attrs: {}, style: {}, className: '', id: '', open: false, scrollTop: 0, _text: '', handlers: {},
    set textContent(v) { this._text = v; this.children = []; }, get textContent() { return this._text + this.children.map((c) => c.textContent || '').join(''); },
    appendChild(c) { this.children.push(c); return c; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, setAttribute(k, v) { this.attrs[k] = String(v); },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); }, get firstChild() { return this.children[0] || null; }, addEventListener(e, fn) { this.handlers[e] = fn; }, scrollIntoView() { this.scrolled = true; },
    all(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.all && c.all(pred, out); } return out; },
    querySelectorAll(sel) { return sel === 'details.help-topic' ? this.all((c) => c.tag === 'details') : []; },
    querySelector(sel) { return sel === '.modal-card' ? card : null; }, childNodes: null });
  const card = mk('div');
  const modal = mk('div'); const body = mk('div');
  modal.appendChild(card); card.appendChild(body);   // como en index.html: #help-modal > .modal-card > #help-modal-body
  Object.defineProperty(body, 'childNodes', { get() { return body.children; } });
  const byId = { 'help-modal': modal, 'help-modal-body': body };
  const doc = { getElementById: (id) => byId[id] || body.all((c) => c.id === id)[0] || null, createElement: mk, createTextNode: (t) => ({ tag: '#text', textContent: t }) };
  const win = {}; const calls = [];
  if (arguments[0] && arguments[0].links) win.SEQOnline = { session: () => ({ features: { classic_duel: true, duel_links: true } }) };
  win.SEQDuelIntro = { replay() { calls.push('replay'); return true; } };
  const ctx = { window: win, document: doc, String, Array };
  vm.createContext(ctx);
  if (arguments[0] && arguments[0].tips) vm.runInContext(read('src/utils/mental-tips.js'), ctx);   // biblioteca «Trucos de cálculo mental»
  vm.runInContext(DATA_SRC, ctx); vm.runInContext(UI_SRC + '\nwindow.SEQHelp = SEQHelp;', ctx);
  return { H: win.SEQHelp, modal, body, calls, byId };
}

test('SEQHelp.open: pinta todos los temas, despliega solo el pedido y muestra el modal', () => {
  const u = loadUi();
  u.H.open('ranking');
  assert.equal(u.modal.style.display, 'flex');
  const dets = u.body.all((c) => c.tag === 'details');
  assert.equal(dets.length, D.topics.length);
  assert.deepEqual(dets.filter((d) => d.open).map((d) => d.id), ['help-topic-ranking']);
  u.H.open();
  assert.equal(u.body.all((c) => c.tag === 'details').filter((d) => d.open).length, 0, 'sin tema, todo plegado');
  assert.equal(u.body.all((c) => c.tag === 'details').length, D.topics.length, 'no se duplica al reabrir');
  u.H.close(); assert.equal(u.modal.style.display, 'none');
});

test('Ayuda: no hay «Cómo empezar» ni catálogo de «Trucos de cálculo mental», aunque el módulo de trucos esté cargado', () => {
  const u = loadUi({ tips: true });
  u.H.open('trucos');
  const dets = u.body.all((c) => c.tag === 'details');
  assert.equal(dets.length, 8, 'solo los ocho apartados');
  assert.ok(!dets.some((d) => d.id === 'help-topic-trucos' || d.id === 'help-topic-empezar'));
  assert.deepEqual(dets.filter((d) => d.open).map((d) => d.id), [], 'un tema inexistente no despliega nada');
  const titles = dets.map((d) => d.children[0].textContent);
  assert.ok(!titles.includes('Cómo empezar') && !titles.includes('Trucos de cálculo mental'));
  assert.equal(u.body.all((c) => c.className === 'help-ex').length, 0);
  assert.deepEqual(titles, Array.from(D.topics, (t) => t.title));
  // Los trucos siguen en su módulo y en las partidas: la Ayuda ya no los usa.
  assert.ok(!/SEQMentalTips/.test(UI_SRC), 'help.js no toca la biblioteca de trucos');
  assert.equal(typeof u.H.open, 'function');
});

test('SEQHelp.open: el contenido sigue a features.duel_links (sin él, ningún texto de enlaces)', () => {
  const text = (u) => u.body.all((c) => c.tag === 'li' || c.tag === 'p').map((c) => c.textContent).join(' ');
  const off = loadUi(); off.H.open();
  assert.ok(!/enlace/i.test(text(off)), 'sin sesión / sin bandera: sin enlaces');
  const on = loadUi({ links: true }); on.H.open();
  assert.ok(/Compartir invitación/.test(text(on)) && /Enlace compartido/.test(text(on)));
});
test('el botón de la Ayuda cierra la Ayuda y vuelve a enseñar el tutorial', () => {
  const u = loadUi();
  u.H.open();
  const btn = u.body.all((c) => c.tag === 'button')[0];
  assert.equal(btn.textContent, D.tutorialLabel);
  btn.handlers.click();
  assert.deepEqual(u.calls, ['replay']);
  assert.equal(u.modal.style.display, 'none');
});

test('la Ayuda no usa innerHTML ni almacenamiento', () => {
  assert.ok(!/innerHTML/.test(UI_SRC.replace(/\/\/.*$/gm, '')));
  assert.ok(!/localStorage|sessionStorage/.test(UI_SRC.replace(/\/\/.*$/gm, '')));
});

test('Ayuda: la amistad no se presenta como requisito universal', () => {
  const all = JSON.stringify(D.topics);
  assert.ok(!/Sin amigos/i.test(all));
  assert.ok(!/solo (puedes )?(jugar|retar)[^.]*amigos/i.test(all.replace('solo puedes retar a un amigo que está en línea', '')), 'sin «solo con amigos»');
  assert.ok(all.includes('Enlace compartido') && all.includes('Invitación directa'), 'distingue duelo directo, enlace y retos');
});
// La Ayuda y el tutorial anuncian la invitación por enlace (Fase B): el cliente debe existir. (El Worker con la migración 0010 se despliega aparte.)
test('la invitación por enlace anunciada en Ayuda y tutorial existe en el cliente', () => {
  assert.ok(fs.existsSync(new URL('../src/online/duel-invite-link.js', import.meta.url)));
});
test('Ayuda: con los enlaces apagados en el servidor no menciona enlaces ni «Compartir invitación»', () => {
  assert.ok(!/enlace|Compartir invitaci/i.test(ALL_OFF), ALL_OFF.match(/.{40}enlace.{40}/i));
  assert.ok(ALL.includes('Enlace compartido') && !ALL_OFF.includes('Enlace compartido'));
  assert.ok(topic('directo', false).includes('que tu rival deberá aceptar') && !/amigos/.test(topic('directo', false)), 'sin enlaces, la revancha no menciona a quien no es amigo');
});
test('Ayuda: el cliente decide por features.duel_links (nunca por defecto) y reconstruye el contenido al cambiar', () => {
  assert.match(UI_SRC, /features\.duel_links/);
  assert.match(UI_SRC, /data-links/);
});
test('Ayuda: explica el enlace (10 minutos, un solo uso, sin amistad) y la revancha entre no amigos', () => {
  const t = topic('invitaciones') + ' ' + topic('directo');
  for (const f of ['Compartir invitación', '10 minutos', 'una sola vez', 'No crea ninguna amistad', 'Si no sois amigos, solo está disponible justo después del duelo']) assert.ok(t.includes(f), f);
  assert.ok(!/próximamente/i.test(ALL), 'la función ya existe en esta versión');
});
