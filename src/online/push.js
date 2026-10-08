// SirEdwards Quiz 2.3 — Avisos en el móvil (notificaciones push) para Retos.
//
// Solo avisa de «X te ha retado» y «X ha terminado»: nada de duelos en directo. Es opt-in:
//  · Se activa solo desde Ajustes → Avisos (con un toque tuyo: el permiso nunca salta solo). No hay ofertas ni avisos insistentes.
//  · Solo aparece si el servidor lo tiene encendido (session.features.push) y el navegador lo soporta (Android/Chrome; en iPhone, con la app instalada).
//  · Horario de silencio 23:00–08:00 lo aplica el servidor con tu zona horaria.
//  · Nada de esto toca la clave local de datos del juego.
// La parte pura (urlKey, tzMinutes, linkId) se prueba en test/push.test.mjs.

(function () {
  'use strict';

  var ON_KEY = 'siredwards_quiz_push_on';
  var SYNC_KEY = 'siredwards_quiz_push_sync';
  var DAY = 86400000;
  var ID_RE = /^[0-9A-Z]{10}$/;

  // ---- Lógica pura ------------------------------------------------------------------------
  function urlKey(b64) {   // clave pública VAPID (base64url) → Uint8Array
    var s = String(b64 || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var raw = atob(s), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function tzMinutes(d) { return -(d || new Date()).getTimezoneOffset(); }   // minutos al este de UTC
  function linkId(hash) { var m = /reto=([0-9A-Z]{10})/.exec(String(hash || '')); return m && ID_RE.test(m[1]) ? m[1] : null; }
  function b64u(buf) {
    var u = new Uint8Array(buf), s = '';
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ---- Estado -----------------------------------------------------------------------------
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function session() { try { return window.SEQOnline && SEQOnline.session ? SEQOnline.session() : null; } catch (e) { return null; } }
  function supported() { return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window; }
  function available() { var s = session(); return supported() && !!(s && s.features && s.features.push); }
  function isOn() { return ls(ON_KEY) === '1' && supported() && Notification.permission === 'granted'; }
  var busy = false;

  function subscription() {
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription().then(function (sub) { return { reg: reg, sub: sub }; }); });
  }
  function post(sub) {
    var j = sub.toJSON ? sub.toJSON() : {}, k = j.keys || {};
    return SEQOnline.api('POST', '/me/push', {
      endpoint: sub.endpoint, p256dh: k.p256dh || b64u(sub.getKey('p256dh')), auth: k.auth || b64u(sub.getKey('auth')), tz: tzMinutes()
    });
  }

  function setNote(t) { var n = document.getElementById('push-note'); if (n) n.textContent = t || ''; }
  function paint() {
    var g = document.getElementById('push-group');
    if (!g) return;
    var ok = available();
    g.style.display = ok ? '' : 'none';
    if (!ok) return;
    var on = isOn();
    Array.prototype.forEach.call(document.querySelectorAll('#push-control .segmented-btn'), function (b) {
      var active = (b.getAttribute('data-value') === 'on') === on;
      b.setAttribute('aria-pressed', active ? 'true' : 'false'); b.classList.toggle('active', active);
    });
    if (!busy) {
      setNote('');   // sin frase de apoyo fija: solo se explica al intentar activar y no poder (bloqueado, error)
    }
  }

  // ---- Activar / desactivar ---------------------------------------------------------------
  function enable() {
    if (busy || !available()) return Promise.resolve(false);
    if (Notification.permission === 'denied') {   // ya bloqueado en el navegador: no hay diálogo posible, se explica
      setNote('Tu navegador tiene bloqueados los avisos de este juego. Se cambia en los ajustes del navegador.');
      return Promise.resolve(false);
    }
    busy = true; setNote('Un momento…');
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error('denied');
      return SEQOnline.api('GET', '/push/key').then(function (k) {
        return subscription().then(function (x) {
          return x.sub || x.reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlKey(k.key) });
        });
      });
    }).then(function (sub) { return post(sub); }).then(function () {
      ls(ON_KEY, '1'); ls(SYNC_KEY, String(Date.now())); busy = false; paint(); return true;
    }).catch(function (e) {
      busy = false; ls(ON_KEY, null);
      paint();
      setNote(e && e.message === 'denied' ? '' : 'No se han podido activar los avisos ahora. Inténtalo de nuevo más tarde.');   // rechazar el permiso no es un fallo: sin frase
      return false;
    });
  }
  function disable() {
    if (busy) return Promise.resolve(false);
    busy = true;
    ls(ON_KEY, null);
    return subscription().then(function (x) {
      if (!x.sub) return null;
      var ep = x.sub.endpoint;
      return x.sub.unsubscribe().then(function () { return SEQOnline.api('DELETE', '/me/push', { endpoint: ep }).catch(function () {}); });
    }).catch(function () {}).then(function () { busy = false; paint(); return true; });
  }

  // Una vez al día, si están activados, se vuelve a registrar (zona horaria, o el servidor la había purgado).
  function resync() {
    if (!available() || !isOn()) return;
    if (Date.now() - (Number(ls(SYNC_KEY)) || 0) < DAY) return;
    subscription().then(function (x) {
      if (!x.sub) { ls(ON_KEY, null); paint(); return; }
      return post(x.sub).then(function () { ls(SYNC_KEY, String(Date.now())); });
    }).catch(function () {});
  }

  // ---- Abrir el reto desde la notificación ------------------------------------------------
  function openReto(id) {
    if (!id) return;
    try {
      if (typeof switchTab === 'function') switchTab('duelo');
      if (window.SEQDuels && SEQDuels.open) SEQDuels.open('reto', id);
    } catch (e) {}
  }
  function fromHash() {
    var id = linkId(location.hash);
    if (!id) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    var tries = 0;
    (function wait() { if (session() && window.SEQDuels) openReto(id); else if (++tries < 40) setTimeout(wait, 500); })();
  }

  function start() {
    paint(); setInterval(paint, 4000);
    setTimeout(resync, 6000);
    fromHash();
    window.addEventListener('hashchange', fromHash);
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', function (ev) {
        var d = ev && ev.data;
        if (!d || d.type !== 'seq-push') return;
        if (d.open && d.id && ID_RE.test(String(d.id))) openReto(d.id);
        else if (window.SEQInbox) SEQInbox.check(true);         // app a la vista: que lo recoja el aviso interno
      });
    }
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }

  window.SEQPush = { enable: enable, disable: disable, paint: paint, core: { urlKey: urlKey, tzMinutes: tzMinutes, linkId: linkId } };
})();
