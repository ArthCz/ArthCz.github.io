/**
 * fetch-covers.mjs — baixa as capas da seção "Jogos que eu já joguei"
 * ---------------------------------------------------------------------------
 * Cada jogo de src/data/jogos.js vira um arquivo em public/covers/<slug>.webp,
 * sempre no mesmo formato (300×450, fundo #0f0f12) para a grade não quebrar.
 *
 * Fontes, nesta ordem:
 *   1. Steam — capa vertical oficial (library_600x900.jpg) da ficha do jogo.
 *   2. Wikipédia — imagem da caixa do jogo, para clássicos que não estão na Steam.
 *   3. Nada — o site mostra a inicial do nome no lugar (sem inventar capa).
 *
 * Uso:
 *   npm run capas            baixa só o que falta
 *   npm run capas -- --forcar   baixa tudo de novo
 *   npm run capas -- --so=tekken-8   um jogo específico
 *
 * Depois de rodar, confira o resumo: ele mostra de onde veio cada capa.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

import { jogos } from '../src/data/jogos.js';

const sharp = createRequire(import.meta.url)('sharp'); // já vem com o Astro

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'covers');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// A Wikipédia limita leitura em massa; ali o script se identifica e vai devagar.
const WIKI_UA = 'ArthCzArena/1.0 (site pessoal; https://arthcz.github.io) node:fetch';
const WIKI_WAIT = 2500;

const WIDTH = 300;
const HEIGHT = 450;
const BACKGROUND = '#0f0f12';

const args = process.argv.slice(2);
const force = args.includes('--forcar');
const only = args.find((a) => a.startsWith('--so='))?.split('=')[1];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function getJson(url, headers = {}, wait = 1200) {
  for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
    if (res.ok) {
      const texto = await res.text();
      try {
        return JSON.parse(texto);
      } catch {
        // A Wikipédia responde texto puro quando pede calma.
      }
    }
    if (res.status === 404) return null;
    await sleep(wait * tentativa);
  }
  return null;
}

async function getImage(url, headers = {}) {
  for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 404) return null;
    await sleep(1200 * tentativa);
  }
  return null;
}

/* 1. Steam ------------------------------------------------------------------ */

async function steamAppId(jogo) {
  if (jogo.steamId) return jogo.steamId;
  if (!jogo.steam) return null;

  const url =
    'https://store.steampowered.com/api/storesearch/?term=' +
    encodeURIComponent(jogo.steam) +
    '&l=english&cc=us';

  const json = await getJson(url);
  const items = json?.items ?? [];
  if (!items.length) return null;

  const alvo = normalize(jogo.steam);
  const exato = items.find((item) => normalize(item.name) === alvo);
  return (exato ?? items[0]).id;
}

async function steamCover(jogo) {
  const id = await steamAppId(jogo);
  if (!id) return null;

  const bytes = await getImage(`https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_600x900.jpg`);
  if (bytes) return { bytes, source: `Steam ${id}` };

  // Jogos muito recentes ainda não têm a capa vertical; aí vale o cabeçalho
  // oficial da ficha, desde que o jogo peça (`steamHeader`).
  if (!jogo.steamHeader) return null;

  const info = await getJson(`https://store.steampowered.com/api/appdetails?appids=${id}&l=english`);
  const header = info?.[id]?.data?.header_image;
  if (!header) return null;

  const image = await getImage(header);
  if (!image) return null;

  return { bytes: image, source: `Steam ${id} (cabeçalho)` };
}

/* 2. Wikipédia -------------------------------------------------------------- */

const BAD = /(logo|icon|symbol|commons|question|edit|ambox|audio|\.ogg|\.svg|screenshot|gameplay|wikiquote|wiktionary|portal|stub|padlock|lock|featured|category|disambig)/i;
const GOOD = /(cover|box ?art|capa|pack ?shot|front)/i;

async function wikiCover(jogo) {
  if (!jogo.wiki) return null;

  const headers = { 'User-Agent': WIKI_UA, 'Api-User-Agent': WIKI_UA };

  const arquivos = async (titulo) => {
    const listUrl =
      'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&imlimit=100' +
      '&prop=images&titles=' +
      encodeURIComponent(titulo);

    const list = await getJson(listUrl, headers, WIKI_WAIT);
    const page = Object.values(list?.query?.pages ?? {})[0];
    return (page?.images ?? []).map((item) => item.title);
  };

  // Arquivo fixo (quando a escolha automática pega print ou foto de evento).
  if (jogo.wikiFile) {
    const capa = await baixarArquivo(jogo.wikiFile, headers);
    if (capa) return capa;
  }

  const files = (await arquivos(jogo.wiki)).filter((title) => !BAD.test(title));
  if (!files.length) return null;

  const palavras = normalize(jogo.wiki)
    .split(' ')
    .filter((w) => w.length > 3 && !['video', 'game', 'the'].includes(w));

  const score = (title) => {
    let pontos = GOOD.test(title) ? 10 : 0;
    const nome = normalize(title);
    pontos += palavras.filter((w) => nome.includes(w)).length * 2;
    if (/\.(jpe?g|png|webp)$/i.test(title)) pontos += 1;
    return pontos;
  };

  const escolhidos = [...files].sort((a, b) => score(b) - score(a)).slice(0, 4);

  for (const file of escolhidos) {
    const capa = await baixarArquivo(file, headers);
    if (capa) return capa;
  }

  return null;
}

async function baixarArquivo(file, headers) {
  await sleep(WIKI_WAIT);

  const infoUrl =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|size&iiurlwidth=600&titles=' +
    encodeURIComponent(file);

  const info = await getJson(infoUrl, headers, WIKI_WAIT);
  const pag = Object.values(info?.query?.pages ?? {})[0];
  const imagem = pag?.imageinfo?.[0];
  if (!imagem) return null;

  const url = imagem.thumburl ?? imagem.url;
  if (!url) return null;

  // Caixas de jogo são verticais ou levemente horizontais; o resto é print/logo.
  const ratio = imagem.width && imagem.height ? imagem.width / imagem.height : 0;
  if (ratio && (ratio < 0.45 || ratio > 2.2)) return null;

  const bytes = await getImage(url, { Referer: 'https://en.wikipedia.org/' });
  if (!bytes) return null;

  return { bytes, source: `Wikipédia · ${file.replace(/^File:/, '')}` };
}

/* 3. Recorte e gravação ----------------------------------------------------- */

async function save(jogo, capa) {
  const target = join(OUT_DIR, `${jogo.slug}.webp`);
  mkdirSync(OUT_DIR, { recursive: true });

  const meta = await sharp(capa.bytes).metadata();
  const ratio = meta.width && meta.height ? meta.width / meta.height : 0.667;

  // Arte larga (cabeçalho de loja, caixa de console antiga): a própria arte
  // vira fundo desfocado e a imagem nítida fica centralizada, sem cortar nada.
  if (ratio > 1.25) {
    const fundo = await sharp(capa.bytes)
      .resize({ width: WIDTH, height: HEIGHT, fit: 'cover' })
      .blur(18)
      .modulate({ brightness: 0.45 })
      .toBuffer();

    const frente = await sharp(capa.bytes).resize({ width: WIDTH, fit: 'inside' }).toBuffer();

    await sharp(fundo).composite([{ input: frente, gravity: 'center' }]).webp({ quality: 84 }).toFile(target);

    return target;
  }

  await sharp(capa.bytes)
    .resize({ width: WIDTH, height: HEIGHT, fit: 'contain', background: BACKGROUND })
    .webp({ quality: 84 })
    .toFile(target);

  return target;
}

/* Execução ------------------------------------------------------------------ */

const alvos = only ? jogos.filter((jogo) => jogo.slug === only) : jogos;

if (!alvos.length) {
  console.error(`Nenhum jogo com o slug "${only}".`);
  process.exit(1);
}

const resumo = [];

for (const jogo of alvos) {
  const target = join(OUT_DIR, `${jogo.slug}.webp`);

  if (existsSync(target) && !force) {
    resumo.push({ jogo, origem: 'já existia' });
    continue;
  }

  let capa = await steamCover(jogo);
  if (!capa) {
    await sleep(250);
    capa = await wikiCover(jogo);
  }

  if (!capa) {
    resumo.push({ jogo, origem: 'SEM CAPA' });
    console.log(`· ${jogo.name} — sem capa`);
    await sleep(250);
    continue;
  }

  await save(jogo, capa);
  resumo.push({ jogo, origem: capa.source });
  console.log(`· ${jogo.name} — ${capa.source}`);
  await sleep(250);
}

const semCapa = resumo.filter((item) => item.origem === 'SEM CAPA');
const existentes = resumo.filter((item) => item.origem === 'já existia');

console.log('\nResumo');
console.log(`  jogos na lista: ${alvos.length}`);
console.log(`  capas baixadas: ${resumo.length - semCapa.length - existentes.length}`);
console.log(`  já existiam:    ${existentes.length}`);
console.log(`  sem capa:       ${semCapa.length}`);

if (semCapa.length) {
  console.log('\nSem capa (o site mostra a inicial do nome):');
  semCapa.forEach((item) => console.log(`  ${item.jogo.slug} — ${item.jogo.name}`));
}
