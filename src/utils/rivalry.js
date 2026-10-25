// SirEdwards Quiz — Rivalidades: la serie entre dos jugadores (la calcula el servidor: GET /duels/:id, /challenges/:id y /players/:id)
// y qué frase de Sir Edwards toca según ella. Lógica PURA salvo la rotación de frases, que reutiliza la de los duelos.
//
// El servidor manda `serie`: { partidas, victorias, derrotas, empates, recientes: [{ id, resultado, margen, fecha }] } desde la óptica de
// quien pregunta, con `recientes` del más nuevo al más viejo. null si nunca han jugado un duelo 1 contra 1. Aquí no se inventa nada:
// sin serie (o si el duelo que se mira no es el último de la serie) no hay frase con contexto y se usan las de siempre.
// Script clásico; necesita src/data/rivalry-phrases.js y, para la rotación, src/data/duel-phrases.js.
(function () {
  'use strict';

  var REVANCHA_MS = 7 * 24 * 3600 * 1000;

  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; }
  function valid(s) { return !!s && typeof s === 'object' && Array.isArray(s.recientes) && n(s.partidas) > 0; }

  // Cuántos resultados seguidos de `what` hay al principio de la lista.
  function run(list, what) { var c = 0; while (c < list.length && list[c] && list[c].resultado === what) c++; return c; }

  // Qué situación describe el duelo `gameId`, que acaba de terminar con `res` ('win' | 'loss' | 'draw'). null si ninguna.
  function context(serie, res, gameId) {
    if (!valid(serie) || !gameId || (res !== 'win' && res !== 'loss')) return null;
    var rec = serie.recientes;
    // Solo cuando este duelo es el último de la serie: al reabrir un resultado antiguo, «ahora mismo» ya sería otra historia.
    if (!rec[0] || rec[0].id !== gameId || rec[0].resultado !== res) return null;
    var prior = rec.slice(1), equal = n(serie.partidas) >= 4 && n(serie.victorias) === n(serie.derrotas);
    if (res === 'win') {
      if (run(prior, 'loss') >= 2) return 'win_remontada';
      if (1 + run(prior, 'win') >= 3) return 'win_racha';
      // Revancha cobrada: el duelo anterior fue una derrota tuya y fue hace poco (si no, «disfrutó una sola partida» no tiene gracia).
      if (run(prior, 'loss') === 1 && n(rec[0].fecha) - n(prior[0].fecha) <= REVANCHA_MS) return 'win_revancha';
      return equal ? 'win_igualados' : null;
    }
    if (1 + run(prior, 'loss') >= 3) return 'loss_racha';
    if (run(prior, 'win') >= 2) return 'loss_cae_racha';
    return equal ? 'loss_igualados' : null;
  }

  // La frase (ya con el nombre del rival) o '' si no toca ninguna con contexto. Estable por partida y sin repetirse en la bolsa.
  function phrase(serie, res, rivalName, gameId) {
    var key = context(serie, res, gameId), P = window.SEQRivalryPhrases, D = window.SEQDuelPhrases;
    if (!key || !P || !P.PHRASES[key] || !D || typeof D.bag !== 'function') return '';
    var list = P.PHRASES[key], name = rivalName || 'tu rival';
    var text = D.bag('rival_' + key, list, gameId, function () { return list[0]; });
    return String(text || '').replace(/\{rival\}/g, name);
  }

  // Resumen para pintar: «3 victorias, 1 derrota y 1 empate» y las últimas partidas (de la más antigua a la más nueva).
  // null si hay menos de 2 duelos (con uno solo no hay «serie»).
  function summary(serie, maxDots) {
    if (!valid(serie) || n(serie.partidas) < 2) return null;
    var w = n(serie.victorias), l = n(serie.derrotas), d = n(serie.empates), parts = [];
    parts.push(w + (w === 1 ? ' victoria' : ' victorias'));
    parts.push(l + (l === 1 ? ' derrota' : ' derrotas'));
    if (d) parts.push(d + (d === 1 ? ' empate' : ' empates'));
    var text = parts.length === 3 ? parts[0] + ', ' + parts[1] + ' y ' + parts[2] : parts[0] + ' y ' + parts[1];
    var dots = serie.recientes.slice(0, maxDots || 5).map(function (r) { return r.resultado; }).reverse();
    return { text: text, dots: dots, w: w, l: l, d: d };
  }

  // Marcador de la serie para pintar: «Edu 2 – 4 Bruno», los empates si los hay y las últimas partidas en V/D/E.
  // `esc` es el escapador de HTML de quien llama; todo texto de jugadores pasa por él.
  function html(sm, myName, rivalName, esc) {
    var dots = sm.dots.map(function (x) {
      var k = x === 'win' ? 'w' : x === 'loss' ? 'l' : 'd';
      return '<i class="sd-' + k + '" aria-hidden="true">' + (k === 'w' ? 'V' : k === 'l' ? 'D' : 'E') + '</i>';
    }).join('');
    return '<div class="seq-d-serie"><div class="seq-d-serie-score"><span class="seq-d-serie-n">' + esc(myName || 'Tú') + '</span><b>' + sm.w + ' – ' + sm.l + '</b>' +
      '<span class="seq-d-serie-n">' + esc(rivalName || 'Rival') + '</span></div>' +
      (sm.d ? '<div class="seq-d-serie-d">' + sm.d + (sm.d === 1 ? ' empate' : ' empates') + '</div>' : '') +
      '<div class="seq-d-serie-dots">' + dots + '</div></div>';
  }

  window.SEQRivalry = { context: context, phrase: phrase, summary: summary, html: html };
})();
