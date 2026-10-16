/**
 * sync-ranks.mjs — atualiza src/data/ranks.json
 * ---------------------------------------------------------------------------
 * Busca os ranks e a pontuação de cada personagem nos perfis públicos do
 * ArthCz e grava tudo em src/data/ranks.json (lido pelo site).
 *
 *   npm run sync
 *
 * Street Fighter 6 — perfil público sincronizado pela Capcom:
 *   https://sfstats.app/players/arthcz-3640020287  (API pública, sem login)
 *   → rank, LP/MR, partidas e aproveitamento de cada personagem.
 *
 * Tekken 8 — Wavu Wank (rating da comunidade, dados de replay oficiais):
 *   https://wank.wavu.wiki/player/33jE68FB8bFd
 *   → partidas, vitórias/derrotas e o rating do personagem.
 *   O rank do jogo (Garyu) e o Tekken Prowess só existem no perfil do ewgf.gg,
 *   que bloqueia qualquer leitura automática (Cloudflare). Esses dois campos
 *   ficam em src/data/site.js, à mão, e o site junta os dois na hora de exibir.
 *
 * Importante:
 *  - Não há backend, login, chave de API ou token. Só dados públicos.
 *  - As imagens (retratos e selos de rank) são baixadas uma única vez, do
 *    material oficial do jogo, e ficam em public/roster/.
 *  - Se alguma fonte falhar, o que já estava salvo é mantido — o comando avisa
 *    no terminal e o site continua funcionando com os dados anteriores.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp'); // já vem com o Astro (otimização de imagem)

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RANKS = join(ROOT, 'src/data/ranks.json');
const SITE = join(ROOT, 'src/data/site.js');
const ROSTER_DIR = join(ROOT, 'public/roster');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const headers = (extra = {}) => ({ 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8', ...extra });

// ---------------------------------------------------------------------------
// Street Fighter 6 — tabela de ranks da Capcom
// ---------------------------------------------------------------------------
// O número vem direto do perfil (leagueRank) e é o mesmo do arquivo oficial de
// imagem do rank (rankNN_s.png). Confere com os selos oficiais baixados.
const SF6_TIERS = [
  [6, 'Iron'],
  [11, 'Bronze'],
  [16, 'Silver'],
  [21, 'Gold'],
  [26, 'Platinum'],
  [31, 'Diamond'],
];

const SF6_SINGLES = {
  36: 'Master',
  37: 'Legend',
  39: 'New Challenger',
  40: 'High Master',
  41: 'Grand Master',
  42: 'Ultimate Master',
};

/** Traduz o número do rank para o nome oficial (ex.: 33 → "Diamond ★3"). */
function sf6RankLabel(id) {
  if (id == null) return null;
  if (SF6_SINGLES[id]) return SF6_SINGLES[id];
  for (const [first, tier] of SF6_TIERS) {
    if (id >= first && id <= first + 4) return `${tier} ★${id - first + 1}`;
  }
  return null;
}

/** Número "de pontuação": MR nos ranks de Master, LP nos demais. */
function sf6Score(league) {
  if (!league) return null;
  if (league.leagueRank >= 36) return league.mr ? `${league.mr.toLocaleString('pt-BR')} MR` : null;
  return league.lp ? `${league.lp.toLocaleString('pt-BR')} LP` : null;
}

// ---------------------------------------------------------------------------
// Retratos — o material oficial do jogo é a fonte
// ---------------------------------------------------------------------------
const WIKIS = {
  sf6: { host: 'streetfighter.fandom.com', referer: 'https://streetfighter.fandom.com/' },
  t8: { host: 'tekken.fandom.com', referer: 'https://tekken.fandom.com/' },
};

// Nomes que na wiki têm título diferente do nome no jogo.
const WIKI_TITLES = {
  Terry: 'Terry Bogard',
  Mai: 'Mai Shiranui',
  'E.Honda': 'E. Honda',
  'C. Viper': 'C. Viper',
};

const slugify = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Arte do personagem na wiki do jogo (splash art, mesmo estilo dos retratos já usados). */
async function wikiPortrait(wiki, title) {
  const api =
    `https://${wiki.host}/api.php?action=query&titles=${encodeURIComponent(title)}` +
    '&prop=pageimages&format=json&pithumbsize=500&redirects=1&piprop=thumbnail';
  const response = await fetch(api, { headers: headers() });
  if (!response.ok) return null;
  const json = await response.json();
  const page = Object.values(json.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined || !page.thumbnail?.source) return null;
  const image = await fetch(page.thumbnail.source, {
    headers: headers({ Referer: wiki.referer, Accept: 'image/webp,image/*,*/*;q=0.8' }),
  });
  if (!image.ok) return null;
  return Buffer.from(await image.arrayBuffer());
}

/** Material oficial do personagem no site da Capcom (usado como reserva). */
async function capcomPortrait(url) {
  const response = await fetch(url, {
    headers: headers({ Referer: 'https://www.streetfighter.com/6/buckler/' }),
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

async function saveWebp(buffer, file, transform) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(buffer).trim({ threshold: 1 }).resize(transform).webp({ quality: 84 }).toFile(file);
}

// ---------------------------------------------------------------------------
// Leitura da configuração
// ---------------------------------------------------------------------------
function readSite() {
  const source = readFileSync(SITE, 'utf8');
  const sf6 = source.match(/https:\/\/sfstats\.app\/players\/[^\s'"]+/)?.[0];
  const t8 = source.match(/https:\/\/ewgf\.gg\/player\/[^\s'"]+/)?.[0];
  if (!sf6 || !t8) throw new Error('não encontrei os links de perfil em src/data/site.js');
  // Personagem principal do SF6: declarado à mão em site.js.
  const mainCharacter = source.match(/mainCharacter:\s*['"]([^'"]+)['"]/)?.[1] ?? null;
  return { sf6, t8, mainCharacter };
}

function readExisting() {
  if (!existsSync(RANKS)) return { syncedAt: null, games: {} };
  try {
    return JSON.parse(readFileSync(RANKS, 'utf8'));
  } catch {
    return { syncedAt: null, games: {} };
  }
}

// ---------------------------------------------------------------------------
// Street Fighter 6
// ---------------------------------------------------------------------------
async function syncStreetFighter(profileUrl, declaredMain) {
  const id = profileUrl.match(/-(\d+)$/)?.[1] ?? profileUrl.match(/(\d{6,})/)?.[1];
  if (!id) throw new Error('não consegui o ID do lutador no link do sfstats');

  const response = await fetch(`https://sfstats.app/api/fighters/${id}/stats`, { headers: headers() });
  if (!response.ok) throw new Error(`sfstats respondeu ${response.status}`);
  const stats = await response.json();

  const capcom = stats.capcom ?? {};
  const leagues = new Map((capcom.characterLeagues ?? []).map((l) => [l.character, l]));
  const played = (capcom.characterWinRates ?? []).filter((c) => (c.games ?? 0) > 0 && c.character);
  if (!played.length) throw new Error('o perfil não retornou nenhum personagem jogado');

  // Quem manda é o que está declarado em site.js: o perfil costuma errar.
  const main = declaredMain ?? stats.fighter?.mainCharacter ?? null;
  if (declaredMain && !played.some((c) => c.character === declaredMain)) {
    console.log(`  aviso    "${declaredMain}" não aparece no elenco lido do perfil`);
  }
  const roster = [];

  for (const entry of played) {
    const league = leagues.get(entry.character) ?? null;
    const rankId = league?.leagueRank ?? null;
    const rank = sf6RankLabel(rankId);
    const slug = slugify(entry.character);

    // Selo oficial do rank (baixado uma vez por rank).
    let rankImage = null;
    if (league?.rankBadgeUrl && rankId != null) {
      const file = join(ROSTER_DIR, 'sf6', `rank-${rankId}.webp`);
      if (!existsSync(file)) {
        try {
          const badge = await fetch(league.rankBadgeUrl, {
            headers: headers({ Referer: 'https://www.streetfighter.com/6/buckler/' }),
          });
          if (badge.ok) {
            await saveWebp(Buffer.from(await badge.arrayBuffer()), file, { width: 480, fit: 'inside' });
            console.log(`  selo     rank ${rankId} (${rank ?? '?'})`);
          }
        } catch (error) {
          console.log(`  selo     rank ${rankId}: ${error.message}`);
        }
      }
      if (existsSync(file)) rankImage = `/roster/sf6/rank-${rankId}.webp`;
    }

    // Retrato: o que já existe é mantido; o que falta vem do material do jogo.
    let image = existsSync(join(ROSTER_DIR, 'sf6', `${slug}.webp`))
      ? `/roster/sf6/${slug}.webp`
      : null;
    if (!image) {
      const title = WIKI_TITLES[entry.character] ?? entry.character;
      let art = await wikiPortrait(WIKIS.sf6, title).catch(() => null);
      if (!art && league?.portraitUrl) art = await capcomPortrait(league.portraitUrl).catch(() => null);
      if (art) {
        const file = join(ROSTER_DIR, 'sf6', `${slug}.webp`);
        await saveWebp(art, file, { height: 400, fit: 'inside' });
        image = `/roster/sf6/${slug}.webp`;
        console.log(`  retrato  ${entry.character}`);
      } else {
        console.log(`  retrato  ${entry.character}: não encontrei arte`);
      }
    }

    roster.push({
      name: entry.character,
      slug,
      image,
      rank,
      rankImage,
      score: sf6Score(league),
      games: entry.games,
      rate: entry.winRate == null ? null : Math.round(entry.winRate * 10) / 10,
      main: entry.character === main,
    });
  }

  roster.sort((a, b) => b.games - a.games);
  if (main && !roster.some((c) => c.main)) roster[0].main = true;

  return { source: profileUrl, main, roster };
}

// ---------------------------------------------------------------------------
// Tekken 8 (Wavu Wank)
// ---------------------------------------------------------------------------
// Nome de exibição dos personagens que aparecem no perfil.
const T8_NAMES = { Bryan: 'Bryan Fury' };

async function syncTekken(profileUrl) {
  const id = profileUrl.match(/player\/([^/?#]+)/)?.[1];
  if (!id) throw new Error('não consegui o ID do jogador no link do ewgf');

  const wavuUrl = `https://wank.wavu.wiki/player/${id}`;
  const response = await fetch(wavuUrl, { headers: headers() });
  if (!response.ok) throw new Error(`Wavu Wank respondeu ${response.status}`);
  const html = await response.text();

  // Ratings por personagem.
  const ratings = new Map();
  const ratingRe =
    /<div class="char">([^<]+)<\/div>\s*<div class="mu">μ ([\d.]+)<\/div>\s*<div class="sigma"><sup>σ² ([\d.]+)<\/sup><\/div>\s*<div class="games">(\d+) games<\/div>/g;
  for (const match of html.matchAll(ratingRe)) {
    ratings.set(match[1].trim(), { mu: Number(match[2]), sigma: Number(match[3]), games: Number(match[4]) });
  }
  if (!ratings.size) throw new Error('não encontrei os ratings na página do Wavu Wank');

  // Vitórias/derrotas por personagem (linha a linha da tabela de partidas).
  const record = new Map();
  for (const row of html.matchAll(/<tr[\s\S]*?<\/tr>/g)) {
    const left = row[0].match(/<td class="left">([\s\S]*?)<\/td>/)?.[1];
    if (!left) continue;
    const character = left.match(/<span class="char">([^<]+)<\/span>/)?.[1]?.trim();
    const outcome = left.match(/<span class="(win|lose|draw)">/)?.[1];
    if (!character || !outcome) continue;
    const current = record.get(character) ?? { wins: 0, losses: 0, draws: 0 };
    if (outcome === 'win') current.wins += 1;
    else if (outcome === 'lose') current.losses += 1;
    else current.draws += 1;
    record.set(character, current);
  }

  const roster = [];
  for (const [character, rating] of ratings) {
    const played = record.get(character) ?? { wins: 0, losses: 0, draws: 0 };
    const games = rating.games || played.wins + played.losses + played.draws;
    if (!games) continue;
    // O mesmo critério do perfil que o site linka (ewgf.gg): empates contam
    // como vitória no aproveitamento mostrado.
    const wins = played.wins + played.draws;
    roster.push({
      name: T8_NAMES[character] ?? character,
      slug: slugify(T8_NAMES[character] ?? character),
      image: null,
      rank: null,
      rankImage: null,
      score: null,
      games,
      rate: games ? Math.round((wins / games) * 1000) / 10 : null,
      rating: rating.mu.toLocaleString('pt-BR'),
      main: false,
    });
  }

  roster.sort((a, b) => b.games - a.games);
  if (roster.length) roster[0].main = true;

  return { source: wavuUrl, roster };
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
const previous = readExisting();
const ranks = {
  // A data só avança quando a leitura dá certo (veja o fim do arquivo): assim
  // o site nunca diz "lido hoje" mostrando dados antigos.
  syncedAt: previous.syncedAt ?? null,
  games: { ...(previous.games ?? {}) },
};
const problems = [];

try {
  const { sf6, t8, mainCharacter } = readSite();
  console.log(`Sincronizando ranks de ${sf6} e ${t8}…\n`);

  try {
    const data = await syncStreetFighter(sf6, mainCharacter);
    ranks.games['street-fighter-6'] = data;
    console.log(`  SF6      ${data.roster.length} personagem(ns)`);
    for (const char of data.roster.slice(0, 4)) {
      console.log(`           · ${char.name} — ${char.rank ?? 'sem rank'}${char.score ? ` (${char.score})` : ''} · ${char.games} partidas`);
    }
  } catch (error) {
    problems.push(`Street Fighter 6: ${error.message}`);
  }

  try {
    const data = await syncTekken(t8);
    ranks.games['tekken-8'] = data;
    console.log(`\n  Tekken 8 ${data.roster.length} personagem(ns)`);
    for (const char of data.roster) {
      console.log(`           · ${char.name} — ${char.games} partidas · ${char.rate ?? '?'}% · ${char.rating ?? ''}`);
    }
  } catch (error) {
    problems.push(`Tekken 8: ${error.message}`);
  }
} catch (error) {
  problems.push(error.message);
}

// A data exibida no site só avança se a leitura dos perfis deu certo.
if (!problems.length) ranks.syncedAt = new Date().toISOString();

writeFileSync(RANKS, `${JSON.stringify(ranks, null, 2)}\n`, 'utf8');
console.log('\nGravado em src/data/ranks.json');

if (problems.length) {
  console.log('\nAtenção:');
  for (const problem of problems) console.log(`  - ${problem} (mantive os dados anteriores)`);
}

for (const [slug, game] of Object.entries(ranks.games)) {
  console.log(`  ${slug}: ${game.roster?.length ?? 0} personagem(ns)`);
}
console.log('\nO rank e o Prowess do Tekken 8 vêm do perfil do jogo e continuam em src/data/site.js.');
