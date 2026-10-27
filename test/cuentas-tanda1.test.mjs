import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const online = read('src/online/online.js');
const html = read('index.html');

test('lo que el Worker ignora no se reenvía en bucle', () => {
  assert.match(online, /noteIgnored\(pending, prog\)/);
  assert.match(online, /ignored\.medals\.indexOf\(id\) === -1/);
  assert.match(online, /Math\.max\(sync\.seen\.best, ignored\.best\)/);
});
test('cuentas sin preguntas: no existen el aviso de progreso ni los botones de combinar', () => {
  for (const x of ['openMigration', 'skipMigration', 'closeMigration', 'prepareLocalReset', 'seq-migrate-modal', 'Asociar mi progreso']) {
    assert.ok(!online.includes(x), 'online.js ya no tiene ' + x);
    assert.ok(!html.includes(x), 'index.html ya no tiene ' + x);
  }
});
test('no existe «Reiniciar progreso» ni la zona de peligro', () => {
  assert.ok(!html.includes('resetAppData'));
  assert.ok(!html.includes('class="settings-section settings-danger-zone"'));
});
test('cuenta distinta en el móvil: se descarta lo local y se carga la nueva, sin combinar', () => {
  assert.match(online, /!same && hasLocal && \(otherBefore \|\| hasOnline\)\) \{ wipeLocalForOtherAccount\(/);
  assert.match(online, /function wipeLocalForOtherAccount\(/);
  assert.ok(!/Progreso combinado/.test(online));
});
test('una unión pendiente se completa sola al abrir la app y al volver la red', () => {
  assert.match(online, /sync\.migration === 'skipped'\) \{ sync\.migration = 'pending'/);
  assert.match(online, /if \(mergeDue\(\)\) doMerge\(\);/);
  assert.match(online, /accountHadProgress: function \(\) \{ return loginHadProgress \|\| /);
});
test('sin sincronizar a mitad de partida y aviso de caducidad en el gate', () => {
  assert.match(online, /if \(account && !playingNow\(\)\) scheduleSync\(1500/);
  assert.match(online, /Tu sesión ha caducado[^']*'\); \/\/ también en el gate/);
  assert.match(online, /!ui\.expired\) setMsg\(''\)/);
});
test('cerrar sesión sube lo pendiente y avisa si no pudo, y da de baja el push', () => {
  assert.match(online, /Cerrar sesión igual/);
  assert.match(online, /SEQPush\.disable\(\)/);
});
test('el nombre y la bienvenida esperan a que se cargue la cuenta', () => {
  assert.match(read('src/ui/intro.js'), /SEQOnline\.migrationPending/);
});

test('auditoría 3, tanda 1 (cliente)', () => {
  assert.match(online, /t\[k\] < sync\.base\[k\]\) storeLost = true/);                      // #5 store por debajo de la base: la cuenta repone
  assert.match(online, /store = getDefaultStore\(\)/);                                    // #6 vaciar el store en memoria al cambiar de cuenta
  assert.match(online, /played\[c\[0\]\] = Math\.max\(0, cur - sent\)/);                 // #10 lo jugado durante el vuelo
  assert.match(online, /reason !== 'manual' && playingNow\(\)/);                          // #12 sin lote a media partida
  assert.match(online, /data\.error\.retry_after/);                                        // #13 Retry-After del cuerpo
  assert.match(online, /whenIdle\(function \(\) \{ syncNow\('manual'\)/);                   // #16 esperar al sync en curso
  assert.ok(!/descarga una copia/.test(read('index.html')));                              // #17
  assert.ok(!/se retomará tu cuenta/.test(online));                                       // #15
});
