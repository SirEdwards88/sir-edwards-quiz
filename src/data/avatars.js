// SirEdwards Quiz v2.0 — Prompt 3, Fase C → Fase D: sistema de avatares (fuente única).
//
// FASE D (esta versión): la colección base de 12 glifos emoji de Fase C se
// SUSTITUYE por los 6 emblemas ilustrados del universo Sir Edwards, aprobados
// en la ficha de dirección artística cerrada con el usuario (Sombrero, El
// Compendio, Reloj de bolsillo, Lupa, Máscara, Pluma estilográfica). Cada uno
// es un PNG 1024×1024 con transparencia real en assets/avatars/. La "Mente"
// original de la ficha se descartó (no se leía como su concepto ni siquiera
// con contexto) y se sustituyó por "El Compendio" (libro) tras acuerdo con el
// usuario.
//
// IMPORTANTE — ESTO ROMPE EL CONTRATO CERRADO DE FASE C CON EL BACKEND:
// la lista de Fase C reutilizaba a propósito los mismos 12 glifos que el
// backend ya validaba (comentario "Misma lista cerrada que el backend
// (test/auth-profile.test.mjs comprueba que coinciden)"). Los 6 valores
// nuevos ('sombrero','libro','reloj','lupa','mascara','pluma') NO existían en
// esa lista y un backend real construido contra el contrato de Fase C los
// rechazaría o los guardaría como valor no reconocido. Esto es seguro de
// hacer AHORA porque en este repositorio SEQOnline.enabled es false (no hay
// backend real conectado, ver src/online/config.js) — no hay ningún backend
// al que se le esté rompiendo nada todavía. Pero antes de conectar un backend
// real (SEQOnline.enabled = true) hace falta, en el backend: (a) aceptar estos
// 6 valores nuevos como avatares válidos, y (b) decidir qué hacer con avatares
// ya guardados con un glifo antiguo de Fase C (aquí se resuelven al valor por
// defecto 'sombrero' automáticamente, ver resolveGlyph). Esto queda
// documentado en vez de improvisado, siguiendo el mismo criterio que Fase C.
//
// Cargado como script clásico (scope global, sin imports), ANTES de
// src/online/online.js y src/online/duels.js: ambos son consumidores de
// window.SEQAvatars y no mantienen su propia copia del catálogo ni de la
// lógica de render.

(function () {
  'use strict';

  var ASSET_DIR = 'assets/avatars/';

  // 11 emblemas base (los originales + Gato, Pipa, Caballo, Reloj de arena, Sello de lacre y Gramófono) y 7 de logro (el backend los acepta desde su lista AVATARS).
  // Los emblemas base — todos disponibles desde el inicio, sin logros, sin
  // tienda (Nivel 1 del sistema, ver ficha de dirección artística cerrada).
  // "value" es lo que se guarda/envía como avatar del jugador.
  var CATALOG = [
    { id: 'sombrero', value: 'sombrero', short: 'Sombrero', src: ASSET_DIR + 'sombrero.png', label: 'Sombrero de Sir Edwards', base: true },
    { id: 'libro', value: 'libro', short: 'Compendio', src: ASSET_DIR + 'libro.png', label: 'El Compendio', base: true },
    { id: 'reloj', value: 'reloj', short: 'Reloj', src: ASSET_DIR + 'reloj.png', label: 'Reloj de bolsillo', base: true },
    { id: 'lupa', value: 'lupa', short: 'Lupa', src: ASSET_DIR + 'lupa.png', label: 'Lupa', base: true },
    { id: 'mascara', value: 'mascara', short: 'Máscara', src: ASSET_DIR + 'mascara.png', label: 'Máscara', base: true },
    { id: 'gato', value: 'gato', short: 'Gato', src: ASSET_DIR + 'gato.png', label: 'Gato con chistera', base: true },
    { id: 'pipa', value: 'pipa', short: 'Pipa', src: ASSET_DIR + 'pipa.png', label: 'Pipa', base: true },
    { id: 'caballo', value: 'caballo', short: 'Caballo', src: ASSET_DIR + 'caballo.png', label: 'Caballo de ajedrez', base: true },
    { id: 'reloj_arena', value: 'reloj_arena', short: 'Arena', src: ASSET_DIR + 'reloj_arena.png', label: 'Reloj de arena', base: true },
    { id: 'sello', value: 'sello', short: 'Sello', src: ASSET_DIR + 'sello.png', label: 'Sello de lacre', base: true },
    { id: 'gramofono', value: 'gramofono', short: 'Gramófono', src: ASSET_DIR + 'gramofono.png', label: 'Gramófono', base: true },
    // 2.1: avatares que se GANAN con un logro (`medal` = ID del logro; la recompensa se define en MEDAL_REWARDS, medals.js).
    // El servidor solo deja elegirlos a quien tiene el logro. Cualquiera los VE en el perfil de otro jugador.
    { id: 'avatar_siredwards_coleccionista', value: 'avatar_siredwards_coleccionista', short: 'Coleccionista', src: ASSET_DIR + 'avatar_siredwards_coleccionista.png', label: 'SirEdwards Coleccionista', base: false, medal: 'medal_collector_30' },
    { id: 'avatar_siredwards_vengador', value: 'avatar_siredwards_vengador', short: 'Vengador', src: ASSET_DIR + 'avatar_siredwards_vengador.png', label: 'SirEdwards Vengador', base: false, medal: 'duel_revancha' },
    { id: 'avatar_siredwards_imparable', value: 'avatar_siredwards_imparable', short: 'Imparable', src: ASSET_DIR + 'avatar_siredwards_imparable.png', label: 'SirEdwards Imparable', base: false, medal: 'streak_30' },
    { id: 'avatar_siredwards_insensato', value: 'avatar_siredwards_insensato', short: 'Insensato', src: ASSET_DIR + 'avatar_siredwards_insensato.png', label: 'SirEdwards Insensato', base: false, medal: 'duel_apuestas_ultima_locura' },
    { id: 'avatar_siredwards_medianoche', value: 'avatar_siredwards_medianoche', short: 'Medianoche', src: ASSET_DIR + 'avatar_siredwards_medianoche.png', label: 'SirEdwards de Medianoche', base: false, medal: 'noctambulo' },
    { id: 'avatar_siredwards_supremo', value: 'avatar_siredwards_supremo', short: 'Supremo', src: ASSET_DIR + 'avatar_siredwards_supremo.png', label: 'SirEdwards Supremo', base: false, medal: 'all_medals_secret', secret: true },
    { id: 'buho', value: 'buho', short: 'Búho', src: ASSET_DIR + 'buho.png', label: 'Búho universitario', base: false, medal: 'polimata' },
  ];

  // GLYPHS/DEFAULT_GLYPH conservan su nombre histórico de Fase C (para no
  // tener que renombrar cada punto de online.js/duels.js que ya los consume),
  // pero ahora contienen valores de tipo "id de emblema", no caracteres emoji.
  var GLYPHS = CATALOG.map(function (a) { return a.value; });
  var DEFAULT_ENTRY = CATALOG[0]; // 'sombrero': el avatar insignia, símbolo de Sir Edwards.

  function isValidGlyph(v) { return GLYPHS.indexOf(v) !== -1; }

  function entryForGlyph(v) {
    for (var i = 0; i < CATALOG.length; i++) { if (CATALOG[i].value === v) return CATALOG[i]; }
    return null;
  }

  function entryForId(id) {
    for (var i = 0; i < CATALOG.length; i++) { if (CATALOG[i].id === id) return CATALOG[i]; }
    return null;
  }

  // Cualquier valor guardado que no esté en la lista actual (incluida toda la
  // lista de glifos-emoji de Fase C, ya retirada) se resuelve al avatar por
  // defecto. Ver nota de contrato de backend arriba.
  function resolveGlyph(stored) { return isValidGlyph(stored) ? stored : DEFAULT_ENTRY.value; }

  function baseCatalog() { return CATALOG.filter(function (a) { return a.base; }); }

  // Único punto de render de un avatar en toda la app: siempre una <img>
  // sobre el PNG del emblema. Los estilos de tamaño/recorte se definen por
  // contenedor en styles/online.css (.seq-avatar img, .seq-av-btn img, etc.)
  // así no hace falta duplicar tamaños aquí.
  function avatarHTML(stored) {
    var entry = entryForGlyph(resolveGlyph(stored)) || DEFAULT_ENTRY;
    // Si el archivo de un avatar nuevo aún no existe, se muestra el Sombrero en vez de una imagen rota.
    return '<img class="seq-av-img" src="' + entry.src + '" alt="' + entry.label + '" draggable="false" onerror="this.onerror=null;this.src=\'' + DEFAULT_ENTRY.src + '\'">';
  }

  // Nombre corto para mostrar bajo cada avatar en el selector (texto fijo del catálogo).
  function shortName(stored) {
    var entry = entryForGlyph(resolveGlyph(stored)) || DEFAULT_ENTRY;
    return entry.short || entry.label;
  }

  // ¿Puede elegirlo este jugador? Los base, siempre; los de logro, solo con el logro desbloqueado.
  function isAvailable(stored, unlockedMedals) {
    var e = entryForGlyph(stored); if (!e) return false;
    if (!e.medal) return true;
    return Array.isArray(unlockedMedals) && unlockedMedals.indexOf(e.medal) !== -1;
  }
  // Un avatar «secreto» no dice qué logro lo desbloquea (solo que es secreto).
  function isSecret(stored) { var e = entryForGlyph(stored); return !!(e && e.secret); }
  function medalOf(stored) { var e = entryForGlyph(stored); return e && e.medal ? e.medal : null; }

  window.SEQAvatars = {
    isAvailable: isAvailable,
    medalOf: medalOf,
    isSecret: isSecret,
    shortName: shortName,
    CATALOG: CATALOG,
    GLYPHS: GLYPHS,
    DEFAULT_GLYPH: DEFAULT_ENTRY.value,
    DEFAULT_ID: DEFAULT_ENTRY.id,
    baseCatalog: baseCatalog,
    isValidGlyph: isValidGlyph,
    entryForGlyph: entryForGlyph,
    entryForId: entryForId,
    resolveGlyph: resolveGlyph,
    avatarHTML: avatarHTML
  };
})();
