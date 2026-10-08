// SirEdwards Quiz — Pregunta del nombre (2.2). Script clásico.
//
// Quien entra por primera vez (y quien sigue con el nombre genérico «Jugador-xxxx» que le puso el servidor) debe decir cómo
// quiere que le llamen antes de empezar: así Sir Edwards puede dirigirse a él por su nombre (presentación de los Encargos, etc.)
// y los amigos ven un nombre de verdad. Se puede cambiar luego en Ajustes → Cuenta. El servidor guarda el nombre con
// PATCH /me (SEQOnline.setDisplayName); este módulo solo valida, pregunta y avisa cuando termina.
// La llama src/ui/intro.js cuando la pantalla de cuenta se ha cerrado (SEQNamePrompt.maybeAsk).

const SEQNamePrompt = (function () {
  'use strict';

  var MIN = 2, MAX = 16;   // 16: el límite con el que Sir Edwards se dirige al jugador por su nombre (ver encargos-intro-core.js)

  // El nombre genérico que asigna el servidor al crear la cuenta («Jugador-» + 4 caracteres) o «Jugador» a secas.
  function isDefaultName(raw) {
    var s = String(raw == null ? '' : raw).trim();
    return s === '' || /^jugador(-[0-9a-z]{3,8})?$/i.test(s);
  }

  // → { ok: true, name } o { ok: false, msg } (msg con el tono de Sir Edwards).
  function validate(raw) {
    var s = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    if (!s) return { ok: false, msg: 'Un nombre, por favor. Aunque sea inventado.' };
    if (s.length < MIN) return { ok: false, msg: 'Eso es una inicial, no un nombre.' };
    if (s.length > MAX) return { ok: false, msg: 'Máximo ' + MAX + ' caracteres. Sir Edwards tiene memoria, no paciencia.' };
    if (!/[\p{L}]/u.test(s)) return { ok: false, msg: 'Incluye alguna letra, que esto no es una matrícula.' };
    if (/https?:|www\.|@|\.(com|es|net|org)\b|[<>{}\[\]\\\/]/i.test(s)) return { ok: false, msg: 'Un nombre sin direcciones ni símbolos raros, gracias.' };
    if (isDefaultName(s)) return { ok: false, msg: 'Ese es el nombre que te dieron por defecto. Algo más personal.' };
    return { ok: true, name: s };
  }

  var busy = false;

  function el(id) { return document.getElementById(id); }
  function setErr(msg, showSkip) {
    var e = el('name-error'); if (e) { e.textContent = msg || ''; e.hidden = !msg; }
    var sk = el('name-skip'); if (sk) sk.hidden = !showSkip;
  }

  function maybeAsk(next) {
    var done = function () { try { if (typeof next === 'function') next(); } catch (e) {} };
    try {
      var s = window.SEQOnline && SEQOnline.session && SEQOnline.session();
      var modal = el('name-modal');
      if (!s || !modal || !isDefaultName(s.display_name)) { done(); return; }
      var input = el('name-input');
      if (input) input.value = '';
      setErr('', false);
      modal.style.display = 'flex';
      modal._next = done;
    } catch (e) { done(); }
  }

  function close() {
    var modal = el('name-modal'); if (!modal) return;
    modal.style.display = 'none';
    var next = modal._next; modal._next = null;
    if (typeof next === 'function') next();
  }

  var greeted = null;
  function greet(name) {
    var modal = el('name-modal'); var t = el('name-title'); var form = modal && modal.querySelector('form');
    var lead = modal && modal.querySelector('.welcome-lead');
    if (!modal || !t || !form || !lead) { close(); return; }
    var hero = modal.querySelector('.name-hero');
    greeted = { t: t.textContent, l: lead.textContent, h: hero ? hero.getAttribute('src') : null };
    if (hero) { hero.setAttribute('src', 'assets/ui/sombrero-saludo.webp'); hero.classList.add('name-hero-greet'); }
    t.textContent = 'Encantado, ' + name + '.';
    lead.textContent = 'Intentaré recordarlo.';
    form.hidden = true;
    setTimeout(function () { restore(); close(); }, 1800);
  }
  function restore() {
    var modal = el('name-modal'); if (!modal || !greeted) return;
    var t = el('name-title'), form = modal.querySelector('form'), lead = modal.querySelector('.welcome-lead');
    if (t) t.textContent = greeted.t; if (lead) lead.textContent = greeted.l; if (form) form.hidden = false;
    var hero = modal.querySelector('.name-hero');
    if (hero && greeted.h) { hero.setAttribute('src', greeted.h); hero.classList.remove('name-hero-greet'); }
    greeted = null;
  }

  function submit() {
    if (busy) return;
    var input = el('name-input');
    var v = validate(input ? input.value : '');
    if (!v.ok) { setErr(v.msg, false); if (input) { try { input.focus(); } catch (e) {} } return; }
    busy = true; setErr('', false);
    var btn = el('name-btn'); if (btn) btn.disabled = true;
    var p;
    try { p = SEQOnline.setDisplayName(v.name); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(function () {
      busy = false; if (btn) btn.disabled = false;
      // Confirmación en la propia tarjeta (un toast se perdería bajo la bienvenida): se lee y se cierra sola.
      greet(v.name);
    }).catch(function (err) {
      busy = false; if (btn) btn.disabled = false;
      var offline = err && (err.network || err.code === 'network');
      setErr(offline ? 'Sin conexión, no puedo anotarte. Inténtalo de nuevo.' : 'No he podido guardar el nombre. Inténtalo de nuevo.', true);
    });
  }

  // «Ahora no»: solo aparece tras un fallo de red o del servidor, para no dejar a nadie atrapado. Se volverá a preguntar al abrir.
  function skip() { close(); }

  return { validate: validate, isDefaultName: isDefaultName, maybeAsk: maybeAsk, submit: submit, skip: skip, MIN: MIN, MAX: MAX };
})();

window.SEQNamePrompt = SEQNamePrompt;
