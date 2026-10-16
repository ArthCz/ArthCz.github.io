/**
 * fetch-portrait.mjs — baixa o retrato de um personagem
 * ---------------------------------------------------------------------------
 * Busca a arte oficial do personagem na wiki do jogo e salva dentro de
 * public/roster/, no formato que o site usa (WebP com fundo transparente ou
 * escuro, pronto para o menu de seleção).
 *
 * Uso:
 *   node scripts/fetch-portrait.mjs <wiki> "<título na wiki>" <caminho de saída>
 *
 * Exemplos:
 *   node scripts/fetch-portrait.mjs streetfighter "Sagat" roster/sf6/sagat
 *   node scripts/fetch-portrait.mjs tekken "Bryan Fury" roster/t8/bryan-fury
 *   node scripts/fetch-portrait.mjs streetfighter "Yasmine" roster/sf6/yasmine
 *
 * Wikis disponíveis: streetfighter (SF6), tekken (Tekken 8).
 * Depois de baixar, aponte o arquivo no elenco do jogo em src/data/site.js.
 */

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('sharp'); // já vem com o Astro

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const WIKIS = {
  streetfighter: { host: 'streetfighter.fandom.com', referer: 'https://streetfighter.fandom.com/' },
  tekken: { host: 'tekken.fandom.com', referer: 'https://tekken.fandom.com/' },
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const [wikiKey, title, outPath] = process.argv.slice(2);

if (!wikiKey || !title || !outPath) {
  console.log(
    'Uso: node scripts/fetch-portrait.mjs <wiki> "<título na wiki>" <caminho de saída>\n' +
      'Ex.: node scripts/fetch-portrait.mjs tekken "Bryan Fury" roster/t8/bryan-fury',
  );
  process.exit(1);
}

const wiki = WIKIS[wikiKey];
if (!wiki) {
  console.error(`Wiki desconhecida: ${wikiKey}. Use: ${Object.keys(WIKIS).join(' ou ')}`);
  process.exit(1);
}

// 1) Descobre a URL da arte na wiki
const api =
  `https://${wiki.host}/api.php?action=query&titles=${encodeURIComponent(title)}` +
  `&prop=pageimages&format=json&pithumbsize=500&redirects=1&piprop=thumbnail`;

const meta = await (await fetch(api, { headers: { 'User-Agent': UA } })).json();
const page = Object.values(meta.query?.pages ?? {})[0];

if (!page || page.missing !== undefined || !page.thumbnail) {
  console.error(`Não encontrei retrato para "${title}" na wiki ${wikiKey}.`);
  console.error('Confira o título exato da página do personagem na wiki.');
  process.exit(1);
}

// 2) Baixa a imagem (o Referer é exigido pela CDN da wiki)
const image = await fetch(page.thumbnail.source, {
  headers: { 'User-Agent': UA, Referer: wiki.referer },
});

if (!image.ok) {
  console.error(`A CDN da wiki respondeu ${image.status}. Tente de novo em instantes.`);
  process.exit(1);
}

const bytes = Buffer.from(await image.arrayBuffer());
const target = join(ROOT, 'public', `${outPath}.webp`);
mkdirSync(dirname(target), { recursive: true });

// Mesmo tratamento que o `npm run sync` usa nos retratos: altura 400, WebP.
await sharp(bytes).trim({ threshold: 1 }).resize({ height: 400, fit: 'inside' }).webp({ quality: 84 }).toFile(target);

console.log(`Página:  ${page.title}`);
console.log(`Salvo:   public/${outPath}.webp`);

// Se o jogo tiver elenco fixo em site.js, aponte o arquivo lá (o resto vem do sync).
if (outPath.startsWith('roster/t8/')) {
  console.log('\nAponte esse arquivo no elenco do Tekken 8 em src/data/site.js:');
  console.log(`  { name: '${page.title}', image: '/${outPath}.webp', rank: '…', rankImage: '…', score: '…' },`);
} else {
  console.log('\nSe o elenco desse jogo for fixo em src/data/site.js, aponte o arquivo lá:');
  console.log(`  { name: '${page.title}', image: '/${outPath}.webp' },`);
}
console.log('Nos jogos com elenco automático (Street Fighter 6) não precisa fazer mais nada.');
