/**
 * sync-feeds.mjs — atualiza src/data/feeds.json
 * ---------------------------------------------------------------------------
 * Busca os clipes mais recentes do canal na Twitch e os Shorts do canal no
 * YouTube, e grava tudo em src/data/feeds.json (lido pelo site).
 *
 *   npm run sync
 *
 * Importante:
 *  - Não há backend, login, chave de API ou token. Só dados públicos do canal.
 *  - Se alguma fonte falhar, o que já estava salvo é mantido — o comando
 *    avisa no terminal e o site continua funcionando com os dados anteriores.
 *  - As APIs usadas são as mesmas que os próprios sites publicam. Se a Twitch
 *    ou o YouTube mudarem algo, o script avisa em vez de inventar conteúdo.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FEEDS = join(ROOT, 'src/data/feeds.json');
const SITE = join(ROOT, 'src/data/site.js');

// ---------------------------------------------------------------------------
// Configuração (ajuste aqui se quiser mais ou menos itens)
const CLIP_COUNT = 6;
const SHORT_COUNT = 6;
const CLIP_WINDOW = 'LAST_MONTH'; // LAST_WEEK | LAST_MONTH | ALL_TIME
// ---------------------------------------------------------------------------

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Lê canal/handle direto de src/data/site.js para não duplicar configuração. */
function readSiteConfig() {
  const source = readFileSync(SITE, 'utf8');
  const channel = source.match(/channel:\s*'([^']+)'/)?.[1];
  const handle = source.match(/handle:\s*'(@[^']+)'/)?.[1];
  if (!channel || !handle) throw new Error('não encontrei `channel` e `handle` em src/data/site.js');
  return { channel, handle };
}

/** Lê o feeds.json atual (usado como reserva quando algo falha). */
function readExisting() {
  if (!existsSync(FEEDS)) return { syncedAt: null, clips: [], shorts: [] };
  try {
    return JSON.parse(readFileSync(FEEDS, 'utf8'));
  } catch {
    return { syncedAt: null, clips: [], shorts: [] };
  }
}

// ---------------------------------------------------------------------------
// Twitch — clipes mais recentes
// ---------------------------------------------------------------------------
async function fetchTwitchClips(channel) {
  const query = `query Clips($login: String!, $limit: Int!, $filter: ClipsFilter) {
    user(login: $login) {
      clips(first: $limit, criteria: { filter: $filter }) {
        edges {
          node {
            id slug url title viewCount createdAt durationSeconds
            thumbnailURL
            game { name }
          }
        }
      }
    }
  }`;

  const request = async (filter) => {
    const response = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: {
        'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko', // client público do site da Twitch
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: channel, limit: 40, filter } }),
    });
    if (!response.ok) throw new Error(`Twitch respondeu ${response.status}`);
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0]?.message ?? 'erro na consulta da Twitch');
    return json.data?.user?.clips?.edges?.map((edge) => edge.node) ?? [];
  };

  let clips = await request(CLIP_WINDOW);
  if (!clips.length) clips = await request('ALL_TIME');

  return clips
    .filter((clip) => clip?.url)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, CLIP_COUNT)
    .map((clip) => ({
      id: clip.id,
      url: clip.url,
      title: clip.title?.trim() || 'Clipe da live',
      thumbnail: clip.thumbnailURL ?? null,
      views: clip.viewCount ?? 0,
      createdAt: clip.createdAt,
      duration: clip.durationSeconds ?? null,
      game: clip.game?.name ?? null,
    }));
}

// ---------------------------------------------------------------------------
// YouTube — Shorts
// ---------------------------------------------------------------------------
function extractInitialData(html) {
  const match =
    html.match(/var ytInitialData = (\{.*?\});<\/script>/s) ??
    html.match(/ytInitialData"\]\s*=\s*(\{.*?\});/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function collectShorts(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (node.shortsLockupViewModel) {
    const short = node.shortsLockupViewModel;
    const endpoint = short.onTap?.innertubeCommand?.reelWatchEndpoint;
    const videoId = endpoint?.videoId ?? null;
    if (videoId) {
      const fallbackTitle = (short.accessibilityText ?? '')
        .replace(/,\s*[\d.,]+\s*(visualiza[çc][õo]es|views)[\s\S]*$/i, '')
        .trim();
      out.push({
        id: videoId,
        url: `https://www.youtube.com/shorts/${videoId}`,
        title: short.overlayMetadata?.primaryText?.content?.trim() || fallbackTitle || 'Short do canal',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/frame0.jpg`,
      });
    }
  }
  for (const value of Object.values(node)) collectShorts(value, out);
  return out;
}

async function fetchYouTubeShorts(handle) {
  const response = await fetch(`https://www.youtube.com/${handle}/shorts`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
  });
  if (!response.ok) throw new Error(`YouTube respondeu ${response.status}`);
  const data = extractInitialData(await response.text());
  if (!data) throw new Error('não consegui ler os dados do YouTube');

  const seen = new Set();
  return collectShorts(data)
    .filter((short) => (seen.has(short.id) ? false : seen.add(short.id)))
    .slice(0, SHORT_COUNT);
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
const previous = readExisting();
const feeds = { syncedAt: previous.syncedAt ?? null, clips: previous.clips ?? [], shorts: previous.shorts ?? [] };
const problems = [];

try {
  const { channel, handle } = readSiteConfig();
  console.log(`Sincronizando @${channel} (Twitch) e ${handle} (YouTube)…\n`);

  try {
    const clips = await fetchTwitchClips(channel);
    if (clips.length) {
      feeds.clips = clips;
      console.log(`  Twitch   ${clips.length} clipe(s)`);
      for (const clip of clips.slice(0, 3)) console.log(`           · ${clip.title} (${clip.game ?? 'sem categoria'})`);
    } else {
      problems.push('a Twitch não retornou clipes');
    }
  } catch (error) {
    problems.push(`Twitch: ${error.message}`);
  }

  try {
    const shorts = await fetchYouTubeShorts(handle);
    if (shorts.length) {
      feeds.shorts = shorts;
      console.log(`\n  YouTube  ${shorts.length} Short(s)`);
      for (const short of shorts.slice(0, 3)) console.log(`           · ${short.title}`);
    } else {
      problems.push('o YouTube não retornou Shorts');
    }
  } catch (error) {
    problems.push(`YouTube: ${error.message}`);
  }
} catch (error) {
  problems.push(error.message);
}

// A data exibida no site só avança se a leitura das fontes deu certo.
if (!problems.length) feeds.syncedAt = new Date().toISOString();

writeFileSync(FEEDS, `${JSON.stringify(feeds, null, 2)}\n`, 'utf8');
console.log('\nGravado em src/data/feeds.json');

if (problems.length) {
  console.log('\nAtenção:');
  for (const problem of problems) console.log(`  - ${problem} (mantive os dados anteriores)`);
}
console.log(`  clipes salvos: ${feeds.clips.length} · shorts salvos: ${feeds.shorts.length}`);
