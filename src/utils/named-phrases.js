// 2.2 — Decide cuándo una frase de Sir Edwards lleva el nombre del jugador. Sin interfaz ni persistencia del juego:
// solo lógica pura (se prueba en test/named-phrases.test.mjs) + un tope semanal/diario en una clave propia (no se sincroniza).
// Uso: SEQNamed.tryPick(poolKey) → frase con el nombre o null (entonces se usa la frase normal de siempre).
const SEQNamed = (function () {
  'use strict';
  var CAP_KEY = 'siredwards_quiz_named_caps_v1';
  var sessionUsed = false;

  // Devuelve el nombre listo para insertar en una frase, o null si no encaja (entonces la frase sale sin nombre).
  // Solo letras (con acentos), un espacio o guion como mucho, 3-16 caracteres, sin genéricos ni repeticiones raras.
  function nombreSeguro(raw) {
    var s = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    if (s.length < 3 || s.length > 16) return null;
    if (!/^[\p{L}]+(?:[ -][\p{L}]+)?$/u.test(s)) return null;
    if (/(.)\1\1/iu.test(s)) return null;
    if (/^(jugador|player|invitado|an[oó]nimo|usuario|sir edwards|edwards)$/i.test(s)) return null;
    var letters = s.replace(/[^\p{L}]/gu, '');
    var up = letters.toUpperCase(), low = letters.toLowerCase();
    if (letters === up || letters === low) {                       // todo en un caso: se normaliza a «Marta»
      return s.toLowerCase().replace(/(^|[ -])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); });
    }
    if (!/^\p{Lu}/u.test(s) || /\p{Lu}.*\p{Lu}/u.test(s.replace(/[ -]\p{Lu}/gu, ''))) return null;   // «MaRtA»
    return s;
  }

  function isoWeek(d) {
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return t.getUTCFullYear() + '-W' + Math.ceil(((t - y0) / 86400000 + 1) / 7);
  }
  function capId(cap, now) {
    return cap === 'semana' ? isoWeek(now) : cap === 'dia' ? now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate() : null;
  }
  function readCaps() { try { return JSON.parse(localStorage.getItem(CAP_KEY)) || {}; } catch (e) { return {}; } }
  function writeCaps(c) { try { localStorage.setItem(CAP_KEY, JSON.stringify(c)); } catch (e) {} }

  // ctx opcional (pruebas): { name, rnd, now, caps (objeto en memoria en vez de localStorage), phrases, rules }
  function tryPick(poolKey, ctx) {
    ctx = ctx || {};
    try {
      var phrases = ctx.phrases || (typeof NAMED_PHRASES !== 'undefined' ? NAMED_PHRASES : null);
      var rules = ctx.rules || (typeof NAMED_RULES !== 'undefined' ? NAMED_RULES : null);
      var list = phrases && phrases[poolKey], rule = rules && rules[poolKey];
      if (!list || !list.length || !rule || sessionUsed) return null;
      var raw = ctx.name !== undefined ? ctx.name
        : (window.SEQOnline && SEQOnline.session && SEQOnline.session() || {}).display_name;
      var name = nombreSeguro(raw);
      if (!name) return null;
      var rnd = ctx.rnd || Math.random, now = ctx.now || new Date();
      var caps = ctx.caps || readCaps(), id = capId(rule.cap, now);
      if (id && caps[poolKey] === id) return null;                      // ya salió esta semana / hoy
      if (rnd() >= rule.p) return null;
      var text = list[Math.min(list.length - 1, Math.floor(rnd() * list.length))].replace(/\{nombre\}/g, name);
      sessionUsed = true;
      if (id) { caps[poolKey] = id; if (!ctx.caps) writeCaps(caps); }
      return text;
    } catch (e) { return null; }
  }
  function resetSession() { sessionUsed = false; }

  return { nombreSeguro: nombreSeguro, tryPick: tryPick, resetSession: resetSession };
})();
if (typeof window !== 'undefined') window.SEQNamed = SEQNamed;
