// SirEdwards Quiz — audio (reproducción, ajustes de sonido y comportamiento sin conexión).
// Extraído de index.html (bloque «AUDIO»): getAudioCtx, playSound, playCorrectSound (progresión por racha),
// updateUrgencySound/stopUrgencySound/playUrgencyTick. Script clásico (scope global compartido): usa `store`
// en tiempo de ejecución (ajuste store.sound = 'off' silencia todo).
//
// 2.0 — sonidos grabados: acierto y fallo usan muestras (assets/audio/*.mp3, en la caché sin conexión).
// Se descargan y decodifican una vez; mientras no estén listas (o si fallan) suena el sintetizado de siempre.
// La progresión por racha se conserva: a partir de 5 seguidas, el acorde/arpegio de siempre se suma, más
// suave, encima de la muestra.
// Acierto (cierre 2.0): dos notas de mazo cálidas, Sol4→Do5, ~0,4 s y sin agudos (antes dominaba un pitido de ~1,5 kHz).

let audioCtx = null;

const SAMPLE_FILES = { correct: 'assets/audio/correct.mp3', wrong: 'assets/audio/wrong.mp3' };
const sampleBuffers = {};
let samplesRequested = false;
function loadSamples() {
  if (samplesRequested || typeof fetch !== 'function') return;
  samplesRequested = true;
  let ctx; try { ctx = getAudioCtx(); } catch (e) { return; }
  Object.keys(SAMPLE_FILES).forEach((name) => {
    fetch(SAMPLE_FILES[name]).then((r) => r.ok ? r.arrayBuffer() : Promise.reject())
      .then((buf) => new Promise((ok, ko) => ctx.decodeAudioData(buf, ok, ko)))
      .then((decoded) => { sampleBuffers[name] = decoded; })
      .catch(() => {});
  });
}
// Devuelve true si ha sonado la muestra; false para que el llamante use el sonido sintetizado.
function playSample(name, volume) {
  const buf = sampleBuffers[name];
  if (!buf) { loadSamples(); return false; }
  try {
    const ctx = getAudioCtx();
    const src = ctx.createBufferSource(); const g = ctx.createGain();
    src.buffer = buf; g.gain.value = volume == null ? 0.9 : volume;
    src.connect(g); g.connect(ctx.destination); src.start();
    return true;
  } catch (e) { return false; }
}
// El navegador solo deja crear/usar el audio tras un toque: se precargan las muestras en el primer toque.
['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, function once() {
  document.removeEventListener(ev, once, true);
  try { if (!store || store.sound !== 'off') loadSamples(); } catch (e) { loadSamples(); }
}, true));
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
function playSound(type) { 
  if (store.sound === 'off') return;
  if (type === 'bad' && playSample('wrong', 0.85)) return;
  if (type === 'ok' && playSample('correct', 0.9)) return;
  if (type === 'win') { playWinFanfare(); return; }
  try { const ctx = getAudioCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); const now = ctx.currentTime; if (type === 'ok') { osc.frequency.setValueAtTime(523.25, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); } else if (type === 'bad') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(180, now); osc.frequency.exponentialRampToValueAtTime(110, now + 0.2); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); } else if (type === 'win') { const notes = [523.25, 659.25, 783.99, 1046.50]; notes.forEach((freq, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'triangle'; o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(freq, now + i * 0.08); g.gain.setValueAtTime(0.15, now + i * 0.08); g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.25); o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.25); }); } else if (type === 'eye') { /* Sonido propio para el logro secreto "Lucidez Absoluta": un acorde grave y disonante que se abre hacia un armónico agudo, distinto del "win" habitual. */ const notes = [220, 261.63, 415.30, 880]; notes.forEach((freq, i) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = i === notes.length - 1 ? 'sine' : 'triangle'; o.connect(g); g.connect(ctx.destination); const start = now + i * 0.12; o.frequency.setValueAtTime(freq, start); g.gain.setValueAtTime(0.001, start); g.gain.exponentialRampToValueAtTime(0.12, start + 0.05); g.gain.exponentialRampToValueAtTime(0.01, start + 0.5); o.start(start); o.stop(start + 0.5); }); } } catch(e) {} 
}
// Variante de playSound('ok') que hace evolucionar el mismo motivo musical
// según la racha de aciertos consecutivos (answerStreak / currentGame.streak
// en Cálculo Mental), en vez de sonar siempre igual. No sustituye a
// playSound(): 'bad', 'win' y 'eye' se mantienen exactamente igual que antes;
// esta función solo cubre el caso 'ok'.
function playCorrectSound(streak) {
  if (store.sound === 'off') return;
  const s = Math.max(1, Number(streak) || 1);
  // 2.0: la muestra grabada es la base; la progresión de racha (5+) se suma encima, más baja.
  const sampled = playSample('correct', 0.9);
  if (sampled && s < 5) return;
  const layer = sampled ? 0.55 : 1; // con muestra, el acorde acompaña sin tapar
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime + (sampled ? 0.08 : 0);
    if (s < 3) {
      // Racha 1-2: el "ding" normal de siempre (idéntico al playSound('ok') previo).
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (s < 5) {
      // Racha 3-4: mantiene exactamente el tono normal, sin armónico agudo extra.
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (s < 8) {
      // Racha 5-7: acorde suave en Do (misma tonalidad que la muestra Sol→Do), sinusoidal: acompaña sin chillar.
      const notes = sampled ? [392.00, 523.25, 659.25] : [659.25, 830.61, 987.77];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = sampled ? 'sine' : 'triangle'; o.connect(g); g.connect(ctx.destination);
        const start = now + i * 0.03;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.12 * layer, start);
        g.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
        o.start(start); o.stop(start + 0.22);
      });
    } else {
      // Racha 8+: pequeña celebración, arpegio de 4 notas en Do (sinusoidal con la muestra).
      const notes = sampled ? [392.00, 523.25, 659.25, 783.99] : [659.25, 830.61, 987.77, 1318.51];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = sampled ? 'sine' : 'triangle'; o.connect(g); g.connect(ctx.destination);
        const start = now + i * 0.06;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.exponentialRampToValueAtTime(0.14 * layer, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.01, start + 0.28);
        o.start(start); o.stop(start + 0.28);
      });
    }
  } catch(e) {}
}

// ====== Tic-tac de urgencia (<10s) ======
// Componente único y reutilizable para los 4 relojes con cuenta atrás:
// Contrarreloj, Cálculo Mental, Fase III de Lucidez Mental y el Acertijo
// Final. No toca la lógica de ninguno de esos temporizadores: cada uno ya
// calcula su propio "segundos restantes" en su tick habitual, y solo se le
// añade una llamada a updateUrgencySound(secondsLeft) con ese valor.
const URGENT_TIME_THRESHOLD = 10;
let urgencySoundLastSecond = null; // evita repetir el mismo tic varias veces dentro del mismo segundo

function updateUrgencySound(secondsLeft) {
  const s = Math.ceil(Number(secondsLeft));
  if (!Number.isFinite(s)) return;
  if (store.sound === 'off') { stopUrgencySound(); return; }
  if (s > URGENT_TIME_THRESHOLD) {
    // Por encima del umbral: silencio. Reseteamos para que, si el tiempo
    // vuelve a bajar de 10s más tarde (p. ej. tras una racha de aciertos
    // que sube el reloj y luego vuelve a bajar), el tic-tac se retome bien.
    urgencySoundLastSecond = null;
    return;
  }
  if (s <= 0) { stopUrgencySound(); return; }
  if (s === urgencySoundLastSecond) return; // ya sonó este segundo exacto
  urgencySoundLastSecond = s;
  playUrgencyTick(s);
}

function stopUrgencySound() {
  urgencySoundLastSecond = null;
}

function playUrgencyTick(secondsLeft) {
  if (store.sound === 'off') return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // 2.0: «tic-tac» de reloj de bolsillo en vez de un pitido cuadrado: un golpecito de ruido filtrado
    // (la madera/metal del mecanismo) más un tono corto y apagado. Tic agudo / tac grave, como antes.
    const isTic = secondsLeft % 2 === 0;
    const vol = secondsLeft <= 3 ? 0.5 : 0.34;
    const len = 0.035;
    const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ctx.createBufferSource(); src.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = isTic ? 3200 : 2100; bp.Q.value = 6;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(bp); bp.connect(g); g.connect(ctx.destination);
    src.start(now);
    const o = ctx.createOscillator(); const og = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(isTic ? 1750 : 1250, now);
    og.gain.setValueAtTime(vol * 0.12, now); og.gain.exponentialRampToValueAtTime(0.0008, now + 0.05);
    o.connect(og); og.connect(ctx.destination); o.start(now); o.stop(now + 0.06);
  } catch (e) {}
}

// 2.0: fanfarria de victoria algo más rica que el arpegio plano: mismas notas (Do-Mi-Sol-Do), cada una con
// su octava suave, la última sostenida y un eco breve. Mismo momento de disparo (playSound('win')).
function playWinFanfare() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = 0.9;
    const echo = ctx.createDelay(); echo.delayTime.value = 0.16;
    const fb = ctx.createGain(); fb.gain.value = 0.22;
    out.connect(ctx.destination); out.connect(echo); echo.connect(fb); fb.connect(echo); fb.connect(ctx.destination);
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const start = now + i * 0.09, last = i === notes.length - 1, dur = last ? 0.7 : 0.26;
      [[freq, 'triangle', 0.14], [freq * 2, 'sine', 0.04]].forEach(([f, type, vol]) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, start);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0008, start + dur);
        o.connect(g); g.connect(out); o.start(start); o.stop(start + dur + 0.02);
      });
    });
  } catch (e) {}
}

// ====== Campanillas (eventos de Sir Edwards y récords) ======
// Timbre de campanilla de mostrador: parciales inarmónicos con ataque seco y caída exponencial.
// «Evento»: dos golpes (sol agudo y do agudo). «Récord»: tres golpes ascendentes. Respetan el interruptor de sonido.
const BELL_PARTIALS = [[1, 1], [2.0, 0.45], [2.76, 0.3], [5.4, 0.12]];
function playBellNote(freq, delay, vol, ringS) {
  const ctx = getAudioCtx();
  const t0 = ctx.currentTime + delay;
  const tau = ringS / 4; // caída: cuatro constantes de tiempo a lo largo del sonido
  const norm = BELL_PARTIALS.reduce((n, p) => n + p[1], 0);
  BELL_PARTIALS.forEach(([ratio, amp]) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * ratio, t0);
    const peak = vol * amp / norm;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.002);
    g.gain.setTargetAtTime(0.0001, t0 + 0.002, tau);
    o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + ringS + 0.05);
  });
}
function playSirEventSound() {
  if (store.sound === 'off') return;
  try { playBellNote(1568, 0, 0.5, 1.4); playBellNote(2093, 0.18, 0.45, 1.4); } catch (e) {}
}
function playRecordSound() {
  if (store.sound === 'off') return;
  try { [1319, 1568, 2093].forEach((f, i) => playBellNote(f, i * 0.16, 0.5 - 0.04 * i, 1.6)); } catch (e) {}
}

// ====== Música de menús («The Earl's Waiting Room») ======
// Suena solo fuera de la partida (inicio, Jugar, Duelos, Estadísticas, Logros, Ajustes), a volumen bajo y
// con fundidos; se pausa al entrar en una partida o un duelo en directo y al salir de la app.
// Preferencia propia por dispositivo («Música» en Ajustes), independiente de los efectos de sonido.
// No se descarga al instalar: el navegador la pide la primera vez que suena (tras el primer toque, que es
// cuando los móviles dejan reproducir audio). El volumen ya viene bajo en el propio archivo porque en
// iPhone el volumen de un <audio> no se puede cambiar desde la página.
// iPhone/iPad (iOS 16.4+): sesión de audio «ambient» = respeta el interruptor de silencio y se mezcla con
// la música que el jugador tenga puesta, en vez de cortarla. Sin soporte, no hace nada.
try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
const MUSIC_SRC = 'assets/audio/menu-theme.mp3';
const MUSIC_KEY = 'siredwards_quiz_v2_0_music';
const MUSIC_VOLUME = 0.55;
let music = null, musicUnlocked = false, musicFade = null;
// Estado propio de la música (no depende de la vista en que estés):
let musicHeld = false;     // retenida por una escena que pide silencio (la Presentación): pausa con fundido y, al soltarla, reanuda
let musicFailed = false;   // el archivo no ha podido cargarse (sin conexión): no se reintenta en cada cambio de vista, solo al volver la red
// iPhone/iPad no dejan cambiar el volumen de un <audio> desde la página (siempre vale 1): allí no hay fundidos, solo pausar y reproducir.
const musicCanFade = (() => { try { const a = new Audio(); a.volume = 0.5; return a.volume === 0.5; } catch (e) { return false; } })();

function musicEnabled() { try { return localStorage.getItem(MUSIC_KEY) !== 'off'; } catch (e) { return true; } }
function musicInMenus() {
  if (document.visibilityState === 'hidden') return false;
  const game = document.getElementById('view-game');
  const duel = document.getElementById('seq-duel-root');
  if (game && game.classList.contains('active')) return false;
  if (duel && duel.classList.contains('seq-d-playing')) return false;
  return true;
}
function musicFadeTo(target, ms, done) {
  if (!music) return;
  clearInterval(musicFade); musicFade = null;
  if (!musicCanFade) { if (done) done(); return; }   // sin control de volumen: el cambio es inmediato
  const from = music.volume, steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  musicFade = setInterval(() => {
    i++;
    try { music.volume = Math.max(0, Math.min(1, from + (target - from) * (i / steps))); } catch (e) {}
    if (i >= steps) { clearInterval(musicFade); musicFade = null; if (done) done(); }
  }, 50);
}
function syncMusic() {
  const want = musicUnlocked && musicEnabled() && musicInMenus() && !musicHeld;
  if (!want) {
    if (music && !music.paused) musicFadeTo(0, 450, () => { try { music.pause(); } catch (e) {} });
    return;
  }
  if (musicFailed) return;   // sin archivo no se insiste: se reintenta cuando vuelve la conexión
  if (!music) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { musicFailed = true; return; }   // la música no se guarda sin conexión
    music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.preload = 'auto';
    music.addEventListener('error', () => { musicFailed = true; });
    try { music.volume = 0; } catch (e) {}
  }
  if (music.paused) {
    const p = music.play();
    if (p && p.then) p.then(() => musicFadeTo(MUSIC_VOLUME, 1400)).catch((e) => { if (e && e.name === 'NotSupportedError') musicFailed = true; });
    else musicFadeTo(MUSIC_VOLUME, 1400);
  } else if (music.volume < MUSIC_VOLUME) {
    musicFadeTo(MUSIC_VOLUME, 600);
  }
}
// Al volver la conexión, si el archivo no pudo cargarse, se vuelve a intentar con un reproductor nuevo.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('online', () => {
  if (!musicFailed) return;
  musicFailed = false;
  if (music) { try { music.pause(); } catch (e) {} music = null; }
  syncMusic();
});
// Escenas que piden silencio (la Presentación de Sir Edwards): retener = la música se pausa con fundido y se queda así, aunque cambie
// la vista; soltar = vuelve a sonar con fundido (si el jugador la tiene activada). Pares retener/soltar, nunca uno solo.
function holdMusic() { musicHeld = true; syncMusic(); }
function releaseMusic() { musicHeld = false; syncMusic(); }
if (typeof window !== 'undefined') window.SEQMusic = { hold: holdMusic, release: releaseMusic, isHeld: () => musicHeld, canFade: musicCanFade };
function updateMusicButtons() {
  const control = document.getElementById('music-control');
  if (!control) return;
  const v = musicEnabled() ? 'on' : 'off';
  control.querySelectorAll('.segmented-btn').forEach((btn) => {
    const on = btn.dataset.value === v;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function changeMusic(v) {
  try { localStorage.setItem(MUSIC_KEY, v === 'off' ? 'off' : 'on'); } catch (e) {}
  musicUnlocked = true; // el toque en el propio botón ya cuenta como interacción
  updateMusicButtons();
  syncMusic();
}
// Primer toque en cualquier sitio: a partir de aquí el navegador deja sonar la música. Se escuchan también
// los eventos de «soltar» (pointerup/touchend/click): en móvil son los que cuentan como gesto para reproducir.
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, function unlockMusic() {
  document.removeEventListener(ev, unlockMusic, true);
  if (musicUnlocked) return;
  musicUnlocked = true;
  syncMusic();
}, true));
document.addEventListener('visibilitychange', syncMusic);
document.addEventListener('DOMContentLoaded', () => {
  updateMusicButtons();
  if (typeof MutationObserver === 'undefined') return;
  const obs = new MutationObserver(syncMusic);
  document.querySelectorAll('.view').forEach((v) => obs.observe(v, { attributes: true, attributeFilter: ['class'] }));
  const duel = document.getElementById('seq-duel-root');
  if (duel) obs.observe(duel, { attributes: true, attributeFilter: ['class'] });
});
