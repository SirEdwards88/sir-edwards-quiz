// SirEdwards Quiz v2.0 — Prompt 5: Share Result Card.
//
// Tarjeta visual (PNG) que se comparte fuera de la app. UNA sola composición
// con variantes (ShareResultCard + variant), no seis componentes:
//   standard · victory · defeat · lucidez · duel · reto
//
// Principios:
//  - Solo REPRESENTA datos que ya existen (buildModel recibe lo que la app ya
//    calculó: marcador, tono de resultado, ganador del duelo...). No decide
//    quién ganó, no recalcula puntuaciones ni toca ningún estado del juego.
//  - Paleta propia y FIJA (no lee CSS ni el tema claro/oscuro de la página):
//    la imagen sale igual sea cual sea el modo de la app.
//  - Canvas 2D sobre el mismo mecanismo que ya usaba la app (sin librerías).
//    1080×1350 (4:5), exportado a 2× (2160×2700) para que se vea nítido.
//  - Assets ya existentes (Victory/Defeat/Lucidez/sombrero/avatares). Si un
//    asset o una fuente no carga, la composición sigue sin él (nunca lanza).
//  - Avatar + marco: drawAvatar() deja un hueco (opts.frame) para futuros
//    marcos PvP. NO hay sistema de marcos todavía.
//  - Estática: sin animaciones, partículas ni confeti.
//
// Cargado como script clásico (scope global) → window.SEQShareCard.
// buildModel() es pura (sin DOM) y está cubierta por test/share-card.test.mjs.

(function () {
  'use strict';

  var W = 1080, H = 1350, SCALE = 2;
  var CX = W / 2;

  var CHARACTER_ASSETS = {
    victory: 'assets/character/victory',
    defeat: 'assets/character/defeat',
    hat: 'assets/character/hat',
    phase1: 'assets/character/lucidez-fase1',
    phase2: 'assets/character/lucidez-fase2',
    phase3: 'assets/character/lucidez-fase3',
    enigma: 'assets/character/lucidez-enigma'
  };
  var AVATAR_DIR = 'assets/avatars/';

  // Colores de marca (mismos valores que --brand-* de styles/main.css en tema
  // claro), fijados aquí a propósito para que no dependan del tema.
  var BRAND = {
    navy: '#16244a', cream: '#faf3e6', creamDim: 'rgba(250,243,230,.72)',
    gold: '#c9992e', goldLight: '#e8c874', burgundy: '#7b1f2e', burgundyLight: '#d0616f',
    purple: '#7c3aed', purpleLight: '#c4b5fd'
  };
  // Una entrada por variante. bg = [arriba, abajo]; glow = halo tras el personaje.
  var THEMES = {
    standard: { bg: ['#1b2a55', '#0c1226'], glow: 'rgba(124,58,237,.30)', accent: BRAND.goldLight, ring: BRAND.gold },
    victory:  { bg: ['#1e2f63', '#0d1530'], glow: 'rgba(232,200,116,.42)', accent: BRAND.goldLight, ring: BRAND.goldLight },
    defeat:   { bg: ['#1a1830', '#0a0812'], glow: 'rgba(160,40,60,.45)', accent: BRAND.burgundyLight, ring: BRAND.burgundyLight },
    lucidez:  { bg: ['#1a1240', '#070510'], glow: 'rgba(120,90,255,.42)', accent: BRAND.purpleLight, ring: BRAND.goldLight },
    duel:     { bg: ['#4a1426', '#14050b'], glow: 'rgba(176,58,92,.42)', accent: '#f4a3b3', ring: '#e0607a' },
    reto:     { bg: ['#2a1358', '#0e0722'], glow: 'rgba(167,139,250,.42)', accent: '#c4b5fd', ring: '#a78bfa' }
  };

  // Fondo propio de cada modo (mismos tonos que la franja de color del modo en el juego, oscurecidos
  // para que el texto crema se lea). El desenlace (victoria/derrota) se marca con el marco y el acento.
  var MODE_BG = {
    play:          { bg: ['#1f3576', '#0a1130'], glow: 'rgba(96,140,255,.36)', accent: '#9db8ff', ring: '#7d9cf0', icon: 'estandar' },
    survival:      { bg: ['#5e3712', '#1a0d04'], glow: 'rgba(245,158,11,.40)', accent: '#fbbf24', ring: '#f59e0b', icon: 'supervivencia' },
    sudden_death:  { bg: ['#601219', '#170407'], glow: 'rgba(220,38,38,.42)', accent: '#f87171', ring: '#ef4444', icon: 'muerte-subita' },
    timetrial:     { bg: ['#6b1240', '#1c0512'], glow: 'rgba(236,72,153,.40)', accent: '#f9a8d4', ring: '#f472b6', icon: 'contrarreloj' },
    mental_calc:   { bg: ['#14532d', '#04140b'], glow: 'rgba(74,222,128,.32)', accent: '#86efac', ring: '#4ade80', icon: 'calculo' },
    review:        { bg: ['#0e4d48', '#031615'], glow: 'rgba(20,184,166,.38)', accent: '#5eead4', ring: '#2dd4bf', icon: 'repaso' },
    lucidez_mental:{ bg: ['#1a1240', '#070510'], glow: 'rgba(120,90,255,.42)', accent: BRAND.purpleLight, ring: BRAND.goldLight, icon: 'secreto' },
    duel:          { bg: ['#4a1426', '#14050b'], glow: 'rgba(176,58,92,.42)', accent: '#f4a3b3', ring: '#e0607a', icon: 'duelo' },
    reto:          { bg: ['#0b4a5c', '#03161c'], glow: 'rgba(34,211,238,.38)', accent: '#a5f3fc', ring: '#22d3ee', icon: 'retos' }
  };
  var MODE_BY_NAME = { 'modo estándar': 'play', 'estándar': 'play', 'supervivencia': 'survival', 'muerte súbita': 'sudden_death',
    'contrarreloj': 'timetrial', 'cálculo mental': 'mental_calc', 'repaso': 'review', 'lucidez mental': 'lucidez_mental' };
  var MODE_ICON_DIR = 'assets/modes/suelto/';
  function themeFor(model) {
    var base = MODE_BG[model.mode] || THEMES[model.variant] || THEMES.standard;
    var t = { bg: base.bg, glow: base.glow, accent: base.accent, ring: base.ring };
    // Victoria: marco dorado y halo cálido. Derrota: marco y acento granate. El fondo sigue siendo el del modo.
    if (model.outcome === 'win') { t.ring = BRAND.goldLight; t.accent = BRAND.goldLight; t.glow = 'rgba(232,200,116,.40)'; }
    else if (model.outcome === 'loss') { t.ring = BRAND.burgundyLight; t.accent = BRAND.burgundyLight; }
    return t;
  }

  // ---------------------------------------------------------------- modelo
  function clampInt(n) { n = Math.floor(Number(n)); return isFinite(n) ? n : 0; }
  function outcomeTitle(o) { return o === 'win' ? 'VICTORIA' : o === 'loss' ? 'DERROTA' : o === 'draw' ? 'EMPATE' : 'RESULTADO'; }

  // input (todo ya calculado por la app):
  //   modeName, scoreStr, accuracy, streak            — lastResultShareData
  //   characterState: 'victory'|'defeat'|undefined    — RESULT_CHARACTER_TONES[tono en pantalla]
  //   lucidez: { failed, perfect, phase }             — solo Lucidez en solitario
  //   duel: { role, result, myScore, opponentScore, code, score, totalQ, modeLabel } — Duelo por código
  //   online: { kind:'duel'|'reto', result, myScore, opponentScore, modeLabel, rival:{name,avatar} }
  //   player: { name, avatar }                        — sesión, si existe
  function buildModel(input) {
    input = input || {};
    var player = input.player && input.player.name ? { name: String(input.player.name), avatar: input.player.avatar } : null;
    var accuracy = clampInt(input.accuracy);
    var streak = clampInt(input.streak);
    var m = { variant: 'standard', mode: null, outcome: null, title: 'RESULTADO', pill: '', character: 'hat', player: player,
              main: '', mainLabel: 'ACIERTOS', secondary: '', versus: null, code: null, phrase: '' };

    var o = input.online, d = input.duel;
    if (o) {
      m.variant = o.kind === 'reto' ? 'reto' : 'duel';
      m.mode = m.variant;
      m.outcome = o.result === 'win' || o.result === 'loss' ? o.result : 'draw';
      m.title = outcomeTitle(m.outcome);
      m.pill = (m.variant === 'reto' ? 'RETO' : 'DUELO ONLINE') + (o.modeLabel ? ' · ' + String(o.modeLabel).toUpperCase() : '');
      m.character = m.outcome === 'win' ? 'victory' : m.outcome === 'loss' ? 'defeat' : 'hat';
      m.versus = { me: clampInt(o.myScore), them: clampInt(o.opponentScore),
                   rival: o.rival && o.rival.name ? { name: String(o.rival.name), avatar: o.rival.avatar } : null };
      m.main = m.versus.me + ' — ' + m.versus.them;
      m.mainLabel = '';
      m.phrase = o.phrase ? String(o.phrase).replace(/\s+/g, ' ').trim().slice(0, 200) : '';
      return m;
    }
    if (d) {
      m.variant = 'duel';
      m.pill = 'DUELO' + (d.modeLabel ? ' · ' + String(d.modeLabel).toUpperCase() : '');
      if (d.role === 'creator') {
        m.outcome = 'created'; m.title = 'TE RETO A UN DUELO'; m.character = 'hat';
        m.main = String(input.scoreStr || (clampInt(d.score) + '/' + clampInt(d.totalQ)));
        m.mainLabel = 'MI PUNTUACIÓN'; m.code = d.code ? String(d.code) : null;
      } else {
        m.outcome = d.result === 'win' || d.result === 'loss' ? d.result : 'draw';
        m.title = outcomeTitle(m.outcome);
        m.character = m.outcome === 'win' ? 'victory' : m.outcome === 'loss' ? 'defeat' : 'hat';
        m.versus = { me: clampInt(d.myScore), them: clampInt(d.opponentScore), rival: null };
        m.main = m.versus.me + ' — ' + m.versus.them; m.mainLabel = '';
      }
      return m;
    }

    m.main = String(input.scoreStr || '');
    m.secondary = accuracy + ' % de efectividad' + (streak > 0 ? ' · racha máxima ' + streak : '');
    m.pill = String(input.modeName || '').toUpperCase().replace(/^MODO ESTÁNDAR$/, 'ESTÁNDAR');
    m.mode = input.modeId && MODE_BG[input.modeId] ? input.modeId : (MODE_BY_NAME[String(input.modeName || '').toLowerCase()] || null);
    // Frase de Sir Edwards tal como se ve en la tarjeta final (ya elegida por la app; aquí solo se dibuja).
    m.phrase = input.phrase ? String(input.phrase).replace(/\s+/g, ' ').trim().slice(0, 200) : '';

    if (input.lucidez) {
      var L = input.lucidez;
      m.variant = 'lucidez';
      m.outcome = L.failed ? 'loss' : 'win';
      // Textos ya existentes en la app: sellos del resultado (ENIGMA SIN RESOLVER / LUCIDEZ ABSOLUTA /
      // ENIGMA RESUELTO) y desenlace narrativo (LA MENTE HA CEDIDO) cuando se cae antes del enigma.
      m.title = L.perfect ? 'LUCIDEZ ABSOLUTA' : !L.failed ? 'ENIGMA RESUELTO' : (L.phase === 'final' ? 'ENIGMA SIN RESOLVER' : 'LA MENTE HA CEDIDO');
      // Personaje según hasta dónde llegó el jugador (existente en cada fase).
      var ph = L.failed ? L.phase : 'final';
      m.character = ph === 1 ? 'phase1' : ph === 2 ? 'phase2' : ph === 3 ? 'phase3' : 'enigma';
      m.mainLabel = 'ACIERTOS';
      return m;
    }
    if (input.characterState === 'victory' || input.characterState === 'defeat') {
      m.variant = input.characterState;
      m.outcome = input.characterState === 'victory' ? 'win' : 'loss';
      m.title = outcomeTitle(m.outcome);
      m.character = input.characterState;
    }
    return m;
  }

  // ------------------------------------------------------------ utilidades
  var imgCache = {};
  function loadImage(srcs, timeoutMs) {
    var key = srcs.join('|');
    if (imgCache[key]) return imgCache[key];
    imgCache[key] = new Promise(function (resolve) {
      var i = 0, done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, timeoutMs || 5000);
      function next() {
        if (done) return;
        if (i >= srcs.length) { done = true; clearTimeout(timer); resolve(null); return; }
        var img = new Image();
        img.onload = function () { if (!done) { done = true; clearTimeout(timer); resolve(img); } };
        img.onerror = next;
        img.src = srcs[i++];
      }
      next();
    }).then(function (img) { if (!img) delete imgCache[key]; return img; });
    return imgCache[key];
  }
  function characterImage(key) {
    var base = CHARACTER_ASSETS[key]; if (!base) return Promise.resolve(null);
    return loadImage([base + '.webp']);
  }
  function avatarImage(value) {
    var entry = null;
    try { if (window.SEQAvatars) entry = window.SEQAvatars.entryForGlyph(window.SEQAvatars.resolveGlyph(value)); } catch (e) {}
    return loadImage([entry ? entry.src : AVATAR_DIR + 'sombrero.png']);
  }

  var FONT_LOADS = ['800 60px "Playfair Display"', '700 30px "Playfair Display"', 'italic 600 30px "Playfair Display"',
                    '900 90px Inter', '700 26px Inter', '600 26px Inter'];
  function ensureFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var all = Promise.all(FONT_LOADS.map(function (f) { return document.fonts.load(f).catch(function () {}); }));
    var limit = new Promise(function (r) { setTimeout(r, 2500); });
    return Promise.race([all, limit]).then(function () {});
  }
  var SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
  var SANS = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function spaced(ctx, text, cx, y, gap) {
    var chars = String(text).split(''), ws = chars.map(function (c) { return ctx.measureText(c).width; });
    var total = ws.reduce(function (a, b) { return a + b; }, 0) + gap * Math.max(chars.length - 1, 0);
    var x = cx - total / 2, prev = ctx.textAlign; ctx.textAlign = 'left';
    chars.forEach(function (c, i) { ctx.fillText(c, x, y); x += ws[i] + gap; });
    ctx.textAlign = prev;
    return total;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Reduce el tamaño hasta que el texto quepa en maxW (nunca se sale del lienzo).
  function fitFont(ctx, text, weight, family, startPx, minPx, maxW, gap) {
    var px = startPx;
    for (; px > minPx; px -= 2) {
      ctx.font = weight + ' ' + px + 'px ' + family;
      if (ctx.measureText(text).width + (gap || 0) * text.length <= maxW) break;
    }
    ctx.font = weight + ' ' + px + 'px ' + family;
    return px;
  }
  function drawContain(ctx, img, x, y, w, h) {
    var r = Math.min(w / img.width, h / img.height), dw = img.width * r, dh = img.height * r;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    return { w: dw, h: dh };
  }
  function diamond(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = color; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
  }
  function rule(ctx, cx, y, half, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - half, y); ctx.lineTo(cx - 16, y); ctx.moveTo(cx + 16, y); ctx.lineTo(cx + half, y); ctx.stroke();
    diamond(ctx, cx, y, 11, color);
  }

  // Avatar circular sobre disco de pergamino con anillo (el avatar es un objeto con transparencia y se ve
  // mal sobre oscuro). opts.frame reservado para futuros marcos PvP (se dibujaría alrededor del anillo).
  function drawAvatar(ctx, img, cx, cy, r, opts) {
    opts = opts || {};
    ctx.save();
    var g = ctx.createRadialGradient(cx, cy - r * .25, r * .1, cx, cy, r);
    g.addColorStop(0, '#fff7e0'); g.addColorStop(1, '#e9d4a0');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    if (!img && opts.initial) {
      ctx.fillStyle = BRAND.navy; ctx.textAlign = 'center'; ctx.font = '800 ' + Math.round(r * 1.0) + 'px ' + SERIF;
      ctx.fillText(String(opts.initial).charAt(0).toUpperCase(), cx, cy + r * 0.34);
    }
    if (img) {
      var pad = r * .16, box = (r - pad) * 2, k = Math.min(box / img.width, box / img.height);
      var w = img.width * k, h = img.height * k;
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    }
    ctx.lineWidth = 5; ctx.strokeStyle = opts.ring || BRAND.gold; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- dibujo
  function drawBackground(ctx, theme, variant) {
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, theme.bg[0]); g.addColorStop(1, theme.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Halo tras la zona del personaje.
    var glow = ctx.createRadialGradient(CX, 640, 20, CX, 640, 520);
    glow.addColorStop(0, theme.glow); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    // Marco doble dorado + esquinas.
    ctx.lineWidth = 3; ctx.strokeStyle = theme.ring; ctx.globalAlpha = .85; roundRect(ctx, 30, 30, W - 60, H - 60, 26); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha = .35; roundRect(ctx, 48, 48, W - 96, H - 96, 18); ctx.stroke();
    ctx.globalAlpha = 1;
    [[48, 48], [W - 48, 48], [48, H - 48], [W - 48, H - 48]].forEach(function (p) { diamond(ctx, p[0], p[1], 14, theme.ring); });
  }

  function drawHeader(ctx, theme, model, hatImg) {
    var y = 96;
    if (hatImg) { drawContain(ctx, hatImg, CX - 46, 74, 92, 92); } else { diamond(ctx, CX, 118, 26, theme.ring); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = BRAND.goldLight;
    fitFont(ctx, 'SIR EDWARDS QUIZ', '800', SERIF, 44, 30, 800, 6);
    spaced(ctx, 'SIR EDWARDS QUIZ', CX, 218, 6);
    rule(ctx, CX, 244, 150, BRAND.gold);
    if (model.pill) {
      ctx.font = '700 24px ' + SANS;
      var label = model.pill, gap = 3, tw = 0;
      for (var i = 0; i < label.length; i++) tw += ctx.measureText(label[i]).width + gap;
      // Recorta la etiqueta si es demasiado larga para la pastilla.
      while (tw > W - 260 && label.length > 6) { label = label.slice(0, -2); tw = 0; for (var j = 0; j < label.length; j++) tw += ctx.measureText(label[j]).width + gap; label += '…'; tw += 20; break; }
      // Icono del modo (suelto) dentro de la pastilla, a la izquierda del nombre.
      var mi = model._modeIcon, iw = mi ? 50 : 0, ig = mi ? 10 : 0;
      var pw = tw + 56 + iw + ig, ph = 46, py = 268;
      roundRect(ctx, CX - pw / 2, py, pw, ph, ph / 2);
      ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = theme.ring; ctx.globalAlpha = .7; ctx.stroke(); ctx.globalAlpha = 1;
      var x0 = CX - (iw + ig + tw) / 2;
      if (mi) drawContain(ctx, mi, x0 - 4, py - 6, iw + 4, iw + 4);
      ctx.fillStyle = BRAND.cream; spaced(ctx, label, x0 + iw + ig + tw / 2, py + 31, gap);
    }
    return y;
  }

  function drawTitle(ctx, theme, model, y) {
    ctx.textAlign = 'center';
    ctx.fillStyle = BRAND.cream;
    var px = fitFont(ctx, model.title, '800', SERIF, 128, 46, W - 200, 2);
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillText(model.title, CX, y);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // Subrayado en el color de acento de la variante.
    var w = Math.min(ctx.measureText(model.title).width * 0.5, 320);
    ctx.strokeStyle = theme.accent; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(CX - w / 2, y + 20); ctx.lineTo(CX + w / 2, y + 20); ctx.stroke();
    return px;
  }

  function drawCharacter(ctx, img, box, theme) {
    if (!img) {
      // Sin asset: monograma dorado "SE" en un medallón (la composición no queda vacía).
      var cy = box.y + box.h / 2, r = Math.min(box.h, box.w) * 0.36;
      ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = (theme && theme.ring) || BRAND.gold;
      ctx.beginPath(); ctx.arc(CX, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.globalAlpha = .5; ctx.beginPath(); ctx.arc(CX, cy, r + 14, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = BRAND.goldLight; ctx.textAlign = 'center'; ctx.font = '800 ' + Math.round(r * 0.9) + 'px ' + SERIF;
      ctx.fillText('SE', CX, cy + r * 0.3); ctx.restore();
      return;
    }
    // Suelo suave bajo el personaje para "asentarlo" en la composición.
    var sh = ctx.createRadialGradient(CX, box.y + box.h - 6, 10, CX, box.y + box.h - 6, box.w * .45);
    sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(CX - box.w, box.y + box.h - 60, box.w * 2, 90);
    drawContain(ctx, img, CX - box.w / 2, box.y, box.w, box.h);
  }

  function drawPlayerChip(ctx, theme, player, avatarImg, y, radius) {
    if (!player) return false;
    ctx.font = '700 ' + (radius && radius < 56 ? 34 : 38) + 'px ' + SERIF;
    var name = player.name, maxW = 560;
    while (ctx.measureText(name).width > maxW && name.length > 3) name = name.slice(0, -2);
    if (name !== player.name) name += '…';
    var tw = ctx.measureText(name).width, r = radius || 56, total = r * 2 + 22 + tw, x0 = CX - total / 2;
    drawAvatar(ctx, avatarImg, x0 + r, y, r, { ring: theme.ring, initial: player.name });
    ctx.fillStyle = BRAND.cream; ctx.textAlign = 'left'; ctx.fillText(name, x0 + r * 2 + 22, y + 13); ctx.textAlign = 'center';
    return true;
  }

  // Frase de Sir Edwards: cursiva serif entre comillas, centrada, hasta 3 líneas.
  // phraseLayout mide; drawPhraseLayout dibuja con la última línea en yEnd.
  function phraseLayout(ctx, text) {
    var maxW = 840, px = 38, lines;
    function wrap() {
      ctx.font = 'italic 600 ' + px + 'px ' + SERIF;
      var words = ('«' + text + '»').split(' '), out = [], cur = '';
      words.forEach(function (w) {
        var t = cur ? cur + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
      });
      if (cur) out.push(cur);
      return out;
    }
    lines = wrap();
    while (lines.length > 3 && px > 28) { px -= 2; lines = wrap(); }
    return { lines: lines, px: px, lh: Math.round(px * 1.22) };
  }
  function drawPhraseLayout(ctx, L, yEnd) {
    ctx.font = 'italic 600 ' + L.px + 'px ' + SERIF;
    ctx.textAlign = 'center'; ctx.fillStyle = BRAND.cream;
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    var top = yEnd - (L.lines.length - 1) * L.lh;
    L.lines.forEach(function (ln, k) { ctx.fillText(ln, CX, top + k * L.lh); });
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    return top;
  }

  function drawScore(ctx, theme, model, y, startPx) {
    ctx.textAlign = 'center'; ctx.fillStyle = BRAND.cream;
    fitFont(ctx, model.main, '900', SANS, startPx || 104, 60, W - 240, 0);
    ctx.fillText(model.main, CX, y);
    var ny = y + 46;
    if (model.mainLabel) { ctx.fillStyle = theme.accent; ctx.font = '700 24px ' + SANS; spaced(ctx, model.mainLabel, CX, ny, 5); ny += 44; }
    if (model.secondary) { ctx.fillStyle = BRAND.creamDim; ctx.font = '600 27px ' + SANS; ctx.fillText(model.secondary, CX, ny); }
  }

  function drawVersus(ctx, theme, model, imgs, y) {
    // Dos columnas (tú / rival) con avatar y nombre cuando existen; el marcador va en el centro.
    var v = model.versus, cols = [
      { x: 230, label: model.player ? model.player.name : 'TÚ', img: imgs.me, show: !!model.player || !!v.rival },
      { x: W - 230, label: v.rival ? v.rival.name : 'RIVAL', img: imgs.rival, show: !!v.rival }
    ];
    cols.forEach(function (c) {
      if (!c.show) return;
      drawAvatar(ctx, c.img, c.x, y, 76, { ring: theme.ring, initial: c.label });
      ctx.fillStyle = BRAND.cream; ctx.textAlign = 'center';
      var nm = String(c.label); ctx.font = '700 30px ' + SERIF;
      while (ctx.measureText(nm).width > 250 && nm.length > 3) nm = nm.slice(0, -2);
      if (nm !== c.label) nm += '…';
      ctx.fillText(nm, c.x, y + 130);
    });
    ctx.fillStyle = BRAND.cream; ctx.textAlign = 'center';
    fitFont(ctx, model.main, '900', SANS, 112, 56, 380, 0);
    ctx.fillText(model.main, CX, y + 34);
    if (!cols[0].show && !cols[1].show) {
      // Duelo por código: no hay identidad del rival, solo marcador (más centrado y grande).
      ctx.fillStyle = theme.accent; ctx.font = '700 24px ' + SANS; spaced(ctx, 'TÚ  ·  RIVAL', CX, y + 86, 5);
    }
  }

  function drawFooter(ctx, theme) {
    ctx.textAlign = 'center'; ctx.fillStyle = BRAND.gold;
    // 2.0: sin lema al pie (el nombre del juego ya va arriba); solo el rombo decorativo.
    diamond(ctx, CX, H - 90, 9, theme.ring);
  }

  // Compone la tarjeta. Devuelve Promise<canvas>. Nunca lanza por un asset o
  // una fuente que falte: simplemente lo omite.
  function render(model) {
    var theme = themeFor(model);
    var modeIcon = MODE_BG[model.mode] ? MODE_BG[model.mode].icon : null;
    var loads = [
      ensureFonts(),
      characterImage('hat'),
      model.character === 'hat' ? null : characterImage(model.character),
      model.player ? avatarImage(model.player.avatar) : null,
      model.versus && model.versus.rival ? avatarImage(model.versus.rival.avatar) : null,
      modeIcon ? loadImage([MODE_ICON_DIR + modeIcon + '.webp']) : null
    ];
    return Promise.all(loads).then(function (r) {
      var hat = r[1], charImg = r[2] || (model.character === 'hat' ? hat : null), meImg = r[3], rivalImg = r[4];
      model._modeIcon = r[5] || null;
      var canvas = document.createElement('canvas');
      canvas.width = W * SCALE; canvas.height = H * SCALE;
      var ctx = canvas.getContext('2d'); ctx.scale(SCALE, SCALE);

      drawBackground(ctx, theme, model.variant);
      drawHeader(ctx, theme, model, hat);
      drawTitle(ctx, theme, model, 432);

      if (model.versus) {
        // Duelo / Reto: personaje más pequeño y fila de enfrentamiento.
        if (model.phrase) {
          var LV = phraseLayout(ctx, model.phrase);
          var yEndV = 922, topV = yEndV - (LV.lines.length - 1) * LV.lh;
          drawCharacter(ctx, charImg, { y: 470, w: 540, h: Math.max(220, Math.min(380, topV - LV.px - 24 - 470)) }, theme);
          drawPhraseLayout(ctx, LV, yEndV);
          drawVersus(ctx, theme, model, { me: meImg, rival: rivalImg }, (model.player || model.versus.rival) ? 1048 : 1090);
        } else {
        drawCharacter(ctx, charImg, { y: 480, w: 540, h: 380 }, theme);
        drawVersus(ctx, theme, model, { me: meImg, rival: rivalImg }, (model.player || model.versus.rival) ? 1010 : 1060);
        }
        if (model.code) { /* solo el creador de un duelo por código; ver rama siguiente */ }
      } else {
        var big = model.character === 'hat';
        if (model.phrase && !model.code) {
          // Con frase: el personaje cede altura según las líneas de la frase; debajo, jugador y puntuación.
          var hasP = !!model.player;
          var L = phraseLayout(ctx, model.phrase);
          var yEnd = hasP ? 950 : 1010;
          var topBase = yEnd - (L.lines.length - 1) * L.lh;
          var boxH = Math.max(220, Math.min(420, topBase - L.px - 24 - 470));
          var hatH = Math.min(boxH, 300);
          drawCharacter(ctx, charImg, big ? { y: 470 + (boxH - hatH) / 2, w: 500, h: hatH } : { y: 470, w: 560, h: boxH }, theme);
          drawPhraseLayout(ctx, L, yEnd);
          if (hasP) drawPlayerChip(ctx, theme, model.player, meImg, 1030, 40);
          drawScore(ctx, theme, model, hasP ? 1150 : 1120, 88);
        } else {
        drawCharacter(ctx, charImg, big ? { y: 500, w: 520, h: 330 } : { y: 476, w: 600, h: 420 }, theme);
        var hasChip = drawPlayerChip(ctx, theme, model.player, meImg, model.code ? 930 : 950);
        drawScore(ctx, theme, model, model.code ? (hasChip ? 1085 : 1070) : (hasChip ? 1112 : 1090));
        }
        if (model.code) {
          ctx.font = '800 40px ui-monospace, Menlo, Consolas, monospace';
          var cw = ctx.measureText(model.code).width + 70;
          roundRect(ctx, CX - cw / 2, 1150, cw, 66, 33); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = theme.ring; ctx.stroke();
          ctx.fillStyle = BRAND.cream; ctx.fillText(model.code, CX, 1194);
        }
      }
      drawFooter(ctx, theme);
      return canvas;
    });
  }

  // Texto que acompaña a la imagen al compartir. Puro (sin DOM); mismo tono que el resto del juego.
  var SHARE_URL = 'https://siredwards88.github.io/sir-edwards-quiz/';
  function shareText(d) {
    d = d || {};
    var head, remark;
    if (d.online) {
      head = 'Sir Edwards Quiz · ' + (d.online.kind === 'reto' ? 'Reto' : 'Duelo online') + ': ' + clampInt(d.online.me) + ' a ' + clampInt(d.online.them) + '.';
      remark = d.online.result === 'win' ? 'Victoria. Sir Edwards asiente con discreción.'
        : d.online.result === 'loss' ? 'Derrota. Sir Edwards prefiere mirar hacia otro lado.'
        : 'Empate. Nadie gana, nadie se salva.';
    } else {
      var acc = clampInt(d.accuracy);
      head = 'Sir Edwards Quiz · ' + (d.modeName || 'Partida') + ': ' + (d.scoreStr || '0') + ' aciertos (' + acc + ' %).';
      remark = acc >= 90 ? 'Sir Edwards está impresionado. Cosa rara.'
        : acc >= 60 ? 'Sir Edwards ha levantado una ceja. No es poco.'
        : 'Sir Edwards prefiere no comentarlo.';
    }
    return head + '\n' + remark + '\n¿Te atreves a superarlo? ' + SHARE_URL;
  }

  window.SEQShareCard = { buildModel: buildModel, render: render, shareText: shareText, THEMES: THEMES, SIZE: { w: W, h: H, scale: SCALE } };
})();
