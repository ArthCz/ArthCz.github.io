/**
 * roster.js — junta o elenco com os dados sincronizados
 * ---------------------------------------------------------------------------
 * O elenco fixo de cada jogo vive em src/data/site.js; os ranks, a pontuação e
 * as partidas vivem em src/data/ranks.json (gerado pelo `npm run sync`).
 * Aqui os dois viram uma lista só, sem repetir informação em dois lugares.
 *
 * Regra:
 *  - jogo com `roster` vazio   → usa o elenco que o sync gerou;
 *  - jogo com `roster` cheio   → usa exatamente essa lista e completa cada
 *                                personagem com os números do sync (casados
 *                                pelo nome) — os campos escritos à mão têm
 *                                prioridade sobre os automáticos.
 */
import { games } from './site.js';
import ranks from './ranks.json';

export function rosterOf(game) {
  const synced = ranks.games?.[game.slug]?.roster ?? [];
  const fixed = game.roster ?? [];

  if (!fixed.length) return synced;

  return fixed.map((item) => {
    const match = synced.find((char) => char.name === item.name) ?? {};
    return { ...match, ...item };
  });
}

/** Quando os ranks foram lidos dos perfis (ISO), ou null se nunca rodou. */
export const ranksSyncedAt = ranks.syncedAt ?? null;

export const gamesWithRoster = games.map((game) => ({ game, roster: rosterOf(game) }));
