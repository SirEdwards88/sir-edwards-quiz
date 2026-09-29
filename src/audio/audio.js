// SirEdwards Quiz — audio (reproducción, ajustes de sonido y comportamiento sin conexión).
// Extraído LITERALMENTE de index.html (bloque «AUDIO»), sin cambios de comportamiento: getAudioCtx,
// playSound, playCorrectSound (progresión por racha), updateUrgencySound/stopUrgencySound/playUrgencyTick.
// Script clásico (scope global compartido): usa `store` en tiempo de ejecución (ajuste store.sound).

let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
function playSound(type) { 
  if (store.sound === 'off') return;
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
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
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
      // Racha 5-7: acorde más brillante, sobre las mismas notas del motivo.
      const notes = [659.25, 830.61, 987.77];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'triangle'; o.connect(g); g.connect(ctx.destination);
        const start = now + i * 0.03;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.12, start);
        g.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
        o.start(start); o.stop(start + 0.22);
      });
    } else {
      // Racha 8+: pequeña celebración, arpegio de 4 notas sobre el mismo motivo.
      const notes = [659.25, 830.61, 987.77, 1318.51];
      notes.forEach((freq, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = 'triangle'; o.connect(g); g.connect(ctx.destination);
        const start = now + i * 0.06;
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.01, start + 0.28);
        o.start(start); o.stop(start + 0.28);
      });
    }
  } catch(e) {}
}

// ====== ⏱️ Tic-tac de urgencia (<10s) ======
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    // Alterna "tic" (agudo) y "tac" (grave) en segundos alternos.
    const isTic = secondsLeft % 2 === 0;
    osc.type = 'square';
    osc.frequency.setValueAtTime(isTic ? 1000 : 800, now);
    // En los últimos segundos suena un poco más presente, sin llegar a ser molesto.
    const vol = secondsLeft <= 3 ? 0.09 : 0.06;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
}
